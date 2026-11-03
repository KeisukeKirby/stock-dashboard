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
    // 在庫がある拠点だけを列にする
    const shown = data.stores.map((_, i) => i).filter((i) => data.items.some((it) => it.qty[i] > 0));
    const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
    const rows = data.items.filter((it) => (!q || `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase().includes(q)) && (!onlyStock || total(it) > 0));
    const ncol = 3 + shown.length + 1;
    const pending = data.stores.filter((_, i) => !data.counted[i]);
    $("vThead").innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(data.title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(data.zortAt ? t("zort.asof", { t: `Zort ${data.zortAt}` }) : data.counts.map((c) => `${c.store}: ${c.date}`).join(" / "))}</th></tr>
      <tr class="h1"><th>Model</th><th>Color</th><th>Size</th>
        ${shown.map((i) => `<th title="${esc(data.stores[i])}">${esc(short(data.stores[i]))}</th>`).join("")}<th>Total</th></tr>`;
    const body = rows.map((it) => `<tr><td>${esc(it.model.replace(/^Vivo\s+/, ""))}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
      ${shown.map((i) => `<td class="c">${nf(it.qty[i] ?? 0)}</td>`).join("")}
      <td class="c b">${nf(total(it))}</td></tr>`);
    if (!rows.length) body.push(`<tr><td class="empty" colspan="${ncol}">${esc(t("empty"))}</td></tr>`);
    const sum = (i) => rows.reduce((a, it) => a + (it.qty[i] || 0), 0);
    body.push(`<tr class="total"><td>Total</td><td></td><td></td>${shown.map((i) => `<td class="c">${nf(sum(i))}</td>`).join("")}<td class="c">${nf(rows.reduce((a, it) => a + total(it), 0))}</td></tr>`);
    $("vTbody").innerHTML = body.join("");
    $("vCount").textContent = rows.length === data.items.length ? t("count.all", { n: data.items.length }) : t("count.of", { n: data.items.length, m: rows.length });
    $("vNote").textContent = data.zortAt ? t("vivo.noteZort") : t("vivo.note", { done: data.counts.map((c) => `${c.store}（${c.date}）`).join("、"), pending: pending.join(", ") });
  }

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
    const t = new Date(z.fetchedAt);
    d.zortAt = `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    // Zort に来ていない拠点 (棚卸だけの数) は使わない
    d.stores.forEach((loc, k) => { if (!(loc in z.byLocation)) d.items.forEach((it) => (it.qty[k] = null)); });
  }
  fetch(`vivo_stock.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json())
    .then((d) => (window.ZORT || Promise.resolve(null)).then((z) => { applyZort(d, z); return d; }))
    .then((d) => { data = d; render(); })
    .catch(() => { $("vNote").textContent = t("loadFail"); });
})();
