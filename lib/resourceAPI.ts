import { AxiosError, AxiosResponse } from "axios"
import { Authenticator } from "./authenticator"
import { RequestBuilder } from "./requestBuilder"
import { Endpoint, LoaderMethods, NeedReAuth } from "./types"

const GET_REQUEST_BUILDER_METHOD = {
  create: 'get_create_request',
  put: 'get_put_request',
  patch: 'get_patch_request',
  delete: 'get_delete_request',
  load_json: 'get_load_one_request',
  load_photo: 'get_load_one_request',
  load_next_page: 'get_load_next_page_request',
  load_by_filter: 'get_load_py_filter_request',
} as const

export type RequestBuilderMethodsType = typeof GET_REQUEST_BUILDER_METHOD[keyof typeof GET_REQUEST_BUILDER_METHOD]

export class ResourceAPI {
  protected readonly authenticator: Authenticator
  protected readonly endpoint: Endpoint

  constructor(authenticator: Authenticator, endpoint: Endpoint) {
    this.authenticator = authenticator
    this.endpoint = endpoint
  }

  protected async try_load_data<ReturnType>(loader_method: LoaderMethods, ...args: any[]): Promise<ReturnType> {
    const POSITION_PARAMETER_FOR_REALOD = args.length - 1
    const _reload_on_error = args[POSITION_PARAMETER_FOR_REALOD]

    const request_builder = await this.create_request_builder()
    const name_method_of_request_builder: RequestBuilderMethodsType = GET_REQUEST_BUILDER_METHOD[loader_method]

    try {
      const response = await request_builder[name_method_of_request_builder](...args)
      const result_response_check = this.response_check<ReturnType>(response, loader_method) as ReturnType
      return result_response_check
    } catch (e: unknown) {
      if (e instanceof NeedReAuth && _reload_on_error) {
        args[POSITION_PARAMETER_FOR_REALOD] = false
        return await this.try_load_data(loader_method, ...args)
      } else {
        throw new AxiosError('Relogin throw error')
      }
    }
  }

  protected response_check<ReturnType>(response: AxiosResponse, method: string): ReturnType | void {
    if (response && [200, 201, 202].includes(response.status) && response.data) {
      return response.data
    }
    if (response && response.status == 204) {
      return
    }
    if (method == 'update' && response && response.status === 304 && response.data) {
      return response.data
    }
    if (response && response.status === 403) {
      throw new Error(`Access was forbidden then was called ${method} method. Status code: ${response.status}`)
    }
    if (response && response.status === 406) {
      throw new Error(`Request succeeded but couldn’t generate a response that matches the content type in the ${method} method.`)
    }
    if (response && response.status === 409) {
      throw new Error(`Request well-formed, but have some conflicts with another resource`)
    }
    throw new Error(`Unexpected API error in ${method} method. Status code: ${response.status}`)
  }

  protected async create_request_builder(): Promise<RequestBuilder> {
    return new RequestBuilder(this.endpoint, await this.authenticator.get_session())
  }
}
