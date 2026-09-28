"""Excel (Store_Stock_*.xlsx) の「VFF Shoes Stock」シートを public/stock.json に変換する。

使い方:
    pip install openpyxl
    python scripts/convert.py data/Store_Stock_092526.xlsx

Excel 側で保存時に計算済みの値 (data_only) を読み込むため、
Excel で一度保存したファイルを使ってください。
"""
import json
import re
import shutil
import sys
from pathlib import Path

import openpyxl

SHEET = "VFF Shoes Stock"
PUBLIC = Path(__file__).resolve().parent.parent / "public"
OUT = PUBLIC / "stock.json"
XLSX_COPY = PUBLIC / "source.xlsx"  # 画面の「元の Excel をダウンロード」用


def num(v):
    return int(v) if isinstance(v, (int, float)) else 0


def cell(v):
    """空セルは None (表示も空欄) のまま残す。"""
    return int(v) if isinstance(v, (int, float)) else None


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET] if SHEET in wb.sheetnames else wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))

    title = rows[0][0] or "Inventory"
    as_of = rows[1][0] or ""
    header = rows[2]

    # 店舗は E 列から 2 列ずつ (Quantity / Return)。"Total" 列の手前まで。
    stores = []
    col = 4
    while col < len(header) and header[col] and str(header[col]).strip() != "Total":
        stores.append({"name": str(header[col]).strip(), "col": col})
        col += 2

    total_col = col  # "Total" 列 (Quantity, Return)
    items = []
    total_row = None
    for r in rows[4:]:
        code = r[0]
        if not code:
            continue
        if str(code).strip() == "Total":
            total_row = {
                "qty": [cell(r[s["col"]]) for s in stores] + [cell(r[total_col])],
                "ret": [cell(r[s["col"] + 1]) for s in stores] + [cell(r[total_col + 1])],
            }
            continue
        qty = [num(r[s["col"]]) for s in stores]
        ret = [cell(r[s["col"] + 1]) for s in stores]
        items.append({
            "code": str(code).strip(),
            "model": (r[1] or "").strip(),
            "color": (r[2] or "").strip(),
            "size": str(r[3] or "").strip(),
            "qty": qty,
            "ret": ret,
            "totalQty": cell(r[total_col]),
            "totalRet": cell(r[total_col + 1]),
        })

    m = re.search(r"(\d{2}/\d{2}/\d{4})", str(as_of))
    data = {
        "title": title,
        "asOf": as_of,
        "asOfDate": m.group(1) if m else "",
        "source": Path(path).name,
        "stores": [s["name"] for s in stores],
        "items": items,
        "totalRow": total_row,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    shutil.copyfile(path, XLSX_COPY)
    total = sum(sum(i["qty"]) for i in items)
    print(f"{len(items)} rows, {len(stores)} stores, total qty {total} -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/Store_Stock_092526.xlsx")
