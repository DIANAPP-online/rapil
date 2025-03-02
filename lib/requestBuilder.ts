import { ResourceSession } from "./resouceSession";
import {BaseSchemaType, Endpoint, FilterType} from "./resourceTypes";

export class RequestBuilder {
    public endpoint: Endpoint;
    public session: ResourceSession

    public constructor(endpoint: Endpoint, session: ResourceSession) {
        this.endpoint = endpoint;
        this.session = session
    }

    public get_load_next_page_request(page: number, count: number, filters: FilterType | null = null) {
        const config = {
            params: {
                page,
                count,
                filters
            },
        }
        return this.session.get(this.endpoint, config);
    }

    public get_put_request(id: string, updateSchema: object) {
        return this.session.put(this.endpoint, id, updateSchema)
    }

    public get_patch_request(id: string, updateSchema: object) {
        return this.session.patch(this.endpoint, id, updateSchema)
    }

    public get_load_one_request(id: string) {
        return this.session.get(this.endpoint, { id })
    }

    public get_create_request(createSchema: BaseSchemaType, formData: FormData | null = null) {
        if (formData === null) {
            return this.session.post(
                this.endpoint,
                createSchema
            );
        }
        return this.session.post(this.endpoint, formData, {
            params: createSchema,
        });
    }

    public get_delete_request(id: string) {
        return this.session.delete(this.endpoint, id);
    }

    public get_load_by_filter_request(filters: FilterType) {
        const config = {
            params: { 
                filters,
            }
        }
        return this.session.get(`${this.endpoint}`, config)
    }
}
