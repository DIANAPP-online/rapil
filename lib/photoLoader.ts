import { Authenticator } from "./authenticator";
import { ResourceAPI } from "./resourceAPI";
import { Endpoint } from "./types";

export class ResourcePhotoLoader extends ResourceAPI {
  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    super(authenticator, endpoint)
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
}
