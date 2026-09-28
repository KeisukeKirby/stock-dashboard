# 店舗在庫ダッシュボード

`Store_Stock_*.xlsx`（VFF Shoes Stock シート）を、そのままの表構成でブラウザで見られるダッシュボードにしたものです。

- 総在庫・SKU 数・在庫切れ・残りわずかのサマリー
- 店舗別／モデル別の在庫グラフ（クリックで並び替え・絞り込み）
- Excel と同じ列構成の在庫一覧（在庫数が多いほど濃い青、検索・絞り込み・並び替え、返品列の表示切替）
- ライト／ダークモード対応

## 構成

```
public/          # Vercel が配信する静的ファイル（ビルド不要）
  index.html
  style.css
  app.js
  stock.json     # Excel から生成したデータ
scripts/convert.py  # Excel → public/stock.json 変換
data/            # 元の Excel ファイル
vercel.json
```

## データの更新手順

1. 新しい Excel を `data/` に置く（Excel で一度保存して、数式の計算結果が入った状態にしてください）
2. 変換を実行

   ```bash
   pip install openpyxl
   python scripts/convert.py data/Store_Stock_XXXXXX.xlsx
   ```

3. `git add . && git commit -m "在庫データ更新" && git push` — Vercel が自動で再デプロイします

## ローカルで確認

```bash
cd public && python3 -m http.server 8000
# http://localhost:8000
```
