#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2))

const credentialsController = require('../lib/credentialsController')
const importController = require('../lib/importController')
const removeController = require('../lib/removeController')

if (!argv._[0]) {
    console.log('No arguments found')
    console.log('Available commands are:')

    console.log(`
getgitmodule
    credentials 
        set                 Set credentials for private repos
        remove              Removes the credentials
    
    import                  import module

    install                 install modules from git_package.json

    remove module1 module2  removes modules
`)

    process.exit()
}

var func
switch (argv._[0]) {
    case 'credentials':
        func = credentialsController[argv._[1]]
        if (typeof func === 'function') {
            func(argv._.slice(1))
        } else {
            console.log(`${argv._[1]} is not a method in credentials!`)
        }
        break
    
    case 'import':
        func = importController[argv._[1] || 'import']
        if (typeof func === 'function') {
            func(argv)
        } else {
            console.log(`${argv._[1]} is not a method in import!`)
        }
        break

    case 'remove':
        removeController.remove(argv._.slice(1))
        break

    case 'install':
        importController.install()
        break
}