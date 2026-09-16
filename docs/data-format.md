# Data format

- `conversations/*.json`: message key ごとの canonical state。`first_seen_at`, `last_seen_at`, `baseline` を保持する。
- `events/YYYY-MM-DD.jsonl`: `message_seen` / `message_updated` の append-only 監査記録。
- `manual-notes/YYYY-MM-DD.jsonl`: UUID 付き手動メモ。
- `summaries/YYYY-MM-DD.json`: schema validation 済み daily summary。

論理日付は設定 timezone と `dayBoundaryHour` で決める。message key が一致する snapshot は canonical state の同じ項目を更新し、streaming 本文を別メッセージに増殖させない。
