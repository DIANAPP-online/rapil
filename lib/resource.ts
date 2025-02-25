import {AxiosResponse} from "axios";
import {Reactive, reactive} from "vue";
import {RequestBuilder} from "./requestBuilder";

import {Endpoint, Field, FilledObject, FilterType, NeedReAuth} from "./resourceTypes";
import {TypeChecker} from "./typeChecker";
import type { Authenticator } from "./authenticator";


const default_type_checker = new TypeChecker<'create' | 'update'>({
    'create': null,
    'update': null
});

/*
Resource is a class for loading objects from Rest API.
 */
export class Resource<
    ContentType extends FilledObject,
    CreateContentType extends FilledObject,
    UpdateContentType extends FilledObject,
> {
    public readonly object_by_key: Reactive<Map<string, ContentType | undefined>>;
    public page: number;
    public page_count: number;
    public pages_ended: boolean;
    public sort_fields: Field[];
    public reverse_sort: boolean;
    public max_storage_size: number | null;
    public is_full_object: ((obj: ContentType | undefined) => boolean) | null;
    public id_field_name: string;
    public computed_fields: { [key: string]: ((obj: ContentType) => any) }

    private readonly authenticator: Authenticator
    private readonly type_checker: TypeChecker<'create' | 'update' | string>;
    private readonly endpoint: Endpoint

    public constructor(
        endpoint: Endpoint,
        authenticator: Authenticator,
        typeChecker = default_type_checker,
    ) {
        this.object_by_key = reactive(new Map());
        this.sort_fields = [];
        this.page = 0;
        this.page_count = 20;

        this.reverse_sort = false;
        this.max_storage_size = null;
        this.is_full_object = null;
        this.id_field_name = "id";
        this.authenticator = authenticator;
        this.type_checker = typeChecker;
        this.computed_fields = {}
        this.pages_ended = false;
        this.endpoint = endpoint
    }

    // ============================= Getters =============================

    public get(id: string | undefined, default_value: ContentType | undefined = undefined): ContentType {
        if (id === undefined) {
            if (default_value === undefined) {
                throw new Error(`Resource.get - id and default value are undefined`);
            }
            return default_value
        }
        const object = this.object_by_key.get(id) as ContentType | undefined;

        if (object === undefined) {
            if (default_value === undefined) {
                throw new Error(`Object is undefined`);
            }
            return default_value
        }

        return object;
    }

    public get_objects(): ContentType[] {
        const objects: ContentType[] = [];
        for (const value of this.object_by_key.values()) {
            objects.push(value as ContentType);
        }
        if (this.sort_fields.length) {
            objects.sort(
                this.get_compare_objects_function(this.sort_fields, this.reverse_sort),
            );
        }
        return objects;
    }

    public get_by_filter(
        filterQuery: FilterType,
        filter_fn: ((obj: ContentType) => boolean) | null = null,
    ): ContentType[] {
        let objects = this.get_objects_by_filter(filterQuery, this.get_objects());
        if (filter_fn !== null) {
            objects = this.get_objects_by_filter_fn(filter_fn, objects);
        }
        return objects;
    }

    // ============================= Loaders =============================

    public async load(
        id: string,
        if_not_exists: boolean | null = null,
        before_loading_value: ContentType | undefined = undefined,
        exists_value_priority: boolean = true,
    ): Promise<void> {
        if (before_loading_value !== undefined) {
            this.update_object(id, before_loading_value, exists_value_priority);
        }
        if (if_not_exists) {
            if (this.is_full_object === null) {
                throw new Error("Call load if not exists without check_is_full_object");
            }
            if (
                this.get(id) === undefined ||
                !this.is_full_object(this.get(id))
            ) {
                await this.load_one(id);
            }
        } else {
            await this.load_one(id);
        }
    }

    public async load_list(
        ids: string[],
        if_not_exists: boolean | null = null,
        before_loading_value: ContentType | undefined = undefined,
        exists_value_priority: boolean = true,
    ): Promise<void> {
        let promises: Promise<void>[] = [];
        for (const id of ids) {
            promises.push(
                this.load(id, if_not_exists, before_loading_value, exists_value_priority),
            );
        }
        await Promise.all(promises);
    }

    public async load_next_page(_reload_on_error: boolean = true): Promise<void> {
        if (this.pages_ended){
            return;
        }
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_load_next_page_request(this.page, this.page_count);
        let objects

        try {
            objects = await this.response_check<ContentType[]>(
                response,
                "get_next_page",
            );
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                await this.load_next_page(false);
                return;
            }
            
            throw new NeedReAuth()
        }
        if (objects === undefined) {
            throw new Error("get_next_page objects are undefined");
        }
        if (objects.length === this.page_count) {
            this.page += 1;
        } else {
            this.pages_ended = true;
        }
        for (const obj of objects) {
            this.update_object(obj[this.id_field_name], obj);
        }
    }

    public async load_by_filter(filter: FilterType, _on_reload_error: boolean = true): Promise<void> {
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_load_by_filter_request(filter);
        let objects
        try {
            objects = await this.response_check<ContentType[]>(
                response,
                "load_by_filter",
            );
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                await this.load_by_filter(filter, false)
                return
            }
        }
        if (objects === undefined) {
            throw new Error("load_by_filter object is undefined");
        }
        this.update_objects(objects);
    }

    // ============================= Data manipulating =============================

    public async create(
        create_schema: CreateContentType,
        data: FormData | null = null,
        _reload_on_error: boolean = true,
    ): Promise<ContentType> {
        for (const field of Object.keys(this.computed_fields)) {
            delete create_schema[field]
        }
        this.type_checker.type_check(create_schema, "create");
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_create_request(create_schema, data)
        let obj
        
        try {
            obj = await this.response_check<ContentType>(response, "create");
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                return await this.create(create_schema, data, false)
            }
        }

        if (obj === undefined) {
            throw new Error("create object is undefined");
        }
        this.update_object(obj[this.id_field_name], obj);
        return obj;
    }

    public async update(
        id: string,
        update_schema: UpdateContentType,
        _reload_on_error: boolean = true,
    ): Promise<ContentType> {
        for (const field of Object.keys(this.computed_fields)) {
            delete update_schema[field]
        }
        this.type_checker.type_check(update_schema, "update");
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_patch_request(id, update_schema);
        let obj
        try {
            obj = await this.response_check<ContentType>(response, "update");
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                return await this.update(id, update_schema, false)
            }
        }

        if (obj === undefined) {
            throw new Error("update object is undefined");
        }
        this.update_object(obj[this.id_field_name], obj);
        return obj;
    }

    public async delete(id: string, _reload_on_error: boolean = true): Promise<void> {
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_delete_request(id);
        try {
            await this.response_check<undefined>(response, "delete");
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                await this.delete(id, false)
                return
            }
        }
        this.delete_object_from_resource_storage(id);
    }

    // ============================= Private =============================

    private get_compare_objects_function(
        sort_fields: Field[],
        reverse_sort: boolean,
    ): (a: ContentType, b: ContentType) => number {
        function compare_objects(a: ContentType, b: ContentType) {
            for (const compare_field of sort_fields) {
                const sort_number = 2 * Number(!reverse_sort) - 1;
                if (a[compare_field] > b[compare_field]) {
                    return sort_number;
                }
                if (a[compare_field] < b[compare_field]) {
                    return -sort_number;
                }
            }
            return 0;
        }

        return compare_objects;
    }

    private async load_one(
        id: string,
        _reload_on_error: boolean = true,
    ): Promise<void> {
        const request_builder = await this.create_request_builder()
        const response = request_builder.get_load_one_request(id);
        let obj
        try {
            obj = await this.response_check<ContentType>(response, "get");
        } catch (e: unknown) {
            if (e instanceof NeedReAuth) {
                await this.load_one(id, false)
                return
            }
        }
        if (obj === undefined) {
            throw new Error("load_one object is undefined");
        }
        this.update_object(obj[this.id_field_name], obj);
    }

    private get_objects_by_filter<T extends FilledObject>(
        filter: FilterType,
        objects: T[],
    ): T[] {
        const filtered_objects: T[] = [];
        for (const object of objects) {
            let isObjectCorrect = true;
            for (const [key, value] of Object.entries(filter)) {
                isObjectCorrect &&= object[key] === value;
            }
            if (isObjectCorrect) {
                filtered_objects.push(object);
            }
        }
        return filtered_objects;
    }

    private get_objects_by_filter_fn(
        filterFn: (obj: ContentType) => boolean,
        objects: ContentType[],
    ): ContentType[] {
        const filtered_objects: ContentType[] = [];
        for (const object of objects) {
            if (filterFn(object)) {
                filtered_objects.push(object);
            }
        }
        return filtered_objects;
    }

    private update_objects(objects: ContentType[]) {
        const newObjects: ContentType[] = [];
        for (const obj of objects) {
            const newObject = this.update_object(obj[this.id_field_name], obj);
            newObjects.push(newObject);
        }
        return newObjects;
    }

    private update_object(
        id: string,
        obj: ContentType,
        existsValuePriority: boolean = false,
    ): ContentType {
        let newObject: any;
        if (existsValuePriority) {
            newObject = {
                ...obj,
                ...(this.object_by_key.get(id) as object),
            };
        } else {
            newObject = {
                ...(this.object_by_key.get(id) as object),
                ...obj,
            };
        }
        this.object_by_key.set(id, newObject);
        this.cleanStorage();
        return newObject;
    }

    private cleanStorage(): void {
        const idsIter = this.object_by_key.keys();
        while (
            this.max_storage_size !== null &&
            this.object_by_key.size >= this.max_storage_size
            ) {
            const deleteID = idsIter.next().value;
            this.delete_object_from_resource_storage(deleteID);
        }
    }

    private delete_object_from_resource_storage(id: string): void {
        this.object_by_key.delete(id);
    }

    private async response_check<ReturnType>(
        response: AxiosResponse,
        method: string,
    ): Promise<ReturnType | undefined> {
        if (
            response &&
            [200, 201, 202].includes(response.status) &&
            response.data
        ) {
            return response.data;
        }
        if (response && response.status == 204) {
            return;
        }
        if (
            method == "update" &&
            response &&
            response.status === 304 &&
            response.data
        ) {
            return response.data;
        }
        if (response && response.status == 401) {
            throw new NeedReAuth()
        }
        throw new Error(
            `Unexpected API error in ${method} method. Status code: ${response.status}`,
        );
    }

    private async create_request_builder(): Promise<RequestBuilder> {
        return new RequestBuilder(
            this.endpoint, 
            await this.authenticator.get_session()
        )
    }
}
