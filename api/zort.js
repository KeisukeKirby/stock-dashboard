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
// 結果は Upstash Redis に共有スナップショットとして 1 つだけ置き、全員に同じ数 (同じ読み込み時刻) を返す。10 分ごとに読み直す。
//   GET /api/zort?since=<fetchedAt>  → 変わっていなければ { same: true } だけを返す (1 分ごとの確認用)

const BASE = process.env.ZORT_BASE_URL || "https://open-api.zortout.com/v4";
const SKU_RE = /^(VFF|VV)\d/;
const PAGE = 500;
// 読まない倉庫 (在庫の数ではない仮の倉庫)。รอ = 入荷待ちなどの仮置きで、大きなマイナスになっている
const SKIP = /^(รอ|ของเสีย|สินค้าตัวอย่าง)$/;
// アカウントごとに読む倉庫 (ここにないアカウントは全倉庫)。EDV は K Village と Central LP だけ使う
// アカウントごとに読まない倉庫。EDV の本倉庫は大きなマイナスの仮の数なので読まない (EDV のそのほかの倉庫は全部読む)
const ACC_SKIP = { EDV: /^คลังสินค้าหลัก$/ };
const skipWh = (acc, name) => SKIP.test(name.trim()) || (ACC_SKIP[acc.name.toUpperCase()] || /$^/).test(name.trim());
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
    const j = await call(acc, "Product/GetProducts", wh.code ? { page, limit: PAGE, warehousecode: wh.code } : { page, limit: PAGE });
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

