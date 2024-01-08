import * as vscode from 'vscode';
import * as path from 'path';
import { Job, Scheduler, sortJobs } from './scheduler';
import { resolvePathRelativeToWorkspace } from './fileutilities';

/**
 * Represents an information item in the tree view. These are used to display
 * job meta-data below the actual job item.
 */
export class InfoItem extends vscode.TreeItem {
    /**
     * Creates a new instance of the InfoItem class.
     * @param column The column name.
     * @param value The value of the column.
     */
    constructor(
        public column: string,
        public value: string
    ) {
        super(column, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.tooltip = `${column}: ${value}`;
    }
}

/**
 * Represents a job item in the tree view. This is the main Job element,
 * which has buttons for canceling, resubmitting, and inspecting jobs currently
 * in the queue.
 */
export class JobItem extends vscode.TreeItem {
    /**
     * Creates a new instance of JobItem.
     * @param job The job associated with the item.
     * @param showInfo Whether to show job meta-data beneath the item.
     * @param contextValue The context value of the item. Set to "jobItem" to show the buttons.
     */
    constructor(
        public job: Job,
        private readonly showInfo: boolean = false,
        public readonly contextValue: string = 'jobItem'
    ) {
        const hasChildren: boolean = job.isJobArrayRoot() || showInfo;

        super(job.name, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.description = job.curTime && job.maxTime ? `${job.curTime} / ${job.maxTime}` : '';
        this.iconPath = this.getIconPath();
        this.tooltip = `${job.id} (${job.status})`;
    }

    /**
     * Gets the icon path for the job item. Icon is selected based on the job status.
     * If slurm-dashboard.job-dashboard.useNativeIcons is true, then the native icons
     * from VSCode are used. Otherwise, custom icons are used.
     * @returns The icon path.
     */
    getIconPath(): string | vscode.Uri | vscode.ThemeIcon | undefined {
        const useCustom = !vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.useNativeIcons', false);
        if (this.job.status === 'RUNNING') {
            if (this.job.isPercentFinished(0.9)) {
                return useCustom
                    ? path.join(__filename, '..', '..', 'images', 'running-orange.svg')
                    : new vscode.ThemeIcon('play');
            } else {
                return useCustom
                    ? path.join(__filename, '..', '..', 'images', 'running.svg')
                    : new vscode.ThemeIcon('play');
            }
        } else if (this.job.status === 'PENDING') {
            return useCustom
                ? path.join(__filename, '..', '..', 'images', 'pending.svg')
                : new vscode.ThemeIcon('ellipsis');
        } else if (this.job.status === 'COMPLETED' || this.job.status === 'COMPLETING') {
            return useCustom
                ? path.join(__filename, '..', '..', 'images', 'completed.svg')
                : new vscode.ThemeIcon('check');
        } else if (this.job.status === 'CANCELLED' || this.job.status === 'FAILED') {
            return useCustom ? path.join(__filename, '..', '..', 'images', 'error.svg') : new vscode.ThemeIcon('error');
        } else if (this.job.status === 'TIMEOUT') {
            return useCustom
                ? path.join(__filename, '..', '..', 'images', 'error.svg')
                : new vscode.ThemeIcon('warning');
        } else {
            return undefined;
        }
    }

    /**
     * If this is an array root job, then return the other array jobs as children.
     * Otherwise, return the info items for the job.
     */
    public getChildren(jobItems: JobItem[]): InfoItem[] | JobItem[] {
        if (this.job.isJobArrayRoot()) {
            const rootId = this.job.id;
            return jobItems.filter(jobItem => jobItem.job.arrayId === rootId && jobItem.job.id !== rootId);
        } else {
            return this.getInfoItems();
        }
    }

    /**
     * Gets the additional information items for the job item.
     * These are displayed beneath the job item in the tree view and show
     * meta-data about the job.
     * @returns The array of additional information items.
     */
    public getInfoItems(): InfoItem[] {
        if (!this.showInfo) {
            return [];
        }

        let infoItems: InfoItem[] = [
            new InfoItem('id', this.job.id),
            new InfoItem('name', this.job.name),
            new InfoItem('status', this.job.status),
        ];
        if (this.job.queue) {
            infoItems.push(new InfoItem('queue', this.job.queue));
        }
        if (this.job.batchFile) {
            infoItems.push(new InfoItem('batch file', this.job.batchFile));
        }
        if (this.job.maxTime) {
            infoItems.push(new InfoItem('max time', this.job.maxTime.toString()));
        }
        if (this.job.curTime) {
            infoItems.push(new InfoItem('cur time', this.job.curTime.toString()));
        }
        return infoItems;
    }

    /**
     * Extrapolates the time for the job item based on the elapsed time since a given timestamp.
     * Does not actually refresh the UI, just the underlying data of the JobItem. An event
     * should be fired if this function returns true.
     * @param since The timestamp to calculate the elapsed time from.
     * @returns True if the time was extrapolated, false otherwise.
     */
    public extrapolateTime(since: number): boolean {
        let didUpdate = false;
        if (this.job.status === 'RUNNING' && this.job.curTime && this.job.maxTime) {
            const elapsed = Math.round((performance.now() - since) / 1000);
            const displayTime = this.job.curTime!.addSeconds(elapsed);

            if (displayTime.cmp(this.job.maxTime!) <= 0) {
                this.description = `${displayTime} / ${this.job.maxTime}`;
                didUpdate = true;
            }
        }
        return didUpdate;
    }
}

/**
 * Provides a tree data provider for displaying job items in the job dashboard.
 * This class uses a Scheduler implementation to retrieve queue data and
 * interact with the system.
 */
export class JobQueueProvider implements vscode.TreeDataProvider<JobItem | InfoItem> {
    private jobItems: JobItem[] = [];
    private autoRefreshTimer: NodeJS.Timeout | null = null;
    private extrapolationTimer: NodeJS.Timeout | null = null;

