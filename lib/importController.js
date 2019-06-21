const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const request = require('request')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const CredentialsController = require('./credentialsController')

module.exports = class ImportController {

    static get gitModules () {
        return path.join(process.cwd(), 'git_modules')
    }

    static async import () {
        const repo = await promptly.prompt('Get from repo: ')
        const branch = await promptly.prompt('Repo branch: (master) ', {
            default: 'master'
        })
        const file = await promptly.prompt('Specific file: (optional) ', {
            default: ''
        })
        
        const target = `${repo}/contents/${encodeURI(file)}?ref=${branch}`

        CredentialsController.getCredentials()
            .then(async credentials => {
                
                ImportController.request(credentials, target)
                    .then(async data => {
                        await ImportController.handleResponse(repo, data, target, file)
                    })
                    .catch(err => {
                        console.log(err)  
                    })
            })
            .catch(err => {
                console.log('No credentials found')
                ImportController.request('', target)
                    .then(async data => {
                        if (data.body.message === 'Not Found') {
                            console.log('The repository was not found!')
                            console.log(
                                'If this is a private repository,',
                                'you have to set your credentials with:'
                            )
                            console.log('`getgitmodule credentials set`')
                            process.exit()
                        }

                        await ImportController.handleResponse(repo, data, target, file)
                    })
            })
    }

    static clearFolder (folder, clear = false) {
        return new Promise ((resolve, reject) => {
            rimraf(folder, _ => {
                if (!clear) {
                    fs.mkdir(folder, err => {
                        resolve()
                    })
                } else {
                    resolve()
                }
            })
        })
    }

    static async handleResponse (repo, data, target, fileRef = '') {
        var defaultAlias = repo.split('/')[1]

        const msgToUser = `Alias for module: (${defaultAlias}) `
        const alias = await promptly.prompt(msgToUser, {
            default: defaultAlias
        })
        
        await ImportController.createModuleFolderIfNotExists()
        
        const targetDir = path.join(this.gitModules, alias)
        fs.mkdir(targetDir, {recursive: true}, async err => {
            if (err) {
                console.log('This module already exists, do you want to update it?')
                const yesNo = await promptly.prompt('Y / n', {
                    default: 'Y'
                })

                if (yesNo === 'n') {
                    return
                } else {
                    await ImportController.clearFolder(targetDir)
                }
            }

            if (Array.isArray(data.body)) {
                ImportController.insertFolder(data.body, alias, target, fileRef)
            } else {
                const index = path.join(alias, 'index.js')
                ImportController.insertFile(data, index, _ => {
                    console.log('Module was added!')
                    ImportController.updatePackage(alias, target)
                })
            }
        })
    }

    static insertFile (data, targetFile, callback) {
        const content = Buffer.from(data.body.content || '', 'base64').toString()

        targetFile = path.join(this.gitModules, targetFile)
        fs.writeFile(targetFile, content, err => {
            if (err)
                console.error(targetFile, err)
            else {
                if (callback)
                    callback()
            }
        })
    }

    static mkdirRecursive (dir, alias) {
        return new Promise (async (resolve, reject) => {
            const gmFolder = path.join(this.gitModules, alias)
            mkdirp(path.join(gmFolder, dir), err => {
                if (err)
                    throw new Error(err)
                resolve()
            })
        })
    }

    static insertFolder (folderContents, alias, target, fileRef) {
        CredentialsController.getCredentials()
            .then(async credentials => {
                for (let fileInfo of folderContents) {
                    const folderPath = fileInfo.path.split`/`
                                                    .slice(0, -1)
                                                    .join`/`
                                                    .replace(fileRef, '').trim()
                                                    
                    if (folderPath.length)
                        await ImportController.mkdirRecursive(folderPath, alias)

                    const filePath = path.join(alias, folderPath, fileInfo.name)
                    ImportController.request(credentials, fileInfo.url) 
                        .then(data => {
                            if (Array.isArray(data.body)) {
                                ImportController.insertFolder(
                                    data.body, alias, target, fileRef
                                )
                            } else {
                                ImportController.insertFile(data, filePath, _ => {
                                    console.log('Added ', filePath)
                                })
                            }
                        })
                        .catch(err => {
                            console.log('ERR', err, fileInfo)
                        })
                }

                ImportController.updatePackage(alias, target)
            })
    }

    static createModuleFolderIfNotExists () {
        return new Promise ((resolve, reject) => {
            fs.exists(this.gitModules, yes => {
                if (yes)
                    return resolve()
                
                fs.mkdir(this.gitModules, err => {
                    if (err)
                        reject(err)
                    resolve()
                })
            })
        })
    }

    static request (credentials, target) {
        target = target.replace('https://api.github.com/repos/', '')
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

    static updatePackage (alias, target, remove = false) {
        const pkg = path.join(process.cwd(), 'git_package.json')
        fs.exists(pkg, yes => {
            if (yes) {
                fs.readFile(pkg, (err, data) => {
                    try {
                        const savedPkg = JSON.parse(data.toString())
                        
                        if (remove) {
                            delete savedPkg[alias]
                        } else {
                            savedPkg[alias] = target
                        }

                        fs.writeFile(pkg, JSON.stringify(savedPkg, null, 2), err => {
                            if (err)
                                throw new Error(err)
                        })
                    } catch (e) {
                        throw new Error(e)
                    }
                })
            } else {
                const newDep = {}
                newDep[alias] = target

                fs.writeFile(pkg, JSON.stringify(newDep, null, 2), err => {
                    if (err)
                        throw new Error(err)
                })
            }
        })
    }

}