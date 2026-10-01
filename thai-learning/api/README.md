# api/（Phase 2 用に予約）

Vercel Serverless Functions の置き場。Phase 1 では何も置かない。

Phase 2 の AI 会話ロールプレイでは `api/chat.ts` を追加し、
環境変数 `ANTHROPIC_API_KEY` を使って Claude API を呼ぶ（モデル名は実装時に公式ドキュメントで確認）。
フロントからは `fetch('/api/chat')` で呼ぶ。`vercel.json` の rewrite は `/api/*` を除外済み。
