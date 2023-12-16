import * as vscode from 'vscode';
import { Scheduler } from './scheduler';
import { getBaseName, getPathRelativeToWorkspaceRoot } from './fileutilities';

export class JobScript extends vscode.TreeItem {
    constructor(public fpath: string | vscode.Uri, public stat?: vscode.FileStat) {
        super(getBaseName(fpath), vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("file-code");
        this.tooltip = fpath.toString();
        this.description = getPathRelativeToWorkspaceRoot(fpath);
        this.command = {
            "title": "Show Source",
            "command": "submit-dashboard.show-source",
            arguments: [this]
        };
    }
}

function sortJobsScripts(scripts: JobScript[], key: string|null|undefined): void {
    if (!key) {
        return;
    }

    const AVAILABLE_KEYS = ["filename", "rel path", "last modified", "newest", "oldest"];
    if (!AVAILABLE_KEYS.includes(key)) {
        vscode.window.showErrorMessage(`Invalid sort key: ${key}`);
        return;
    }
    
    scripts.sort((a, b) => {
        if (key === "filename") {
            return getBaseName(a.fpath).localeCompare(getBaseName(b.fpath));
        } else if (key === "rel path") {
            return getPathRelativeToWorkspaceRoot(a.fpath).localeCompare(getPathRelativeToWorkspaceRoot(b.fpath));
        } else if (key === "last modified") {
            if (a.stat && b.stat) {
                return b.stat.mtime - a.stat.mtime;
            } else {
                return 0;
            }
        } else if (key === "newest" || key === "oldest") {
            if (a.stat && b.stat) {
                return (key === "newest") ? b.stat.ctime - a.stat.ctime : a.stat.ctime - b.stat.ctime;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    });
}

export class JobScriptProvider implements vscode.TreeDataProvider<JobScript> {
    private jobScripts: JobScript[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<JobScript|undefined|null|void> = new vscode.EventEmitter<JobScript|undefined|null|void>();
    readonly onDidChangeTreeData: vscode.Event<JobScript|undefined|null|void> = this._onDidChangeTreeData.event;

    constructor(private scheduler: Scheduler) { }

    getTreeItem(element: JobScript): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: JobScript): vscode.ProviderResult<JobScript[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getAllJobScripts());
        }
    }

    private getAllJobScripts(): Promise<JobScript[]> {
        const jobScriptExts = vscode.workspace.getConfiguration("slurm-dashboard").get("submit-dashboard.jobScriptExtensions", [".slurm", ".sbatch", ".job"]);

        /* find all files in workspace with job script extensions */
        let foundFiles: PromiseLike<JobScript[]>[] = [];
        jobScriptExts.forEach((ext) => {
            let jobScripts = vscode.workspace.findFiles(`**/*${ext}`)
                .then((uris) => {
                    let stats = uris.map((uri) => vscode.workspace.fs.stat(uri));
                    return Promise.all(stats).then((stats) => {
                        return uris.map((uri, i) => new JobScript(uri, stats[i]));
                    });
                });
            foundFiles.push(jobScripts);
        });
        return Promise.all(foundFiles).then((jobScripts) => {
            const sortKey: string|null|undefined = vscode.workspace.getConfiguration("slurm-dashboard").get("submit-dashboard.sortBy");
            const scripts = jobScripts.flat();
            sortJobsScripts(scripts, sortKey);
            this.jobScripts = scripts;
            return scripts;
        });
    }

    public register(context: vscode.ExtensionContext): void {
        let submitView = vscode.window.registerTreeDataProvider('submit-dashboard', this);
        context.subscriptions.push(submitView);

        vscode.commands.registerCommand('submit-dashboard.refresh', () => this.refresh());
        vscode.commands.registerCommand('submit-dashboard.submit-all', () => this.submitAll());
        vscode.commands.registerCommand('submit-dashboard.submit', (jobScript: JobScript) => this.submit(jobScript));
        vscode.commands.registerCommand('submit-dashboard.show-source', (jobScript: JobScript) => this.showSource(jobScript));
    }

    public refresh(): void {
        this.jobScripts = [];
        this._onDidChangeTreeData.fire();
    }

    private submitAll(): Thenable<boolean> {
        const shouldPrompt = vscode.workspace.getConfiguration("slurm-dashboard").get("submit-dashboard.promptBeforeSubmitAll", true);

        if (shouldPrompt) {
            const numJobs = this.jobScripts.length;
            return vscode.window.showInformationMessage(`Are you sure you want to submit all ${numJobs} jobs?`, "Yes", "No").then((value) => {
                if (value === "Yes") {
                    this.jobScripts.forEach((jobScript) => this.submit(jobScript));
                }
                return value === "Yes";
            });
        } else {
            this.jobScripts.forEach((jobScript) => this.submit(jobScript));
            return Promise.resolve(true);
        }
    }

    private submit(jobScript: JobScript): void {
        this.scheduler.submitJob(jobScript.fpath);
    }

    private showSource(jobScript: JobScript): void {
        const fpath = jobScript.fpath as vscode.Uri;
        vscode.workspace.openTextDocument(fpath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    }
}