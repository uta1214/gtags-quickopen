# Gtags QuickOpen

**Gtags QuickOpen** は、GNU GLOBAL (gtags) を使ってワークスペース内のファイルを素早く検索・オープンできる VS Code 拡張機能です。  
軽量で高速な検索体験を提供します。

---

## 主な機能

- ファイルの高速検索とオープン
- インクリメンタルサーチ（入力しながら絞り込み）
- ファイル名による優先スコアリング
- プレビューモード / 通常開きの切り替え設定
- 除外パターンによるファイルフィルタリング

---

## インストール方法

### Visual Studio Code Marketplace
（公開後、ここにリンクを追加）

### 手動インストール
1. このリポジトリをクローンまたはダウンロード
2. `npm install` で依存関係をインストール
3. `npm run compile` でコンパイル
4. `vsce package` で `.vsix` ファイルを作成
5. VS Code で「拡張機能」→「…」→「VSIX からインストール」を選択

---

## 使い方

1. プロジェクトのルートで `gtags` を実行してタグを作成
2. キーバインドまたはコマンドパレットから機能を呼び出す

既定のキーバインド:
| 機能 | キー |
|------|------|
| Open File | `Ctrl+Alt+P` (Mac: `Cmd+Alt+P`) |

---

## 設定

### `gtags-quickopen.pinTab`
ファイルを開く際に常にタブを固定する（プレビューモードを無効化）。  
Always pin tabs when opening files (disable preview mode).

- **型**: `boolean`
- **デフォルト**: `false` （プレビューモード）

### `gtags-quickopen.maxItems`
クイックピックに表示する最大ファイル数。  
Maximum number of files to display in the quick pick.

- **型**: `number`
- **デフォルト**: `50`
- **範囲**: `10` ～ `1000`

### `gtags-quickopen.excludePatterns`
リストから除外するファイルパターン。ワイルドカード（`*` と `**`）をサポート。  
File patterns to exclude from the list. Supports wildcards (`*` and `**`).

- **型**: `array`
- **デフォルト**: `[]`
- **例**:
  - `*.min.js` - すべての .min.js ファイルを除外
  - `node_modules/**` - node_modules 配下のすべてのファイルを除外
  - `dist/*` - dist 直下のファイルを除外
  - `**/*.test.js` - すべてのテストファイルを除外

---

## 設定例

`settings.json`:
```json
{
  "gtags-quickopen.pinTab": true,
  "gtags-quickopen.maxItems": 100,
  "gtags-quickopen.excludePatterns": [
    "*.min.js",
    "node_modules/**",
    "dist/*",
    "**/*.test.js"
  ]
}
```

VS Code の設定画面からも設定できます:
1. `Ctrl+,` (Mac: `Cmd+,`) で設定を開く
2. "Gtags QuickOpen" で検索
3. 各項目を設定

除外パターンは設定画面で「項目を追加...」をクリックして追加できます。

---

## ライセンス

このプロジェクトのライセンスは MIT です。（LICENSE ファイル参照）  
自由に利用・改変・再配布が可能です。

---

## 作者

uta