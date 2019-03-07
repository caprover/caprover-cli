#!/usr/bin/env node

import * as inquirer from 'inquirer'
import StdOutUtil from '../utils/StdOutUtil'
import StorageHelper from '../utils/StorageHelper'
import Constants from '../utils/Constants'
import Utils from '../utils/Utils'
import CliHelper from '../utils/CliHelper'
import { IHashMapGeneric } from '../models/IHashMapGeneric'
import CliApiManager from '../api/CliApiManager'
import { readFileSync } from 'fs'
import { join } from 'path'
import { pathExistsSync } from 'fs-extra'
import * as yaml from 'js-yaml'

const SAMPLE_DOMAIN = Constants.SAMPLE_DOMAIN
const cleanUpUrl = Utils.cleanUpUrl

function getErrorForDomain(value: string) {
    if (value === SAMPLE_DOMAIN) {
        return 'Enter a valid URL'
    }

    if (!cleanUpUrl(value)) return 'This is an invalid URL: ' + value

    let found = undefined
    StorageHelper.get()
        .getMachines()
        .map(machine => {
            if (cleanUpUrl(machine.baseUrl) === cleanUpUrl(value)) {
                found = machine.name
            }
        })

    if (found) {
        return `${value} already exist as ${found} in your currently logged in machines. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
    }

    if (value && value.trim()) {
        return true
    }

    return 'Please enter a valid address.'
}

function getErrorForName(value: string) {
    value = value.trim()

    if (StorageHelper.get().findMachine(value)) {
        return `${value} already exist. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
    }

    if (CliHelper.get().isNameValid(value)) {
        return true
    }

    return 'Please enter a CapRover Name.'
}

async function login(options: any) {
    StdOutUtil.printMessage('Login to a CapRover Machine')

    const questions = [
        {
            type: 'input',
            default: SAMPLE_DOMAIN,
            name: 'caproverUrl',
            message:
                '\nEnter address of the CapRover machine. \nIt is captain.[your-captain-root-domain] :',
            validate: (value: string) => {
                return getErrorForDomain(value)
            },
        },
        {
            type: 'confirm',
            name: 'hasRootHttps',
            message: 'Is HTTPS activated for this CapRover machine?',
            default: true,
        },
        {
            type: 'password',
            name: 'caproverPassword',
            message: 'Enter your password:',
            validate: (value: string) => {
                if (value && value.trim()) {
                    return true
                }

                return 'Please enter your password.'
            },
        },
        {
            type: 'input',
            name: 'caproverName',
            message: 'Enter a name for this Captain machine:',
            default: CliHelper.get().findDefaultCaptainName(),
            validate: (value: string) => {
                return getErrorForName(value)
            },
        },
    ]
    let answers: IHashMapGeneric<string>

    if (options.configFile) {
        const filePath = (options.configFile || '').startsWith('/')
            ? options.configFile
            : join(process.cwd(), options.configFile)
        if (!pathExistsSync(filePath))
            StdOutUtil.printError('File not found: ' + filePath, true)
        let fileContent = readFileSync(filePath, 'utf8')

        if (fileContent.startsWith('{') || fileContent.startsWith('[')) {
            answers = JSON.parse(fileContent)
        } else {
            answers = yaml.safeLoad(fileContent)
        }
    } else {
        answers = await inquirer.prompt(questions)
    }

    const {
        hasRootHttps,
        caproverPassword,
        caproverUrl,
        caproverName,
    } = answers
    const handleHttp = hasRootHttps ? 'https://' : 'http://'
    const baseUrl = `${handleHttp}${cleanUpUrl(caproverUrl)}`

    try {
        const tokenToIgnore = await CliApiManager.get({
            authToken: '',
            baseUrl,
            name: caproverName,
        }).getAuthToken(caproverPassword)

        StdOutUtil.printGreenMessage(`\nLogged in successfully to ${baseUrl}`)
        StdOutUtil.printGreenMessage(
            `Authorization token is now saved as ${caproverName} \n`
        )
    } catch (error) {
        const errorMessage = error.message ? error.message : error

        StdOutUtil.printError(
            `Something bad happened. Cannot save "${caproverName}" \n${errorMessage}`
        )
    }
}

export default login
