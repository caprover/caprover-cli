#!/usr/bin/env node

import Constants from '../utils/Constants'
import Utils from '../utils/Utils'
import StdOutUtil from '../utils/StdOutUtil'
import StorageHelper from '../utils/StorageHelper'
import CliHelper from '../utils/CliHelper'
import DeployHelper from '../utils/DeployHelper'
import CliApiManager from '../api/CliApiManager'
import {
    validateIsGitRepository,
    validateDefinitionFile,
    getErrorForDomain,
    getErrorForPassword,
    getErrorForMachineName,
    userCancelOperation,
    getErrorForAppName,
    getErrorForBranchName,
} from '../utils/ValidationsHandler'
import { IAppDef } from '../models/AppDef'
import {
    IMachine,
    IDeployedDirectory,
    IDeployParams,
} from '../models/storage/StoredObjects'
import Command, {
    IParams,
    IOption,
    ParamType,
    ICommandLineOptions,
    IParam,
} from './Command'

const K = Utils.extendCommonKeys({
    default: 'default',
    branch: 'branch',
    tar: 'tarFile',
    img: 'imageName',
})

export default class Deploy extends Command {
    protected command = 'deploy'

    protected usage =
        '[options]\n' +
        '       deploy -d\n' +
        '       deploy -c file\n' +
        '       deploy [-c file] [-n name] [-a app] [-b branch | -t tarFile | -i image]\n' +
        '       deploy [-c file] -u url [-p password] [-n name] [-a app] [-b branch | -t tarFile | -i image]\n' +
        '  Use --caproverName to use an already logged in CapRover machine\n' +
        '  Use --caproverUrl and --caproverPassword to login on the fly to a CapRover machine, if also --caproverName is present, login credetials are stored locally\n' +
        '  Use one among --branch, --tarFile, --imageName'

    protected description =
        "Deploy your app to a specific CapRover machine. You'll be prompted for missing parameters."

    private machines = CliHelper.get().getMachinesAsOptions()

    private apps: IAppDef[] = []

    private machine: IMachine

