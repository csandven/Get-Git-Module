
# Get Git Module

Get single scripts or folder of scripts from github to reuse in your project.

## Installation

```bash
npm install -g getgitmodule
```

## Usage

Note: This script should always be called from the root directory of your project.

### Setup target folder (Optional)

The default target folder for the modules is: ./path/to/your/project/git_modules.
This can be changed to what ever you like.

```bash
getgitmodule import setPath ./yourModuleFolder
```

### Get a file or folder from a public repository
```bash
$ getgitmodule import
Get from repo: babel/babel
Repo branch: (master) 
Specific file: (optional) scripts/utils/writeFileAndMkDir.js
Alias for module: (babel) writeFile
Module was added!
```

File can now be used like:

```javascript
const writeFile = require('./git_modules/writeFile')
writeFile('/myFile', 'myFileContent')
```


### Get a file or folder from a private repository

```bash
$ getgitmodule credentials set
Github Username: myGithubUsername
Github Password: 
New credentials stored!

$ getgitmodule import
Get from repo: myCompany/myRepo
Repo branch: (master) 
Specific file: (optional) myFolder/myFile.js
Alias for module: (babel) myModule
```

File can now be used like:

```javascript
const myModule = require('./git_modules/myModule')
```

### With arguments

```bash
getgitmodule import --repo myCompany/myRepo --branch master --file myFolder/myFile.js
```


### Removing

Remove one module
```bash
$ getgitmodule remove myModule
Successfully removed myModule
```

Remove many modules
```bash
$ getgitmodule remove myModule mySecondModule myThirdModule
Successfully removed myModule
Successfully removed mySecondModule
Successfully removed myThirdModule
```

Remove credentials
```bash
$ getgitmodule credentials remove
Credentials was removed!
```

### Installing | Updating

To update or install modules from git_modules.json:
```bash
getgitmodule install
```