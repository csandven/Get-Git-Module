
# Get Git Module

## Installation

```bash
npm install -g getgitmodule
```

## Usage

Note: This script should always be called from the root directory of your project.


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