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

  // sort: "" = Excel の並び / "0".. = 店舗・オフィス / "store" = Store Total / "total" = Company Total
  const state = { q: "", model: "", color: "", size: "", stock: "", sort: "" };
  let data = null;
  let groups = [];

  const uniq = (arr) => [...new Set(arr)];
  const sizeKey = (s) => {
    const m = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(s);
    return m ? [m[1], parseFloat(m[2])] : [s, 0];
  };
  const sum = (a) => a.reduce((x, y) => x + (y || 0), 0);
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

  /* ---------- tabs ---------- */
  let view = location.hash === "#detail" ? "detail" : "table";
  function showView(v, { scroll = false } = {}) {
    view = v;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.view === v));
    $("view-table").hidden = v !== "table";
    $("view-detail").hidden = v !== "detail";
    history.replaceState(null, "", v === "detail" ? "#detail" : location.pathname + location.search);
    if (v === "table") fitTable();
    if (scroll) $("view-table").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

  /* ---------- 表を画面幅に合わせる (スクロールなし) ---------- */
  function fitTable() {
    const sheet = $("sheet"), table = $("stockTable");
    if (!sheet.offsetWidth) return;
    table.style.setProperty("--fit", 1);
    const w = table.offsetWidth;
    const avail = sheet.clientWidth;
    table.style.setProperty("--fit", w > avail ? Math.floor(((avail - 2) / w) * 10000) / 10000 : 1);
  }
  window.addEventListener("resize", fitTable);

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

  /* ---------- Return 入力 (このブラウザに保存) ---------- */
  // 入力した Return の数だけ Quantity から差し引く。
  // 値は基準日ごとに保存するので、新しい在庫データに更新すると入力はリセットされる。
  let returns = {};
  let RKEY = "returns";
  // Office 列には Return がない。店舗の Return はその店舗から引いて Office に足す (店舗 → オフィスへ戻る)
  // groups (列グループ): [...拠点, Store Total, Company Total]  ※Office がなければ [...店舗, Total]
  const hasOffice = () => data.officeIndex != null;
  const hasRet = (i) => i !== data.officeIndex && !(hasOffice() && i === data.stores.length + 1);
  const rkey = (it, i) => `${it.code || `${it.model}|${it.color}|${it.size}`}@${data.stores[i]}`;
  const loadReturns = () => {
    try { returns = JSON.parse(localStorage.getItem(RKEY) || "{}") || {}; } catch (_) { returns = {}; }
    if (data.officeIndex != null) {
      const office = `@${data.stores[data.officeIndex]}`;
      Object.keys(returns).forEach((k) => { if (k.endsWith(office)) delete returns[k]; });
    }
  };
  const saveReturns = () => {
    try { localStorage.setItem(RKEY, JSON.stringify(returns)); } catch (_) {}
  };
  function recompute(it) {
    const r = it.qty.map((_, i) => (hasRet(i) ? returns[rkey(it, i)] || 0 : 0));
    it._ret = it.ret.map((x, i) => (hasRet(i) ? returns[rkey(it, i)] ?? x : null));
    it._adj = it.qty.map((q, i) => q - r[i]);
    if (data.officeIndex != null) it._adj[data.officeIndex] += sum(r);
    it._tq = sum(it._adj);                                                 // Company Total (店舗 + オフィス)
    it._st = sum(it._adj.filter((_, i) => i !== data.officeIndex));        // Store Total (店舗のみ)
    it._tr = sum(it._ret);
  }
  const returnCount = () => Object.keys(returns).length;
  function updateReturnInfo() {
    const n = returnCount();
    $("retInfo").textContent = n ? `返品入力 ${fmt(n)} 件（合計 ${fmt(sum(Object.values(returns)))} 点）` : "";
    $("clearReturns").hidden = !n;
  }

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
      const key = state.sort === "total" ? (it) => it._tq : state.sort === "store" ? (it) => it._st : (it) => it._adj[+state.sort];
      rows = rows.map((it, i) => [it, i]).sort((a, b) => key(b[0]) - key(a[0]) || a[1] - b[1]).map((x) => x[0]);
    }
    return rows;
  }

  /* ---------- KPI ---------- */
  function renderKpis(rows) {
    const all = rows.length === data.items.length;
    const t = rows.reduce((a, it) => a + it._tq, 0);
    $("kpiTotal").textContent = fmt(t);
    $("kpiTotalNote").textContent = all ? (data.officeSource ? `${data.stores.length - 1} 店舗＋オフィスの合計` : `${data.stores.length} 店舗の合計`) : `全体 ${fmt(data._grand)} 点のうち`;
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
      value: rows.reduce((a, it) => a + it._adj[i], 0),
      skus: rows.filter((it) => it._adj[i] > 0).length,
    }));
    barChart($("storeChart"), stores, {
      active: state.sort,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点（${Math.round((e.value / grand) * 100)}%）<br>在庫のある SKU ${fmt(e.skus)}`,
      onClick: (e) => { state.sort = state.sort === e.key ? "" : e.key; $("fSort").value = state.sort; render(); if (state.sort) showView("table", { scroll: true }); },
    });

    // モデル別はモデル絞り込み以外の条件を反映 (クリックで切り替えられるように)
    const byModel = new Map();
    for (const it of data.items) {
      if (state.color && it.color !== state.color) continue;
      if (state.size && it.size !== state.size) continue;
      const m = byModel.get(it.model) || { key: it.model, label: it.model, value: 0, skus: 0, stores: data.stores.map(() => 0) };
      m.value += it._tq;
      m.skus += 1;
      it._adj.forEach((q, i) => (m.stores[i] += q));
      byModel.set(it.model, m);
    }
    barChart($("modelChart"), [...byModel.values()].sort((a, b) => b.value - a.value), {
      active: state.model,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点 / ${e.skus} SKU<br>` +
        data.stores.map((s, i) => `${esc(s)}: ${fmt(e.stores[i])}`).join("<br>"),
      onClick: (e) => { state.model = state.model === e.key ? "" : e.key; $("fModel").value = state.model; render(); if (state.model) showView("table", { scroll: true }); },
    });
  }

  /* ---------- table (Excel 書式) ---------- */
  function renderFrame(d) {
    const ncol = numCols();
    $("cols").innerHTML =
      [COL_W.code, COL_W.model, COL_W.color, COL_W.size].map((w) => `<col style="width:${px(w)}px">`).join("") +
      groups.map((_, g) => {
        // Company Total は Return がないので見出しが収まる幅にする
        const w = !hasRet(g) && g >= data.stores.length ? 15.5 : COL_W.qty;
        return `<col style="width:${px(w)}px">` + (hasRet(g) ? `<col style="width:${px(COL_W.ret)}px">` : "");
      }).join("");
    $("thead").innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(d.title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(d.asOf)}</th></tr>
      <tr class="h1">
        <th rowspan="2">Code</th><th rowspan="2">Model</th><th rowspan="2">Color</th><th rowspan="2">Size</th>
        ${groups.map((g, i) => `<th colspan="${hasRet(i) ? 2 : 1}">${esc(g)}</th>`).join("")}
      </tr>
      <tr class="h2">${groups.map((_, i) => `<th>Quantity</th>` + (hasRet(i) ? `<th class="ret-h">Return</th>` : "")).join("")}</tr>`;
  }

  const numCols = () => 4 + sum(groups.map((_, i) => (hasRet(i) ? 2 : 1)));

  // 1 行分の Quantity / Return を groups の並びで返す
  const rowQty = (it) => (hasOffice() ? [...it._adj, it._st, it._tq] : [...it._adj, it._tq]);
  const rowRet = (it) => (hasOffice() ? [...it._ret, it._tr, null] : [...it._ret, it._tr]);

  function totalsOf(items) {
    const qty = groups.map((_, g) => sum(items.map((it) => rowQty(it)[g])));
    const ret = groups.map((_, g) => sum(items.map((it) => rowRet(it)[g])));
    return { qty, ret };
  }

  const totalRowHtml = (t) => `<td>Total</td><td></td><td></td><td></td>
      ${groups.map((_, i) => `<td class="c">${nf(t.qty[i])}</td>` + (hasRet(i) ? `<td class="c">${nf(t.ret[i])}</td>` : "")).join("")}`;

  let shown = []; // 表示中の行 (Total 行の再計算用)
  function renderTable(items) {
    shown = items;
    const all = items.length === data.items.length;
    const rows = items.map((it) => `<tr data-id="${it._id}">
        <td>${esc(it.code)}</td><td>${esc(it.model)}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${rowQty(it).map((q, g) => {
          const tot = g >= data.stores.length;
          const qc = `<td class="c q${tot ? " b" : ""}">${nf(q)}</td>`;
          if (!hasRet(g)) return qc;
          if (tot) return qc + `<td class="c b tr">${nf(it._tr)}</td>`;
          return qc + `<td class="c ret"><input class="ret-in" type="text" inputmode="numeric" autocomplete="off" data-s="${g}" value="${it._ret[g] ?? ""}" aria-label="${esc(data.stores[g])} Return"></td>`;
        }).join("")}
      </tr>`);
    if (!items.length) rows.push(`<tr><td class="empty" colspan="${numCols()}">条件に合う商品がありません</td></tr>`);

    // 表示中の行の合計 (絞り込み・返品入力がなければ Excel の Total 行と同じ値)
    rows.push(`<tr class="total" id="totalRow">${totalRowHtml(totalsOf(items))}</tr>`);
    $("tbody").innerHTML = rows.join("");
    $("rowCount").textContent = all ? `${fmt(data.items.length)} 件` : `${fmt(data.items.length)} 件中 ${fmt(items.length)} 件を表示`;
  }

  // Return セルの入力 → Quantity・Total・サマリー・グラフを更新
  function commitReturn(input) {
    const tr = input.closest("tr");
    const it = data.items[+tr.dataset.id];
    const i = +input.dataset.s;
    const raw = input.value.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    const key = rkey(it, i);
    if (raw === "" || raw === "0") {
      delete returns[key];
    } else if (/^\d+$/.test(raw)) {
      returns[key] = parseInt(raw, 10);
    } else {
      input.value = returns[key] ?? it.ret[i] ?? "";
      input.classList.add("invalid");
      setTimeout(() => input.classList.remove("invalid"), 800);
      return;
    }
    saveReturns();
    recompute(it);
    input.value = it._ret[i] ?? "";
    const q = rowQty(it);
    tr.querySelectorAll("td.q").forEach((td, k) => (td.textContent = nf(q[k])));
    tr.querySelector("td.tr").textContent = nf(it._tr);
    $("totalRow").innerHTML = totalRowHtml(totalsOf(shown));
    data._grand = sum(data.items.map((x) => x._tq));
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    updateReturnInfo();
  }
  $("tbody").addEventListener("change", (e) => { if (e.target.classList.contains("ret-in")) commitReturn(e.target); });
  $("tbody").addEventListener("focusin", (e) => { if (e.target.classList.contains("ret-in")) e.target.select(); });
  // Enter / ↑↓ で上下のセルへ移動 (Excel と同じ操作感)
  $("tbody").addEventListener("keydown", (e) => {
    const input = e.target;
    if (!input.classList.contains("ret-in")) return;
    let dir = 0;
    if (e.key === "Enter" || e.key === "ArrowDown") dir = e.shiftKey && e.key === "Enter" ? -1 : 1;
    else if (e.key === "ArrowUp") dir = -1;
    else if (e.key === "Escape") { input.value = input.defaultValue; input.blur(); return; }
    if (!dir) return;
    e.preventDefault();
    let tr = input.closest("tr");
    do { tr = dir > 0 ? tr.nextElementSibling : tr.previousElementSibling; } while (tr && !tr.dataset.id);
    const next = tr && tr.querySelector(`.ret-in[data-s="${input.dataset.s}"]`);
    if (next) next.focus(); else input.blur();
  });

  $("clearReturns").addEventListener("click", () => {
    if (!confirm(`入力した返品 ${returnCount()} 件をすべて消去します。よろしいですか？`)) return;
    returns = {};
    saveReturns();
    data.items.forEach(recompute);
    data._grand = sum(data.items.map((x) => x._tq));
    render();
    updateReturnInfo();
  });

  function render() {
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
    const filteredNow = rows.length !== data.items.length;
    $("detailNote").textContent = filteredNow
      ? `在庫一覧の絞り込み条件を反映しています（${fmt(data.items.length)} 件中 ${fmt(rows.length)} 件）`
      : "";
    fitTable();
  }

  /* ---------- CSV ---------- */
  $("dlCsv").addEventListener("click", () => {
    const rows = filtered();
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Code", "Model", "Color", "Size", ...groups.flatMap((g, i) => (hasRet(i) ? [`${g} Quantity`, `${g} Return`] : [`${g} Quantity`]))];
    const body = rows.map((it) => [it.code, it.model, it.color, it.size,
      ...rowQty(it).flatMap((v, g) => (hasRet(g) ? [v, rowRet(it)[g] ?? ""] : [v]))]);
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
  const toggleStock = (v) => {
    state.stock = state.stock === v ? "" : v;
    $("fStock").value = state.stock;
    render();
    if (state.stock) showView("table", { scroll: true });
  };
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
      groups = d.officeIndex != null ? [...d.stores, "Store Total", "Company Total"] : [...d.stores, "Total"];
      RKEY = `returns:${d.asOfDate || d.source}`;
      loadReturns();
      d.items.forEach((it, n) => {
        it._id = n;
        it._search = `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase();
        recompute(it);
      });
      d._grand = sum(d.items.map((it) => it._tq));
      updateReturnInfo();
      $("asof").textContent = d.asOfDate ? `${d.asOfDate} 営業終了時点` : d.asOf;
      $("source").textContent = d.title;
      $("footSource").textContent = d.officeSource ? `${d.source}（店舗）、${d.officeSource}（オフィス）` : d.source;
      $("dlOffice").hidden = !d.officeSource;
      fillSelect($("fModel"), uniq(d.items.map((i) => i.model)));
      fillSelect($("fColor"), uniq(d.items.map((i) => i.color)).sort());
      fillSelect($("fSize"), uniq(d.items.map((i) => i.size)).sort((a, b) => {
        const [pa, na] = sizeKey(a), [pb, nb] = sizeKey(b);
        return pa === pb ? na - nb : pa.localeCompare(pb);
      }));
      const totalSorts = d.officeIndex != null
        ? [["store", "Store Total の在庫が多い順"], ["total", "Company Total の在庫が多い順"]]
        : [["total", "Total の在庫が多い順"]];
      fillSelect($("fSort"), [...d.stores.map((_, i) => String(i)), ...totalSorts.map((x) => x[0])],
        [...d.stores.map((s) => `${s} の在庫が多い順`), ...totalSorts.map((x) => x[1])]);
      renderFrame(d);
      render();
      showView(view);
    })
    .catch((err) => {
      $("asof").textContent = "データの読み込みに失敗しました";
      console.error(err);
    });
})();
