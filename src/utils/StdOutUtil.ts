import chalk from 'chalk'
import { IMachine } from '../models/storage/StoredObjects'

class StdOutUtils {
    public printMessage(message: string, exit: boolean | number = false) {
        console.log(message)
        if (exit !== false) { process.exit(exit === true ? 0 : exit) }
    }

    public printGreenMessage(message: string, exit: boolean | number = false) {
        console.log(`${chalk.green(message)}`)
        if (exit !== false) { process.exit(exit === true ? 0 : exit) }
    }

    public printMagentaMessage(message: string, exit: boolean | number = false) {
        console.log(`${chalk.magenta(message)}`)
        if (exit) { process.exit(0) }
    }

    public printError(error: string, exit: boolean | number = false) {
        console.log(`${chalk.bold.red(error)}`)
        if (exit !== false) { process.exit(exit === true ? 1 : exit) }
    }

    public printWarning(warning: string, exit: boolean | number = false) {
        console.log(`${chalk.yellow(warning)}`)
        if (exit !== false) { process.exit(exit === true ? 1 : exit) }
    }

    public printTip(tip: string, exit: boolean | number = false) {
        console.log(`${chalk.bold.green(tip)}`)
        if (exit !== false) { process.exit(exit === true ? 0 : exit) }
    }

    public errorHandler(error: any) {
        if (error.captainStatus) {
            this.printError(
                `\nError Code: ${error.captainStatus}  Message: ${error.captainMessage}\n`,
                true,
            )
        } else if (error.status) {
            this.printError(
                `\nError status: ${
                    error.status
                }  Message: ${error.description || error.message}\n`,
                true,
            )
        } else {
            this.printError(`\nError: ${error}\n`, true)
        }
    }

    public getColoredMachineName = (name: string): string => chalk.greenBright(name)

    public getColoredMachineUrl = (url: string): string => chalk.bold.yellow(url)

    public getColoredAppName = (name: string): string => chalk.magenta(name)

    public getColoredMachine = (machine: IMachine): string =>
        `${this.getColoredMachineName(
            machine.name,
        )} at ${this.getColoredMachineUrl(machine.baseUrl)}`

    public displayColoredMachine = (machine: IMachine) =>
        console.log(`>> ${this.getColoredMachine(machine)}`)
}

export default new StdOutUtils()
