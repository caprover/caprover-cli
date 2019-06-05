import StdOutUtil from '../utils/StdOutUtil'
import CliHelper from '../utils/CliHelper'
import { getErrorForMachineName, userCancelOperation } from '../utils/ValidationsHandler';
import Command, { IParams, IOption, ICommandLineOptions, ParamType } from './Command'

export default class List extends Command {
    protected command = 'logout'

    protected description = 'Logout from a CapRover machine and clear auth info.'

    private machines = CliHelper.get().getMachinesAsOptions()

    protected options= (params?: IParams): IOption[] => [
        Command.CONFIG_FILE_OPTION_DEFAULT,
        {
            name: 'caproverName',
            char: 'n',
            type: 'list',
            message: (answers: any) => answers ? 'select the CapRover machine name you want to logout from:' : 'CapRover machine name to logout from',
            choices: this.machines,
            filter: (name: string) => params && !params.caproverName ? userCancelOperation(!name, true) || name : name.trim(),
            validate: (name: string) => getErrorForMachineName(name, true)
        },
        {
            name: 'confirmedToLogout',
            type: 'confirm',
            message: () => 'are you sure you want to logout from this CapRover machine?', // Use function to not append ':' on question message generation
            default: false,
            hide: true,
            when: (answers: any) => answers.caproverName
        }
    ]

    protected async preAction(cmdLineoptions: ICommandLineOptions): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Logout from a CapRover machine...\n')
        return cmdLineoptions
    }

    protected async action(params: IParams): Promise<void> {
        userCancelOperation(params.confirmedToLogout && params.confirmedToLogout.from === ParamType.Question && !params.confirmedToLogout.value)
        CliHelper.get().logoutMachine(params.caproverName.value)
    }
}
