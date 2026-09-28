# 店舗在庫ダッシュボード

`Store_Stock_*.xlsx`（VFF Shoes Stock シート）を、そのままの表構成でブラウザで見られるダッシュボードにしたものです。

画面の構成:

- （詳細タブ）**サマリー**: 総在庫数・SKU 数・全店在庫切れ・残りわずか（在庫切れ／残りわずかはクリックで一覧を絞り込み）
- （詳細タブ）**グラフ**: 店舗別（クリックでその店舗の在庫が多い順に並び替え）、モデル別（クリックでそのモデルに絞り込み）
- **在庫一覧タブ**: Excel と同じ表を全行表示（枠内スクロールなし・画面幅に合わせて自動縮小）。検索・絞り込み・並び替え、表示中の行を CSV で保存
- **詳細タブ**: サマリーとグラフ（クリックすると条件を反映して在庫一覧タブへ移動）

在庫一覧の表は Excel の書式をそのまま再現しています。

- 見出し：紺 (#1F4E78)／Return 見出しは金 (#BF8F00)、白太字・中央揃え
- Return 列：薄黄 (#FFF2CC)・青字、Total 列は太字、Total 行は薄青 (#D9E1F2)
- 表示形式 `#,##0;(#,##0);-`（0 は「-」、空セルは空欄）
- 列幅・行高は Excel と同じ、1〜4 行目は固定（ウィンドウ枠の固定 A5 と同じ）
- 絞り込み中の Total 行は表示中の行の合計

## 構成

```
public/          # Vercel が配信する静的ファイル（ビルド不要）
  index.html
  style.css
  app.js
  stock.json     # Excel から生成したデータ
  source.xlsx    # 元の Excel（ダウンロード用、convert.py がコピー）
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
