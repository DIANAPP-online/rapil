import { AxiosError, AxiosResponse } from "axios";
import { FilledObject, FilterType, NeedReAuth, Endpoint } from "./types";
import { RequestBuilder } from "./requestBuilder";
import { Authenticator } from "./authenticator";

const GET_REQUEST_BUILDER_METHOD = {
  create: "get_create_request",
  update: "get_patch_request",
  delete: "get_delete_request",
  load: "get_load_one_request",
  load_next_page: "get_load_next_page_request",
  load_by_filter: "get_load_py_filter_request"
} as const

type LoaderMethods = "create" | "update" | "delete" | "load" | "load_next_page" | "load_by_filter" | "load_photo"

export class ResourceLoader<
    ContentType extends FilledObject, 
    CreateContentType extends FilledObject, 
    UpdateContentType  extends FilledObject,
> {
  private readonly authenticator: Authenticator;
  private readonly endpoint: Endpoint;
  public page: number;
  public page_count: number;
  public pages_ended: boolean;

  constructor(
    authenticator: Authenticator, 
    endpoint: Endpoint, 
  ) {
    this.authenticator = authenticator;
    this.endpoint = endpoint;
    this.page = 0
    this.page_count = 50
    this.pages_ended = false
  }

  public async load(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<ContentType> {
    const loaded_object = await this.try_load_data<ContentType>("load", id, _reload_on_error);

    if (loaded_object === undefined) {
      throw new Error("Loaded object is undefined");
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

  public async load_photo(id: string, _reload_on_error: boolean = true): Promise<Base64URLString> {
    const response = await this.try_load_data<Response>("load_photo", id, _reload_on_error)

    if (response === undefined) {
      throw new Error("Loaded photo is undefined")
    }

    const arrayBuffer = await response.bytes()
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return base64String
  }

  public async load_photos(ids: string[], _reload_on_error: boolean = true): Promise<Base64URLString[]> {
    const promises: Promise<Base64URLString>[] = []

    for (const id of ids) {
      promises.push(this.load_photo(id))
    }

    return Promise.all(promises)
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

  protected async try_load_data<ReturnType>(loader_method: LoaderMethods, ...args: any[]): Promise<ReturnType> {
    const POSITION_PARAMETER_FOR_REALOD = args.length - 1
    const _reload_on_error = args[POSITION_PARAMETER_FOR_REALOD]

    const request_builder: any = await this.create_request_builder();
    const name_method_of_request_builder = GET_REQUEST_BUILDER_METHOD[loader_method]

    try {
      const response = await request_builder[name_method_of_request_builder](...args)
      return this.response_check<ReturnType>(response, loader_method) as ReturnType
    } catch (e: unknown) {
      if (e instanceof NeedReAuth && _reload_on_error) {
        args[POSITION_PARAMETER_FOR_REALOD] = false
        return await this.try_load_data(loader_method, ...args)
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
