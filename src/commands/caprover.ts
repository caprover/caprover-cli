#!/usr/bin/env node

const packagejson = require('../../package.json')
import * as updateNotifier from 'update-notifier'

const versionOfNode = Number(process.version.split('.')[0])

if (versionOfNode < 6) {
    console.log(
        'Unsupported version of node. You need to update your local NodeJS version.'
    )
    process.exit(1)
} else if (versionOfNode < 8) {
    console.log(
        'Your NodeJS is too old. CapRover is tested on the latest NodeJS engine. Update your local NodeJS version for a better experience.'
    )
}

updateNotifier({ pkg: packagejson }).notify({ isGlobal: true })

import StdOutUtil from '../utils/StdOutUtil'
import Constants from '../utils/Constants'
import * as program from 'commander'

// Command actions
import Command from './Command';
import Login from './login'
import List from './list'
import Logout from './logout'
import Deploy from './deploy'
import serversetup from './serversetup'

// Setup
program.version(packagejson.version).description(packagejson.description)
    .command('serversetup')
    .description(
        'Performs necessary actions to prepare CapRover machine to your server.'
    )
    .option(
        '-c, --configFile <value>',
        'Specify path of the file where all parameters are defined in JSON or YAML format.\n' +
        '                              See others options to know config file parameters\' names.\n' +
        '                              This is mainly for automation purposes, see docs.'
    )
    .action((options: any) => {
        serversetup(options)
    })

// Commands
const commands: Command[] = [
    new Login(program),
    new List(program),
    new Logout(program),
    new Deploy(program)
]
commands.forEach(c => c.build())

// Error on unknown commands
program.on('command:*', () => {
    const wrongCommands = program.args.join(' ')
    StdOutUtil.printError(`Invalid command: ${wrongCommands}\nSee --help for a list of available commands.\n`, true)
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
    program.outputHelp()
}
