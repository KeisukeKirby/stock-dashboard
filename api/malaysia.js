// マレーシアの在庫 (JB = ジョホールバルの倉庫、KL = クアラルンプールのイベント分)  —  Vercel Function
//
//   GET /api/malaysia
//        → { asof, salesUntil, fetchedAt, items: [ { sku, model, color, size, jb, kl } ] }   (VFF の靴だけ)
//
// 取得元: https://malaysia-sales-dashboard.vercel.app/ のページに埋め込まれた在庫データ (<script id="payload">)。
// JB はそのダッシュボードと同じ計算: 販売可能数 − KL 分 (0 未満は 0)。
//
// 更新は週 1 回: 毎週月曜 タイ時間 10:00。取った在庫を Upstash に保存し、次の月曜 10:00 まで同じ数を返す。
// vercel.json の cron (月曜 03:00 UTC = タイ時間 10:00) がこの API を呼んで更新する。
// cron が動かなかったときも、月曜 10:00 を過ぎて最初に開いた人のときに更新する。

const SRC = "https://malaysia-sales-dashboard.vercel.app/";
const KEY = "malaysia:stock";

const envBySuffix = (...suffixes) => {
  for (const suf of suffixes) {
    if (process.env[suf]) return process.env[suf];
    const key = Object.keys(process.env).find((k) => k.endsWith(`_${suf}`) && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
};
const URL_ = envBySuffix("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL", "REST_API_URL");
const TOKEN = envBySuffix("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "REST_API_TOKEN");

async function redis(commands) {
  const r = await fetch(`${URL_.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const out = await r.json();
  const err = out.find((x) => x && x.error);
  if (err) throw new Error(err.error);
  return out.map((x) => x.result);
}

// 直近の「月曜 タイ時間 10:00」(= 月曜 03:00 UTC) の時刻
function lastMonday10(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // その週の月曜
  if (d > now) d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

async function fetchSource() {
  const r = await fetch(SRC, { headers: { "user-agent": "stock-dashboard" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("payload not found");
  const stock = (JSON.parse(m[1]) || {}).stock || {};
  const items = (stock.items || [])
    .filter((x) => String(x.sku || "").startsWith("VFF") && x.cat === "shoes")
    .map((x) => {
      const kl = Math.max(0, Number(x.kl) || 0);
      return { sku: x.sku, model: x.model, color: x.color, size: x.size, jb: Math.max(0, (Number(x.sellable) || 0) - kl), kl };
    });
  if (!items.length) throw new Error("no items");
  const meta = stock.meta || {};
  return { asof: meta.asof_ts || meta.asof || null, salesUntil: meta.sales_until || null, fetchedAt: new Date().toISOString(), items };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!URL_ || !TOKEN) return res.status(200).json(await fetchSource()); // 保存先がないときは毎回取る
    const [saved] = await redis([["GET", KEY]]);
    let snap = null;
    try { snap = saved ? JSON.parse(saved) : null; } catch (_) {}
    if (!snap || new Date(snap.fetchedAt) < lastMonday10()) {
      try {
        snap = await fetchSource();
        await redis([["SET", KEY, JSON.stringify(snap)]]);
      } catch (e) {
        if (!snap) throw e; // 取れなかったときは前回の数を返す
      }
    }
    res.status(200).json(snap);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
