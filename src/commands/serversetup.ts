#!/usr/bin/env node

import Constants from '../utils/Constants'
import StdOutUtil from '../utils/StdOutUtil'
import Utils from '../utils/Utils'
import CliHelper from '../utils/CliHelper'
import StorageHelper from '../utils/StorageHelper'
import ErrorFactory from '../utils/ErrorFactory'
import SpinnerHelper from '../utils/SpinnerHelper'
import {
    getErrorForIP,
    getErrorForPassword,
    getErrorForEmail,
    getErrorForMachineName,
} from '../utils/ValidationsHandler'
import { IMachine } from '../models/storage/StoredObjects'
import CliApiManager from '../api/CliApiManager'
import Command, {
    IParams,
    IOption,
    ICommandLineOptions,
    IParam,
    ParamType,
} from './Command'

const K = Utils.extendCommonKeys({
    ip: 'caproverIP',
    root: 'caproverRootDomain',
    newPwd: 'newPassword',
    newPwdCheck: 'newPasswordCheck',
    email: 'certificateEmail',
})

export default class ServerSetup extends Command {
    protected command = 'serversetup'

    protected aliases = ['setup']

    protected description =
        'Performs necessary actions to prepare CapRover on your server.'

    private machine: IMachine = { authToken: '', baseUrl: '', name: '' }

    private ip: string

    private password: string = Constants.DEFAULT_PASSWORD

    protected options = (params?: IParams): IOption[] => [
        this.getDefaultConfigFileOption(() => this.preQuestions(params!)),
        {
            name: 'assumeYes',
            char: 'y',
            type: 'confirm',
            message: () =>
                (params ? 'have you' : 'assume you have') +
                ' already started CapRover container on your server' +
                (params ? '?' : ''), // Use function to not append ':' on question message generation
            default: params && true,
            when: !this.configFileProvided,
            preProcessParam: (param?: IParam) => {
                if (param && !param.value) {
                    StdOutUtil.printError(
                        '\nCannot setup CapRover if container is not started!\n'
                    )
                    StdOutUtil.printWarning(
                        'Start it by running the following line:'
                    )
                    StdOutUtil.printMessage(
                        'docker run -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover'
                    )
                    StdOutUtil.printMessage(
                        '\nPlease read tutorial on CapRover.com to learn how to install CapRover on a server.\n',
                        true
                    )
                }
            },
        },
        {
            name: K.ip,
            char: 'i',
            env: 'CAPROVER_IP',
            aliases: [{ name: 'ipAddress', hide: true }],
            type: 'input',
            message: 'IP address of your server',
            default: params && Constants.SAMPLE_IP,
            filter: (ip: string) => ip.trim(),
            validate: (ip: string) => getErrorForIP(ip),
            preProcessParam: async (param: IParam) => {
                this.ip = param.value
                if (!this.findParamValue(params, K.pwd)) {
                    // No password provided: try default password
                    this.machine.authToken = await this.getAuthTokenFromIp(true)
                }
            },
        },
        {
            name: K.pwd,
            char: 'p',
            env: 'CAPROVER_PASSWORD',
            aliases: [{ name: 'currentPassword', hide: true }],
            type: 'password',
            message: 'current CapRover password',
            when: () => !this.machine.authToken, // The default password didn't work
            validate: (password: string) => getErrorForPassword(password),
            preProcessParam: async (param?: IParam) => {
                if (param) {
                    // Password provided
                    this.password = param.value
                    this.machine.authToken = await this.getAuthTokenFromIp()
                }
            },
        },
        {
            name: K.root,
            char: 'r',
            env: 'CAPROVER_ROOT_DOMAIN',
            aliases: [{ name: 'rootDomain', hide: true }],
            type: 'input',
            message: 'CapRover server root domain',
            when: () => this.checkFreshInstallation(), // Server not already setupped
            filter: (domain: string) => Utils.cleanDomain(domain),
            validate: (domain: string) =>
                domain
                    ? true
                    : 'Please enter a valid root domain, for example use "test.yourdomain.com" if you setup your DNS to point "*.test.yourdomain.com" to the ip address of your server.',
            preProcessParam: async (param: IParam) =>
                await this.updateRootDomain(param.value),
        },
        {
            name: K.newPwd,
            char: 'w',
            env: 'CAPROVER_NEW_PASSWORD',
            type: 'password',
            message: `new CapRover password (min ${Constants.MIN_CHARS_FOR_PASSWORD} characters)`,
            when: () => this.password === Constants.DEFAULT_PASSWORD,
            validate: (password: string) =>
                getErrorForPassword(password, Constants.MIN_CHARS_FOR_PASSWORD),
        },
        {
            name: K.newPwdCheck,
            type: 'password',
            message: 'enter new CapRover password again',
            hide: true,
            when: () => this.paramFrom(params, K.newPwd) === ParamType.Question,
            validate: (password: string) =>
                getErrorForPassword(
                    password,
                    this.paramValue<string>(params, K.newPwd)
                ),
        },
        {
            name: K.email,
            char: 'e',
            env: 'CAPROVER_CERTIFICATE_EMAIL',
            aliases: [{ name: 'emailForHttps', hide: true }],
            type: 'input',
            message:
                '"valid" email address to get certificate and enable HTTPS',
            filter: (email: string) => email.trim(),
            validate: (email: string) => getErrorForEmail(email),
            preProcessParam: (param: IParam) =>
                this.enableSslAndChangePassword(
                    param.value,
                    this.paramValue(params, K.newPwd)
                ),
        },
        {
            name: K.name,
            char: 'n',
            env: 'CAPROVER_NAME',
            aliases: [{ name: 'machineName', hide: true }],
            type: 'input',
            message:
                'CapRover machine name, with whom the login credentials are stored locally',
            default: params && CliHelper.get().findDefaultCaptainName(),
            filter: (name: string) => name.trim(),
            validate: (name: string) => getErrorForMachineName(name),
            preProcessParam: (param?: IParam) => param && (this.machine.name = param.value),
        },
    ]

