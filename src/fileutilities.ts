import * as vscode from 'vscode';

/**
 * Resolves the path relative to the workspace.
 * If the path is not an absolute path or a file URI, it is resolved relative to the workspace root.
 * If the path is already an absolute path or a file URI, it is returned as is.
 * 
 * @param fpath - The path to resolve.
 * @returns The resolved path as a `vscode.Uri` object.
 */
export function resolvePathRelativeToWorkspace(fpath: string): vscode.Uri {
    if (vscode.workspace.workspaceFolders && fpath[0] !== "/" && !fpath.startsWith("file://")) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        return vscode.Uri.joinPath(workspaceRoot, fpath);
    } else {
        return vscode.Uri.file(fpath);
    }
}

/**
 * Returns the parent directory of the given file path.
 * 
 * @param fpath - The file path.
 * @returns The parent directory of the file path.
 */
export function getParentDirectory(fpath: string): string {
    return fpath.split("/").slice(0, -1).join("/");
}

/**
 * Returns the base name of a file path.
 * @param fpath - The file path.
 * @returns The base name of the file path.
 */
export function getBaseName(fpath: string|vscode.Uri): string {
    return fpath.toString().split("/").pop()!;
}

/**
 * Returns the path relative to the workspace root.
 * @param fpath - The file path or URI.
 * @returns The relative path.
 */
export function getPathRelativeToWorkspaceRoot(fpath: string|vscode.Uri): string {
    return vscode.workspace.asRelativePath(fpath, false);
}
