import {AxiosInstance} from "axios";

export class Authenticator {
    protected api: AxiosInstance;
    public refreshToken: string;

    constructor(api: AxiosInstance) {
        this.api = api;
        this.refreshToken = '';
    }

    public async login(loginFormData: object): Promise<void> {
        const result = await this.api.post('/auth', loginFormData);
        this.api.defaults.headers.common["Authorization"] = result.data.access_token;
        this.refreshToken = result.data.refresh_token;
    }

    public async reLogin(): Promise<void> {
        const formData = new FormData()
        formData.append('grant_type', 'refresh_token')
        formData.append('refresh_token', this.refreshToken)
        this.api.defaults.headers.common["Authorization"] = await this.api.post('/auth')
    }
}