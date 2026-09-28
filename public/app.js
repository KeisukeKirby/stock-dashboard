(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("ja-JP");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const state = { q: "", model: "", color: "", size: "", stock: "", sortStore: -1, sortDir: -1, showReturn: false };
  let data = null;

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

  /* ---------- helpers ---------- */
  const total = (it) => it.qty.reduce((a, b) => a + b, 0);
  const heat = (n) => (n <= 0 ? "h0" : n >= 5 ? "h5" : "h" + n);
  const sizeKey = (s) => {
    const m = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(s);
    return m ? [m[1], parseFloat(m[2])] : [s, 0];
  };
  const uniq = (arr) => [...new Set(arr)];

  function fillSelect(sel, values) {
    sel.insertAdjacentHTML("beforeend", values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(""));
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let rows = data.items.filter((it) => {
      if (state.model && it.model !== state.model) return false;
      if (state.color && it.color !== state.color) return false;
      if (state.size && it.size !== state.size) return false;
      const t = it._total;
      if (state.stock === "in" && t <= 0) return false;
      if (state.stock === "low" && t !== 1) return false;
      if (state.stock === "out" && t !== 0) return false;
      if (q && !it._search.includes(q)) return false;
      return true;
    });
    if (state.sortStore !== -1) {
      const key = state.sortStore === -2 ? (it) => it._total : (it) => it.qty[state.sortStore];
      rows = rows.map((it, i) => [it, i]).sort((a, b) => (key(b[0]) - key(a[0])) * -state.sortDir || a[1] - b[1]).map((x) => x[0]);
    }
    return rows;
  }

  /* ---------- charts ---------- */
  function barChart(el, entries, { active, onClick, tipFor, compact }) {
    const max = Math.max(1, ...entries.map((e) => e.value));
    el.classList.toggle("compact", !!compact);
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
    const grand = rows.reduce((a, it) => a + it._total, 0) || 1;
    const storeEntries = data.stores.map((name, i) => {
      const v = rows.reduce((a, it) => a + it.qty[i], 0);
      const skus = rows.filter((it) => it.qty[i] > 0).length;
      return { key: i, label: name, value: v, skus };
    });
    barChart($("storeChart"), storeEntries, {
      active: state.sortStore,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点（${Math.round((e.value / grand) * 100)}%）<br>在庫のある SKU ${fmt(e.skus)}`,
      onClick: (e) => {
        if (state.sortStore === e.key) state.sortStore = -1;
        else { state.sortStore = e.key; state.sortDir = -1; }
        render();
      },
    });

    const byModel = new Map();
    for (const it of data.items) {
      if (state.color && it.color !== state.color) continue;
      if (state.size && it.size !== state.size) continue;
      const m = byModel.get(it.model) || { key: it.model, label: it.model, value: 0, skus: 0, stores: data.stores.map(() => 0) };
      m.value += it._total;
      m.skus += 1;
      it.qty.forEach((q, i) => (m.stores[i] += q));
      byModel.set(it.model, m);
    }
    const models = [...byModel.values()].sort((a, b) => b.value - a.value);
    barChart($("modelChart"), models, {
      compact: true,
      active: state.model,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>在庫 ${fmt(e.value)} 点 / ${e.skus} SKU<br>` +
        data.stores.map((s, i) => `${esc(s)}: ${fmt(e.stores[i])}`).join("<br>"),
      onClick: (e) => {
        state.model = state.model === e.key ? "" : e.key;
        $("fModel").value = state.model;
        render();
      },
    });
  }

  /* ---------- KPI ---------- */
  function renderKpis(rows) {
    const t = rows.reduce((a, it) => a + it._total, 0);
    const all = data.items.length;
    const isFiltered = rows.length !== all;
    $("kpiTotal").textContent = fmt(t);
    $("kpiTotalNote").textContent = isFiltered ? `全体 ${fmt(data._grand)} 点のうち` : `${data.stores.length} 店舗の合計`;
    $("kpiSku").textContent = fmt(rows.length);
    $("kpiSkuNote").textContent = isFiltered ? `全 ${fmt(all)} SKU のうち` : `${uniq(data.items.map((i) => i.model)).length} モデル`;
    $("kpiOut").textContent = fmt(rows.filter((it) => it._total === 0).length);
    $("kpiLow").textContent = fmt(rows.filter((it) => it._total === 1).length);
  }

  /* ---------- table ---------- */
  function renderHead() {
    const arrow = (k) => (state.sortStore === k ? `<span class="arrow">${state.sortDir < 0 ? "▼" : "▲"}</span>` : "");
    $("thead").innerHTML = `
      <tr>
        <th class="left sticky-col" rowspan="2">Code</th>
        <th class="left" rowspan="2">Model</th>
        <th class="left" rowspan="2">Color</th>
        <th class="left" rowspan="2">Size</th>
        ${data.stores.map((s, i) => `<th class="store sortable" data-sort="${i}" colspan="${state.showReturn ? 2 : 1}" title="クリックで並び替え">${esc(s)}${arrow(i)}</th>`).join("")}
        <th class="store sortable" data-sort="-2" colspan="${state.showReturn ? 2 : 1}" title="クリックで並び替え">Total${arrow(-2)}</th>
      </tr>
      <tr>
        ${[...data.stores, "Total"].map(() => `<th class="first-of-store">在庫</th><th class="ret-h">返品</th>`).join("")}
      </tr>`;
    $("thead").querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const k = +th.dataset.sort;
        if (state.sortStore !== k) { state.sortStore = k; state.sortDir = -1; }
        else if (state.sortDir < 0) state.sortDir = 1;
        else state.sortStore = -1;
        render();
      });
    });
  }

  function renderTable(rows) {
    const table = $("stockTable");
    table.classList.toggle("hide-return", !state.showReturn);
    renderHead();
    $("rowCount").textContent = `${fmt(rows.length)} 件`;

    if (!rows.length) {
      $("tbody").innerHTML = `<tr><td class="empty" colspan="${4 + (data.stores.length + 1) * 2}">条件に合う商品がありません</td></tr>`;
    } else {
      const grouped = state.sortStore === -1;
      let prevModel = null;
      $("tbody").innerHTML = rows.map((it) => {
        const start = grouped && prevModel !== null && it.model !== prevModel;
        prevModel = it.model;
        const t = it._total;
        const rt = it.ret.reduce((a, b) => a + b, 0);
        const badge = t === 0 ? `<span class="badge out" title="全店在庫切れ" aria-label="全店在庫切れ">✕</span>` : t === 1 ? `<span class="badge low" title="残りわずか" aria-label="残りわずか">▲</span>` : "";
        return `<tr class="${start ? "model-start" : ""}">
          <td class="left code sticky-col">${esc(it.code)}</td>
          <td class="left model">${esc(it.model)}</td>
          <td class="left">${esc(it.color)}</td>
          <td class="left">${esc(it.size)}</td>
          ${it.qty.map((q, i) => `<td class="qty first-of-store ${heat(q)}" data-s="${i}">${q ? q : "–"}</td><td class="ret">${it.ret[i] ? it.ret[i] : "–"}</td>`).join("")}
          <td class="total first-of-store">${fmt(t)}${badge}</td><td class="ret">${rt ? rt : "–"}</td>
        </tr>`;
      }).join("");
    }

    const sums = data.stores.map((_, i) => rows.reduce((a, it) => a + it.qty[i], 0));
    const rsums = data.stores.map((_, i) => rows.reduce((a, it) => a + it.ret[i], 0));
    const g = sums.reduce((a, b) => a + b, 0);
    const rg = rsums.reduce((a, b) => a + b, 0);
    $("tfoot").innerHTML = `<tr>
      <td class="left sticky-col">Total</td><td></td><td></td><td></td>
      ${sums.map((s, i) => `<td class="qty first-of-store">${fmt(s)}</td><td class="ret">${fmt(rsums[i])}</td>`).join("")}
      <td class="qty first-of-store">${fmt(g)}</td><td class="ret">${fmt(rg)}</td>
    </tr>`;
  }

  // cell hover tooltip (delegated)
  $("tbody").addEventListener("mousemove", (e) => {
    const td = e.target.closest("td.qty");
    if (!td) return hideTip();
    const tr = td.parentElement;
    const code = tr.querySelector(".code")?.textContent;
    const s = data.stores[+td.dataset.s];
    showTip(e, `<b>${esc(code)}</b><br>${esc(s)}：${td.textContent === "–" ? "在庫なし" : td.textContent + " 点"}`);
  });
  $("tbody").addEventListener("mouseleave", hideTip);

  function render() {
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
  }

  /* ---------- controls ---------- */
  const bind = (id, key, ev = "change") => $(id).addEventListener(ev, (e) => { state[key] = e.target.value; render(); });
  bind("q", "q", "input");
  bind("fModel", "model");
  bind("fColor", "color");
  bind("fSize", "size");
  bind("fStock", "stock");
  $("showReturn").addEventListener("change", (e) => { state.showReturn = e.target.checked; render(); });
  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", model: "", color: "", size: "", stock: "", sortStore: -1, sortDir: -1 });
    ["q", "fModel", "fColor", "fSize", "fStock"].forEach((id) => ($(id).value = ""));
    render();
  });

  /* ---------- load ---------- */
  fetch("stock.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((d) => {
      data = d;
      for (const it of d.items) {
        it._total = total(it);
        it._search = `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase();
      }
      d._grand = d.items.reduce((a, it) => a + it._total, 0);
      $("asof").textContent = d.asOfDate ? `${d.asOfDate} 営業終了時点` : d.asOf;
      $("source").textContent = d.title;
      $("footSource").textContent = d.source;
      fillSelect($("fModel"), uniq(d.items.map((i) => i.model)));
      fillSelect($("fColor"), uniq(d.items.map((i) => i.color)).sort());
      fillSelect($("fSize"), uniq(d.items.map((i) => i.size)).sort((a, b) => {
        const [pa, na] = sizeKey(a), [pb, nb] = sizeKey(b);
        return pa === pb ? na - nb : pa.localeCompare(pb);
      }));
      render();
    })
    .catch((err) => {
      $("asof").textContent = "データの読み込みに失敗しました";
      console.error(err);
    });
})();
