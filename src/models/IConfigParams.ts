export interface IServerSetupParams {
    machineName: string
    ipAddress: string
    newPassword: string
    rootDomain: string
    emailForHttps: string
    currentPassword?: string
}

export interface ILoginParams {
    caproverPassword: string
    caproverUrl: string
    caproverName: string
}
