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

        test('JobScriptProvider :: constructor', () => {
            const scheduler = new Debug();
            assert.doesNotThrow(() => {
                new jobscripts.JobScriptProvider(scheduler);
            });
        });

        test('JobScriptProvider :: getTreeItem', () => {
            const scheduler = new Debug();
            const provider = new jobscripts.JobScriptProvider(scheduler);
            const fpath = vscode.Uri.file('job1.sbatch');
            const jobScript = new jobscripts.JobScript(fpath);
            assert.strictEqual(provider.getTreeItem(jobScript), jobScript);
        });

        test('JobScriptProvider :: getChildren', async () => {
            const scheduler = new Debug();
            const provider = new jobscripts.JobScriptProvider(scheduler);
            
            let scripts = await provider.getChildren();

            assert.ok(scripts);
            assert.strictEqual(scripts.length, 3);
            assert.ok(scripts[0] instanceof jobscripts.JobScript);
            assert.strictEqual(scripts.filter((script) => script.label === 'job1.sbatch').length, 1);
        });
});
