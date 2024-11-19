import {FilledObject} from "./resourceTypes";

export class SchemaStyler<ContentType, PushMethods, PullMethods> {
    public getAPIStyledSchema (obj: ContentType, _: PushMethods) {
        return obj
    };
    public getResourceStyledSchema (obj: FilledObject, _: PullMethods) {
        return obj as ContentType;
    }
}