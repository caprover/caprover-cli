#!/usr/bin/env node

import CliHelper from '../utils/CliHelper'
import Constants from '../utils/Constants'
import StdOutUtil from '../utils/StdOutUtil'
import {
    getErrorForMachineName,
    userCancelOperation,
} from '../utils/ValidationsHandler'
import Command, {
    ICommandLineOptions,
    IOption,
    IParam,
    IParams,
    ParamType,
} from './Command'

const K = Constants.COMMON_KEYS

export default class List extends Command {
    protected command = 'logout'

    protected description =
        'Logout from a CapRover machine and clear auth info.'

    private machines = CliHelper.get().getMachinesAsOptions()

    protected options = (params?: IParams): IOption[] => [
        this.getDefaultConfigFileOption(),
        {
            name: K.name,
            char: 'n',
            env: 'CAPROVER_NAME',
            type: 'list',
            message: params
                ? 'select the CapRover machine name you want to logout from'
                : 'CapRover machine name to logout from',
            choices: this.machines,
            filter: (name: string) =>
                !this.findParamValue(params, K.name)
                    ? userCancelOperation(!name, true) || name
                    : name.trim(),
            validate: (name: string) => getErrorForMachineName(name, true),
        },
        {
            name: 'confirmedToLogout',
            type: 'confirm',
            message: () =>
                // Use function to not append ':' on question message generation
                'are you sure you want to logout from this CapRover machine?',
            default: false,
            hide: true,
            when: () => this.paramFrom(params, K.name) === ParamType.Question,
            preProcessParam: (param: IParam) => param && userCancelOperation(!param.value),
        },
    ]

    protected async preAction(
        cmdLineoptions: ICommandLineOptions,
    ): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Logout from a CapRover machine...\n')
        return Promise.resolve(cmdLineoptions)
    }

    protected async action(params: IParams): Promise<void> {
        CliHelper.get().logoutMachine(this.findParamValue(params, K.name)!.value)
    }
}
