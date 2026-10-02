# Vivo 販売ダッシュボード（単体版）

Vercel の Vivo 専用プロジェクト（Root Directory: `vivo`）が配信するフォルダです。
`index.html` は `scripts/build_vivo_standalone.py` が生成するファイルなので、直接編集しないでください。

データ更新:

```bash
python scripts/vivo_sales.py data/sales_raw/vivo_BFT.xlsx data/sales_raw/vivo_EDV.xlsx   # -> public/vivo.json
python scripts/build_vivo_standalone.py vivo/index.html --full                          # -> vivo/index.html
git add . && git commit -m "Vivo 販売データ更新" && git push   # main に入ると Vercel が再デプロイ
```
