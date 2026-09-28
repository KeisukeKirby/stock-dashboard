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

  const state = { q: "", model: "", color: "", size: "", stock: "" };
  let data = null;
  let groups = [];

  const uniq = (arr) => [...new Set(arr)];
  const sizeKey = (s) => {
    const m = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(s);
    return m ? [m[1], parseFloat(m[2])] : [s, 0];
  };
  const fillSelect = (sel, values) =>
    sel.insertAdjacentHTML("beforeend", values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(""));

  function renderFrame(d) {
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
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return data.items.filter((it) => {
      if (state.model && it.model !== state.model) return false;
      if (state.color && it.color !== state.color) return false;
      if (state.size && it.size !== state.size) return false;
      if (state.stock === "in" && it._tq <= 0) return false;
      if (state.stock === "low" && it._tq !== 1) return false;
      if (state.stock === "out" && it._tq !== 0) return false;
      if (q && !it._search.includes(q)) return false;
      return true;
    });
  }

  function renderBody() {
    const items = filtered();
    const all = items.length === data.items.length;
    const rows = items.map((it) => `<tr>
        <td>${esc(it.code)}</td><td>${esc(it.model)}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${it.qty.map((q, i) => `<td class="c">${nf(q)}</td><td class="c ret">${nf(it.ret[i])}</td>`).join("")}
        <td class="c b">${nf(it._tq)}</td><td class="c b">${nf(it._tr)}</td>
      </tr>`);

    if (!items.length) {
      rows.push(`<tr><td class="empty" colspan="${4 + groups.length * 2}">条件に合う商品がありません</td></tr>`);
    }

    // 絞り込みなし: Excel の Total 行そのまま / 絞り込み中: 表示中の行の合計
    let t = all ? data.totalRow : null;
    if (!t) {
      const qty = data.stores.map((_, i) => items.reduce((a, it) => a + it.qty[i], 0));
      const ret = data.stores.map((_, i) => items.reduce((a, it) => a + (it.ret[i] || 0), 0));
      const sum = (a) => a.reduce((x, y) => x + y, 0);
      t = { qty: [...qty, sum(qty)], ret: [...ret, sum(ret)] };
    }
    rows.push(`<tr class="total">
      <td>Total</td><td></td><td></td><td></td>
      ${groups.map((_, i) => `<td class="c">${nf(t.qty[i])}</td><td class="c">${nf(t.ret[i])}</td>`).join("")}
    </tr>`);

    $("tbody").innerHTML = rows.join("");
    $("rowCount").textContent = all ? `${data.items.length} 件` : `${data.items.length} 件中 ${items.length} 件を表示`;
  }

  /* ---------- controls ---------- */
  const bind = (id, key, ev = "change") =>
    $(id).addEventListener(ev, (e) => { state[key] = e.target.value; renderBody(); });
  bind("q", "q", "input");
  bind("fModel", "model");
  bind("fColor", "color");
  bind("fSize", "size");
  bind("fStock", "stock");
  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", model: "", color: "", size: "", stock: "" });
    ["q", "fModel", "fColor", "fSize", "fStock"].forEach((id) => ($(id).value = ""));
    renderBody();
  });

  /* ---------- load ---------- */
  fetch("stock.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((d) => {
      data = d;
      groups = [...d.stores, "Total"];
      for (const it of d.items) {
        it._tq = it.totalQty ?? it.qty.reduce((a, b) => a + b, 0);
        it._tr = it.totalRet ?? it.ret.reduce((a, b) => a + (b || 0), 0);
        it._search = `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase();
      }
      fillSelect($("fModel"), uniq(d.items.map((i) => i.model)));
      fillSelect($("fColor"), uniq(d.items.map((i) => i.color)).sort());
      fillSelect($("fSize"), uniq(d.items.map((i) => i.size)).sort((a, b) => {
        const [pa, na] = sizeKey(a), [pb, nb] = sizeKey(b);
        return pa === pb ? na - nb : pa.localeCompare(pb);
      }));
      document.title = d.title;
      renderFrame(d);
      renderBody();
      $("status").textContent = "";
    })
    .catch((err) => {
      $("status").textContent = "データの読み込みに失敗しました";
      console.error(err);
    });
})();
