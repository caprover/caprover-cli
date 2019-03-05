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
import login from './login'
import list from './list'
import logout from './logout'
import deploy from './deploy'
import serversetup from './serversetup'

// Setup
program.version(packagejson.version).description(packagejson.description)

// Commands

program
    .command('login')
    .description(
        'Login to a CapRover machine. You can be logged in to multiple machines simultaneously.'
    )
    .option(
        '-c, --configFile <value>',
        'Specify path of the file where all server parameters are defined in a .yaml or .json file. This is only for automation purposes. See docs.'
    )
    .action((options: any) => {
        login(options)
    })

program
    .command('list')
    .alias('ls')
    .description('List all CapRover machines currently logged in.')
    .action(() => {
        list()
    })

program
    .command('logout')
    .description('Logout from a specific CapRover machine.')
    .action(() => {
        logout()
    })

program
    .command('serversetup')
    .description(
        'Performs necessary actions and prepares your CapRover server.'
    )
    .option(
        '-c, --configFile <value>',
        'Specify path of the file where all server parameters are defined in a .yaml or .json file. This is only for automation purposes. See docs.'
    )
    .action((options: any) => {
        serversetup(options)
    })

program
    .command('deploy')
    .description(
        "Deploy your app (current directory) to a specific CapRover machine. You'll be prompted to choose your CapRover machine. " +
            'For use in scripts, i.e. non-interactive mode, you can use --host --pass --appName along with --tarFile or -- branch flags.'
    )
    .option(
        '-d, --default',
        'Use previously entered values for the current directory, avoid asking.'
    )
    .option(
        '-h, --host <value>',
        'Specify th URL of the CapRover machine in command line'
    )
    .option(
        '-a, --appName <value>',
        'Specify Name of the app to be deployed in command line'
    )
    .option(
        '-p, --pass <value>',
        'Specify password for CapRover in command line'
    )
    .option('-b, --branch <value>', 'Specify branch name (default master)')
    .option(
        '-t, --tarFile <value>',
        'Specify the tar file to be uploaded (rather than using git archive)'
    )
    .option(
        '-i, --imageName <value>',
        'Specify the imageName to be deployed. The image should either exist on server, or it has to be public, or on a private repository that CapRover has access to.'
    )
    .action((options: any) => {
        deploy(options)
    })

// Error on unknown commands
program.on('command:*', () => {
    const wrongCommands = program.args.join(' ')

    StdOutUtil.printError(
        `\nInvalid command: ${wrongCommands}\nSee --help for a list of available commands.`,
        true
    )
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
    program.outputHelp()
}
