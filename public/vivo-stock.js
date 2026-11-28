/* Vivo 在庫タブ: public/vivo_stock.json を在庫一覧と同じ Excel 書式で表示する */
(() => {
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nf = (v) => (v == null ? "" : v === 0 ? "-" : v.toLocaleString("en-US"));
  const short = (g) => String(g).replace(" (Department)", " (Dept.)");
  let data = null;

  function render() {
    if (!data) return;
    const q = ($("vq").value || "").trim().toLowerCase();
    const onlyStock = $("vStock").checked;
    // 在庫がある拠点 (マイナスを含む) だけを列にする
    const shown = data.stores.map((_, i) => i).filter((i) => data.items.some((it) => it.qty[i]));
    const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
    const rows = data.items.filter((it) => (!q || `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase().includes(q)) && (!onlyStock || total(it) > 0));
    const pending = data.stores.filter((_, i) => !data.counted[i]);
    window.OTHER_SHEET.render({
      thead: $("vThead"), tbody: $("vTbody"), title: data.title, stores: data.stores, shown, rows,
      asof: data.zortAt ? t("zort.asof", { t: `Zort ${data.zortAt}` }) : data.counts.map((c) => `${c.store}: ${c.date}`).join(" / "),
      modelOf: (it) => it.model.replace(/^Vivo\s+/, ""),
    });
    $("vCount").textContent = rows.length === data.items.length ? t("count.all", { n: data.items.length }) : t("count.of", { n: data.items.length, m: rows.length });
    const negs = data.items.filter((it) => it.qty.some((v) => v < 0));
    $("vNote").textContent = data.zortAt ? t("vivo.noteZort") + (negs.length ? " " + t("vivo.neg", { n: negs.length, q: -negs.reduce((a, it) => a + it.qty.reduce((b, v) => b + (v < 0 ? v : 0), 0), 0) }) : "") : t("vivo.note", { done: data.counts.map((c) => `${c.store}（${c.date}）`).join("、"), pending: pending.join(", ") });
  }

  window.OTHER_SHEET.salesReady.then(render);
  window.OTHER_SHEET.onSales(render);
  ["vq", "vStock"].forEach((id) => $(id).addEventListener(id === "vq" ? "input" : "change", render));
  window.I18N.onChange(render);
  // Zort の在庫があれば、対応する拠点の数を Zort の数に置き換える
  function applyZort(d, z) {
    if (!z) return;
    const codes = new Set(d.items.map((it) => it.code));
    for (const [loc, m] of Object.entries(z.byLocation)) {
      let k = d.stores.indexOf(loc);
      if (k < 0) {
        d.stores.push(loc);
        d.items.forEach((it) => it.qty.push(null));
        d.counted.push(true);
        k = d.stores.length - 1;
      }
      d.items.forEach((it) => (it.qty[k] = m[it.code] || 0));
      for (const [sku, q] of Object.entries(m)) {
        if (!q || !sku.startsWith("VV") || codes.has(sku)) continue;
        const mm = /^(.*)\((\w+),\s*(.+)\)\s*$/.exec(z.names[sku] || "");
        if (!mm) continue;
        const it = { code: sku, model: mm[1].trim(), color: mm[3].trim(), size: mm[2], qty: d.stores.map(() => null) };
        it.qty[k] = q;
        d.items.push(it);
        codes.add(sku);
      }
      d.counted[k] = true;
    }
    // Zort の商品マスタにあって在庫がない Vivo の商品も行を出す
    for (const [sku, name] of Object.entries(z.names || {})) {
      if (!sku.startsWith("VV") || codes.has(sku)) continue;
      const mm = /^(.*)\((\w+),\s*(.+)\)\s*$/.exec(name || "");
      if (!mm) continue;
      d.items.push({ code: sku, model: mm[1].trim(), color: mm[3].trim(), size: mm[2], qty: d.stores.map(() => 0) });
      codes.add(sku);
    }
    d.zortAt = window.ZORT_TIME(z.fetchedAt);
    // Zort に来ていない拠点 (棚卸だけの数) は使わない
    d.stores.forEach((loc, k) => { if (!(loc in z.byLocation)) d.items.forEach((it) => (it.qty[k] = null)); });
  }
  let base = null, shownAt = null;
  const show = (z) => {
    const d = JSON.parse(JSON.stringify(base));
    applyZort(d, z);
    // 同じ モデル・カラー・サイズ の行 (品番の書き方違い) は 1 行にまとめる
    const dk = (it) => `${it.model}|${it.color}|${it.size}`.toLowerCase().replace(/[^a-z0-9|]/g, "");
    const firstOf = new Map();
    d.items = d.items.filter((it) => {
      const m = firstOf.get(dk(it));
      if (!m) { firstOf.set(dk(it), it); return true; }
      m.qty = m.qty.map((q, i) => (q == null && it.qty[i] == null ? null : (q || 0) + (it.qty[i] || 0)));
      if (it.code && it.code !== m.code) m.codes = [...(m.codes || []), it.code];
      return false;
    });
    // 並び: モデル (A→Z) → 性別 (M → W …) → カラー (最初に出てきた順) → サイズ (小さい順)
    const mk = (it) => it.model.replace(/^Vivo\s+/i, "").trim().toLowerCase();
    const sk = (s) => { const m = /^([A-Za-z]*)\s*(\d+(?:\.\d+)?)/.exec(String(s)); return m ? [m[1].toUpperCase(), +m[2]] : [String(s), 0]; };
    const cfirst = new Map();
    d.items.forEach((it, i) => { const k = `${mk(it)}|${it.color}`; if (!cfirst.has(k)) cfirst.set(k, i); });
    d.items.sort((a, b) => mk(a).localeCompare(mk(b), "en") || sk(a.size)[0].localeCompare(sk(b.size)[0])
      || cfirst.get(`${mk(a)}|${a.color}`) - cfirst.get(`${mk(b)}|${b.color}`) || sk(a.size)[1] - sk(b.size)[1]);
    shownAt = z ? z.fetchedAt : null;
    data = d;
    render();
  };
  fetch(`vivo_stock.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json())
    .then((d) => { base = d; return window.ZORT_CACHED || window.ZORT || null; })
    .then((z) => {
      show(z);
      if (window.ZORT) window.ZORT.then((fresh) => { if (fresh && fresh.fetchedAt !== shownAt) show(fresh); });
      window.addEventListener("zort-update", (e) => { if (e.detail.fetchedAt !== shownAt) show(e.detail); });
    })
    .catch(() => { $("vNote").textContent = t("loadFail"); });
})();
