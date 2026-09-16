# Obsidian Daily Logger v1.0

## 1. このツールについて

ChatGPT の表示中の会話と手動メモをローカルへ収集し、OpenAI Responses API で事実・決定・提案を区別して整理し、Obsidian Daily Note の管理領域へ記録します。会話の raw data は Windows PC 内に残り、要約時だけ必要な本文を OpenAI へ送ります。

## 2. アーキテクチャ

Manifest V3 Chrome 拡張（DOM adapter、debounced snapshot、offline queue、popup/options）と、`127.0.0.1:8765` 限定の Node.js サービス（認証、検証、保存、要約、atomic note writer）に分離しています。拡張は Vault や API key にアクセスしません。詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## 3. 必要環境

- Windows 10/11、Google Chrome、Obsidian Desktop
- Node.js 20 以上、npm
- OpenAI API key（要約を使う場合）

## 4–5. インストールとビルド

```powershell
npm install
npm run build
```

`dist/extension` と `dist/local` が生成されます。`dist/` と実行バイナリは Git 管理対象外です。

## 6. Local Service インストール

管理者権限を必要としない通常の PowerShell で、ビルド後に実行します。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Vault path、Daily folder、timezone、summary time を入力します。既存 config は上書きしません。表示された認証トークンは拡張の設定画面へ入力してください。

## 7. Chrome 拡張読み込み

`chrome://extensions` →「デベロッパーモード」→「パッケージ化されていない拡張機能を読み込む」で `dist/extension` を選びます。設定画面で installer が表示した token を保存し、Connection Test を行います。

## 8. Obsidian Vault 設定

installer または options で Vault の絶対パスと Daily Notes folder を設定します。ファイル名形式は v1.0 では `YYYY-MM-DD` です。ODL は `<!-- ODL:START -->` と `<!-- ODL:END -->` の間だけを管理します。**マーカー外のユーザー編集は削除しません**。更新直前の `.bak` を1世代保存します。

## 9. OpenAI API 設定

API key は config や拡張へ入力せず、Windows 環境変数に設定します。新しい値は新規プロセスから有効です。

```powershell
setx OPENAI_API_KEY "YOUR_API_KEY"
setx OPENAI_MODEL "利用するモデル名"
```

モデルは options/config の値が優先され、空なら `OPENAI_MODEL` を使います。ソースコードにモデルは固定していません。`summary.provider=none` では収集だけを行い、要約要求は明示的に失敗します。

## 10. 自動実行設定

installer はログオン時の service と、既定 00:05 の前日要約を Task Scheduler に登録します。日次タスクは `StartWhenAvailable`、15分間隔で最大4回の再試行を設定します。

## 11. 手動要約

```powershell
npm run odl -- summarize --date today
npm run odl -- summarize --date yesterday
npm run odl -- summarize --date 2026-09-17
```

対象データがなければ `NO_DATA` で正常終了し、ノートを作成・変更しません。再実行時は ODL block のみ置換します。

## 12. データ保存場所

`%LOCALAPPDATA%\ObsidianDailyLogger` 以下の `config/`, `data/conversations/`, `data/events/`, `data/manual-notes/`, `data/summaries/`, `logs/` へ保存します。通常ログに token、API key、会話本文全体を出しません。データ形式は [docs/data-format.md](docs/data-format.md) を参照してください。

## 13. アンインストール

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

タスクだけを削除し、config、ログ、会話は安全のため保持します。不要ならユーザー自身が確認後にデータ directory を削除してください。

## 14. トラブルシューティング

`scripts/test-service.ps1` で認証付き health check を実行できます。詳しくは [docs/troubleshooting.md](docs/troubleshooting.md) を参照してください。

## 15. プライバシーと既知の制限

- Cookie、ChatGPT API 通信、閲覧履歴は読みません。対象は `chatgpt.com` の DOM のみです。
- ChatGPT DOM 変更時は adapter selector の更新が必要になる場合があります。
- 初回自動 snapshot は baseline 扱いです。「現在の会話を同期」で明示的に当日へ含められます。
- Chrome host permission は既定 port 8765 のみです。port を変える場合は manifest の host permission もビルド前に調整が必要です。
- Windows Task Scheduler の実機動作は Windows 上で確認してください。

## 開発用コマンド

`npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run service`, `npm run odl -- ...` を利用できます。
