import {RequestBuilder} from "./requestBuilder";

import {Field, FilledObject, NeedReAuth, PullMethods, PushMethods} from "./resourceTypes";
import {SchemaStyler} from "./schemaStyler";
import {TypeChecker} from "./typeChecker";
import {AxiosResponse} from "axios";
import {computed, Reactive, reactive} from "vue";


const defaultTypeChecker = new TypeChecker<'create' | 'update'>({
    'create': null,
    'update': null
});

/*
Resource is a class for loading objects from Rest API.
 */
export class Resource<
    IDType extends Field,
    ContentType extends FilledObject,
> {
    public readonly objectByKey: Reactive<Map<IDType, ContentType>>;
    public page: number;
    public pageCount: number;
    public sortFields: Field[];
    public reverseSort: boolean;
    public maxStorageSize: number | null;
    public isFullObject: ((obj: ContentType | undefined) => boolean) | null;
    public IDFieldName: string;
    public computedFields: {[key: string]: ((obj: FilledObject) => ContentType)}

    public requestBuilder: RequestBuilder<IDType>;
    private typeChecker: TypeChecker<'create' | 'update' | string>;
    private schemaStyler: SchemaStyler<ContentType, PushMethods, PullMethods>;

    public constructor(
        requestBuilder: RequestBuilder<IDType>,
        typeChecker = defaultTypeChecker,
        schemaStyler: SchemaStyler<ContentType, any, any> = new SchemaStyler()
    ) {
        this.objectByKey = reactive(new Map());
        this.sortFields = [];
        this.page = 0;
        this.pageCount = 20;
        this.reverseSort = false;
        this.maxStorageSize = null;
        this.isFullObject = null;
        this.IDFieldName = "id";
        this.requestBuilder = requestBuilder;
        this.typeChecker = typeChecker;
        this.schemaStyler = schemaStyler
    }

    // ============================= Getters =============================

    public get(id: IDType | undefined, defaultValue: ContentType | undefined = undefined): ContentType {
        if (id === undefined) {
            if (defaultValue === undefined) {
                throw new Error(`Resource.get - id and default value are undefined`);
            }
            return defaultValue
        }
        const object = this.objectByKey.get(id);

        if (object === undefined) {
            if (defaultValue === undefined) {
                throw new Error(`Object is undefined`);
            }
            return defaultValue;
        }

        return object as ContentType;
    }

    public getObjects() {
        const objects: ContentType[] = [];
        for (const value of this.objectByKey.values()) {
            objects.push(value as ContentType);
        }
        if (this.sortFields.length) {
            objects.sort(
                this.getCompareObjectsFunction(this.sortFields, this.reverseSort),
            );
        }
        return objects;
    }

    public getByFilter(
        filterQuery: object,
        filterFn: ((obj: ContentType) => boolean) | null = null,
    ): ContentType[] {
        let objects = this.getObjectsByFilter(filterQuery, this.getObjects());
        if (filterFn !== null) {
            objects = this.getObjectsByFilterFn(filterFn, objects);
        }
        return objects;
    }

    // ============================= Loaders =============================

    public async load(
        id: IDType,
        ifNotExists: boolean | null = null,
        beforeLoadingValue: object = {},
        existsValuePriority: boolean = true,
    ): Promise<void> {
        this.updateObject(id, beforeLoadingValue, existsValuePriority);
        if (ifNotExists) {
            if (this.isFullObject === null) {
                throw new Error("Call load if not exists without checkIsFullObject");
            }
            if (
                this.get(id) === undefined ||
                !this.isFullObject(this.get(id) as ContentType | undefined)
            ) {
                await this.loadOne(id, beforeLoadingValue);
            }
        } else {
            await this.loadOne(id, beforeLoadingValue);
        }
    }

    public async loadList(
        ids: IDType[],
        ifNotExists: boolean | null = null,
        beforeLoadingValue: object = {},
        existsValuePriority: boolean = true,
    ) {
        let promises = [];
        for (const id of ids) {
            promises.push(
                this.load(id, ifNotExists, beforeLoadingValue, existsValuePriority),
            );
        }
        await Promise.all(promises);
    }

    public async loadNextPage(_reload_on_error: boolean = true): Promise<void> {
        const response = await this.requestBuilder.getLoadNextPageRequest(this.page, this.pageCount);
        const objects = await this.responseCheck<ContentType[]>(
            response,
            "getNextPage",
        );
        if (_reload_on_error && objects === undefined) {
            await this.loadNextPage(false);
            return;
        }
        if (objects === undefined) {
            throw new Error("getNextPage objects are undefined");
        }
        if (objects.length === this.pageCount){
            this.page += 1;
        }
        for (const obj of objects) {
            const resourceStyleObject = this.schemaStyler.getResourceStyledSchema(obj, 'load');
            this.updateObject(obj[this.IDFieldName], resourceStyleObject);
        }
    }

    public async loadByFilter(filter: object): Promise<void> {
        let objects = await this._loadByFilter(filter);
        this.updateObjects(objects);
    }

    // ============================= Data manipulating =============================

    public async create(
        createSchema: object,
        data: FormData | null = null,
        _reload_on_error: boolean = true,
    ): Promise<ContentType> {
        this.typeChecker.typeCheck(createSchema, "create");
        let response;
        response = await this.requestBuilder.getCreateRequest(this.schemaStyler.getAPIStyledSchema(createSchema as ContentType, 'create'))
        const obj = await this.responseCheck<ContentType>(response, "create");
        if (_reload_on_error && obj === undefined) {
            return await this.create(createSchema, data, false);
        }
        if (obj === undefined) {
            throw new Error("create object is undefined");
        }
        this.updateObject(obj[this.IDFieldName], obj);
        return obj;
    }

    public async update(
        id: IDType,
        updateSchema: ContentType,
        _reload_on_error: boolean = true,
    ): Promise<ContentType> {
        this.typeChecker.typeCheck(updateSchema, "update");
        const response = await this.requestBuilder.getUpdateRequest(id, this.schemaStyler.getAPIStyledSchema(updateSchema, 'update'));
        const obj = await this.responseCheck<ContentType>(response, "update");
        if (_reload_on_error && obj === undefined) {
            return await this.update(id, updateSchema, false);
        }
        if (obj === undefined) {
            throw new Error("update object is undefined");
        }
        this.updateObject(obj[this.IDFieldName], this.schemaStyler.getAPIStyledSchema(obj, "update"));
        return obj;
    }

    public async delete(id: IDType): Promise<void> {
        const response = await this.requestBuilder.getDeleteRequest(id);
        await this.responseCheck<undefined>(response, "delete");
        this.deleteObjectFromResourceStorage(id);
    }

    // ============================= Private =============================

    private getCompareObjectsFunction(
        sortFields: Field[],
        reverseSort: boolean,
    ): (a: ContentType, b: ContentType) => number {
        function compareObjects(a: ContentType, b: ContentType) {
            for (const compareField of sortFields) {
                const sortNumber = 2 * Number(!reverseSort) - 1;
                if (a[compareField] > b[compareField]) {
                    return sortNumber;
                }
                if (a[compareField] < b[compareField]) {
                    return -sortNumber;
                }
            }
            return 0;
        }

        return compareObjects;
    }

    private async _loadByFilter(
        filter: object,
        _reload_on_error: boolean = true,
    ): Promise<ContentType[]> {
        const response = await this.requestBuilder.getLoadByFilterRequest(filter);
        const objects = await this.responseCheck<ContentType[]>(
            response,
            "loadByFilter",
        );
        if (_reload_on_error && objects === undefined) {
            return await this._loadByFilter(filter, false);
        }
        if (objects === undefined) {
            throw new Error("loadByFilter object is undefined");
        }
        return objects;
    }

    private async loadOne(
        id: IDType,
        beforeLoadingValue: object = {},
    ): Promise<void> {
        this.updateObject(id, beforeLoadingValue, true);
        await this.loadOneObject(id);
    }

    private async loadOneObject(
        id: IDType,
        _reload_on_error: boolean = true,
    ): Promise<ContentType> {
        const response = await this.requestBuilder.getLoadOneRequest(id);
        const obj = await this.responseCheck<ContentType>(response, "get");
        if (_reload_on_error && obj === undefined) {
            return await this.loadOneObject(id, false);
        }
        if (obj === undefined) {
            throw new Error("loadOneObject object is undefined");
        }
        return this.updateObject(obj[this.IDFieldName], obj);
    }

    private getObjectsByFilter(
        filter: object,
        objects: ContentType[],
    ): ContentType[] {
        const filtered_objects: ContentType[] = [];
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

    private getObjectsByFilterFn(
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

    private updateObjects(objects: ContentType[]) {
        const newObjects = [];
        for (const obj of objects) {
            const newObject = this.updateObject(obj[this.IDFieldName], obj);
            newObjects.push(newObject);
        }
        return newObjects;
    }

    private updateObject(
        id: IDType,
        obj: object,
        existsValuePriority: boolean = false,
    ) {
        let newObject;
        if (existsValuePriority) {
            newObject = {
                ...obj,
                ...(this.objectByKey.get(id) as object),
            } as ContentType;
        } else {
            newObject = {
                ...(this.objectByKey.get(id) as object),
                ...obj,
            } as ContentType;
        }
        for (const field in Object.keys(this.computedFields)) {
            newObject[field] = computed(() => this.computedFields[field](newObject))
        }

        this.objectByKey.set(id, newObject);
        this.cleanStorage();
        return newObject;
    }

    private cleanStorage() {
        const idsIter = this.objectByKey.keys();
        while (
            this.maxStorageSize !== null &&
            this.objectByKey.size >= this.maxStorageSize
            ) {
            const deleteID = idsIter.next().value;
            this.deleteObjectFromResourceStorage(deleteID);
        }
    }

    private deleteObjectFromResourceStorage(id: IDType) {
        this.objectByKey.delete(id);
    }

    private async responseCheck<ReturnType>(
        response: AxiosResponse,
        method: string,
    ): Promise<ReturnType | NeedReAuth> {
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
            await this.requestBuilder.authenticator.reLogin()
            return undefined;
        }
        throw new Error(
            `Unexpected API error in ${method} method. Status code: ${response.status}`,
        );
    }
}
