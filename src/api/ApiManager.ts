import * as fs from 'fs-extra'
import { IAppDef } from '../models/AppDef'
import IBuildLogs from '../models/IBuildLogs'
import { ICaptainDefinition } from '../models/ICaptainDefinition'
import { IRegistryInfo } from '../models/IRegistryInfo'
import { IVersionInfo } from '../models/IVersionInfo'
import Logger from '../utils/Logger'
import HttpClient from './HttpClient'

export default class ApiManager {

    public static isLoggedIn() {
        return !!ApiManager.authToken
    }
    private static lastKnownPassword: string = process.env
        .REACT_APP_DEFAULT_PASSWORD
        ? process.env.REACT_APP_DEFAULT_PASSWORD + ''
        : 'captain42'
    private static authToken: string = !!process.env.REACT_APP_IS_DEBUG
        ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Im5hbWVzcGFjZSI6ImNhcHRhaW4iLCJ0b2tlblZlcnNpb24iOiI5NmRjM2U1MC00ZDk3LTRkNmItYTIzMS04MmNiZjY0ZTA2NTYifSwiaWF0IjoxNTQ1OTg0MDQwLCJleHAiOjE1ODE5ODQwNDB9.uGJyhb2JYsdw9toyMKX28bLVuB0PhnS2POwEjKpchww'
        : ''

    private http: HttpClient

    constructor(
        baseUrl: string,
        private authTokenSaver: (authToken: string) => Promise<void>,
    ) {
        const self = this

        this.http = new HttpClient(baseUrl, ApiManager.authToken, () => {
            return self.getAuthToken(ApiManager.lastKnownPassword)
        })
    }

    public callApi(
        path: string,
        method: 'GET' | 'POST' /*| 'POST_DATA' Not used */,
        data: any,
    ) {
        const http = this.http

        return Promise.resolve().then(http.fetch(method, path, data))
    }

    public destroy() {
        this.http.destroy()
    }

    public setAuthToken(authToken: string) {
        ApiManager.authToken = authToken
        this.http.setAuthToken(authToken)
    }

    public getAuthToken(password: string) {
        const http = this.http
        ApiManager.lastKnownPassword = password
        let authTokenFetched = ''

        const self = this
        console.log(password)

        return Promise.resolve() //
            .then(http.fetch(http.POST, '/login', { password }))
            .then((data) => {
                console.log(data)

                authTokenFetched = data.token
                self.setAuthToken(authTokenFetched)
                return authTokenFetched
            })
            .then(self.authTokenSaver)
            .then(() => {
                return authTokenFetched
            })
    }

