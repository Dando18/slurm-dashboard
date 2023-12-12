import * as vscode from 'vscode';

/**
 * Resolve relative path to workspace. If fpath is relative, then return its
 * absolute path in the workspace. If fpath is absolute, then it as is.
 */
export function resolvePathRelativeToWorkspace(fpath: string): vscode.Uri {
    if (vscode.workspace.workspaceFolders && fpath[0] !== "/" && !fpath.startsWith("file://")) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        return vscode.Uri.joinPath(workspaceRoot, fpath);
    } else {
        return vscode.Uri.file(fpath);
    }
}