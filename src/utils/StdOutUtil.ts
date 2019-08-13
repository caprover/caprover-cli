import chalk from 'chalk'
import { IMachine } from '../models/storage/StoredObjects'

class StdOutUtils {
    printMessage(message: string) {
        console.log(message)
    }

    printMessageAndExit(message: string) {
        console.log(message)
        process.exit(0)
    }

    printGreenMessage(message: string, exit = false) {
        console.log(`${chalk.green(message)}`)
        exit && process.exit(0)
    }

    printMagentaMessage(message: string, exit = false) {
        console.log(`${chalk.magenta(message)}`)
        exit && process.exit(0)
    }

    printError(error: string, exit = false) {
        console.log(`${chalk.bold.red(error)}`)
        exit && process.exit(0)
    }

    printWarning(warning: string, exit = false) {
        console.log(`${chalk.yellow(warning)}`)
        exit && process.exit(0)
    }

    printTip(tip: string, exit = false) {
        console.log(`${chalk.bold.green(tip)}`)
        exit && process.exit(0)
    }

    errorHandler(error: any) {
        if (error.captainStatus) {
            this.printError(
                `\nError Code: ${error.captainStatus}  Message: ${error.captainMessage}\n`,
                true
            )
        } else if (error.status) {
            this.printError(
                `\nError status: ${
                    error.status
                }  Message: ${error.description || error.message}\n`,
                true
            )
        } else {
            this.printError(`\nError: ${error}\n`, true)
        }
    }

    getColoredMachineName = (name: string): string => chalk.greenBright(name)

    getColoredMachineUrl = (url: string): string => chalk.bold.yellow(url)

    getColoredAppName = (name: string): string => chalk.magenta(name)

    getColoredMachine = (machine: IMachine): string =>
        `${this.getColoredMachineName(
            machine.name
        )} at ${this.getColoredMachineUrl(machine.baseUrl)}`

    displayColoredMachine = (machine: IMachine) =>
        console.log(`>> ${this.getColoredMachine(machine)}`)
}

export default new StdOutUtils()
