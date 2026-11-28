"""委託先の在庫 (Stock VFF Consignment.xlsx の各シートの Balance 列) を読み、ダッシュボード用にまとめる。

  python3 scripts/consign.py <Stock VFF Consignment.xlsx> [<Siam Discovery の在庫 Excel>] [--date 2026-11-28]
  → public/consign.json   { date, source, stores: { 拠点名: { 品番: 数 } } }
      (VFF 以外の表: Vivo・Socks・Oleno・Coolcore と、VFF の委託先の列に使う)
  → data/counts/central_cl_<日付>.json   (VFF の Central CL の数。これまでと同じ BS 列 Balance)

Central Chidlom (Department) は ダッシュボードの「Central CL (Department)」。
Siam Discovery の VFF 以外 (靴下・Oleno など) は店舗の在庫 Excel から取る (VFF の靴は data/counts の棚卸の数)。
"""
import collections
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
CODE = re.compile(r"^[A-Z]{2,4}\d{2,4}\(.+\)$")
# シート名 → ダッシュボードの拠点名 (同じ委託先の 2 枚のシートは合計する)
NAMES = {
    "Central Chidlom (Department)": "Central CL (Department)",
    "K.Pok (2)": "K.Pok",
    "Bananarun (2)": "Banana Run",
    "BananaRun": "Banana Run",
    "Highlandner": "Highlander",
}


def read_consign(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    stores, names = collections.defaultdict(collections.Counter), {}
    for ws in wb.worksheets:
        bal = None
        for r in range(1, 5):
            for c in ws[r]:
                if str(c.value or "").strip().lower() == "balance":
                    bal = c.column - 1
        if bal is None:
            continue
        store = NAMES.get(ws.title.strip(), ws.title.strip())
        for row in ws.iter_rows(min_row=2, values_only=True):
            code = str(row[0] or "").strip()
            if not CODE.match(code) or bal >= len(row):
                continue
            v = row[bal]
            if isinstance(v, (int, float)) and v:
                stores[store][code] += v
            if row[1]:
                names.setdefault(code, str(row[1]).strip())
    return stores, names


def read_siam(path):
    """Siam Discovery の在庫 Excel (品番・品名・数)。VFF の靴以外だけ。同じ品番の行は合計"""
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    out = collections.Counter()
    for r in ws.iter_rows(values_only=True):
        vals = [v for v in r if v is not None]
        if len(vals) < 3:
            continue
        code = str(vals[0]).strip()
        if not CODE.match(code) or (code.startswith("VFF") and not re.search(r"socks?\b", str(vals[1]), re.I)):
            continue
        try:
            out[code] += float(vals[2])
        except (TypeError, ValueError):
            pass
    return out


def main(args):
    date = next((args[i + 1] for i, a in enumerate(args) if a == "--date"), None)
    files = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--date")]
    stores, names = read_consign(files[0])
    if len(files) > 1:
        stores["Siam Discovery"] = read_siam(files[1])
    clean = lambda c: {k: int(v) if v == int(v) else v for k, v in sorted(c.items()) if v}
    out = {"date": date, "source": Path(files[0]).name, "stores": {s: clean(c) for s, c in stores.items() if any(c.values())}}
    used = {k for c in out["stores"].values() for k in c}
    out["names"] = {k: names[k] for k in sorted(used) if k in names}  # Zort に商品名がない品番の表示用
    (ROOT / "public" / "consign.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for s, c in out["stores"].items():
        by = collections.Counter()
        for k, v in c.items():
            by[re.match(r"[A-Z]+", k).group(0)] += v
        print(f"{s:34} {dict(by)}")
    # VFF の Central CL の数 (これまでの data/counts/central_cl_*.json と同じ形。靴下は入れない)
    cl = stores.get("Central CL (Department)", {})
    items = {k: {"count": int(v), "display": 0, "name": names.get(k, "")} for k, v in sorted(cl.items())
             if k.startswith("VFF") and not re.search(r"socks?\b", names.get(k, ""), re.I)}
    tag = (date or "").replace("-", "")
    counts = {"store": "Central CL (Department)", "label": "", "date": date,
              "source": "Stock VFF Consignment.xlsx（Google Drive）— Central Chidlom (Department) シートの BS 列 Balance",
              "note": "靴下 (Socks) は VFF の表に入れない (Socks シートは public/consign.json)。Balance がマイナスの SKU はそのまま入れている。",
              "addMissing": True, "zeroUnlisted": True, "items": items}
    (ROOT / "data" / "counts" / f"central_cl_{tag}.json").write_text(json.dumps(counts, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Central CL VFF:", sum(v["count"] for v in items.values()), "pairs,", len(items), "SKUs")


if __name__ == "__main__":
    main(sys.argv[1:])
