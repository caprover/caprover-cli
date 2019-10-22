import { ReadStream } from "tty";
import StdOutUtil from "./StdOutUtil";

const tar = require("tar");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const CONFIG_FILE_NAME = "cap-rover.config.json";

function existCapRoverConfigFile(tarArchiveWorkingDir: string): boolean {

    return fs.existsSync(capRoverConfigFile);
}

type CapRoverConfig = {
    definition: { schemaVersion: number, dockerFiles: string[] },
    files: { include: string[] }
}

export function extractConfig(tarArchiveWorkingDir: string): CapRoverConfig {

    const capRoverConfigFile = path.join(tarArchiveWorkingDir, CONFIG_FILE_NAME);

    if (!fs.existsSync(capRoverConfigFile)) {
        StdOutUtil.printError(
            `No CapRover config file found!\n
            Make sure the config file is there: "${capRoverConfigFile}"\n\n
            See more here: ....`,
            true
        )
    }

    const capRoverConfigFileContent = fs.readFileSync(capRoverConfigFile, "utf8");
    let capRoverConfig: CapRoverConfig;
    try {
        capRoverConfig = JSON.parse(capRoverConfigFileContent);

    } catch (error) {
        StdOutUtil.printError(
            `captain-definition file is not a valid JSON!\n${error.message ||
            error}\n`,
            true
        )
    }
  
    if (!fs.pathExistsSync('./captain-definition')) {
        if (fs.pathExistsSync('./Dockerfile')) {
            StdOutUtil.printWarning('**** Warning ****')
            StdOutUtil.printMessage(
                'No captain-definition was found in main directory: falling back to Dockerfile.\n'
            )
        } else {
            StdOutUtil.printWarning('**** Warning ****')
            StdOutUtil.printMessage(
                'No captain-definition was found in main directory: unless you have specified a special path for your captain-definition, this build will fail!\n'
            )
        }
    } else {
        let content = null
        try {
            content = JSON.parse(
                fs.readFileSync('./captain-definition', 'utf8')
            )
        } catch (e) {
            StdOutUtil.printError(
                `captain-definition file is not a valid JSON!\n${e.message ||
                e}\n`,
                true
            )
        }
        if (!content || !content.schemaVersion) {
            StdOutUtil.printError(
                'captain-definition needs "schemaVersion": please see docs!\n',
                true
            )
        }
    }
}


export async function createTarArchivePath(tarArchiveWorkingDir: string): Promise<string> {

    const tarPath = path.join(tarArchiveWorkingDir, 'tmp-cap-rover-deploy.tar');
    fs.unlink(tarPath, (err: Error) => {
        if (!err) return;
        console.error(err);
    });
    const capRoverConfigFile = path.join(tarArchiveWorkingDir, CONFIG_FILE_NAME);
    const capRoverDefinitionFilePath = path.join(tarArchiveWorkingDir, "captain-definition");
    let capRoverConfig;

    try {
        const capRoverConfigFileContent = fs.readFileSync(capRoverConfigFile, "utf8");
        capRoverConfig = JSON.parse(capRoverConfigFileContent);
    } catch (error) {
        console.error(
            `Could not read config file! Make sure a "${capRoverConfigFile}" file exists at the package.json level! Message: `,
            error
        );
        throw error;
    }

    try {
        const files = await findFiles(capRoverConfig.files.include);

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

        console.log(tarPath);
        return tarPath;
    } catch (err) {
        console.error(`Could not create tar file! Message: `, err);
        if (fs.existsSync(capRoverDefinitionFilePath)) {
            fs.unlink(capRoverDefinitionFilePath, (err: Error) => {
                if (err) throw err;
            });
        }
        throw err;
    }
}


async function findFiles(filesList: string[]): Promise<string[]> {
    const resolvedFiles: string[][] = await Promise.all(
        filesList.map(
            fileName =>
                new Promise((resolve, reject) =>
                    glob(fileName, null, function (err: Error, files: string[]) {
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
