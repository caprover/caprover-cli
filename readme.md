# CapRover CLI

Command Line Interface for CapRover.

CapRover is a modern automated app deployment & web server manager.
  - Deploy apps in your own space
  - Secure your services over HTTPS for FREE
  - Scale in seconds
  - Focus on your apps! Not the bells and whistles just to run your apps!

Fore more information see CapRover.com

Always refer to the documentation bundled in CLI as it is the most updated one. You can view the help by `caprover --help` or `caprover deploy --help` or etc.

## Getting started

This guide assumes that you have started CapRover on a linux server and setup your DNS (see [CapRover Setup](https://caprover.com/docs/get-started.html#caprover-setup)).

You can use this CLI tool to perform initial CapRover server setup, and to deploy your apps.

Before anything, install the CLI tool using npm:
```
npm install -g caprover
```

### Usage

You can use the CLI by typing `caprover` in your console.

The CLI has several commands, if invoked without a command it display the usage summary:
```
Usage: caprover [options] [command]

CLI tool for CapRover. See CapRover.com for more details.

Options:
  -V, --version                output the version number
  -h, --help                   output usage information

Commands:
  serversetup|setup [options]  Performs necessary actions to prepare CapRover on your server.
  login [options]              Login to a CapRover machine. You can be logged in to multiple machines simultaneously.
  list|ls                      List all CapRover machines currently logged in.
  logout [options]             Logout from a CapRover machine and clear auth info.
  deploy [options]             Deploy your app to a specific CapRover machine. You'll be prompted for missing parameters.
  config-deploy [options]      Deployment via CapRover config file. See: config-deploy.md for more information. To use this command, you have to be logged in to one machine via "caprover login".
  api [options]                Call a generic API on a specific CapRover machine. Use carefully only if you really know what you are doing!
```

## Commands

Almost all commands require some data to work. Data for commands can be provided from different sources:
- Enviroment variables: using variables names specified in command help (note that variable must be exported, or you have to define it inline before the cli command, eg: `ENV_VAR=value caprover command`);
- Configuration file: JSON or YAML, specifing the file name with an option or its environment variable (usually `-c, --configFile` and `CAPROVER_CONFIG_FILE`), command options names define the keys of the configuration file;
- Command options: using command options flags directly on the command line;
- Input prompt: for those data that is not provided from other sources, but needed for the command to work, you'll be prompted to input them during command execution.

If the same data is provided from different sources, the priority order reflects the above list (the following ones overwrite the previous ones), except for input prompt that is used only if that data is not provided from others sources.

View help for a command to know more details to that command, by running:
```
caprover [command] --help
```

### Server Setup

The very first thing you need to do is to setup your CapRover server. You can either do this by visiting `HTTP://IP_ADDRESS_OF_SERVER:3000` in your browser, or the recommended way which is the command line tool.  
Simply run:
```
caprover serversetup
```

Follow the steps as instructed: enter IP address of server and the root domain to be used with this CapRover instance. If you don't know what CapRover root domain is, please visit CapRover.com for documentation. This is a very crucial step.  
After that, you'll be asked to change your CapRover server password, and to enter your email address. This should be a valid email address as it will be used in your SSL certificates.  
After HTTPS is enabled, you'll be asked to enter a name for this CapRover machine, to store auth credential locally. And... Your are done! Go to Deploy section below to read more about app deployment.

For automation purposes, you can provide necessary data before to be prompted for them, for example using a config file like:
```json
{
  "caproverIP": "123.123.123.123",
  "caproverPassword": "captain42",
  "caproverRootDomain": "root.domain.com",
  "newPassword": "rAnDoMpAsSwOrD",
  "certificateEmail": "email@gmail.com",
  "caproverName": "my-machine-123-123-123-123",
}
```
And then running:
```
caprover serversetup -c /path/to/config.json
```
*Note*: you can also use either YAML or JSON.

### Login

*If you've done the "Server Setup" process through the command line, you can skip "Login" step because your auth credential are automatically stored in the last step of setup.*

This command does login to your CapRover server and store your auth credential locally.  
It is recommended that at this point you have already set up HTTPS. Login over insecure, plain HTTP is not recommended.

To login to your CapRover server, simply run the following command and answer the questions:
```
caprover login
```

If operation finishes successfully, you will be prompted with a success message.

*Note*: you can be logged in to several CapRover servers at the same time; this is particularly useful if you have separate staging and production servers.

For automation purposes, you can provide necessary data before to be prompted for them, for example using a config file like:
```json
{
  "caproverUrl": "captain.root.domain.com",
  "caproverPassword": "captain42",
  "caproverName": "testing-1"
}
```
And then running:
```
caprover login -c /path/to/config.json 
```
*Note*: you can also use either YAML or JSON.

### Deploy

Use this command to deploy your application. Deploy via caprover CLI supports 4 deployments methods: captain-definition file, Dockerfile, tar file, and image name (see [Captain Definition File](https://caprover.com/docs/captain-definition-file.html) for more info).

Simply run the following command and answers questions:
```
caprover deploy
```

You will then see your application being uploaded, after that, your application getting built.

*Note*: based on your deployment method, the build process could take multiple minutes, please be patient!

For automation purposes, you can provide necessary data before to be prompted for them, for example directly on the command line by running:
```
caprover deploy -n machine-name -a app-name -b branchName
```
*Note*: you must be logged in to "machine-name".

This can be useful if you want to integrate to CI/CD pipelines.

See command help to know more details and deployments methods.

### List

Use this command to see a list of CapRover machines you are currently logged in to.  
Run the following command:
```
caprover list
```

### Logout

Use this command to logout from a CapRover machine and clear auth info.  
Run the following command and choose a CapRover machine:
```
caprover logout
```

### API

Use this command to call a generic API on a CapRover machine, specifying API path, method (GET or POST), and data.  
Run the following command and answer the questions:
```
caprover api
```

For automation purposes, you can provide necessary data before to be prompted for them, for example using a config file like:
```json
{
  "caproverName": "server-1",
  "path": "/user/apps/appDefinitions/unusedImages",
  "method": "GET",
  "data": {
    "mostRecentLimit": "3"
  }
}
```
And then running (using environment variable for config file value):
```
CAPROVER_CONFIG_FILE='/path/to/config.json' caprover api
```

*Note*: use carefully only if you really know what you are doing!
