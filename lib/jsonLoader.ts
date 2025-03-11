import { Authenticator } from './authenticator';
import { ResourceAPI } from './resourceAPI'
import { Endpoint, FilterType } from './types'

export class ResourceJSONLoader<JSONType> extends ResourceAPI {
  public page: number
  public page_count: number
  public pages_ended: boolean

  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    super(authenticator, endpoint)
    this.page = 0
    this.page_count = 50
    this.pages_ended = false
  }

  public async load_json(id: string, _reload_on_error: boolean = true): Promise<JSONType> {
    const loaded_json = await this.try_load_data<JSONType>('load', id, _reload_on_error)

    if (loaded_json === undefined) {
      throw new Error('Loaded object is undefined')
    }

    return loaded_json
  }

  public async load_json_list(ids: string[]): Promise<JSONType[]> {
    const promises: Promise<JSONType>[] = []
    for (const id of ids) {
      promises.push(this.load_json(id))
    }
    return await Promise.all(promises)
  }

  public async load_next_page(_reload_on_error: boolean = true): Promise<JSONType[]> {
    if (this.pages_ended) {
      return []
    }
    const objects = await this.try_load_data<JSONType[]>('load_next_page', this.page, this.page_count, _reload_on_error)

    if (objects === undefined) {
      throw new Error('get_next_page objects are undefined')
    }

    if (objects.length === this.page_count) {
      this.page += 1
    } else {
      this.pages_ended = true
    }

    return objects
  }

  public async load_by_filter(filter: FilterType, _reload_on_error: boolean = true): Promise<JSONType[]> {
    const objects = await this.try_load_data<JSONType[]>('load_by_filter', filter, _reload_on_error)

    if (objects === undefined) {
      throw new Error('load_by_filter object is undefined')
    }
    return objects
  }
}
