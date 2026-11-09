#!/usr/bin/env python3
"""VFF / OLENO / Coolcore の取り扱い商品 JSON を、イベント持出リスト (Drive: Store・Event/List goods for event_2026/*.xlsx) から
抽出した price_list_from_events.json と coolcore_products.json から作る（モデル単位にまとめる）。

  python scripts/bd/build_products.py <extract_dir>
    <extract_dir>/price_list_from_events.json  [{brand, code, item, priceThb, source, eventMonth}]
    <extract_dir>/coolcore_products.json       {items:[{code,item,priceThb,normalPriceThb,discountPct,category}]}

出力: bd/public/data/products/{vff,oleno,coolcore}.json
SKU 名の形式 "VFF V-Run(M41, Black/Blue)" → モデル "VFF V-Run"、括弧内 "サイズ, 色" を分解。
"""
import json, re, sys, pathlib, datetime, collections
ex = pathlib.Path(sys.argv[1]); root = pathlib.Path(__file__).resolve().parents[2]; out = root / "bd/public/data/products"
today = datetime.date.today().isoformat()
pl = json.load(open(ex / "price_list_from_events.json", encoding="utf-8")); items = pl["items"] if isinstance(pl, dict) else pl

# VFF カタログ FW27 のカテゴリ（Drive: VFF/Catalog 2027/VFF CATALOGUE_FW27.pdf）。載っていないモデルは空欄
VFF_CAT = {"Graspifier": "Fitness", "V-Soul": "Fitness", "Groundsplay": "Fitness", "Groundsplay LS": "Fitness", "V-Train 2.0": "Fitness", "KSO EVO": "Fitness", "KMD Evo": "Fitness", "V-Alpha": "Fitness",
           "Litebeat WP": "Walking", "Tieralite": "Walking", "Vi-B X": "Walking", "CVT-Hemp": "Walking", "EL-X Knit": "Walking",
           "Trailope WP": "Running", "Trailope 2": "Running", "Trailope": "Running", "V-Run": "Running", "V-Trek": "Running",
           "Spidrwalk": "Outdoor", "Breezandal": "Outdoor", "Scramkey": "Outdoor"}
SIZE_RE = re.compile(r"^(?:[MWU]\s?)?\d{2}(?:\.5)?$|^(?:XS|S|M|L|XL|XXL|F|Free|One Size)$|^\d{2}-\d{2}$", re.I)

def split_item(item):
    m = re.match(r"^(.*?)\s*\((.*)\)\s*$", item or "")
    if not m: return (item or "").strip(), "", ""
    model, inner = m.group(1).strip(), m.group(2)
    parts = [p.strip() for p in inner.split(",")]
    size = next((p for p in parts if SIZE_RE.match(p)), "")
    colour = ", ".join(p for p in parts if p != size)
    return model, size, colour

def name_cat(short):
    # 名前から自明なものだけ（推測はしない）
    s = short.lower()
    if "sock" in s: return "Socks"
    if "furoshiki" in s: return "Furoshiki（ラップシューズ）"
    if "arm sleeve" in s: return "アームスリーブ"
    if "calf" in s: return "カーフサポーター"
    return ""

def gender_of(size):
    s = size.upper()
    return "Men" if s.startswith("M") else "Women" if s.startswith("W") else "Unisex" if s.startswith("U") else ""

