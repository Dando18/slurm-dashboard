import * as vscode from 'vscode';
import { getScheduler } from './scheduler';
import { JobQueueProvider } from './jobs';
import { JobScriptProvider } from './jobscripts';

export function activate(context: vscode.ExtensionContext) {

	let scheduler = getScheduler();
	new JobQueueProvider(scheduler).register(context);

	new JobScriptProvider(scheduler).register(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
