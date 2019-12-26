export default class Logger {
    public static log(s: string) {
        console.log(s)
    }

    public static error(s: any) {
        console.error(s)
    }

    public static dev(s: string) {
        if (process.env.CLI_IS_DEBUG) {
            console.log('>>> ', s)
        }
    }
}
