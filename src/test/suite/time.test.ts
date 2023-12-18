import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { WallTime } from '../../time';

suite('time.ts tests', () => {
	/*  tests for src/time.ts
		WallTime
            - constructor
            - fromString
            - toString
            - toSeconds
            - add
            - addSeconds
            - absDiffSeconds
            - cmp
	*/

    test('WallTime :: constructor', () => {
        assert.throws(() => { new WallTime(-1, 0, 0, 0); }, "Invalid days -1");
        assert.throws(() => { new WallTime(0, -1, 0, 0); }, "Invalid hours -1");
        assert.throws(() => { new WallTime(0, 0, -1, 0); }, "Invalid minutes -1");
        assert.throws(() => { new WallTime(0, 0, 0, -1); }, "Invalid seconds -1");
        assert.doesNotThrow(() => { new WallTime(0, 0, 0, 0); }, "Valid time 0:0:0 threw exception");
        assert.doesNotThrow(() => { new WallTime(1, 0, 0, 0); }, "Valid time 1-0:0:0 threw exception");
        assert.doesNotThrow(() => { new WallTime(0, 1, 0, 0); }, "Valid time 1:0:0 threw exception");
        assert.doesNotThrow(() => { new WallTime(0, 0, 1, 0); }, "Valid time 0:1:0 threw exception");
        assert.doesNotThrow(() => { new WallTime(0, 0, 0, 1); }, "Valid time 0:0:1 threw exception");
        assert.doesNotThrow(() => { new WallTime(1, 1, 1, 1); }, "Valid time 1:1:1 threw exception");

        let wt = new WallTime(1, 2, 3, 4);
        assert.equal(wt.days, 1, "Invalid days");
        assert.equal(wt.hours, 2, "Invalid hours");
        assert.equal(wt.minutes, 3, "Invalid minutes");
        assert.equal(wt.seconds, 4, "Invalid seconds");

        wt = new WallTime(1, 1, 2, 60);
        assert.equal(wt.days, 1, "Invalid days");
        assert.equal(wt.hours, 1, "Invalid hours");
        assert.equal(wt.minutes, 3, "Invalid minutes");
        assert.equal(wt.seconds, 0, "Invalid seconds");

        wt = new WallTime(1, 1, 125, 2);
        assert.equal(wt.days, 1, "Invalid days");
        assert.equal(wt.hours, 3, "Invalid hours");
        assert.equal(wt.minutes, 5, "Invalid minutes");
        assert.equal(wt.seconds, 2, "Invalid seconds");

        wt = new WallTime(1, 23, 60, 0);
        assert.equal(wt.days, 2, "Invalid days");
        assert.equal(wt.hours, 0, "Invalid hours");
        assert.equal(wt.minutes, 0, "Invalid minutes");
        assert.equal(wt.seconds, 0, "Invalid seconds");
    });

    test('WallTime :: fromString', () => {
        assert.throws(() => { WallTime.fromString("1:2:3:4"); }, "Invalid time string: 1:2:3:4");
        assert.throws(() => { WallTime.fromString("1:2:3:4:5"); }, "Invalid time string: 1:2:3:4:5");
        assert.throws(() => { WallTime.fromString("garbage"); }, "Invalid time string: garbage");
        assert.throws(() => { WallTime.fromString("a1:2:3"); }, "Invalid time string: a1:2:3");
        assert.throws(() => { WallTime.fromString("20.00.15"); }, "Invalid time string: 20.00.15");
        assert.throws(() => { WallTime.fromString("1-1-2:3"); }, "Invalid time string: 1-1-2:3");
        assert.throws(() => { WallTime.fromString("1-1:2-3"); }, "Invalid time string: 1-1:2-3");
        assert.throws(() => { WallTime.fromString("1-1-1:2:3"); }, "Invalid time string: 1-1-1:2:3");
        assert.doesNotThrow(() => { WallTime.fromString("1-1:2:3"); }, "Valid time string: 1-1:2:3 threw exception");
        assert.doesNotThrow(() => { WallTime.fromString("1"); }, "Valid time string: 1 threw exception");
        assert.doesNotThrow(() => { WallTime.fromString("1:2"); }, "Valid time string: 1:2 threw exception");
        assert.doesNotThrow(() => { WallTime.fromString("1:2:3"); }, "Valid time string: 1:2:3 threw exception");

        let wt = WallTime.fromString("0");
        assert.equal(wt.days, 0, "Invalid days");
        assert.equal(wt.hours, 0, "Invalid hours");
        assert.equal(wt.minutes, 0, "Invalid minutes");
        assert.equal(wt.seconds, 0, "Invalid seconds");

        wt = WallTime.fromString("1");
        assert.equal(wt.days, 0, "Invalid days");
        assert.equal(wt.hours, 0, "Invalid hours");
        assert.equal(wt.minutes, 0, "Invalid minutes");
        assert.equal(wt.seconds, 1, "Invalid seconds");

        wt = WallTime.fromString("1:2");
        assert.equal(wt.days, 0, "Invalid days");
        assert.equal(wt.hours, 0, "Invalid hours");
        assert.equal(wt.minutes, 1, "Invalid minutes");
        assert.equal(wt.seconds, 2, "Invalid seconds");

        wt = WallTime.fromString("1:2:3");
        assert.equal(wt.days, 0, "Invalid days");
        assert.equal(wt.hours, 1, "Invalid hours");
        assert.equal(wt.minutes, 2, "Invalid minutes");
        assert.equal(wt.seconds, 3, "Invalid seconds");

        wt = WallTime.fromString("1:2:60");
        assert.equal(wt.days, 0, "Invalid days");
        assert.equal(wt.hours, 1, "Invalid hours");
        assert.equal(wt.minutes, 3, "Invalid minutes");
        assert.equal(wt.seconds, 0, "Invalid seconds");

        wt = WallTime.fromString("2-1:2:3");
        assert.equal(wt.days, 2, "Invalid days");
        assert.equal(wt.hours, 1, "Invalid hours");
        assert.equal(wt.minutes, 2, "Invalid minutes");
        assert.equal(wt.seconds, 3, "Invalid seconds");

        wt = WallTime.fromString("10-11:12:13");
        assert.equal(wt.days, 10, "Invalid days");
        assert.equal(wt.hours, 11, "Invalid hours");
        assert.equal(wt.minutes, 12, "Invalid minutes");
        assert.equal(wt.seconds, 13, "Invalid seconds");
    });

    test('WallTime :: toString', () => {
        let wt = new WallTime(0, 0, 0, 0);
        assert.equal(wt.toString(), "00");

        wt = new WallTime(0, 0, 0, 1);
        assert.equal(wt.toString(), "01");

        wt = new WallTime(0, 0, 1, 0);
        assert.equal(wt.toString(), "01:00");

        wt = new WallTime(0, 0, 1, 1);
        assert.equal(wt.toString(), "01:01");

        wt = new WallTime(0, 1, 0, 0);
        assert.equal(wt.toString(), "1:00:00");

        wt = new WallTime(0, 1, 1, 1);
        assert.equal(wt.toString(), "1:01:01");

        wt = new WallTime(1, 0, 0, 0);
        assert.equal(wt.toString(), "1-00:00:00");

        wt = new WallTime(10, 11, 12, 13);
        assert.equal(wt.toString(), "10-11:12:13");
    });

    test('WallTime :: toSeconds', () => {
        let wt = new WallTime(0, 0, 0, 0);
        assert.equal(wt.toSeconds(), 0, "Invalid seconds");

        wt = new WallTime(0, 0, 0, 1);
        assert.equal(wt.toSeconds(), 1, "Invalid seconds");

        wt = new WallTime(0, 0, 1, 0);
        assert.equal(wt.toSeconds(), 60, "Invalid seconds");

        wt = new WallTime(0, 0, 1, 1);
        assert.equal(wt.toSeconds(), 61, "Invalid seconds");

        wt = new WallTime(0, 1, 0, 0);
        assert.equal(wt.toSeconds(), 3600, "Invalid seconds");

        wt = new WallTime(0, 1, 1, 1);
        assert.equal(wt.toSeconds(), 3661, "Invalid seconds");

        wt = new WallTime(1, 0, 0, 0);
        assert.equal(wt.toSeconds(), 86400, "Invalid seconds");

        wt = new WallTime(1, 1, 1, 1);
        assert.equal(wt.toSeconds(), 90061, "Invalid seconds");
    });

    test('WallTime :: add', () => {
        let wt1 = new WallTime(0, 1, 2, 3);
        let wt2 = new WallTime(1, 4, 5, 6);
        let result = wt1.add(wt2);
        assert.equal(result.days, 1, "Invalid days");
        assert.equal(result.hours, 5, "Invalid hours");
        assert.equal(result.minutes, 7, "Invalid minutes");
        assert.equal(result.seconds, 9, "Invalid seconds");

        wt1 = new WallTime(0, 23, 59, 59);
        wt2 = new WallTime(0, 0, 0, 1);
        result = wt1.add(wt2);
        assert.equal(result.days, 1, "Invalid days");
        assert.equal(result.hours, 0, "Invalid hours");
        assert.equal(result.minutes, 0, "Invalid minutes");
        assert.equal(result.seconds, 0, "Invalid seconds");
    });

    test('WallTime :: addSeconds', () => {
        let wt = new WallTime(0, 1, 2, 3);
        let result = wt.addSeconds(10);
        assert.equal(result.days, 0, "Invalid days");
        assert.equal(result.hours, 1, "Invalid hours");
        assert.equal(result.minutes, 2, "Invalid minutes");
        assert.equal(result.seconds, 13, "Invalid seconds");

        wt = new WallTime(0, 23, 59, 59);
        result = wt.addSeconds(1);
        assert.equal(result.days, 1, "Invalid days");
        assert.equal(result.hours, 0, "Invalid hours");
        assert.equal(result.minutes, 0, "Invalid minutes");
        assert.equal(result.seconds, 0, "Invalid seconds");
    });

    test('WallTime :: absDiffSeconds', () => {
        let wt1 = new WallTime(0, 1, 2, 3);
        let wt2 = new WallTime(0, 4, 5, 6);
        let result = wt1.absDiffSeconds(wt2);
        assert.equal(result, 10983, "Invalid difference in seconds");

        wt1 = new WallTime(0, 23, 59, 59);
        wt2 = new WallTime(0, 0, 0, 1);
        result = wt1.absDiffSeconds(wt2);
        assert.equal(result, 86398, "Invalid difference in seconds");
    });

    test('WallTime :: cmp', () => {
        let wt1 = new WallTime(0, 1, 2, 3);
        let wt2 = new WallTime(0, 4, 5, 6);
        let result = wt1.cmp(wt2);
        assert.ok(result < 0, "Invalid comparison result");

        wt1 = new WallTime(0, 23, 59, 59);
        wt2 = new WallTime(0, 0, 0, 1);
        result = wt1.cmp(wt2);
        assert.ok(result > 0, "Invalid comparison result");

        wt1 = new WallTime(0, 1, 2, 3);
        wt2 = new WallTime(0, 1, 2, 3);
        result = wt1.cmp(wt2);
        assert.equal(result, 0, "Invalid comparison result");

        wt1 = new WallTime(1, 2, 3, 4);
        wt2 = new WallTime(4, 3, 2, 1);
        result = wt1.cmp(wt2);
        assert.ok(result < 0, "Invalid comparison result");
    });

});