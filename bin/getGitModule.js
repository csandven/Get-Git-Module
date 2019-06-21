#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2))

const credentialsController = require('../lib/credentialsController.js')
const importController = require('../lib/importController.js')

if (!argv._[0]) {
    console.log('No arguments found')
    // @TODO list out all available arguments

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
            func(argv._.slice(1))
        } else {
            console.log(`${argv._[1]} is not a method in import!`)
        }
        break
}