import * as fs from 'fs';
import { promisify } from 'util';
import { FileSystemWatcher, workspace, WorkspaceFolder } from 'vscode';

export const OPENEDGE_CONFIG_FILENAME = '.openedge.json';

export interface OpenEdgeConfig {
    dlc?: string;
    proPath?: string[];
    proPathMode?: 'append' | 'overwrite' | 'prepend';
    parameterFiles?: string[];
    workingDirectory?: string;
    startupProcedure?: string;
    dbDictionary?: string[];
}

let openEdgeConfig: OpenEdgeConfig = null;
let watcher: FileSystemWatcher = null;
export let genericWorkspaceFolder: WorkspaceFolder = null;

export function findConfigFile() {
    return workspace.findFiles(OPENEDGE_CONFIG_FILENAME).then((uris) => {
        if (uris.length > 0) {
            genericWorkspaceFolder = workspace.getWorkspaceFolder(uris[0]);
            return uris[0].fsPath;
        }
        return null;
    });
}

function loadAndSetConfigFile(filename: string) {
    if (filename === null) {
        return Promise.resolve({});
    }
    return loadConfigFile(filename).then((config) => {
        openEdgeConfig = config as OpenEdgeConfig;
        return openEdgeConfig;
    });
}

export function loadConfigFile(filename: string): Promise<OpenEdgeConfig> {
    if (!filename) {
        return Promise.resolve({});
    }
    const readFileAsync = promisify(fs.readFile);
    return readFileAsync(filename, { encoding: 'utf8' }).then((text: string) => {
        return JSON.parse(text) as OpenEdgeConfig;
    }).catch((e: NodeJS.ErrnoException) => {
        if (e.code === 'ENOENT') {
            return {} as OpenEdgeConfig;
        }
        throw e;
    });
}

export function getOpenEdgeConfig(): Promise<OpenEdgeConfig> {
    return new Promise<OpenEdgeConfig>((resolve, reject) => {
        if (openEdgeConfig === null) {
            watcher = workspace.createFileSystemWatcher('**/' + OPENEDGE_CONFIG_FILENAME);
            watcher.onDidChange((uri) => loadAndSetConfigFile(uri.fsPath));
            watcher.onDidCreate((uri) => loadAndSetConfigFile(uri.fsPath));
            watcher.onDidDelete(() => loadAndSetConfigFile(null));

            findConfigFile().then((filename) => loadAndSetConfigFile(filename)).then((config) => resolve(config as OpenEdgeConfig));
        } else {
            resolve(openEdgeConfig);
        }
    });
}
