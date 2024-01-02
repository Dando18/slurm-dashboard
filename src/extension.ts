import * as vscode from 'vscode';
import { getScheduler } from './scheduler';
import { JobQueueProvider } from './jobs';
import { JobScriptProvider } from './jobscripts';

export function activate(context: vscode.ExtensionContext): vscode.ExtensionContext {

	let scheduler = getScheduler();
	new JobQueueProvider(scheduler).register(context);

	new JobScriptProvider(scheduler).register(context);

	return context;
}

export function deactivate() {}

