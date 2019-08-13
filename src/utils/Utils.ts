import * as url from 'url'
import Constants from './Constants'

const ADMIN_DOMAIN = Constants.ADMIN_DOMAIN

const util = {
    extendCommonKeys<T extends { [key: string]: string }>(
        keys: T
    ): typeof Constants.COMMON_KEYS & T {
        return Object.assign({}, Constants.COMMON_KEYS, keys)
    },

    copyObject<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj)) as T
    },

    generateUuidV4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(
            c
        ) {
            var r = (Math.random() * 16) | 0,
                v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        })
    },

    getAnsiColorRegex() {
        const pattern = [
            '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
            '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
        ].join('|')

        return new RegExp(pattern, 'g')
    },

    cleanDomain(urlInput: string): string | undefined {
        if (!urlInput || !urlInput.length) return undefined
        try {
            let u = url.parse(urlInput)
            if (!u.protocol) u = url.parse(`//${urlInput}`, false, true)
            return u.hostname
        } catch (e) {
            return undefined
        }
    },

    cleanAdminDomainUrl(urlInput: string, https?: boolean): string | undefined {
        if (!urlInput || !urlInput.length) return undefined
        const http = urlInput.toLowerCase().startsWith('http://') // If no protocol, defaults to https
        let cleanedUrl = util.cleanDomain(urlInput)
        if (!cleanedUrl) return undefined
        if (!cleanedUrl.startsWith(`${ADMIN_DOMAIN}.`))
            cleanedUrl = `${ADMIN_DOMAIN}.${cleanedUrl}`
        return (
            (https || (https === undefined && !http) ? 'https://' : 'http://') +
            cleanedUrl
        )
    },

    isIpAddress(ipaddress: string): boolean {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            ipaddress
        )
    },

    isValidEmail(email: string): boolean {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return re.test(String(email).toLowerCase())
    },
}

export default util
