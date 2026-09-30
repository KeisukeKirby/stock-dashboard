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
   python scripts/convert.py data/Store_Stock_XXXXXX.xlsx data/VFF_Stock_XX-XX-XX.xlsx [data/配分表.xlsx] [data/import_X.XX_move_to_branch.xlsx]
   ```

   オフィス在庫は 1 枚目のシートの B 列（商品名・カラー）、C 列（サイズ）、BN 列（Stock > Office）を読み、
   モデル・カラー・サイズで店舗の行と照合します。店舗にない商品は、オフィス在庫がある場合だけ行を追加します。Code は同じモデル・カラーの商品コードがあればサイズ部分を差し替えて補完し、分からないもの（新しいモデル・カラー）は空欄のままにします。
   右端は Store Total（店舗のみの合計、Return あり）と Company Total（店舗 + オフィス、Return なし）です。Office 列は一番左に並べます。

   3 つ目に新入荷の店舗配分表（「配分表」シートのある Excel）を渡すと、各店舗の配分数を Office から各店舗へ移して反映します
   （新入荷はオフィス在庫に含まれている前提。Company Total は変わりません）。

   4 つ目に店舗移動表（import_*_move_to_branch.xlsx）を渡すと、その「Asok」列の数を **Event Asok** 列として追加し、Office から移します
   （Event Asok は Store Total に含めず、Company Total に含めます）。移動表のコードで空欄の Code も補完します。

3. `git add . && git commit -m "在庫データ更新" && git push` — Vercel が自動で再デプロイします

## ローカルで確認

```bash
cd public && python3 -m http.server 8000
# http://localhost:8000
```

## 返品入力の共有（全員が同じ画面になる設定）

返品（Return）の入力は `api/returns.js`（Vercel Function）を通して **Upstash Redis** に保存され、同じ URL を開いている全員に共有されます（15 秒ごと・画面に戻ったときに自動更新。保存時は変更したマスだけを送るので、別の人が別のマスを同時に入力しても消えません）。

初回だけ Vercel で保存先を用意してください。

1. Vercel のプロジェクト画面 → **Storage** → **Create Database**（または Marketplace）→ **Upstash for Redis** を作成
2. 作成したデータベースを **stock-dashboard プロジェクトに接続**（環境変数 `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動で追加されます。`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` でも可）
3. **Redeploy**（再デプロイ）

設定されていない場合（ローカルで開いたときなど）は、これまでどおりブラウザの localStorage に保存され、画面に「このブラウザにのみ保存」と表示されます。

注意: 保存 API に認証はありません。URL を知っている人は誰でも返品を入力できます。

## イベント (Event Asok) の残り在庫

`scripts/event_stock.py` で「スタート在庫（EVENT_*.xlsx の「Event Asoke」列がある全シートの VFF シューズ）− 締め日までの販売数」を計算し、`data/event_asok_stock.json` に保存します。
convert.py の 5 つ目の引数に渡すと Event Asok 列に加算されます（Office は動かしません）。

```bash
python scripts/event_stock.py data/EVENT_SeP2026.xlsx 2026-09-25 data/event_orders/order_detail_202609300944_275z.xlsx
python scripts/convert.py data/Store_Stock_092526.xlsx data/VFF_Stock_25-09-26.xlsx \
    data/New_Arrival_Allocation.xlsx data/import_9.26_move_to_branch.xlsx data/event_asok_stock.json
```

POS の注文明細（data/event_orders/）は顧客情報を含むため Git には入れていません。注文明細は全期間・全系列（RC-12 / RC-15 / RB）を含む 1 ファイルを使います（複数ファイルを渡すと重複して数えるので注意）。

## 月平均販売・在庫月数

各店舗（K Village / Central CL / Siam Discovery / Paradise Park / Central LP）と Store Total の在庫数の左に「月平均販売」、右に「在庫月数（在庫 ÷ 月平均販売）」を表示します（フィルター欄のチェックで表示／非表示）。

`scripts/sales_rate.py` が 2026年1〜8月の店頭販売（VFF シューズ、オンライン注文を除く）から SKU×店舗の月平均販売足数を計算し `data/sales_rate.json` に保存、convert.py の 6 つ目の引数で在庫データに付けます。

```bash
python scripts/sales_rate.py        # data/sales_raw/ の販売明細を読む（顧客情報を含むため Git 管理外）
python scripts/convert.py data/Store_Stock_092526.xlsx data/VFF_Stock_25-09-26.xlsx data/New_Arrival_Allocation.xlsx \
    data/import_9.26_move_to_branch.xlsx data/event_asok_stock.json data/sales_rate.json
```

| 店舗 | 元データ | 対象月 |
|---|---|---|
| K Village / Central LP | EDV 受注明細 order_detail_*_7duk（倉庫 Kvillage / Coollabo Cen LP 3F） | 1〜8月 |
| Paradise Park | Barefoot 受注明細 order_detail_*_dint（倉庫 Paradise Park、店頭レジのみ） | 4〜8月（4月開店） |
| Central CL | BFT_Central_Total_Department（CHIDLOM のみ） | 1〜6月・8月（7月の明細なし） |
| Siam Discovery | Sales_Siam_Dis（商品名から SKU を判定） | 1〜8月 |

照合: K Village・Central LP は EDV 販売ダッシュボードと SKU×月で一致、Paradise Park・Central CL・Siam Discovery は販売ダッシュボードの店舗別月次と照合済み（差異は README 外のチャット記録参照）。
