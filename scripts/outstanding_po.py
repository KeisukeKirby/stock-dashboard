"""Outstanding PO (発注済み・未入荷) の Excel → public/outstanding_po.json

使い方:  python3 scripts/outstanding_po.py data/ETD_2027_prebook_order_Thailand_20261111.xlsx

Excel の列: Destination, PO#, Style Name, Style#, Color Description, Qty (pairs), EX/F Date, Factory, Remarks, 35#〜47#
Style# の M / W (例 27M3204, 27W3205) でサイズの M / W を決める。
出力: { source, items: [ { model, color, size, qty, lines: [ { po, style, etd, qty } ] } ] }
ダッシュボード (app.js) が モデル・カラー・サイズ で在庫一覧の行に当て、ない行は追加する。
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

# Excel の Style Name → ダッシュボードのモデル名
MODEL = {
    "groundsplay ls": "VFF Groundsplay LS",
    "v-soul": "VFF V-Soul",
    "graspifier": "VFF Graspifier",
    "tieralite": "VFF Tieralite",
    "vi-b x": "VFF Vi-B X",
    "breezandal": "VFF Breezandal",
    "spidrwalk": "VFF Spidrwalk",
    "v-run": "VFF V-Run",
    "trailope 2": "VFF Trailope 2",
}
# (モデル, カラー) の読み替え: 2026 年モデルの V-Soul Black (26W7201) は在庫一覧の「V-Soul 26 / Black」(BK26)
OVERRIDE = {("VFF V-Soul", "Black"): ("VFF V-Soul 26", "Black")}


def title(s):
    s = re.sub(r"\s+", " ", str(s or "").strip())
    return "/".join(w.strip().title() if w.isupper() else w.strip() for w in s.split("/"))


def main(path):
    ws = openpyxl.load_workbook(path, data_only=True).active
    head = [str(c.value or "").strip() for c in ws[1]]
    col = {h: i for i, h in enumerate(head)}
    sizes = [(i, re.match(r"(\d+(?:\.\d+)?)#", h).group(1)) for i, h in enumerate(head) if re.match(r"\d+(?:\.\d+)?#", h)]
    out = {}
    total = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[col["Style Name"]]:
            continue
        name = str(row[col["Style Name"]]).strip()
        model = MODEL.get(name.lower(), "VFF " + title(name))
        color = title(row[col["Color Description"]])
        model, color = OVERRIDE.get((model, color), (model, color))
        style = str(row[col["Style#"]]).strip()
        mw = "W" if "W" in style[2:4] else "M"
        etd = row[col["EX/F Date"]]
        etd = etd.strftime("%Y-%m-%d") if hasattr(etd, "strftime") else str(etd or "")
        po = str(row[col["PO#"]]).strip()
        row_total = 0
        for i, sz in sizes:
            q = row[i]
            if not q:
                continue
            q = int(q)
            row_total += q
            key = (model, color, f"{mw}{sz}")
            e = out.setdefault(key, {"model": model, "color": color, "size": f"{mw}{sz}", "qty": 0, "lines": []})
            e["qty"] += q
            e["lines"].append({"po": po, "style": style, "etd": etd, "qty": q})
        if row_total != int(row[col["Qty (pairs)"]] or 0):
            print(f"warning: {po} {name} {color}: sizes {row_total} != Qty {row[col['Qty (pairs)']]}")
        total += row_total
    items = sorted(out.values(), key=lambda e: (e["model"], e["color"], e["size"][0], float(e["size"][1:])))
    data = {"source": Path(path).name, "total": total, "items": items}
    dest = ROOT / "public" / "outstanding_po.json"
    dest.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} SKUs, {total} pairs -> {dest}")


if __name__ == "__main__":
    main(sys.argv[1])
