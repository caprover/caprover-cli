#!/usr/bin/env node

import { isAbsolute, join } from 'path'
import { writeFileSync } from 'fs'
import Constants from '../utils/Constants'
import Utils from '../utils/Utils'
import StdOutUtil from '../utils/StdOutUtil'
import CliHelper from '../utils/CliHelper'
import CliApiManager from '../api/CliApiManager'
import {
    getErrorForDomain,
    getErrorForPassword,
    getErrorForMachineName,
    userCancelOperation,
} from '../utils/ValidationsHandler'
import { IMachine } from '../models/storage/StoredObjects'
import Command, {
    IParams,
    IOption,
    ParamType,
    ICommandLineOptions,
    IParam,
} from './Command'

const K = Utils.extendCommonKeys({
    path: 'path',
    method: 'method',
    data: 'data',
    out: 'output',
})

export default class Api extends Command {
    protected command = 'api'

    protected usage =
        '[options]\n' +
        '       api -c file\n' +
        '       api [-c file] [-n name] [-t path] [-m method] [-d dataJsonString]\n' +
        '       api [-c file] -u url [-p password] [-n name] [-t path] [-m method] [-d dataJsonString]\n' +
        '  Use --caproverName to use an already logged in CapRover machine\n' +
        '  Use --caproverUrl and --caproverPassword to login on the fly to a CapRover machine, if also --caproverName is present, login credetials are stored locally'

    protected description =
        'Call a generic API on a specific CapRover machine. Use carefully only if you really know what you are doing!'

    private machines = CliHelper.get().getMachinesAsOptions()

    private machine: IMachine

