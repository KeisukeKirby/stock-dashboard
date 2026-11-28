// VFF の靴以外 (Vivo・VFF の靴下・Barefoot Japan・Oleno・Coolcore) の販売足数を Zort の受注から数える API  —  Vercel Function
//
//   GET /api/zort-sales            → { from, to, months, sales: { 品番: 足数 }, at }   (2026-01 から今月まで)
//   GET /api/zort-sales?probe=1    → 受注データの形の確認用 (項目名・件数だけ。顧客情報は返さない)
//
// 拠点の決まりは VFF の月平均販売 (scripts/sales_rate.py) と同じ: Online・Event・K Village・Central LP・Paradise Park の販売だけ数える。
// 月ごとの集計を Upstash に保存する (過去の月は 1 回だけ数える。今月は 6 時間ごとに数え直す)。
// 1 回の呼び出しで数える月は時間の許す分だけ。残りは次の呼び出しで続ける (partial: true)。

const BASE = process.env.ZORT_BASE_URL || "https://open-api.zortout.com/v4";
const START = "2026-01";
const CODE = /^(VV|BFJ|OLN|CC)\d/;
const ONLINE_CHANNELS = new Set(["Shopee", "Shopee VFF", "Shopee BFI", "Lazada", "Facebook", "LINE", "Instagram", "Website", "barefootinc"]);
const STORE_WH = new Set(["Kvillage", "Coollabo Cen LP 3F", "Paradise Park"]);
const EVENT_WH = new Set(["Event 1", "Event 2", "CART Central LP"]);
const PAGE = 500;
const KEY = (ym) => `zortsales:v1:${ym}`;
const CUR_MAX_AGE = 6 * 3600 * 1000;
const BUDGET_MS = 45 * 1000;

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

function accounts() {
  return String(process.env.ZORT_ACCOUNTS || "").split(",").map((s) => s.trim()).filter(Boolean).map((name) => {
    const k = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    return { name, storename: process.env[`ZORT_${k}_STORENAME`], apikey: process.env[`ZORT_${k}_APIKEY`], apisecret: process.env[`ZORT_${k}_APISECRET`] };
  }).filter((a) => a.storename && a.apikey && a.apisecret);
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

const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== "") return o[k]; return undefined; };
const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
};
const monthsUntilNow = () => {
  const out = [];
  const now = new Date(Date.now() + 7 * 3600 * 1000); // タイ時間
  let [y, m] = START.split("-").map(Number);
  while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth() + 1)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
};

async function warehouseNames(acc) {
  const j = await call(acc, "Warehouse/GetWarehouses");
  return Object.fromEntries((j.list || []).map((w) => [String(w.code ?? w.id), String(w.name || w.code || "").trim()]));
}

// 1 アカウント・1 か月分の受注を全部読む
async function ordersOf(acc, ym) {
  const [from, to] = monthRange(ym);
  const out = [];
  for (let page = 1; page <= 200; page++) {
    const j = await call(acc, "Order/GetOrders", { page, limit: PAGE, orderdateafter: from, orderdatebefore: to });
    const list = j.list || [];
    out.push(...list);
    if (list.length < PAGE) break;
  }
  return out;
}

function countMonth(orders, whName, ym, sales) {
  for (const o of orders) {
    const status = String(pick(o, "status") || "");
    if (/void|cancel/i.test(status)) continue;
    const date = String(pick(o, "orderdate", "orderDate", "createdatetime") || "");
    if (date && !date.startsWith(ym)) continue; // 日付の絞り込みが効かなかったときのため
    const ch = String(pick(o, "saleschannel", "salesChannel") || "");
    const no = String(pick(o, "number", "ordernumber") || "");
    const whc = pick(o, "warehousecode", "warehouseCode");
    const wh = String(whName[String(whc)] || pick(o, "warehousename", "warehouse") || "");
    const ok = ONLINE_CHANNELS.has(ch) || (!ch && no.startsWith("TX")) || wh === "Online" || EVENT_WH.has(wh) || STORE_WH.has(wh);
    if (!ok) continue;
    for (const it of o.list || o.items || []) {
      const sku = String(pick(it, "sku") || "").trim();
      const name = String(pick(it, "name") || "");
      if (!(CODE.test(sku) || (sku.startsWith("VFF") && /socks?\b/i.test(name)))) continue;
      sales[sku] = (sales[sku] || 0) + Number(pick(it, "number", "quantity", "qty") || 0);
    }
  }
}

async function buildMonth(accs, ym) {
  const sales = {};
  for (const acc of accs) {
    const [names, orders] = await Promise.all([warehouseNames(acc), ordersOf(acc, ym)]);
    countMonth(orders, names, ym, sales);
  }
  return { sales, at: new Date().toISOString() };
}

async function probe(res, accs) {
  const out = [];
  for (const acc of accs) {
    const j = await call(acc, "Order/GetOrders", { page: 1, limit: 20, orderdateafter: "2026-01-01", orderdatebefore: "2026-01-31" });
    const list = j.list || [];
    const o = list[0] || {};
    out.push({
      account: acc.name, count: j.count ?? null, got: list.length,
      orderKeys: Object.keys(o), itemKeys: Object.keys((o.list || o.items || [])[0] || {}),
      dates: list.map((x) => pick(x, "orderdate", "orderDate")).slice(0, 20),
      statuses: [...new Set(list.map((x) => x.status))], channels: [...new Set(list.map((x) => x.saleschannel))],
      warehouses: [...new Set(list.map((x) => x.warehousecode))],
    });
  }
  res.status(200).json(out);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const accs = accounts();
  if (!accs.length) return res.status(503).json({ configured: false });
  try {
    if (/[?&]probe=1/.test(req.url || "")) return await probe(res, accs);
    if (!KV_URL || !KV_TOKEN) return res.status(503).json({ error: "storage not configured" });
    const t0 = Date.now();
    const months = monthsUntilNow();
    const cur = months[months.length - 1];
    const saved = await kv(months.map((m) => ["GET", KEY(m)]));
    const data = {};
    let partial = false;
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      let v = null;
      try { v = saved[i] ? JSON.parse(saved[i]) : null; } catch (_) {}
      const stale = !v || (m === cur && Date.now() - new Date(v.at).getTime() > CUR_MAX_AGE);
      if (stale && Date.now() - t0 < BUDGET_MS) {
        try {
          v = await buildMonth(accs, m);
          await kv([["SET", KEY(m), JSON.stringify(v)]]);
        } catch (e) {
          console.error("zort-sales", m, e.message);
          if (!v) partial = true;
        }
      } else if (!v) partial = true;
      if (v) data[m] = v;
    }
    const got = months.filter((m) => data[m]);
    const sales = {};
    got.forEach((m) => Object.entries(data[m].sales).forEach(([k, q]) => (sales[k] = (sales[k] || 0) + q)));
    res.status(200).json({ from: got[0] || null, to: got[got.length - 1] || null, months: got, partial, sales, at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e).slice(0, 200) });
  }
};
