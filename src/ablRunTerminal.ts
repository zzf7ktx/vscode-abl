import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { batchOutputChannel, outputChannel } from './ablStatus';
import { create } from './OutputChannelProcess';
import { OpenEdgeProjectConfig } from './shared/openEdgeConfigFile';

const builderExists: { [rootDir: string]: boolean } = {};

function checkBuilderDirectoryExists(rootDir: string) {
  if (!builderExists[rootDir]) {
    const builderDir = path.join(rootDir, '.builder');
    if (!fs.existsSync(builderDir)) {
      //only check once.  restart the language server to check again
      fs.mkdirSync(builderDir);
    }
    builderExists[rootDir] = true;
  }
}

export function runTTY(filename: string, project: OpenEdgeProjectConfig) {
  checkBuilderDirectoryExists(project.rootDir);
  const currProfile = project.profiles.get(project.activeProfile);
  if (!currProfile) {
    vscode.window.showErrorMessage('No active profile found.');
    return;
  }
  outputChannel.info(`runTTY - file: ${filename}, profile: ${project.activeProfile}, DLC: ${currProfile.dlc}`);
  const terminal = vscode.window.createTerminal({
    name: 'TTY execution',
    env: { DLC: currProfile.dlc },
  });
  const prmFileName = path.join(
    tmpdir(),
    'runtty-' + crypto.randomBytes(16).toString('hex') + '.json',
  );
  const cfgFile = {
    verbose: false,
    databases: currProfile.dbConnections,
    propath: currProfile.propath,
    parameters: [],
    returnValue: '',
    super: true,
    output: [],
    procedures: currProfile.procedures ?? [],
    procedure: filename,
  };
  fs.writeFileSync(prmFileName, JSON.stringify(cfgFile));
  outputChannel.info(`runTTY - param file: ${prmFileName}, procedures: ${cfgFile.procedures.length}`);

  // prettier-ignore
  const cmd =
        currProfile.getTTYExecutable() +
        " " +
        currProfile.extraParameters
            .split(" ")
            .concat([
                "-clientlog", path.join(project.rootDir, ".builder", "runtty.log"),
                "-p", path.join(__dirname, "../resources/abl-src/dynrun.p"),
                "-param", prmFileName,
                "-T", path.join(project.rootDir, ".builder", "tmp")
            ])
            .join(" ");
  outputChannel.info(`runTTY - command: ${cmd}`);
  terminal.sendText(cmd.replaceAll('\\', '/'), true);
  terminal.show();
}

export function runBatch(filename: string, project: OpenEdgeProjectConfig) {
  checkBuilderDirectoryExists(project.rootDir);
  const currProfile = project.profiles.get(project.activeProfile);
  if (!currProfile) {
    vscode.window.showErrorMessage('No active profile found.');
    return;
  }
  outputChannel.info(`runBatch - file: ${filename}, profile: ${project.activeProfile}, DLC: ${currProfile.dlc}`);

  const env = process.env;
  env.DLC = currProfile.dlc;

  const prmFileName = path.join(
    tmpdir(),
    'runbatch-' + crypto.randomBytes(16).toString('hex') + '.json',
  );
  const cfgFile = {
    verbose: false,
    databases: currProfile.dbConnections,
    propath: currProfile.propath,
    parameters: [],
    returnValue: '',
    super: true,
    output: [],
    procedures: currProfile.procedures ?? [],
    procedure: filename,
  };
  fs.writeFileSync(prmFileName, JSON.stringify(cfgFile));
  outputChannel.info(`runBatch - param file: ${prmFileName}, procedures: ${cfgFile.procedures.length}`);

  // prettier-ignore
  const args = currProfile.extraParameters
        .split(" ")
        .concat([
            "-b",
            "-clientlog", path.join(project.rootDir, ".builder", "runbatch.log"),
            "-p", path.join(__dirname, "../resources/abl-src/dynrun.p"),
            "-param", prmFileName,
            "-T", path.join(project.rootDir, ".builder", "tmp")
        ]);
  outputChannel.info(`runBatch - command: ${currProfile.getTTYExecutable()} ${args.join(' ')}`);
  create(
        currProfile.getTTYExecutable(),
        args,
        { env: env, cwd: project.rootDir, detached: true },
        batchOutputChannel
    );
}
