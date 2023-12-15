import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fu from '../../fileutilities';

suite('fileutilities.ts tests', () => {
    
	test('resolvePathRelativeToWorkspace', () => {
        {   // absolute path
            const filePath = 'src/fileutilities.ts';
            const workspaceRoot = '';
            const expectedUri = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), filePath);
            const actualUri = fu.resolvePathRelativeToWorkspace(filePath);
            assert.strictEqual(actualUri.toString(), expectedUri.toString(), "relative path");
        }
        {   // relative path
            const filePath = 'file:///home/daniel/dev/personal/vscode-extensions/slurm-dashboard/src/fileutilities.ts';
            const expectedUri = vscode.Uri.file(filePath);
            const actualUri = fu.resolvePathRelativeToWorkspace(filePath);
            assert.strictEqual(actualUri.toString(), expectedUri.toString(), "absolute path");
        }
    });

    test('getParentDirectory', () => {
        const filePath = '/home/daniel/dev/personal/vscode-extensions/slurm-dashboard/src/fileutilities.ts';
        const expectedParentDirectory = '/home/daniel/dev/personal/vscode-extensions/slurm-dashboard/src';

        const actualParentDirectory = fu.getParentDirectory(filePath);

        assert.strictEqual(actualParentDirectory, expectedParentDirectory);
    });
});