// ---- 全員が同じ数を見るための共有スナップショット (Upstash Redis。returns.js / orders.js と同じ保存先) ----
// Zort から読んだ結果を Redis に 1 つだけ置き、どの PC・スマホにも同じもの (同じ読み込み時刻) を返す。
// 10 分より古くなったら、最初に来た 1 台のリクエストが Zort から読み直す (ロックで同時に 2 回読まない)。
// Zort が失敗したときは前回のスナップショットを返す (stale: true)。古い Excel の数に戻らないようにする。
const envBySuffix = (...suffixes) => {
  for (const suf of suffixes) {
    if (process.env[suf]) return process.env[suf];
    const key = Object.keys(process.env).find((k) => k.endsWith(`_${suf}`) && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
};
const KV_URL = envBySuffix("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL", "REST_API_URL");
const KV_TOKEN = envBySuffix("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "REST_API_TOKEN");
async function kv(commands) {
  const r = await fetch(`${KV_URL.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const out = await r.json();
  const err = out.find((x) => x && x.error);
  if (err) throw new Error(err.error);
  return out.map((x) => x.result);
}
// v2: EDV の全倉庫と商品マスタ (在庫 0 の商品名) を含む形式
const SNAP = "zort:v2:snapshot", SNAP_AT = "zort:v2:fetchedAt", LOCK = "zort:v2:lock";
const MAX_AGE = 10 * 60 * 1000; // 10 分ごとに Zort から読み直す

async function readZort(accs) {
  const t0 = Date.now();
  const names = {}; // SKU -> 商品名 (ダッシュボードにない商品の行を作るため)
  const stores = await Promise.all(
    accs.map(async (acc) => {
      const j = await call(acc, "Warehouse/GetWarehouses");
      const whs = (j.list || [])
        .map((w) => ({ code: String(w.code || w.id), name: String(w.name || w.code || "") }))
        .filter((w) => !skipWh(acc, w.name));
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
  // 商品マスタ全体 (倉庫を指定しない) から商品名を集める: 在庫が 0 の商品も表に行を出すため
  await Promise.all(accs.map((acc) => warehouseStock(acc, { code: null }, names).catch((e) => console.error("catalog", acc.name, e.message))));
  console.log(`zort: ${stores.map((x) => `${x.store} ${x.warehouses.length} warehouses`).join(", ")} in ${Date.now() - t0} ms`);
  return { configured: true, fetchedAt: new Date().toISOString(), stores, names };
}

// このサーバーが最後に読んだスナップショット (Redis から大きな本体を毎回読まないため)
let memo = null; // { fetchedAt, body }

// 確認用: /api/zort?summary=1 → 全アカウントの全倉庫 (読み飛ばしている倉庫も含む) の VFF / Vivo の合計足数・SKU 数だけを返す
async function summary(res, accs) {
  const out = [];
  for (const acc of accs) {
    const j = await call(acc, "Warehouse/GetWarehouses");
    const whs = (j.list || []).map((w) => ({ code: String(w.code || w.id), name: String(w.name || w.code || "") }));
    const rows = await Promise.all(whs.map(async (w) => {
      const st = await warehouseStock(acc, w, {});
      const tot = (re) => Object.entries(st).filter(([k]) => re.test(k)).reduce((a, [, q]) => a + q, 0);
      return {
        account: acc.name, code: w.code, name: w.name,
        used: !skipWh(acc, w.name),
        vff: tot(/^VFF/), vivo: tot(/^VV/), skus: Object.keys(st).length,
        negative: Object.values(st).filter((q) => q < 0).length,
      };
    }));
    out.push(...rows);
  }
  res.status(200).json({ fetchedAt: new Date().toISOString(), warehouses: out });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (/[?&]summary=1/.test(req.url || "")) {
    const accs = accounts();
    if (!accs.length) return res.status(503).json({ configured: false });
    try { return await summary(res, accs); } catch (e) { return res.status(502).json({ error: String(e.message || e).slice(0, 200) }); }
  }
  const accs = accounts();
  if (!accs.length) {
    res.status(503).json({ configured: false, error: "Zort is not configured" });
    return;
  }
  const since = new URL(req.url || "/", "http://x").searchParams.get("since");
  const send = (body, extra = {}) => {
    if (since && body.fetchedAt === since && !extra.stale) return res.status(200).json({ same: true, fetchedAt: body.fetchedAt });
    return res.status(200).json({ ...body, ...extra });
  };

  // 共有の保存先がないとき (ローカル確認など) は、このサーバーで 60 秒だけ覚えて返す
  if (!KV_URL || !KV_TOKEN) {
    try {
      if (!memo || Date.now() - Date.parse(memo.fetchedAt) > 60000) { const b = await readZort(accs); memo = { fetchedAt: b.fetchedAt, body: b }; }
      return send(memo.body);
    } catch (e) {
      console.error(e);
      if (memo) return send(memo.body, { stale: true, error: String(e.message || e).slice(0, 200) });
      return res.status(502).json({ configured: true, error: String(e.message || e).slice(0, 200) });
    }
  }

  try {
    const loadSnap = async (at) => {
      if (memo && memo.fetchedAt === at) return memo.body;
      const [raw] = await kv([["GET", SNAP]]);
      const body = raw ? JSON.parse(raw) : null;
      if (body) memo = { fetchedAt: body.fetchedAt, body };
      return body;
    };
    const [at] = await kv([["GET", SNAP_AT]]);
    const fresh = at && Date.now() - Date.parse(at) < MAX_AGE;
    if (fresh) {
      if (since === at) return res.status(200).json({ same: true, fetchedAt: at });
      const body = await loadSnap(at);
      if (body) return send(body);
    }
    // 古い (または未作成): 1 台だけが Zort から読み直す
    const [got] = await kv([["SET", LOCK, "1", "NX", "EX", 55]]);
    if (got === "OK") {
      try {
        const body = await readZort(accs);
        await kv([["SET", SNAP, JSON.stringify(body)], ["SET", SNAP_AT, body.fetchedAt], ["DEL", LOCK]]);
        memo = { fetchedAt: body.fetchedAt, body };
        return send(body);
      } catch (e) {
        console.error(e);
        await kv([["DEL", LOCK]]).catch(() => {});
        const old = at ? await loadSnap(at) : null;
        if (old) return send(old, { stale: true, error: String(e.message || e).slice(0, 200) });
        return res.status(502).json({ configured: true, error: String(e.message || e).slice(0, 200) });
      }
    }
    // 別の 1 台が読み直し中: 前回のスナップショットを返す (なければ読み終わるまで少し待つ)
    if (at) return send(await loadSnap(at));
    for (let n = 0; n < 40; n++) {
      await new Promise((r) => setTimeout(r, 500));
      const [a2] = await kv([["GET", SNAP_AT]]);
      if (a2) return send(await loadSnap(a2));
    }
    return res.status(503).json({ configured: true, error: "Zort is being loaded, try again" });
  } catch (e) {
    // Redis が使えないときは Zort から直接読む
    console.error(e);
    try { const b = await readZort(accs); memo = { fetchedAt: b.fetchedAt, body: b }; return send(b); }
    catch (e2) { return res.status(502).json({ configured: true, error: String(e2.message || e2).slice(0, 200) }); }
  }
};