    protected options = (params?: IParams): IOption[] => [
        this.getDefaultConfigFileOption(),
        {
            name: K.url,
            char: 'u',
            env: 'CAPROVER_URL',
            type: 'input',
            message: `CapRover machine URL address, it is "[http[s]://][${Constants.ADMIN_DOMAIN}.]your-captain-root.domain"`,
            when: false,
            filter: (url: string) => Utils.cleanAdminDomainUrl(url) || url, // If not cleaned url, leave url to fail validation with correct error
            validate: (url: string) => getErrorForDomain(url, true),
        },
        {
            name: K.pwd,
            char: 'p',
            env: 'CAPROVER_PASSWORD',
            type: 'password',
            message: 'CapRover machine password',
            when: !!this.findParamValue(params, K.url),
            validate: (password: string) => getErrorForPassword(password),
        },
        {
            name: K.name,
            char: 'n',
            env: 'CAPROVER_NAME',
            message: params
                ? 'select the CapRover machine name you want to call API to'
                : 'CapRover machine name, to load/store credentials',
            type: 'list',
            choices: this.machines,
            when: !this.findParamValue(params, K.url),
            filter: (name: string) =>
                !this.findParamValue(params, K.name)
                    ? userCancelOperation(!name, true) || name
                    : name.trim(),
            validate: !this.findParamValue(params, K.url)
                ? (name: string) => getErrorForMachineName(name, true)
                : undefined,
        },
        CliHelper.get().getEnsureAuthenticationOption(
            () => this.paramValue(params, K.url),
            () => this.paramValue(params, K.pwd),
            () => this.paramValue(params, K.name),
            async (machine: IMachine) => {
                this.machine = machine
                try {
                    await CliApiManager.get(machine).getCaptainInfo()
                } catch (e) {
                    StdOutUtil.printError(
                        `\nSomething bad happened during calling API to ${StdOutUtil.getColoredMachineUrl(
                            machine.baseUrl
                        )}.\n${e.message || e}`,
                        true
                    )
                }
            }
        ),
        {
            name: K.path,
            char: 't',
            env: 'CAPROVER_API_PATH',
            message:
                'API path to call, starting with / (eg. "/user/system/info")',
            type: 'input',
            default: params && '/user/system/info',
            filter: (path: string) => path.trim(),
            validate: (path: string) =>
                path && path.startsWith('/')
                    ? true
                    : 'Please enter a valid path.',
        },
        {
            name: K.method,
            char: 'm',
            env: 'CAPROVER_API_METHOD',
            message: params
                ? 'select the API method you want to call'
                : `API method to call, one of: ${CliHelper.get().getApiMethodsDescription()}`,
            type: 'list',
            default: params && 'GET',
            choices: CliHelper.get().getApiMethodsAsOptions(),
            filter: (method: string) =>
                !this.findParamValue(params, K.method)
                    ? userCancelOperation(!method, true) || method
                    : method.trim(),
            validate: (method: string) =>
                method && Constants.API_METHODS.includes(method)
                    ? true
                    : `Please enter a valid method, one of: ${CliHelper.get().getApiMethodsDescription()}`,
        },
        {
            name: K.data,
            char: 'd',
            env: 'CAPROVER_API_DATA',
            message:
                'API data JSON string' +
                (params
                    ? ''
                    : ' (or also JSON object from config file), for "GET" method they are interpreted as querystring values to be appended to the path'),
            type: 'input',
            filter: data => {
                if (data && typeof data === 'string')
                    try {
                        return JSON.parse(data)
                    } catch {}
                return data
            },
            validate: data => {
                if (data && typeof data === 'string') {
                    try {
                        JSON.parse(data)
                    } catch (e) {
                        return <string>e
                    }
                }
                return true
            },
        },
        {
            name: K.out,
            char: 'o',
            env: 'CAPROVER_API_OUTPUT',
            message:
                'where to log API response output: if "true" log to console, if "false" suppress output, otherwise log to specified file (overwrite already existing)',
            type: 'input',
            default: 'true',
            filter: (out: string) => {
                if (!out) return 'false'
                out = out.trim() || 'false'
                if (out === 'true' || out === 'false' || isAbsolute(out))
                    return out
                return join(process.cwd(), out)
            },
        },
        {
            name: 'confirmedToCall',
            type: 'confirm',
            message: 'are you sure you want to procede?',
            default: true,
            hide: true,
            when: () =>
                this.paramFrom(params, K.name) === ParamType.Question ||
                this.paramFrom(params, K.path) === ParamType.Question ||
                this.paramFrom(params, K.data) === ParamType.Question,
            preProcessParam: (param: IParam) => param && userCancelOperation(!param.value),
        },
    ]

    protected async preAction(
        cmdLineoptions: ICommandLineOptions
    ): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Call generic CapRover API [Experimental Feature]...\n')
        return Promise.resolve(cmdLineoptions)
    }

    protected async action(params: IParams): Promise<void> {
        try {
            const resp = await CliApiManager.get(this.machine).callApi(
                this.findParamValue(params, K.path)!.value,
                this.findParamValue(params, K.method)!.value,
                this.paramValue(params, K.data)
            )
            StdOutUtil.printGreenMessage(`API call completed successfully!\n`)

            const out = this.paramValue<string>(params, K.out)!
            const data = JSON.stringify(resp, null, 2)
            if (out === 'true') {
                StdOutUtil.printMessage(data + '\n')
            } else if (out !== 'false') {
                try {
                    writeFileSync(out, data)
                } catch (e) {
                    StdOutUtil.printWarning(
                        `Error writing API response to file: "${out}".\n`
                    )
                }
            }
        } catch (error) {
            StdOutUtil.printError(
                `\nSomething bad happened calling API ${StdOutUtil.getColoredMachineUrl(
                    this.paramValue<string>(params, K.path)!
                )} at ${
                    this.machine.name
                        ? StdOutUtil.getColoredMachineName(this.machine.name)
                        : StdOutUtil.getColoredMachineUrl(this.machine.baseUrl)
                }.`
            )
            StdOutUtil.errorHandler(error)
        }
    }
}
