import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';

suite('Extension', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('danielnichols.slurm-dashboard'));
    });

    test('activate', async () => {
        const extension = vscode.extensions.getExtension('danielnichols.slurm-dashboard');
        assert.ok(extension, 'Extension not found');
        let context: vscode.ExtensionContext = await extension.activate();

        assert.throws(() => {
            activate(context);
        });
    });

    test('deactivate', async () => {
        assert.doesNotThrow(() => {
            deactivate();
        });
    });
});
