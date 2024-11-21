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

export type NeedReAuth = undefined;

export type FilterType = {
    [field: string]: string | number | boolean | string[] | number[] | boolean[]
}