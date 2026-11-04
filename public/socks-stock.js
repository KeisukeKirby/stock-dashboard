/* Socks 在庫シート: Zort の在庫から靴下 (商品名に Socks を含む VFF の SKU) だけを取り出して表示する。
   靴下は VFF の在庫一覧には出さない (app.js の isSocks で除いている)。 */
(() => {
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nf = (v) => (v == null ? "" : v === 0 ? "-" : v < 0 ? `(${Math.abs(v).toLocaleString("en-US")})` : v.toLocaleString("en-US"));
  const short = (g) => String(g).replace(" (Department)", " (Dept.)");
  const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizeIdx = (s) => { const i = SIZES.indexOf(String(s).toUpperCase()); return i < 0 ? 99 : i; };
  const isSocks = (name) => /socks?\b/i.test(String(name || ""));
  window.IS_SOCKS = isSocks;
  let data = null;

  function build(z) {
    const stores = z.locations.map((l) => l.name);
    const byCode = new Map();
    z.locations.forEach((loc, k) => {
      for (const [sku, q] of Object.entries(loc.stock)) {
        if (!sku.startsWith("VFF") || !isSocks(z.names[sku])) continue;
        let it = byCode.get(sku);
        if (!it) {
          const mm = /^(.*)\(([^,()]+),\s*(.+)\)\s*$/.exec(z.names[sku]);
          if (!mm) continue;
          it = { code: sku, model: mm[1].trim(), size: mm[2].trim(), color: mm[3].trim(), qty: stores.map(() => 0) };
          byCode.set(sku, it);
        }
        it.qty[k] += q;
      }
    });
    const items = [...byCode.values()].sort((a, b) =>
      a.model.localeCompare(b.model, "en", { sensitivity: "base" }) || a.color.localeCompare(b.color, "en") || sizeIdx(a.size) - sizeIdx(b.size));
    const zortAt = window.ZORT_TIME(z.fetchedAt);
    return { stores, items, zortAt };
  }

  function render() {
    if (!data) { $("sNote").textContent = t("socks.noZort"); return; }
    const q = ($("sq").value || "").trim().toLowerCase();
    const onlyStock = $("sStock").checked;
    const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
    // 在庫がある拠点 (マイナスを含む) だけを列にする
    const shown = data.stores.map((_, i) => i).filter((i) => data.items.some((it) => it.qty[i]));
    const rows = data.items.filter((it) => (!q || `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase().includes(q)) && (!onlyStock || total(it) > 0));
    const ncol = 3 + shown.length + 1;
    $("sThead").innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(t("socks.sheetTitle"))}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(t("zort.asof", { t: `Zort ${data.zortAt}` }))}</th></tr>
      <tr class="h1"><th>Model</th><th>Color</th><th>Size</th>
        ${shown.map((i) => `<th title="${esc(data.stores[i])}">${esc(short(data.stores[i]))}</th>`).join("")}<th>Total</th></tr>`;
    const body = rows.map((it) => `<tr><td title="${esc(it.code)}">${esc(it.model.replace(/^VFF\s+/, ""))}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
      ${shown.map((i) => `<td class="c${it.qty[i] < 0 ? " neg" : ""}"${it.qty[i] < 0 ? ` title="${esc(t("vivo.negTitle"))}"` : ""}>${nf(it.qty[i])}</td>`).join("")}
      <td class="c b">${nf(total(it))}</td></tr>`);
    if (!rows.length) body.push(`<tr><td class="empty" colspan="${ncol}">${esc(t("empty"))}</td></tr>`);
    const sum = (i) => rows.reduce((a, it) => a + (it.qty[i] || 0), 0);
    body.push(`<tr class="total"><td>Total</td><td></td><td></td>${shown.map((i) => `<td class="c">${nf(sum(i))}</td>`).join("")}<td class="c">${nf(rows.reduce((a, it) => a + total(it), 0))}</td></tr>`);
    $("sTbody").innerHTML = body.join("");
    $("sCount").textContent = rows.length === data.items.length ? t("count.all", { n: data.items.length }) : t("count.of", { n: data.items.length, m: rows.length });
    $("sNote").textContent = t("socks.note");
  }

  ["sq", "sStock"].forEach((id) => $(id).addEventListener(id === "sq" ? "input" : "change", render));
  window.I18N.onChange(render);
  let shownAt = null;
  const show = (z) => {
    if (!z) return render();
    data = build(z);
    shownAt = z.fetchedAt;
    render();
  };
  show(window.ZORT_CACHED);
  if (window.ZORT) window.ZORT.then((fresh) => { if (fresh && fresh.fetchedAt !== shownAt) show(fresh); else if (!data) render(); });
  window.addEventListener("zort-update", (e) => { if (e.detail.fetchedAt !== shownAt) show(e.detail); });
})();
