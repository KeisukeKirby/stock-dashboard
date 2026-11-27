// マレーシアの在庫 (JB = ジョホールバルの倉庫、KL = クアラルンプールのイベント分)  —  Vercel Function
//
//   GET /api/malaysia
//        → { asof, salesUntil, items: [ { sku, model, color, size, jb, kl } ] }   (VFF の靴だけ)
//
// 取得元: https://malaysia-sales-dashboard.vercel.app/ のページに埋め込まれた在庫データ (<script id="payload">)。
// JB はそのダッシュボードと同じ計算: 販売可能数 − KL 分 (0 未満は 0)。

const SRC = "https://malaysia-sales-dashboard.vercel.app/";

module.exports = async (req, res) => {
  try {
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
    const meta = stock.meta || {};
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ asof: meta.asof_ts || meta.asof || null, salesUntil: meta.sales_until || null, items });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(e.message || e) });
  }
};
