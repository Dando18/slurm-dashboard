import * as vscode from 'vscode';

function getBaseName(fpath: string|vscode.Uri): string {
    return fpath.toString().split("/").pop()!;
}

function getPathRelativeToWorkspaceRoot(fpath: string|vscode.Uri): string {
    return vscode.workspace.asRelativePath(fpath, false);
}

export class JobScript extends vscode.TreeItem {
    constructor(public fpath: string | vscode.Uri) {
        super(getBaseName(fpath), vscode.TreeItemCollapsibleState.None);
        //this.iconPath = new vscode.ThemeIcon("file-code");
        this.tooltip = fpath.toString();
        this.description = getPathRelativeToWorkspaceRoot(fpath);
    }
}

export class JobScriptProvider implements vscode.TreeDataProvider<JobScript> {

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

    private async getAllJobScripts(): Promise<JobScript[]> {
        const jobScriptExts = [".slurm", ".sbatch", ".job"];

        /* find all files in workspace with job script extensions */
        let foundFiles: PromiseLike<JobScript[]>[] = [];
        jobScriptExts.forEach((ext) => {
            let jobScripts = vscode.workspace.findFiles(`**/*${ext}`)
                .then((uris) => uris.flatMap((uri) => new JobScript(uri)));
            foundFiles.push(jobScripts);
        });
        return Promise.all(foundFiles).then((jobScripts) => jobScripts.flat());
    }
}