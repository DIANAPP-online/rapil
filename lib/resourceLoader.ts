import { AxiosResponse } from "axios";
import { FilledObject, FilterType, NeedReAuth, Endpoint } from "./resourceTypes";
import { RequestBuilder } from "./requestBuilder";
import { Authenticator } from "./authenticator";

class ResourceLoader<
    ContentType, 
    CreateContentType extends FilledObject, 
    UpdateContentType  extends FilledObject
> {
  private readonly authenticator: Authenticator;
  private readonly endpoint: Endpoint;
  public page: number;
  public page_count: number;
  public pages_ended: boolean;

  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    this.authenticator = authenticator;
    this.endpoint = endpoint;
  }

  public async load(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<void> {
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_load_one_request(id);
    let obj;
    try {
      obj = await this.response_check<ContentType>(response, "get");
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        await this.load(id, false);
        return
      }
    }
    if (obj === undefined) {
      throw new Error("load object is undefined");
    }
  }

  public async load_list(ids: string[]): Promise<void> {
    let promises: Promise<void>[] = [];
    for (const id of ids) {
      promises.push(this.load(id));
    }
    await Promise.all(promises);
  }

  public async load_next_page(_reload_on_error: boolean = true): Promise<void> {
    if (this.pages_ended) {
      return;
    }
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_load_next_page_request(
      this.page,
      this.page_count
    );
    let objects;

    try {
      objects = await this.response_check<ContentType[]>(
        response,
        "get_next_page"
      );
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        await this.load_next_page(false);
        return;
      }
    }
    if (objects === undefined) {
      throw new Error("get_next_page objects are undefined");
    }
    if (objects.length === this.page_count) {
      this.page += 1;
    } else {
      this.pages_ended = true;
    }
  }

  public async load_by_filter(filter: FilterType, _reload_on_error: boolean = true): Promise<ContentType[]> {
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_load_by_filter_request(filter);
    let objects;
    try {
      objects = await this.response_check<ContentType[]>(
        response,
        "load_by_filter"
      );
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        return await this.load_by_filter(filter, false);
      }
    }
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
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_create_request(create_schema, data);
    let obj;

    try {
      obj = await this.response_check<ContentType>(response, "create");
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        return await this.create(create_schema, data, false);
      }
    }

    if (obj === undefined) {
      throw new Error("create object is undefined");
    }
    return obj;
  }

  public async update(
    id: string,
    update_schema: UpdateContentType,
    _reload_on_error: boolean = true
  ): Promise<ContentType> {
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_patch_request(id, update_schema);
    let obj;
    try {
      obj = await this.response_check<ContentType>(response, "update");
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        return await this.update(id, update_schema, false);
      }
    }

    if (obj === undefined) {
      throw new Error("update object is undefined");
    }
    return obj;
  }

  public async delete(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<void> {
    const request_builder = await this.create_request_builder();
    const response = request_builder.get_delete_request(id);
    try {
      await this.response_check<undefined>(response, "delete");
    } catch (e: unknown) {
      if (e instanceof NeedReAuth) {
        await this.delete(id, false);
      }
    }
  }

  private async response_check<ReturnType>(
    response: AxiosResponse,
    method: string
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
      throw new NeedReAuth();
    }
    throw new Error(
      `Unexpected API error in ${method} method. Status code: ${response.status}`
    );
  }

  private async create_request_builder(): Promise<RequestBuilder> {
    return new RequestBuilder(
      this.endpoint,
      await this.authenticator.get_session()
    );
  }
}
