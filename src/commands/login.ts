import StdOutUtil from '../utils/StdOutUtil'
import Constants from '../utils/Constants'
import Utils from '../utils/Utils'
import CliHelper from '../utils/CliHelper'
import { getErrorForDomain, getErrorForPassword, getErrorForMachineName } from '../utils/ValidationsHandler';
import { ILoginParams } from '../models/IConfigParams'
import Command, { IOption, IParams, ParamType, ICommandLineOptions } from "./Command"

export default class Login extends Command {
    protected command = 'login'

    protected description = 'Login to a CapRover machine. You can be logged in to multiple machines simultaneously.'

    protected options: IOption[] = [
        Command.CONFIG_FILE_OPTION_DEFAULT,
        {
            name: 'hasRootHttps', // Backward compatibility with config hasRootHttps parameter, eventually to remove when releasing v2
            hide: true,
            when: false
        },
        {
            name: 'caproverUrl',
            char: 'u',
            type: 'input',
            message: `CapRover machine URL address, it is "[http[s]://][${Constants.ADMIN_DOMAIN}.]your-captain-root.domain"`,
            default: (answers: any) => answers && Constants.SAMPLE_DOMAIN,
            filter: (url: string) => Utils.cleanAdminDomainUrl(url) || url, // If not cleaned url, leeave url to fail validation with correct error
            validate: (url: string) => getErrorForDomain(url)
        },
        {
            name: 'caproverPassword',
            char: 'p',
            type: 'password',
            message: 'CapRover machine password',
            validate: (password: string) => getErrorForPassword(password)
        },
        {
            name: 'caproverName',
            char: 'n',
            type: 'input',
            message: 'CapRover machine name, with whom the login credentials are stored locally',
            default: (answers: any) => answers && CliHelper.get().findDefaultCaptainName(),
            filter: (name: string) => name.trim(),
            validate: (name: string) => getErrorForMachineName(name)
        }
    ]

    protected async preAction(cmdLineoptions: ICommandLineOptions): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Login to a CapRover machine...\n')
        return cmdLineoptions
    }

    protected async action(params: IParams): Promise<void> {
        const loginParams: ILoginParams = {
            caproverUrl: params.caproverUrl.value,
            caproverPassword: params.caproverPassword.value,
            caproverName: params.caproverName.value
        }

        if (params.hasRootHttps && params.hasRootHttps.from === ParamType.Config) { // Backward compatibility with config hasRootHttps parameter, eventually to remove when releasing v2
            let updatedUrl = null;
            if (params.hasRootHttps.value && loginParams.caproverUrl.startsWith('http://')) updatedUrl = loginParams.caproverUrl.replace('http://', 'https://')
            if (!params.hasRootHttps.value && loginParams.caproverUrl.startsWith('https://')) updatedUrl = loginParams.caproverUrl.replace('https://', 'http://')
            if (updatedUrl) {
                const err = getErrorForDomain(updatedUrl)
                if (err !== true) StdOutUtil.printError(err, true)
                loginParams.caproverUrl = updatedUrl
            }
        }
    
        CliHelper.get().loginMachine({
            authToken: '',
            baseUrl: loginParams.caproverUrl,
            name: loginParams.caproverName,
        }, loginParams.caproverPassword)
    }
}