    private _onDidChangeTreeData: vscode.EventEmitter<JobItem | InfoItem | undefined | null | void> =
        new vscode.EventEmitter<JobItem | InfoItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<JobItem | InfoItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    /**
     * Creates a new instance of JobQueueProvider.
     * @param scheduler The scheduler implementation to use for retrieving queue data.
     */
    constructor(private scheduler: Scheduler) {}

    /**
     * Returns the tree item representation of the given element.
     * @param element The job item or info item.
     * @returns The tree item or a promise that resolves to a tree item.
     */
    getTreeItem(element: JobItem | InfoItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Returns the child elements of the given element.
     * If slurm-dashboard.job-dashboard.showJobInfo is true, then the child elements
     * of a job item are the job info items. Otherwise, no child elements are ever
     * returned.
     * If slurm-dashboard.job-dashboard.sortBy is set, then the jobs are sorted
     * according to its value.
     * This routine also starts the timer for extrapolating job times.
     * @param element The job item or info item.
     * @returns The child job items or info items, or a promise that resolves to them.
     */
    getChildren(element?: JobItem | InfoItem): vscode.ProviderResult<JobItem[] | InfoItem[]> {
        if (element) {
            if (element instanceof JobItem) {
                return Promise.resolve(element.getChildren(this.jobItems));
            } else {
                return Promise.resolve([]);
            }
        } else {
            const showInfo = vscode.workspace
                .getConfiguration('slurm-dashboard')
                .get('job-dashboard.showJobInfo', false);
            return this.scheduler.getQueue().then(jobs => {
                const sortKey: string | null | undefined = vscode.workspace
                    .getConfiguration('slurm-dashboard')
                    .get('job-dashboard.sortBy');
                sortJobs(jobs, sortKey);

                const allItems = jobs.map(job => new JobItem(job, showInfo));
                const rootItems = allItems.filter(jobItem => !jobItem.job.isInJobArray || jobItem.job.isJobArrayRoot());
                this.startExtrapolatingJobTimes();
                this.jobItems = allItems;
                return rootItems;
            });
        }
    }

    /**
     * Registers the job dashboard tree view and commands with the extension context.
     * Begins auto-refreshing the job queue if enabled.
     * @param context The extension context.
     */
    public register(context: vscode.ExtensionContext): void {
        let jobView = vscode.window.registerTreeDataProvider('job-dashboard', this);
        context.subscriptions.push(jobView);
        vscode.commands.registerCommand('job-dashboard.refresh', () => this.refresh());
        vscode.commands.registerCommand('job-dashboard.cancel-all', () => this.cancelAll());
        vscode.commands.registerCommand('job-dashboard.cancel', (jobItem: JobItem) => this.cancel(jobItem));
        vscode.commands.registerCommand('job-dashboard.cancel-and-resubmit', (jobItem: JobItem) =>
            this.cancelAndResubmit(jobItem)
        );
        vscode.commands.registerCommand('job-dashboard.show-output', (jobItem: JobItem) => this.showOutput(jobItem));
        vscode.commands.registerCommand('job-dashboard.show-source', (jobItem: JobItem) => this.showSource(jobItem));

        this.initAutoRefresh();
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('slurm-dashboard.job-dashboard.refreshInterval')) {
                this.initAutoRefresh();
            }
        });
    }

    /**
     * Refreshes the job dashboard. Updates all tree elements.
     */
    public refresh(): void {
        this.jobItems = [];
        this._onDidChangeTreeData.fire();
    }

    /**
     * Initializes the auto refresh timer based on the configured refresh interval.
     * Clears any existing timer and restarts a new one if
     * slurm-dashboard.job-dashboard.refreshInterval is set.
     */
    private initAutoRefresh(): void {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }

