# Architecture

Content script は `ChatGPTAdapter` だけを通じて user/assistant DOM を読み、MutationObserver を 1500ms debounce して conversation snapshot を service worker へ渡す。SPA navigation では adapter を再生成する。service worker は localhost 送信失敗を最大1000件の `chrome.storage.local` queue に保持する。

Local service は loopback のみで listen し、全 API に 256-bit token を要求する。Zod で request/config/summary を検証し、canonical conversation と append-only JSONL event を保存する。要約は conversation chunk → thread digest → daily aggregate の二段階で、validated JSON からプログラムが Markdown を生成する。Obsidian writer は backup、temporary file、fsync、rename の順で更新する。
