import Constants from '../utils/Constants';
import Utils from '../utils/Utils';
import StdOutUtil from '../utils/StdOutUtil'
import StorageHelper from '../utils/StorageHelper'
import CliHelper from '../utils/CliHelper'
import DeployHelper from '../utils/DeployHelper'
import CliApiManager from '../api/CliApiManager'
import { validateIsGitRepository, validateDefinitionFile, getErrorForDomain, getErrorForPassword, getErrorForMachineName, userCancelOperation, getErrorForAppName, getErrorForBranchName } from '../utils/ValidationsHandler'
import { IAppDef } from '../models/AppDef';
import { IMachine, IDeployedDirectory, IDeployParams } from '../models/storage/StoredObjects'
import Command, { IParams, IOption, ParamType, ICommandLineOptions, IParam } from './Command'

const K = Utils.extendCommonKeys({
    default: 'default',
    branch: 'branch',
    tar: 'tarFile',
    img: 'imageName'
})

export default class Deploy extends Command {
    protected command = 'deploy'

    protected usage = '[options]\n' +
        '       deploy -d\n' +
        '       deploy -c file\n' +
        '       deploy [-c file] [-n name] [-a app] [-b branch | -t tarFile | -i image]\n' +
        '       deploy [-c file] -u url [-p password] [-n name] [-a app] [-b branch | -t tarFile | -i image]\n' +
        '  Use --caproverName to use an already logged in CapRover machine\n' +
        '  Use --caproverUrl and --caproverPassword to login on the fly to a CapRover machine, if also --caproverName is present, login credetials are stored locally\n' +
        '  Use one among --branch, --tarFile, --imageName'

    protected description = 'Deploy your app to a specific CapRover machine. You\'ll be prompted for missing parameters.'

    private machines = CliHelper.get().getMachinesAsOptions()

    private apps: IAppDef[] = []

    private machine: IMachine

    protected options = (params?: IParams): IOption[] => [
        {
            name: K.default,
            char: 'd',
            type: 'confirm',
            message: 'use previously entered values for the current directory, no others options are considered',
            when: false
        },
        this.getDefaultConfigFileOption(() => this.preQuestions(params!)),
        {
            name: K.url,
            char: 'u',
            type: 'input',
            message: `CapRover machine URL address, it is "[http[s]://][${Constants.ADMIN_DOMAIN}.]your-captain-root.domain"`,
            when: false,
            filter: (url: string) => Utils.cleanAdminDomainUrl(url) || url, // If not cleaned url, leeave url to fail validation with correct error
            validate: (url: string) => getErrorForDomain(url, true)
        },
        {
            name: K.pwd,
            char: 'p',
            type: 'password',
            message: 'CapRover machine password',
            when: !!this.param(params, K.url),
            validate: (password: string) => getErrorForPassword(password)
        },
        {
            name: K.name,
            char: 'n',
            message: params ? 'select the CapRover machine name you want to deploy to' : 'CaptRover machine name, to load/store credentials',
            type: 'list',
            choices: this.machines,
            when: !this.param(params, K.url),
            filter: (name: string) => !this.param(params, K.name) ? userCancelOperation(!name, true) || name : name.trim(),
            validate: !this.param(params, K.url) ? (name: string) => getErrorForMachineName(name, true) : undefined
        },
        CliHelper.get().getEnsureAuthenticationOption(params, async (machine: IMachine) => {
            this.machine = machine
            try {
                this.apps = (await CliApiManager.get(machine).getAllApps()).appDefinitions || []
            } catch (e) {
                StdOutUtil.printError(`\nSomething bad happened during deployment to ${StdOutUtil.getColoredMachineUrl(machine.baseUrl)}.\n${e.message || e}`, true)
            }
        }),
        {
            name: K.app,
            char: 'a',
            message: params ? 'select the app name you want to deploy to' : 'app name to deploy to',
            type: 'list',
            choices: () => CliHelper.get().getAppsAsOptions(this.apps),
            filter: (app: string) => !this.param(params, K.app) ? userCancelOperation(!app, true) || app : app.trim(),
            validate: (app: string) => getErrorForAppName(this.apps, app)
        },
        {
            name: K.branch,
            char: 'b',
            message: 'git branch name to be deployed' + (!params ? ', current directory must be git root directory' : ''),
            type: 'input',
            default: params && 'master',
            when: !this.param(params, K.tar) && !this.param(params, K.img),
            validate: (branch: string) => getErrorForBranchName(branch)
        },
        {
            name: K.tar,
            char: 't',
            message: 'tar file to be uploaded, must contain captain-definition file',
            type: 'input',
            when: false
        },
        {
            name: K.img,
            char: 'i',
            message: 'image name to be deployed, it should either exist on server, or it has to be public, or on a private repository that CapRover has access to',
            type: 'input',
            when: false
        },
        {
            name: 'confirmedToDeploy',
            type: 'confirm',
            message: () => (this.param(params, K.branch) ? 'note that uncommitted and gitignored files (if any) will not be pushed to server! A' : 'a') + 're you sure you want to deploy?',
            default: true,
            hide: true,
            when: () => this.paramFrom(params, K.name) === ParamType.Question || this.paramFrom(params, K.app) === ParamType.Question || this.paramFrom(params, K.branch) === ParamType.Question,
            tap: (param: IParam) => param && userCancelOperation(!param.value)
        }
    ]

