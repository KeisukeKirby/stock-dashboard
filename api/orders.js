// Order (発注数) の共有保存 API  —  Vercel Function
//
//   GET  /api/orders
//        → { shared: true, draft: { "<商品>": 数量, ... }, updatedAt, confirmed: [ { at, items: {...}, total } ] }
//   POST /api/orders   body: { set: { "<商品>": 数量 }, del: ["<商品>"] }
//        → 変更したマスだけを書き込み、最新の全体を返す (同時に別のマスを入力しても消えない)
//   POST /api/orders   body: { confirm: true }
//        → 保存済みの Order を確定履歴に移し、入力欄を空にする
//
// 保存先: returns.js と同じ Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN。Prefix 付きでも可)

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

const DRAFT = "orders:draft";
const HISTORY = "orders:confirmed";
const MAX_FIELDS = 5000;
const MAX_FIELD_LEN = 200;
const MAX_QTY = 100000;
const KEEP = 50; // 確定履歴を残す件数

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

const toMap = (flat) => {
  const m = {};
  for (let i = 0; flat && i < flat.length; i += 2) m[flat[i]] = Number(flat[i + 1]);
  return m;
};
const parseList = (list) => (list || []).map((s) => { try { return JSON.parse(s); } catch (_) { return null; } }).filter(Boolean);

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function state(extra = []) {
  const out = await redis([...extra, ["HGETALL", DRAFT], ["GET", `${DRAFT}:updatedAt`], ["LRANGE", HISTORY, 0, KEEP - 1]]);
  const n = out.length;
  return { shared: true, draft: toMap(out[n - 3]), updatedAt: out[n - 2] || null, confirmed: parseList(out[n - 1]) };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    res.status(503).json({ shared: false, error: "shared storage is not configured" });
    return;
  }
  try {
    if (req.method === "GET") return res.status(200).json(await state());

    if (req.method === "POST") {
      const body = await readBody(req);
      const now = new Date().toISOString();

      if (body.confirm) {
        const [flat] = await redis([["HGETALL", DRAFT]]);
        const items = toMap(flat);
        const total = Object.values(items).reduce((a, v) => a + v, 0);
        if (!total) return res.status(200).json({ ...(await state()), confirmedNow: null });
        const entry = { at: now, items, total };
        const s = await state([
          ["LPUSH", HISTORY, JSON.stringify(entry)],
          ["LTRIM", HISTORY, 0, KEEP - 1],
          ["DEL", DRAFT],
          ["SET", `${DRAFT}:updatedAt`, now],
        ]);
        return res.status(200).json({ ...s, confirmedNow: entry });
      }

      const set = body.set && typeof body.set === "object" ? body.set : {};
      const del = Array.isArray(body.del) ? body.del : [];
      if (Object.keys(set).length + del.length > MAX_FIELDS) return res.status(400).json({ error: "too many changes" });
      const hset = ["HSET", DRAFT];
      for (const [f, v] of Object.entries(set)) {
        const n = Number(v);
        if (typeof f !== "string" || f.length > MAX_FIELD_LEN || !Number.isInteger(n) || n < 1 || n > MAX_QTY) {
          return res.status(400).json({ error: `bad value for ${String(f).slice(0, 60)}` });
        }
        hset.push(f, String(n));
      }
      const hdel = ["HDEL", DRAFT, ...del.filter((f) => typeof f === "string" && f.length <= MAX_FIELD_LEN)];
      const cmds = [];
      if (hset.length > 2) cmds.push(hset);
      if (hdel.length > 2) cmds.push(hdel);
      cmds.push(["SET", `${DRAFT}:updatedAt`, now]);
      return res.status(200).json(await state(cmds));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "storage error" });
  }
};
