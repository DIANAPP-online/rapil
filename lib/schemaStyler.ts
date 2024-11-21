import {FilledObject, FilterType} from "./resourceTypes";

export class SchemaStyler<ToAPIContentType, ToResourceContentType, PushMethods, PullMethods> {
    public getAPIStyledSchema (obj: ToAPIContentType, _: PushMethods): FilledObject {
        return obj
    };
    public getResourceStyledSchema (obj: FilledObject, _: PullMethods): ToResourceContentType {
        return obj as ToResourceContentType;
    }
}