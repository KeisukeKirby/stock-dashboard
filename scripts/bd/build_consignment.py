#!/usr/bin/env python3
"""Stock VFF Consignment.xlsx から抽出した consignment.json（委託先ごとの納品・販売・残・月別販売）を
ダッシュボード用 bd/private/consignment.json に整える。
  python scripts/bd/build_consignment.py <extract_dir>/consignment.json
"""
import json, sys, pathlib, datetime
src = json.load(open(sys.argv[1], encoding="utf-8"))
root = pathlib.Path(__file__).resolve().parents[2]
DEPT = ("Central", "Department")
TYPE_HINT = {"Pathwild": "店舗（買取へ移行中）", "Bananarun": "ランニングショップ委託", "BananaRun": "ランニングショップ委託", "Run2Paradise": "ランニングショップ委託", "Highlandner": "アウトドア店委託", "Caveman": "店舗委託", "Curve": "店舗委託", "East West": "店舗委託", "Bonita Cafe": "カフェ委託", "K.Pok": "個人・小規模委託"}
months = set(); out = []
BRAND = {"VFF": "VFF", "OLN": "OLENO", "BFJ": "BFJ", "MTB": "Tabi (Marugo)", "CP": "Coolcore"}
for c in src["consignees"]:
    mk = sorted(k for k in (c.get("monthly") or {}) if len(k) == 7)
    months.update(mk)
    t = "デパート委託" if any(d in c["name"] for d in DEPT) else next((v for k, v in TYPE_HINT.items() if c["name"].startswith(k)), c.get("type") or "委託")
    out.append({"name": c["name"], "sheet": c.get("sheet"), "type": t, "brands": [BRAND.get(b, b) for b in c.get("brands", [])], "skuCount": c.get("skuCount"),
                "delivered": c.get("delivered"), "returned": c.get("returned"), "netDelivered": c.get("netDelivered"), "sold": c.get("sold"), "balance": c.get("balance"),
                "monthly": {k: v for k, v in (c.get("monthly") or {}).items() if len(k) == 7}, "yearOnly": {k: v for k, v in (c.get("monthly") or {}).items() if len(k) != 7} or None,
                "byBrand": {BRAND.get(b, b): v for b, v in (c.get("byBrand") or {}).items()}, "firstMonth": mk[0] if mk else "", "lastMonth": mk[-1] if mk else "",
                "deliveryDates": sorted({d[:10] for d in c.get("deliveryDocs", []) if d}), "notes": c.get("notes", []), "parseWarning": c.get("parseWarning")})
months = sorted(months)
by_brand = {}
for c in out:
    for b, v in c["byBrand"].items():
        t = by_brand.setdefault(b, {"delivered": 0, "sold": 0, "balance": 0})
        for k in t: t[k] += (v.get(k) or 0)
doc = {"updatedAt": datetime.date.today().isoformat(), "fileModified": src.get("updatedAt"), "source": src.get("source"),
       "period": f"{months[0]} 〜 {months[-1]}" if months else "", "months": months,
       "notes": ["数量（足数・個数）のみ。金額は元ファイルにない（換算するなら商品の売価 × 販売数）。",
                 "納品 = 納品伝票（QO-/IVT-）の合計、返品 = 返品伝票（CNT-）、残 = 納品 − 返品 − 販売。", src.get("asOfNote", ""),
                 "委託先の「形態」はファイル名と pptx から推定。pptx S6・S13: デパート以外の委託は廃止し買取へ切り替える方針。",
                 "百貨店（Central 各店・Siam Discovery）の精算額は Sales Record_Coollabo Shop の百貨店シートにある（この表には含めていない）。"] + src.get("warnings", []),
       "codePrefixesSeen": src.get("codePrefixesSeen"), "byBrandTotal": by_brand, "consignees": sorted(out, key=lambda c: -(c["sold"] or 0))}
p = root / "bd/private/consignment.json"
json.dump(doc, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", p, len(out), "consignees,", len(months), "months", doc["period"])
