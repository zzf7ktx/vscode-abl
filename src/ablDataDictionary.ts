import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { OpenEdgeProjectConfig } from './shared/openEdgeConfigFile';
import { tmpdir } from 'node:os';
import { outputChannel } from './ablStatus';
import * as vscode from 'vscode';

export function openDataDictionary(project: OpenEdgeProjectConfig) {
  const env = process.env;
  const currProfile = project.profiles.get(project.activeProfile);
  if (!currProfile) {
    vscode.window.showErrorMessage('No active profile found.');
    return;
  }
  env.DLC = currProfile.dlc;
  outputChannel.info(`openDataDictionary - profile: ${project.activeProfile}, DLC: ${currProfile.dlc}`);
  const prmFileName = path.join(
    tmpdir(),
    'datadict-' + crypto.randomBytes(16).toString('hex') + '.json',
  );
  const cfgFile = {
    verbose: false,
    databases: currProfile.dbConnections,
    propath: [],
    parameters: [],
    returnValue: '',
    super: false,
    output: [],
    procedures: currProfile?.procedures ?? [],
    procedure: '_dict.p',
  };
  fs.writeFileSync(prmFileName, JSON.stringify(cfgFile));
  outputChannel.info(`openDataDictionary - param file: ${prmFileName}, procedures: ${cfgFile.procedures.length}`);
  const prms = [
    '-clientlog',
    path.join(project.rootDir, '.builder\\dictionary.log'),
    '-p',
    path.join(__dirname, '../resources/abl-src/dynrun.p'),
    '-param',
    prmFileName,
    '-basekey',
    'INI',
    '-ininame',
    path.join(__dirname, '../resources/abl-src/empty.ini'),
  ];
  const args = currProfile.extraParameters.split(' ').concat(prms);
  outputChannel.info(`openDataDictionary - command: ${currProfile.getExecutable(true)} ${args.join(' ')}`);

  cp.spawn(
    currProfile.getExecutable(true),
    args,
    { env: env, cwd: project.rootDir, detached: true },
  );
}
