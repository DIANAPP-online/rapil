import {Authenticator} from "./authenticator"
import {BaseSchemaType, Field, FilterType} from "./resourceTypes";
import {AxiosInstance} from "axios";

export class RequestBuilder<
    IDType extends Field
> {
    public endpoint: string;
    protected api: AxiosInstance
    public authenticator: Authenticator;

    public constructor(api: AxiosInstance, endpoint: string, authenticator: Authenticator) {
        this.api = api
        this.endpoint = endpoint;
        this.authenticator = authenticator
    }

    public getLoadNextPageRequest(page: number, count: number) {
        return this.api.get(this.endpoint, {
            params: {
                page: page,
                count: count
            },
        });
    }

    public getUpdateRequest(id: IDType, updateSchema: object) {
        return this.api.patch(
            `${this.endpoint}/${id}`,
            updateSchema,
        );
    }

    public getLoadOneRequest(id: IDType) {
        return this.api.get(`${this.endpoint}/${id}`)
    }

    public getCreateRequest(createSchema: BaseSchemaType, formData: FormData | null = null) {
        if (formData === null) {
            return this.api.post(
                this.endpoint,
                createSchema
            );
        }
        return this.api.post(this.endpoint, formData, {
            params: createSchema,
        });
    }

    public getDeleteRequest(id: IDType) {
        return this.api.delete(`${this.endpoint}/${id}`);
    }

    public getLoadByFilterRequest(filter: FilterType) {
        return this.api.get(`${this.endpoint}`, {params: filter})
    }
}