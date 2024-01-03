import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { WallTime } from '../../time';
import { resolvePathRelativeToWorkspace } from '../../fileutilities';
import * as scheduler from '../../scheduler';

/*  Randomize array in-place using Durstenfeld shuffle algorithm 
    https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
*/
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

suite('scheduler.ts tests', () => {
    test('Job :: constructor', () => {
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running');
            assert.strictEqual(job.id, '1');
            assert.strictEqual(job.name, 'Test Job');
            assert.strictEqual(job.status, 'Running');
            assert.strictEqual(job.queue, undefined);
            assert.strictEqual(job.batchFile, undefined);
            assert.strictEqual(job.outputFile, undefined);
            assert.strictEqual(job.maxTime, undefined);
            assert.strictEqual(job.curTime, undefined);
        }
        {
            const job = new scheduler.Job(
                '1',
                'Test Job',
                'Running',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 0, 3600),
                new WallTime(0, 0, 0, 1800)
            );
            assert.strictEqual(job.id, '1');
            assert.strictEqual(job.name, 'Test Job');
            assert.strictEqual(job.status, 'Running');
            assert.strictEqual(job.queue, 'queue');
            assert.strictEqual(job.batchFile, 'batchFile');
            assert.strictEqual(job.outputFile, 'outputFile');
            assert.strictEqual(job.maxTime?.toSeconds(), 3600);
            assert.strictEqual(job.curTime?.toSeconds(), 1800);
        }
    });

    test('Job :: getTimeLeft', () => {
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running');
            assert.strictEqual(job.getTimeLeft(), undefined);
        }
        {
            const job = new scheduler.Job(
                '1',
                'Test Job',
                'Running',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 0, 3600),
                new WallTime(0, 0, 0, 1800)
            );
            assert.strictEqual(job.getTimeLeft()?.toSeconds(), 1800);
        }
        {
            const job = new scheduler.Job(
                '1',
                'Test Job',
                'Running',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 30)
            );
            assert.strictEqual(job.getTimeLeft()?.toSeconds(), 870);
        }
    });

    test('Job :: isPercentFinished', () => {
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running');
            assert.strictEqual(job.isPercentFinished(0.5), undefined);
        }
        {
            const job = new scheduler.Job(
                '1',
                'Test Job',
                'Running',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 0, 3600),
                new WallTime(0, 0, 0, 1800)
            );
            assert.strictEqual(job.isPercentFinished(0.8), false);
        }
        {
            const job = new scheduler.Job(
                '1',
                'Test Job',
                'Running',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 30)
            );
            assert.strictEqual(job.isPercentFinished(0.5), true);
        }
    });

    test('sortJobs', () => {
        const jobsRef = [
            new scheduler.Job(
                '1',
                'Test Job 1',
                'RUNNING',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 0, 3600),
                new WallTime(0, 0, 0, 1800)
            ),
            new scheduler.Job(
                '2',
                'Test Job 2',
                'COMPLETED',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 30)
            ),
            new scheduler.Job(
                '3',
                'Test Job 3',
                'PENDING',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 0, 3600),
                new WallTime(0, 0, 0, 0)
            ),
            new scheduler.Job(
                '4',
                'Test Job 4',
                'FAILED',
                'queue',
                'batchFile',
                'outputFile',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 15, 45)
            ),
        ];

        let jobs = jobsRef.slice();
        shuffleArray(jobs);
        scheduler.sortJobs(jobs, 'id');
        assert.strictEqual(jobs[0].id, '1', 'failed sort by id');
        assert.strictEqual(jobs[1].id, '2', 'failed sort by id');
        assert.strictEqual(jobs[2].id, '3', 'failed sort by id');
        assert.strictEqual(jobs[3].id, '4', 'failed sort by id');

        jobs = jobsRef.slice();
        shuffleArray(jobs);
        scheduler.sortJobs(jobs, 'name');
        assert.strictEqual(jobs[0].name, 'Test Job 1', 'failed sort by name');
        assert.strictEqual(jobs[1].name, 'Test Job 2', 'failed sort by name');
        assert.strictEqual(jobs[2].name, 'Test Job 3', 'failed sort by name');
        assert.strictEqual(jobs[3].name, 'Test Job 4', 'failed sort by name');

        jobs = jobsRef.slice();
        shuffleArray(jobs);
        scheduler.sortJobs(jobs, 'time left');
        assert.strictEqual(jobs[0].id, '4', 'failed sort by time left');
        assert.strictEqual(jobs[1].id, '2', 'failed sort by time left');
        assert.strictEqual(jobs[2].id, '1', 'failed sort by time left');
        assert.strictEqual(jobs[3].id, '3', 'failed sort by time left');

        jobs = jobsRef.slice();
        shuffleArray(jobs);
        scheduler.sortJobs(jobs, 'status');
        assert.strictEqual(jobs[0].id, '2', 'failed sort by status');
        assert.strictEqual(jobs[1].id, '4', 'failed sort by status');
        assert.strictEqual(jobs[2].id, '3', 'failed sort by status');
        assert.strictEqual(jobs[3].id, '1', 'failed sort by status');

        jobs = jobsRef.slice();
        scheduler.sortJobs(jobs, null);
        assert.strictEqual(jobs[0].id, '1');
        assert.strictEqual(jobs[1].id, '2');
        assert.strictEqual(jobs[2].id, '3');
        assert.strictEqual(jobs[3].id, '4');

        jobs = jobsRef.slice();
        scheduler.sortJobs(jobs, 'invalid key');
        assert.strictEqual(jobs[0].id, '1');
        assert.strictEqual(jobs[1].id, '2');
        assert.strictEqual(jobs[2].id, '3');
        assert.strictEqual(jobs[3].id, '4');
    });

    test('SchedulerDataColumn :: constructor', () => {
        assert.doesNotThrow(() => {
            new scheduler.SchedulerDataColumn('column name', 255);
        });

        assert.throws(() => {
            new scheduler.SchedulerDataColumn('column name', -1);
        });

        assert.throws(() => {
            new scheduler.SchedulerDataColumn('column name', 0);
        });

        assert.throws(() => {
            new scheduler.SchedulerDataColumn('column name', 1.5);
        });

        {
            const col = new scheduler.SchedulerDataColumn('column name', 255);
            assert.strictEqual(col.name, 'column name');
            assert.strictEqual(col.chars, 255);
        }

        {
            const col = new scheduler.SchedulerDataColumn('column name', undefined);
            assert.strictEqual(col.name, 'column name');
            assert.strictEqual(col.chars, undefined);
        }
    });

    test('SchedulerDataColumn :: toString', () => {
        {
            const col = new scheduler.SchedulerDataColumn('column name', 255);
            assert.strictEqual(col.toString(), 'column name:255');
        }

        {
            const col = new scheduler.SchedulerDataColumn('column name', undefined);
            assert.strictEqual(col.toString(), 'column name');
        }
    });

    test('Slurm :: getQueue', async function () {
        /* skip if windows */
        if (process.platform === 'win32') {
            this.skip();
        }

        assert.doesNotThrow(async () => {
            execSync('sreset');
        });

        assert.doesNotThrow(async () => {
            const slurm = new scheduler.SlurmScheduler();
            await slurm.getQueue();
        });

        {
            const slurm = new scheduler.SlurmScheduler();
            const queue = await slurm.getQueue();
            assert.strictEqual(queue.length, 3);
        }
    });

    test('Slurm :: cancelJob', async function () {
        /* skip if windows */
        if (process.platform === 'win32') {
            this.skip();
        }

        assert.doesNotThrow(async () => {
            execSync('sreset');
        });

        const slurm = new scheduler.SlurmScheduler();
        const queue = await slurm.getQueue();
        const job = queue[0];

        assert.doesNotThrow(() => {
            slurm.cancelJob(job);
        });

        const newQueue = await slurm.getQueue();
        assert.strictEqual(newQueue.length, 2);
        assert.ok(newQueue.every(j => j.id !== job.id));

        assert.doesNotThrow(() => {
            slurm.cancelJob(job);
            slurm.cancelJob(new scheduler.Job('invalid', 'invalid', 'invalid'));
        });
    });

    test('Slurm :: submitJob', async function () {
        /* skip if windows */
        if (process.platform === 'win32') {
            this.skip();
        }

        await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('setJobWorkingDirectoryToScriptDirectory', false);

        assert.doesNotThrow(async () => {
            execSync('sreset');

            /* since slurm wrapper script uses a tmp file, we have to keep a consistent working directory */
            await vscode.workspace
                .getConfiguration('slurm-dashboard')
                .update('setJobWorkingDirectoryToScriptDirectory', false);
        });

        const slurm = new scheduler.SlurmScheduler();
        const queue = await slurm.getQueue();
        assert.doesNotThrow(() => {
            slurm.submitJob(resolvePathRelativeToWorkspace('job1.sbatch'));
        });

        const newQueue = await slurm.getQueue();
        assert.strictEqual(newQueue.length, queue.length + 1);

        assert.doesNotThrow(() => {
            slurm.submitJob('not-a-real-file.sh');
        });
    });

    test('Slurm :: getJobOutputPath', async function () {
        /* skip if windows */
        if (process.platform === 'win32') {
            this.skip();
        }

        assert.doesNotThrow(async () => {
            execSync('sreset');
        });

        const slurm = new scheduler.SlurmScheduler();
        const queue = await slurm.getQueue();

        assert.strictEqual(slurm.getJobOutputPath(queue[0]), 'job1.out');
        assert.strictEqual(slurm.getJobOutputPath(queue[1]), 'job2.out');
        assert.strictEqual(slurm.getJobOutputPath(queue[2]), 'job3.out');
    });

    test('Debug :: getQueue', () => {
        const jobs = [
            new scheduler.Job(
                '1',
                'job1',
                'RUNNING',
                'debug',
                'job1.sh',
                'job1.out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 12, 43)
            ),
            new scheduler.Job(
                '2',
                'job2',
                'RUNNING',
                'debug',
                'job2.sh',
                'job2.out',
                new WallTime(0, 1, 30, 0),
                new WallTime(0, 1, 28, 1)
            ),
            new scheduler.Job(
                '3',
                'job3',
                'RUNNING',
                'debug',
                'job3.sh',
                'job3.out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 1, 15)
            ),
            new scheduler.Job(
                '4',
                'job4',
                'PENDING',
                'debug',
                'job4.sh',
                'job4.out',
                new WallTime(0, 1, 20, 40),
                new WallTime(0, 0, 0, 0)
            ),
            new scheduler.Job(
                '5',
                'job5',
                'PENDING',
                'debug',
                'job5.sh',
                'job5.out',
                new WallTime(1, 12, 0, 0),
                new WallTime(0, 0, 0, 0)
            ),
            new scheduler.Job(
                '6',
                'job6',
                'COMPLETED',
                'debug',
                'job6.sh',
                'job6.out',
                new WallTime(0, 7, 0, 0),
                new WallTime(0, 7, 0, 0)
            ),
            new scheduler.Job(
                '7',
                'job7',
                'TIMEOUT',
                'debug',
                'job7.sh',
                'job7.out',
                new WallTime(0, 1, 30, 0),
                new WallTime(0, 1, 30, 0)
            ),
            new scheduler.Job(
                '8',
                'job8',
                'CANCELLED',
                'debug',
                'job8.sh',
                'job8.out',
                new WallTime(0, 23, 59, 59),
                new WallTime(0, 0, 0, 0)
            ),
            new scheduler.Job(
                '9',
                'job9',
                'FAILED',
                'debug',
                'job9.sh',
                'job9.out',
                new WallTime(0, 0, 5, 0),
                new WallTime(0, 0, 0, 0)
            ),
        ];

        const debug = new scheduler.Debug();
        debug.getQueue().then(res => {
            assert.strictEqual(res.length, jobs.length);
            for (let i = 0; i < res.length; i++) {
                assert.strictEqual(res[i].id, jobs[i].id);
                assert.strictEqual(res[i].name, jobs[i].name);
                assert.strictEqual(res[i].status, jobs[i].status);
                assert.strictEqual(res[i].queue, jobs[i].queue);
                assert.strictEqual(res[i].batchFile, jobs[i].batchFile);
                assert.strictEqual(res[i].outputFile, jobs[i].outputFile);
                assert.strictEqual(res[i].maxTime?.toSeconds(), jobs[i].maxTime?.toSeconds());
                assert.strictEqual(res[i].curTime?.toSeconds(), jobs[i].curTime?.toSeconds());
            }
        });
    });

    test('Debug :: cancelJob', () => {
        let debug = new scheduler.Debug();

        debug.cancelJob(
            new scheduler.Job(
                '1',
                'job1',
                'RUNNING',
                'debug',
                'job1.sh',
                'job1.out',
                new WallTime(0, 0, 30, 0),
                new WallTime(0, 0, 12, 43)
            )
        );
        debug.cancelJob(
            new scheduler.Job(
                '2',
                'job2',
                'RUNNING',
                'debug',
                'job2.sh',
                'job2.out',
                new WallTime(0, 1, 30, 0),
                new WallTime(0, 1, 28, 1)
            )
        );

        debug.getQueue().then(res => {
            assert.strictEqual(res.length, 6);
            assert.ok(res.every(job => job.id !== '1' && job.id !== '2'));
        });
    });

    test('Debug :: submitJob', () => {
        let debug = new scheduler.Debug();

        assert.doesNotThrow(() => debug.submitJob('job1.sh'));
    });

    test('Debug :: getJobOutput', () => {
        let debug = new scheduler.Debug();

        debug.getQueue().then((jobs: scheduler.Job[]) => {
            jobs.forEach((job: scheduler.Job) => {
                assert.strictEqual(job.outputFile, debug.getJobOutputPath(job));
            });
        });
    });

    test('getScheduler', async () => {
        let config = vscode.workspace.getConfiguration('slurm-dashboard');

        await config.update('backend', 'slurm');
        let sched = scheduler.getScheduler();
        assert.ok(sched instanceof scheduler.SlurmScheduler);

        await config.update('backend', 'debug');
        sched = scheduler.getScheduler();
        assert.ok(sched instanceof scheduler.Debug);

        await config.update('backend', 'invalid');
        sched = scheduler.getScheduler();
        assert.ok(sched instanceof scheduler.SlurmScheduler);
    });
});
