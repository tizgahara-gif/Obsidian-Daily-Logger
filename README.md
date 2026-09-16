# Obsidian Daily Logger v1.1

ChatGPTをPC版Chromeで通常どおり利用するだけで、会話をLocal Serviceへ自動記録するManifest V3拡張です。Popupを開く操作や同期・保存・記録開始操作は不要です。

## 構成

- `extension/`: 初期DOMのbaseline登録、MutationObserverによるactive捕捉、SPA再初期化、ストリーミングdebounce、永続offline queue、状態Popup、Recovery画面。
- `service/`: canonical messageのupsert/deduplicate、activity date算出、manual import監査情報、Daily抽出を提供するローカルHTTPサービス。
- `test/`: 新規・既存会話、リロード、スマホ会話+PC継続、streaming、Recovery、offline queueを検証する受け入れテスト。

## 起動

```bash
npm start
```

Chromeの「パッケージ化されていない拡張機能を読み込む」で `extension/` を選択します。サービスは既定で `127.0.0.1:27123`、データは `.daily-logger/state.json` に保存します。

## 記録モデル

- `baseline`: ページ／会話の初期化時にDOMに存在した未知メッセージ。Daily対象外。
- `active`: 初期化後にDOMへ現れたuser/assistantメッセージ。検出時刻をサービスのtimezone/day boundaryで日付化。
- `manual_import`: 詳細設定の「過去会話の回収」で指定日へ回収した未知メッセージ。`target_date` と `imported_at` を別々に保持。
- `manual_note`: 任意のクイックメモ。

同一性は `conversation_id + message_key + ordinal + role` です。既知メッセージの本文は更新しますが、最初に確定したclassificationは変更しません。これによりリロード、複数タブ、SPA再訪、AssistantのstreamingでDaily entryが重複しません。

サービス停止時は `chrome.storage.local.pendingQueue` へ保存します。1分ごとのhealth checkで復旧を検出し、batch ACK確認後だけ送信済みsnapshotを削除します。

## Daily Summary連携

`GET /v1/daily?date=YYYY-MM-DD` は、その日の `active`、指定日が一致する `manual_import`、および `manual_note` のみ返します。baselineは除外され、raw canonical dataは要約後も削除されないため、00:05の外部Summary schedulerから安全に再要約できます。
