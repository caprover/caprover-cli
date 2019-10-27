import ErrorFactory from '../utils/ErrorFactory'
import Logger from '../utils/Logger'
import * as Request from 'request-promise'

var TOKEN_HEADER = 'x-captain-auth'
var NAMESPACE = 'x-namespace'
var CAPTAIN = 'captain'

export default class HttpClient {
    public readonly GET = 'GET'
    public readonly POST = 'POST'
    public readonly POST_DATA = 'POST_DATA'
    public isDestroyed = false

    constructor(
        private baseUrl: string,
        private authToken: string,
        private onAuthFailure: () => Promise<any>
    ) {
        //
    }

    createHeaders() {
        let headers: any = {}
        if (this.authToken) headers[TOKEN_HEADER] = this.authToken
        headers[NAMESPACE] = CAPTAIN

        // check user/appData or apiManager.uploadAppData before changing this signature.
        return headers
    }

    setAuthToken(authToken: string) {
        this.authToken = authToken
    }

    destroy() {
        this.isDestroyed = true
    }

    fetch(
        method: 'GET' | 'POST' | 'POST_DATA',
        endpoint: string,
        variables: any
    ): () => Promise<any> {
        return async (): Promise<any> => {

            if (process.env.REACT_APP_IS_DEBUG) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            let requestResponse = await this.fetchInternal(method, endpoint, variables);
            let data = JSON.parse(requestResponse);

            if (data.status === ErrorFactory.STATUS_AUTH_TOKEN_INVALID) {

                await this.onAuthFailure();
                requestResponse = await this.fetchInternal(method, endpoint, variables);
                data = JSON.parse(requestResponse);
            }

            if (data.status !== ErrorFactory.OKAY &&
                data.status !== ErrorFactory.OKAY_BUILD_STARTED) {
                throw ErrorFactory.createError(
                    data.status || ErrorFactory.UNKNOWN_ERROR,
                    data.description || ''
                );
            }
            
            if (!this.isDestroyed) return data.data;
            Logger.dev('Destroyed then not called');

            throw ErrorFactory.createError(
                data.status || ErrorFactory.UNKNOWN_ERROR,
                data.description || ''
            );
        }
    }

    fetchInternal(
        method: 'GET' | 'POST' | 'POST_DATA',
        endpoint: string,
        variables: any
    ): Promise<any> {
        if (method === this.GET) return this.getReq(endpoint, variables)

        if (method === this.POST || method === this.POST_DATA)
            return this.postReq(endpoint, variables, method)

        throw new Error('Unknown method: ' + method)
    }

    async getReq(endpoint: string, variables: any): Promise<any> {
        const self = this

        return await Request.get(this.baseUrl + endpoint, {
            headers: self.createHeaders(),
            qs: variables,
        });
    }

    async postReq(
        endpoint: string,
        variables: any,
        method: 'GET' | 'POST' | 'POST_DATA'
    ): Promise<any> {
        const self = this

        if (method === this.POST_DATA)
            return await Request.post(this.baseUrl + endpoint, {
                headers: self.createHeaders(),
                formData: variables,
            });

        return await Request.post(this.baseUrl + endpoint, {
            headers: self.createHeaders(),
            form: variables,
        });
    }
}
