(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("ja-JP");
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

  // sort: "" = Excel の並び / "0".."4" = 店舗 / "total"
  const state = { q: "", model: "", color: "", size: "", stock: "", sort: "" };
  let data = null;
  let groups = [];

  const uniq = (arr) => [...new Set(arr)];
  const sizeKey = (s) => {
    const m = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(s);
    return m ? [m[1], parseFloat(m[2])] : [s, 0];
  };
  const fillSelect = (sel, values, labels = values) =>
    sel.insertAdjacentHTML("beforeend", values.map((v, i) => `<option value="${esc(v)}">${esc(labels[i])}</option>`).join(""));

  /* ---------- theme ---------- */
  const THEMES = ["auto", "light", "dark"];
  const THEME_LABEL = { auto: "自動", light: "ライト", dark: "ダーク" };
  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  const applyTheme = () => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    $("themeLabel").textContent = THEME_LABEL[theme];
  };
  $("themeToggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch (_) {}
    applyTheme();
  });
  applyTheme();

  /* ---------- tooltip ---------- */
  const tip = $("tip");
  const showTip = (e, html) => {
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  };
  const hideTip = () => { tip.hidden = true; };

  /* ---------- filtering ---------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    let rows = data.items.filter((it) => {
      if (state.model && it.model !== state.model) return false;
      if (state.color && it.color !== state.color) return false;
      if (state.size && it.size !== state.size) return false;
      if (state.stock === "in" && it._tq <= 0) return false;
      if (state.stock === "low" && it._tq !== 1) return false;
      if (state.stock === "out" && it._tq !== 0) return false;
      if (q && !it._search.includes(q)) return false;
      return true;
    });
    if (state.sort !== "") {
      const key = state.sort === "total" ? (it) => it._tq : (it) => it.qty[+state.sort];
      rows = rows.map((it, i) => [it, i]).sort((a, b) => key(b[0]) - key(a[0]) || a[1] - b[1]).map((x) => x[0]);
    }
    return rows;
  }

  /* ---------- KPI ---------- */
  function renderKpis(rows) {
    const all = rows.length === data.items.length;
    const t = rows.reduce((a, it) => a + it._tq, 0);
    $("kpiTotal").textContent = fmt(t);
    $("kpiTotalNote").textContent = all ? `${data.stores.length} 店舗の合計` : `全体 ${fmt(data._grand)} 点のうち`;
    $("kpiSku").textContent = fmt(rows.length);
    $("kpiSkuNote").textContent = all ? `${uniq(data.items.map((i) => i.model)).length} モデル` : `全 ${fmt(data.items.length)} SKU のうち`;
    $("kpiOut").textContent = fmt(rows.filter((it) => it._tq === 0).length);
    $("kpiLow").textContent = fmt(rows.filter((it) => it._tq === 1).length);
    $("kpiOutBtn").setAttribute("aria-pressed", state.stock === "out");
    $("kpiLowBtn").setAttribute("aria-pressed", state.stock === "low");
  }

  /* ---------- charts ---------- */
  function barChart(el, entries, { active, onClick, tipFor }) {
    const max = Math.max(1, ...entries.map((e) => e.value));
    el.innerHTML = entries.map((e, i) => `
      <button type="button" class="bar-row${active === e.key ? " active" : ""}" data-i="${i}" aria-label="${esc(e.label)}: ${e.value}">
        <span class="bar-label">${esc(e.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(e.value / max) * 100}%"></span></span>
        <span class="bar-val">${fmt(e.value)}</span>
      </button>`).join("");
    el.querySelectorAll(".bar-row").forEach((b) => {
      const e = entries[+b.dataset.i];
      b.addEventListener("mousemove", (ev) => showTip(ev, tipFor(e)));
      b.addEventListener("mouseleave", hideTip);
      b.addEventListener("click", () => { hideTip(); onClick(e); });
    });
  }

  function renderCharts(rows) {
    const grand = rows.reduce((a, it) => a + it._tq, 0) || 1;
    const stores = data.stores.map((name, i) => ({
      key: String(i), label: name,
      value: rows.reduce((a, it) => a + it.qty[i], 0),
      skus: rows.filter((it) => it.qty[i] > 0).length,
    }));
    barChart($("storeChart"), stores, {
      active: state.sort,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点（${Math.round((e.value / grand) * 100)}%）<br>在庫のある SKU ${fmt(e.skus)}`,
      onClick: (e) => { state.sort = state.sort === e.key ? "" : e.key; $("fSort").value = state.sort; render(); },
    });

    // モデル別はモデル絞り込み以外の条件を反映 (クリックで切り替えられるように)
    const byModel = new Map();
    for (const it of data.items) {
      if (state.color && it.color !== state.color) continue;
      if (state.size && it.size !== state.size) continue;
      const m = byModel.get(it.model) || { key: it.model, label: it.model, value: 0, skus: 0, stores: data.stores.map(() => 0) };
      m.value += it._tq;
      m.skus += 1;
      it.qty.forEach((q, i) => (m.stores[i] += q));
      byModel.set(it.model, m);
    }
    barChart($("modelChart"), [...byModel.values()].sort((a, b) => b.value - a.value), {
      active: state.model,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点 / ${e.skus} SKU<br>` +
        data.stores.map((s, i) => `${esc(s)}: ${fmt(e.stores[i])}`).join("<br>"),
      onClick: (e) => { state.model = state.model === e.key ? "" : e.key; $("fModel").value = state.model; render(); },
    });
  }

  /* ---------- table (Excel 書式) ---------- */
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

  function totalsOf(items) {
    const qty = data.stores.map((_, i) => items.reduce((a, it) => a + it.qty[i], 0));
    const ret = data.stores.map((_, i) => items.reduce((a, it) => a + (it.ret[i] || 0), 0));
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    return { qty: [...qty, sum(qty)], ret: [...ret, sum(ret)] };
  }

  function renderTable(items) {
    const all = items.length === data.items.length;
    const rows = items.map((it) => `<tr>
        <td>${esc(it.code)}</td><td>${esc(it.model)}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${it.qty.map((q, i) => `<td class="c">${nf(q)}</td><td class="c ret">${nf(it.ret[i])}</td>`).join("")}
        <td class="c b">${nf(it._tq)}</td><td class="c b">${nf(it._tr)}</td>
      </tr>`);
    if (!items.length) rows.push(`<tr><td class="empty" colspan="${4 + groups.length * 2}">条件に合う商品がありません</td></tr>`);

    // 絞り込みなし: Excel の Total 行そのまま / 絞り込み中: 表示中の行の合計
    const t = (all && data.totalRow) || totalsOf(items);
    rows.push(`<tr class="total">
      <td>Total</td><td></td><td></td><td></td>
      ${groups.map((_, i) => `<td class="c">${nf(t.qty[i])}</td><td class="c">${nf(t.ret[i])}</td>`).join("")}
    </tr>`);
    $("tbody").innerHTML = rows.join("");
    $("rowCount").textContent = all ? `${fmt(data.items.length)} 件` : `${fmt(data.items.length)} 件中 ${fmt(items.length)} 件を表示`;
  }

  function render() {
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  /* ---------- CSV ---------- */
  $("dlCsv").addEventListener("click", () => {
    const rows = filtered();
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Code", "Model", "Color", "Size", ...groups.flatMap((g) => [`${g} Quantity`, `${g} Return`])];
    const body = rows.map((it) => [it.code, it.model, it.color, it.size,
      ...it.qty.flatMap((v, i) => [v, it.ret[i] ?? ""]), it._tq, it._tr]);
    const csv = "﻿" + [head, ...body].map((r) => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `stock_${(data.asOfDate || "").replace(/\//g, "")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- controls ---------- */
  const bind = (id, key, ev = "change") => $(id).addEventListener(ev, (e) => { state[key] = e.target.value; render(); });
  bind("q", "q", "input");
  bind("fModel", "model");
  bind("fColor", "color");
  bind("fSize", "size");
  bind("fStock", "stock");
  bind("fSort", "sort");
  const toggleStock = (v) => { state.stock = state.stock === v ? "" : v; $("fStock").value = state.stock; render(); };
  $("kpiOutBtn").addEventListener("click", () => toggleStock("out"));
  $("kpiLowBtn").addEventListener("click", () => toggleStock("low"));
  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", model: "", color: "", size: "", stock: "", sort: "" });
    ["q", "fModel", "fColor", "fSize", "fStock", "fSort"].forEach((id) => ($(id).value = ""));
    render();
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
      d._grand = d.items.reduce((a, it) => a + it._tq, 0);
      $("asof").textContent = d.asOfDate ? `${d.asOfDate} 営業終了時点` : d.asOf;
      $("source").textContent = d.title;
      $("footSource").textContent = d.source;
      fillSelect($("fModel"), uniq(d.items.map((i) => i.model)));
      fillSelect($("fColor"), uniq(d.items.map((i) => i.color)).sort());
      fillSelect($("fSize"), uniq(d.items.map((i) => i.size)).sort((a, b) => {
        const [pa, na] = sizeKey(a), [pb, nb] = sizeKey(b);
        return pa === pb ? na - nb : pa.localeCompare(pb);
      }));
      fillSelect($("fSort"), [...d.stores.map((_, i) => String(i)), "total"],
        [...d.stores.map((s) => `${s} の在庫が多い順`), "Total の在庫が多い順"]);
      renderFrame(d);
      render();
    })
    .catch((err) => {
      $("asof").textContent = "データの読み込みに失敗しました";
      console.error(err);
    });
})();
