import { AxiosInstance, AxiosRequestConfig, isAxiosError } from "axios"
import { Endpoint, GetConfigType } from "./resourceTypes"


export class ResourceSession {
  public is_alive: boolean
  public api: AxiosInstance

  constructor(api: AxiosInstance) {
    this.is_alive = true
    this.api = api
  }

  public async get<ContentType>(
    endpoint: Endpoint,
    config: GetConfigType
  ): Promise<ContentType> {
    if (config.id) {
      return await this.run_with_alive_session_check(this.api.get(`${endpoint}/${config.id}`))
    }

    return await this.run_with_alive_session_check(this.api.get(`${endpoint}`, { data: config }))
  }

  public async post<ContentType, CreateContentType>(
    endpoint: Endpoint,
    data: CreateContentType,
    config?: AxiosRequestConfig
  ): Promise<ContentType> {
    return await this.run_with_alive_session_check(
      this.api.post(endpoint, data, config)
    )
  }
  // TODO: https://www.reddit.com/r/typescript/comments/vgk05a/how_to_allow_objects_with_certain_types_of_keys/
  // Optional UpdateContentType fields
  public async patch<ContentType, UpdateContentType>(
    endpoint: Endpoint,
    id: string,
    data: UpdateContentType,
    config?: AxiosRequestConfig
  ): Promise<ContentType> {
    return await this.run_with_alive_session_check(
      this.api.patch(`${endpoint}/${id}`, data, config)
    )
  }

  public async put<ContentType, UpdateContentType>(
    endpoint: Endpoint,
    id: string,
    data: UpdateContentType,
    config?: AxiosRequestConfig
  ): Promise<ContentType> {
    return await this.run_with_alive_session_check(
      this.api.put(`${endpoint}/${id}`, data, config)
    )
  }

  public async delete(
    endpoint: Endpoint,
    id: string,
    config?: AxiosRequestConfig
  ): Promise<void> {
    await this.run_with_alive_session_check(
      this.api.delete(`${endpoint}/${id}`, config)
    )
  }

  protected async run_with_alive_session_check<T extends Promise<any>>(
    method: T
  ): Promise<Awaited<T>> {
    const error = new Error("Current session died")
    if (!this.is_alive) {
      throw error
    }

    try {
      return await method
    } catch (payload: unknown) {
      if (isAxiosError(payload) && payload.status === 401) {
        this.is_alive = false
        throw error
      }

      throw payload
    }
  }
}