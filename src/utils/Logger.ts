export default class Logger {
    static log(s: string) {
        console.log(s)
    }

    static error(s: any) {
        // tslint:disable-next-line: no-console
        console.error(s)
    }

    static dev(s: string) {
        if (process.env.CLI_IS_DEBUG) {
            console.log('>>> ', s)
        }
    }
}
