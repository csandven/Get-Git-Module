const path = require('path')
const fs = require('fs')

module.exports = class FileController {
    
    /**
     * Path to git modules folder
     *
     * @readonly
     * @static
     */
    static get gitModules () {
        try {
            const modulesPath = path.join(__dirname, '..', '.gitModulesFolder')
            const gitModules = fs.readFileSync(modulesPath).toString()
            return path.join(process.cwd(), ...gitModules.split('/'))
        } catch (e) {
            return path.join(process.cwd(), 'git_modules')
        }
    }

    /**
     * Path to git_package.json
     *
     * @readonly
     * @static
     */
    static get gitPackage () {
        return path.join(process.cwd(), 'git_package.json')
    }

    /**
     * Returns contents of git_package.json
     *
     * @static
     * @returns {Promise<Object>}
     */
    static getGitPackageJSON () {
        return new Promise ((resolve, reject) => {
            fs.exists(FileController.gitPackage, yes => {
                if (yes) {
                    fs.readFile(FileController.gitPackage, (err, data) => {
                        try {
                            const savedPkg = JSON.parse(data.toString())
                            resolve(savedPkg)
                        } catch (e) {
                            resolve({})
                        }
                    })
                } else {
                    reject()
                }
            })
        })
    }

}