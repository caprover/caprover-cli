import { join } from 'path'
import { pathExistsSync } from 'fs-extra'
import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import * as inquirer from 'inquirer'
import StdOutUtil from './StdOutUtil'

export enum ParamType {
    Config,
    Option,
    Question
}

export interface IParam {
    value: any,
    from: ParamType
}

export interface IParams {
    [param: string]: IParam
}

export default async function getParams(options: any, questions: inquirer.Question[], validate: boolean = true): Promise<IParams> {
    const params: IParams = {}

    if (options && options.configFile) { // Read params from config file
        const filePath = (options.configFile || '').startsWith('/')
            ? options.configFile
            : join(process.cwd(), options.configFile)
        if (!pathExistsSync(filePath)) StdOutUtil.printError('File not found: ' + filePath, true)

        const fileContent = readFileSync(filePath, 'utf8').trim()

        if (fileContent && fileContent.length) {
            let config
            if (fileContent.startsWith('{') || fileContent.startsWith('[')) {
                config = JSON.parse(fileContent)
            } else {
                config = yaml.safeLoad(fileContent)
            }
            for (const cfg in config) {
                params[cfg] = {
                    value: config[cfg],
                    from: ParamType.Config
                }
            }
        }
    }

    if (options) { // Overwrite params from command line options
        for (const opt in options) {
            if (opt !== 'configFile') {
                params[opt] = {
                    value: options[opt],
                    from: ParamType.Option
                }
            }
        }
    }
    
    const questionsToFilterOut: string[] = []
    for (const param in params) { // Validate already provided params
        questionsToFilterOut.push(param)
        if (validate && questions) {
            const question = questions.find(q => q.name === param)
            if (question && question.validate) {
                const err = await question.validate(params[param].value)
                if (err !== true) StdOutUtil.printError(err === false ? "Error!" : err, true)
            }
        }
    }

    if (questions) { // Prompt questions for missing params
        const questionsToPrompt = questions.filter(q => !questionsToFilterOut.includes(q.name || ''))
        const answers: {[opt: string]: any} = await inquirer.prompt(questionsToPrompt)
        for (const ans in answers) {
            params[ans] = {
                value: answers[ans],
                from: ParamType.Question
            }
        }
    }

    return params
}
