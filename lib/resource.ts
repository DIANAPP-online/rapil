import { ResourceElementLoader } from './elementLoader'
import { ResourceElementManipulate } from './elementManipulate'
import { ResourcePhotoLoader } from './photoLoader'
import { ResourceStorage } from './storage'
import { FilledObject, FilterFnType, FilterType } from './types'

export class Resource<
  ElementType extends FilledObject,
  CreateElementType extends FilledObject,
  UpdateElementType extends FilledObject,
>
 {
  public always_load: boolean
  protected readonly resource_storage: ResourceStorage<ElementType>
  protected readonly resource_element_loader: ResourceElementLoader<ElementType>
  protected readonly resource_photo_loader: ResourcePhotoLoader
  protected readonly resource_element_manipulate: ResourceElementManipulate<ElementType, CreateElementType, UpdateElementType>
  protected readonly id_field_name: string

  constructor(
    resource_storage: ResourceStorage<ElementType>, 
    resource_element_loader: ResourceElementLoader<ElementType>,
    resource_photo_loader: ResourcePhotoLoader,
    resource_element_manipulate: ResourceElementManipulate<ElementType, CreateElementType, UpdateElementType>
  ) {
    this.resource_storage = resource_storage
    this.resource_element_loader = resource_element_loader
    this.resource_photo_loader = resource_photo_loader
    this.resource_element_manipulate = resource_element_manipulate
    this.id_field_name = 'id'
    this.always_load = true
  }

  // ============================= Loaders Elements =============================

  public async load(id: string): Promise<void> {
    if (!this.always_load && this.resource_storage.storage.has(id)) {
      return
    }

    const loaded_object = await this.resource_element_loader.load_element(id)
    const id_loaded_object = loaded_object[this.id_field_name]
    this.resource_storage.load_object_to_storage(id_loaded_object, loaded_object)
  }

  public async load_list(ids: string[]): Promise<void> {
    const loaded_objects = await this.resource_element_loader.load_element_list(ids)
    this.resource_storage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_next_page(): Promise<void> {
    const loaded_objects = await this.resource_element_loader.load_next_page()
    this.resource_storage.load_objects_to_storage(this.id_field_name, loaded_objects)
  }

  public async load_by_filter(filter: FilterType): Promise<void> {
    const loaded_objects = await this.resource_element_loader.load_by_filter(filter)
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

  public get(id: string | undefined, default_value: ElementType): ElementType {
    return this.resource_storage.get(id, default_value)
  }

  public get_objects(enable_revers_sort?: boolean): ElementType[] {
    return this.resource_storage.get_objects(enable_revers_sort)
  }

  public get_by_filter(filter_query: FilterType, filter_fn: FilterFnType<ElementType> | null = null): ElementType[] {
    return this.resource_storage.get_by_filter(filter_query, filter_fn)
  }

  // ============================= Data manipulating =============================

  public async create(create_schema: CreateElementType, data: FormData | null): Promise<void> {
    const created_object = await this.resource_element_manipulate.create(create_schema, data)
    const created_object_id = created_object[this.id_field_name]
    this.resource_storage.load_object_to_storage(created_object_id, created_object)
  }

  public async update(id: string, update_schema: UpdateElementType): Promise<void> {
    const updated_object = await this.resource_element_manipulate.update(id, update_schema)
    this.resource_storage.load_object_to_storage(id, updated_object)
  }

  public async delete(id: string): Promise<void> {
    await this.resource_element_manipulate.delete(id)
    this.resource_storage.delete_object_from_storage(id)
  }
}
