const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const request = require('request')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const CredentialsController = require('./credentialsController')
const FileController = require('./fileController')

const PrivateMethods = {

    /**
     * Gets contents of repo/folder
     *
     * @param {string} target
     * @returns {Promise<Object>}
     */
    getData (target) {
        return new Promise ((resolve, reject) => {
            CredentialsController.getCredentials()
                .then(async credentials => {
                    
                    PrivateMethods.request(credentials, target)
                        .then(async data => {
                            resolve(data)
                        })
                        .catch(err => {
                            reject(err)
                        })
                })
                .catch(err => {
                    console.log('No credentials found')
                    PrivateMethods.request('', target)
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
    },

    /**
     * Removes contents in folder
     *
     * @param {string} folder
     * @param {boolean} [clear=false]
     * @returns {Promise}
     */
    clearFolder (folder, clear = false) {
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
    },

    /**
     * Inserts files and folders for the download
     *
     * @param {string} repo
     * @param {Object} data
     * @param {string} target
     * @param {string} [fileRef='']
     * @param {string} [alias='']
     */
    async handleResponse (repo, data, target, fileRef = '', alias = '', fromInstall = false) {
        var defaultAlias = repo.split('/')[1]

        if (!alias) {
            const msgToUser = `Alias for module: (${defaultAlias}) `
            alias = await promptly.prompt(msgToUser, {
                default: defaultAlias
            })
        }
        
        await PrivateMethods.createModuleFolderIfNotExists()
        
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
                    await PrivateMethods.clearFolder(targetDir)
                }
            }

            if (Array.isArray(data.body)) {
                PrivateMethods.insertFolder(data.body, alias, target, fileRef)
            } else {
                const index = path.join(alias, 'index.js')
                PrivateMethods.insertFile(data, index, _ => {
                    console.log('Module was added!')
                    if (!fromInstall)
                        PrivateMethods.updatePackage(alias, data.body.git_url, fileRef)
                })
            }
        })
    },

    /**
     * Inserts file to location
     *
     * @param {Object} data
     * @param {string} targetFile
     * @param {Function} [callback=null]
     */
    insertFile (data, targetFile, callback = null) {
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
    },

    /**
     * Creates directories for the returnes files
     *
     * @param {string} dir
     * @param {string} alias
     * @returns {Promise}
     */
    mkdirRecursive (dir, alias) {
        return new Promise (async (resolve, reject) => {
            const gmFolder = path.join(FileController.gitModules, alias)
            mkdirp(path.join(gmFolder, dir), err => {
                if (err)
                    throw new Error(err)
                resolve()
            })
        })
    },

    /**
     * Insert files into folders
     *
     * @param {Array<Object>} folderContents
     * @param {string} alias
     * @param {string} target
     * @param {string} fileRef
     */
    insertFolder (folderContents, alias, target, fileRef) {
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
                    PrivateMethods.request(credentials, fileInfo.url) 
                        .then(data => {
                            if (Array.isArray(data.body)) {
                                PrivateMethods.insertFolder(
                                    data.body, alias, target, fileRef
                                )
                            } else {
                                PrivateMethods.insertFile(data, filePath, _ => {
                                    console.log('Added ', filePath)
                                })
                            }
                        })
                        .catch(err => {
                            console.log('ERR', err, fileInfo)
                        })
                }

                PrivateMethods.updatePackage(alias, target)
            })
    },

    /**
     * Creates the root folder
     *
     * @returns {Promise}
     */
    createModuleFolderIfNotExists () {
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
    },

    /**
     * Updates the git_package.json file
     *
     * @param {string} alias
     * @param {string} target
     * @param {string} fileRef
     * @param {boolean} [remove=false]
     */
    updatePackage (alias, target, fileRef, remove = false) {
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
    },

    /**
     * Sends request to github
     *
     * @param {string} credentials
     * @param {string} target
     * @returns {Promise<Object>}
     */
    request (credentials, target) {
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

}

module.exports = class ImportController {

    /**
     * Import a module from github
     *
     * @static
     */
    static async import (argv) {
        const repo = argv.repo || await promptly.prompt('Get from repo: ')
        const branch = argv.branch || await promptly.prompt('Repo branch: (master) ', {
            default: 'master'
        })
        const file = argv.file || await promptly.prompt('Specific file: (optional) ', {
            default: ''
        })
        
        const target = `${repo}/contents/${encodeURI(file)}?ref=${branch}`

        PrivateMethods.getData(target)
            .then(async data => {
                await PrivateMethods.handleResponse(repo, data, target, file)
            })
            .catch(err => {
                console.log(err)  
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
                    PrivateMethods.getData(file.target)
                        .then(async data => {
                            const repo = file.target.split`/`.slice(0,2).join`/`
                            await PrivateMethods.handleResponse(
                                repo, data, file.target, file.fileRef, key, true
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