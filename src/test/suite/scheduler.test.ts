import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { WallTime } from '../../time';
import * as scheduler from '../../scheduler';

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
            const job = new scheduler.Job('1', 'Test Job', 'Running', 'queue', 'batchFile', 'outputFile', new WallTime(0, 0, 3600), new WallTime(0, 0, 1800));
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
            const job = new scheduler.Job('1', 'Test Job', 'Running', 'queue', 'batchFile', 'outputFile', new WallTime(0, 0, 3600), new WallTime(0, 0, 1800));
            assert.strictEqual(job.getTimeLeft()?.toSeconds(), 1800);
        }
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running', 'queue', 'batchFile', 'outputFile', new WallTime(0, 30, 0), new WallTime(0, 15, 30));
            assert.strictEqual(job.getTimeLeft()?.toSeconds(), 870);
        }
    });

    test('Job :: isPercentFinished', () => {
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running');
            assert.strictEqual(job.isPercentFinished(0.5), undefined);
        }
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running', 'queue', 'batchFile', 'outputFile', new WallTime(0, 0, 3600), new WallTime(0, 0, 1800));
            assert.strictEqual(job.isPercentFinished(0.8), false);
        }
        {
            const job = new scheduler.Job('1', 'Test Job', 'Running', 'queue', 'batchFile', 'outputFile', new WallTime(0, 30, 0), new WallTime(0, 15, 30));
            assert.strictEqual(job.isPercentFinished(0.5), true);
        }
    });

});