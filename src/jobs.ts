import * as vscode from 'vscode';
import { Job, Scheduler } from './scheduler';
import { resolvePathRelativeToWorkspace } from './fileutilities';


export class InfoItem extends vscode.TreeItem {
    constructor(public column: string, public value: string) {
        super(column, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.tooltip = `${column}: ${value}`;
    }
}

export class JobItem extends vscode.TreeItem {

    constructor(
        public job: Job,
        private readonly showInfo: boolean = false,
        public readonly contextValue: string = "jobItem"
    ) {
        super(job.name, (showInfo) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.description = `${job.curTime} / ${job.maxTime}`;
        this.iconPath = this.getIconPath();
        this.tooltip = `${job.id} (${job.status})`;
    }

    getIconPath(): string | vscode.Uri | vscode.ThemeIcon | undefined {
        if (this.job.status === "RUNNING") {
            return new vscode.ThemeIcon("play");
        } else if (this.job.status === "PENDING") {
            return new vscode.ThemeIcon("ellipsis");
        } else if (this.job.status === "COMPLETED" || this.job.status === "COMPLETING") {
            return new vscode.ThemeIcon("check");
        } else if (this.job.status === "CANCELLED" || this.job.status === "FAILED") {
            return new vscode.ThemeIcon("error");
        } else if (this.job.status === "TIMEOUT") {
            return new vscode.ThemeIcon("warning");
        } else {
            return undefined;
        }
    }

    public getInfoItems(): InfoItem[] {
        if (!this.showInfo) {
            return [];
        }

        let infoItems: InfoItem[] = [
            new InfoItem("id", this.job.id),
            new InfoItem("name", this.job.name),
            new InfoItem("status", this.job.status)
        ];
        if (this.job.queue) {
            infoItems.push(new InfoItem("queue", this.job.queue));
        }
        if (this.job.batchFile) {
            infoItems.push(new InfoItem("batch file", this.job.batchFile));
        }
        if (this.job.maxTime) {
            infoItems.push(new InfoItem("max time", this.job.maxTime.toString()));
        }
        if (this.job.curTime) {
            infoItems.push(new InfoItem("cur time", this.job.curTime.toString()));
        }
        return infoItems;
    }
}

export class JobQueueProvider implements vscode.TreeDataProvider<JobItem|InfoItem> {
    private jobItems: JobItem[] = [];
    private autoRefreshTimer: NodeJS.Timeout|null = null;
    
    private _onDidChangeTreeData: vscode.EventEmitter<JobItem|InfoItem|undefined|null|void> = new vscode.EventEmitter<JobItem|InfoItem|undefined|null|void>();
    readonly onDidChangeTreeData: vscode.Event<JobItem|InfoItem|undefined|null|void> = this._onDidChangeTreeData.event;
  
    constructor(private scheduler: Scheduler) { }

    getTreeItem(element: JobItem|InfoItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: JobItem|InfoItem): vscode.ProviderResult<JobItem[]|InfoItem[]> {
        if (element) {
            if (element instanceof JobItem) {
                return Promise.resolve(element.getInfoItems());
            } else {
                return Promise.resolve([]);
            }
        } else {
            const showInfo = vscode.workspace.getConfiguration("slurm-dashboard").get("job-dashboard.showJobInfo", false);
            return this.scheduler.getQueue().then((jobs) => {
                const items = jobs.map((job) => new JobItem(job, showInfo));
                this.jobItems = items;
                return items;
            });
        }
    }

