import { ParamsStringifier } from './paramsStringifirer';
import { Endpoint, GetConfigType } from './resourceTypes';
import axios, {
  AxiosInstance,
  isAxiosError,
  type AxiosRequestConfig,
} from "axios"

type BaseURL = `https://${string}` | `http://${string}`

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

export interface Authenticator {
  get_session: () => Promise<ResourceSession>
}

class OAuth2Authentificator implements Authenticator {
  protected session: ResourceSession
  protected is_login_loading: boolean
  protected is_relogin_loading: boolean
  protected readonly auth_endpoint: Endpoint
  protected readonly base_url: BaseURL
  protected readonly TIME_SLEEP: number
  protected api: AxiosInstance
  protected refresh_token: string | null

  constructor(auth_endpoint: Endpoint, base_url: BaseURL) {
    this.is_login_loading = false
    this.TIME_SLEEP = 200
    this.auth_endpoint = auth_endpoint
    this.base_url = base_url
    this.get_refresh_token()
  }

  protected get_refresh_token() {
    this.refresh_token = localStorage.getItem("refresh_token")
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  public async login(
    username: string,
    password: string,
    scopes?: string
  ): Promise<void> {
    if (this.is_login_loading) {
      while (this.is_login_loading) {
        await this.sleep(this.TIME_SLEEP)
      }

      return
    }

    this.is_login_loading = true
    const form_data = new FormData()
    form_data.append("username", username)
    form_data.append("password", password)
    form_data.append("grant_type", "password")

    if (scopes) {
      form_data.append("scopes", scopes)
    }

    this.api = axios.create({
      baseURL: this.base_url,
      validateStatus: () => true,
    })

    const response = await this.api.post(this.auth_endpoint, form_data)

    this.refresh_token = response.data.refresh_token

    const api = this.initializeApi(
      response.data.access_token,
      response.data.token_type
    )

    this.session = new ResourceSession(api)

    this.is_login_loading = false
  }

  private async relogin(): Promise<void> {
    if (this.is_relogin_loading || this.is_login_loading) {
      while (this.is_relogin_loading || this.is_login_loading) {
        await this.sleep(this.TIME_SLEEP)
      }

      return
    }

    if (!this.refresh_token) {
      throw new Error("Refresh token does not exist")
    }

    this.is_relogin_loading = true
    const form_data = new FormData()

    form_data.append("grant_type", "refresh_token")
    form_data.append("refresh_token", this.refresh_token)

    const response = await this.api.post(this.auth_endpoint, form_data)

    if (this.is_login_loading) {
      this.is_relogin_loading = false
      return
    }

    const api = this.initializeApi(
      response.data.access_token,
      response.data.token_type
    )

    this.session = new ResourceSession(api)
    this.is_relogin_loading = false
  }
  protected initializeApi(
    access_token: string,
    token_type: string
  ): AxiosInstance {
    const api = axios.create({
      baseURL: this.base_url,
      paramsSerializer: params => ParamsStringifier.stringifyParameters(params),
      validateStatus: () => true,
    })

    api.defaults.headers["Authorization"] = token_type + " " + access_token

    return api
  }

  public async get_session(): Promise<ResourceSession> {
    if (!this.session || !this.session.is_alive) {
      await this.relogin()
    }

    return this.session
  }
}

const base_url = "https://phys.dianapp.ru/api"

const O2AuthAuthentificatorInstance = new OAuth2Authentificator(
  "/sessions",
  base_url
)
