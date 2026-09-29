# 店舗・オフィス在庫ダッシュボード

`Store_Stock_*.xlsx`（VFF Shoes Stock シート）を、そのままの表構成でブラウザで見られるダッシュボードにしたものです。

画面の構成:

- （詳細タブ）**サマリー**: 総在庫数・SKU 数・全店在庫切れ・残りわずか（在庫切れ／残りわずかはクリックで一覧を絞り込み）
- （詳細タブ）**グラフ**: 店舗別（クリックでその店舗の在庫が多い順に並び替え）、モデル別（クリックでそのモデルに絞り込み）
- **在庫一覧タブ**: Excel と同じ表を全行表示（枠内スクロールなし・画面幅に合わせて自動縮小）。検索・絞り込み・並び替え、表示中の行を CSV で保存
- **見出しの ▼ フィルター**: Excel のオートフィルターと同じく、Code / Model / Color / Size は複数の値をチェックで選択、各 Quantity は「1 以上」「0」「範囲指定」で絞り込み。かかっているフィルターは表の上に一覧表示（× で個別解除）。上部のモデル・カラー・サイズも同じ複数選択のフィルター（どちらから選んでも同じ条件）
- **範囲選択で集計**: 表のマスをドラッグすると、選んだ範囲のデータの個数・行数を画面下に表示し、数量のマスがあれば合計・平均・数値の個数も表示（Excel のステータスバーと同じ）。Shift+クリックで範囲を広げる、Ctrl+C でタブ区切りコピー、Esc で解除
- **言語切り替え**: 右上のボタンで 日本語 / English / ไทย（選択はブラウザに記憶。初回は端末の言語設定で自動選択、該当なしは英語）。翻訳は public/i18n.js。在庫表の中は Excel と同じ英語のまま
- **Excel で出力**: Return の入力を反映した表示中の行を、元の Excel と同じ書式の .xlsx で出力（2 枚目のシート「Returns」に入力した返品の一覧）。ExcelJS を public/vendor に同梱
- **詳細タブ**: サマリーとグラフ（クリックすると条件を反映して在庫一覧タブへ移動）

在庫一覧の表は Excel の書式をそのまま再現しています。

- 見出し：紺 (#1F4E78)／Return 見出しは金 (#BF8F00)、白太字・中央揃え
- Return 列：薄黄 (#FFF2CC)・青字、Total 列は太字、Total 行は薄青 (#D9E1F2)
- 表示形式 `#,##0;(#,##0);-`（0 は「-」、空セルは空欄）
- 列幅・行高は Excel と同じ、1〜4 行目は固定（ウィンドウ枠の固定 A5 と同じ）
- 絞り込み中の Total 行は表示中の行の合計
- Office 列は一番左で、Return 欄なし
- 各店舗の黄色の Return 欄に返品数を入力でき、その数だけ店舗の Quantity が減り Office の Quantity が増える（Store Total は減り、Company Total は変わらない）。入力後「保存」ボタン（Ctrl+S）で保存するとウィンドウを閉じても残る（ブラウザの localStorage に基準日ごとに保存。他の人・他の端末とは共有されない）。未保存のまま閉じようとすると確認が出る

## 構成

```
public/          # Vercel が配信する静的ファイル（ビルド不要）
  index.html
  style.css
  app.js
  stock.json     # Excel から生成したデータ
  source.xlsx    # 店舗在庫の Excel（ダウンロード用、convert.py がコピー）
  source_office.xlsx  # オフィス在庫の Excel（同上）
scripts/convert.py  # Excel → public/stock.json 変換
data/            # 元の Excel ファイル
vercel.json
```

## データの更新手順

1. 新しい Excel を `data/` に置く（Excel で一度保存して、数式の計算結果が入った状態にしてください）
2. 変換を実行（2 つ目にオフィス在庫の Excel を渡すと「Office」列が追加されます）

   ```bash
   pip install openpyxl
   python scripts/convert.py data/Store_Stock_XXXXXX.xlsx data/VFF_Stock_XX-XX-XX.xlsx
   ```

   オフィス在庫は 1 枚目のシートの B 列（商品名・カラー）、C 列（サイズ）、BN 列（Stock > Office）を読み、
   モデル・カラー・サイズで店舗の行と照合します。店舗にない商品は、オフィス在庫がある場合だけ行を追加します。Code は同じモデル・カラーの商品コードがあればサイズ部分を差し替えて補完し、分からないもの（新しいモデル・カラー）は空欄のままにします。
   右端は Store Total（店舗のみの合計、Return あり）と Company Total（店舗 + オフィス、Return なし）です。Office 列は一番左に並べます。

3. `git add . && git commit -m "在庫データ更新" && git push` — Vercel が自動で再デプロイします

## ローカルで確認

```bash
cd public && python3 -m http.server 8000
# http://localhost:8000
```
