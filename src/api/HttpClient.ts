import * as Request from 'request-promise'
import ErrorFactory from '../utils/ErrorFactory'
import Logger from '../utils/Logger'

const TOKEN_HEADER = 'x-captain-auth'
const NAMESPACE = 'x-namespace'
const CAPTAIN = 'captain'

export default class HttpClient {
    public readonly GET = 'GET'
    public readonly POST = 'POST'
    public readonly POST_DATA = 'POST_DATA'
    public isDestroyed = false

    constructor(
        private baseUrl: string,
        private authToken: string,
        private onAuthFailure: () => Promise<any>,
    ) {
        //
    }

    public createHeaders() {
        const headers: any = {}
        if (this.authToken) { headers[TOKEN_HEADER] = this.authToken }
        headers[NAMESPACE] = CAPTAIN

        // check user/appData or apiManager.uploadAppData before changing this signature.
        return headers
    }

    public setAuthToken(authToken: string) {
        this.authToken = authToken
    }

    public destroy() {
        this.isDestroyed = true
    }

    public fetch(
        method: 'GET' | 'POST' | 'POST_DATA',
        endpoint: string,
        variables: any,
    ) {
        const self = this
        return (): Promise<any> => {
            return Promise.resolve() //
                .then(() => {
                    if (!process.env.REACT_APP_IS_DEBUG) {
                        return Promise.resolve()
                    }
                    return new Promise<void>((res) => {
                        setTimeout(res, 500)
                    })
                })
                .then(() => {
                    return self.fetchInternal(method, endpoint, variables) //
                })
                .then((requestResponse) => {
                    const data = JSON.parse(requestResponse)
                    if (
                        data.status === ErrorFactory.STATUS_AUTH_TOKEN_INVALID
                    ) {
                        return self
                            .onAuthFailure() //
                            .then(() => {
                                return self
                                    .fetchInternal(method, endpoint, variables)
                                    .then((newRequestResponse) => {
                                        return newRequestResponse
                                    })
                            })
                    } else {
                        return data
                    }
                })
                .then((data) => {
                    if (
                        data.status !== ErrorFactory.OKAY &&
                        data.status !== ErrorFactory.OKAY_BUILD_STARTED
                    ) {
                        throw ErrorFactory.createError(
                            data.status || ErrorFactory.UNKNOWN_ERROR,
                            data.description || '',
                        )
                    }
                    return data
                })
                .then((data) => {
                    // These two blocks are clearly memory leaks! But I don't have time to fix them now... I need to CANCEL the promise, but since I don't
                    // have CANCEL method on the native Promise, I return a promise that will never RETURN if the HttpClient is destroyed.
                    // Will fix them later... but it shouldn't be a big deal anyways as it's only a problem when user navigates away from a page before the
                    // network request returns back.
                    return new Promise((resolve, reject) => {
                        // data.data here is the "data" field inside the API response! {status: 100, description: "Login succeeded", data: {…}}
                        if (!self.isDestroyed) { return resolve(data.data) }
                        Logger.dev('Destroyed then not called')
                    })
                })
                .catch((error) => {
                    // Logger.log('');
                    // Logger.error(error.message || error);
                    return new Promise((resolve, reject) => {
                        if (!self.isDestroyed) { return reject(error) }
                        Logger.dev('Destroyed catch not called')
                    })
                })
        }
    }

    public fetchInternal(
        method: 'GET' | 'POST' | 'POST_DATA',
        endpoint: string,
        variables: any,
    ) {
        if (method === this.GET) { return this.getReq(endpoint, variables) }

        if (method === this.POST || method === this.POST_DATA) {
            return this.postReq(endpoint, variables, method)
        }

        throw new Error('Unknown method: ' + method)
    }

    public getReq(endpoint: string, variables: any) {
        const self = this

        return Request.get(this.baseUrl + endpoint, {
            headers: self.createHeaders(),
            qs: variables,
        }).then(function(data) {
            return data
        })
    }

    public postReq(
        endpoint: string,
        variables: any,
        method: 'GET' | 'POST' | 'POST_DATA',
    ) {
        const self = this

        if (method === this.POST_DATA) {
            return Request.post(this.baseUrl + endpoint, {
                headers: self.createHeaders(),
                formData: variables,
            }).then(function(data) {
                return data
            })
        }

        return Request.post(this.baseUrl + endpoint, {
            headers: self.createHeaders(),
            form: variables,
        }).then(function(data) {
            return data
        })
    }
}
