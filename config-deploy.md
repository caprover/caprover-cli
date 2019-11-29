# caprover config-deploy

Command `caprover config-deploy`, to deploy via a configuration file.

```
Usage: caprover config-deploy [options]
       caprover config-deploy [-d directory] [-env environment]
       caprover config-deploy -d ./.. -env production

Deployment via CapRover config file. See: for more information
To use this command, you have to be logged in to one machine via "caprover login".

Options:
  -h, --help                   output usage information
  -d, --directory              the directory where the config file exists
  -env, --environment          the environment defined in the config file
```

## The config file

The file is named `cap-rover.config.json`.

Following options exist:

```Typescript
{
    definition: {
        schemaVersion: number,
        dockerFiles: string[]
    },
    capRoverUrl: string,
    appName: string,
    files: {
        include: string[]
    },
    environments?: {
        [key: string]: {
            definition?: {
                schemaVersion: number,
                dockerFiles: string[]
            },
            capRoverUrl?: string,
            appName?: string,
            files?: {
                include: string[]
            },
        }
    }
}
```

-   defintion: is the CapRover definition file (the content of the captain-definition file).
-   capRoverUrl: the Url of your cap rover instance (used in caprover login).
-   appName: your defined app name in cap rover for your app you want to deploy to.
-   files:
    -   include: list of files you want to include, you can use the glob pattern ([more here](https://www.npmjs.com/package/glob)).
-   environments: you can define another environment (like test or production), just overwrite the default values with the environment special ones.

### Example of a CapRover config file

```json
{
    "definition": {
        "schemaVersion": 2,
        "dockerfileLines": ["SOME COMMANDS ETC"]
    },
    "capRoverUrl": "https://some-url.com",
    "appName": "your-app-name",
    "files": {
        "include": ["./src/*", "./package.json"]
    },
    "environments": {
        "test": {
            "appName": "your-app-name-test"
        },
        "production": {
            "capRoverUrl": "https://some-production-url.com",
            "appName": "your-app-name-production",
            "files": {
                "include": ["*.some-prod-files"]
            }
        }
    }
}
```
