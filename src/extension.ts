import * as vscode from 'vscode';
import { SlurmDataProvider, JobQueueProvider } from './jobs';
import { JobScriptProvider } from './jobscripts';

export function activate(context: vscode.ExtensionContext) {

	let slurmDataProvider = new SlurmDataProvider();
	let jobView = vscode.window.registerTreeDataProvider('job-dashboard', new JobQueueProvider(slurmDataProvider));
	context.subscriptions.push(jobView);

	let submitView = vscode.window.registerTreeDataProvider('submit-dashboard', new JobScriptProvider());
	context.subscriptions.push(submitView);
}

// This method is called when your extension is deactivated
export function deactivate() {}
