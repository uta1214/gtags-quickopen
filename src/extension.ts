import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('gtags-quickopen.openFile', async () => {
        try {
            const files = await getGtagsFiles();

            if (files.length === 0) {
                vscode.window.showWarningMessage('No files found. Make sure gtags is generated.');
                return;
            }

            // 除外パターンを適用
            const config = vscode.workspace.getConfiguration('gtags-quickopen');
            const excludePatterns = config.get<string[]>('excludePatterns', []);
            const maxItems = config.get<number>('maxItems', 50);
            
            const filteredFiles = applyExcludePatterns(files, excludePatterns);

            const quickPick = vscode.window.createQuickPick();
            quickPick.placeholder = 'Search files in workspace...';
            quickPick.matchOnDescription = false;
            quickPick.matchOnDetail = false;

            let searchValue = '';

            const allItems = filteredFiles.map(file => createQuickPickItem(file, context));
            quickPick.items = allItems.slice(0, maxItems);

            let debounceTimer: NodeJS.Timeout | undefined;

            quickPick.onDidChangeValue((value) => {
                searchValue = value;

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }

                debounceTimer = setTimeout(() => {
                    if (!searchValue) {
                        quickPick.items = allItems.slice(0, maxItems);
                        return;
                    }

                    const filtered = simpleSubstringFilter(filteredFiles, searchValue);
                    const items = filtered.slice(0, maxItems).map(file => createQuickPickItem(file, context));
                    quickPick.items = items;
                }, 50);
            });

            quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0] as QuickPickItemWithPath;
                if (selected && selected.filePath) {
                    openFile(selected.filePath);
                }
                quickPick.hide();
            });

            quickPick.onDidHide(() => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                quickPick.dispose();
            });

            quickPick.show();

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

interface QuickPickItemWithPath extends vscode.QuickPickItem {
    filePath: string;
    alwaysShow?: boolean;
}

function getMaterialIconName(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    const lowerFileName = fileName.toLowerCase();

    // 特殊なファイル名のマッピング
    const specialFiles: { [key: string]: string } = {
        'package.json': 'nodejs',
        'package-lock.json': 'nodejs',
        'tsconfig.json': 'tsconfig',
        'webpack.config.js': 'webpack',
        'dockerfile': 'docker',
        'docker-compose.yml': 'docker',
        'makefile': 'settings',
        '.gitignore': 'git',
        '.gitattributes': 'git',
        'readme.md': 'markdown',
        'readme': 'info',
        'license': 'certificate',
        '.env': 'tune',
        '.env.local': 'tune',
        '.eslintrc': 'eslint',
        '.prettierrc': 'prettier',
    };

    for (const [key, icon] of Object.entries(specialFiles)) {
        if (lowerFileName === key || lowerFileName.startsWith(key + '.')) {
            return icon;
        }
    }

    // 拡張子のマッピング
    const extensionMap: { [key: string]: string } = {
        // JavaScript/TypeScript
        'js': 'javascript',
        'jsx': 'react',
        'ts': 'typescript',
        'tsx': 'react_ts',
        'mjs': 'javascript',
        'cjs': 'javascript',
        
        // C/C++
        'c': 'c',
        'h': 'h',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'hpp': 'cpp',
        'hxx': 'cpp',
        
        // Python
        'py': 'python',
        'pyc': 'python',
        'pyd': 'python',
        'pyw': 'python',
        
        // Java
        'java': 'java',
        'class': 'java',
        'jar': 'java',
        
        // Web
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'sass',
        'sass': 'sass',
        'less': 'less',
        
        // PHP
        'php': 'php',
        
        // Go
        'go': 'go',
        
        // Rust
        'rs': 'rust',
        
        // Ruby
        'rb': 'ruby',
        
        // Shell
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'fish': 'shell',
        
        // Data/Config
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'toml': 'toml',
        'xml': 'xml',
        'ini': 'settings',
        'conf': 'settings',
        'config': 'settings',
        
        // Markdown/Docs
        'md': 'markdown',
        'txt': 'document',
        
        // SQL
        'sql': 'database',
        
        // Other
        'proto': 'proto',
        'graphql': 'graphql',
        'gql': 'graphql',
        'vue': 'vue',
        'svelte': 'svelte',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'r': 'r',
        'dart': 'dart',
        'lua': 'lua',
        'perl': 'perl',
        'pl': 'perl',
    };

    if (extension && extensionMap[extension]) {
        return extensionMap[extension];
    }

    return 'file';
}

