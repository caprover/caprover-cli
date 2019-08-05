import { join } from 'path'
import { pathExistsSync } from 'fs-extra'
import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { CommanderStatic } from 'commander'
import * as inquirer from 'inquirer'
import Constants from '../utils/Constants'
import StdOutUtil from '../utils/StdOutUtil'

export interface IOptionAlias {
    name: string,
    char?: string
    env?: string,
    hide?: boolean
}

export interface IOption extends inquirer.Question, IOptionAlias {
    name: string,
    aliases?: IOptionAlias[]
    tap?: (param?: IParam) => void
}

export interface ICommandLineOptions {
    [option: string]: string | boolean
}

export enum ParamType {
    Config,
    CommandLine,
    Question,
    Env
}

export interface IParam {
    value: any,
    from: ParamType
}

export interface IParams {
    [param: string]: IParam
}

function isFunction(value: any): boolean {
    return value instanceof Function
}

function getValue<T>(value?: T | ((...args: any) => T), ...args: any): T | undefined {
    return value instanceof Function ? value(...args) : value
}

export default abstract class Command {
    protected abstract command: string

    protected aliases?: string[] = undefined

    protected usage?: string = undefined

    protected description?: string = undefined

    protected options?: IOption[] | ((params?: IParams) => IOption[])

    protected configFileOptionName: string = Constants.COMMON_KEYS.conf

    protected configFileProvided = false

    protected optionAliasMessage: string = 'same as'

    constructor(private program: CommanderStatic) {
        if (!program) throw 'program is null';
    }

    private getCmdLineFlags(alias: IOptionAlias, type?: string): string {
        return (alias.char ? `-${alias.char}, ` : '') + `--${alias.name}` + (type !== 'confirm' ? ' <value>' : '')
    }

    private getCmdLineDescription(option: IOption, spaces: string, alias?: IOptionAlias): string {
        const msg = alias ? `${this.optionAliasMessage} --${option.name}` : getValue(option.message) || ''
        const env = alias ? alias.env : option.env
        return (msg + (env ? ` (env: ${env})` : '')).split('\n').reduce((acc, l) => !acc ? l.trim() : `${acc}\n${spaces}${l.trim()}`, '')
    }

    private getOptions(params?: IParams): IOption[] {
        return getValue(this.options, params) || []
    }

    protected param(params: IParams | undefined, name: string): IParam | undefined {
        return params && params[name]
    }

    protected paramValue<T>(params: IParams | undefined, name: string): T | undefined {
        return params && params[name] && params[name].value
    }

    protected paramFrom(params: IParams | undefined, name: string): ParamType | undefined {
        return params && params[name] && params[name].from
    }

    protected getDefaultConfigFileOption(tap?: (param?: IParam) => void): IOption {
        return {
            name: this.configFileOptionName,
            char: 'c',
            env: 'CAPROVER_CONFIG_FILE',
            message: 'path of the file where all parameters are defined in JSON or YAML format\n' +
                     'see others options to know config file parameters\' names\n' +
                     'this is mainly for automation purposes, see docs',
            tap
        }
    }

    public build() {
        if (!this.command) throw 'Empty command name';

        const cmd = this.program.command(this.command)
        if (this.aliases && this.aliases.length) this.aliases.forEach(alias => alias && cmd.alias(alias))
        if (this.description) cmd.description(this.description)
        if (this.usage) cmd.usage(this.usage)

        let options = this.getOptions().filter(opt => opt && opt.name)
        const optionAliases: (IOptionAlias & {aliasTo: string})[] = options.reduce((acc, opt) => [...acc, {...opt, aliasTo: opt.name}, ...(opt.aliases || []).filter(alias => alias && alias.name).map(alias => ({...alias, aliasTo: opt.name}))], [])

        options = options.filter(opt => !opt.hide)
        const spaces = ' '.repeat(options.reduce((max, opt) => Math.max(max, this.getCmdLineFlags(opt, opt.type).length, (opt.aliases || []).filter(alias => alias && alias.name && !alias.hide).reduce((amax, a) => Math.max(amax, this.getCmdLineFlags(a, opt.type).length), 0)), 0) + 4)
        options.forEach(opt => {
            cmd.option(this.getCmdLineFlags(opt, opt.type), this.getCmdLineDescription(opt, spaces), getValue(opt.default))
            if (opt.aliases) opt.aliases.filter(alias => alias && alias.name && !alias.hide).forEach(alias => cmd.option(this.getCmdLineFlags(alias, opt.type), this.getCmdLineDescription(opt, spaces, alias)))
        })

        cmd.action(async (cmdLineOptions: ICommandLineOptions) => {
            cmdLineOptions = await this.preAction(cmdLineOptions)
            this.action(await this.getParams(cmdLineOptions, optionAliases))
        })
    }

