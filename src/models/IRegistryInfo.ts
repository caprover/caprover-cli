export interface IRegistryApi {
    registries: IRegistryInfo[]
    defaultPushRegistryId: string | undefined
}

export class IRegistryTypes {
    public static readonly LOCAL_REG = 'LOCAL_REG'
    public static readonly REMOTE_REG = 'REMOTE_REG'
}

type IRegistryType = 'LOCAL_REG' | 'REMOTE_REG'

export interface IRegistryInfo {
    id: string
    registryUser: string
    registryPassword: string
    registryDomain: string
    registryImagePrefix: string
    registryType: IRegistryType
}
