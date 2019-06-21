const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const FileController = require('./fileController')

module.exports = class RemoveController {

    static async remove (aliases) {
        if (!aliases.length) {
            aliases = [await promptly.prompt('Module to remove: ')]
        }

        const pkg = FileController.gitPackage
        FileController.getGitPackageJSON()
            .then(savedPkg => {
                for (let alias of aliases) {
                    const aliasPath = path.join(FileController.gitModules, alias)
                    fs.lstat(aliasPath, (err, stats) => {
                        if (err)
                            throw new Error(err)
        
                        if (stats.isDirectory()) {
                            delete savedPkg[alias]
                            rimraf(aliasPath, err => {
                                if (err) 
                                    throw new Error(err)

                                const content = JSON.stringify(savedPkg, null, 2)
                                fs.writeFile(pkg, content, err => {
                                    if (err)
                                        throw new Error(err)

                                    console.log('Successfully removed ', alias)
                                })
                            })
                        } else {
                            console.log(aliasPath, 'is not a directory and can not be removed!')
                        }
                    })
                }
            })
    }

}