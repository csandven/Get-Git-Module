const promptly = require('promptly')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const importController = require('./importController')

module.exports = class RemoveController {

    static async remove (aliases) {
        if (!aliases.length) {
            aliases = [await promptly.prompt('Module to remove: ')]
        }

        const pkg = path.join(process.cwd(), 'git_package.json')
        importController.getGitPackageJSON()
            .then(savedPkg => {
                for (let alias of aliases) {
                    const aliasPath = path.join(importController.gitModules, alias)
                    fs.lstat(aliasPath, (err, stats) => {
                        if (err)
                            throw new Error(err)
        
                        if (stats.isDirectory()) {
                            delete savedPkg[alias]
                            rimraf(aliasPath, err => {
                                if (err) 
                                    throw new Error(err)

                                fs.writeFile(pkg, JSON.stringify(savedPkg, null, 2), err => {
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