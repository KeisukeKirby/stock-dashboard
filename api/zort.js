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
// CDN に結果を置き、2 回目以降はすぐ返す (裏で Zort から読み直す)。

const BASE = process.env.ZORT_BASE_URL || "https://open-api.zortout.com/v4";
const SKU_RE = /^(VFF|VV)\d/;
const PAGE = 500;
// 読まない倉庫 (在庫の数ではない仮の倉庫)。รอ = 入荷待ちなどの仮置きで、大きなマイナスになっている
const SKIP = /^(รอ|ของเสีย|สินค้าตัวอย่าง)$/;
// アカウントごとに読む倉庫 (ここにないアカウントは全倉庫)。EDV は K Village と Central LP だけ使う
const ONLY = { EDV: /kvillage|coollabo|centrallp/i };
const norm = (s) => String(s || "").toLowerCase().replace(/[\s._\-/()]/g, "");

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

// 同じサーバーが続けて呼ばれたときは 60 秒以内なら前回の結果を返す
let memo = null;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  // CDN: 1 分は同じ結果を返し、それ以降も前回の結果をすぐ返しつつ裏で Zort から読み直す
  const CDN = "max-age=60, stale-while-revalidate=86400";
  if (memo && Date.now() - memo.at < 60000) {
    res.setHeader("Vercel-CDN-Cache-Control", CDN);
    res.status(200).json(memo.body);
    return;
  }
  const accs = accounts();
  if (!accs.length) {
    res.status(503).json({ configured: false, error: "Zort is not configured" });
    return;
  }
  const t0 = Date.now();
  try {
    const names = {}; // SKU -> 商品名 (ダッシュボードにない商品の行を作るため)
    const stores = await Promise.all(
      accs.map(async (acc) => {
        const j = await call(acc, "Warehouse/GetWarehouses");
        const only = ONLY[acc.name.toUpperCase()];
        const whs = (j.list || [])
          .map((w) => ({ code: String(w.code || w.id), name: String(w.name || w.code || "") }))
          .filter((w) => !SKIP.test(w.name.trim()) && (!only || only.test(norm(w.name))));
        // 倉庫は 6 つずつ並行して読む (1 つずつより大幅に速い。Zort への同時接続は控えめに)
        const warehouses = new Array(whs.length);
        let next = 0;
        const worker = async () => {
          while (next < whs.length) {
            const i = next++;
            warehouses[i] = { ...whs[i], stock: await warehouseStock(acc, whs[i], names) };
          }
        };
        await Promise.all(Array.from({ length: Math.min(6, whs.length) }, worker));
        return { store: acc.name, warehouses };
      })
    );
    const body = { configured: true, fetchedAt: new Date().toISOString(), stores, names };
    memo = { at: Date.now(), body };
    console.log(`zort: ${stores.map((x) => `${x.store} ${x.warehouses.length} warehouses`).join(", ")} in ${Date.now() - t0} ms`);
    res.setHeader("Vercel-CDN-Cache-Control", CDN);
    res.status(200).json(body);
  } catch (e) {
    console.error(e);
    res.status(502).json({ configured: true, error: String(e.message || e).slice(0, 200) });
  }
};
