import * as path from 'path';

import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // The path to the test workspace
        const testWorkspace = path.resolve(__dirname, '../../src/test/example-workspace');

        // add ./bin to PATH
        let updatedEnv = process.env;
        updatedEnv.PATH = `${updatedEnv.PATH}:${path.resolve(__dirname, '../../src/test/bin')}`;

        // parse out CLI to get vscode version
        const args = process.argv.slice(2);
        if (args.length === 0) {
            throw new Error('No vscode version provided');
        }
        const vscodeVersion = args[0];

        // Download and unzip VS Code
        const vscodeExecutablePath = await downloadAndUnzipVSCode(vscodeVersion);

        // Download VS Code, unzip it and run the integration test
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testWorkspace, '--disable-extensions'],
            extensionTestsEnv: updatedEnv,
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
