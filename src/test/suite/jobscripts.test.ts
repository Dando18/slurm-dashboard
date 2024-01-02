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

            let emptyChildren = await provider.getChildren(scripts[0]);
            assert.ok(emptyChildren);
            assert.strictEqual(emptyChildren.length, 0);
        });

        test('JobScriptProvider :: register', async () => {
            const extension = vscode.extensions.getExtension("danielnichols.slurm-dashboard");
            assert.ok(extension, "Extension not found");

            const scheduler = new Debug();
            const provider = new jobscripts.JobScriptProvider(scheduler);

            let context: vscode.ExtensionContext|undefined = undefined;
            context = await extension.activate();
            assert.ok(context, "Extension context not found");

            assert.throws(() => {
                /* should already be initialized */
                provider.register(context!);
            });

            /* assert that submit-dashboard commands are registered */
            vscode.commands.getCommands(false).then((commands) => {
                assert.ok(commands.includes('submit-dashboard.refresh'));
                assert.ok(commands.includes('submit-dashboard.submit-all'));
                assert.ok(commands.includes('submit-dashboard.submit'));
                assert.ok(commands.includes('submit-dashboard.show-source'));
            });
        });

        test('sortJobScripts', async () => {
            const scheduler = new Debug();
            const provider = new jobscripts.JobScriptProvider(scheduler);
            
            {   /* null key */
                const scripts = await provider.getChildren();
                assert.ok(scripts);
                let newScripts = Array.from(scripts);
                assert.strictEqual(newScripts.length, 3, "sortJobScripts  key=null  invalid scripts length");
                
                jobscripts.sortJobsScripts(newScripts, null);
                newScripts.forEach((script, idx) => {
                    assert.strictEqual(script.label, scripts[idx].label, `sortJobScripts  key=null  invalid element ${idx}`);
                });
            }

            {   /* unknown key */
                const scripts = await provider.getChildren();
                assert.ok(scripts);
                let newScripts = Array.from(scripts);
                assert.strictEqual(newScripts.length, 3, "sortJobScripts  key=unknown  invalid scripts length");

                jobscripts.sortJobsScripts(newScripts, "unknown key -- gibberish");
                newScripts.forEach((script, idx) => {
                    assert.strictEqual(script.label, scripts[idx].label, `sortJobScripts  key=null  invalid element ${idx}`);
                });
            }

            {   /* filename key */
                let scripts = await provider.getChildren();
                assert.ok(scripts);
                scripts = Array.from(scripts);
                assert.strictEqual(scripts.length, 3, "sortJobScripts  key=filename  invalid scripts length");
                jobscripts.sortJobsScripts(scripts, "filename");

                assert.strictEqual(scripts[0].label, 'job1.sbatch', "sortJobScripts  key=filename  invalid element 0");
                assert.strictEqual(scripts[1].label, 'job2.slurm', "sortJobScripts  key=filename  invalid element 1");
                assert.strictEqual(scripts[2].label, 'job3.job', "sortJobScripts  key=filename  invalid element 2");
            }

            {   /* rel path key */
                let scripts = await provider.getChildren();
                assert.ok(scripts);
                scripts = Array.from(scripts);
                assert.strictEqual(scripts.length, 3, "sortJobScripts  key=rel path  invalid scripts length");
                jobscripts.sortJobsScripts(scripts, "rel path");

                assert.strictEqual(scripts[0].label, 'job1.sbatch', "sortJobScripts  key=rel path  invalid element 0");
                assert.strictEqual(scripts[1].label, 'job2.slurm', "sortJobScripts  key=rel path  invalid element 1");
                assert.strictEqual(scripts[2].label, 'job3.job', "sortJobScripts  key=rel path  invalid element 2");
            }

            {   /* last modified key */
                let scripts = await provider.getChildren();
                assert.ok(scripts);
                scripts = Array.from(scripts);
                assert.strictEqual(scripts.length, 3, "sortJobScripts  key=last modified  invalid scripts length");
                jobscripts.sortJobsScripts(scripts, "last modified");

                assert.strictEqual(scripts[0].label, 'job2.slurm', "sortJobScripts  key=last modified  invalid element 0");
                assert.strictEqual(scripts[1].label, 'job1.sbatch', "sortJobScripts  key=last modified  invalid element 1");
                assert.strictEqual(scripts[2].label, 'job3.job', "sortJobScripts  key=last modified  invalid element 2");
            }

            {   /* newest key */
                let scripts = await provider.getChildren();
                assert.ok(scripts);
                scripts = Array.from(scripts);
                assert.strictEqual(scripts.length, 3, "sortJobScripts  key=newest  invalid scripts length");
                jobscripts.sortJobsScripts(scripts, "newest");

                assert.strictEqual(scripts[0].label, 'job2.slurm', "sortJobScripts  key=newest  invalid element 0");
                assert.strictEqual(scripts[1].label, 'job1.sbatch', "sortJobScripts  key=newest  invalid element 1");
                assert.strictEqual(scripts[2].label, 'job3.job', "sortJobScripts  key=newest  invalid element 2");
            }

            {   /* oldest key */
                let scripts = await provider.getChildren();
                assert.ok(scripts);
                scripts = Array.from(scripts);
                assert.strictEqual(scripts.length, 3, "sortJobScripts  key=oldest  invalid scripts length");
                jobscripts.sortJobsScripts(scripts, "oldest");

                assert.strictEqual(scripts[0].label, 'job2.slurm', "sortJobScripts  key=oldest  invalid element 0");
                assert.strictEqual(scripts[1].label, 'job1.sbatch', "sortJobScripts  key=oldest  invalid element 1");
                assert.strictEqual(scripts[2].label, 'job3.job', "sortJobScripts  key=oldest  invalid element 2");
            }

        });

        test('JobScriptProvider :: refresh', async () => {
            const scheduler = new Debug();
            const provider = new jobscripts.JobScriptProvider(scheduler);
            
            let scripts = await provider.getChildren();
            assert.ok(scripts);
            assert.strictEqual(scripts.length, 3);

            await assert.doesNotThrow(async () => {
                await provider.refresh();
            });
            scripts = await provider.getChildren();
            assert.ok(scripts);
            assert.strictEqual(scripts.length, 3);
        });
});
