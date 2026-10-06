# 筋トレ・健康管理ダッシュボード（単体版）

Vercel の健康管理専用プロジェクト（Root Directory: `health`）が配信するフォルダです。
`index.html` は `scripts/build_health_standalone.py` が生成するファイルなので、直接編集しないでください。
計画・ルールの文言は `public/health.js`、見た目は `public/health.css` を直して作り直します。

```bash
python scripts/build_health_standalone.py health/index.html --full   # -> health/index.html
git add . && git commit -m "健康ダッシュボード更新" && git push         # main に入ると Vercel が再デプロイ
```

Vercel 側の初回設定（1 回だけ）: Vercel → Add New → Project → この GitHub リポジトリを選ぶ → **Root Directory を `health`** にして Deploy。
Framework Preset は Other、ビルドコマンドなし。記録は閲覧するブラウザの localStorage に保存されます。
