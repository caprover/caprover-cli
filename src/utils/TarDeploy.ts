import StdOutUtil from "./StdOutUtil";
import { getErrorForDomain, getErrorForAppName } from "./ValidationsHandler";
import CliApiManager from "../api/CliApiManager";
import { IMachine } from "../models/storage/StoredObjects";
import StorageHelper from "./StorageHelper";
import { IAppDef } from '../models/AppDef'

const tar = require("tar");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const CONFIG_FILE_NAME = "cap-rover.config.json";
const TMP_TAR_FILE_NAME = 'tmp-cap-rover-deploy.tar';

export interface CapRoverConfig extends CapRoverEnvironmentConfig {
    environments?: { [key: string]: CapRoverEnvironmentConfig };
}

export interface CapRoverEnvironmentConfig {
    definition: { schemaVersion: number, dockerFiles: string[] },
    capRoverUrl: string,
    appName: string,
    files: { include: string[] }
}

export interface DeployTarget {
    machine: IMachine,
    app: IAppDef
}

export function buildEnvironmentConfig(environment: CapRoverEnvironmentConfig | string, config: CapRoverConfig): CapRoverEnvironmentConfig {
    const returnValue: any = {};

    let env: any = environment;
    if (typeof environment == 'string') {
        const doesEnvExist = Object.keys(config.environments as {}).some(key => key == environment)

        if (!doesEnvExist) {
            StdOutUtil.printError(
                `The environment "${environment}" does not exist in the config file!\n`,
                true
            );
        } else {
            env = (config.environments as any)[environment];
        }
    }
    const conf: any = config;

    Object.keys(config).forEach(key => {
        if (key != 'environments') {
            returnValue[key] = !!env[key] ? env[key] : conf[key];
        }
    });

    return returnValue;
}

export async function validateConfigFile(env: CapRoverEnvironmentConfig): Promise<DeployTarget | false> {

    const urlError = getErrorForDomain(env.capRoverUrl, true);

    if (typeof urlError == 'string') {
        StdOutUtil.printError(
            `The capRoverUrl "${env.capRoverUrl}" is not valid!\n${urlError}`,
            true
        );
        return false;
    }

    const machine = StorageHelper.get().getMachines().find(machine => machine.baseUrl === env.capRoverUrl);

    if (!machine) {
        StdOutUtil.printError(
            `Please login first into ${StdOutUtil.getColoredMachineUrl(
                env.capRoverUrl
            )}.\nUse "${StdOutUtil.getColoredWhite(
                'caprover login'
            )}".\n`,
            true
        );
        return false;
    }

    let apps: IAppDef[] = [];
    try {
        const appData = await CliApiManager.get(machine).getAllApps();
        apps = appData.appDefinitions;
    } catch (e) {
        StdOutUtil.printError(
            `Something bad happened during deployment to ${StdOutUtil.getColoredMachineUrl(
                machine.baseUrl
            )}.\n${e.message || e}`,
            true
        );
        return false;
    }

    if (apps.length == 0) {
        StdOutUtil.printError(
            `Please login first into ${StdOutUtil.getColoredMachineUrl(
                env.capRoverUrl
            )}. Use '${StdOutUtil.getColoredMachineUrl(
                'caprover login'
            )}'.\n`,
            true
        );
        return false;
    }

    const appNameError = getErrorForAppName(apps, env.appName);
    const app = apps.find(app => app.appName === env.appName) as IAppDef;
    if (typeof appNameError == 'string') {
        StdOutUtil.printError(
            `AppName property in config file is wrong: ${appNameError}\n`,
            true
        );
        return false;
    }

    return { machine, app };
}

export function checkForConfigFile(tarArchiveWorkingDir: string): CapRoverConfig | string {

    const capRoverConfigFile = path.join(tarArchiveWorkingDir, CONFIG_FILE_NAME);

    if (!fs.existsSync(capRoverConfigFile)) {
        return `No CapRover config file found!
        Make sure the config file is there: "${capRoverConfigFile}"
        See more here: ....\n`;
    }

    const capRoverConfigFileContent = fs.readFileSync(capRoverConfigFile, "utf8");
    let capRoverConfig: CapRoverConfig;
    try {
        capRoverConfig = JSON.parse(capRoverConfigFileContent);

    } catch (error) {
        return `CapRover config file is not a valid JSON!\n${error.message ||
            error}\n`;
    }

    return capRoverConfig;
}

export async function createTarArchivePath(tarArchiveWorkingDir: string): Promise<string> {

    const tarPath = path.join(tarArchiveWorkingDir, TMP_TAR_FILE_NAME);
    const capRoverConfigFile = path.join(tarArchiveWorkingDir, CONFIG_FILE_NAME);
    const capRoverDefinitionFilePath = path.join(tarArchiveWorkingDir, "captain-definition");

    if (fs.existsSync(tarPath)) {
        fs.unlinkSync(tarPath);
    }
    if (fs.existsSync(capRoverDefinitionFilePath)) {
        fs.unlinkSync(capRoverDefinitionFilePath);
    }
    let capRoverConfig;

    try {
        const capRoverConfigFileContent = fs.readFileSync(capRoverConfigFile, "utf8");
        capRoverConfig = JSON.parse(capRoverConfigFileContent);
    } catch (error) {
        throw `Could not read config file! Make sure a "${capRoverConfigFile}" file exists at the package.json level! Message: ${error}`;
    }

    try {
        const files = await findFiles(tarArchiveWorkingDir, capRoverConfig.files.include);

        fs.writeFileSync(
            capRoverDefinitionFilePath,
            JSON.stringify(capRoverConfig.definition)
        );
        files.push("captain-definition");
        
        await tar.create(
            {
                gzip: false,
                cwd: tarArchiveWorkingDir,
                file: tarPath
            },
            files
        );

        if (fs.existsSync(capRoverDefinitionFilePath)) {
            fs.unlink(capRoverDefinitionFilePath, (err: Error) => {
                if (err) throw err;
            });
        }

        return tarPath;
    } catch (err) {
        if (fs.existsSync(capRoverDefinitionFilePath)) {
            fs.unlink(capRoverDefinitionFilePath, (err: Error) => {
                if (err) throw err;
            });
        }
        throw `Could not create tar file! Message: ${err}`;
    }
}


async function findFiles(path: string, filesList: string[]): Promise<string[]> {
    const resolvedFiles: string[][] = await Promise.all(
        filesList.map(
            fileName =>
                new Promise((resolve, reject) =>
                    glob(fileName, { cwd: path, root: path }, function (err: Error, files: string[]) {
                        if (err) reject(err);
                        resolve(files);
                    })
                ),
            []
        )
    );

    return resolvedFiles.reduce(
        (accumulator, files) => accumulator.concat(files),
        []
    );
}