    public getCaptainInfo() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/info', {}))
    }

    public updateRootDomain(rootDomain: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/changerootdomain', {
                    rootDomain,
                }),
            )
    }

    public enableRootSsl(emailAddress: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/enablessl', {
                    emailAddress,
                }),
            )
    }

    public forceSsl(isEnabled: boolean) {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.POST, '/user/system/forcessl', { isEnabled }))
    }

    public getAllApps() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/apps/appDefinitions', {}))
    }

    public fetchBuildLogs(appName: string): Promise<IBuildLogs> {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/apps/appData/' + appName, {}))
    }

    public uploadAppData(appName: string, file: fs.ReadStream, gitHash: string) {
        const http = this.http
        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST_DATA,
                    '/user/apps/appData/' + appName + '?detached=1',
                    { sourceFile: file, gitHash },
                ),
            )
    }

    public uploadCaptainDefinitionContent(
        appName: string,
        captainDefinition: ICaptainDefinition,
        gitHash: string,
        detached: boolean,
    ) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appData/' +
                        appName +
                        (detached ? '?detached=1' : ''),
                    {
                        captainDefinitionContent: JSON.stringify(
                            captainDefinition,
                        ),
                        gitHash,
                    },
                ),
            )
    }

    public updateConfigAndSave(appName: string, appDefinition: IAppDef) {
        const instanceCount = appDefinition.instanceCount
        const envVars = appDefinition.envVars
        const notExposeAsWebApp = appDefinition.notExposeAsWebApp
        const forceSsl = appDefinition.forceSsl
        const volumes = appDefinition.volumes
        const ports = appDefinition.ports
        const nodeId = appDefinition.nodeId
        const appPushWebhook = appDefinition.appPushWebhook
        const customNginxConfig = appDefinition.customNginxConfig
        const preDeployFunction = appDefinition.preDeployFunction
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/apps/appDefinitions/update', {
                    appName,
                    instanceCount,
                    notExposeAsWebApp,
                    forceSsl,
                    volumes,
                    ports,
                    customNginxConfig,
                    appPushWebhook,
                    nodeId,
                    preDeployFunction,
                    envVars,
                }),
            )
    }

    public registerNewApp(appName: string, hasPersistentData: boolean) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/apps/appDefinitions/register', {
                    appName,
                    hasPersistentData,
                }),
            )
    }

    public deleteApp(appName: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/apps/appDefinitions/delete', {
                    appName,
                }),
            )
    }

    public enableSslForBaseDomain(appName: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appDefinitions/enablebasedomainssl',
                    {
                        appName,
                    },
                ),
            )
    }

    public attachNewCustomDomainToApp(appName: string, customDomain: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appDefinitions/customdomain',
                    {
                        appName,
                        customDomain,
                    },
                ),
            )
    }

    public enableSslForCustomDomain(appName: string, customDomain: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appDefinitions/enablecustomdomainssl',
                    {
                        appName,
                        customDomain,
                    },
                ),
            )
    }

    public removeCustomDomain(appName: string, customDomain: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appDefinitions/removecustomdomain',
                    {
                        appName,
                        customDomain,
                    },
                ),
            )
    }

    public getLoadBalancerInfo() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/loadbalancerinfo', {}))
    }

    public getNetDataInfo() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/netdata', {}))
    }

    public updateNetDataInfo(netDataInfo: any) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/netdata', { netDataInfo }),
            )
    }

    public changePass(oldPassword: string, newPassword: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/changepassword', {
                    oldPassword,
                    newPassword,
                }),
            )
    }

    public getVersionInfo(): Promise<IVersionInfo> {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/versioninfo', {}))
    }

    public performUpdate(latestVersion: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/versioninfo', {
                    latestVersion,
                }),
            )
    }

    public getNginxConfig() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/nginxconfig', {}))
    }

    public setNginxConfig(customBase: string, customCaptain: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/nginxconfig', {
                    baseConfig: { customValue: customBase },
                    captainConfig: { customValue: customCaptain },
                }),
            )
    }

    public getUnusedImages(mostRecentLimit: number) {
        const http = this.http
        return Promise.resolve() //
            .then(
                http.fetch(http.GET, '/user/apps/appDefinitions/unusedImages', {
                    mostRecentLimit: mostRecentLimit + '',
                }),
            )
    }

    public deleteImages(imageIds: string[]) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/apps/appDefinitions/deleteImages',
                    {
                        imageIds,
                    },
                ),
            )
    }

    public getDockerRegistries() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/registries', {}))
    }

    public enableSelfHostedDockerRegistry() {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/system/selfhostregistry/enableregistry',
                    {},
                ),
            )
    }

    public disableSelfHostedDockerRegistry() {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(
                    http.POST,
                    '/user/system/selfhostregistry/disableregistry',
                    {},
                ),
            )
    }

    public addDockerRegistry(dockerRegistry: IRegistryInfo) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/registries/insert', {
                    ...dockerRegistry,
                }),
            )
    }

    public updateDockerRegistry(dockerRegistry: IRegistryInfo) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/registries/update', {
                    ...dockerRegistry,
                }),
            )
    }

    public deleteDockerRegistry(registryId: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/registries/delete', {
                    registryId,
                }),
            )
    }

    public setDefaultPushDockerRegistry(registryId: string) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/registries/setpush', {
                    registryId,
                }),
            )
    }

    public getAllNodes() {
        const http = this.http

        return Promise.resolve() //
            .then(http.fetch(http.GET, '/user/system/nodes', {}))
    }

    public addDockerNode(
        nodeType: string,
        privateKey: string,
        remoteNodeIpAddress: string,
        captainIpAddress: string,
    ) {
        const http = this.http

        return Promise.resolve() //
            .then(
                http.fetch(http.POST, '/user/system/nodes', {
                    nodeType,
                    privateKey,
                    remoteNodeIpAddress,
                    captainIpAddress,
                }),
            )
    }
}
