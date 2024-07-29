import * as vscode from 'vscode';
import { Scheduler } from './scheduler';
import { getBaseName, getPathRelativeToWorkspaceRoot } from './fileutilities';

/**
 * Represents a job script item in the tree view. Each item corresponds
 * to a job script file in the workspace.
 */
export class JobScript extends vscode.TreeItem {
    /**
     * Creates a new instance of the JobScript class.
     * @param fpath The file path or URI of the job script.
     * @param stat The file stat of the job script.
     */
    constructor(
        public fpath: string | vscode.Uri,
        public stat?: vscode.FileStat
    ) {
        super(getBaseName(fpath), vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.tooltip = fpath.toString();
        this.description = getPathRelativeToWorkspaceRoot(fpath);
        this.command = {
            title: 'Show Source',
            command: 'submit-dashboard.show-source',
            arguments: [this],
        };
    }
}

/**
 * Sorts an array of JobScript objects based on the specified key.
 *
 * @param scripts - The array of JobScript objects to be sorted.
 * @param key - The key to determine the sorting order. Valid keys are "filename", "rel path", "last modified", "newest", and "oldest".
 * @returns void
 */
export function sortJobsScripts(scripts: JobScript[], key: string | null | undefined): void {
    if (!key) {
        return;
    }

    const AVAILABLE_KEYS = ['filename', 'rel path', 'last modified', 'newest', 'oldest'];
    if (!AVAILABLE_KEYS.includes(key)) {
        vscode.window.showErrorMessage(`Invalid sort key: ${key}`);
        return;
    }

    scripts.sort((a, b) => {
        if (key === 'filename') {
            return getBaseName(a.fpath).localeCompare(getBaseName(b.fpath));
        } else if (key === 'rel path') {
            return getPathRelativeToWorkspaceRoot(a.fpath).localeCompare(getPathRelativeToWorkspaceRoot(b.fpath));
        } else if (key === 'last modified') {
            if (a.stat && b.stat) {
                return b.stat.mtime - a.stat.mtime;
                /* c8 ignore next 3 */
            } else {
                return 0;
            }
        } else if (key === 'newest' || key === 'oldest') {
            if (a.stat && b.stat) {
                return key === 'newest' ? b.stat.ctime - a.stat.ctime : a.stat.ctime - b.stat.ctime;
                /* c8 ignore next 3 */
            } else {
                return 0;
            }
            /* c8 ignore next 3 */
        } else {
            return 0;
        }
    });
}

/**
 * Represents a provider for job scripts in the tree view.
 */
export class JobScriptProvider implements vscode.TreeDataProvider<JobScript> {
    private jobScripts: JobScript[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<JobScript | undefined | null | void> = new vscode.EventEmitter<
        JobScript | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<JobScript | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Creates a new instance of JobScriptProvider. Scheduler object is used
     * for submitting jobs.
     * @param scheduler The scheduler used for submitting jobs.
     */
    constructor(private scheduler: Scheduler) {}

    /**
     * Gets the tree item for the specified element.
     * @param element The job script element.
     * @returns The tree item representing the job script.
     */
    getTreeItem(element: JobScript): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Gets the children of the specified element. Yields all job scripts in the workspace.
     * @param element The job script element.
     * @returns The children of the job script element.
     */
    getChildren(element?: JobScript): vscode.ProviderResult<JobScript[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getAllJobScripts());
        }
    }

    private getJobScriptFilePatterns(): string[] {
        /* first check if slurm-dashboard.submit-dashboard.jobScriptExtensions
           is not set to the default. If so, show a warning message, since
           this is deprecated.
        */
        const jobScriptExts = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('submit-dashboard.jobScriptExtensions', ['.slurm', '.sbatch', '.job']);
        /* c8 ignore next 6 */
        if (JSON.stringify(jobScriptExts) !== JSON.stringify(['.slurm', '.sbatch', '.job'])) {
            vscode.window.showWarningMessage(
                'The slurm-dashboard.submit-dashboard.jobScriptExtensions setting has been modified, but ' +
                    'is deprecated. It will be removed in a future version. Please use the ' +
                    'slurm-dashboard.submit-dashboard.jobScriptPatterns setting instead.'
            );
        }

        /* grab the glob patterns from the jobScriptPatterns setting */
        const jobScriptPatterns = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('submit-dashboard.jobScriptPatterns', ['**/*.slurm', '**/*.sbatch', '**/*.job']);
        return jobScriptPatterns;
    }

