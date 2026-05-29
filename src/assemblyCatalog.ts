import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import * as path from 'node:path';
import { OpenEdgeProjectConfig } from './shared/openEdgeConfigFile';
import { sanitizeProcedures, splitExtraParameters } from './shared/jsonConfigUtils';
import * as crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import { outputChannel } from './ablStatus';
import * as vscode from 'vscode';

export function executeGenCatalog(project: OpenEdgeProjectConfig) {
  const currProfile = project.profiles.get(project.activeProfile);
  if (!currProfile) {
    vscode.window.showErrorMessage('No active profile found.');
    return;
  }

  const env = process.env;
  env.DLC = currProfile.dlc;

  outputChannel.info(`executeGenCatalog - profile: ${project.activeProfile}, DLC: ${currProfile.dlc}`);
  const prmFileName = path.join(
    tmpdir(),
    'catalog-' + crypto.randomBytes(16).toString('hex') + '.json',
  );
  const cfgFile = {
    verbose: false,
    databases: [] as Array<{ name: string; connect: string; schemaFile: string; aliases: string[] }>,
    propath: [path.join(__dirname, '../resources/abl-src/OpenEdge')],
    parameters: [
      { name: 'destFile', value: '.builder/catalog.json' },
      {
        name: 'pctTools',
        value: path.join(__dirname, '../resources/PCTTools.dll'),
      },
    ],
    returnValue: '',
    super: false,
    output: [],
    procedures: sanitizeProcedures(currProfile.procedures),
    procedure: 'NetAssemblyCatalog.p',
  };
  fs.writeFileSync(prmFileName, JSON.stringify(cfgFile, null, 2));
  outputChannel.info(`executeGenCatalog - param file: ${prmFileName}, procedures: ${cfgFile.procedures.length}`);
  const extraArgs = splitExtraParameters(currProfile.extraParameters);
  const prms = [
    '-clientlog',
    path.join(project.rootDir, '.builder/assemblyCatalog.log'),
    '-b',
    '-p',
    path.join(__dirname, '../resources/abl-src/dynrun.p'),
    '-param',
    prmFileName,
  ];
  if (project.gui)
    prms.push(
      '-basekey',
      'INI',
      '-ininame',
      path.join(__dirname, '../resources/abl-src/empty.ini'),
    );

  outputChannel.info(
    `Assembly Catalog Generation - Command line: ${currProfile.getExecutable()} ${extraArgs.concat(prms).join(' ')}`,
  );
  const ps = cp.spawn(
    currProfile.getExecutable(true),
    extraArgs.concat(prms),
    { env: env, cwd: project.rootDir, detached: true },
  );
  ps.on('close', (code) => {
    outputChannel.info(
      `Assembly Catalog Generation - Process exited with code ${code}`,
    );
    if (code == 0) {
      vscode.window.showInformationMessage(
        'Assembly catalog generation completed successfully',
      );
    } else {
      vscode.window.showErrorMessage(
        'Assembly catalog generation failed, check log output',
      );
    }
  });
}