    protected async preAction(
        cmdLineoptions: ICommandLineOptions
    ): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Setup CapRover machine on your server...\n')
        return Promise.resolve(cmdLineoptions)
    }

    protected preQuestions(params: IParams) {
        if (this.findParamValue(params, K.name)) {
            const err = getErrorForMachineName(
                this.findParamValue(params, K.name)!.value
            )
            if (err !== true)
                StdOutUtil.printError(`${err || 'Error!'}\n`, true)
        }
    }

    private async getAuthTokenFromIp(firstTry?: boolean): Promise<string> {
        try {
            return await CliApiManager.get({
                authToken: '',
                baseUrl: `http://${this.ip}:${Constants.SETUP_PORT}`,
                name: '',
            }).getAuthToken(this.password)
        } catch (e) {
            if (
                firstTry &&
                e.captainStatus === ErrorFactory.STATUS_WRONG_PASSWORD
            )
                return ''
            if ((e + '').indexOf('Found. Redirecting to https://') >= 0) {
                StdOutUtil.printWarning(
                    '\nYou may have already setup the server! Use caprover login to log into an existing server.'
                )
            } else {
                StdOutUtil.printWarning(
                    '\nYou may have specified a wrong IP address or not already started CapRover container on your server!'
                )
            }
            StdOutUtil.errorHandler(e)
            return ''
        }
    }

    private async checkFreshInstallation(): Promise<boolean> {
        try {
            const rootDomain: string = (await CliApiManager.get({
                authToken: this.machine.authToken,
                baseUrl: `http://${this.ip}:${Constants.SETUP_PORT}`,
                name: '',
            }).getCaptainInfo()).rootDomain
            if (rootDomain)
                StdOutUtil.printWarning(
                    `\nYou may have already setup the server with root domain: ${rootDomain}! Use caprover login to log into an existing server.`,
                    true
                )
        } catch (e) {
            StdOutUtil.errorHandler(e)
        }
        return true
    }

    private async updateRootDomain(rootDomain: string) {
        try {
            await CliApiManager.get({
                authToken: this.machine.authToken,
                baseUrl: `http://${this.ip}:${Constants.SETUP_PORT}`,
                name: '',
            }).updateRootDomain(rootDomain)
            this.machine.baseUrl = `http://${Constants.ADMIN_DOMAIN}.${rootDomain}`
        } catch (e) {
            if (e.captainStatus === ErrorFactory.VERIFICATION_FAILED) {
                StdOutUtil.printError(
                    `\nCannot verify that ${StdOutUtil.getColoredMachineUrl(
                        rootDomain
                    )} points to your server IP.`
                )
                StdOutUtil.printError(
                    `Are you sure that you setup your DNS to point "*.${rootDomain}" to ${this.ip}?`
                )
                StdOutUtil.printError(
                    `Double check your DNS, if everything looks correct note that DNS changes take up to 24 hours to work properly. Check with your Domain Provider.`
                )
            }
            StdOutUtil.errorHandler(e)
        }
    }

    private async enableSslAndChangePassword(
        email: string,
        newPassword?: string
    ) {
        let forcedSsl = false
        try {
            SpinnerHelper.start('Enabling SSL... Takes a few seconds...')

            await CliApiManager.get(this.machine).enableRootSsl(email)
            this.machine.baseUrl = Utils.cleanAdminDomainUrl(
                this.machine.baseUrl,
                true
            )!
            await CliApiManager.get(this.machine).forceSsl(true)
            forcedSsl = true

            if (newPassword !== undefined) {
                await CliApiManager.get(this.machine).changePass(
                    this.password,
                    newPassword
                )
                this.password = newPassword
                await CliApiManager.get(this.machine).getAuthToken(
                    this.password
                )
            }

            SpinnerHelper.stop()
        } catch (e) {
            if (forcedSsl) {
                StdOutUtil.printError(
                    '\nServer is setup, but password was not changed due to an error. You cannot use serversetup again.'
                )
                StdOutUtil.printError(
                    `Instead, go to ${StdOutUtil.getColoredMachineUrl(
                        this.machine.baseUrl
                    )} and change your password on settings page.`
                )
                StdOutUtil.printError(
                    `Then use <caprover login> command to connect to your server.`
                )
            }
            SpinnerHelper.fail()
            StdOutUtil.errorHandler(e)
        }
    }

    protected async action(params: IParams): Promise<void> {
        StorageHelper.get().saveMachine(this.machine)
        StdOutUtil.printGreenMessage(
            `CapRover server setup completed: it is available as ${StdOutUtil.getColoredMachine(
                this.machine
            )}\n`
        )
        StdOutUtil.printMessage('For more details and docs see CapRover.com\n')
    }
}
