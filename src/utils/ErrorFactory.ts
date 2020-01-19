class ErrorFactory {
    readonly OKAY = 100
    readonly OKAY_BUILD_STARTED = 101

    readonly STATUS_ERROR_GENERIC = 1000
    readonly STATUS_ERROR_CAPTAIN_NOT_INITIALIZED = 1001
    readonly STATUS_ERROR_USER_NOT_INITIALIZED = 1101
    readonly STATUS_ERROR_NOT_AUTHORIZED = 1102
    readonly STATUS_ERROR_ALREADY_EXIST = 1103
    readonly STATUS_ERROR_BAD_NAME = 1104
    readonly STATUS_WRONG_PASSWORD = 1105
    readonly STATUS_AUTH_TOKEN_INVALID = 1106
    readonly VERIFICATION_FAILED = 1107

    readonly UNKNOWN_ERROR = 1999

    constructor() {}

    createError(status: number, message: string) {
        const e = new Error(message) as any
        e.captainStatus = status
        e.captainMessage = message
        return e
    }

    eatUpPromiseRejection() {
        return function(error: any) {
            // nom nom
        }
    }
}

export default new ErrorFactory()
