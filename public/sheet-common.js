/* Vivo・Socks・Coolcore の表を VFF の在庫一覧と同じ見え方で作る共通部品。
   列: Model・Color・Size | Sales | Company Total Stock | 拠点 (VFF と同じ並び: Office → Paradise Park → K Village → Central CL → Siam Discovery → Central LP → Event → そのほか)
   Sales = public/other_sales.json (scripts/other_sales.py。Zort の受注明細から数えた販売足数) */
(() => {
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nf = (v) => (v == null ? "" : v === 0 ? "-" : v < 0 ? `(${Math.abs(v).toLocaleString("en-US")})` : v.toLocaleString("en-US"));
  const short = (g) => String(g).replace(" (Department)", " (Dept.)").replace("คลังสินค้าหลัก (EDV)", "EDV Main");
  const MAIN = ["Office", "Paradise Park", "K Village", "Central CL (Department)", "Siam Discovery", "Central LP"];
  const locRank = (name) => {
    const i = MAIN.indexOf(name);
    return i >= 0 ? i : /^event/i.test(name) ? 50 : 100;
  };
  // 拠点の並び (VFF と同じ)。同じ順位のものは元の並び
  const orderLocs = (stores, idx) => idx.slice().sort((a, b) => locRank(stores[a]) - locRank(stores[b]) || a - b);

  // Sales: まず other_sales.json (受注明細のファイルから数えた分) で表示し、
  // Zort の受注から数えた分 (/api/zort-sales。2026/1 から今月まで) が届いたら置き換えて描き直す
  let sales = null;
  const listeners = [];
  // 崩れた品番を読み替える: "VV0006(W39,OSD)" → "VV0006(OSD,W39)"、"CC0015(PK)(M)" → "CC0015(PK,M)"
  const isSz = (x) => /^([MWU]?\d+(\.\d+)?|XXS|XS|S|M|L|XL|XXL|\d+-\d+)$/i.test(String(x).trim());
  const normCode = (c) => {
    let m = /^([A-Z]+\d+)\(([^()]+)\)\(([^()]+)\)$/.exec(c);
    if (m) return `${m[1]}(${m[2]},${m[3]})`;
    m = /^([A-Z]+\d+)\(([^(),]+),([^(),]+)\)$/.exec(c);
    if (m && isSz(m[2]) && !isSz(m[3])) return `${m[1]}(${m[3]},${m[2]})`;
    return c;
  };
  const normSales = (map) => {
    const out = {};
    Object.entries(map || {}).forEach(([k, q]) => { const c = normCode(k.trim()); out[c] = (out[c] || 0) + q; });
    return out;
  };
  // Central CL・Siam Discovery の販売 (public/dept_sales.json。scripts/dept_sales.py で百貨店の売上表から数えた分) を足す
  let dept = null;
  const deptReady = fetch(`dept_sales.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => { dept = j; });
  const merged = (j) => {
    if (!j) return j;
    const out = { ...j, sales: normSales(j.sales) };
    if (dept && dept.stores) Object.values(dept.stores).forEach((st) => Object.entries(st.sales || {}).forEach(([k, q]) => { out.sales[k] = (out.sales[k] || 0) + q; }));
    return out;
  };
  const salesReady = Promise.all([fetch(`other_sales.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null), deptReady])
    .then(([j]) => { if (!sales) sales = merged(j); return sales; });
  Promise.all([fetch(`api/zort-sales?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null), deptReady])
    .then(([j]) => {
      if (!j || !j.months || !j.months.length) return;
      if (sales && sales.months && j.months.length < sales.months.length) return; // 古いファイルより短い期間なら使わない
      sales = merged(j);
      listeners.forEach((f) => f());
    });

  const salesLabel = () => {
    if (!sales) return "";
    const f = (ym) => `${+ym.slice(5)}`;
    return sales.from === sales.to ? `${sales.from.slice(0, 4)}/${f(sales.from)}` : `${sales.from.slice(0, 4)}/${f(sales.from)}–${f(sales.to)}`;
  };
  const salesOf = (it) => {
    if (!sales) return null;
    const codes = [it.code, ...(it.codes || [])].filter(Boolean);
    return [...new Set(codes.map(normCode))].reduce((a, c) => a + (sales.sales[c] || 0), 0);
  };

  // 表を描く。rows: [{ code, model, color, size, qty: [拠点ごと] }]、shown: 表示する拠点の番号
  function render({ thead, tbody, title, asof, stores, shown, rows, modelOf }) {
    // 主要な拠点 (VFF の表で常に出す列) は在庫がなくても列を出す
    const order = orderLocs(stores, [...new Set([...shown, ...stores.map((n, i) => (MAIN.includes(n) || /^event/i.test(n) ? i : -1)).filter((i) => i >= 0)])]);
    const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
    const ncol = 1 + 3 + 2 + order.length; // 1 = 行選択のチェック
    // 列幅と縮小率は VFF の在庫一覧と同じ (VFF の表が画面に合わせて縮んでいれば同じ倍率)
    const table = thead.closest("table");
    const px = (w) => Math.round(w * 7 + 5);
    let cg = table.querySelector("colgroup");
    if (!cg) { cg = document.createElement("colgroup"); table.insertBefore(cg, thead); }
    cg.innerHTML = [3, 12.5, 14.5, 4.6, 6.4, 8.5, ...order.map(() => 6)].map((w) => `<col style="width:${px(w)}px">`).join("");
    const vff = document.getElementById("stockTable");
    const fit = vff && parseFloat(vff.style.getPropertyValue("--fit"));
    table.style.setProperty("--fit", fit > 0 ? fit : 1);
    thead.innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(asof)}</th></tr>
      <tr class="h1"><th rowspan="2" class="chk-h"><input type="checkbox" class="o-chkall" aria-label="${esc(t("sel.all"))}" title="${esc(t("sel.all"))}"${rows.length && rows.every((it) => rsel(tbody).has(rkey(it))) ? " checked" : ""}></th><th rowspan="2">Model</th><th rowspan="2">Color</th><th rowspan="2">Size</th>
        <th class="info-h" title="${esc(t("oth.salesTitle", { p: salesLabel() }))}">Sales</th>
        <th class="grp ct">Company Total Stock</th>
        ${order.map((i) => `<th class="grp" title="${esc(stores[i])}">${esc(short(stores[i]))}</th>`).join("")}</tr>
      <tr class="h2"><th class="info-h info-now">${esc(salesLabel())}</th><th class="ct">Qty</th>${order.map(() => "<th>Qty</th>").join("")}</tr>`;
    const lv = (q) => (q < 0 ? "lvn" : q === 0 ? "lv0" : q === 1 ? "lv1" : "lv2");
    const body = rows.map((it) => {
      const s = salesOf(it);
      const tq = total(it);
      const on = rsel(tbody).has(rkey(it));
      return `<tr data-k="${esc(rkey(it))}"${on ? ' class="rsel"' : ""}><td class="chk"><input type="checkbox" class="o-chk"${on ? " checked" : ""} aria-label="${esc(`${modelOf(it)} ${it.color} ${it.size}`)}"></td><td title="${esc(it.code || "")}">${esc(modelOf(it))}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        <td class="c info info-now">${s == null ? "" : nf(s)}</td>
        <td class="c q ct">${nf(tq)}</td>
        ${order.map((i) => { const q = it.qty[i] || 0; return `<td class="c q ${lv(q)}"${q < 0 ? ` title="${esc(t("vivo.negTitle"))}"` : ""}>${nf(q)}</td>`; }).join("")}</tr>`;
    });
    if (!rows.length) body.push(`<tr><td class="empty" colspan="${ncol}">${esc(t("empty"))}</td></tr>`);
    const sum = (i) => rows.reduce((a, it) => a + (it.qty[i] || 0), 0);
    const sumSales = sales ? rows.reduce((a, it) => a + (salesOf(it) || 0), 0) : null;
    body.push(`<tr class="total"><td class="chk"></td><td>Total</td><td></td><td></td><td class="c info">${sumSales == null ? "" : nf(sumSales)}</td>
      <td class="c ct">${nf(rows.reduce((a, it) => a + total(it), 0))}</td>${order.map((i) => `<td class="c">${nf(sum(i))}</td>`).join("")}</tr>`);
    tbody.innerHTML = body.join("");
    attach(table);
    paintCols(table);
    if (selState.tbody === tbody) clearSel();
  }

  // 委託先の在庫 (public/consign.json。scripts/consign.py)
  let consign = null;
  const consignReady = fetch(`consign.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => { consign = j; });

  /* ---------- 行・列のハイライトと、ドラッグした範囲の合計 (VFF の在庫一覧と同じ操作) ---------- */
  const rkey = (it) => it.code || `${it.model}|${it.color}|${it.size}`;
  const rowSels = new WeakMap(); // tbody → 選んだ行
  const rsel = (tbody) => { if (!rowSels.has(tbody)) rowSels.set(tbody, new Set()); return rowSels.get(tbody); };
  const colSels = new WeakMap(); // table → ハイライトした列
  const csel = (table) => { if (!colSels.has(table)) colSels.set(table, new Set()); return colSels.get(table); };
  // 見出しのマスが表の何列目か (rowspan・colspan を考えて)
  function headCols(table, th) {
    const grid = [];
    let found = null;
    [...table.tHead.querySelectorAll("tr.h1, tr.h2")].forEach((tr, r) => {
      grid[r] = grid[r] || [];
      let c = 0;
      [...tr.children].forEach((cell) => {
        while (grid[r][c]) c++;
        const cs = cell.colSpan || 1, rs = cell.rowSpan || 1;
        for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) { grid[r + dr] = grid[r + dr] || []; grid[r + dr][c + dc] = true; }
        if (cell === th) found = Array.from({ length: cs }, (_, k) => c + k);
        c += cs;
      });
    });
    return found || [];
  }
  function paintCols(table) {
    const hl = csel(table);
    table.querySelectorAll(".colhl").forEach((x) => x.classList.remove("colhl"));
    if (!hl.size) return;
    [...table.tBodies[0].rows].forEach((tr) => hl.forEach((c) => { const td = tr.cells[c]; if (td && !td.classList.contains("empty")) td.classList.add("colhl"); }));
    table.tHead.querySelectorAll("tr.h1 th, tr.h2 th").forEach((th) => { if (headCols(table, th).some((c) => hl.has(c))) th.classList.add("colhl"); });
  }
  const fmtN = (v) => Number(v).toLocaleString("en-US");
  const cellValue = (td) => {
    if (td.classList.contains("chk")) return null;
    const raw = td.textContent.trim().replace(/,/g, "");
    if (raw === "") return null;
    if (raw === "-") return 0;
    const m = /^\((\d+(?:\.\d+)?)\)$/.exec(raw);
    if (m) return -Number(m[1]);
    return /^-?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
  };
  const selState = { tbody: null, sel: null, dragging: false };
  const range = () => { const s = selState.sel; return { r0: Math.min(s.r0, s.r1), r1: Math.max(s.r0, s.r1), c0: Math.min(s.c0, s.c1), c1: Math.max(s.c0, s.c1) }; };
  function refreshSel() {
    document.querySelectorAll(".vivo-sheet td.sel").forEach((td) => td.classList.remove("sel", "sel-t", "sel-b", "sel-l", "sel-r"));
    const bar = document.getElementById("selBar");
    if (!selState.sel) { if (bar.dataset.owner === "other") { bar.hidden = true; delete bar.dataset.owner; } return; }
    const { r0, r1, c0, c1 } = range();
    const rows = selState.tbody.rows;
    let total = 0, nums = 0, cells = 0, filled = 0;
    for (let r = r0; r <= r1 && r < rows.length; r++) {
      for (let c = c0; c <= c1; c++) {
        const td = rows[r].cells[c];
        if (!td || td.classList.contains("chk")) continue;
        cells++;
        td.classList.add("sel");
        if (r === r0) td.classList.add("sel-t");
        if (r === r1) td.classList.add("sel-b");
        if (c === c0) td.classList.add("sel-l");
        if (c === c1) td.classList.add("sel-r");
        const v = cellValue(td);
        if (v != null) { total += v; nums++; }
        if (td.textContent.trim() !== "") filled++;
      }
    }
    if (cells <= 1 && !selState.dragging) { if (bar.dataset.owner === "other") bar.hidden = true; return; }
    bar.hidden = false;
    bar.dataset.owner = "other";
    document.querySelectorAll("#selBar .sel-num").forEach((el) => (el.hidden = !nums));
    document.getElementById("selSum").textContent = fmtN(total);
    document.getElementById("selAvg").textContent = nums ? (Math.round((total / nums) * 10) / 10).toLocaleString("en-US") : "–";
    document.getElementById("selCount").textContent = fmtN(nums);
    document.getElementById("selFilled").textContent = fmtN(filled);
    document.getElementById("selRows").textContent = fmtN(r1 - r0 + 1);
    document.getElementById("selSize").textContent = `${r1 - r0 + 1} × ${c1 - c0 + 1}`;
  }
  function clearSel() { selState.sel = null; refreshSel(); }
  const cellAt = (tbody, el) => {
    const td = el && el.closest && el.closest("td");
    if (!td || td.parentElement.parentElement !== tbody || td.classList.contains("empty")) return null;
    return { r: td.parentElement.sectionRowIndex, c: td.cellIndex };
  };
  function attach(table) {
    if (table.dataset.ui) return;
    table.dataset.ui = "1";
    const tbody = table.tBodies[0];
    // 見出しを押す → その列をハイライト (もう一度押すと解除)
    table.tHead.addEventListener("click", (e) => {
      const all = e.target.closest(".o-chkall");
      if (all) {
        const set = rsel(tbody);
        [...tbody.rows].forEach((tr) => {
          if (!tr.dataset.k) return;
          all.checked ? set.add(tr.dataset.k) : set.delete(tr.dataset.k);
          tr.classList.toggle("rsel", all.checked);
          const cb = tr.querySelector(".o-chk");
          if (cb) cb.checked = all.checked;
        });
        return;
      }
      const th = e.target.closest("tr.h1 th, tr.h2 th");
      if (!th || e.target.closest("input")) return;
      const cols = headCols(table, th);
      if (!cols.length || cols[0] <= 3) return; // チェック・Model・Color・Size は対象外
      const hl = csel(table);
      const on = !cols.every((c) => hl.has(c));
      cols.forEach((c) => (on ? hl.add(c) : hl.delete(c)));
      paintCols(table);
    });
    // 行のチェック → その行をハイライト
    tbody.addEventListener("change", (e) => {
      const cb = e.target.closest(".o-chk");
      if (!cb) return;
      const tr = cb.closest("tr");
      cb.checked ? rsel(tbody).add(tr.dataset.k) : rsel(tbody).delete(tr.dataset.k);
      tr.classList.toggle("rsel", cb.checked);
    });
    // ドラッグで範囲を選ぶ → 合計・平均・個数 (画面下のバー)
    tbody.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("input")) return;
      const p = cellAt(tbody, e.target);
      if (!p) return;
      e.preventDefault();
      if (e.shiftKey && selState.sel && selState.tbody === tbody) { selState.sel.r1 = p.r; selState.sel.c1 = p.c; }
      else { selState.tbody = tbody; selState.sel = { r0: p.r, c0: p.c, r1: p.r, c1: p.c }; }
      selState.dragging = true;
      document.body.classList.add("selecting");
      refreshSel();
    });
  }
  document.addEventListener("pointermove", (e) => {
    if (!selState.dragging) return;
    const p = cellAt(selState.tbody, document.elementFromPoint(e.clientX, e.clientY));
    if (p && (p.r !== selState.sel.r1 || p.c !== selState.sel.c1)) { selState.sel.r1 = p.r; selState.sel.c1 = p.c; refreshSel(); }
  });
  const endDrag = () => { if (!selState.dragging) return; selState.dragging = false; document.body.classList.remove("selecting"); refreshSel(); };
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("pointerdown", (e) => {
    if (selState.sel && !(selState.tbody && selState.tbody.contains(e.target)) && !e.target.closest("#selBar")) clearSel();
  });
  document.addEventListener("keydown", (e) => {
    if (!selState.sel) return;
    if (e.key === "Escape") clearSel();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !window.getSelection().toString() && !e.target.closest("input")) {
      const { r0, r1, c0, c1 } = range();
      const rows = selState.tbody.rows;
      const lines = [];
      for (let r = r0; r <= r1 && r < rows.length; r++) {
        const vals = [];
        for (let c = c0; c <= c1; c++) { const td = rows[r].cells[c]; if (!td || td.classList.contains("chk")) continue; const v = cellValue(td); vals.push(v != null ? v : td.textContent.trim()); }
        lines.push(vals.join("\t"));
      }
      if (navigator.clipboard) navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
      e.preventDefault();
    }
  });
  document.getElementById("selClose").addEventListener("click", clearSel);

  window.OTHER_SHEET = { render, salesReady, onSales: (f) => listeners.push(f), consign: () => consign, consignReady };
})();
