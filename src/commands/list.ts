#!/usr/bin/env node

import StdOutUtil from '../utils/StdOutUtil'
import StorageHelper from '../utils/StorageHelper'
import Command, { IParams, ICommandLineOptions } from './Command'

export default class List extends Command {
    protected command = 'list'

    protected aliases = ['ls']

    protected description = 'List all CapRover machines currently logged in.'

    protected async preAction(
        cmdLineoptions: ICommandLineOptions
    ): Promise<ICommandLineOptions> {
        StdOutUtil.printMessage('Logged in CapRover Machines:\n')
        return Promise.resolve(cmdLineoptions)
    }

    protected async action(params: IParams): Promise<void> {
        const machines = StorageHelper.get().getMachines()
        machines.forEach(StdOutUtil.displayColoredMachine)
        if (machines.length) StdOutUtil.printMessage('')
    }
}
