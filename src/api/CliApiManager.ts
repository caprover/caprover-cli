import { IHashMapGeneric } from '../models/IHashMapGeneric'
import { IMachine } from '../models/storage/StoredObjects'
import Constants from '../utils/Constants'
import StorageHelper from '../utils/StorageHelper'
import ApiManager from './ApiManager'

function hashCode(str: string) {
    let hash = 0
    let chr
    if (str.length === 0) { return hash }
    for (let i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i)
        // tslint:disable-next-line: no-bitwise
        hash = (hash << 5) - hash + chr
        // tslint:disable-next-line: no-bitwise
        hash |= 0 // Convert to 32bit integer
    }
    return hash
}

export default class CliApiManager {
    public static instances: IHashMapGeneric<ApiManager> = {}

    public static get(capMachine: IMachine) {
        const hashKey = 'v' + hashCode(capMachine.baseUrl)
        if (!CliApiManager.instances[hashKey]) {
            CliApiManager.instances[hashKey] = new ApiManager(
                capMachine.baseUrl + Constants.BASE_API_PATH,
                (token) => {
                    capMachine.authToken = token
                    if (capMachine.name) {
                        StorageHelper.get().saveMachine(capMachine)
                    }
                    return Promise.resolve()
                },
            )
        }

        CliApiManager.instances[hashKey].setAuthToken(capMachine.authToken)

        return CliApiManager.instances[hashKey]
    }
}
