import { ResourceLoader } from './loader'
import { ResourceStorage } from './storage'
import { FilledObject, FilterFnType, FilterType } from './types'

export class Resource<
  ContentType extends FilledObject,
  CreateContentType extends FilledObject,
  UpdateContentType extends FilledObject,
>
 {
  protected readonly resourceStorage: ResourceStorage<ContentType>
  protected readonly resourceLoader: ResourceLoader<ContentType, CreateContentType, UpdateContentType>
  protected readonly id_field_name: string
  public always_load: boolean

  constructor(
    resourceStorage: ResourceStorage<ContentType>, 
    resourceLoader: ResourceLoader<ContentType, CreateContentType, UpdateContentType>
  ) {
    this.resourceLoader = resourceLoader
    this.resourceStorage = resourceStorage
    this.id_field_name = 'id'
    this.always_load = true
  }

  // ============================= Loaders =============================

  public async load(id: string): Promise<void> {
    if (!this.always_load && this.resourceStorage.storage.has(id)) {
      return
    }

    const loaded_object = await this.resourceLoader.load(id)
    const id_loaded_object = loaded_object[this.id_field_name]
    this.resourceStorage.load_object_to_storage(id_loaded_object, loaded_object)
  }

  public async load_list(ids: string[]): Promise<void> {
    const loaded_objects = await this.resourceLoader.load_list(ids)
    this.resourceStorage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_next_page(): Promise<void> {
    const loaded_objects = await this.resourceLoader.load_next_page()
    this.resourceStorage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_by_filter(filter: FilterType): Promise<void> {
    const loaded_objects = await this.resourceLoader.load_by_filter(filter)
    this.resourceStorage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_photo(id: string): Promise<void> {
    const loaded_photo = await this.resourceLoader.load_photo(id)
    this.resourceStorage.load_photo_to_storage(this.id_field_name, loaded_photo)
  }

  public async load_photos(ids: string[]): Promise<void> {
    const loaded_photos = await this.resourceLoader.load_photos(ids)
    this.resourceStorage.load_photos_to_storage(this.id_field_name, loaded_photos)
  }


  // ============================= Getters =============================

  public get(id: string | undefined, default_value: ContentType): ContentType {
    return this.resourceStorage.get(id, default_value)
  }

  public get_objects(enable_revers_sort?: boolean): ContentType[] {
    return this.resourceStorage.get_objects(enable_revers_sort)
  }

  public get_by_filter(filter_query: FilterType, filter_fn: FilterFnType<ContentType> | null = null): ContentType[] {
    return this.resourceStorage.get_by_filter(filter_query, filter_fn)
  }

  // ============================= Data manipulating =============================

  public async create(create_schema: CreateContentType, data: FormData | null): Promise<void> {
    const created_object = await this.resourceLoader.create(create_schema, data)
    const created_object_id = created_object[this.id_field_name]
    this.resourceStorage.load_object_to_storage(created_object_id, created_object)
  }

  public async update(id: string, update_schema: UpdateContentType): Promise<void> {
    const updated_object = await this.resourceLoader.update(id, update_schema)
    this.resourceStorage.load_object_to_storage(id, updated_object)
  }

  public async delete(id: string): Promise<void> {
    await this.resourceLoader.delete(id)
    this.resourceStorage.delete_object_from_storage(id)
  }
}
