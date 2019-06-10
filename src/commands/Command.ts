import { join } from 'path'
import { pathExistsSync } from 'fs-extra'
import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { CommanderStatic } from "commander"
import * as inquirer from 'inquirer'
import Constants from '../utils/Constants'
import StdOutUtil from '../utils/StdOutUtil'

export interface IOption extends inquirer.Question {
    char?: string
    aliases?: {name?: string, char?: string}[]
    hide?: boolean,
    tap?: (param?: IParam) => void
}

export interface ICommandLineOptions {
    [option: string]: string | boolean
}

export enum ParamType {
    Config,
    CommandLine,
    Question
}

export interface IParam {
    value: any,
    from: ParamType
}

export interface IParams {
    [param: string]: IParam
}

export default abstract class Command {
    private program: CommanderStatic

    protected abstract command: string

    protected aliases?: string[] = undefined

    protected usage?: string = undefined

    protected description?: string = undefined

    protected options?: IOption[] | ((params?: IParams) => IOption[])

    private optionsNames: string[] = []

    protected static CONFIG_FILE_OPTION_NAME: string = Constants.COMMON_KEYS.conf

    protected static CONFIG_FILE_OPTION_DEFAULT: IOption = {
        name: Command.CONFIG_FILE_OPTION_NAME,
        char: 'c',
        message: 'path of the file where all parameters are defined in JSON or YAML format\n' +
                 'see others options to know config file parameters\' names\n' +
                 'this is mainly for automation purposes, see docs'
    }

    protected configFileProvided = false

    constructor(program: CommanderStatic) {
        if (!program) throw 'program is null';
        this.program = program
    }

    private static isFunction(value: any): boolean {
        return value instanceof Function
    }

    private static getValue<T>(value?: T | ((...args: any) => T), ...args: any): T | undefined {
        return value instanceof Function ? value(...args) : value
    }

    private static getCmdLineOptionString(option: IOption): string {
        return (option.char ? `-${option.char}, ` : '') + `--${option.name}` + (option.type !== 'confirm' ? ' <value>' : '')
    }

    private getOptions(params?: IParams): IOption[] {
        return Command.getValue(this.options, params) || []
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

    public build() {
        if (!this.command) throw 'Empty command name';

        const cmd = this.program.command(this.command)
        if (this.aliases && this.aliases.length) this.aliases.forEach(alias => alias ? cmd.alias(alias) : null)
        if (this.description) cmd.description(this.description)
        if (this.usage) cmd.usage(this.usage)

        let options = this.getOptions().filter(opt => opt && opt.name)
        this.optionsNames = options.map(opt => opt.name!)

        options = options.filter(opt => !opt.hide)
        const spaces = ' '.repeat(options.reduce((max, opt) => Math.max(max, Command.getCmdLineOptionString(opt).length), 0) + 4)
        for (const option of options) {
            cmd.option(
                Command.getCmdLineOptionString(option),
                (Command.getValue(option.message) || '').split('\n').reduce((acc, l) => !acc ? l.trim() : `${acc}\n${spaces}${l.trim()}`, ''),
                Command.getValue(option.default)
            )
        }

        cmd.action(async (cmdLineOptions: ICommandLineOptions) => {
            cmdLineOptions = await this.preAction(cmdLineOptions)
            this.action(await this.getParams(cmdLineOptions))
        })
    }

    protected async preAction(cmdLineoptions: ICommandLineOptions): Promise<ICommandLineOptions> {
        if (this.description) StdOutUtil.printMessage(this.description + '\n')
        return cmdLineoptions
    }

    private async getParams(cmdLineOptions: ICommandLineOptions): Promise<IParams> {
        const params: IParams = {}

        if (cmdLineOptions && cmdLineOptions[Command.CONFIG_FILE_OPTION_NAME]) { // Read params from config file
            const file = <string>cmdLineOptions[Command.CONFIG_FILE_OPTION_NAME]
            const filePath = (file || '').startsWith('/') ? file : join(process.cwd(), file)
            if (!pathExistsSync(filePath)) StdOutUtil.printError(`File not found: ${filePath}\n`, true)

            let config
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
            for (const cfg in config) {
                if (this.optionsNames.includes(cfg)) {
                    params[cfg] = {
                        value: config[cfg],
                        from: ParamType.Config
                    }
                }
            }
        }

        if (cmdLineOptions) { // Overwrite params from command line options
            for (const opt in cmdLineOptions) {
                if (opt !== Command.CONFIG_FILE_OPTION_NAME && this.optionsNames.includes(opt)) {
                    params[opt] = {
                        value: cmdLineOptions[opt],
                        from: ParamType.CommandLine
                    }
                }
            }
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
            } else if (name !== Command.CONFIG_FILE_OPTION_NAME) { // Questions for missing params
                if (!Command.isFunction(option.message)) option.message += ':'
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