import * as vscode from 'vscode';
import { SlurmScheduler } from './scheduler';
import { JobQueueProvider } from './jobs';
import { JobScriptProvider } from './jobscripts';

export function activate(context: vscode.ExtensionContext) {

	let scheduler = new SlurmScheduler();
	new JobQueueProvider(scheduler).register(context);

	new JobScriptProvider(scheduler).register(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