    protected options = (params?: IParams): IOption[] => [
        {
            name: K.default,
            char: 'd',
            type: 'confirm',
            message:
                'use previously entered values for the current directory, no others options are considered',
            when: false,
        },
        this.getDefaultConfigFileOption(() => this.validateDeploySource(params!)),
        {
            name: K.url,
            char: 'u',
            env: 'CAPROVER_URL',
            aliases: [{ name: 'host', char: 'h' }],
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
            aliases: [{ name: 'pass' }],
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
                ? 'select the CapRover machine name you want to deploy to'
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
                    this.apps =
                        (await CliApiManager.get(machine).getAllApps())
                            .appDefinitions || []
                } catch (e) {
                    StdOutUtil.printError(
                        `\nSomething bad happened during deployment to ${StdOutUtil.getColoredMachineUrl(
                            machine.baseUrl
                        )}.\n${e.message || e}`,
                        true
                    )
                }
            }
        ),
        {
            name: K.app,
            char: 'a',
            env: 'CAPROVER_APP',
            aliases: [{ name: 'appName' }],
            message: params
                ? 'select the app name you want to deploy to'
                : 'app name to deploy to',
            type: 'list',
            choices: () => CliHelper.get().getAppsAsOptions(this.apps),
            filter: (app: string) =>
                !this.findParamValue(params, K.app)
                    ? userCancelOperation(!app, true) || app
                    : app.trim(),
            validate: (app: string) => getErrorForAppName(this.apps, app),
        },
        {
            name: K.branch,
            char: 'b',
            env: 'CAPROVER_BRANCH',
            message:
                'git branch name to be deployed' +
                (!params
                    ? ', current directory must be git root directory'
                    : ''),
            type: 'input',
            default: params && 'master',
            when:
                !this.findParamValue(params, K.tar) &&
                !this.findParamValue(params, K.img),
            validate: (branch: string) => getErrorForBranchName(branch),
        },
        {
            name: K.tar,
            char: 't',
            env: 'CAPROVER_TAR_FILE',
            message:
                'tar file to be uploaded, must contain captain-definition file',
            type: 'input',
            when: false,
        },
        {
            name: K.img,
            char: 'i',
            env: 'CAPROVER_IMAGE_NAME',
            message:
                'image name to be deployed, it should either exist on server, or it has to be public, or on a private repository that CapRover has access to',
            type: 'input',
            when: false,
        },
        {
            name: 'confirmedToDeploy',
            type: 'confirm',
            message: () =>
                (this.findParamValue(params, K.branch)
                    ? 'note that uncommitted and gitignored files (if any) will not be pushed to server! A'
                    : 'a') + 're you sure you want to deploy?',
            default: true,
            hide: true,
            when: () =>
                this.paramFrom(params, K.name) === ParamType.Question ||
                this.paramFrom(params, K.app) === ParamType.Question ||
                this.paramFrom(params, K.branch) === ParamType.Question,
            preProcessParam: (param: IParam) =>
                param && userCancelOperation(!param.value),
        },
    ]

    protected async preAction(
        cmdLineoptions: ICommandLineOptions
    ): Promise<ICommandLineOptions | undefined> {
        StdOutUtil.printMessage('Preparing deployment to CapRover...\n')

        const possibleApp = StorageHelper.get()
            .getDeployedDirectories()
            .find((dir: IDeployedDirectory) => dir.cwd === process.cwd())
        if (cmdLineoptions[K.default]) {
            if (possibleApp && possibleApp.machineNameToDeploy) {
                if (!StorageHelper.get().findMachine(possibleApp.machineNameToDeploy)) {
                    StdOutUtil.printError(
                        `You have to first login to ${StdOutUtil.getColoredMachineName(
                            possibleApp.machineNameToDeploy
                        )} CapRover machine to use previously saved deploy options from this directory with --default.\n`,
                        true
                    )
                }
                this.options = (params?: IParams) => [CliHelper.get().getEnsureAuthenticationOption(
                    undefined,
                    undefined,
                    possibleApp.machineNameToDeploy,
                    async (machine: IMachine) => {
                        this.machine = machine
                        try {
                            this.apps =
                                (await CliApiManager.get(machine).getAllApps())
                                    .appDefinitions || []
                        } catch (e) {
                            StdOutUtil.printError(
                                `\nSomething bad happened during deployment to ${StdOutUtil.getColoredMachineName(
                                    machine.name
                                )}.\n${e.message || e}`,
                                true
                            )
                        }

                        const appErr = getErrorForAppName(this.apps, possibleApp.appName)
                        if (appErr !== true)
                            StdOutUtil.printError(
                                `\n${appErr || 'Error!'}\n`,
                                true
                            )

                        if (params) {
                            params[K.app] = {
                                value: possibleApp.appName,
                                from: ParamType.Default
                            }
                            if (possibleApp.deploySource.branchToPush)
                                params[K.branch] = {
                                    value: possibleApp.deploySource.branchToPush,
                                    from: ParamType.Default
                                }
                            else if (possibleApp.deploySource.tarFilePath)
                                params[K.tar] = {
                                    value: possibleApp.deploySource.tarFilePath,
                                    from: ParamType.Default
                                }
                            else
                                params[K.img] = {
                                    value: possibleApp.deploySource.imageName,
                                    from: ParamType.Default
                                }
                            this.validateDeploySource(params)
                        }
                    }
                )]
                return Promise.resolve({})
            } else {
                StdOutUtil.printError(`Can't find previously saved deploy options from this directory, can't use --default.\n`)
                StdOutUtil.printMessage('Falling back to asking questions...\n')
            }
        } else if (
            possibleApp &&
            possibleApp.machineNameToDeploy &&
            StorageHelper.get().findMachine(possibleApp.machineNameToDeploy)
        ) {
            StdOutUtil.printTip('**** Protip ****')
            StdOutUtil.printMessage(
                `You seem to have deployed ${StdOutUtil.getColoredMachineName(
                    possibleApp.appName
                )} from this directory in the past, use --default flag to avoid having to re-enter the information.\n`
            )
        }

        return Promise.resolve(cmdLineoptions)
    }

    protected validateDeploySource(params: IParams) {
        if (
            (this.findParamValue(params, K.branch) ? 1 : 0) +
                (this.findParamValue(params, K.tar) ? 1 : 0) +
                (this.findParamValue(params, K.img) ? 1 : 0) >
            1
        ) {
            StdOutUtil.printError(
                'Only one of branch, tarFile or imageName can be present in deploy.\n',
                true
            )
        }
        if (
            !this.findParamValue(params, K.tar) &&
            !this.findParamValue(params, K.img)
        ) {
            validateIsGitRepository()
            validateDefinitionFile()
        }
    }

    protected async action(params: IParams): Promise<void> {
        await this.deploy(
            {
                captainMachine: this.machine,
                deploySource: {
                    branchToPush: this.paramValue(params, K.branch),
                    tarFilePath: this.paramValue(params, K.tar),
                    imageName: this.paramValue(params, K.img),
                },
                appName: this.paramValue(params, K.app),
            },
            this.apps.find(
                app => app.appName === this.paramValue(params, K.app)
            )
        )
    }

    private async deploy(deployParams: IDeployParams, app?: IAppDef) {
        try {
            if (
                await new DeployHelper(
                    app && app.hasDefaultSubDomainSsl
                ).startDeploy(deployParams)
            ) {
                StorageHelper.get().saveDeployedDirectory({
                    appName: deployParams.appName || '',
                    cwd: process.cwd(),
                    deploySource: deployParams.deploySource,
                    machineNameToDeploy: deployParams.captainMachine
                        ? deployParams.captainMachine.name
                        : '',
                })
            }
        } catch (error) {
            const errorMessage = error.message ? error.message : error
            StdOutUtil.printError(
                `\nSomething bad happened: cannot deploy ${StdOutUtil.getColoredAppName(
                    deployParams.appName || ''
                )} at ${StdOutUtil.getColoredMachineName(
                    deployParams.captainMachine
                        ? deployParams.captainMachine.name ||
                              deployParams.captainMachine.baseUrl
                        : ''
                )}.\n${errorMessage}\n`,
                true
            )
        }
    }
}