    /**
     * Retrieves all job scripts in the workspace.
     * Searches for job scripts based on the extensions specified by
     * the slurm-dashboard.submit-dashboard.jobScriptExtensions setting.
     * Sorts the job scripts based on the slurm-dashboard.submit-dashboard.sortBy setting.
     * @returns A promise that resolves to an array of job scripts.
     */
    private getAllJobScripts(): Promise<JobScript[]> {
        const patterns = this.getJobScriptFilePatterns();

        /* find all files in workspace with job script extensions */
        let foundFiles: PromiseLike<JobScript[]>[] = [];
        patterns.forEach(pattern => {
            let jobScripts = vscode.workspace.findFiles(pattern).then(uris => {
                let stats = uris.map(uri => vscode.workspace.fs.stat(uri));
                return Promise.all(stats).then(stats => {
                    return uris.map((uri, i) => new JobScript(uri, stats[i]));
                });
            });
            foundFiles.push(jobScripts);
        });
        return Promise.all(foundFiles).then(jobScripts => {
            const sortKey: string | null | undefined = vscode.workspace
                .getConfiguration('slurm-dashboard')
                .get('submit-dashboard.sortBy');
            const scripts = jobScripts.flat();
            sortJobsScripts(scripts, sortKey);
            this.jobScripts = scripts;
            return scripts;
        });
    }

    /**
     * Registers the JobScriptProvider with the extension context.
     * @param context The extension context.
     */
    public register(context: vscode.ExtensionContext): void {
        let submitView = vscode.window.registerTreeDataProvider('submit-dashboard', this);
        context.subscriptions.push(submitView);

        vscode.commands.registerCommand('submit-dashboard.refresh', () => this.refresh());
        vscode.commands.registerCommand('submit-dashboard.submit-all', () => this.submitAll());
        vscode.commands.registerCommand('submit-dashboard.submit', (jobScript: JobScript) => this.submit(jobScript));
        vscode.commands.registerCommand('submit-dashboard.show-source', (jobScript: JobScript) =>
            this.showSource(jobScript)
        );
    }

    /**
     * Refreshes the tree view by clearing the job scripts. Refreshes
     * the entire tree view.
     */
    public refresh(): void {
        this.jobScripts = [];
        this._onDidChangeTreeData.fire();
    }

    /**
     * Submits all job scripts.
     * if slurm-dashboard.submit-dashboard.promptBeforeSubmitAll is true, then
     * prompts the user before submitting all job scripts.
     * @returns A promise that resolves to true if all job scripts were submitted, false otherwise.
     */
    private submitAll(): Thenable<boolean> {
        const shouldPrompt: boolean = vscode.workspace
            .getConfiguration('slurm-dashboard')
            .get('submit-dashboard.promptBeforeSubmitAll', true);

        if (shouldPrompt) {
            /* c8 ignore start */
            const numJobs = this.jobScripts.length;
            return vscode.window
                .showInformationMessage(`Are you sure you want to submit all ${numJobs} jobs?`, 'Yes', 'No')
                .then(value => {
                    if (value === 'Yes') {
                        this.jobScripts.forEach(jobScript => this.submit(jobScript));
                    }
                    return value === 'Yes';
                });
            /* c8 ignore stop */
        } else {
            this.jobScripts.forEach(jobScript => this.submit(jobScript));
            return Promise.resolve(true);
        }
    }

    /**
     * Submits a job script. Uses the scheduler object to submit the job.
     * @param jobScript The job script to submit.
     */
    private submit(jobScript: JobScript): void {
        this.scheduler.submitJob(jobScript.fpath);
    }

    /**
     * Shows the source code of a job script in a new editor tab.
     * @param jobScript The job script to show the source code for.
     */
    private showSource(jobScript: JobScript): void {
        const fpath = jobScript.fpath as vscode.Uri;
        vscode.workspace.openTextDocument(fpath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }
}
