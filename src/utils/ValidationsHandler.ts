import * as fs from 'fs-extra'
import { execSync } from 'child_process'
const commandExistsSync = require('command-exists').sync
import StdOutUtil from './StdOutUtil'
import StorageHelper from './StorageHelper'
import Constants from './Constants'
import Utils from './Utils'
import { IAppDef } from '../models/AppDef'
const isWindows = process.platform === 'win32'

export function validateIsGitRepository() {
    if (!fs.pathExistsSync('./.git')) {
        StdOutUtil.printError(
            'You are not in a git root directory: this command will only deploys the current directory.\n' +
            'Run "caprover deploy --help" to know more deployment options... (e.g. tar file or image name)\n',
            true
        )
    }
    if (!commandExistsSync('git')) {
        StdOutUtil.printError(
            '"git" command not found: CapRover needs "git" to create tar file from your branch source files.\n' +
            'Run "caprover deploy --help" to know more deployment options... (e.g. tar file or image name)\n',
            true
        )
    }
}

export function validateDefinitionFile() {
    if (!fs.pathExistsSync('./captain-definition')) {
        if (fs.pathExistsSync('./Dockerfile')) {
            StdOutUtil.printWarning('**** Warning ****')
            StdOutUtil.printMessage(
                'No captain-definition was found in main directory: falling back to Dockerfile.\n'
            )
        } else {
            StdOutUtil.printWarning('**** Warning ****')
            StdOutUtil.printMessage(
                'No captain-definition was found in main directory: unless you have specified a special path for your captain-definition, this build will fail!\n'
            )
        }
    } else {
        let content = null
        try {
            content = JSON.parse(
                fs.readFileSync('./captain-definition', 'utf8')
            )
        } catch (e) {
            StdOutUtil.printError(
                `captain-definition file is not a valid JSON!\n${e.message ||
                    e}\n`,
                true
            )
        }
        if (!content || !content.schemaVersion) {
            StdOutUtil.printError(
                'captain-definition needs "schemaVersion": please see docs!\n',
                true
            )
        }
    }
}

export function isNameValid(value: string): boolean {
    return !!(value && value.match(/^[-\d\w]+$/i) && !value.includes('--'))
}

export function getErrorForIP(value: string): true | string {
    value = value.trim()
    if (value === Constants.SAMPLE_IP) return 'Enter a valid IP.'
    if (!Utils.isIpAddress(value)) return `This is an invalid IP: ${value}.`
    return true
}

export function getErrorForDomain(
    value: string,
    skipAlreadyStored?: boolean
): true | string {
    if (value === Constants.SAMPLE_DOMAIN) {
        return 'Enter a valid URL.'
    }
    const cleaned = Utils.cleanAdminDomainUrl(value)
    if (!cleaned) {
        return `This is an invalid URL: ${StdOutUtil.getColoredMachineUrl(
            value
        )}.`
    }
    if (!skipAlreadyStored) {
        const found = StorageHelper.get()
            .getMachines()
            .find(
                machine =>
                    Utils.cleanAdminDomainUrl(machine.baseUrl) === cleaned
            )
        if (found) {
            return `${StdOutUtil.getColoredMachineUrl(
                cleaned
            )} already exist as ${StdOutUtil.getColoredMachineName(
                found.name
            )} in your currently logged in machines. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
        }
    }
    return true
}

export function getErrorForPassword(
    value: string,
    constraint?: number | string
): true | string {
    if (!value || !value.trim()) return 'Please enter password.'
    if (typeof constraint === 'number' && value.length < constraint)
        return `Password is too short, min ${constraint} characters.`
    if (typeof constraint === 'string' && value !== constraint)
        return `Passwords do not match.`
    return true
}

export function getErrorForMachineName(
    value: string,
    checkExisting?: boolean
): true | string {
    value = value.trim()
    const exist: boolean = StorageHelper.get().findMachine(value) ? true : false
    if (exist && !checkExisting) {
        return `${StdOutUtil.getColoredMachineName(
            value
        )} already exist. If you want to replace the existing entry, you have to first use <logout> command, and then re-login.`
    }
    if (checkExisting && !exist) {
        return `${StdOutUtil.getColoredMachineName(
            value
        )} CapRover machine not exist.`
    }
    if (checkExisting || isNameValid(value)) {
        return true
    }
    return 'Please enter a valid CapRover machine name: small letters, numbers, single hyphen.'
}

export function getErrorForAppName(
    apps: IAppDef[],
    value: string
): true | string {
    value = value.trim()
    const app = apps.find(a => a.appName === value)
    if (!app) {
        return `${StdOutUtil.getColoredAppName(
            value
        )} app not exist on this CapRover machine.`
    }
    if (app.isAppBuilding) {
        return `${StdOutUtil.getColoredAppName(
            value
        )} app is currently in a building process.`
    }
    return true
}

export function getErrorForBranchName(value: string): true | string {
    if (!value || !value.trim()) return 'Please enter branch name.'
    value = value.trim()
    try {
        const cmd = isWindows
            ? execSync(`git rev-parse ${value} > NUL`)
            : execSync(`git rev-parse ${value} 2>/dev/null`)
        if (cmd) return true
    } catch (e) {}
    return `Cannot find hash of last commit on branch "${value}".`
}

export function getErrorForEmail(value: string): true | string {
    if (!value || !value.trim()) return 'Please enter email.'
    if (!Utils.isValidEmail(value)) return 'Please enter a valid email.'
    return true
}

export function userCancelOperation(cancel: boolean, c?: boolean): boolean {
    if (cancel)
        StdOutUtil.printMessage(
            (c ? '\n' : '') +
                '\nOperation cancelled by the user!' +
                (!c ? '\n' : ''),
            true
        )
    return false
}
