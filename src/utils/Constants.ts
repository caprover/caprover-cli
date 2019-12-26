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
    API_METHODS,
    BASE_API_PATH,
    CANCEL_STRING,
    COMMON_KEYS: {
      app: 'caproverApp',
        conf: 'configFile',
        name: 'caproverName',
        pwd: 'caproverPassword',
        url: 'caproverUrl',
    },
    DEFAULT_PASSWORD,
    MIN_CHARS_FOR_PASSWORD,
    SAMPLE_DOMAIN,
    SAMPLE_IP,
    SETUP_PORT,
}
