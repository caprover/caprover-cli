import chalk from 'chalk'
import { IMachine } from '../models/storage/StoredObjects'

class StdOutUtils {
    printMessage(message: string, exit: boolean | number = false) {
        console.log(message)
        if (exit !== false) process.exit(exit === true ? 0 : exit)
    }

    printGreenMessage(message: string, exit: boolean | number = false) {
        console.log(`${chalk.green(message)}`)
        if (exit !== false) process.exit(exit === true ? 0 : exit)
    }

    printMagentaMessage(message: string, exit: boolean | number = false) {
        console.log(`${chalk.magenta(message)}`)
        exit && process.exit(0)
    }

    printError(error: string, exit: boolean | number = false) {
        console.log(`${chalk.bold.red(error)}`)
        if (exit !== false) process.exit(exit === true ? 1 : exit)
    }

    printWarning(warning: string, exit: boolean | number = false) {
        console.log(`${chalk.yellow(warning)}`)
        if (exit !== false) process.exit(exit === true ? 1 : exit)
    }

    printTip(tip: string, exit: boolean | number = false) {
        console.log(`${chalk.bold.green(tip)}`)
        if (exit !== false) process.exit(exit === true ? 0 : exit)
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
