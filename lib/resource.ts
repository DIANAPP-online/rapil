import type { ResourceJSONLoader } from './jsonLoader'
import type { ResourceJSONManipulate } from './jsonManipulate'
import type { ResourcePhotoLoader } from './photoLoader'
import type { ResourceStorage } from './storage'
import type { FilledObject, FilterFnType, FilterType } from './types'

export class Resource<
  JSONType extends FilledObject,
  CreateJSONType extends FilledObject,
  UpdateJSONType extends FilledObject,
> {
  public always_load: boolean
  protected readonly resource_storage: ResourceStorage<JSONType>
  protected readonly resource_json_loader: ResourceJSONLoader<JSONType>
  protected readonly resource_photo_loader: ResourcePhotoLoader
  protected readonly resource_json_manipulate: ResourceJSONManipulate<JSONType, CreateJSONType, UpdateJSONType>
  protected readonly id_field_name: string

  constructor(
    resource_storage: ResourceStorage<JSONType>,
    resource_json_loader: ResourceJSONLoader<JSONType>,
    resource_photo_loader: ResourcePhotoLoader,
    resource_json_manipulate: ResourceJSONManipulate<JSONType, CreateJSONType, UpdateJSONType>,
  ) {
    this.resource_storage = resource_storage
    this.resource_json_loader = resource_json_loader
    this.resource_photo_loader = resource_photo_loader
    this.resource_json_manipulate = resource_json_manipulate
    this.id_field_name = 'id'
    this.always_load = true
  }

  // ============================= Loaders JSONs =============================

  public async load(id: string): Promise<void> {
    if (!this.always_load && this.resource_storage.storage.has(id)) {
      return
    }

    const loaded_object = await this.resource_json_loader.load_json(id)
    const id_loaded_object = loaded_object[this.id_field_name]
    this.resource_storage.load_object_to_storage(id_loaded_object, loaded_object)
  }

  public async load_list(ids: string[]): Promise<void> {
    const loaded_objects = await this.resource_json_loader.load_json_list(ids)
    this.resource_storage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_next_page(): Promise<void> {
    const loaded_objects = await this.resource_json_loader.load_next_page()
    this.resource_storage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_by_filter(filter: FilterType): Promise<void> {
    const loaded_objects = await this.resource_json_loader.load_by_filter(filter)
    this.resource_storage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  // ============================= Loaders Photos =============================

  public async load_photo(id: string): Promise<void> {
    const loaded_photo = await this.resource_photo_loader.load_photo(id)
    this.resource_storage.load_photo_to_storage(this.id_field_name, loaded_photo)
  }

  public async load_photos(ids: string[]): Promise<void> {
    const loaded_photos = await this.resource_photo_loader.load_photos(ids)
    this.resource_storage.load_photos_to_storage(this.id_field_name, loaded_photos)
  }

  // ============================= Getters =============================

  public get(id: string | undefined, default_value: JSONType): JSONType {
    return this.resource_storage.get(id, default_value)
  }

  public get_objects(enable_revers_sort?: boolean): JSONType[] {
    return this.resource_storage.get_objects(enable_revers_sort)
  }

  public get_by_filter(filter_query: FilterType, filter_fn: FilterFnType<JSONType> | null = null): JSONType[] {
    return this.resource_storage.get_by_filter(filter_query, filter_fn)
  }

  // ============================= Data manipulating =============================

  public async create(create_schema: CreateJSONType, data: FormData | null): Promise<void> {
    const created_object = await this.resource_json_manipulate.create(create_schema, data)
    const created_object_id = created_object[this.id_field_name]
    this.resource_storage.load_object_to_storage(created_object_id, created_object)
  }

  public async patch(id: string, update_schema: UpdateJSONType): Promise<void> {
    const updated_object = await this.resource_json_manipulate.patch(id, update_schema)
    this.resource_storage.load_object_to_storage(id, updated_object)
  }

  public async put(id: string, update_schema: UpdateJSONType): Promise<void> {
    const updated_object = await this.resource_json_manipulate.put(id, update_schema)
    this.resource_storage.load_object_to_storage(id, updated_object)
  }

  public async delete(id: string): Promise<void> {
    await this.resource_json_manipulate.delete(id)
    this.resource_storage.delete_object_from_storage(id)
  }
}
