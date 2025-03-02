import { AxiosError, AxiosResponse } from "axios";
import { FilledObject, FilterType, NeedReAuth, Endpoint } from "./resourceTypes";
import { RequestBuilder } from "./requestBuilder";
import { Authenticator } from "./authenticator";

export class ResourceLoader<
    ContentType extends FilledObject, 
    CreateContentType extends FilledObject, 
    UpdateContentType  extends FilledObject
> {
  private readonly authenticator: Authenticator;
  private readonly endpoint: Endpoint;
  private readonly id_field_name: string
  public page: number;
  public page_count: number;
  public pages_ended: boolean;

  constructor(
    authenticator: Authenticator, 
    endpoint: Endpoint, 
  ) {
    this.authenticator = authenticator;
    this.endpoint = endpoint;
    this.id_field_name = "id"
  }

  public async load(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<ContentType> {
    const loaded_object = await this.try_load_data<ContentType>("load", id, _reload_on_error);

    if (loaded_object === undefined) {
      throw new Error("load object is undefined");
    }

    return loaded_object
  }

  public async load_list(ids: string[]): Promise<ContentType[]> {
    let promises: Promise<ContentType>[] = [];
    for (const id of ids) {
      promises.push(this.load(id));
    }
    return await Promise.all(promises);
  }

  public async load_next_page(_reload_on_error: boolean = true): Promise<ContentType[]> {
    if (this.pages_ended) {
      return [];
    }
    const objects = await this.try_load_data<ContentType[]>("load_next_page", this.page, this.page_count, _reload_on_error)
    
    if (objects === undefined) {
      throw new Error("get_next_page objects are undefined");
    }
    
    if (objects.length === this.page_count) {
      this.page += 1;
    } else {
      this.pages_ended = true;
    }

    return objects
  }

  public async load_by_filter(filter: FilterType, _reload_on_error: boolean = true): Promise<ContentType[]> {
    const objects = await this.try_load_data<ContentType[]>("load_by_filter", filter, _reload_on_error)

    if (objects === undefined) {
      throw new Error("load_by_filter object is undefined");
    }
    return objects;
  }

  // ============================= Data manipulating =============================
  
  public async create(
    create_schema: CreateContentType,
    data: FormData | null = null,
    _reload_on_error: boolean = true
  ): Promise<ContentType> {
    const response = await this.try_load_data<ContentType>("create", create_schema, data, _reload_on_error)

    if (response === undefined) {
      throw new Error("create object is undefined");
    }
    return response;
  }

  public async update(
    id: string,
    update_schema: UpdateContentType,
    _reload_on_error: boolean = true
  ): Promise<ContentType> {
    const response = await this.try_load_data<ContentType>("update", id, update_schema, _reload_on_error)

    if (response === undefined) {
      throw new Error("update object is undefined");
    }
    return response;
  }

  public async delete(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<void> {
    this.try_load_data<void>("delete", id, _reload_on_error)
  }

  protected async try_load_data<T>(name_method: string, ...args: any[]): Promise<T> {
    const POSITION_PARAMETER_FOR_REALOD = args.length - 1
    const request_builder = await this.create_request_builder();
    const _reload_on_error = args[POSITION_PARAMETER_FOR_REALOD]
    
    try {
      const response = await request_builder[name_method](...args)
      return this.response_check<T>(response, name_method) as T
    } catch (e: unknown) {
      if (e instanceof NeedReAuth && _reload_on_error) {
        args[POSITION_PARAMETER_FOR_REALOD] = false
        return await this.try_load_data(name_method, ...args)
      } else {
        throw new AxiosError('Relogin throw error')
      }
    }
  } 

  protected response_check<ReturnType>(
    response: AxiosResponse,
    method: string
  ): ReturnType | void {
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
    if (response && response.status === 403) {
      throw new Error(
        `Access was forbidden then was called ${method} method. Status code: ${response.status}`
      )
    }
    if (response && response.status === 406) {
      throw new Error(
        `Request succeeded but couldn’t generate a response that matches the content type in the ${method} method.`
      )
    }
    if (response && response.status === 409) {
      throw new Error(
        `Request well-formed, but have some conflicts with another resource`
      )
    }
    throw new Error(
      `Unexpected API error in ${method} method. Status code: ${response.status}`
    );
  }

  protected async create_request_builder(): Promise<RequestBuilder> {
    return new RequestBuilder(
      this.endpoint,
      await this.authenticator.get_session()
    );
  }
}
