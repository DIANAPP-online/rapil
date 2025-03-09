import { Authenticator } from "./authenticator";
import { ResourceAPI } from "./resourceAPI";
import { Endpoint, FilledObject } from "./types";

export class ResourceElementManipulate<
  ElementType extends FilledObject,
  CreateElementType extends FilledObject,
  UpdateElementType extends FilledObject,
> extends ResourceAPI {
  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    super(authenticator, endpoint)
  }

  public async create(
    create_schema: CreateElementType,
    data: FormData | null = null,
    _reload_on_error: boolean = true
  ): Promise<ElementType> {
    const response = await this.try_load_data<ElementType>("create", create_schema, data, _reload_on_error)

    if (response === undefined) {
      throw new Error("create object is undefined");
    }
    return response;
  }

  public async patch(
    id: string,
    update_schema: UpdateElementType,
    _reload_on_error: boolean = true
  ): Promise<ElementType> {
    const response = await this.try_load_data<ElementType>("patch", id, update_schema, _reload_on_error)

    if (response === undefined) {
      throw new Error("update object is undefined");
    }
    return response;
  }

  public async put(
    id: string,
    update_schema: UpdateElementType,
    _reload_on_error: boolean = true
  ): Promise<ElementType> {
    const response = await this.try_load_data<ElementType>("put", id, update_schema, _reload_on_error)

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
