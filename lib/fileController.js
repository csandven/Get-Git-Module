const path = require('path')
const fs = require('fs')

module.exports = class FileController {
    
    static get gitModules () {
        return path.join(process.cwd(), 'git_modules')
    }

    static get gitPackage () {
        return path.join(process.cwd(), 'git_package.json')
    }

    static getGitPackageJSON () {
        return new Promise ((resolve, reject) => {
            fs.exists(FileController.gitPackage, yes => {
                if (yes) {
                    fs.readFile(FileController.gitPackage, (err, data) => {
                        try {
                            const savedPkg = JSON.parse(data.toString())
                            resolve(savedPkg)
                        } catch (e) {
                            throw new Error(e)
                        }
                    })
                } else {
                    reject()
                }
            })
        })
    }

}