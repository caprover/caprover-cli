import * as fs from 'fs-extra'
import * as path from 'path'
import { exec } from 'child_process'
const ProgressBar = require('progress')
import StdOutUtil from '../utils/StdOutUtil'
import SpinnerHelper from '../utils/SpinnerHelper'
import IBuildLogs from '../models/IBuildLogs'
import { IMachine, IDeployParams } from '../models/storage/StoredObjects'
import CliApiManager from '../api/CliApiManager'

export default class DeployHelper {
    private lastLineNumberPrinted = -10000 // we want to show all lines to begin with!

    constructor(private ssl?: boolean) {}

    async startDeploy(deployParams: IDeployParams): Promise<boolean> {
        const appName = deployParams.appName
        const branchToPush = deployParams.deploySource.branchToPush
        const tarFilePath = deployParams.deploySource.tarFilePath
        const imageName = deployParams.deploySource.imageName
        const machineToDeploy = deployParams.captainMachine

        if (!appName || !machineToDeploy) {
            StdOutUtil.printError(
                "Can't deploy: missing CapRover machine or app name.\n",
                true
            )
            return false
        }

        if (
            (branchToPush ? 1 : 0) +
                (imageName ? 1 : 0) +
                (tarFilePath ? 1 : 0) !==
            1
        ) {
            StdOutUtil.printError(
                "Can't deploy: only one of branch, tarFile or imageName can be present.\n",
                true
            )
            return false
        }

        let gitHash = ''
        let tarFileCreatedByCli = false
        const tarFileNameToDeploy = tarFilePath
            ? tarFilePath
            : 'temporary-captain-to-deploy.tar'
        const tarFileFullPath = tarFileNameToDeploy.startsWith('/')
            ? tarFileNameToDeploy
            : path.join(process.cwd(), tarFileNameToDeploy)

        if (branchToPush) {
            tarFileCreatedByCli = true
            StdOutUtil.printMessage(`Saving tar file to: "${tarFileFullPath}"`)
            gitHash = await this.gitArchiveFile(tarFileFullPath, branchToPush)
        }

        StdOutUtil.printMessage(
            `Deploying ${StdOutUtil.getColoredAppName(appName)} to ${
                machineToDeploy.name
                    ? StdOutUtil.getColoredMachineName(machineToDeploy.name)
                    : StdOutUtil.getColoredMachineUrl(machineToDeploy.baseUrl)
            }...\n`
        )
        try {
            if (imageName) {
                await CliApiManager.get(
                    machineToDeploy
                ).uploadCaptainDefinitionContent(
                    appName,
                    { schemaVersion: 2, imageName: imageName },
                    '',
                    true
                )
            } else {
                await CliApiManager.get(machineToDeploy).uploadAppData(
                    appName,
                    this.getFileStream(tarFileFullPath),
                    gitHash
                )
            }

            this.startFetchingBuildLogs(machineToDeploy, appName)
            return true
        } catch (e) {
            throw e
        } finally {
            if (tarFileCreatedByCli && fs.pathExistsSync(tarFileFullPath)) {
                fs.removeSync(tarFileFullPath)
            }
        }
    }

    private gitArchiveFile(zipFileFullPath: string, branchToPush: string) {
        return new Promise<string>(function(resolve, reject) {
            if (fs.pathExistsSync(zipFileFullPath))
                fs.removeSync(zipFileFullPath) // Removes the temporary file created

            exec(
                `git archive --format tar --output "${zipFileFullPath}" ${branchToPush}`,
                (err, stdout, stderr) => {
                    if (err) {
                        StdOutUtil.printError(`TAR file failed.\n${err}\n`)
                        if (fs.pathExistsSync(zipFileFullPath))
                            fs.removeSync(zipFileFullPath)
                        reject(new Error('TAR file failed'))
                        return
                    }

                    exec(
                        `git rev-parse ${branchToPush}`,
                        (err, stdout, stderr) => {
                            const gitHash = (stdout || '').trim()

                            if (err || !/^[a-f0-9]{40}$/.test(gitHash)) {
                                StdOutUtil.printError(
                                    `Cannot find hash of last commit on branch "${branchToPush}": ${gitHash}\n${err}\n`
                                )
                                if (fs.pathExistsSync(zipFileFullPath))
                                    fs.removeSync(zipFileFullPath)
                                reject(new Error('rev-parse failed'))
                                return
                            }

                            StdOutUtil.printMessage(
                                `Using last commit on "${branchToPush}": ${gitHash}\n`
                            )
                            resolve(gitHash)
                        }
                    )
                }
            )
        })
    }

