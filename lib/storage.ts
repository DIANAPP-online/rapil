import type { Reactive } from 'vue'
import type { Field, FilledObject, FilterFnType, FilterType, PhotoObject, SorterType } from './types'
import { reactive } from 'vue'

export class ResourceStorage<
  ContentType extends FilledObject,
> {
  public readonly storage: Reactive<Map<string, ContentType | undefined>>
  public readonly photos_storage: Reactive<Map<string, Base64URLString | undefined>>
  public max_storage_size: number | null
  public sort_fields: Field[]
  public global_enable_reverse_sort: boolean

  constructor() {
    this.storage = reactive(new Map())
    this.photos_storage = reactive(new Map())
    this.max_storage_size = null
    this.sort_fields = []
    this.global_enable_reverse_sort = false
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

  public get_photo(id: string): Base64URLString {
    const getted_photo = this.photos_storage.get(id) as Base64URLString

    if (getted_photo === undefined) {
      throw new Error('Photo is undefined')
    }

    return getted_photo
  }

  public get_photos(ids: string[]): Base64URLString[] {
    const getted_photos: Base64URLString[] = []

    for (const id of ids) {
      getted_photos.push(this.get_photo(id))
    }

    return getted_photos
  }

  public get_by_filter(filter_query: FilterType, filter_fn?: FilterFnType<ContentType>): ContentType[] {
    let objects = this.get_objects_by_filter(filter_query, this.get_objects())
    if (filter_fn) {
      objects = this.get_objects_by_filter_fn(filter_fn, objects)
    }
    return objects
  }

  public load_object_to_storage(
    id: string,
    updated_object: ContentType,
    exists_value_priority: boolean = false,
  ): ContentType {
    let new_object: any
    const object_from_storage = this.storage.get(id) as ContentType
    if (exists_value_priority) {
      new_object = {
        ...updated_object,
        ...object_from_storage,
      }
    }
    else {
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

  public load_photo_to_storage(id: string, photo: Base64URLString) {
    this.photos_storage.set(id, photo as any)
  }

  public load_photos_to_storage(id_field_name: string, photos: PhotoObject[]) {
    for (const photo of photos) {
      this.load_photo_to_storage(photo[id_field_name], photo.content)
    }
  }

  public get_compare_objects_function(
    enable_reverse_sort: boolean,
  ): SorterType<ContentType> {
    const compare_objects = (a: ContentType, b: ContentType) => {
      for (const compare_field of this.sort_fields) {
        const value_of_type_sort
          = this.global_enable_reverse_sort
            ? this.global_enable_reverse_sort
            : enable_reverse_sort
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
      const delete_id = ids_iter.next().value
      this.delete_object_from_storage(delete_id as string)
    }
  }

  public delete_object_from_storage(id: string): void {
    this.storage.delete(id)
  }
}
