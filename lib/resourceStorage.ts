import { reactive, Reactive } from 'vue'
import { Field, FilledObject, FilterFnType, FilterType, SorterType } from './resourceTypes'

export class ResourceStorage<ContentType extends FilledObject> {
  public readonly storage: Reactive<Map<string, ContentType | undefined>>
  public max_storage_size: number | null
  public id_field_name: string
  public sort_fields: Field[]
  public global_enable_reverse_sort: boolean

  constructor() {
    this.storage = reactive(new Map())
    this.max_storage_size = null
  }

  public get(id: string | undefined, default_value: ContentType | undefined = undefined): ContentType {
    if (id === undefined) {
      if (default_value === undefined) {
        throw new Error(`Resource.get - id and default value are undefined`)
      }
      return default_value
    }
    const object = this.storage.get(id) as ContentType | undefined

    if (object === undefined) {
      if (default_value === undefined) {
        throw new Error(`Object is undefined`)
      }
      return default_value
    }

    return object
  }

  public get_objects(enable_reverse_sort: boolean = false): ContentType[] {
    const objects: ContentType[] = []
    for (const value of this.storage.values()) {
      objects.push(value as ContentType)
    }

    if (this.sort_fields.length) {
      objects.sort(this.get_compare_objects_function(enable_reverse_sort))
    }

    return objects
  }

  public get_by_filter(filter_query: FilterType, filter_fn: FilterFnType<ContentType> | null = null): ContentType[] {
    let objects = this.get_objects_by_filter(filter_query, this.get_objects())
    if (filter_fn !== null) {
      objects = this.get_objects_by_filter_fn(filter_fn, objects)
    }
    return objects
  }

  public load_object_to_storage(id: string, updated_object: ContentType, exists_value_priority: boolean = false): ContentType {
    let new_object: any
    const object_from_storage = this.storage.get(id) as ContentType
    if (exists_value_priority) {
      new_object = {
        ...updated_object,
        ...object_from_storage,
      }
    } else {
      new_object = {
        ...object_from_storage,
        ...updated_object,
      }
    }
    this.storage.set(id, new_object)
    this.clean_storage()
    return new_object
  }

  public load_objects_to_storage(id_field_name: string, objects: ContentType[]) {
    for (const obj of objects) {
      this.load_object_to_storage(obj[id_field_name], obj)
    }
  }

  public get_compare_objects_function(enable_reverse_sort: boolean): SorterType<ContentType> {
    function compare_objects(a: ContentType, b: ContentType) {
      for (const compare_field of this.sort_fields) {
        const value_of_type_sort = this.global_enable_reverse_sort ? this.global_enable_reverse_sort : enable_reverse_sort
        const sort_number = 2 * Number(!value_of_type_sort) - 1
        if (a[compare_field] > b[compare_field]) {
          return sort_number
        }
        if (a[compare_field] < b[compare_field]) {
          return -sort_number
        }
      }
      return 0
    }

    return compare_objects
  }

  private get_objects_by_filter<T extends FilledObject>(filter: FilterType, objects: T[]): T[] {
    const filtered_objects: T[] = []
    for (const object of objects) {
      let isObjectCorrect = true
      for (const [key, value] of Object.entries(filter)) {
        isObjectCorrect &&= object[key] === value
      }
      if (isObjectCorrect) {
        filtered_objects.push(object)
      }
    }
    return filtered_objects
  }

  private get_objects_by_filter_fn(filterFn: FilterFnType<ContentType>, objects: ContentType[]): ContentType[] {
    const filtered_objects: ContentType[] = []
    for (const object of objects) {
      if (filterFn(object)) {
        filtered_objects.push(object)
      }
    }
    return filtered_objects
  }

  private clean_storage(): void {
    const ids_iter = this.storage.keys()
    while (this.max_storage_size !== null && this.storage.size >= this.max_storage_size) {
      const deleteID = ids_iter.next().value
      this.delete_object_from_storage(deleteID)
    }
  }

  public delete_object_from_storage(id: string): void {
    this.storage.delete(id)
  }
}