    protected async preAction(cmdLineoptions: ICommandLineOptions): Promise<ICommandLineOptions> {
        if (this.description) StdOutUtil.printMessage(this.description + '\n')
        return cmdLineoptions
    }

    private async getParams(cmdLineOptions: ICommandLineOptions, optionAliases: (IOptionAlias & {aliasTo: string})[]): Promise<IParams> {
        const params: IParams = {}

        // Read params from env variables
        optionAliases.filter(opta => opta.env && opta.env in process.env).forEach(opta => params[opta.aliasTo] = {
            value: process.env[opta.env!],
            from: ParamType.Env
        })

        // Get config file name from env variables or command line options
        let file: string | null = optionAliases.filter(opta => cmdLineOptions && opta.aliasTo === this.configFileOptionName && opta.name in cmdLineOptions).reduce((prev, opta) => <string>cmdLineOptions[opta.name], null)
        if (params[this.configFileOptionName]) {
            if (file === null) file = params[this.configFileOptionName].value
            delete params[this.configFileOptionName]
        }
        optionAliases = optionAliases.filter(opta => opta.aliasTo !== this.configFileOptionName)

        if (file) { // Read params from config file
            const filePath = file.startsWith('/') ? file : join(process.cwd(), file)
            if (!pathExistsSync(filePath)) StdOutUtil.printError(`File not found: ${filePath}\n`, true)

            let config: any
            try {
                const fileContent = readFileSync(filePath, 'utf8').trim()
                if (fileContent && fileContent.length) {
                    if (fileContent.startsWith('{') || fileContent.startsWith('[')) {
                        config = JSON.parse(fileContent)
                    } else {
                        config = yaml.safeLoad(fileContent)
                    }
                }
            } catch (error) {
                StdOutUtil.printError(`Error reading config file: ${error.message || error}\n`, true)
            }
            
            this.configFileProvided = true
            optionAliases.filter(opta => opta.name in config).forEach(opta => params[opta.aliasTo] = {
                value: config[opta.name],
                from: ParamType.Config
            })
        }

        if (cmdLineOptions) { // Overwrite params from command line options
            optionAliases.filter(opta => opta.name in cmdLineOptions).forEach(opta => params[opta.aliasTo] = {
                value: cmdLineOptions[opta.name],
                from: ParamType.CommandLine
            })
        }
        
        const options = this.getOptions(params).filter(opt => opt && opt.name)
        let q = false
        for (const option of options) {
            const name = option.name!
            let param = params[name]
            if (param) { // Filter and validate already provided params
                if (option.filter) {
                    param.value = await option.filter(param.value)
                }
                if (option.validate) {
                    const err = await option.validate(param.value)
                    if (err !== true) StdOutUtil.printError(`${q ? '\n': ''}${err || 'Error!'}\n`, true)
                }
            } else if (name !== this.configFileOptionName) { // Questions for missing params
                if (!isFunction(option.message)) option.message += ':'
                const answer = await inquirer.prompt([option])
                if (name in answer) {
                    q = true
                    param = params[name] = {
                        value: answer[name],
                        from: ParamType.Question
                    }
                }
            }
            if (option.tap) {
                await option.tap(param)
            }
        }
        if (q) StdOutUtil.printMessage('')

        return params
    }
    
    protected abstract async action(params: IParams): Promise<void>
}
