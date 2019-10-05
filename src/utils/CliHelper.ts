import StorageHelper from './StorageHelper'
import StdOutUtil from './StdOutUtil'
import Constants from './Constants'
import {
    getErrorForMachineName,
    getErrorForDomain,
    getErrorForPassword,
} from './ValidationsHandler'
import { IMachine } from '../models/storage/StoredObjects'
import { IAppDef } from '../models/AppDef'
import CliApiManager from '../api/CliApiManager'
import { IOption, IParams } from '../commands/Command'

export default class CliHelper {
    static instance: CliHelper

    static get() {
        if (!CliHelper.instance) CliHelper.instance = new CliHelper()
        return CliHelper.instance
    }

    getAppsAsOptions(apps: IAppDef[]) {
        return [
            {
                name: Constants.CANCEL_STRING,
                value: '',
                short: '',
            },
            ...apps
                .map(app => ({
                    name: `${app.appName}`,
                    value: `${app.appName}`,
                    short: `${app.appName}`,
                })),
        ]
    }

    getMachinesAsOptions() {
        return [
            {
                name: Constants.CANCEL_STRING,
                value: '',
                short: '',
            },
            ...StorageHelper.get()
                .getMachines()
                .map(machine => ({
                    name: `${StdOutUtil.getColoredMachine(machine)}`,
                    value: `${machine.name}`,
                    short: `${machine.name}`,
                })),
        ]
    }

    getApiMethodsAsOptions() {
        return [
            {
                name: Constants.CANCEL_STRING,
                value: '',
                short: '',
            },
            ...Constants.API_METHODS.map(method => ({
                name: `${method}`,
                value: `${method}`,
                short: `${method}`,
            })),
        ]
    }

    getApiMethodsDescription(): string {
        return Constants.API_METHODS.reduce(
            (acc, method) => (acc ? `${acc}, ` : '') + `"${method}"`,
            ''
        )
    }

    async loginMachine(machine: IMachine, password: string) {
        try {
            const tokenToIgnore = await CliApiManager.get(machine).getAuthToken(
                password
            )
            StdOutUtil.printGreenMessage(`Logged in successfully.`)
            StdOutUtil.printMessage(
                `Authorization token is now saved as ${StdOutUtil.getColoredMachine(
                    machine
                )}.\n`
            )
        } catch (error) {
            const errorMessage = error.message ? error.message : error
            StdOutUtil.printError(
                `Something bad happened: cannot save ${StdOutUtil.getColoredMachine(
                    machine
                )}.\n${errorMessage}\n`
            )
        }
    }

    logoutMachine(machineName: string) {
        const removedMachine = StorageHelper.get().removeMachine(machineName)
        StdOutUtil.printMessage(
            `You are now logged out from ${StdOutUtil.getColoredMachine(
                removedMachine
            )}.\n`
        )
    }

    findDefaultCaptainName() {
        let currentSuffix = 1
        const machines = StorageHelper.get()
            .getMachines()
            .map(machine => machine.name)
        while (machines.includes(this.getCaptainFullName(currentSuffix)))
            currentSuffix++
        return this.getCaptainFullName(currentSuffix)
    }

    getCaptainFullName(suffix: number) {
        return `captain-${suffix < 10 ? '0' : ''}${suffix}`
    }

    async ensureAuthentication(
        url?: string,
        password?: string,
        machineName?: string
    ): Promise<IMachine> {
        if (url) {
            // Auth to url
            const machine: IMachine = { baseUrl: url, name: '', authToken: '' }
            if (machineName) {
                // With machine name: also store credentials
                let err = getErrorForDomain(url)
                if (err !== true) {
                    // Error for domain: can't store credentials
                    StdOutUtil.printWarning(
                        `\nCan't store store login credentials: ${err ||
                            'error!'}\n`
                    )
                } else {
                    err = getErrorForMachineName(machineName)
                    if (err !== true) {
                        // Error for machine name: can't store credentials
                        StdOutUtil.printWarning(
                            `\nCan't store store login credentials: ${err ||
                                'error!'}\n`
                        )
                    } else {
                        machine.name = machineName
                    }
                }
            }
            if (password) {
                // If password provided
                await CliApiManager.get(machine).getAuthToken(password) // Do auth
            }
            return machine
        } else if (machineName) {
            // Auth to stored machine name
            const machine = StorageHelper.get().findMachine(machineName) // Get stored machine
            if (!machine) throw `Can't find stored machine "${machineName}"` // No stored machine: throw
            try {
                await CliApiManager.get(machine).getAllApps() // Get data with stored token
            } catch (e) {
                // Error getting data: token expired
                StdOutUtil.printWarning(
                    `Your auth token for ${StdOutUtil.getColoredMachine(
                        machine
                    )} is not valid anymore, try to login again...`
                )
                machine.authToken = '' // Remove expired token
                if (password) {
                    // If password provided
                    await CliApiManager.get(machine).getAuthToken(password) // Do auth
                }
            }
            return machine
        }
        throw 'Too few arguments, no url or machine name'
    }

    getEnsureAuthenticationOption(
        url?: string | (() => string | undefined),
        password?: string | (() => string | undefined),
        name?: string | (() => string | undefined),
        done?: (machine: IMachine) => void
    ): IOption {
        let machine: IMachine
        return {
            name: 'ensureAuthenticationPlaceholder',
            message: 'CapRover machine password',
            type: 'password',
            hide: true,
            when: async () => {
                StdOutUtil.printMessage('Ensuring authentication...')

                const getVal = (value?: string | (() => string | undefined)): string | undefined => 
                    value && value instanceof Function ? value() : value
                const _url = getVal(url)
                const _password = getVal(password)
                const _name = getVal(name)

                try {
                    machine = await CliHelper.get().ensureAuthentication(
                        _url,
                        _password,
                        _name
                    )
                    return !machine.authToken
                } catch (e) {
                    StdOutUtil.printError(
                        `\nSomething bad happened during authentication to ${
                            _url
                                ? StdOutUtil.getColoredMachineUrl(_url)
                                : StdOutUtil.getColoredMachineName(_name || '')
                        }.\n${e.message || e}`,
                        true
                    )
                }
                return true
            },
            validate: async (password: string) => {
                const err = getErrorForPassword(password)
                if (err !== true) return err
                try {
                    await CliApiManager.get(machine).getAuthToken(password) // Do auth
                } catch (e) {
                    StdOutUtil.printError(
                        `\nSomething bad happened during authentication to ${StdOutUtil.getColoredMachineUrl(
                            machine.baseUrl
                        )}.\n${e.message || e}`,
                        true
                    )
                }
                return true
            },
            preProcessParam: async () => done && (await done(machine)),
        }
    }
}
