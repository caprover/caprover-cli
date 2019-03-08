export interface IServerSetupParams {
    machineName: string
    ipAddress: string
    newPassword: string
    rootDomain: string
    emailForHttps: string
    currentPassword?: string
}

export interface ILoginParams {
    hasRootHttps: string
    caproverPassword: string
    caproverUrl: string
    caproverName: string
}
