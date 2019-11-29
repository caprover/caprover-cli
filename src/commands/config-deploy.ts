#!/usr/bin/env node

import * as path from 'path'
import Utils from '../utils/Utils'
import StdOutUtil from '../utils/StdOutUtil'
import DeployHelper from '../utils/DeployHelper'
import {
    getErrorForTarPath,
} from '../utils/ValidationsHandler'
import { IAppDef } from '../models/AppDef'
import {
    IDeployParams,
} from '../models/storage/StoredObjects'
import Command, {
    IParams,
    IOption,
    ICommandLineOptions,
} from './Command'
import { CapRoverConfig, checkForConfigFile, buildEnvironmentConfig, validateConfigFile, DeployTarget, createTarArchivePath } from '../utils/TarDeploy'

const K = Utils.extendCommonKeys({
    directory: 'directory',
    env: 'env'
})

export default class ConfigDeploy extends Command {
    protected command = 'config-deploy'

    protected usage =
        '[-d directory] [-env environment]\n' +
        '       config-deploy -d ./.. -env production\n';

    protected description = "Deployment via CapRover config file. See: for more information.\n" +
        'To use this command, you have to be logged in to one machine via "caprover login".'

    private deployTarget: DeployTarget;
    private capRoverConfig: CapRoverConfig;

    protected options = (params?: IParams): IOption[] => [
        {
            name: K.directory,
            char: 'd',
            env: 'CAPROVER_CONFIG_DIR',
            aliases: [{ name: 'directory', char: 'd' }],
            message: 'CapRover config file directory',
            type: 'input',
            when: () => {
                const configResult = checkForConfigFile(K.directory);
                if (typeof configResult === 'string') {

                    const configResultProcess = checkForConfigFile(process.cwd());
                    if (typeof configResultProcess === 'string') {
                        StdOutUtil.printMessage(configResultProcess);
                    } else {
                        this.capRoverConfig = configResultProcess;
                        return false;
                    }

                    StdOutUtil.printMessage(configResult);
                    return true;
                }

                this.capRoverConfig = configResult;
                return false;
            },
            validate: (directory: string) => {

                const pathCheckError = getErrorForTarPath(path.join(process.cwd(), directory))
                if (!pathCheckError) return pathCheckError;

                const configResult = checkForConfigFile(directory);
                if (typeof configResult === 'string') {
                    return configResult;
                }

                this.capRoverConfig = configResult;
                return true;
            }
        },
        {
            name: K.env,
            char: 'e',
            env: 'CAPROVER_ENVIRONMENT',
            aliases: [{ name: 'env', char: 'e' }],
            message: 'choose environment',
            type: 'list',
            choices: () => {
                const environments = this.capRoverConfig.environments ? Object.keys(this.capRoverConfig.environments) : [];
                return [
                    {
                        name: 'DEFAULT',
                        value: this.capRoverConfig,
                        short: 'DEFAULT',
                    },
                    ...environments
                        .map(env => ({
                            name: `${env}`,
                            value: (this.capRoverConfig.environments as any)[env],
                            short: `${env}`,
                        })),
                ]
            }
        }
    ]

    protected async preAction(
        cmdLineoptions: ICommandLineOptions
    ): Promise<ICommandLineOptions | undefined> {
        StdOutUtil.printMessage('Preparing deployment to CapRover...\n');
        return Promise.resolve(cmdLineoptions);
    }

    protected async action(params: IParams): Promise<void> {     
        const capRoverEnvironmentConfig = buildEnvironmentConfig(this.paramValue(params, K.env) || this.capRoverConfig, this.capRoverConfig);
        const result = await validateConfigFile(capRoverEnvironmentConfig)
        if (!!result) {
            this.deployTarget = result;
        } else {
            StdOutUtil.printError(
                `\nCould not get data of environment!\n${result}\n`,
                true
            );
            return;
        }

        let dirPath: string = this.paramValue(params, K.directory) || process.cwd();

        if (!path.isAbsolute(dirPath)) {
            dirPath = path.join(process.cwd(), dirPath);
        }
        try {
            const tarFilePath = await createTarArchivePath(dirPath);

            await this.deploy(
                {
                    captainMachine: this.deployTarget.machine,
                    deploySource: { tarFilePath },
                    appName: this.deployTarget.app.appName,
                },
                this.deployTarget.app
            )

        } catch (error) {
            StdOutUtil.printError(
                `\nCould not deploy!\n${error}\n`,
                true
            );
        }
    }

    private async deploy(deployParams: IDeployParams, app?: IAppDef) {
        try {
            await new DeployHelper(app && app.hasDefaultSubDomainSsl).startDeploy(deployParams, true);
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
            );
        }
    }
}
