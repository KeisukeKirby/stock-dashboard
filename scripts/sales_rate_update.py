"""月平均販売 (data/sales_rate.json) に新しい月の販売を足して作り直す。

1〜8 月は data/sales_rate_base_2026-01_08.json (scripts/sales_rate.py で作った 1〜8 月の月平均) から
「月平均 × 月数」で各 SKU の販売足数を戻し、data/sales_monthly/*.json (月別・店舗別・SKU 別の販売足数) を足して、
店舗ごとに「販売足数 ÷ データのある月数」を計算し直す。

使い方:
  1. 新しい販売ファイルを読み、月別の足数を data/sales_monthly/ に保存する
       python3 scripts/sales_rate_update.py extract <種類> <ファイル> [月 ...]
       種類: orders (Zort の受注明細 Orders。BFT・EDV の両方をまとめて指定する。
                     K Village / Central LP / Paradise Park / Online / Event を 1〜8 月と同じ決まりで数える),
             central (Central CL の月別シート), siam (Siam Discovery の月別シート。月別シートのないファイルは先頭のシート),
             pos (Zort の「รายการขาย」POS 販売。受注明細がないときの K Village / Central LP 用)
       月: central / siam はシート名の月 (例 2026-09 2026-10)。pos はファイル内の全月
  2. 合計し直す:  python3 scripts/sales_rate_update.py build
  3. convert.py を実行して stock.json に反映する
"""
import collections
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sales_rate import SkuMatcher, is_shoe_text, read_orders, vff_shoe  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "data" / "sales_rate_base_2026-01_08.json"
MONTHLY = ROOT / "data" / "sales_monthly"
OUT = ROOT / "data" / "sales_rate.json"
STOCK = ROOT / "public" / "stock.json"
KV, LP, CL, SD = "K Village", "Central LP", "Central CL (Department)", "Siam Discovery"
POS_WH = {"Kvillage": KV, "Coollabo Cen LP 3F": LP}


def matcher():
    stock = json.loads(STOCK.read_text(encoding="utf-8"))
    known = {i["code"]: (i["model"], i["color"]) for i in stock["items"] if i["code"]}
    return SkuMatcher(known)


def save(store, month, counts, unmatched, source):
    MONTHLY.mkdir(parents=True, exist_ok=True)
    p = MONTHLY / f"{month}_{re.sub(r'[^A-Za-z]+', '_', store).strip('_')}.json"
    p.write_text(json.dumps({"store": store, "month": month, "source": source, "total": sum(counts.values()),
                             "sales": dict(sorted(counts.items())), "unmatched": unmatched}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{store} {month}: {sum(counts.values()):.0f} pairs, {len(counts)} SKUs, unmatched {len(unmatched)} -> {p.name}")
    for u in unmatched:
        print("   unmatched:", u)


def extract(kind, path, months):
    m = matcher()
    src = Path(path).name
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if kind in ("central", "siam"):
        store = CL if kind == "central" else SD
        for month in months:
            y, mo = month.split("-")
            ws = wb[f"{mo}-{y[2:]}"] if f"{mo}-{y[2:]}" in wb.sheetnames else wb.worksheets[0]
            counts, unmatched = collections.Counter(), []
            for r in ws.iter_rows(values_only=True):
                if not r or not isinstance(r[0], datetime.datetime):
                    continue
                if kind == "central":
                    code, name, q = r[1], r[2], r[3]
                    if not str(code or "").startswith("VFF") or not is_shoe_text(name):
                        continue
                    hit = m.central(code, name)
                else:
                    name, q = r[1], r[2]
                    if not name or not is_shoe_text(name):
                        continue
                    hit = m.siam(name)
                if hit:
                    counts[hit] += float(q or 0)
                else:
                    unmatched.append([str(r[0].date()), str(name), q])
            save(store, month, counts, unmatched, src)
    elif kind == "orders":
        # 1〜8 月と同じ集計 (scripts/sales_rate.py の read_orders)。BFT と EDV の両方の受注明細をまとめて数える
        sales, meta, periods = collections.defaultdict(collections.Counter), {}, set()
        for f in [path, *months]:
            read_orders(Path(f), sales, meta, periods)
        stores = ["K Village", "Central LP", "Paradise Park", "Online", "Event"]
        for month in sorted(periods):
            for store in stores:
                counts = collections.Counter({c: q[(store, month)] for c, q in sales.items() if q[(store, month)]})
                save(store, month, counts, [], " + ".join(Path(f).name for f in [path, *months]))
    elif kind == "pos":
        ws = wb.worksheets[0]
        by = collections.defaultdict(collections.Counter)
        for r in ws.iter_rows(values_only=True):
            if not r or not str(r[0] or "").startswith("R#"):
                continue
            n = len(r)
            # 列の並び: 14 列 (รายการ, สร้างโดย, ช่องทาง, วันที่, ส่วนลด, สถานะ, คลัง, ชำระ, รหัส, ชื่อ, จำนวน, ...)
            #          17 列 (..., สถานะ=8, คลัง=9, ชำระ=10, รหัส=11, ชื่อ=12, จำนวน=13, ...)
            if n >= 17:
                status, wh, code, name, q = r[8], r[9], r[11], r[12], r[13]
            else:
                status, wh, code, name, q = r[5], r[6], r[8], r[9], r[10]
            store = POS_WH.get(str(wh).strip())
            if not store or status != "สำเร็จ" or not str(code).startswith("VFF") or not vff_shoe(name):
                continue
            d, mo, y = str(r[3]).split()[0].split("/")
            by[(store, f"{y}-{int(mo):02d}")][str(code).strip()] += float(q or 0)
        for (store, month), counts in sorted(by.items()):
            save(store, month, counts, [], src)
    else:
        raise SystemExit(f"unknown kind {kind}")


def build():
    base = json.loads(BASE.read_text(encoding="utf-8"))
    months = {s: list(v) for s, v in base["months"].items()}
    total = collections.defaultdict(collections.Counter)  # SKU -> 店舗 -> 足数
    for code, per in base["rate"].items():
        for s, r in per.items():
            total[code][s] += round(r * len(months[s]))
    added = []
    for p in sorted(MONTHLY.glob("*.json")):
        j = json.loads(p.read_text(encoding="utf-8"))
        s, mo = j["store"], j["month"]
        if mo in months.get(s, []):
            raise SystemExit(f"{p.name}: {s} {mo} は既に入っています")
        months.setdefault(s, []).append(mo)
        for code, q in j["sales"].items():
            total[code][s] += q
        added.append(f"{s} {mo} {j['total']:.0f}")
    months = {s: sorted(v) for s, v in months.items()}
    rate = {}
    for code, c in total.items():
        per = {s: round(q / len(months[s]), 3) for s, q in c.items() if q}
        if per:
            rate[code] = per
    totals = {s: sum(c.get(s, 0) for c in total.values()) for s in months}
    out = {**base,
           "generatedAt": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M"),
           "months": months, "totals": totals, "rate": rate,
           "sources": base.get("sources", []) + sorted({json.loads(p.read_text(encoding='utf-8'))['source'] for p in MONTHLY.glob('*.json')}),
           "added": added}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in months:
        print(f"{s:24s} {totals[s]:6.0f} pairs / {len(months[s])} months ({months[s][0]}..{months[s][-1]})")


if __name__ == "__main__":
    if sys.argv[1] == "extract":
        extract(sys.argv[2], sys.argv[3], sys.argv[4:])
    else:
        build()
