const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const request = require('request')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const CredentialsController = require('./credentialsController')
const FileController = require('./fileController')

module.exports = class ImportController {

    /**
     * Import a module from github
     *
     * @static
     */
    static async import () {
        const repo = await promptly.prompt('Get from repo: ')
        const branch = await promptly.prompt('Repo branch: (master) ', {
            default: 'master'
        })
        const file = await promptly.prompt('Specific file: (optional) ', {
            default: ''
        })
        
        const target = `${repo}/contents/${encodeURI(file)}?ref=${branch}`

        ImportController.getData(target)
            .then(async data => {
                await ImportController.handleResponse(repo, data, target, file)
            })
            .catch(err => {
                console.log(err)  
            })
    }

    /**
     * Gets contents of repo/folder
     *
     * @static
     * @param {string} target
     * @returns {Promise<Object>}
     */
    static getData (target) {
        return new Promise ((resolve, reject) => {
            CredentialsController.getCredentials()
                .then(async credentials => {
                    
                    ImportController.request(credentials, target)
                        .then(async data => {
                            resolve(data)
                        })
                        .catch(err => {
                            reject(err)
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

                            resolve(data)
                        })
                        .catch(err => {
                            reject(err)
                        })
                })
        })
    }

    /**
     * Removes contents in folder
     *
     * @static
     * @param {string} folder
     * @param {boolean} [clear=false]
     * @returns {Promise}
     */
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

    /**
     * Inserts files and folders for the download
     *
     * @static
     * @param {string} repo
     * @param {Object} data
     * @param {string} target
     * @param {string} [fileRef='']
     * @param {string} [alias='']
     */
    static async handleResponse (repo, data, target, fileRef = '', alias = '') {
        var defaultAlias = repo.split('/')[1]

        if (!alias) {
            const msgToUser = `Alias for module: (${defaultAlias}) `
            alias = await promptly.prompt(msgToUser, {
                default: defaultAlias
            })
        }
        
        await ImportController.createModuleFolderIfNotExists()
        
        const targetDir = path.join(FileController.gitModules, alias || defaultAlias)
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
                    ImportController.updatePackage(alias, target, fileRef)
                })
            }
        })
    }

    /**
     * Inserts file to location
     *
     * @static
     * @param {Object} data
     * @param {string} targetFile
     * @param {Function} [callback=null]
     */
    static insertFile (data, targetFile, callback = null) {
        const content = Buffer.from(data.body.content || '', 'base64').toString()

        targetFile = path.join(FileController.gitModules, targetFile)
        fs.writeFile(targetFile, content, err => {
            if (err)
                console.error(targetFile, err)
            else {
                if (callback)
                    callback()
            }
        })
    }

    /**
     * Creates directories for the returnes files
     *
     * @static
     * @param {string} dir
     * @param {string} alias
     * @returns {Promise}
     */
    static mkdirRecursive (dir, alias) {
        return new Promise (async (resolve, reject) => {
            const gmFolder = path.join(FileController.gitModules, alias)
            mkdirp(path.join(gmFolder, dir), err => {
                if (err)
                    throw new Error(err)
                resolve()
            })
        })
    }

    /**
     * Insert files into folders
     *
     * @static
     * @param {Array<Object>} folderContents
     * @param {string} alias
     * @param {string} target
     * @param {string} fileRef
     */
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

    /**
     * Creates the root folder
     *
     * @static
     * @returns {Promise}
     */
    static createModuleFolderIfNotExists () {
        return new Promise ((resolve, reject) => {
            fs.exists(FileController.gitModules, yes => {
                if (yes)
                    return resolve()
                
                fs.mkdir(FileController.gitModules, err => {
                    if (err)
                        reject(err)
                    resolve()
                })
            })
        })
    }

    /**
     * Sends request to github
     *
     * @static
     * @param {string} credentials
     * @param {string} target
     * @returns {Promise<Object>}
     */
    static request (credentials, target) {
        const endpoint = 'https://api.github.com/repos/'

        target = target.replace(endpoint, '')
        return new Promise ((resolve, reject) => {
            request({
                url: endpoint + target,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'basic ' + credentials,
                    'user-agent': 'getgitmodule'
                },
                json: true
            }, (err, data) => {
                if (err)
                    reject(err)
                resolve(data)
            })
        })
    }

    /**
     * Updates the git_package.json file
     *
     * @static
     * @param {string} alias
     * @param {string} target
     * @param {string} fileRef
     * @param {boolean} [remove=false]
     */
    static updatePackage (alias, target, fileRef, remove = false) {
        const pkg = FileController.gitPackage
        FileController.getGitPackageJSON()
            .then(savedPkg => {
                if (remove) {
                    delete savedPkg[alias]
                } else {
                    savedPkg[alias] = { target, fileRef }
                }

                fs.writeFile(pkg, JSON.stringify(savedPkg, null, 2), err => {
                    if (err)
                        throw new Error(err)
                })
            })
            .catch(_ => {
                const newDep = {}
                newDep[alias] = { target, fileRef }

                fs.writeFile(pkg, JSON.stringify(newDep, null, 2), err => {
                    if (err)
                        throw new Error(err)
                })
            })
    }

    /**
     * Imports git files from git_package.json
     *
     * @static
     */
    static install () {
        FileController.getGitPackageJSON()
            .then(savedPkg => {
                for (let [key, file] of Object.entries(savedPkg)) {
                    ImportController.getData(file.target)
                        .then(async data => {
                            const repo = file.target.split`/`.slice(0,2).join`/`
                            await ImportController.handleResponse(
                                repo, data, file.target, file.fileRef, key
                            )
                        })
                        .catch(err => {
                            console.log(err)
                        })
                }
            })
            .catch(_ => {
                console.log('File not found:', FileController.gitPackage)
            })
    }

}