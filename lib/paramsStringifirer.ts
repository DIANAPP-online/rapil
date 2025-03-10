import type { FilterType } from "./types";

type Parameters = { [key: string]: FilterType }

export class ParamsStringifier {
    public static stringify_parameters(params: Parameters): string {
        let query_string = ''
        for (const [parameter_name, parameter_value] of Object.entries(params)) {
            query_string += this.stringify_parameter(parameter_name, parameter_value)
        }

        return query_string
    }

    public static stringify_parameter(parameter_name: string, parameter_value: FilterType): string {
        if (!Array.isArray(parameter_value)) {
            return `${parameter_name}=${parameter_value}`
        }
        
        const query_array: string[] = []

        for (const element_parameter_value in parameter_value) {
            query_array.push(`${parameter_name}=${element_parameter_value}`)
        }

        return query_array.join('&')
    }
}

