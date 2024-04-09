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
            const jobItem = new jobs.JobItem(
                new Job(
                    '2',
                    'Test Job',
                    'PENDING',
                    'queue',
                    'batch',
                    'out',
                    new WallTime(0, 0, 30, 0),
                    new WallTime(0, 0, 15, 30)
                ),
                false
            );
            assert.strictEqual(jobItem.label, 'Test Job');
            assert.strictEqual(jobItem.description, '15:30 / 30:00');
            assert.strictEqual(jobItem.tooltip, `2 (PENDING)`);
            assert.strictEqual(jobItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        }
    });

    test('JobItem :: getIconPath', async () => {
        let config = vscode.workspace.getConfiguration('slurm-dashboard');
        await config.update('job-dashboard.useNativeIcons', false);
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('running.svg'));
        }
        {
            const jobItem = new jobs.JobItem(
                /* prettier-ignore */
                new Job('2','Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0, 0, 30, 0), new WallTime(0, 0, 29, 30))
            );
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('running-orange.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('4', 'Test Job', 'PENDING'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('pending.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('5', 'Test Job', 'COMPLETED'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('completed.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('6', 'Test Job', 'TIMEOUT'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('error.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('7', 'Test Job', 'CANCELLED'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('error.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('8', 'Test Job', 'FAILED'));
            const iconPath = jobItem.getIconPath();
            assert.ok(iconPath !== undefined);
            assert.ok(iconPath.toString().endsWith('error.svg'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('9', 'Test Job', 'GIBBERISH'));
            assert.ok(jobItem.getIconPath() === undefined);
        }

        await config.update('job-dashboard.useNativeIcons', true);
        {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('play'));
        }
        {
            const jobItem = new jobs.JobItem(
                /* prettier-ignore */
                new Job('2', 'Test Job', 'RUNNING', 'queue', 'batch', 'out', new WallTime(0, 0, 30, 0), new WallTime(0, 0, 29, 30))
            );
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('play'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('4', 'Test Job', 'PENDING'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('ellipsis'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('5', 'Test Job', 'COMPLETED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('check'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('6', 'Test Job', 'TIMEOUT'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('warning'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('7', 'Test Job', 'CANCELLED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('error'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('8', 'Test Job', 'FAILED'));
            assert.deepEqual(jobItem.getIconPath(), new vscode.ThemeIcon('error'));
        }
        {
            const jobItem = new jobs.JobItem(new Job('9', 'Test Job', 'GIBBERISH'));
            assert.ok(jobItem.getIconPath() === undefined);
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
            const jobItem = new jobs.JobItem(
                new Job(
                    '2',
                    'Test Job',
                    'PENDING',
                    'queue',
                    'batch',
                    'out',
                    new WallTime(0, 0, 30, 0),
                    new WallTime(0, 0, 15, 30)
                ),
                true
            );
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
            const job = new Job(
                '1',
                'Test Job',
                'RUNNING',
                'queue',
                'batch',
                'out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 30)
            );
            const jobItem = new jobs.JobItem(job);

            const since = performance.now() - 10 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);

            assert.strictEqual(didUpdate, true);
        }
        {
            const job = new Job(
                '1',
                'Test Job',
                'PENDING',
                'queue',
                'batch',
                'out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 30)
            );
            const jobItem = new jobs.JobItem(job);

            const since = performance.now() - 10 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);

            assert.strictEqual(didUpdate, false);
        }
        {
            const job = new Job(
                '1',
                'Test Job',
                'RUNNING',
                'queue',
                'batch',
                'out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 29, 50)
            );
            const jobItem = new jobs.JobItem(job);

            const since = performance.now() - 100 * 1000;
            const didUpdate = jobItem.extrapolateTime(since);

            assert.strictEqual(didUpdate, false);
        }
    });

    test('JobQueueProvider :: constructor', () => {
        assert.doesNotThrow(() => {
            new jobs.JobQueueProvider(new Debug());
        });
    });

    test('JobQueueProvider :: getTreeItem', () => {
        const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
        const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), true);
        assert.strictEqual(jobQueueProvider.getTreeItem(jobItem), jobItem);
    });

    test('JobQueueProvider :: getChildren', async () => {
        await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.persistJobs', false);
        {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.showJobInfo', false);
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
        }
        {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.showJobInfo', true);
            const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
            const children = await jobQueueProvider.getChildren();
            assert.ok(children);
            assert.strictEqual(children.length, 9);

            const job1Items = await jobQueueProvider.getChildren(children[0]);
            assert.ok(job1Items);
            assert.strictEqual(job1Items.length, 7);
            job1Items.forEach(item => {
                assert.ok(item instanceof jobs.InfoItem);
            });

            const emptyItem = await jobQueueProvider.getChildren(job1Items[0]);
            assert.ok(emptyItem);
            assert.strictEqual(emptyItem.length, 0);
        }

        await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.persistJobs', true);
        {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.showJobInfo', false);
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
        }
        {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.showJobInfo', true);
            const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
            const children = await jobQueueProvider.getChildren();
            assert.ok(children);
            assert.strictEqual(children.length, 9);

            const job1Items = await jobQueueProvider.getChildren(children[0]);
            assert.ok(job1Items);
            assert.strictEqual(job1Items.length, 7);
            job1Items.forEach(item => {
                assert.ok(item instanceof jobs.InfoItem);
            });

            const emptyItem = await jobQueueProvider.getChildren(job1Items[0]);
            assert.ok(emptyItem);
            assert.strictEqual(emptyItem.length, 0);
        }
    });

    test('JobQueueProvider :: register', async () => {
        const jobQueueProvider = new jobs.JobQueueProvider(new Debug());
        const extension = vscode.extensions.getExtension('danielnichols.slurm-dashboard');
        assert.ok(extension, 'Extension not found');
        const context = await extension?.activate();
        assert.ok(context, 'Context not found');

        assert.throws(() => {
            jobQueueProvider.register(context!);
        });
    });

    test('JobQueueProvider :: timers', async function () {
        await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.refreshInterval', 0.01);
        await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.extrapolationInterval', 0.01);

        const extension = vscode.extensions.getExtension('danielnichols.slurm-dashboard');
        assert.ok(extension !== undefined, 'Extension not found');

        assert.doesNotThrow(async () => {
            await extension.activate();
        });
    });

    test('commands :: job-dashboard.refresh', async function () {
        assert.doesNotThrow(async () => {
            await vscode.commands.executeCommand('job-dashboard.refresh');
        });
    });

    test('commands :: job-dashboard.cancel-all', async function () {
        assert.doesNotThrow(async () => {
            await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('job-dashboard.promptBeforeCancelAll', true);
            await vscode.commands.executeCommand('job-dashboard.cancel-all');
        });

        assert.doesNotThrow(async () => {
            await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('job-dashboard.promptBeforeCancelAll', false);
            await vscode.commands.executeCommand('job-dashboard.cancel-all');
        });
    });

    test('commands :: job-dashboard.cancel', async function () {
        assert.doesNotThrow(async () => {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.promptBeforeCancel', true);
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.cancel', jobItem);
        });
        assert.doesNotThrow(async () => {
            await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('job-dashboard.promptBeforeCancel', false);
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.cancel', jobItem);
        });
    });

    test('commands :: job-dashboard.cancel-and-resubmit', async function () {
        assert.doesNotThrow(async () => {
            await vscode.workspace.getConfiguration('slurm-dashboard').update('job-dashboard.promptBeforeCancel', true);
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.cancel-and-resubmit', jobItem);
        });
        assert.doesNotThrow(async () => {
            await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('job-dashboard.promptBeforeCancel', false);
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.cancel-and-resubmit', jobItem);
        });
    });

    test('commands :: job-dashboard.show-output', async function () {
        assert.doesNotThrow(async () => {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.show-output', jobItem);
        });
    });

    test('commands :: job-dashboard.show-source', async function () {
        assert.doesNotThrow(async () => {
            const jobItem = new jobs.JobItem(new Job('1', 'Test Job', 'RUNNING'), false);
            await vscode.commands.executeCommand('job-dashboard.show-source', jobItem);
        });
    });
});
