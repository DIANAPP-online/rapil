import { ParamsStringifier } from './paramsStringifirer';
import { ResourceSession } from './session';
import { Endpoint } from './types';
import axios, {
  AxiosInstance,
} from "axios"

type BaseURL = `https://${string}` | `http://${string}`

export interface Authenticator {
  get_session: () => Promise<ResourceSession>
}

export class OAuth2 implements Authenticator {
  protected session: ResourceSession
  protected is_login_loading: boolean
  protected is_relogin_loading: boolean
  protected readonly auth_endpoint: Endpoint
  protected readonly base_url: BaseURL
  protected readonly TIME_SLEEP: number
  protected api: AxiosInstance
  protected refresh_token: string | null
  protected access_token: string | null

  constructor(auth_endpoint: Endpoint, base_url: BaseURL) {
    this.is_login_loading = false
    this.TIME_SLEEP = 200
    this.auth_endpoint = auth_endpoint
    this.base_url = base_url
    this.refresh_token = null
    this.access_token = null
    this.api = axios.create()
    this.session = new ResourceSession(this.api)
    this.is_relogin_loading = false
    this.is_login_loading = false
    this.get_refresh_token()
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

    if (response.data.refresh_token && response.data.access_token) {
      this.refresh_token = response.data.refresh_token as string
      this.access_token = response.data.access_token as string
      localStorage.setItem("access_token", this.access_token)
      localStorage.setItem("refresh_token", this.refresh_token)
    }

    const api = this.initializeApi(
      response.data.access_token,
      response.data.token_type
    )

    this.session = new ResourceSession(api)

    this.is_login_loading = false
  }

  public async get_session(): Promise<ResourceSession> {
    const have_session = Boolean(this.session)
    const is_alive_session = this.session.is_alive

    if (!have_session || !is_alive_session) {
      await this.relogin()
    }

    return this.session
  }

  protected async relogin(): Promise<void> {
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

    form_data.append("refresh_token", this.refresh_token)
    form_data.append("grant_type", "refresh_token")

    const response = await this.api.post(this.auth_endpoint, form_data)

    if (this.is_login_loading) {
      this.is_relogin_loading = false
      return
    }

    if (response.data.refresh_token && response.data.access_token) {
      this.access_token = response.data.access_token as string
      localStorage.setItem("access_token", this.access_token)
    }

    const api = this.initializeApi(
      response.data.access_token,
      response.data.token_type
    )

    this.session = new ResourceSession(api)
    this.is_relogin_loading = false
  }

  protected get_refresh_token() {
    this.refresh_token = localStorage.getItem("refresh_token")
  }

  protected sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  protected initializeApi(
    access_token: string,
    token_type: string
  ): AxiosInstance {
    const api = axios.create({
      baseURL: this.base_url,
      paramsSerializer: params => ParamsStringifier.stringify_parameters(params),
      validateStatus: () => true,
    })

    api.defaults.headers["Authorization"] = token_type + " " + access_token

    return api
  }
}
