const ADMIN_DOMAIN = 'captain'
const SAMPLE_DOMAIN = `${ADMIN_DOMAIN}.captainroot.yourdomain.com`
const SAMPLE_IP = '123.123.123.123'
const DEFAULT_PASSWORD = 'captain42'
const CANCEL_STRING = '-- CANCEL --'
const SETUP_PORT = 3000
const MIN_CHARS_FOR_PASSWORD = 8
const BASE_API_PATH = '/api/v2'
const API_METHODS = ['GET', 'POST']

export default {
    ADMIN_DOMAIN,
    SAMPLE_DOMAIN,
    SAMPLE_IP,
    DEFAULT_PASSWORD,
    CANCEL_STRING,
    SETUP_PORT,
    MIN_CHARS_FOR_PASSWORD,
    BASE_API_PATH,
    API_METHODS,
    COMMON_KEYS: {
        conf: 'configFile',
        url: 'caproverUrl',
        pwd: 'caproverPassword',
        name: 'caproverName',
        app: 'caproverApp',
    },
}
