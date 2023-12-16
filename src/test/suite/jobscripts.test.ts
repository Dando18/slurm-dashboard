import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as jobscripts from '../../jobscripts';
import { WallTime } from '../../time';
import { Job, Debug } from '../../scheduler';

suite('jobscripts.ts tests', () => {
        
        test('JobScript :: constructor', () => {
            {
                const fpath = vscode.Uri.file('job1.sbatch');
                const jobScript = new jobscripts.JobScript(fpath);
                assert.strictEqual(jobScript.label, 'job1.sbatch');
                assert.strictEqual(jobScript.collapsibleState, vscode.TreeItemCollapsibleState.None);
                assert.strictEqual(jobScript.tooltip, fpath.toString());
                assert.strictEqual(jobScript.description?.toString().slice(1), 'job1.sbatch');
            }
        });
});
