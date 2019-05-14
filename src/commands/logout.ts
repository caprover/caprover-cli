#!/usr/bin/env node

import StdOutUtil from '../utils/StdOutUtil'
import CliHelper from '../utils/CliHelper'
import getParams, { ParamType } from '../utils/CommandHelper';
import StorageHelper from '../utils/StorageHelper';

async function logout(options: any) {
    StdOutUtil.printMessage('Logout from a CapRover machine and clear auth info')

    const questions = [{
        type: 'list',
        name: 'caproverName',
        message: 'Select the CapRover machine you want to logout from:',
        choices: CliHelper.get().getMachinesAsOptions()
    }, {
        type: 'confirm',
        name: 'confirmedToLogout',
        message: 'Are you sure you want to logout from this CapRover machine?',
        default: false,
        when: (answers: any) => answers.caproverName,
    }]

    const params = await getParams(options, questions)

    if (!params.caproverName || !params.caproverName.value || (params.confirmedToLogout && !params.confirmedToLogout.value)) {
        StdOutUtil.printMessage('\nOperation cancelled by the user...\n')
        return
    } else if (params.caproverName.from !== ParamType.Question) {
        if (!StorageHelper.get().findMachine(params.caproverName.value))
            StdOutUtil.printError(`"${params.caproverName.value}" CapRover machine not exist.`, true)
    }

    CliHelper.get().logoutMachine(params.caproverName.value)
}

export default logout
