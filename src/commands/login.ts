#!/usr/bin/env node

import StdOutUtil from '../utils/StdOutUtil'
import StorageHelper from '../utils/StorageHelper'
import Constants from '../utils/Constants'
import Utils from '../utils/Utils'
import CliHelper from '../utils/CliHelper'
import CliApiManager from '../api/CliApiManager'
import { ILoginParams } from '../models/IConfigParams'
import getParams from '../utils/CommandHelper';

const SAMPLE_DOMAIN = Constants.SAMPLE_DOMAIN
const ADMIN_DOMAIN = Constants.ADMIN_DOMAIN
const cleanUpUrl = Utils.cleanUpUrl

function getErrorForDomain(value: string) {
    if (value === SAMPLE_DOMAIN) {
        return 'Enter a valid URL.'
    }

    const cleaned = cleanUpUrl(value)
    if (!cleaned) {
        return `This is an invalid URL: "${value}".`
    }

    const found = StorageHelper.get().getMachines().find(machine => cleanUpUrl(machine.baseUrl) === cleaned)
    if (found) {
        return `"${cleaned}" already exist as "${found.name}" in your currently logged in machines. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
    }

    return true
}

function getErrorForName(value: string) {
    value = value.trim()

    if (StorageHelper.get().findMachine(value)) {
        return `"${value}" already exist. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
    }

    if (CliHelper.get().isNameValid(value)) {
        return true
    }

    return 'Please enter a name.'
}

async function login(options: any) {
    StdOutUtil.printMessage('Login to a CapRover machine')

    const questions = [{
        type: 'input',
        default: SAMPLE_DOMAIN,
        name: 'caproverUrl',
        message: `Enter address of the CapRover machine. It is "[${ADMIN_DOMAIN}.]your-captain-root-domain":`,
        validate: getErrorForDomain
    }, {
        type: 'confirm',
        name: 'hasRootHttps',
        message: 'Is HTTPS activated for this CapRover machine?',
        default: true,
    }, {
        type: 'password',
        name: 'caproverPassword',
        message: 'Enter this CapRover machine password:',
        validate: (value: string) => value && value.trim() ? true : 'Please enter password.'
    }, {
        type: 'input',
        name: 'caproverName',
        message: 'Enter a name for this CapRover machine:',
        default: CliHelper.get().findDefaultCaptainName(),
        validate: getErrorForName
    }]

    const params = await getParams(options, questions)

    const loginParams: ILoginParams = {
        caproverUrl: params.caproverUrl.value,
        hasRootHttps: params.hasRootHttps.value,
        caproverPassword: params.caproverPassword.value,
        caproverName: params.caproverName.value
    }
    const baseUrl = (loginParams.hasRootHttps ? 'https://' : 'http://') + cleanUpUrl(loginParams.caproverUrl)

    try {
        const tokenToIgnore = await CliApiManager.get({
            authToken: '',
            baseUrl,
            name: loginParams.caproverName,
        }).getAuthToken(loginParams.caproverPassword)
        StdOutUtil.printGreenMessage(`\nLogged in successfully to "${baseUrl}".`)
        StdOutUtil.printGreenMessage(`Authorization token is now saved as "${loginParams.caproverName}".\n`)
    } catch (error) {
        const errorMessage = error.message ? error.message : error
        StdOutUtil.printError(`Something bad happened. Cannot save "${loginParams.caproverName}".\n${errorMessage}`)
    }
}

export default login
