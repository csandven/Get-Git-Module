const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const request = require('request')

const CredentialsController = require('./credentialsController')

module.exports = class ImportController {

    static async import () {
        CredentialsController.getCredentials()
            .then(async credentials => {
                const repo = await promptly.prompt('Get from repo: ')
                const branch = await promptly.prompt('Repo branch: (master) ', {
                    default: 'master'
                })
                const file = await promptly.prompt('Specific file: (optional) ', {
                    default: ''
                })
                
                var target = `${repo}/contents/${encodeURI(file)}?ref=${branch}`
                
                ImportController.request(credentials, target)
                    .then(async data => {
                        await ImportController.handleResponse(repo, data)
                    })
                    .catch(err => {
                        console.log(err)  
                    })
            })
            .catch(err => {
                console.log('No credentials found')
                console.log('Use `getgitmodule credentials set` to set your crendentials')
            })
    }

    static async handleResponse (repo, data) {
        var defaultAlias = repo.split('/')[1]

        const msgToUser = `Alias for module: (${defaultAlias}) `
        const alias = await promptly.prompt(msgToUser, {
            default: defaultAlias
        })
        
        await ImportController.createModuleFolderIfNotExists()
        
        const targetDir = path.join(process.cwd(), 'git_modules', alias)
        fs.mkdir(targetDir, {recursive: true}, async err => {
            if (err) {
                console.log('This module already exists, do you want to update it?')
                const yesNo = await promptly.prompt('Y / n', {
                    default: 'Y'
                })

                if (yesNo === 'n') {
                    return
                }
            }

            if (Array.isArray(data.body)) {

            } else {
                const index = path.join(targetDir, 'index.js'),
                      content = Buffer.from(data.body.content, 'base64').toString()

                fs.writeFile(index, content, err => {
                    if (err)
                        console.log(err)
                    else
                        console.log('Module was added!')
                })
            }
        })
    }

    static createModuleFolderIfNotExists () {
        return new Promise ((resolve, reject) => {
            const folder = path.join(process.cwd(), 'git_modules')
            fs.exists(folder, yes => {
                if (yes)
                    return resolve()
                
                fs.mkdir(folder, err => {
                    if (err)
                        reject(err)
                    resolve()
                })
            })
        })
    }

    static request (credentials, target) {
        return new Promise ((resolve, reject) => {
            request({
                url: 'https://api.github.com/repos/' + target,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'basic ' + credentials,
                    'user-agent': 'mayfly'
                },
                json: true
            }, (err, data) => {
                if (err)
                    reject(err)
                resolve(data)
            })
        })
    }

}