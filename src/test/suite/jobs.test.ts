import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as jobs from '../../jobs';
import { WallTime } from '../../time';
import { Job, Debug } from '../../scheduler';

suite('jobs.ts tests', () => {
    
    test('InfoItem :: constructor', () => {
        {
            const infoItem = new jobs.InfoItem('Test InfoItem', 'Test Value');
            assert.strictEqual(infoItem.label, 'Test InfoItem');
            assert.strictEqual(infoItem.column, 'Test InfoItem');
            assert.strictEqual(infoItem.value, 'Test Value');
            assert.strictEqual(infoItem.tooltip, `Test InfoItem: Test Value`);
            assert.strictEqual(infoItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        }
    });

    test('JobItem :: constructor', () => {
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), true);
            assert.strictEqual(jobItem.label, 'Test Job');
            assert.strictEqual(jobItem.description, '');
            assert.strictEqual(jobItem.tooltip, `1 (RUNNING)`);
            assert.strictEqual(jobItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        }
        {
            const jobItem = new jobs.JobItem(new Job('2', 'Test Job', 'PENDING', 'queue', 'batch', 'out', new WallTime(0,0,30,0), new WallTime(0,0,15,30)), false);
            assert.strictEqual(jobItem.label, 'Test Job');
            assert.strictEqual(jobItem.description, '15:30 / 30:00');
            assert.strictEqual(jobItem.tooltip, `2 (PENDING)`);
            assert.strictEqual(jobItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        }
    });

    test('JobItem :: getIconPath', async () => {
        let config = vscode.workspace.getConfiguration("slurm-dashboard");
        await config.update("job-dashboard.useNativeIcons", false);
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('running.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('2', 'Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0,0,30,0), new WallTime(0,0,29,30)));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('running-orange.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('4', 'Test Job', 'PENDING'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('pending.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('5', 'Test Job', 'COMPLETED'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('completed.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('6', 'Test Job', 'TIMEOUT'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('error.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('7', 'Test Job', 'CANCELLED'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('error.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('8', 'Test Job', 'FAILED'));
            assert.ok(jobItem.getIconPath()?.toString().endsWith('error.svg'));
        }

        await config.update("job-dashboard.useNativeIcons", true);
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("play"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('2', 'Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0,0,30,0), new WallTime(0,0,29,30)));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("play"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('4', 'Test Job', 'PENDING'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("ellipsis"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('5', 'Test Job', 'COMPLETED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("check"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('6', 'Test Job', 'TIMEOUT'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("warning"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('7', 'Test Job', 'CANCELLED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("error"));
        }
        {
            const jobItem = new jobs.JobItem(new Job('8', 'Test Job', 'FAILED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon("error"));
        }
    });

    test('JobItem :: getInfoItems', () => {
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), true);
            const infoItems = jobItem.getInfoItems();
            assert.strictEqual(infoItems.length, 3);
            assert.strictEqual(infoItems[0].label, 'id');
            assert.strictEqual(infoItems[0].value, '1');
            assert.strictEqual(infoItems[1].label, 'name');
            assert.strictEqual(infoItems[1].value, 'Test Job');
            assert.strictEqual(infoItems[2].label, 'status');
            assert.strictEqual(infoItems[2].value, 'RUNNING');
        }
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            const infoItems = jobItem.getInfoItems();
            assert.strictEqual(infoItems.length, 0);
        }
        {
            const jobItem = new jobs.JobItem(new Job('2', 'Test Job', 'PENDING', 'queue', 'batch', 'out', new WallTime(0,0,30,0), new WallTime(0,0,15,30)), true);
            const infoItems = jobItem.getInfoItems();
            assert.strictEqual(infoItems.length, 7);
            assert.strictEqual(infoItems[0].label, 'id');
            assert.strictEqual(infoItems[0].value, '2');
            assert.strictEqual(infoItems[1].label, 'name');
            assert.strictEqual(infoItems[1].value, 'Test Job');
            assert.strictEqual(infoItems[2].label, 'status');
            assert.strictEqual(infoItems[2].value, 'PENDING');
            assert.strictEqual(infoItems[3].label, 'queue');
            assert.strictEqual(infoItems[3].value, 'queue');
            assert.strictEqual(infoItems[4].label, 'batch file');
            assert.strictEqual(infoItems[4].value, 'batch');
            assert.strictEqual(infoItems[5].label, 'max time');
            assert.strictEqual(infoItems[5].value, '30:00');
            assert.strictEqual(infoItems[6].label, 'cur time');
            assert.strictEqual(infoItems[6].value, '15:30');
        }
    });

    test('JobItem :: extrapolateTime', () => {
        {
            const job = new Job('1', 'Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0, 0, 30, 0), new WallTime(0, 0, 15, 30));
            const jobItem = new jobs.JobItem(job);
        
            const since = performance.now() - 10 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);
        
            assert.strictEqual(didUpdate, true);
        }
        {
            const job = new Job('1', 'Test Job', 'PENDING', 'queue', 'batch', 'out', new WallTime(0, 0, 30, 0), new WallTime(0, 0, 15, 30));
            const jobItem = new jobs.JobItem(job);
        
            const since = performance.now() - 10 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);
        
            assert.strictEqual(didUpdate, false);
        }
        {
            const job = new Job('1', 'Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0, 0, 30, 0), new WallTime(0, 0, 29, 50));
            const jobItem = new jobs.JobItem(job);
        
            const since = performance.now() - 100 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);
        
            assert.strictEqual(didUpdate, false);
        }
    });

    test('JobQueueProvider :: constructor', () => {
        assert.doesNotThrow(() => { new jobs.JobQueueProvider(new Debug()); });
    });

    test('JobQueueProvider :: getTreeItem', () => {
        const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
        const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), true);
        assert.strictEqual(jobQueueProvider.getTreeItem(jobItem), jobItem);
    });

    test('JobQueueProvider :: getChildren', async () => {
        const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
        const children = await jobQueueProvider.getChildren();
        assert.ok(children);
        assert.strictEqual(children.length, 9);
        assert.strictEqual(children[0].label, 'job1');
        assert.strictEqual(children[1].label, 'job2');
        assert.strictEqual(children[2].label, 'job3');
        assert.strictEqual(children[3].label, 'job4');
        assert.strictEqual(children[4].label, 'job5');
        assert.strictEqual(children[5].label, 'job6');
        assert.strictEqual(children[6].label, 'job7');
        assert.strictEqual(children[7].label, 'job8');
        assert.strictEqual(children[8].label, 'job9');
    });

});