    protected async preAction(cmdLineoptions: ICommandLineOptions): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Preparing deployment to CapRover...\n')

        const possibleApp = StorageHelper.get().getDeployedDirectories().find((dir: IDeployedDirectory) => dir.cwd === process.cwd())
        if (cmdLineoptions[K.default]) {
            if (possibleApp && possibleApp.machineNameToDeploy) {
                const deployParams: IDeployParams = {
                    captainMachine: StorageHelper.get().findMachine(possibleApp.machineNameToDeploy),
                    deploySource: possibleApp.deploySource,
                    appName: possibleApp.appName
                }
                if (!deployParams.captainMachine) {
                    StdOutUtil.printError(`You have to first login to ${StdOutUtil.getColoredMachineName(possibleApp.machineNameToDeploy)} CapRover machine to use previously saved deploy options from this directory with --default.\n`, true)
                }
                await this.deploy(deployParams)
                process.exit(0)
            } else {
                StdOutUtil.printError(`Can't find previously saved deploy options from this directory, can't use --default.\n`, true)
            }
        } else if (possibleApp && possibleApp.machineNameToDeploy && StorageHelper.get().findMachine(possibleApp.machineNameToDeploy)) {
            StdOutUtil.printTip('**** Protip ****')
            StdOutUtil.printMessage(`You seem to have deployed ${StdOutUtil.getColoredMachineName(possibleApp.appName)} from this directory in the past, use --default flag to avoid having to re-enter the information.\n`)
        }

        return cmdLineoptions
    }

    protected preQuestions(params: IParams) {
        if ((this.param(params, K.branch) ? 1 : 0) + (this.param(params, K.tar) ? 1 : 0) + (this.param(params, K.img) ? 1 : 0) > 1) {
            StdOutUtil.printError('Only one of branch, tarFile or imageName can be present in deploy.\n', true)
        }
        if (!this.param(params, K.tar) && !this.param(params, K.img)) {
            validateIsGitRepository()
            validateDefinitionFile()
        }
    }

    protected async action(params: IParams): Promise<void> {
        await this.deploy({
            captainMachine: this.machine,
            deploySource: {
                branchToPush: this.paramValue(params, K.branch),
                tarFilePath: this.paramValue(params, K.tar),
                imageName: this.paramValue(params, K.img)
            },
            appName: this.paramValue(params, K.app)
        }, this.apps.find(app => app.appName === this.paramValue(params, K.app)))
    }

    private async deploy(deployParams: IDeployParams, app?: IAppDef) {
        try {
            if (await new DeployHelper(app && app.hasDefaultSubDomainSsl).startDeploy(deployParams)) {
                StorageHelper.get().saveDeployedDirectory({
                    appName: deployParams.appName || '',
                    cwd: process.cwd(),
                    deploySource: deployParams.deploySource,
                    machineNameToDeploy: deployParams.captainMachine ? deployParams.captainMachine.name : '',
                })
            }
        } catch (error) {
            const errorMessage = error.message ? error.message : error
            StdOutUtil.printError(`\nSomething bad happened: cannot deploy ${StdOutUtil.getColoredAppName(deployParams.appName || '')} at ${StdOutUtil.getColoredMachineName(deployParams.captainMachine ? deployParams.captainMachine.name || deployParams.captainMachine.baseUrl : '')}.\n${errorMessage}\n`, true)
        }
    }
}
