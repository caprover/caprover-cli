import StdOutUtil from './StdOutUtil';
import { IMachine } from '../models/storage/StoredObjects';
import CliApiManager from '../api/CliApiManager';
import requestLogin from '../commands/requestLogin';

const fs = require('fs-extra');

export function validateIsGitRepository() {
	const gitFolderExists = fs.pathExistsSync('./.git');

	if (!gitFolderExists) {
		StdOutUtil.printError(
			'\n**** ERROR: You are not in a git root directory. This command will only deploys the current directory ****\n',
			true
		);
	}

	return !!gitFolderExists;
}

export function validateDefinitionFile() {

	const captainDefinitionExists = fs.pathExistsSync('./captain-definition')

	if (!captainDefinitionExists) {
		if (fs.pathExistsSync('./Dockerfile')) {
			StdOutUtil.printMessage(
				'**** Warning **** No captain-definition was found in main directory. Falling back to Dockerfile.'
			)
		} else {
			StdOutUtil.printMessage(
				'**** Warning **** No captain-definition was found in main directory. Unless you have specified a special path for your captain-definition, this build will fail'
			)
		}
		return true
	}

	const contents = fs.readFileSync('./captain-definition', 'utf8')
	let contentsJson = null

	try {
		contentsJson = JSON.parse(contents)
	} catch (e) {
		StdOutUtil.printError(
			`**** ERROR: captain-definition file is not a valid JSON! ****\n Error:${e}`,
			true
		)
	}

	if (contentsJson) {
		if (!contentsJson.schemaVersion) {
			StdOutUtil.printError(
				'**** ERROR: captain-definition needs schemaVersion. Please see docs! ****',
				true
			)
		} else {
			return true
		}
	}

	return false
}

export function isIpAddress(ipaddress: string) {
	if (
		/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
			ipaddress
		)
	) {
		return true;
	}

	return false;
}
export async function ensureAuthentication(machine: IMachine) {
	let isAuthenticated = false;
	let allApps = undefined;
	try {
		allApps = await CliApiManager.get(machine).getAllApps();
	} catch (e) {
		// ignore
	}

	if (!allApps) {
		const loggedInStatus = await requestLogin(machine);
		allApps = await CliApiManager.get(machine).getAllApps();
	}

	if (allApps && allApps.appDefinitions) {
		allApps = allApps.appDefinitions
	}

	return allApps
}
