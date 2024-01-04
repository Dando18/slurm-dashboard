import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as util from '../../util';

suite('util.ts tests', function () {
    test('returnIfNoThrowElse', function () {
        let fn = () => 1;
        let fnThrows = () => {
            throw new Error('test');
        };

        assert.strictEqual(util.returnIfNoThrowElse(fn, 2), 1);
        assert.strictEqual(util.returnIfNoThrowElse(fnThrows, 2), 2);

        assert.doesNotThrow(() => util.returnIfNoThrowElse(fn, 2));
        assert.doesNotThrow(() => util.returnIfNoThrowElse(fnThrows, 2));
    });

    test('returnIfNoThrow', function () {
        let fn = () => 1;
        let fnThrows = () => {
            throw new Error('test');
        };

        assert.strictEqual(util.returnIfNoThrow(fn), 1);
        assert.strictEqual(util.returnIfNoThrow(fnThrows), undefined);

        assert.doesNotThrow(() => util.returnIfNoThrow(fn));
        assert.doesNotThrow(() => util.returnIfNoThrow(fnThrows));
    });
});
