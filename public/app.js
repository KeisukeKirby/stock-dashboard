(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Excel の表示形式 #,##0;\(#,##0\);\-  (空セルは空欄のまま)
  const nf = (v) => {
    if (v === null || v === undefined) return "";
    if (v === 0) return "-";
    const s = Math.abs(v).toLocaleString("en-US");
    return v < 0 ? `(${s})` : s;
  };

  // Excel の列幅 (文字数) → px : width * 7 + 5
  const COL_W = { code: 23.63, model: 15.27, color: 16.63, size: 10.91, qty: 12.36, ret: 11.18 };
  const px = (w) => Math.round(w * 7 + 5);

  function render(d) {
    const groups = [...d.stores, "Total"];
    const ncol = 4 + groups.length * 2;

    $("cols").innerHTML =
      [COL_W.code, COL_W.model, COL_W.color, COL_W.size].map((w) => `<col style="width:${px(w)}px">`).join("") +
      groups.map(() => `<col style="width:${px(COL_W.qty)}px"><col style="width:${px(COL_W.ret)}px">`).join("");

    $("thead").innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(d.title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(d.asOf)}</th></tr>
      <tr class="h1">
        <th rowspan="2">Code</th><th rowspan="2">Model</th><th rowspan="2">Color</th><th rowspan="2">Size</th>
        ${groups.map((g) => `<th colspan="2">${esc(g)}</th>`).join("")}
      </tr>
      <tr class="h2">${groups.map(() => `<th>Quantity</th><th class="ret-h">Return</th>`).join("")}</tr>`;

    const rows = d.items.map((it) => {
      const tq = it.totalQty ?? it.qty.reduce((a, b) => a + b, 0);
      const tr = it.totalRet ?? it.ret.reduce((a, b) => a + (b || 0), 0);
      return `<tr>
        <td>${esc(it.code)}</td><td>${esc(it.model)}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${it.qty.map((q, i) => `<td class="c">${nf(q)}</td><td class="c ret">${nf(it.ret[i])}</td>`).join("")}
        <td class="c b">${nf(tq)}</td><td class="c b">${nf(tr)}</td>
      </tr>`;
    });

    let t = d.totalRow;
    if (!t) {
      const qty = d.stores.map((_, i) => d.items.reduce((a, it) => a + it.qty[i], 0));
      const ret = d.stores.map((_, i) => d.items.reduce((a, it) => a + (it.ret[i] || 0), 0));
      const sum = (a) => a.reduce((x, y) => x + y, 0);
      t = { qty: [...qty, sum(qty)], ret: [...ret, sum(ret)] };
    }
    rows.push(`<tr class="total">
      <td>Total</td><td></td><td></td><td></td>
      ${groups.map((_, i) => `<td class="c">${nf(t.qty[i])}</td><td class="c">${nf(t.ret[i])}</td>`).join("")}
    </tr>`);

    $("tbody").innerHTML = rows.join("");
    document.title = d.title;
    $("status").textContent = "";
  }

  fetch("stock.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then(render)
    .catch((err) => {
      $("status").textContent = "データの読み込みに失敗しました";
      console.error(err);
    });
})();
