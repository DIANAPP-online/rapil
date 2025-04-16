import type {
  AxiosInstance,
  AxiosResponse,
} from 'axios'
import type { AuthResponse, BaseURL, Endpoint } from './types'
import axios from 'axios'
import { ParamsStringifier } from './paramsStringifirer'
import { ResourceSession } from './session'
import { IncorrectDataForAuth } from './types'

export interface Authenticator {
  get_session: () => Promise<ResourceSession>
}

export class OAuth2 implements Authenticator {
  protected session: ResourceSession | null
  protected is_login_loading: boolean
  protected is_relogin_loading: boolean
  protected readonly login_endpoint: Endpoint
  protected readonly base_url: BaseURL
  protected readonly TIME_SLEEP: number
  protected api: AxiosInstance
  protected refresh_token: string | null
  protected access_token: string | null

  constructor(auth_endpoint: Endpoint, base_url: BaseURL) {
    this.is_login_loading = false
    this.TIME_SLEEP = 200
    this.login_endpoint = auth_endpoint
    this.base_url = base_url
    this.refresh_token = null
    this.access_token = null
    this.api = axios.create({
      baseURL: this.base_url,
      validateStatus: () => true,
    })
    this.session = null
    this.is_relogin_loading = false
    this.is_login_loading = false
    this.get_refresh_token()
  }

  public async login(
    username: string,
    password: string,
    scopes?: string,
  ): Promise<void> {
    if (this.is_relogin_loading || this.is_login_loading) {
      await this.awaiting_authorization()
      return
    }

    this.is_login_loading = true
    const form_data = new FormData()
    form_data.append('username', username)
    form_data.append('password', password)
    form_data.append('grant_type', 'password')

    if (scopes) {
      form_data.append('scopes', scopes)
    }

    const response = await this.api.post(this.login_endpoint, form_data)

    if (response.status === 401) {
      this.is_login_loading = false
      throw new IncorrectDataForAuth()
    }

    this.create_session(response)

    this.is_login_loading = false
  }

  public async get_session(): Promise<ResourceSession> {
    const have_session = Boolean(this.session)
    const is_alive_session = this.session?.is_alive

    if (!have_session || !is_alive_session) {
      await this.relogin()
    }

    return this.session!
  }

  protected async relogin(): Promise<void> {
    if (this.is_relogin_loading || this.is_login_loading) {
      await this.awaiting_authorization()
      return
    }

    if (!this.refresh_token) {
      throw new Error('Refresh token does not exist')
    }

    this.is_relogin_loading = true
    const form_data = new FormData()

    form_data.append('refresh_token', this.refresh_token)
    form_data.append('grant_type', 'refresh_token')

    const response = await this.api.post(this.login_endpoint, form_data)

    if (this.is_login_loading) {
      this.is_relogin_loading = false
      await this.awaiting_authorization()
      return
    }

    if (response.status === 401) {
      this.is_relogin_loading = false
      localStorage.removeItem('refresh_token')
      throw new IncorrectDataForAuth()
    }

    this.create_session(response)

    this.is_relogin_loading = false
  }

  protected get_refresh_token() {
    this.refresh_token = localStorage.getItem('refresh_token')
  }

  protected sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  protected create_session(response: AxiosResponse<AuthResponse>): void {
    const { refresh_token, access_token, token_type } = response.data

    this.refresh_token = refresh_token
    this.access_token = access_token
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('access_token', access_token)

    this.api = this.initialize_api(access_token, token_type)
    this.session = new ResourceSession(this.api)
  }

  protected async awaiting_authorization(): Promise<void> {
    while (this.is_login_loading || this.is_relogin_loading) {
      await this.sleep(this.TIME_SLEEP)
    }
    const have_session = this.session
    const is_alive_session = this.session?.is_alive

    if (!have_session || !is_alive_session) {
      throw new IncorrectDataForAuth()
    }
  }

  protected initialize_api(
    access_token: string,
    token_type: string,
  ): AxiosInstance {
    const api = axios.create({
      baseURL: this.base_url,
      paramsSerializer: (params) => ParamsStringifier.stringify_parameters(params),
      validateStatus: () => true,
    })
    api.defaults.headers.Authorization = `${token_type} ${access_token}`

    return api
  }
}
