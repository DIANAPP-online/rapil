import { Authenticator } from "./authenticator";
import { ResourceAPI } from "./resourceAPI";
import { Endpoint, FilledObject } from "./types";

export class ResourceJSONManipulate<
  JSONType extends FilledObject,
  CreateJSONType extends FilledObject,
  UpdateJSONType extends FilledObject,
> extends ResourceAPI {
  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    super(authenticator, endpoint)
  }

  public async create(
    create_schema: CreateJSONType,
    data: FormData | null = null,
    _reload_on_error: boolean = true
  ): Promise<JSONType> {
    const response = await this.try_load_data<JSONType>("create", create_schema, data, _reload_on_error)

    if (response === undefined) {
      throw new Error("create object is undefined");
    }
    return response;
  }

  public async patch(
    id: string,
    update_schema: UpdateJSONType,
    _reload_on_error: boolean = true
  ): Promise<JSONType> {
    const response = await this.try_load_data<JSONType>("patch", id, update_schema, _reload_on_error)

    if (response === undefined) {
      throw new Error("update object is undefined");
    }
    return response;
  }

  public async put(
    id: string,
    update_schema: UpdateJSONType,
    _reload_on_error: boolean = true
  ): Promise<JSONType> {
    const response = await this.try_load_data<JSONType>("put", id, update_schema, _reload_on_error)

    if (response === undefined) {
      throw new Error("put object is undefined");
    }
    return response;
  }

  public async delete(
    id: string,
    _reload_on_error: boolean = true
  ): Promise<void> {
    this.try_load_data<void>("delete", id, _reload_on_error)
  }
}
