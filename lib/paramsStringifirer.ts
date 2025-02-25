import type { FilterType } from "./resourceTypes";

type Parameters = { [key: string]: FilterType }

export class ParamsStringifier {
    public static stringifyParameters(params: Parameters): string {
        let queryString = ''
        for (const [parameterName, parameterValue] of Object.entries(params)) {
            queryString += this.stringifyParameter(parameterName, parameterValue)
        }

        return queryString
    }

    public static stringifyParameter(parameterName: string, parameterValue: FilterType): string {
        if (!Array.isArray(parameterValue)) {
            return `${parameterName}=${parameterValue}`
        }
        
        const queryArray: string[] = []

        for (const elementParameterValue in parameterValue) {
            queryArray.push(`${parameterName}=${elementParameterValue}`)
        }

        return queryArray.join('&')
    }
}