        const refreshInterval: number | null | undefined = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.refreshInterval');
        if (refreshInterval) {
            this.autoRefreshTimer = setInterval(() => this.refresh(), refreshInterval * 1000);
        }
    }

    /**
     * Starts the timer for extrapolating job times. Stops any existing timer.
     * The timer is started if slurm-dashboard.job-dashboard.extrapolationInterval is set.
     */
    private startExtrapolatingJobTimes(): void {
        this.stopExtrapolatingJobTimes();

        const interval: number | null | undefined = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.extrapolationInterval');

        if (interval) {
            const since = performance.now();
            this.extrapolationTimer = setInterval(() => {
                this.jobItems.forEach(jobItem => {
                    if (jobItem.extrapolateTime(since)) {
                        this._onDidChangeTreeData.fire(jobItem);
                    }
                });
            }, interval * 1000);
        }
    }

    /**
     * Stops the timer for extrapolating job times if it is running.
     * Sets it to null.
     */
    private stopExtrapolatingJobTimes(): void {
        if (this.extrapolationTimer) {
            clearInterval(this.extrapolationTimer);
            this.extrapolationTimer = null;
        }
    }

    /**
     * Open the JobItem's output file in a VSCode text window.
     * @param jobItem The job item.
     */
    private showOutput(jobItem: JobItem): void {
        const fpath = this.scheduler.getJobOutputPath(jobItem.job);
        if (fpath) {
            vscode.workspace.openTextDocument(resolvePathRelativeToWorkspace(fpath)).then(
                doc => {
                    vscode.window.showTextDocument(doc);
                },
                error => {
                    vscode.window.showErrorMessage(`Failed to open output file ${jobItem.job.outputFile}.\n${error}`);
                }
            );
        } else {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated output file.`);
        }
    }

    /**
     * Open the JobItem's source batch file in a VSCode text window.
     * @param jobItem The job item.
     */
    private showSource(jobItem: JobItem): void {
        if (jobItem.job.batchFile) {
            const fpath = resolvePathRelativeToWorkspace(jobItem.job.batchFile);
            vscode.workspace.openTextDocument(fpath).then(
                doc => {
                    vscode.window.showTextDocument(doc);
                },
                error => {
                    vscode.window.showErrorMessage(`Failed to open batch file ${jobItem.job.batchFile}.\n${error}`);
                }
            );
        } else {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated batch file.`);
        }
    }

    /**
     * Cancels a job using the scheduler object. If slurm-dashboard.job-dashboard.promptBeforeCancel
     * is true, then a confirmation dialog is shown before canceling the job.
     * @param jobItem The job item.
     * @returns A promise that resolves to `true` if the job was canceled, or `false` otherwise.
     */
    private cancel(jobItem: JobItem): Thenable<boolean> {
        const shouldPrompt = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.promptBeforeCancel', true);
        let cancelFunc = () => {
            this.scheduler.cancelJob(jobItem.job);
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window
                .showInformationMessage(`Are you sure you want to cancel job ${jobItem.job.id}?`, 'Yes', 'No')
                .then(selection => {
                    if (selection === 'Yes') {
                        cancelFunc();
                    }
                    return selection === 'Yes';
                });
        } else {
            cancelFunc();
            return Promise.resolve(true);
        }
    }

    /**
     * Cancels a job and resubmits it using the scheduler.
     * If batchfile is not set, then an error message is shown.
     * If slurm-dashboard.job-dashboard.promptBeforeCancel is true, then a confirmation
     * dialog is shown before canceling the job.
     * @param jobItem The job item.
     * @returns A promise that resolves to `true` if the job was canceled and resubmitted, or `false` otherwise.
     */
    private cancelAndResubmit(jobItem: JobItem): Thenable<boolean> {
        if (!jobItem.job.batchFile) {
            vscode.window.showErrorMessage(`Job ${jobItem.job.id} has no associated batch file.`);
            return Promise.resolve(false);
        }

        const shouldPrompt = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.promptBeforeCancel', true);
        let cancelAndResubmitFunc = () => {
            this.scheduler.cancelJob(jobItem.job);
            this.scheduler.submitJob(jobItem.job.batchFile!);
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window
                .showInformationMessage(
                    `Are you sure you want to cancel job ${jobItem.job.id} and resubmit?`,
                    'Yes',
                    'No'
                )
                .then(selection => {
                    if (selection === 'Yes') {
                        cancelAndResubmitFunc();
                    }
                    return selection === 'Yes';
                });
        } else {
            cancelAndResubmitFunc();
            return Promise.resolve(true);
        }
    }

    /**
     * Cancels all jobs using the scheduler. If slurm-dashboard.job-dashboard.promptBeforeCancelAll
     * is true, then a confirmation dialog is shown before canceling the jobs.
     * @returns A promise that resolves to `true` if all jobs were canceled, or `false` otherwise.
     */
    private cancelAll(): Thenable<boolean> {
        const shouldPrompt = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('job-dashboard.promptBeforeCancelAll', true);
        let cancelAllFunc = () => {
            const rootItems = this.jobItems.filter(
                jobItem => jobItem.job.isJobArrayRoot() || !jobItem.job.isInJobArray
            );
            rootItems.forEach(jobItem => this.scheduler.cancelJob(jobItem.job));
            setTimeout(() => this.refresh(), 500);
        };

        if (shouldPrompt) {
            return vscode.window
                .showInformationMessage('Are you sure you want to cancel all jobs?', 'Yes', 'No')
                .then(selection => {
                    if (selection === 'Yes') {
                        cancelAllFunc();
                    }
                    return selection === 'Yes';
                });
        } else {
            cancelAllFunc();
            return Promise.resolve(true);
        }
    }
}
