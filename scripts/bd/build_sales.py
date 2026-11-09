#!/usr/bin/env python3
"""BD ダッシュボード用 月次売上 JSON を作る。

入力: 既存の 2 つの販売ダッシュボードが公開している集計済み JSON（顧客情報なし）
  1. KeisukeKirby/sales-1st-half-26-dashboard  data/dashboard_data.json  (Barefootinc (Thailand) = BFT)
  2. KeisukeKirby/edv-sales-dashboard           data/dashboard_data.json  (Endeavorz = EDV、税抜)
出力: bd/public/data/sales_monthly.json

使い方:
  git clone --depth 1 https://github.com/KeisukeKirby/sales-1st-half-26-dashboard /tmp/bft
  git clone --depth 1 https://github.com/KeisukeKirby/edv-sales-dashboard /tmp/edv
  python scripts/bd/build_sales.py /tmp/bft/data/dashboard_data.json /tmp/edv/data/dashboard_data.json
"""
import json, sys, datetime, pathlib

bft_path, edv_path = sys.argv[1], sys.argv[2]
out = pathlib.Path(__file__).resolve().parents[2] / "bd/public/data/sales_monthly.json"
bft = json.load(open(bft_path, encoding="utf-8"))
edv = json.load(open(edv_path, encoding="utf-8"))

BRANDS = ["VFF", "Vivo", "Oleno", "Coolcore", "AQOS"]
def brand_key(b):
    b2 = {"AQOZ": "AQOS"}.get(b, b)
    return b2 if b2 in BRANDS else "Others"

months = sorted(set(bft["months"]) | set(edv["months"]))
prev_months = bft.get("prev_months", [])

# --- BFT -------------------------------------------------------------
bft_brand = {}
for b, row in bft["brand_monthly"].items():
    k = brand_key(b)
    d = bft_brand.setdefault(k, {})
    for m, v in row.items():
        if m not in months: continue
        cur = d.setdefault(m, {"amount": 0.0, "qty": 0.0})
        cur["amount"] += v.get("amount", 0.0); cur["qty"] += v.get("qty", 0.0)

bft_overall = {r["month"]: {"amount": r["amount"], "qty": r["qty"], "orders": r["orders"]} for r in bft["monthly_overall"]}
bft_prev = {r["month"]: {"amount": r["amount"], "qty": r["qty"], "orders": r["orders"]} for r in bft.get("monthly_overall_prev", [])}
bft_2024 = {r["month"]: {"amount": r["amount"], "qty": r["qty"], "orders": r["orders"]} for r in bft.get("monthly_overall_2024h1", [])}

bft_stores = [{"store": s["store"], "group": s["group"], "groupLabel": bft["group_label"].get(s["group"], s["group"]),
               "amount": s["amount"], "qty": s["qty"], "orders": s.get("orders")} for s in bft["stores"]]
vff_store_monthly = bft.get("vff_shoes", {}).get("store_monthly", {})
online_ch = {k: {m: v for m, v in row.items() if m in months} for k, row in bft.get("online_channel_monthly", {}).items()}

# --- EDV -------------------------------------------------------------
edv_ch = {}
for ch, row in edv["ch"].items():
    edv_ch[ch] = {m: {"amount": v[0], "qty": v[1], "orders": v[2]} for m, v in row.items()}
edv_ch_meta = {c["key"]: c["group"] for c in edv["channels"]}
SERVICE = {k for k, g in edv_ch_meta.items() if g == "service"}
edv_brand = {}
for ch, row in edv["ch_brand"].items():
    if ch in SERVICE: continue
    for m, brands in row.items():
        for b, v in brands.items():
            if b == "Service": continue
            k = brand_key(b)
            cur = edv_brand.setdefault(k, {}).setdefault(m, {"amount": 0.0, "qty": 0.0})
            cur["amount"] += v[0]; cur["qty"] += v[1]
edv_overall = {}
for ch, row in edv_ch.items():
    for m, v in row.items():
        cur = edv_overall.setdefault(m, {"amount": 0.0, "qty": 0.0, "orders": 0, "service": 0.0})
        if ch in SERVICE: cur["service"] += v["amount"]
        else:
            cur["amount"] += v["amount"]; cur["qty"] += v["qty"]; cur["orders"] += v["orders"]

# --- combined (group retail) -----------------------------------------
# BFT の「対EDV」(EDV への卸) と EDV の BFT 向けサービス収入を除いた、グループ外への売上
bft_to_edv = next((s for s in bft["stores"] if s["store"] == "対EDV"), None)
group_brand = {}
for src in (bft_brand, edv_brand):
    for b, row in src.items():
        for m, v in row.items():
            cur = group_brand.setdefault(b, {}).setdefault(m, {"amount": 0.0, "qty": 0.0})
            cur["amount"] += v["amount"]; cur["qty"] += v["qty"]

data = {
    "updatedAt": datetime.date.today().isoformat(),
    "months": months,
    "prevMonths": prev_months,
    "brands": BRANDS + ["Others"],
    "sources": [
        {"id": "bft", "label": "Barefootinc (Thailand) 販売実績ダッシュボード", "url": "https://sales-1st-half-26-dashboard.vercel.app/",
         "repo": "https://github.com/KeisukeKirby/sales-1st-half-26-dashboard", "period": bft["kpi"]["period"],
         "basis": "売上金額は POS/受注明細の実請求額（値引後）。VAT の扱いは元ダッシュボードの「このデータについて」を参照"},
        {"id": "edv", "label": "EDV 販売実績ダッシュボード", "url": "https://edv-sales-dashboard.vercel.app/",
         "repo": "https://github.com/KeisukeKirby/edv-sales-dashboard", "period": f"{edv['months'][0]} ~ {edv['months'][-1]}",
         "basis": f"EDV 収入表 (Before VAT) と一致を確認済み。税抜 (VAT {int(edv['vat_rate']*100)}% を除いた金額)。生成 {edv['generated_at']}"},
    ],
    "notes": [
        "BFT と EDV は別会社。BFT の「対EDV」は EDV への卸売、EDV の Marketing BFT / Commission / Car rent は BFT からのサービス収入で、どちらもグループ内取引。",
        "「グループ小売」= BFT 全チャネル（対EDV・輸出を含む元データの brand_monthly）+ EDV 小売チャネル（サービス収入除く）の単純合算。BFT の brand_monthly には対EDV 卸分が含まれるため、EDV 側の小売と二重計上になる分がある。正確な連結は会計データが必要（情報リクエスト参照）。",
        "BFT は税込ベース、EDV は税抜ベースの金額が混在している可能性がある。元ダッシュボードの集計ルールを確認のこと。",
        "AQOS は EDV の POS 上「AQOZ」(商品コード AQ) として記録されている。",
    ],
    "bft": {"overall": bft_overall, "overallPrev": bft_prev, "overall2024": bft_2024, "brandMonthly": bft_brand,
            "stores": bft_stores, "vffShoesStoreMonthly": vff_store_monthly, "onlineChannelMonthly": online_ch,
            "kpi": bft["kpi"], "toEdv": bft_to_edv},
    "edv": {"channels": [{"key": c["key"], "group": c["group"]} for c in edv["channels"]], "channelMonthly": edv_ch,
            "brandMonthly": edv_brand, "overall": edv_overall, "brandsRaw": edv["brands"]},
    "group": {"brandMonthly": group_brand},
}
out.parent.mkdir(parents=True, exist_ok=True)
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("wrote", out, out.stat().st_size // 1024, "KB; months", months[0], "-", months[-1])