def build(brand_key, out_name, brand_label, name_prefix, extra_note, cat_map=None, link=None):
    groups = collections.OrderedDict()
    for it in items:
        if it.get("brand") != brand_key or not it.get("priceThb"): continue
        model, size, colour = split_item(it["item"])
        g = groups.setdefault(model, {"prices": set(), "sizes": set(), "colours": set(), "codes": set(), "genders": set(), "src": set(), "n": 0})
        g["prices"].add(it["priceThb"]); g["n"] += 1
        if size: g["sizes"].add(size); 
        if colour: g["colours"].add(colour)
        g["codes"].add(it["code"].split("(")[0]); g["src"].add(it.get("source", "").split(" / ")[0])
        if gender_of(size): g["genders"].add(gender_of(size))
    rows = []
    for model, g in groups.items():
        short = model.replace(name_prefix, "").strip()
        prices = sorted(g["prices"])
        cat = (cat_map or {}).get(short, "") or name_cat(short)
        rows.append({"id": re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-"), "name": short, "nameJa": "", "model": model, "code": "/".join(sorted(g["codes"])),
                     "category": cat, "priceThb": prices[0], "priceThbMax": prices[-1],
                     "colours": sorted(g["colours"]), "sizes": sorted(g["sizes"], key=lambda s: (s[:1], s)), "genders": sorted(g["genders"]),
                     "skuCount": g["n"], "image": None, "intro": "", "source": "; ".join(sorted(g["src"]))})
    rows.sort(key=lambda r: (r["category"] or "zzz", r["name"]))
    doc = {"brand": brand_label, "updatedAt": today, "asOf": "2026 年のイベント持出リストの売価（ราคาขาย）。定価として扱ってよいかは情報リクエスト参照",
           "source": "Drive: BAREFOOTINC THAILAND/Store・Event/List goods for event_2026/*.xlsx（SKU・売価）→ モデル単位に集約。" + extra_note, "items": rows}
    if link: doc["catalog"] = link
    json.dump(doc, open(out / out_name, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(out_name, len(rows), "models from", sum(r["skuCount"] for r in rows), "SKU")

build("VFF", "vff.json", "VFF", "VFF", " カテゴリは VFF CATALOGUE_FW27.pdf の分類（載っていないモデルは空欄）。画像は Drive の VFF_PRODUCTS フォルダ参照。", VFF_CAT)
OLENO_CAT = {"Ultimate": "ソックス（Ultimate）", "Ultimate ASO": "ソックス（Ultimate）", "Ultimate ASO Long": "ソックス（Ultimate）", "Ultimate SHR": "ソックス（Ultimate）", "Ultimate SHR Round": "ソックス（Ultimate）", "Ultimate TNG": "ソックス（Ultimate）",
             "Hadashi Socks Openfinger": "ソックス（はだし靴下）", "Hadashi Socks Road": "ソックス（はだし靴下）", "Comod": "ソックス（Comod(y)）", "S-70": "ソックス（S-70）",
             "Premium Outdoor Socks": "ソックス（プレミアムアウトドア）", "Performance Wool Crew Heavyweight": "ソックス（Performance Wool）", "Performance Wool Crew Middle Thickness": "ソックス（Performance Wool）"}
build("OLENO", "oleno.json", "OLENO", "Oleno", " 17 商品の説明・PDF・画像は OLENO カタログ (oleno-catalog.vercel.app) 参照（この環境から取得不可、情報リクエスト A-5）。シリーズ名は Drive「Oleno Thailand 提供画像」のフォルダ名と対応。", OLENO_CAT, "https://oleno-catalog.vercel.app/")

# Coolcore: 専用ファイル（Outdoor fest 2026-05 の持出リスト、normalPriceThb あり）を優先し、イベント価格表で補完
cc = json.load(open(ex / "coolcore_products.json", encoding="utf-8")); ccitems = cc["items"] if isinstance(cc, dict) else cc
groups = collections.OrderedDict()
for it in ccitems:
    model, size, colour = split_item(it["item"]); price = it.get("normalPriceThb") or it.get("priceThb")
    g = groups.setdefault(model, {"prices": set(), "sizes": set(), "colours": set(), "codes": set(), "cat": it.get("category", ""), "n": 0})
    if price: g["prices"].add(price)
    if size: g["sizes"].add(size)
    if colour: g["colours"].add(colour)
    g["codes"].add(it["code"].split("(")[0]); g["n"] += 1
for it in items:
    if it.get("brand") != "Coolcore": continue
    model, size, colour = split_item(it["item"])
    if model in groups: continue
    g = groups.setdefault(model, {"prices": set(), "sizes": set(), "colours": set(), "codes": set(), "cat": "", "n": 0})
    if it.get("priceThb"): g["prices"].add(it["priceThb"])
    if size: g["sizes"].add(size)
    if colour: g["colours"].add(colour)
    g["codes"].add(it["code"].split("(")[0]); g["n"] += 1
rows = []
for model, g in groups.items():
    prices = sorted(g["prices"]) or [None]
    rows.append({"id": re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-"), "name": model.replace("CP ", "").strip(), "model": model, "code": "/".join(sorted(g["codes"])), "category": g["cat"] or "その他",
                 "priceThb": prices[0], "priceThbMax": prices[-1], "colours": sorted(g["colours"]), "sizes": sorted(g["sizes"]), "skuCount": g["n"], "image": None, "intro": "",
                 "source": "Event.Outdoor fest(Coolcore).21-24 May 26.xlsx（通常価格列）/ イベント持出リスト"})
rows.sort(key=lambda r: (r["category"], r["name"]))
json.dump({"brand": "Coolcore", "updatedAt": today, "asOf": "2026-05 Outdoor fest 持出リストの通常価格（Normal price）", "source": "Drive: Event.Outdoor fest(Coolcore).21-24 May 26.xlsx ほかイベント持出リスト。pptx S10 の 3 種（アームスリーブ／ネックゲイター／クールタオル）に分類", "items": rows}, open(out / "coolcore.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("coolcore.json", len(rows), "models")
