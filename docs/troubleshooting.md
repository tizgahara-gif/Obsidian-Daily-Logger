# Troubleshooting

- **Local Serviceに接続できません**: Task Scheduler の service task、Node.js、port 8765 を確認し `scripts/test-service.ps1` を実行する。
- **401 / AUTH_FAILED**: `%LOCALAPPDATA%\ObsidianDailyLogger\config\auth-token` の値を options に再入力する。
- **VAULT_NOT_FOUND / WRITABLE**: config の path、directory の存在、Windows user の書込権限を確認する。`.obsidian` 不在は警告相当で処理を禁止しない。
- **OPENAI_API_ERROR**: 新しい terminal/service process に `OPENAI_API_KEY` とモデルが設定されているか確認する。raw logs は削除されないため再実行できる。
- **DOM captureなし**: ChatGPT の DOM 変更の可能性がある。fixture と adapter selector を更新する。
