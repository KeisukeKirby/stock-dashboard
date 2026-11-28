"""VFF の靴以外 (Vivo・VFF の靴下・Barefoot Japan・Oleno・Coolcore) の販売足数を Zort の受注明細から数える。

  python3 scripts/other_sales.py order_detail_BFT_2026-09.xlsx order_detail_EDV_2026-09.xlsx ...  (受注明細は顧客情報を含むのでリポジトリに入れない)
  → public/other_sales.json  { from, to, months: [...], sales: { 品番: 足数 } }

Vivo・Socks・Coolcore の表の「Sales」列に使う。拠点の決まりは VFF の月平均販売と同じ (Online・Event・K Village・Central LP・Paradise Park)。
(Central CL・Siam Discovery の百貨店の売上表は品番がないので入らない)。
"""
import collections
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sales_rate import ONLINE_CHANNELS, STORE_WAREHOUSE  # noqa: E402  (VFF の販売と同じ決まりで拠点を分ける)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "other_sales.json"
CODE = re.compile(r"^(VV|BFJ|OLN|CC)\d")


def date_of(v):
    if isinstance(v, datetime.datetime):
        return v.date()
    d, m, y = str(v).split()[0].split("/")
    return datetime.date(int(y), int(m), int(d))


def main(paths):
    sales = collections.Counter()
    months = set()
    for p in paths:
        ws = openpyxl.load_workbook(p, read_only=True, data_only=True).worksheets[0]
        rows = list(ws.iter_rows(values_only=True))
        ix = {h: i for i, h in enumerate(rows[1]) if h}
        for r in rows[2:]:
            if r[ix["Type"]] != "Sell" or r[ix["Status"]] == "Voided":
                continue
            code = str(r[ix["Product code"]] or "").strip()
            name = str(r[ix["Product name"]] or "")
            if not (CODE.match(code) or (code.startswith("VFF") and re.search(r"socks?\b", name, re.I))):
                continue
            # VFF の月平均販売と同じ: Online・Event・店舗 (K Village / Central LP / Paradise Park) の販売だけ数える
            wh = r[ix["Warehouse/Branch"]] or ""
            ch, no = r[ix["Sales channel"]] or "", str(r[ix["Sales order No."]] or "")
            if not (ch in ONLINE_CHANNELS or (not ch and no.startswith("TX")) or wh in ("Online", "Event 1", "Event 2", "CART Central LP") or wh in STORE_WAREHOUSE):
                continue
            months.add(date_of(r[ix["Date"]]).strftime("%Y-%m"))
            sales[code] += float(r[ix["Quantity"]] or 0)
    ms = sorted(months)
    out = {"from": ms[0], "to": ms[-1], "months": ms, "sources": [Path(p).name for p in paths],
           "sales": {k: int(v) if v == int(v) else v for k, v in sorted(sales.items()) if v}}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out['sales'])} SKUs, {sum(sales.values()):.0f} pairs, {ms[0]}..{ms[-1]} -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
