import { Authenticator } from './authenticator';
import { ResourceAPI } from './resourceAPI'
import { Endpoint, FilterType } from './types'

export class ResourceElementLoader<ElementType> extends ResourceAPI {
  public page: number
  public page_count: number
  public pages_ended: boolean

  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    super(authenticator, endpoint)
    this.page = 0
    this.page_count = 50
    this.pages_ended = false
  }

  public async load_element(id: string, _reload_on_error: boolean = true): Promise<ElementType> {
    const loaded_element = await this.try_load_data<ElementType>('load', id, _reload_on_error)

    if (loaded_element === undefined) {
      throw new Error('Loaded object is undefined')
    }

    return loaded_element
  }

  public async load_element_list(ids: string[]): Promise<ElementType[]> {
    const promises: Promise<ElementType>[] = []
    for (const id of ids) {
      promises.push(this.load_element(id))
    }
    return await Promise.all(promises)
  }

  public async load_next_page(_reload_on_error: boolean = true): Promise<ElementType[]> {
    if (this.pages_ended) {
      return []
    }
    const objects = await this.try_load_data<ElementType[]>('load_next_page', this.page, this.page_count, _reload_on_error)

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

  public async load_by_filter(filter: FilterType, _reload_on_error: boolean = true): Promise<ElementType[]> {
    const objects = await this.try_load_data<ElementType[]>('load_by_filter', filter, _reload_on_error)

    if (objects === undefined) {
      throw new Error('load_by_filter object is undefined')
    }
    return objects
  }
}
