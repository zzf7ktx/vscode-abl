import * as fs from 'fs';
import * as path from 'path';

export interface OpenEdgeConfig {
    dlc?: string;
    proPath?: string[];
    proPathMode?: 'append' | 'overwrite' | 'prepend';
    parameterFiles?: string[];
    workingDirectory?: string;
    startupProcedure?: string;
}

export function getBinPath(toolName: string, dlcPath?: string | string[]) {
    let dlc: string;
    if (dlcPath instanceof Array) {
        dlcPath.some((p) => {
            if (fs.existsSync(p)) {
                dlc = p;
                return true;
            }
        });
        if (!dlc) {
            dlc = process.env.DLC;
        }
    } else {
        dlc = dlcPath || process.env.DLC;
    }
    if (dlc) {
        return path.join(dlc, 'bin', toolName);
    }
    return toolName;
}

export function getProBin(dlcPath?: string) {
    return getBinPath('_progres', dlcPath);
}

export function getProwinBin(dlcPath?: string) {
    let prowin = getBinPath('prowin.exe', dlcPath);
    if (!fs.existsSync(prowin)) {
        prowin = getBinPath('prowin32.exe', dlcPath);
    }
    return prowin;
}

export interface ProArgsOptions {
    startupProcedure: string;
    param?: string;
    parameterFiles?: string[];
    databaseNames?: string[];
    batchMode?: boolean;
    debugPort?: number;
    temporaryDirectory?: string;
    workspaceRoot?: string;
}

export function createProArgs(options: ProArgsOptions): string[] {
    let pfArgs: string[] = [];
    if (options.parameterFiles) {
        pfArgs = options.parameterFiles
            .filter((pf) => pf.trim().length > 0)
            .reduce((r: string[], a: string) => r.concat('-pf', a), []);
        for (let i = 0; i < pfArgs.length; i++) {
            pfArgs[i] = pfArgs[i].replace('${workspaceRoot}', options.workspaceRoot);
        }
    }
    let args: string[] = [];
    let tempDir = options.temporaryDirectory;
    if (!tempDir) {
        tempDir = process.env.TEMP;
    }
    if (tempDir) {
        args.push('-T');
        args.push(tempDir);
    }
    args = args.concat(pfArgs);
    if (options.batchMode) {
        args.push('-b');
    }
    if (options.startupProcedure) {
        args.push('-p', options.startupProcedure);
    }
    if (options.param) {
        args.push('-param', options.param);
    }
    if (options.debugPort) {
        args.push('-debugReady', options.debugPort.toString());
    }
    return args;
}

export function setupEnvironmentVariables(
    env: NodeJS.ProcessEnv,
    openEdgeConfig: OpenEdgeConfig,
    workspaceRoot: string
): NodeJS.ProcessEnv {
    if (openEdgeConfig) {
        if (
            !openEdgeConfig.proPath ||
            !(openEdgeConfig.proPath instanceof Array) ||
            openEdgeConfig.proPath.length === 0
        ) {
            openEdgeConfig.proPath = ['${workspaceRoot}'];
        }
        openEdgeConfig.proPath.push(path.join(__dirname, '../../../abl-src'));
        const paths = openEdgeConfig.proPath.map((p) => {
            p = p.replace('${workspaceRoot}', workspaceRoot);
            p = p.replace('${workspaceFolder}', workspaceRoot);
            p = path.posix.normalize(p);
            return p;
        });
        env.VSABL_PROPATH = paths.join(',');

        if (openEdgeConfig.proPathMode) {
            env.VSABL_PROPATH_MODE = openEdgeConfig.proPathMode;
        } else {
            env.VSABL_PROPATH_MODE = 'append';
        }

        if (openEdgeConfig.startupProcedure) {
            env.VSABL_OE_STARTUP_PROCEDURE = openEdgeConfig.startupProcedure
                .replace('${workspaceRoot}', workspaceRoot)
                .replace('${workspaceFolder}', workspaceRoot);
        } else {
            env.VSABL_OE_STARTUP_PROCEDURE = '';
        }
    }
    env.VSABL_SRC = path.join(__dirname, '../../abl-src');
    env.VSABL_WORKSPACE = workspaceRoot;
    env.ENABLE_OPENEDGE_DEBUGGER = '1';

    return env;
}

export function expandPathVariables(
    pathToExpand: string,
    env: NodeJS.ProcessEnv,
    variables: { [key: string]: string }
): string {
    let expandedPath = pathToExpand;
    expandedPath = expandedPath.replace(/%([^%]+)%/g, (_, n) => {
        return env[n] || '';
    });
    expandedPath = expandedPath.replace(/\${([^}]+)}/g, (_, n) => {
        return variables[n] || '';
    });
    return expandedPath;
}
