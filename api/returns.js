// 返品 (Return) 入力の共有保存 API  —  Vercel Function
//
//   GET  /api/returns?key=returns:09/25/2026
//        → { shared: true, returns: { "<商品>@<店舗>": 数量, ... }, received: { ... }, updatedAt }
//          returns  = 返品輸送中 (店舗からは引くが、オフィスにはまだ足さない)
//          received = オフィスで受領完了した返品 (オフィス在庫に足す)
//   POST /api/returns   body: { key, set: { "<商品>@<店舗>": 数量 }, del: ["<商品>@<店舗>"],
//                               receive: [マス], unreceive: [マス], seed: { id, set } }
//        → 変更したマスだけを書き込み、最新の全体を返す (同時に別のマスを入力しても消えない)
//          receive:   輸送中 → 受領済み に移す (数量はサーバーの最新値)
//          unreceive: 受領済み → 輸送中 に戻す
//          seed:      Excel から取り込んだ返品を 1 度だけ登録する (既に入力があるマスは上書きしない)
//
// 保存先: Upstash Redis (Vercel の Storage / Marketplace から作成してプロジェクトに接続)
//   環境変数 KV_REST_API_URL / KV_REST_API_TOKEN
//   (または UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN。頭に任意の Prefix が付いていてもよい)

// Vercel で Storage を接続するときに Custom Prefix を付けると、変数名の頭が変わる
// (例: STORAGE_KV_REST_API_URL)。末尾の名前で探すので、どの Prefix でも動く。
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

const KEY_RE = /^returns:[\w\/\-.]{1,40}$/;
const MAX_FIELDS = 5000;
const MAX_FIELD_LEN = 200;
const MAX_QTY = 100000;

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

const toList = (x) => (Array.isArray(x) ? x.filter((f) => typeof f === "string" && f.length <= MAX_FIELD_LEN) : []);
const validQty = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_QTY;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    res.status(503).json({ shared: false, error: "shared storage is not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      const key = String((req.query && req.query.key) || new URL(req.url, "http://x").searchParams.get("key") || "");
      if (!KEY_RE.test(key)) return res.status(400).json({ error: "bad key" });
      const [flat, recv, updatedAt] = await redis([["HGETALL", key], ["HGETALL", `${key}:received`], ["GET", `${key}:updatedAt`]]);
      return res.status(200).json({ shared: true, returns: toMap(flat), received: toMap(recv), updatedAt: updatedAt || null });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const key = String(body.key || "");
      if (!KEY_RE.test(key)) return res.status(400).json({ error: "bad key" });
      const set = body.set && typeof body.set === "object" ? body.set : {};
      const del = Array.isArray(body.del) ? body.del : [];
      const receive = toList(body.receive), unreceive = toList(body.unreceive);
      const seed = body.seed && typeof body.seed === "object" && body.seed.set && typeof body.seed.set === "object" ? body.seed : null;
      const seedId = seed ? String(seed.id || "") : "";
      if (seed && !/^[\w\-.]{1,80}$/.test(seedId)) return res.status(400).json({ error: "bad seed id" });
      const nSeed = seed ? Object.keys(seed.set).length : 0;
      if (Object.keys(set).length + del.length + receive.length + unreceive.length + nSeed > MAX_FIELDS) {
        return res.status(400).json({ error: "too many changes" });
      }
      const RECV = `${key}:received`;

      const hset = ["HSET", key];
      for (const [f, v] of Object.entries(set)) {
        const n = Number(v);
        if (typeof f !== "string" || f.length > MAX_FIELD_LEN || !validQty(n)) {
          return res.status(400).json({ error: `bad value for ${String(f).slice(0, 60)}` });
        }
        hset.push(f, String(n));
      }
      const hdel = ["HDEL", key, ...del.filter((f) => typeof f === "string" && f.length <= MAX_FIELD_LEN)];

      const now = new Date().toISOString();
      const cmds = [];
      // Excel からの取り込み: 同じ id では 1 度だけ。既にあるマスは HSETNX で上書きしない
      if (seed) {
        const [first] = await redis([["SET", `${key}:seed:${seedId}`, now, "NX"]]);
        if (first === "OK") {
          for (const [f, v] of Object.entries(seed.set)) {
            const n = Number(v);
            if (typeof f === "string" && f.length <= MAX_FIELD_LEN && validQty(n)) cmds.push(["HSETNX", key, f, String(n)]);
          }
        }
      }
      if (hset.length > 2) cmds.push(hset);
      if (hdel.length > 2) cmds.push(hdel);
      // 受領完了 / 取り消し: サーバーの最新の数量で移す
      if (receive.length || unreceive.length) {
        const cur = await redis([
          ["HMGET", key, ...(receive.length ? receive : ["-"])],
          ["HMGET", RECV, ...(unreceive.length ? unreceive : ["-"])],
        ]);
        receive.forEach((f, i) => {
          const n = Number(cur[0][i]);
          if (n > 0) cmds.push(["HINCRBY", RECV, f, String(n)], ["HDEL", key, f]);
        });
        unreceive.forEach((f, i) => {
          const n = Number(cur[1][i]);
          if (n > 0) cmds.push(["HINCRBY", key, f, String(n)], ["HDEL", RECV, f]);
        });
      }
      cmds.push(["SET", `${key}:updatedAt`, now], ["HGETALL", key], ["HGETALL", RECV]);
      const out = await redis(cmds);
      return res.status(200).json({ shared: true, returns: toMap(out[out.length - 2]), received: toMap(out[out.length - 1]), updatedAt: now });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "storage error" });
  }
};
