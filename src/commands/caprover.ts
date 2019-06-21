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
import * as program from 'commander'

// Command actions
import Command from './Command'
import Login from './login'
import List from './list'
import Logout from './logout'
import Deploy from './deploy'
import ServerSetup from './serversetup'
import Api from './api'

// Setup
program.version(packagejson.version).description(packagejson.description)

// Commands
const commands: Command[] = [
    new ServerSetup(program),
    new Login(program),
    new List(program),
    new Logout(program),
    new Deploy(program),
    new Api(program)
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
