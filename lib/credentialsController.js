const promptly = require('promptly')
const fs = require('fs')
const path = require('path')

module.exports = class CredentialsController {

    /**
     * Path top credential file
     *
     * @readonly
     * @static
     */
    static get credFilePath () {
        return path.join(__dirname, '..', '.credentials')
    }

    /**
     * Returns content of credential file
     *
     * @static
     * @returns {Promise<Buffer>}
     */
    static getCredentials () {
        return new Promise ((resolve, reject) => {
            fs.readFile(CredentialsController.credFilePath, (err, data) => {
                if (err)
                    reject(err)
                resolve(data)
            })
        })
    }

    /**
     * Sets credentials
     *
     * @static
     */
    static set () {
        fs.stat(CredentialsController.credFilePath, async (err, stats) => {
            if (stats) {
                console.log('Credentials is already set!')
                process.exit()
            }

            const username = await promptly.prompt('Github Username: ')
            const password = await promptly.password('Github Password: ')
            
            const credString = `${username}:${password}`
            const cred = Buffer.from(credString).toString('base64')
            
            fs.writeFile(CredentialsController.credFilePath, cred, err => {
                if (err)
                    throw new Error(err)

                console.log('New credentials stored!')
            })
        })
    }

    /**
     * Removes credetntials
     *
     * @static
     */
    static remove () {
        fs.stat(CredentialsController.credFilePath, (err, stats) => {
            if (stats) {
                fs.unlink(CredentialsController.credFilePath, err => {
                    if (err)
                        throw new Error(err)

                    console.log('Credentials was removed!')
                })
            }
        })
    }

}