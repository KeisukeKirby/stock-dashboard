# ビジネスメモ帳（単体版）

Vercel のメモ帳専用プロジェクト `business-memo`（Root Directory: `memo`）が配信するフォルダです。
`index.html` は `scripts/build_memo_standalone.py` が生成するファイルなので、直接編集しないでください。

則の追加・修正:

```bash
# public/memo.json を編集してから
python scripts/build_memo_standalone.py memo/index.html --full   # -> memo/index.html
git add . && git commit -m "メモ帳更新" && git push                # 既定ブランチに入ると Vercel が再デプロイ
```
