/* Vivo・Socks・Coolcore の表を VFF の在庫一覧と同じ見え方で作る共通部品。
   列: Model・Color・Size | Sales | Company Total Stock | 拠点 (VFF と同じ並び: Office → Paradise Park → K Village → Central CL → Siam Discovery → Central LP → Event → そのほか)
   Sales = public/other_sales.json (scripts/other_sales.py。Zort の受注明細から数えた販売足数) */
(() => {
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nf = (v) => (v == null ? "" : v === 0 ? "-" : v < 0 ? `(${Math.abs(v).toLocaleString("en-US")})` : v.toLocaleString("en-US"));
  const short = (g) => String(g).replace(" (Department)", " (Dept.)");
  const MAIN = ["Office", "Paradise Park", "K Village", "Central CL (Department)", "Siam Discovery", "Central LP"];
  const locRank = (name) => {
    const i = MAIN.indexOf(name);
    return i >= 0 ? i : /^event/i.test(name) ? 50 : 100;
  };
  // 拠点の並び (VFF と同じ)。同じ順位のものは元の並び
  const orderLocs = (stores, idx) => idx.slice().sort((a, b) => locRank(stores[a]) - locRank(stores[b]) || a - b);

  let sales = null;
  const salesReady = fetch(`other_sales.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((j) => { sales = j; return j; });

  const salesLabel = () => {
    if (!sales) return "";
    const f = (ym) => `${+ym.slice(5)}`;
    return sales.from === sales.to ? `${sales.from.slice(0, 4)}/${f(sales.from)}` : `${sales.from.slice(0, 4)}/${f(sales.from)}–${f(sales.to)}`;
  };
  const salesOf = (it) => {
    if (!sales) return null;
    const codes = [it.code, ...(it.codes || [])].filter(Boolean);
    return codes.reduce((a, c) => a + (sales.sales[c] || 0), 0);
  };

  // 表を描く。rows: [{ code, model, color, size, qty: [拠点ごと] }]、shown: 表示する拠点の番号
  function render({ thead, tbody, title, asof, stores, shown, rows, modelOf }) {
    // 主要な拠点 (VFF の表で常に出す列) は在庫がなくても列を出す
    const order = orderLocs(stores, [...new Set([...shown, ...stores.map((n, i) => (MAIN.includes(n) || /^event/i.test(n) ? i : -1)).filter((i) => i >= 0)])]);
    const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
    const ncol = 3 + 2 + order.length;
    // 列幅と縮小率は VFF の在庫一覧と同じ (VFF の表が画面に合わせて縮んでいれば同じ倍率)
    const table = thead.closest("table");
    const px = (w) => Math.round(w * 7 + 5);
    let cg = table.querySelector("colgroup");
    if (!cg) { cg = document.createElement("colgroup"); table.insertBefore(cg, thead); }
    cg.innerHTML = [12.5, 14.5, 4.6, 6.4, 8.5, ...order.map(() => 6)].map((w) => `<col style="width:${px(w)}px">`).join("");
    const vff = document.getElementById("stockTable");
    const fit = vff && parseFloat(vff.style.getPropertyValue("--fit"));
    table.style.setProperty("--fit", fit > 0 ? fit : 1);
    thead.innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(asof)}</th></tr>
      <tr class="h1"><th rowspan="2">Model</th><th rowspan="2">Color</th><th rowspan="2">Size</th>
        <th class="info-h" title="${esc(t("oth.salesTitle", { p: salesLabel() }))}">Sales</th>
        <th class="grp ct">Company Total Stock</th>
        ${order.map((i) => `<th class="grp" title="${esc(stores[i])}">${esc(short(stores[i]))}</th>`).join("")}</tr>
      <tr class="h2"><th class="info-h info-now">${esc(salesLabel())}</th><th class="ct">Qty</th>${order.map(() => "<th>Qty</th>").join("")}</tr>`;
    const lv = (q) => (q < 0 ? "lvn" : q === 0 ? "lv0" : q === 1 ? "lv1" : "lv2");
    const body = rows.map((it) => {
      const s = salesOf(it);
      const tq = total(it);
      return `<tr><td title="${esc(it.code || "")}">${esc(modelOf(it))}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        <td class="c info info-now">${s == null ? "" : nf(s)}</td>
        <td class="c q ct">${nf(tq)}</td>
        ${order.map((i) => { const q = it.qty[i] || 0; return `<td class="c q ${lv(q)}"${q < 0 ? ` title="${esc(t("vivo.negTitle"))}"` : ""}>${nf(q)}</td>`; }).join("")}</tr>`;
    });
    if (!rows.length) body.push(`<tr><td class="empty" colspan="${ncol}">${esc(t("empty"))}</td></tr>`);
    const sum = (i) => rows.reduce((a, it) => a + (it.qty[i] || 0), 0);
    const sumSales = sales ? rows.reduce((a, it) => a + (salesOf(it) || 0), 0) : null;
    body.push(`<tr class="total"><td>Total</td><td></td><td></td><td class="c info">${sumSales == null ? "" : nf(sumSales)}</td>
      <td class="c ct">${nf(rows.reduce((a, it) => a + total(it), 0))}</td>${order.map((i) => `<td class="c">${nf(sum(i))}</td>`).join("")}</tr>`);
    tbody.innerHTML = body.join("");
  }

  window.OTHER_SHEET = { render, salesReady };
})();
