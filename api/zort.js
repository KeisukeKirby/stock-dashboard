// Zort の在庫を読む API  —  Vercel Function
//
//   GET /api/zort  →  { configured: true, fetchedAt, stores: [ { store, warehouses: [ { code, name, stock: { SKU: 数量 } } ] } ],
//                       names: { SKU: 商品名 } }
//
// Zort Open API (https://open-api.zortout.com/v4/) を店舗アカウントごとに呼び、倉庫ごとの在庫を返す。
// 返すのは VFF / Vivo の SKU と数量だけ (顧客情報・価格は含めない)。
//
// 環境変数 (Vercel の Settings → Environment Variables):
//   ZORT_ACCOUNTS            カンマ区切りのアカウント名 (例: BFT,EDV)
//   ZORT_<名前>_STORENAME    Zort の storename
//   ZORT_<名前>_APIKEY       Zort の apikey
//   ZORT_<名前>_APISECRET    Zort の apisecret
// 5 分間は CDN にキャッシュする (Zort への呼び出し回数を抑える)。

const BASE = process.env.ZORT_BASE_URL || "https://open-api.zortout.com/v4";
const SKU_RE = /^(VFF|VV)\d/;
const PAGE = 500;

function accounts() {
  return String(process.env.ZORT_ACCOUNTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      const k = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      return {
        name,
        storename: process.env[`ZORT_${k}_STORENAME`],
        apikey: process.env[`ZORT_${k}_APIKEY`],
        apisecret: process.env[`ZORT_${k}_APISECRET`],
      };
    })
    .filter((a) => a.storename && a.apikey && a.apisecret);
}

async function call(acc, path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await fetch(url, { headers: { storename: acc.storename, apikey: acc.apikey, apisecret: acc.apisecret } });
  if (!r.ok) throw new Error(`${acc.name} ${path}: HTTP ${r.status}`);
  const j = await r.json();
  const code = j && j.res && String(j.res.resCode);
  if (code && code !== "200") throw new Error(`${acc.name} ${path}: ${code} ${j.res.resDesc || ""}`);
  return j;
}

async function warehouseStock(acc, wh, names) {
  const stock = {};
  for (let page = 1; page < 100; page++) {
    const j = await call(acc, "Product/GetProducts", { page, limit: PAGE, warehousecode: wh.code });
    const list = j.list || [];
    for (const p of list) {
      const sku = String(p.sku || "").trim();
      if (!SKU_RE.test(sku)) continue;
      if (p.name && !names[sku]) names[sku] = String(p.name);
      const q = Number(p.stock ?? p.availablestock ?? 0);
      if (q) stock[sku] = (stock[sku] || 0) + q;
    }
    if (list.length < PAGE) break;
  }
  return stock;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const accs = accounts();
  if (!accs.length) {
    res.status(503).json({ configured: false, error: "Zort is not configured" });
    return;
  }
  try {
    const names = {}; // SKU -> 商品名 (ダッシュボードにない商品の行を作るため)
    const stores = await Promise.all(
      accs.map(async (acc) => {
        const j = await call(acc, "Warehouse/GetWarehouses");
        const whs = (j.list || []).map((w) => ({ code: String(w.code || w.id), name: String(w.name || w.code || "") }));
        const warehouses = [];
        for (const wh of whs) warehouses.push({ ...wh, stock: await warehouseStock(acc, wh, names) });
        return { store: acc.name, warehouses };
      })
    );
    // ブラウザには毎回最新を返し、Vercel の CDN だけ 5 分キャッシュする
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=300, stale-while-revalidate=600");
    res.status(200).json({ configured: true, fetchedAt: new Date().toISOString(), stores, names });
  } catch (e) {
    console.error(e);
    res.status(502).json({ configured: true, error: String(e.message || e).slice(0, 200) });
  }
};