function getFileIcon(filePath: string, context: vscode.ExtensionContext): { light: vscode.Uri; dark: vscode.Uri } | vscode.ThemeIcon {
    const iconName = getMaterialIconName(filePath);
    
    // Material Icon Themeのアイコンパスを構築
    // icons/ フォルダに Material Icon Theme の SVG ファイルを配置する必要があります
    const lightIconPath = vscode.Uri.file(
        path.join(context.extensionPath, 'icons', `${iconName}.svg`)
    );
    const darkIconPath = vscode.Uri.file(
        path.join(context.extensionPath, 'icons', `${iconName}.svg`)
    );

    // アイコンファイルが存在しない場合のフォールバック
    try {
        return { light: lightIconPath, dark: darkIconPath };
    } catch {
        return new vscode.ThemeIcon('file');
    }
}

function createQuickPickItem(filePath: string, context: vscode.ExtensionContext): QuickPickItemWithPath {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const fileName = filePath.split('/').pop() || filePath;
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));

    let absolutePath: string;
    if (filePath.startsWith('/')) {
        absolutePath = filePath;
    } else {
        absolutePath = workspaceFolder
            ? `${workspaceFolder.uri.fsPath}/${filePath}`
            : filePath;
    }

    return {
        label: fileName,
        description: folderPath.replace(workspaceFolder?.uri.fsPath || '', ''),
        filePath: absolutePath,
        alwaysShow: true,
        iconPath: getFileIcon(filePath, context)
    };
}

function getGtagsFiles(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceFolder) {
            reject(new Error('No workspace folder open'));
            return;
        }

        const global = spawn('global', ['-P'], {
            cwd: workspaceFolder
        });

        let stdout = '';
        let stderr = '';

        global.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        global.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        global.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`global command failed: ${stderr}`));
                return;
            }

            const files = stdout
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            resolve(files);
        });

        global.on('error', (err) => {
            reject(new Error(`Failed to execute global: ${err.message}`));
        });
    });
}

function simpleSubstringFilter(files: string[], query: string): string[] {
    const queryParts = query.toLowerCase().split(/\s+/).filter(q => q.length > 0);

    if (queryParts.length === 0) {
        return files;
    }

    const matches: Array<{ file: string; score: number }> = [];

    for (const file of files) {
        const lowerFile = file.toLowerCase();
        const fileName = file.split('/').pop()?.toLowerCase() || '';

        let allIncluded = true;
        for (const part of queryParts) {
            if (!lowerFile.includes(part)) {
                allIncluded = false;
                break;
            }
        }

        if (!allIncluded) continue;

        let score = 0;
        let fileNameMatchCount = 0;
        for (const part of queryParts) {
            if (fileName.includes(part)) fileNameMatchCount++;
        }

        if (fileNameMatchCount === queryParts.length) {
            score += 50000;
            score += 10000 / fileName.length;
        } else if (fileNameMatchCount > 0) {
            score += 10000 * fileNameMatchCount;
        } else {
            score += 1000;
        }

        const firstPartIndex = lowerFile.indexOf(queryParts[0]);
        score += 1000 / (firstPartIndex + 1);
        score += 100 / (file.length + 1);

        matches.push({ file, score });
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.map(m => m.file);
}

async function openFile(filePath: string) {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        let uri: vscode.Uri;

        if (filePath.startsWith('/')) {
            uri = vscode.Uri.file(filePath);
        } else {
            uri = workspaceFolder
                ? vscode.Uri.joinPath(workspaceFolder.uri, filePath)
                : vscode.Uri.file(filePath);
        }

        const document = await vscode.workspace.openTextDocument(uri);
        
        // 設定から通常開きモードを取得
        const config = vscode.workspace.getConfiguration('gtags-quickopen');
        const pinTab = config.get<boolean>('pinTab', false);
        
        await vscode.window.showTextDocument(document, {
            preview: !pinTab
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
}

function applyExcludePatterns(files: string[], patterns: string[]): string[] {
    if (patterns.length === 0) {
        return files;
    }

    return files.filter(file => {
        for (const pattern of patterns) {
            if (matchPattern(file, pattern)) {
                return false; // 除外
            }
        }
        return true; // 含める
    });
}

function matchPattern(filePath: string, pattern: string): boolean {
    // パターンを正規表現に変換
    // * → [^/]* (スラッシュ以外の任意の文字)
    // ** → .* (任意の文字列)
    
    let regexPattern = pattern
        .replace(/\./g, '\\.')  // . をエスケープ
        .replace(/\*\*/g, '§§§') // ** を一時的にマーク
        .replace(/\*/g, '[^/]*')  // * を [^/]* に変換
        .replace(/§§§/g, '.*');   // ** を .* に変換
    
    // パターンの最初と最後に ^ と $ を追加しない（部分一致を許可）
    const regex = new RegExp(regexPattern);
    
    return regex.test(filePath);
}

export function deactivate() {}