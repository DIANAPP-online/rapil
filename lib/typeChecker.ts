import {BaseSchemaType, FilledObject} from "./resourceTypes";


export class TypeChecker<Methods extends string> {
    readonly schemas: { [method in Methods]: BaseSchemaType | null };

    constructor(schemas: { [method in Methods]: BaseSchemaType | null }) {
        this.schemas = schemas
    }

    public typeCheck(
        schema: FilledObject,
        method: Methods,
        _in: string = "",
    ): void {
        const schemaType = this.schemas[method];
        let _in_str = _in + "|";
        if (schemaType === null) {
            throw new Error(`schemaType for ${method} method is not defined`);
        }
        this.typeCheckForExtraFields(schemaType, schema, method, _in_str);
        this.typeCheckForTypeError(schemaType, schema, method, _in_str);
        this.typeCheckForForUnfilledFields(schemaType, schema, method, _in_str);
    }

    private typeCheckForExtraFields(
        schemaType: BaseSchemaType,
        schema: FilledObject,
        method: Methods,
        _in_str: string,
    ) {
        for (const key of Object.keys(schema)) {
            if (schemaType[key] === undefined) {
                throw new Error(
                    `Field ${key}${_in_str} does not exist in ${method}SchemaType`,
                );
            }
        }
    }

    private typeCheckForTypeError(
        schemaType: BaseSchemaType,
        schema: FilledObject,
        method: string,
        _in_str: string,
    ): void {
        for (const [key, value] of Object.entries(schema)) {
            // @ts-ignore
            if (
                Array.isArray(schemaType[key]) &&
                !schemaType[key].includes(typeof value)
            ) {
                // Type is not in ['someType1', 'someType2']
                const expected = Object.keys(schemaType).reduce(
                    (a: string, b: string) => a + " | " + b,
                );
                throw new Error(
                    `Invalid type for key ${key}${_in_str}, expected: ${expected}, actual: ${typeof value}`,
                );
            }
            if (
                typeof schemaType[key] === "object" &&
                schemaType[key] !== null &&
                !Array.isArray(schemaType[key])
            ) {
                // @ts-ignore
                // Recursive check for {some_field: {field: 'someType'}}
                this.typeCheck(schemaType[key], value, method, _in_str + key);
            }
            if (
                typeof schemaType[key] === "string" &&
                schemaType[key] !== typeof value
            ) {
                // Type is not equal 'someType'
                throw new Error(
                    `Invalid type for key ${key}${_in_str}, expected: ${schemaType[key]}, actual: ${typeof value}`,
                );
            }
        }
    }

    private typeCheckForForUnfilledFields(
        schemaType: BaseSchemaType,
        schema: FilledObject,
        method: Methods,
        _in_str: string,
    ) {
        for (const key of Object.keys(schemaType)) {
            if (!["string", "object"].includes(typeof schemaType[key])) {
                // Error in schemaType, unavailable syntax
                throw new Error(
                    `Invalid ${method}SchemaType key ${key} type${_in_str}`,
                );
            }
            if (schema[key] === undefined) {
                // Field doesn't present in schema
                throw new Error(`Field ${key} does not present in schema${_in_str}`);
            }
        }
    }
}