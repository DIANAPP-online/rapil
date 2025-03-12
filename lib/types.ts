export type Field = string | number;

export type AccessTokenType = string;

export type BaseSchemaType = {
    [fieldName: string | number]: string | string[] | BaseSchemaType;
};

export interface FilledObject {
    [key: Field]: any;
}

export type PullMethods = "load" | "create" | "update"
export type PushMethods = "create" | "update"

export type FilterFnType<T> = (obj: T) => boolean
export type SorterType<T> = (a: T, b: T) => number

export type FilterType = {
    [field: string]: string | number | boolean | string[] | number[] | boolean[]
}

export type LoaderMethods = "create" | "patch" | "put" | "delete" | "load" | "load_next_page" | "load_by_filter" | "load_photo"

export type BaseURL = `https://${string}` | `http://${string}`

export class NeedReAuth extends Error {
    constructor() {
        super("Need reauth")
    }
}

export class IncorrectDataForAuth extends Error {
    public readonly status: number;
    public static message: string = 'Incorrect login or password'
    constructor() {
        super(IncorrectDataForAuth.message)
        this.status = 401
    }
}

export type Endpoint = `/${string}`

export type AuthResponse = {
    refresh_token: string
    access_token: string
    token_type: string
}

export type GetConfigType = {
  id?: string
  params?: {
    page?: number
    count?: number
    filters?: FilterType
  }
}
