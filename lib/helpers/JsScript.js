
const builtIn = [
    'assert', 'buffer', 'child_process', 'cluster',
    'crypto', 'dgram', 'dns', 'domain', 'events',
    'fs', 'http', 'https', 'net', 'os', 'path',
    'punycode', 'querystring', 'readline', 'stream',
    'string_decoder', 'timers', 'tls', 'tty', 'url',
    'util', 'v8' ,'vm', 'zlib'
]

module.exports = class JsScript {

    constructor (responseBody) {
        this.responseBody = responseBody
        this.content = responseBody.content
    }

    /**
     * Finds npm dependecies in the script
     *
     * @returns {Array<string>}
     */
    findNpmDependencies () {
        const deps = []

        const lines = this.content.split(/\n/g)
        const requireReg = /require\((\"|\')([a-z0-9_-]+)(\"|\')/gi
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(requireReg)) {
                const match = requireReg.exec(lines[i])
                if (match[2] && !builtIn.includes(match[2])) {
                    deps.push(match[2])
                }
            }
        }

        return deps
    }

    /**
     * Finds local file dependencies
     *
     * @returns
     */
    findLocalDependencies () {
        const deps = []

        const lines = this.content.split(/\n/g)
        const requireReg = /require\((\"|\')([a-z0-9\_\-\.\/]+)(\"|\')/gi
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(requireReg)) {
                const match = requireReg.exec(lines[i])
                if (match[2] && match[2].match(/\//g) && !builtIn.includes(match[2])) {
                    deps.push(match[2])
                }
            }
        }

        return deps
    }

}