    public register(context: vscode.ExtensionContext): void {
        let jobView = vscode.window.registerTreeDataProvider('job-dashboard', this);
        context.subscriptions.push(jobView);
        vscode.commands.registerCommand('job-dashboard.refresh', () => this.refresh());
        vscode.commands.registerCommand('job-dashboard.cancel-all', () => this.cancelAll());
        vscode.commands.registerCommand('job-dashboard.cancel', (jobItem: JobItem) => this.cancel(jobItem));
        vscode.commands.registerCommand('job-dashboard.cancel-and-resubmit', (jobItem: JobItem) => this.cancelAndResubmit(jobItem));
        vscode.commands.registerCommand('job-dashboard.show-output', (jobItem: JobItem) => this.showOutput(jobItem));
        vscode.commands.registerCommand('job-dashboard.show-source', (jobItem: JobItem) => this.showSource(jobItem));

        this.initAutoRefresh();
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("slurm-dashboard.job-dashboard.refreshInterval")) {
                this.initAutoRefresh();
            }
        });
    }

    public refresh(): void {
        this.jobItems = [];
        this._onDidChangeTreeData.fire();
    }

    private initAutoRefresh(): void {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }

        const refreshInterval: number|null|undefined = vscode.workspace.getConfiguration("slurm-dashboard").get("job-dashboard.refreshInterval");
        if (refreshInterval) {
            this.autoRefreshTimer = setInterval(() => this.refresh(), refreshInterval*1000);
        }
    }

    private showOutput(jobItem: JobItem): void {
        if (jobItem.job.outputFile) {
            const fpath = resolvePathRelativeToWorkspace(jobItem.job.outputFile);
            vscode.workspace.openTextDocument(fpath).then((doc) => {
                vscode.window.showTextDocument(doc);
            }, (error) => {
                vscode.window.showErrorMessage(`Failed to open output file ${jobItem.job.outputFile}.\n${error}`);
            });
        } else {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated batch file.`);
        }
    }

    private showSource(jobItem: JobItem): void {
        if (jobItem.job.batchFile) {
            const fpath = resolvePathRelativeToWorkspace(jobItem.job.batchFile);
            vscode.workspace.openTextDocument(fpath).then((doc) => {
                vscode.window.showTextDocument(doc);
            }, (error) => {
                vscode.window.showErrorMessage(`Failed to open batch file ${jobItem.job.batchFile}.\n${error}`);
            });
        } else {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated batch file.`);
        }
    }

    private cancel(jobItem: JobItem): Thenable<boolean> {
        const shouldPrompt = vscode.workspace.getConfiguration("slurm-dashboard").get("job-dashboard.promptBeforeCancel", true);
        let cancelFunc = () => {
            this.scheduler.cancelJob(jobItem.job);
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window.showInformationMessage(`Are you sure you want to cancel job ${jobItem.job.id}?`, "Yes", "No").then((selection) => {
                if (selection === "Yes") {
                    cancelFunc();
                }
                return selection === "Yes";
            });
        } else {
            cancelFunc();
            return Promise.resolve(true);
        }
    }

    private cancelAndResubmit(jobItem: JobItem): Thenable<boolean> {
        if (!jobItem.job.batchFile) {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated batch file.`);
            return Promise.resolve(false);
        }

        const shouldPrompt = vscode.workspace.getConfiguration("slurm-dashboard").get("job-dashboard.promptBeforeCancel", true);
        let cancelAndResubmitFunc = () => {
            this.scheduler.cancelJob(jobItem.job);
            this.scheduler.submitJob(jobItem.job.batchFile!);
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window.showInformationMessage(`Are you sure you want to cancel job ${jobItem.job.id} and resubmit?`, "Yes", "No").then((selection) => {
                if (selection === "Yes") {
                    cancelAndResubmitFunc();
                }
                return selection === "Yes";
            });
        } else {
            cancelAndResubmitFunc();
            return Promise.resolve(true);
        }
    }

    private cancelAll(): Thenable<boolean> {
        const shouldPrompt = vscode.workspace.getConfiguration("slurm-dashboard").get("job-dashboard.promptBeforeCancelAll", true);
        let cancelAllFunc = () => {
            this.jobItems.forEach((jobItem) => this.scheduler.cancelJob(jobItem.job));
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window.showInformationMessage("Are you sure you want to cancel all jobs?", "Yes", "No").then((selection) => {
                if (selection === "Yes") {
                    cancelAllFunc();
                }
                return selection === "Yes";
            });
        } else {
            cancelAllFunc();
            return Promise.resolve(true);
        }
    }
}
