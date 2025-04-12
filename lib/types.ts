export type Field = string | number

export type AccessTokenType = string

export interface BaseSchemaType {
  [fieldName: string | number]: string | string[] | BaseSchemaType
}

export interface FilledObject {
  [key: Field]: any
}

export type PullMethods = 'load' | 'create' | 'update'
export type PushMethods = 'create' | 'update'

export type FilterFnType<T> = (obj: T) => boolean
export type SorterType<T> = (a: T, b: T) => number

export interface FilterType {
  [field: string]: string | number | boolean | string[] | number[] | boolean[]
}

export type LoaderMethods = 'create' |
  'patch' |
  'put' |
  'delete' |
  'load_json' |
  'load_next_page' |
  'load_by_filter' |
  'load_photo'

export type BaseURL = `https://${string}` | `http://${string}`

export class NeedReAuth extends Error {
  constructor() {
    super('Need reauth')
  }
}

export class IncorrectDataForAuth extends Error {
  public readonly status: number
  public static message: string = 'Incorrect login or password'
  constructor() {
    super(IncorrectDataForAuth.message)
    this.status = 401
  }
}

export type Endpoint = `/${string}${string}`

export interface AuthResponse {
  refresh_token: string
  access_token: string
  token_type: string
}

export interface GetConfigType {
  id?: string
  params?: {
    page?: number
    count?: number
    filters?: FilterType
  }
}

export interface PhotoObject {
  [key: string]: string
  content: Base64URLString
}