    private getFileStream(zipFileFullPath: string) {
        const fileSize = fs.statSync(zipFileFullPath).size
        const fileStream = fs.createReadStream(zipFileFullPath)
        const barOpts = { width: 20, total: fileSize, clear: false }
        const bar = new ProgressBar(
            'Uploading [:bar] :percent  (ETA :etas)',
            barOpts
        )

        fileStream.on('data', chunk => bar.tick(chunk.length))
        fileStream.on('end', () => {
            StdOutUtil.printGreenMessage(`Upload done.\n`)
            StdOutUtil.printMessage(
                'This might take several minutes. PLEASE BE PATIENT...\n'
            )
            SpinnerHelper.start('Building your source code...\n')
            SpinnerHelper.setColor('yellow')
        })

        return fileStream
    }

    private async onLogRetrieved(
        data: IBuildLogs | undefined,
        machineToDeploy: IMachine,
        appName: string
    ) {
        if (data) {
            const lines = data.logs.lines
            const firstLineNumberOfLogs = data.logs.firstLineNumber
            let firstLinesToPrint = 0
            if (firstLineNumberOfLogs > this.lastLineNumberPrinted) {
                if (firstLineNumberOfLogs < 0) {
                    // This is the very first fetch, probably firstLineNumberOfLogs is around -50
                    firstLinesToPrint = -firstLineNumberOfLogs
                } else {
                    StdOutUtil.printMessage('[[ TRUNCATED ]]')
                }
            } else {
                firstLinesToPrint =
                    this.lastLineNumberPrinted - firstLineNumberOfLogs
            }
            this.lastLineNumberPrinted = firstLineNumberOfLogs + lines.length
            for (let i = firstLinesToPrint; i < lines.length; i++) {
                StdOutUtil.printMessage((lines[i] || '').trim())
            }
        }

        if (data && !data.isAppBuilding) {
            if (!data.isBuildFailed) {
                let appUrl = machineToDeploy.baseUrl
                    .replace('https://', 'http://')
                    .replace('//captain.', `//${appName}.`)
                if (this.ssl) appUrl = appUrl.replace('http://', 'https://')
                StdOutUtil.printGreenMessage(
                    `\nDeployed successfully ${StdOutUtil.getColoredAppName(
                        appName
                    )}`
                )
                StdOutUtil.printGreenMessage(
                    `App is available at ${StdOutUtil.getColoredMachineUrl(
                        appUrl
                    )}\n`,
                    true
                )
            } else {
                StdOutUtil.printError(
                    `\nSomething bad happened. Cannot deploy ${StdOutUtil.getColoredAppName(
                        appName
                    )} at ${StdOutUtil.getColoredMachineName(
                        machineToDeploy.name || machineToDeploy.baseUrl
                    )}.\n`,
                    true
                )
            }
        } else {
            setTimeout(
                () => this.startFetchingBuildLogs(machineToDeploy, appName),
                2000
            )
        }
    }

    private async startFetchingBuildLogs(
        machineToDeploy: IMachine,
        appName: string
    ) {
        try {
            const data = await CliApiManager.get(
                machineToDeploy
            ).fetchBuildLogs(appName)
            this.onLogRetrieved(data, machineToDeploy, appName)
        } catch (error) {
            StdOutUtil.printError(
                `\nSomething bad happened while retrieving ${StdOutUtil.getColoredAppName(
                    appName
                )} app build logs.\n${error.message || error}\n`
            )
            this.onLogRetrieved(undefined, machineToDeploy, appName)
        }
    }
}
