(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("en-US");
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Excel の表示形式 #,##0;\(#,##0\);\-  (空セルは空欄のまま)
  const nf = (v) => {
    if (v === null || v === undefined) return "";
    if (v === 0) return "-";
    const s = Math.abs(v).toLocaleString("en-US");
    return v < 0 ? `(${s})` : s;
  };

  // Excel の列幅 (文字数) → px : width * 7 + 5
  const COL_W = { code: 23.63, model: 15.27, color: 16.63, size: 10.91, qty: 12.36, ret: 11.18, rate: 8.5, mos: 8.5 }; // Excel 出力用
  // 画面の表は見やすさ優先で Code 列を隠し、各列を狭くする
  const VIEW_W = { model: 12.5, color: 14.5, size: 4.6, qty: 6, totQty: 6.6, ret: 5.6, rate: 5, mos: 5 };
  const VIEW_TEXT = ["model", "color", "size"];
  const shortModel = (m) => String(m || "").replace(/^VFF\s+/, "");
  const shortGroup = (g) => String(g).replace(" (Department)", " (Dept.)");
  const px = (w) => Math.round(w * 7 + 5);

  // sort: "" = Excel の並び / "0".. = 店舗・オフィス / "store" = Store Total / "total" = Company Total
  const state = { q: "", stock: "", sort: "" };
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

  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  const applyTheme = () => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    $("themeLabel").textContent = t(`theme.${theme}`);
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
    document.querySelectorAll(".tab").forEach((tab) => tab.setAttribute("aria-selected", tab.dataset.view === v));
    $("view-table").hidden = v !== "table";
    $("view-detail").hidden = v !== "detail";
    history.replaceState(null, "", v === "detail" ? "#detail" : location.pathname + location.search);
    if (v === "table") fitTable();
    if (scroll) $("view-table").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));

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

  /* ---------- Return 入力 (共有サーバーに保存。未設定ならこのブラウザに保存) ---------- */
  // 入力した Return の数だけ Quantity から差し引く。
  // 値は基準日ごとに保存するので、新しい在庫データに更新すると入力はリセットされる。
  // 共有モード: /api/returns (Vercel Function + Upstash Redis) に保存し、全員が同じ内容を見る。
  //   保存時は変更したマスだけを送るので、別の人が別のマスを同時に入力しても消えない。
  //   15 秒ごと (と画面に戻ったとき) に最新を読み込み、自分の未保存の入力は残したまま反映する。
  let returns = {};
  // 受領済みの返品 (オフィスで到着を確認して「受領完了」を押したもの)。これだけが Office の在庫に加算される。
  // returns (輸送中) は店舗から引くが Office には足さない。受領操作はすぐにサーバーへ保存する。
  let received = {};
  let RKEY = "returns";
  let recvBusy = false; // 受領完了・取り消しを送信中
  const RECV_KEY = () => `${RKEY}:received`;
  // Office 列には Return がない。店舗の Return はその店舗から引いて Office に足す (店舗 → オフィスへ戻る)
  // groups (列グループ): [...拠点, Store Total, Company Total]  ※Office がなければ [...店舗, Total]
  const hasOffice = () => data.officeIndex != null;
  const hasRet = (i) => i !== data.officeIndex && !(hasOffice() && i === data.stores.length + 1);
  const rkey = (it, i) => `${it.code || `${it.model}|${it.color}|${it.size}`}@${data.stores[i]}`;
  // 入力はまず画面上だけに反映し (未保存)、「保存」ボタンで確定する
  let shared = false;      // 共有サーバーが使えるか
  let saved = {};          // 最後に保存・同期した内容
  let lastSaved = null;
  let lastSync = null;
  let serverUpdatedAt = null;
  let syncError = false;
  let saving = false;
  const API = "api/returns";
  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  const isDirty = () => !same(returns, saved);
  const stripOffice = (m) => {
    const out = {};
    const office = data.officeIndex != null ? `@${data.stores[data.officeIndex]}` : null;
    for (const [k, v] of Object.entries(m || {})) if (!(office && k.endsWith(office)) && Number(v) > 0) out[k] = Number(v);
    return out;
  };
  // from → to の差分 (変更・追加したマスと、消したマス)
  const diff = (from, to) => ({
    set: Object.fromEntries(Object.entries(to).filter(([k, v]) => from[k] !== v)),
    del: Object.keys(from).filter((k) => !(k in to)),
  });
  // サーバーの最新内容に、自分の未保存の変更を重ねる。画面が変わるなら true
  function mergeRemote(remote, recv) {
    if (recv) received = stripOffice(recv);
    const mine = diff(saved, returns);
    const next = { ...stripOffice(remote), ...mine.set };
    mine.del.forEach((k) => delete next[k]);
    saved = stripOffice(remote);
    lastSync = new Date();
    syncError = false;
    const changed = !same(next, returns);
    returns = next;
    return changed;
  }
  function loadLocal() {
    try { saved = stripOffice(JSON.parse(localStorage.getItem(RKEY) || "{}")); } catch (_) { saved = {}; }
    try { received = stripOffice(JSON.parse(localStorage.getItem(RECV_KEY()) || "{}")); } catch (_) { received = {}; }
    returns = { ...saved };
  }
  function saveLocal() {
    localStorage.setItem(RKEY, JSON.stringify(saved));
    localStorage.setItem(RECV_KEY(), JSON.stringify(received));
  }
  // 返品の共有データを変更する (受領完了・取り消し・Excel からの取り込み)。成功したら true
  async function postReturns(extra) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: RKEY, set: {}, del: [], ...extra }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    serverUpdatedAt = j.updatedAt;
    mergeRemote(j.returns, j.received);
    return true;
  }
  // Excel に直接入力されていた返品を「輸送中」として 1 度だけ登録する (既に入力があるマスはそのまま)
  async function importSeed() {
    const seed = data.returnsSeed;
    if (!seed || !seed.id) return;
    const mark = `${RKEY}:seed:${seed.id}`;
    try { if (localStorage.getItem(mark)) return; } catch (_) {}
    const set = stripOffice(seed.returns);
    try {
      if (shared) await postReturns({ seed: { id: seed.id, set } });
      else {
        for (const [k, v] of Object.entries(set)) if (!(k in saved) && !(k in received)) saved[k] = v;
        returns = { ...saved, ...diff(saved, returns).set };
        saveLocal();
      }
      try { localStorage.setItem(mark, new Date().toISOString()); } catch (_) {}
    } catch (e) { console.error(e); }
  }
  async function initReturns() {
    try {
      const r = await fetch(`${API}?key=${encodeURIComponent(RKEY)}`, { cache: "no-store" });
      const j = r.ok ? await r.json() : null;
      if (j && j.shared) {
        shared = true;
        saved = stripOffice(j.returns);
        received = stripOffice(j.received);
        returns = { ...saved };
        serverUpdatedAt = j.updatedAt;
        lastSync = new Date();
        return importSeed();
      }
    } catch (_) {}
    loadLocal(); // 共有サーバー未設定 (ローカル確認など) → このブラウザに保存
    return importSeed();
  }
  async function saveReturns() {
    if (!shared) {
      try {
        saved = { ...returns };
        saveLocal();
        lastSaved = new Date();
        return true;
      } catch (_) {
        alert(t("ret.saveFail"));
        return false;
      }
    }
    const { set, del } = diff(saved, returns);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: RKEY, set, del }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      serverUpdatedAt = j.updatedAt;
      const changed = mergeRemote(j.returns, j.received); // 他の人が保存した分もここで反映
      lastSaved = new Date();
      if (changed) applyRemote(); else updateReturnInfo();
      return true;
    } catch (e) {
      console.error(e);
      syncError = true;
      alert(t("ret.saveFailShared"));
      return false;
    }
  }
  // 他の人の保存を定期的に取り込む
  async function pullRemote() {
    if (!shared || saving || document.hidden) return;
    try {
      const r = await fetch(`${API}?key=${encodeURIComponent(RKEY)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const fresh = j.updatedAt !== serverUpdatedAt;
      serverUpdatedAt = j.updatedAt;
      const recvBefore = JSON.stringify(sortKeys(received));
      const changed = mergeRemote(j.returns, j.received) || recvBefore !== JSON.stringify(sortKeys(received));
      if (changed && fresh) {
        applyRemote();
        flashSync();
      } else updateReturnInfo();
    } catch (e) {
      syncError = true;
      updateReturnInfo();
    }
  }
  let flashTimer = null;
  function flashSync() {
    const el = $("syncState");
    el.classList.add("flash");
    el.dataset.flash = "1";
    updateReturnInfo();
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.classList.remove("flash"); delete el.dataset.flash; updateReturnInfo(); }, 4000);
  }
  setInterval(pullRemote, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pullRemote(); });
  function recompute(it) {
    // r = 輸送中 (店舗から引く・Office には足さない)、rc = 受領済み (店舗から引いて Office に足す)
    const r = it.qty.map((_, i) => (hasRet(i) ? returns[rkey(it, i)] || 0 : 0));
    const rc = it.qty.map((_, i) => (hasRet(i) ? received[rkey(it, i)] || 0 : 0));
    it._ret = it.ret.map((x, i) => (hasRet(i) ? returns[rkey(it, i)] ?? x : null));
    it._rc = rc;
    it._adj = it.qty.map((q, i) => q - r[i] - rc[i]);
    if (data.officeIndex != null) it._adj[data.officeIndex] += sum(rc);
    it._transit = sum(r);
    it._tq = sum(it._adj) + it._transit; // Company Total (店舗 + オフィス + イベント + 返品輸送中)
    // Store Total は店舗のみ (Office と Event Asok は含めない)
    const isStore = (i) => i !== data.officeIndex && i !== data.eventIndex;
    it._st = sum(it._adj.filter((_, i) => isStore(i)));
    it._tr = sum(it._ret.filter((_, i) => isStore(i)));
  }
  const returnCount = () => Object.keys(returns).length;
  function updateReturnInfo() {
    const n = returnCount();
    const dirty = isDirty();
    $("retInfo").textContent = n ? t("ret.info", { n: fmt(n), q: fmt(sum(Object.values(returns))) }) : "";
    $("clearReturns").hidden = !n;
    const nRecv = Object.keys(received).length;
    const nSaved = Object.keys(saved).length;
    $("receiveReturns").hidden = !(nSaved || nRecv);
    $("receiveReturns").textContent = nSaved ? t("recv.btnN", { q: fmt(sum(Object.values(saved))) }) : t("recv.btn");
    $("saveReturns").disabled = !dirty;
    $("revertReturns").hidden = !dirty;
    const st = $("saveState");
    st.classList.toggle("dirty", dirty);
    const hm = (d) => d.toLocaleTimeString(window.I18N.locale, { hour: "2-digit", minute: "2-digit" });
    st.textContent = saving ? t("ret.saving") : dirty
      ? t("ret.unsaved")
      : lastSaved ? t("ret.savedAt", { t: hm(lastSaved) }) : n ? t("ret.saved") : "";
    const sy = $("syncState");
    sy.classList.toggle("shared", shared && !syncError);
    sy.classList.toggle("error", shared && syncError);
    sy.textContent = !shared ? t("sync.local")
      : syncError ? t("sync.offline")
      : sy.dataset.flash ? t("sync.pulled")
      : t("sync.shared", { t: lastSync ? hm(lastSync) : "–" });
  }
  // 他の人の入力を反映: 表を作り直さず数字だけ書き換える。
  // 入力中のマス (カーソルがあるマス) には触れないので、打ちかけの数字は消えない。
  // 絞り込み・並び順・スクロール位置・範囲選択もそのまま。
  function applyRemote() {
    data.items.forEach(recompute);
    data._grand = sum(data.items.map((x) => x._tq));
    const active = document.activeElement;
    $("tbody").querySelectorAll("tr[data-id]").forEach((tr) => {
      const it = data.items[+tr.dataset.id];
      const q = rowQty(it);
      tr.querySelectorAll("td.q").forEach((td, k) => (td.textContent = nf(q[k])));
      tr.querySelector("td.tr").textContent = nf(it._tr);
      updateMos(tr, it);
      tr.querySelectorAll(".ret-in").forEach((inp) => {
        if (inp === active) return;
        const v = String(it._ret[+inp.dataset.s] ?? "");
        inp.value = v;
        inp.defaultValue = v;
      });
    });
    $("totalRow").innerHTML = totalRowHtml(totalsOf(shown));
    refreshSel();
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    updateReturnInfo();
    if ($("recvDlg").open && !recvBusy) renderRecv();
  }

  function applyReturns() {
    data.items.forEach(recompute);
    data._grand = sum(data.items.map((x) => x._tq));
    render();
    updateReturnInfo();
  }

  /* ---------- filtering ---------- */
  // 見出しの ▼ フィルター (Excel のオートフィルターと同じ)
  //   text: Code / Model / Color / Size → 表示する値の Set (null = 絞り込みなし)
  //   num:  groups の番号 → { op: "gt0" | "eq0" | "range", min, max }
  const TEXT_COLS = ["code", "model", "color", "size"];
  const colFilters = { text: {}, num: {} };
  // 拠点フィルター: 非表示にする列グループ (groups の番号)。空 = 全拠点を表示
  const locHidden = new Set();
  const locShown = () => groups.map((_, g) => g).filter((g) => !locHidden.has(g));
  // 表示中の拠点 (Store Total / Company Total を除く)
  const locStores = () => locShown().filter((g) => g < data.stores.length);
  const numOk = (v, f) =>
    f.op === "gt0" ? v > 0 : f.op === "eq0" ? v === 0 :
    (f.min == null || v >= f.min) && (f.max == null || v <= f.max);
  const hasColFilters = () => Object.keys(colFilters.text).length + Object.keys(colFilters.num).length > 0 || locHidden.size > 0;

  // skip: そのフィルター自身を除いて判定する (▼ の候補一覧を作るため)
  function matches(it, skip) {
    const q = state.q.trim().toLowerCase();
    {
      for (const k of TEXT_COLS) if (`t${k}` !== skip && colFilters.text[k] && !colFilters.text[k].has(it[k])) return false;
      for (const g in colFilters.num) if (`n${g}` !== skip && !numOk(rowQty(it)[+g], colFilters.num[g])) return false;
      // 拠点を絞り込んだときは、選んだ拠点に在庫も月販もない行を隠し、在庫の条件も選んだ拠点の合計で見る
      let stockQty = it._tq;
      if (locHidden.size && skip !== "loc") {
        const ls = locStores();
        if (ls.length) {
          stockQty = sum(ls.map((g) => it._adj[g]));
          if (!ls.some((g) => it._adj[g] || (it.rate && it.rate[g]))) return false;
        }
      }
      if (state.stock === "in" && stockQty <= 0) return false;
      if (state.stock === "low" && stockQty !== 1) return false;
      if (state.stock === "out" && stockQty !== 0) return false;
      if (q && !it._search.includes(q)) return false;
      return true;
    }
  }

  function filtered() {
    let rows = data.items.filter((it) => matches(it));
    if (state.sort !== "") {
      const key = state.sort === "total" ? (it) => it._tq : state.sort === "store" ? (it) => it._st : (it) => it._adj[+state.sort];
      rows = rows.map((it, i) => [it, i]).sort((a, b) => key(b[0]) - key(a[0]) || a[1] - b[1]).map((x) => x[0]);
    }
    return rows;
  }

  /* ---------- 見出しの ▼ フィルター UI ---------- */
  const pop = $("afPop");
  let popFor = null;

  function colLabel(id) {
    if (id === "loc") return t("f.loc");
    return id[0] === "t" ? { code: "Code", model: "Model", color: "Color", size: "Size" }[id.slice(1)] : `${groups[+id.slice(1)]} Quantity`;
  }
  function filterSummary(id) {
    if (id === "loc") {
      const vals = locShown().map((g) => shortGroup(groups[g]));
      return vals.length <= 2 ? vals.join(", ") : `${vals.slice(0, 2).join(", ")} +${vals.length - 2}`;
    }
    if (id[0] === "t") {
      const set = colFilters.text[id.slice(1)];
      const vals = [...set].map((v) => v || t("af.blank"));
      return vals.length <= 2 ? vals.join(", ") : `${vals.slice(0, 2).join(", ")} +${vals.length - 2}`;
    }
    const f = colFilters.num[id.slice(1)];
    if (f.op === "gt0") return t("af.gt0");
    if (f.op === "eq0") return t("af.eq0");
    return `${f.min ?? ""} – ${f.max ?? ""}`;
  }
  function activeIds() {
    return [...(locHidden.size ? ["loc"] : []), ...Object.keys(colFilters.text).map((k) => `t${k}`), ...Object.keys(colFilters.num).map((g) => `n${g}`)];
  }

  function updateFilterUi() {
    const act = new Set(activeIds());
    document.querySelectorAll(".af, .ms").forEach((b) => b.classList.toggle("on", act.has(b.dataset.af)));
    document.querySelectorAll(".ms").forEach((b) => {
      const id = b.dataset.af;
      b.querySelector(".ms-val").textContent = act.has(id) ? filterSummary(id) : t("f.all");
      b.title = !act.has(id) ? "" : id === "loc" ? locShown().map((g) => groups[g]).join("\n")
        : [...colFilters.text[id.slice(1)]].map((v) => v || t("af.blank")).join("\n");
    });
    const box = $("activeFilters");
    if (!act.size) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = `<span class="chips-label">${esc(t("chips.label"))}</span>` +
      [...act].map((id) => `<span class="chip"><b>${esc(colLabel(id))}</b>: ${esc(filterSummary(id))}<button type="button" data-rm="${id}" aria-label="${esc(t("af.clear"))}">×</button></span>`).join("") +
      `<button type="button" class="chip-clear" data-rm="*">${esc(t("chips.clearAll"))}</button>`;
  }
  $("activeFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (!b) return;
    const hadLoc = locHidden.size > 0;
    if (b.dataset.rm === "*") { colFilters.text = {}; colFilters.num = {}; locHidden.clear(); } else removeFilter(b.dataset.rm);
    if (hadLoc && !locHidden.size) renderFrame(data);
    render();
  });
  function removeFilter(id) {
    if (id === "loc") locHidden.clear();
    else if (id[0] === "t") delete colFilters.text[id.slice(1)]; else delete colFilters.num[id.slice(1)];
  }

  function closePop() { pop.hidden = true; popFor = null; }
  function openPop(btn) {
    const id = btn.dataset.af;
    if (popFor === id) return closePop();
    popFor = id;
    pop.innerHTML = id === "loc" ? locPopHtml() : id[0] === "t" ? textPopHtml(id.slice(1)) : numPopHtml(+id.slice(1));
    pop.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let x = Math.min(r.left, window.innerWidth - w - 8), y = r.bottom + 4;
    if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 4);
    pop.style.left = Math.max(8, x) + "px";
    pop.style.top = y + "px";
    const first = pop.querySelector("input[type=search], input[type=radio]:checked");
    if (first) first.focus();
  }

  function textPopHtml(key) {
    const counts = new Map();
    for (const it of data.items) if (matches(it, `t${key}`)) counts.set(it[key], (counts.get(it[key]) || 0) + 1);
    // 絞り込み中の値は、他の条件で 0 件になっても一覧に残す
    const cur = colFilters.text[key];
    if (cur) cur.forEach((v) => counts.has(v) || counts.set(v, 0));
    let vals = [...counts.keys()];
    if (key === "size") vals.sort((a, b) => { const [pa, na] = sizeKey(a), [pb, nb] = sizeKey(b); return pa === pb ? na - nb : pa.localeCompare(pb); });
    else if (key !== "model") vals.sort((a, b) => (a === "") - (b === "") || a.localeCompare(b));
    return `<div class="af-head">${esc(colLabel(`t${key}`))}</div>
      <input type="search" class="af-search" placeholder="${esc(t("f.search"))}" autocomplete="off">
      <div class="af-list">
        <label class="af-all"><input type="checkbox" data-all> ${esc(t("af.selectAll"))}</label>
        ${vals.map((v) => `<label data-v="${esc(v.toLowerCase())}"><input type="checkbox" value="${esc(v)}" ${!cur || cur.has(v) ? "checked" : ""}> <span>${esc(v || t("af.blank"))}</span><em>${counts.get(v)}</em></label>`).join("")}
      </div>
      <div class="af-foot">
        <button type="button" class="ghost small" data-act="clear">${esc(t("af.clear"))}</button>
        <span></span>
        <button type="button" class="ghost small" data-act="cancel">${esc(t("af.cancel"))}</button>
        <button type="button" class="primary small" data-act="ok">OK</button>
      </div>`;
  }

  // 拠点 (列) の選択: 選んだ拠点の列だけを表示する
  function locPopHtml() {
    return `<div class="af-head">${esc(t("f.loc"))}</div>
      <div class="af-list">
        <label class="af-all"><input type="checkbox" data-all> ${esc(t("af.selectAll"))}</label>
        ${groups.map((g, i) => `<label data-v="${esc(g.toLowerCase())}"${i === data.stores.length ? ' class="af-sep"' : ""}><input type="checkbox" value="${i}" ${locHidden.has(i) ? "" : "checked"}> <span>${esc(g)}</span></label>`).join("")}
      </div>
      <p class="af-note">${esc(t("f.locNote"))}</p>
      <div class="af-foot">
        <button type="button" class="ghost small" data-act="clear">${esc(t("af.clear"))}</button>
        <span></span>
        <button type="button" class="ghost small" data-act="cancel">${esc(t("af.cancel"))}</button>
        <button type="button" class="primary small" data-act="ok">OK</button>
      </div>`;
  }

  function numPopHtml(g) {
    const f = colFilters.num[g] || { op: "all" };
    const opt = (op, label) => `<label><input type="radio" name="afop" value="${op}" ${f.op === op ? "checked" : ""}> ${esc(label)}</label>`;
    return `<div class="af-head">${esc(colLabel(`n${g}`))}</div>
      <div class="af-num">
        ${opt("all", t("f.all"))}
        ${opt("gt0", t("af.gt0"))}
        ${opt("eq0", t("af.eq0"))}
        ${opt("range", t("af.range"))}
        <div class="af-range">
          <input type="number" data-min placeholder="${esc(t("af.min"))}" value="${f.op === "range" && f.min != null ? f.min : ""}">
          <span>–</span>
          <input type="number" data-max placeholder="${esc(t("af.max"))}" value="${f.op === "range" && f.max != null ? f.max : ""}">
        </div>
      </div>
      <div class="af-foot">
        <button type="button" class="ghost small" data-act="clear">${esc(t("af.clear"))}</button>
        <span></span>
        <button type="button" class="ghost small" data-act="cancel">${esc(t("af.cancel"))}</button>
        <button type="button" class="primary small" data-act="ok">OK</button>
      </div>`;
  }

  function syncAllBox() {
    const all = pop.querySelector("[data-all]");
    if (!all) return;
    const boxes = [...pop.querySelectorAll(".af-list label:not(.af-all):not([hidden]) input")];
    const on = boxes.filter((b) => b.checked).length;
    all.checked = on === boxes.length && on > 0;
    all.indeterminate = on > 0 && on < boxes.length;
  }

  function applyPop() {
    const id = popFor;
    if (id === "loc") {
      const boxes = [...pop.querySelectorAll(".af-list label:not(.af-all) input")];
      if (!boxes.some((b) => b.checked)) return; // 1 つも選ばないのは不可
      locHidden.clear();
      boxes.forEach((b) => b.checked || locHidden.add(+b.value));
      // 隠した拠点の数量フィルターは外す
      locHidden.forEach((g) => delete colFilters.num[g]);
      closePop();
      renderFrame(data);
      render();
      return;
    }
    if (id[0] === "t") {
      const key = id.slice(1);
      const boxes = [...pop.querySelectorAll(".af-list label:not(.af-all) input")];
      const on = boxes.filter((b) => b.checked).map((b) => b.value);
      if (on.length === boxes.length) delete colFilters.text[key];
      else colFilters.text[key] = new Set(on);
    } else {
      const g = id.slice(1);
      const op = (pop.querySelector("input[name=afop]:checked") || {}).value || "all";
      const num = (el) => (el.value.trim() === "" ? null : Number(el.value));
      const min = num(pop.querySelector("[data-min]")), max = num(pop.querySelector("[data-max]"));
      if (op === "all" || (op === "range" && min == null && max == null)) delete colFilters.num[g];
      else colFilters.num[g] = { op, min, max };
    }
    closePop();
    render();
  }

  // 見出しの ▼ と、上部のモデル・カラー・サイズ (複数選択) は同じフィルター
  document.querySelectorAll(".ms").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); openPop(b); }));
  $("thead").addEventListener("click", (e) => {
    const b = e.target.closest(".af");
    if (b) { e.stopPropagation(); openPop(b); }
  });
  pop.addEventListener("input", (e) => {
    if (e.target.classList.contains("af-search")) {
      const q = e.target.value.trim().toLowerCase();
      pop.querySelectorAll(".af-list label:not(.af-all)").forEach((l) => (l.hidden = q && !l.dataset.v.includes(q)));
      syncAllBox();
    }
    if (e.target.matches("[data-min], [data-max]")) pop.querySelector("input[value=range]").checked = true;
  });
  pop.addEventListener("change", (e) => {
    if (e.target.matches("[data-all]")) {
      pop.querySelectorAll(".af-list label:not(.af-all):not([hidden]) input").forEach((b) => (b.checked = e.target.checked));
    }
    syncAllBox();
  });
  pop.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "ok") applyPop();
    else if (act.dataset.act === "cancel") closePop();
    else if (act.dataset.act === "clear") { const f = popFor; removeFilter(f); closePop(); if (f === "loc") renderFrame(data); render(); }
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePop();
    if (e.key === "Enter" && !e.target.matches("button")) { e.preventDefault(); applyPop(); }
  });
  document.addEventListener("click", (e) => { if (popFor && !pop.contains(e.target) && !e.target.closest("[data-af]")) closePop(); });
  window.addEventListener("resize", closePop);
  new MutationObserver(syncAllBox).observe(pop, { childList: true });

  /* ---------- KPI ---------- */
  function renderKpis(rows) {
    const all = rows.length === data.items.length;
    const total = rows.reduce((a, it) => a + it._tq, 0);
    $("kpiTotal").textContent = fmt(total);
    $("kpiTotalNote").textContent = all
      ? (data.eventIndex != null ? t("kpi.noteOfficeEvent", { n: data.stores.length - 2 })
        : data.officeSource ? t("kpi.noteOffice", { n: data.stores.length - 1 }) : t("kpi.noteStores", { n: data.stores.length }))
      : t("kpi.noteOf", { n: fmt(data._grand) });
    $("kpiSku").textContent = fmt(rows.length);
    $("kpiSkuNote").textContent = all ? t("kpi.models", { n: uniq(data.items.map((i) => i.model)).length }) : t("kpi.skuOf", { n: fmt(data.items.length) });
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
      tipFor: (e) => `<b>${esc(e.label)}</b><br>` + t("tip.loc", { v: fmt(e.value), p: Math.round((e.value / grand) * 100), s: fmt(e.skus) }),
      onClick: (e) => { state.sort = state.sort === e.key ? "" : e.key; $("fSort").value = state.sort; render(); if (state.sort) showView("table", { scroll: true }); },
    });

    // モデル別はモデル絞り込み以外の条件を反映 (クリックで切り替えられるように)
    const byModel = new Map();
    for (const it of data.items) {
      if (colFilters.text.color && !colFilters.text.color.has(it.color)) continue;
      if (colFilters.text.size && !colFilters.text.size.has(it.size)) continue;
      const m = byModel.get(it.model) || { key: it.model, label: it.model, value: 0, skus: 0, stores: data.stores.map(() => 0) };
      m.value += it._tq;
      m.skus += 1;
      it._adj.forEach((q, i) => (m.stores[i] += q));
      byModel.set(it.model, m);
    }
    barChart($("modelChart"), [...byModel.values()].sort((a, b) => b.value - a.value), {
      active: colFilters.text.model && colFilters.text.model.size === 1 ? [...colFilters.text.model][0] : null,
      tipFor: (e) => `<b>${esc(e.label)}</b><br>` + t("tip.model", { v: fmt(e.value), s: e.skus }) + "<br>" +
        data.stores.map((s, i) => `${esc(s)}: ${fmt(e.stores[i])}`).join("<br>"),
      onClick: (e) => {
        const cur = colFilters.text.model;
        const only = cur && cur.size === 1 && cur.has(e.key);
        if (only) delete colFilters.text.model; else colFilters.text.model = new Set([e.key]);
        render();
        if (!only) showView("table", { scroll: true });
      },
    });
  }

  /* ---------- table (Excel 書式) ---------- */
  function renderFrame(d) {
    const ncol = numCols();
    $("cols").innerHTML =
      VIEW_TEXT.map((k) => `<col style="width:${px(VIEW_W[k])}px">`).join("") +
      groups.map((_, g) => colKinds(g).map((k) => {
        const w = k === "qty" && g >= data.stores.length ? VIEW_W.totQty : k === "qty" && g === data.eventIndex ? 8.5 : VIEW_W[k]; // Event Asok は見出しが収まる幅
        return `<col style="width:${px(w)}px">`;
      }).join("")).join("");
    $("thead").innerHTML = `
      <tr class="title"><th colspan="${ncol}">${esc(d.title)}</th></tr>
      <tr class="asof"><th colspan="${ncol}">${esc(d.asOf)}</th></tr>
      <tr class="h1">
        ${["Model", "Color", "Size"].map((h, k) => `<th rowspan="2">${h}${afBtn(`t${VIEW_TEXT[k]}`, h)}</th>`).join("")}
        ${groups.map((g, i) => (colKinds(i).length ? `<th class="grp" colspan="${colKinds(i).length}" title="${esc(g)}">${esc(shortGroup(g))}${afBtn("loc", t("f.loc"))}</th>` : "")).join("")}
      </tr>
      <tr class="h2">${groups.map((g, i) => colKinds(i).map((k) =>
        k === "qty" ? `<th title="Quantity">Qty${afBtn(`n${i}`, `${g} Quantity`)}</th>`
        : k === "ret" ? `<th class="ret-h">Return</th>`
        : `<th class="${k}-h" title="${esc(t(`col.${k}.title`))}">${esc(t(`col.${k}`))}</th>`).join("")).join("")}</tr>`;
    updateFilterUi();
  }

  const afBtn = (id, label) =>
    `<button type="button" class="af" data-af="${id}" aria-haspopup="dialog" aria-label="${esc(label)} ${esc(t("af.title"))}"><svg viewBox="0 0 10 10" aria-hidden="true"><path class="af-arrow" d="M2 3.5h6L5 7z"/><path class="af-funnel" d="M1.5 2h7L6 5.2V8.5L4 7.5V5.2z"/></svg></button>`;

  // 月平均販売・在庫月数: 販売データのある店舗 (店頭販売)、Office (オンライン販売)、
  // Store Total (店舗の合計)、Company Total (オンライン + イベント + 店舗) に付ける (Event Asok には付けない)
  let showRate = true;
  try { showRate = localStorage.getItem("showRate") !== "0"; } catch (_) {}
  const rateStores = () => (data.salesRate && showRate ? data.stores.map((s, i) => (s in data.salesRate.months ? i : -1)).filter((i) => i >= 0) : []);
  const hasRate = (g) => rateStores().includes(g) || (rateStores().length > 0 && hasOffice() && g >= data.stores.length);
  const rowRate = (it, g) => {
    const r = (i) => (it.rate ? it.rate[i] || 0 : 0);
    if (g < data.stores.length) return it.rate ? it.rate[g] : null;
    if (g === data.stores.length) return sum(rateStores().filter((i) => i !== data.officeIndex).map(r)); // Store Total
    return sum(rateStores().map(r)) + (it.rateEvent || 0); // Company Total
  };
  const mos = (q, r) => (r ? q / r : null); // 在庫月数 = 在庫 ÷ 月平均販売
  const fmtRate = (v) => (v == null ? "" : v === 0 ? "-" : v.toFixed(1)); // 小数第 2 位を四捨五入
  const fmtMos = (v) => (v == null ? "" : v <= 0 ? (v === 0 ? "-" : `(${Math.abs(v).toFixed(1)})`) : v.toFixed(1));
  // 列グループごとの列の並び: [月平均販売] Quantity [在庫月数] [Return]
  const colKinds = (g) => locHidden.has(g) ? [] : [...(hasRate(g) ? ["rate"] : []), "qty", ...(hasRate(g) ? ["mos"] : []), ...(hasRet(g) ? ["ret"] : [])];
  const numCols = () => VIEW_TEXT.length + sum(groups.map((_, i) => colKinds(i).length));

  // 1 行分の Quantity / Return を groups の並びで返す
  const rowQty = (it) => (hasOffice() ? [...it._adj, it._st, it._tq] : [...it._adj, it._tq]);
  const rowRet = (it) => (hasOffice() ? [...it._ret, it._tr, null] : [...it._ret, it._tr]);

  function totalsOf(items) {
    const qty = groups.map((_, g) => sum(items.map((it) => rowQty(it)[g])));
    const ret = groups.map((_, g) => sum(items.map((it) => rowRet(it)[g])));
    const rate = groups.map((_, g) => (hasRate(g) ? sum(items.map((it) => rowRate(it, g))) : null));
    return { qty, ret, rate };
  }

  const totalRowHtml = (tot) => `<td>Total</td><td></td><td></td>
      ${groups.map((_, i) => colKinds(i).map((k) =>
        k === "qty" ? `<td class="c">${nf(tot.qty[i])}</td>`
        : k === "ret" ? `<td class="c">${nf(tot.ret[i])}</td>`
        : k === "rate" ? `<td class="c rate">${fmtRate(tot.rate[i])}</td>`
        : `<td class="c mos">${fmtMos(mos(tot.qty[i], tot.rate[i]))}</td>`).join("")).join("")}`;

  // Return で在庫が変わったときに在庫月数を更新
  function updateMos(tr, it) {
    const q = rowQty(it);
    tr.querySelectorAll("td.mos").forEach((td) => {
      const g = +td.dataset.g;
      td.textContent = fmtMos(mos(q[g], rowRate(it, g)));
    });
  }

  let shown = []; // 表示中の行 (Total 行の再計算用)
  function renderTable(items) {
    shown = items;
    const all = items.length === data.items.length;
    const rows = items.map((it) => `<tr data-id="${it._id}">
        <td title="${esc(it.code)}">${esc(shortModel(it.model))}</td><td title="${esc(it.color)}">${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${rowQty(it).map((q, g) => {
          const tot = g >= data.stores.length;
          return colKinds(g).map((k) => {
            if (k === "qty") return `<td class="c q${tot ? " b" : ""}">${nf(q)}</td>`;
            if (k === "rate") return `<td class="c rate">${fmtRate(rowRate(it, g))}</td>`;
            if (k === "mos") return `<td class="c mos" data-g="${g}">${fmtMos(mos(q, rowRate(it, g)))}</td>`;
            if (tot) return `<td class="c b tr">${nf(it._tr)}</td>`;
            return `<td class="c ret"><input class="ret-in" type="text" inputmode="numeric" autocomplete="off" data-s="${g}" value="${it._ret[g] ?? ""}" aria-label="${esc(data.stores[g])} Return"${it._rc[g] ? ` title="${esc(t("recv.cellTitle", { q: it._rc[g] }))}"` : ""}></td>`;
          }).join("");
        }).join("")}
      </tr>`);
    if (!items.length) rows.push(`<tr><td class="empty" colspan="${numCols()}">${esc(t("empty"))}</td></tr>`);

    // 表示中の行の合計 (絞り込み・返品入力がなければ Excel の Total 行と同じ値)
    rows.push(`<tr class="total" id="totalRow">${totalRowHtml(totalsOf(items))}</tr>`);
    $("tbody").innerHTML = rows.join("");
    sel = null;
    refreshSel();
    $("rowCount").textContent = all ? t("count.all", { n: fmt(data.items.length) }) : t("count.of", { n: fmt(data.items.length), m: fmt(items.length) });
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
    recompute(it);
    input.value = it._ret[i] ?? "";
    input.defaultValue = input.value;
    const q = rowQty(it);
    tr.querySelectorAll("td.q").forEach((td, k) => (td.textContent = nf(q[k])));
    tr.querySelector("td.tr").textContent = nf(it._tr);
    updateMos(tr, it);
    $("totalRow").innerHTML = totalRowHtml(totalsOf(shown));
    data._grand = sum(data.items.map((x) => x._tq));
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    updateReturnInfo();
  }
  $("tbody").addEventListener("change", (e) => { if (e.target.classList.contains("ret-in")) { commitReturn(e.target); refreshSel(); } });
  // 入力せずにマスを離れたとき、入力中に届いた他の人の値があれば表示をそろえる
  $("tbody").addEventListener("focusout", (e) => {
    const inp = e.target;
    if (!inp.classList.contains("ret-in") || inp.value !== inp.defaultValue) return;
    const it = data.items[+inp.closest("tr").dataset.id];
    const v = String(it._ret[+inp.dataset.s] ?? "");
    inp.value = v;
    inp.defaultValue = v;
  });

  /* ---------- 範囲選択 → 合計 (Excel のステータスバーと同じ) ---------- */
  // 選択範囲は tbody の行番号 × セル番号 の長方形で持つ
  let sel = null;       // { r0, c0, r1, c1 }  (anchor = r0,c0)
  let dragging = false;
  let scrollTimer = null;
  const bodyRows = () => $("tbody").rows;
  const cellAt = (el) => {
    const td = el && el.closest && el.closest("#tbody td");
    if (!td || td.classList.contains("empty")) return null;
    return { r: td.parentElement.sectionRowIndex, c: td.cellIndex };
  };
  const cellValue = (td) => {
    const input = td.querySelector("input");
    const raw = (input ? input.value : td.textContent).trim().replace(/,/g, "");
    if (raw === "") return null;
    if (raw === "-") return 0;
    const m = /^\((\d+(?:\.\d+)?)\)$/.exec(raw);
    if (m) return -Number(m[1]);
    return /^-?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
  };
  function selRange() {
    return { r0: Math.min(sel.r0, sel.r1), r1: Math.max(sel.r0, sel.r1), c0: Math.min(sel.c0, sel.c1), c1: Math.max(sel.c0, sel.c1) };
  }
  function refreshSel() {
    document.querySelectorAll("#tbody td.sel").forEach((td) => td.classList.remove("sel", "sel-t", "sel-b", "sel-l", "sel-r"));
    const bar = $("selBar");
    if (!sel) { bar.hidden = true; return; }
    const { r0, r1, c0, c1 } = selRange();
    const rows = bodyRows();
    let total = 0, nums = 0, cells = 0, filled = 0;
    for (let r = r0; r <= r1 && r < rows.length; r++) {
      for (let c = c0; c <= c1; c++) {
        const td = rows[r].cells[c];
        if (!td) continue;
        cells++;
        td.classList.add("sel");
        if (r === r0) td.classList.add("sel-t");
        if (r === r1) td.classList.add("sel-b");
        if (c === c0) td.classList.add("sel-l");
        if (c === c1) td.classList.add("sel-r");
        const v = cellValue(td);
        if (v != null) { total += v; nums++; }
        // データの個数 (Excel と同じく、空欄でないマスを数える。文字のマスも含む)
        const input = td.querySelector("input");
        if ((input ? input.value : td.textContent).trim() !== "") filled++;
      }
    }
    if (cells <= 1 && !dragging) { bar.hidden = true; return; } // 1 マスだけのクリックでは出さない
    bar.hidden = false;
    // 数値のマスがあるときだけ 合計・平均・数値の個数 を出す (Excel のステータスバーと同じ)
    document.querySelectorAll("#selBar .sel-num").forEach((el) => (el.hidden = !nums));
    $("selSum").textContent = fmt(total);
    $("selAvg").textContent = nums ? (Math.round((total / nums) * 10) / 10).toLocaleString("en-US") : "–";
    $("selCount").textContent = fmt(nums);
    $("selFilled").textContent = fmt(filled);
    $("selRows").textContent = fmt(r1 - r0 + 1);
    $("selSize").textContent = `${r1 - r0 + 1} × ${c1 - c0 + 1}`;
  }
  function clearSel() { sel = null; refreshSel(); }

  $("tbody").addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    // Return 欄は通常クリックで入力、Shift+クリックなら範囲選択を広げる
    if (e.target.closest("input, button") && !(e.shiftKey && sel)) return;
    const p = cellAt(e.target);
    if (!p) return;
    e.preventDefault(); // 文字の選択をしない
    if (document.activeElement && document.activeElement.classList.contains("ret-in")) document.activeElement.blur();
    if (e.shiftKey && sel) { sel.r1 = p.r; sel.c1 = p.c; }
    else sel = { r0: p.r, c0: p.c, r1: p.r, c1: p.c };
    dragging = true;
    document.body.classList.add("selecting");
    refreshSel();
  });
  let lastPt = null;
  function dragTo(x, y) {
    const p = cellAt(document.elementFromPoint(x, y));
    if (p && (p.r !== sel.r1 || p.c !== sel.c1)) { sel.r1 = p.r; sel.c1 = p.c; refreshSel(); }
  }
  document.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lastPt = { x: e.clientX, y: e.clientY };
    dragTo(e.clientX, e.clientY);
    // 画面の端までドラッグしたら自動でスクロール
    const edge = 40;
    const dy = e.clientY < edge ? -20 : e.clientY > window.innerHeight - edge ? 20 : 0;
    clearInterval(scrollTimer);
    if (dy) scrollTimer = setInterval(() => { window.scrollBy(0, dy); if (lastPt) dragTo(lastPt.x, lastPt.y); }, 30);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    clearInterval(scrollTimer);
    document.body.classList.remove("selecting");
    refreshSel();
  };
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("pointerdown", (e) => {
    if (sel && !e.target.closest("#tbody") && !e.target.closest("#selBar")) clearSel();
  });
  document.addEventListener("keydown", (e) => {
    if (!sel) return;
    if (e.key === "Escape") clearSel();
    // Ctrl+C / ⌘+C で選択範囲をコピー (Excel に貼り付けられるタブ区切り)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !window.getSelection().toString() && !e.target.closest("input")) {
      const { r0, r1, c0, c1 } = selRange();
      const rows = bodyRows();
      const lines = [];
      for (let r = r0; r <= r1 && r < rows.length; r++) {
        const vals = [];
        for (let c = c0; c <= c1; c++) {
          const td = rows[r].cells[c];
          if (!td) continue;
          const v = cellValue(td);
          vals.push(v != null ? v : (td.querySelector("input") ? td.querySelector("input").value : td.textContent.trim()));
        }
        lines.push(vals.join("\t"));
      }
      navigator.clipboard && navigator.clipboard.writeText(lines.join("\n")).then(() => {
        const b = $("selBar");
        b.classList.add("copied");
        setTimeout(() => b.classList.remove("copied"), 700);
      }).catch(() => {});
      e.preventDefault();
    }
  });
  $("selClose").addEventListener("click", clearSel);
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
    if (!confirm(t(shared ? "ret.confirmClearShared" : "ret.confirmClear", { n: returnCount() }))) return;
    returns = {};
    applyReturns(); // 消去も「保存」を押すまで確定しない
  });

  $("saveReturns").addEventListener("click", async () => {
    if (saving) return;
    const active = document.activeElement;
    if (active && active.classList.contains("ret-in")) active.blur(); // 入力中の値を確定してから保存
    saving = true;
    $("saveReturns").disabled = true;
    updateReturnInfo();
    try { await saveReturns(); } finally { saving = false; updateReturnInfo(); }
  });
  $("revertReturns").addEventListener("click", () => {
    if (!confirm(t("ret.confirmRevert"))) return;
    returns = { ...saved };
    applyReturns();
  });
  /* ---------- 返品の受領 (オフィスに届いたら「受領完了」で Office 在庫へ) ---------- */
  const dlg = $("recvDlg");
  const itemByKey = () => {
    const m = new Map();
    data.items.forEach((it) => data.stores.forEach((_, i) => hasRet(i) && m.set(rkey(it, i), { it, i })));
    return m;
  };
  function recvGroups(map) {
    const by = itemByKey();
    const out = new Map(); // 店舗 → [{ k, it, q }]
    Object.entries(map).forEach(([k, q]) => {
      const hit = by.get(k);
      const store = k.slice(k.lastIndexOf("@") + 1);
      if (!out.has(store)) out.set(store, []);
      out.get(store).push({ k, it: hit ? hit.it : null, q });
    });
    const order = (s) => { const i = data.stores.indexOf(s); return i < 0 ? 99 : i; };
    return [...out.entries()].sort((a, b) => order(a[0]) - order(b[0]))
      .map(([store, rows]) => [store, rows.sort((a, b) => (a.it ? a.it._id : 1e9) - (b.it ? b.it._id : 1e9))]);
  }
  const itemLabel = (r) => (r.it ? `${shortModel(r.it.model)} / ${r.it.color} / ${r.it.size}` : r.k.slice(0, r.k.lastIndexOf("@")));
  // 手順 1: 店舗の一覧 → 手順 2: 選んだ店舗のモデルごとの明細 (チェックして「受領完了」)
  let recvStore = null;
  function renderRecv() {
    const pend = new Map(recvGroups(saved)), done = new Map(recvGroups(received));
    if (recvStore && !pend.has(recvStore) && !done.has(recvStore)) recvStore = null;
    const keep = new Set([...dlg.querySelectorAll(".recv-one:checked")].map((b) => b.dataset.k)); // 再描画してもチェックを残す
    const dirty = isDirty();
    $("recvWarn").hidden = !dirty;
    $("recvWarn").textContent = dirty ? t("recv.unsaved") : "";
    const cnt = (rows) => t("recv.count", { n: fmt(rows.length), q: fmt(sum(rows.map((r) => r.q))) });
    $("recvFoot").hidden = !recvStore;
    if (!recvStore) {
      const stores = [...new Set([...pend.keys(), ...done.keys()])].sort((a, b) => data.stores.indexOf(a) - data.stores.indexOf(b));
      $("recvBody").innerHTML = `<p class="recv-step">${esc(t("recv.step1"))}</p>` + (stores.length
        ? `<div class="recv-stores">${stores.map((st) => {
            const p = pend.get(st) || [], d = done.get(st) || [];
            return `<button type="button" class="recv-storebtn" data-store="${esc(st)}">
              <b>${esc(st)}</b>
              <span class="recv-pend">${p.length ? `${esc(t("recv.transitShort"))} ${esc(cnt(p))}` : esc(t("recv.allDone"))}</span>
              <span class="recv-doneinfo">${d.length ? `${esc(t("recv.doneShort"))} ${esc(cnt(d))}` : ""}</span>
              <span class="recv-go" aria-hidden="true">›</span>
            </button>`;
          }).join("")}</div>`
        : `<p class="recv-empty">${esc(t("recv.none"))}</p>`);
      return;
    }
    const p = pend.get(recvStore) || [], d = done.get(recvStore) || [];
    // モデルごとにまとめる (在庫表の並び順)
    const models = new Map();
    p.forEach((r) => {
      const m = r.it ? shortModel(r.it.model) : r.k.slice(0, r.k.lastIndexOf("@"));
      if (!models.has(m)) models.set(m, []);
      models.get(m).push(r);
    });
    $("recvBody").innerHTML = `
      <div class="recv-nav">
        <button type="button" class="link-btn" data-back>‹ ${esc(t("recv.back"))}</button>
        <b>${esc(recvStore)}</b>
        <span class="recv-count">${p.length ? `${esc(t("recv.transitShort"))} ${esc(cnt(p))}` : esc(t("recv.allDone"))}</span>
      </div>` +
      (p.length ? `
      <p class="recv-step">${esc(t("recv.step2"))}</p>
      <label class="recv-selall"><input type="checkbox" class="recv-all"> ${esc(t("af.selectAll"))}</label>
      ${[...models.entries()].map(([m, rows], mi) => `
        <div class="recv-model">
          <div class="recv-mhead">
            <label><input type="checkbox" class="recv-m" data-m="${mi}"> <b>${esc(m)}</b></label>
            <span class="recv-count">${esc(cnt(rows))}</span>
          </div>
          <table class="recv-tbl">
            <thead><tr><th></th><th>${esc(t("recv.colColor"))}</th><th>${esc(t("recv.colSize"))}</th><th>${esc(t("recv.colQty"))}</th></tr></thead>
            <tbody>${rows.map((r) => `
              <tr>
                <td><input type="checkbox" class="recv-one" id="rc-${esc(r.k)}" data-k="${esc(r.k)}" data-m="${mi}" ${keep.has(r.k) ? "checked" : ""}></td>
                <td><label for="rc-${esc(r.k)}">${esc(r.it ? r.it.color : "")}</label></td>
                <td class="c"><label for="rc-${esc(r.k)}">${esc(r.it ? r.it.size : "")}</label></td>
                <td class="n">${fmt(r.q)}</td>
              </tr>`).join("")}</tbody>
          </table>
        </div>`).join("")}` : `<p class="recv-empty">${esc(t("recv.storeNone"))}</p>`) +
      (d.length ? `
      <details class="recv-done">
        <summary>${esc(t("recv.done"))}: ${esc(cnt(d))}</summary>
        <ul>${d.map((r) => `<li><span>${esc(itemLabel(r))}</span><em>${fmt(r.q)}</em><button type="button" class="link-btn" data-undo="${esc(r.k)}">${esc(t("recv.undo"))}</button></li>`).join("")}</ul>
      </details>` : "");
    updateRecvSel();
  }
  function updateRecvSel() {
    const on = [...dlg.querySelectorAll(".recv-one:checked")];
    const q = sum(on.map((b) => saved[b.dataset.k] || 0));
    $("recvSel").textContent = on.length ? t("recv.sel", { n: fmt(on.length), q: fmt(q) }) : t("recv.selNone");
    $("recvDo").disabled = !on.length || recvBusy;
    $("recvDo").textContent = t("recv.do", { q: fmt(q) });
    const setBox = (box, boxes) => {
      const n = boxes.filter((b) => b.checked).length;
      box.checked = n > 0 && n === boxes.length;
      box.indeterminate = n > 0 && n < boxes.length;
    };
    dlg.querySelectorAll(".recv-m").forEach((m) => setBox(m, [...dlg.querySelectorAll(`.recv-one[data-m="${m.dataset.m}"]`)]));
    const all = dlg.querySelector(".recv-all");
    if (all) setBox(all, [...dlg.querySelectorAll(".recv-one")]);
  }
  async function moveReturns(receive, unreceive) {
    recvBusy = true;
    updateRecvSel();
    try {
      if (shared) await postReturns({ receive, unreceive });
      else {
        receive.forEach((k) => { if (saved[k]) { received[k] = (received[k] || 0) + saved[k]; delete saved[k]; delete returns[k]; } });
        unreceive.forEach((k) => { if (received[k]) { saved[k] = (saved[k] || 0) + received[k]; returns[k] = saved[k]; delete received[k]; } });
        saveLocal();
      }
      lastSaved = new Date();
      applyRemote();
    } catch (e) {
      console.error(e);
      alert(t("ret.saveFailShared"));
    } finally {
      recvBusy = false;
      renderRecv();
    }
  }
  $("receiveReturns").addEventListener("click", () => {
    recvStore = null;
    renderRecv();
    dlg.showModal();
  });
  dlg.addEventListener("change", (e) => {
    if (e.target.classList.contains("recv-all")) dlg.querySelectorAll(".recv-one").forEach((b) => (b.checked = e.target.checked));
    if (e.target.classList.contains("recv-m")) {
      dlg.querySelectorAll(`.recv-one[data-m="${e.target.dataset.m}"]`).forEach((b) => (b.checked = e.target.checked));
    }
    updateRecvSel();
  });
  dlg.addEventListener("click", (e) => {
    const storeBtn = e.target.closest(".recv-storebtn");
    if (storeBtn) { recvStore = storeBtn.dataset.store; renderRecv(); $("recvBody").scrollTop = 0; return; }
    if (e.target.closest("[data-back]")) { recvStore = null; renderRecv(); return; }
    const undo = e.target.closest("[data-undo]");
    if (undo && !recvBusy && confirm(t("recv.confirmUndo"))) moveReturns([], [undo.dataset.undo]);
  });
  $("recvDo").addEventListener("click", () => {
    const keys = [...dlg.querySelectorAll(".recv-one:checked")].map((b) => b.dataset.k);
    const q = sum(keys.map((k) => saved[k] || 0));
    if (keys.length && confirm(t("recv.confirm", { n: fmt(keys.length), q: fmt(q) }))) moveReturns(keys, []);
  });

  // Ctrl+S / ⌘+S でも保存
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      $("saveReturns").click();
    }
  });
  // 未保存のままページを閉じようとしたら確認
  window.addEventListener("beforeunload", (e) => {
    if (data && isDirty()) { e.preventDefault(); e.returnValue = ""; }
  });

  function render() {
    updateFilterUi();
    const rows = filtered();
    renderKpis(rows);
    renderCharts(rows);
    renderTable(rows);
    const filteredNow = rows.length !== data.items.length;
    $("detailNote").textContent = filteredNow
      ? t("detailNote", { n: fmt(data.items.length), m: fmt(rows.length) })
      : "";
    fitTable();
  }

  /* ---------- CSV ---------- */
  $("dlCsv").addEventListener("click", () => {
    const rows = filtered();
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const LBL = { qty: "Quantity", ret: "Return", rate: "Monthly avg sales", mos: "Months of stock" };
    const head = ["Code", "Model", "Color", "Size", ...groups.flatMap((g, i) => colKinds(i).map((k) => `${g} ${LBL[k]}`))];
    const body = rows.map((it) => {
      const q = rowQty(it), rt = rowRet(it);
      return [it.code, it.model, it.color, it.size, ...groups.flatMap((_, g) => colKinds(g).map((k) => {
        const r = rowRate(it, g), m = mos(q[g], r);
        return k === "qty" ? q[g] : k === "ret" ? rt[g] ?? "" : k === "rate" ? (r == null ? "" : +r.toFixed(1)) : (m == null ? "" : +m.toFixed(1));
      }))];
    });
    const csv = "﻿" + [head, ...body].map((r) => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `stock_${(data.asOfDate || "").replace(/\//g, "")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- Excel 出力 (Return 入力を反映、元の Excel と同じ書式) ---------- */
  let excelJsLoading = null;
  const loadExcelJs = () => excelJsLoading || (excelJsLoading = new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve(window.ExcelJS);
    const sc = document.createElement("script");
    sc.src = "vendor/exceljs.min.js";
    sc.onload = () => resolve(window.ExcelJS);
    sc.onerror = () => { excelJsLoading = null; reject(new Error("exceljs load failed")); };
    document.head.appendChild(sc);
  }));

  async function exportExcel() {
    const btn = $("dlXlsxOut");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t("xlsx.creating");
    try {
      const ExcelJS = await loadExcelJs();
      const items = filtered();
      const now = new Date();
      const stamp = now.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("VFF Shoes Stock", { views: [{ state: "frozen", ySplit: 4 }] });

      const NAVY = "FF1F4E78", GOLD = "FFBF8F00", RETFILL = "FFFFF2CC", TOTFILL = "FFD9E1F2", LINE = "FFD9D9D9";
      const NF = "#,##0;\\(#,##0\\);\\-";
      const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
      const white = { style: "thin", color: { argb: "FFFFFFFF" } };
      const headBorder = { top: white, left: white, bottom: white, right: white };

      // 列の並び: Code, Model, Color, Size, [拠点ごとに Quantity (+ Return)], Store Total, Company Total
      const layout = []; // { g, kind: "rate" | "qty" | "mos" | "ret" }
      groups.forEach((_, g) => colKinds(g).forEach((kind) => layout.push({ g, kind })));
      ws.columns = [
        { width: COL_W.code }, { width: COL_W.model }, { width: COL_W.color }, { width: COL_W.size },
        ...layout.map((c) => ({ width: c.kind === "qty" ? (!hasRet(c.g) && c.g >= data.stores.length ? 15.5 : COL_W.qty) : COL_W[c.kind] })),
      ];
      const lastCol = 4 + layout.length;

      ws.getCell(1, 1).value = data.title;
      ws.getCell(1, 1).font = { name: "Calibri", size: 14, bold: true };
      ws.getRow(1).height = 18.5;
      ws.getCell(2, 1).value = `${data.asOf}   —   Returns applied / exported ${stamp}`;

      // 見出し 3〜4 行目
      ["Code", "Model", "Color", "Size"].forEach((h, k) => {
        ws.mergeCells(3, k + 1, 4, k + 1);
        ws.getCell(3, k + 1).value = h;
      });
      let c = 5;
      const XLBL = { qty: "Quantity", ret: "Return", rate: t("col.rate"), mos: t("col.mos") };
      groups.forEach((g, gi) => {
        const kinds = colKinds(gi);
        if (!kinds.length) return;
        if (kinds.length > 1) ws.mergeCells(3, c, 3, c + kinds.length - 1);
        ws.getCell(3, c).value = g;
        kinds.forEach((k, j) => (ws.getCell(4, c + j).value = XLBL[k]));
        c += kinds.length;
      });
      for (let r = 3; r <= 4; r++) {
        ws.getRow(r).height = 20;
        for (let k = 1; k <= lastCol; k++) {
          const cell = ws.getCell(r, k);
          const kind = r === 4 && layout[k - 5] ? layout[k - 5].kind : null;
          cell.fill = fill(kind === "ret" ? GOLD : kind === "rate" || kind === "mos" ? "FF2F75B5" : NAVY);
          cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = headBorder;
        }
      }

      // 明細
      const bottom = { bottom: { style: "thin", color: { argb: LINE } } };
      items.forEach((it, n) => {
        const r = 5 + n;
        const q = rowQty(it), rt = rowRet(it);
        const vals = [it.code || null, it.model, it.color, it.size,
          ...layout.map((col) => {
            const rr = rowRate(it, col.g), m = mos(q[col.g], rr);
            return col.kind === "qty" ? q[col.g] : col.kind === "ret" ? rt[col.g] || null
              : col.kind === "rate" ? (rr == null ? null : +rr.toFixed(3)) : (m == null ? null : +m.toFixed(1));
          })];
        const row = ws.getRow(r);
        row.values = vals;
        vals.forEach((_, k) => {
          const cell = row.getCell(k + 1);
          const col = layout[k - 4];
          cell.border = bottom;
          cell.font = { name: "Calibri", size: 11 };
          if (k >= 3) cell.alignment = { horizontal: "center" };
          if (!col) return;
          cell.numFmt = col.kind === "rate" ? "0.0;(0.0);-" : col.kind === "mos" ? "0.0;(0.0);-" : NF;
          const isTotal = col.g >= data.stores.length;
          if (col.kind === "ret" && !isTotal) {
            cell.fill = fill(RETFILL);
            cell.font = { name: "Calibri", size: 11, color: { argb: "FF0000FF" } };
          }
          if (isTotal) cell.font = { name: "Calibri", size: 11, bold: true };
        });
      });

      // Total 行
      const tot = totalsOf(items);
      const tr = ws.getRow(5 + items.length);
      tr.values = ["Total", null, null, null, ...layout.map((col) => {
        const m = mos(tot.qty[col.g], tot.rate[col.g]);
        return col.kind === "qty" ? tot.qty[col.g] : col.kind === "ret" ? tot.ret[col.g]
          : col.kind === "rate" ? +(tot.rate[col.g] || 0).toFixed(3) : (m == null ? null : +m.toFixed(1));
      })];
      for (let k = 1; k <= lastCol; k++) {
        const cell = tr.getCell(k);
        const col = layout[k - 5];
        cell.fill = fill(TOTFILL);
        cell.font = { name: "Calibri", size: 11, bold: true };
        cell.border = { top: { style: "thin", color: { argb: LINE } } };
        if (k >= 4) {
          cell.alignment = { horizontal: "center" };
          cell.numFmt = col && col.kind === "rate" ? "0.0;(0.0);-" : col && col.kind === "mos" ? "0.0;(0.0);-" : NF;
        }
      }

      // 2 枚目: 入力された返品の一覧
      const rs = wb.addWorksheet("Returns");
      rs.columns = [
        { header: "Code", width: COL_W.code }, { header: "Model", width: COL_W.model },
        { header: "Color", width: COL_W.color }, { header: "Size", width: COL_W.size },
        { header: "Store", width: 24 }, { header: "Return", width: 10 }, { header: "Status", width: 16 },
      ];
      rs.getRow(1).eachCell((cell) => {
        cell.fill = fill(NAVY);
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center" };
      });
      data.items.forEach((it) => data.stores.forEach((s, i) => {
        const v = hasRet(i) ? returns[rkey(it, i)] : 0;
        if (v) rs.addRow([it.code || null, it.model, it.color, it.size, s, v, t("recv.transit")]);
        const rv = hasRet(i) ? received[rkey(it, i)] : 0;
        if (rv) rs.addRow([it.code || null, it.model, it.color, it.size, s, rv, t("recv.done")]);
      }));
      if (rs.rowCount === 1) rs.addRow([t("xlsx.noReturns")]);
      rs.views = [{ state: "frozen", ySplit: 1 }];

      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      a.download = `VFF_Stock_with_returns_${ymd}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      console.error(err);
      alert(t("xlsx.fail"));
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }
  $("dlXlsxOut").addEventListener("click", exportExcel);

  /* ---------- 月平均販売・在庫月数の表示切り替え ---------- */
  $("showRate").checked = showRate;
  $("showRate").addEventListener("change", (e) => {
    showRate = e.target.checked;
    try { localStorage.setItem("showRate", showRate ? "1" : "0"); } catch (_) {}
    renderFrame(data);
    render();
  });

  /* ---------- controls ---------- */
  const bind = (id, key, ev = "change") => $(id).addEventListener(ev, (e) => { state[key] = e.target.value; render(); });
  bind("q", "q", "input");
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
    Object.assign(state, { q: "", stock: "", sort: "" });
    colFilters.text = {};
    colFilters.num = {};
    if (locHidden.size) { locHidden.clear(); renderFrame(data); }
    ["q", "fStock", "fSort"].forEach((id) => ($(id).value = ""));
    render();
  });

  /* ---------- 言語 ---------- */
  function applyStaticTexts() {
    const d = data;
    $("asof").textContent = d.asOfDate ? t("asof", { d: d.asOfDate }) : d.asOf;
    const src = d.officeSource ? t("foot.src", { s: d.source, o: d.officeSource }) : d.source;
    $("foot").textContent = t("foot", { src }) + (d.allocSource ? " " + t("foot.alloc", { n: fmt(d.allocMoved) }) : "")
      + (d.eventSource ? " " + t("foot.event", { n: fmt(d.eventMoved) }) : "")
      + (d.eventStock ? " " + t("foot.eventStock", { c: d.eventStock.cutoff, s: fmt(d.eventStock.start), o: fmt(d.eventStock.sold), r: fmt(d.eventStock.remain) }) : "")
      + (d.salesRate ? " " + t("foot.rate", { p: Object.entries(d.salesRate.months).map(([s, v]) => `${s === "Office" ? "Office (Online)" : s} ${v[2]}`).join(" / ") }) : "")
      + (d.returnsSeed ? " " + t("foot.returnsSeed", { s: d.returnsSeed.source, n: fmt(Object.keys(d.returnsSeed.returns).length), q: fmt(sum(Object.values(d.returnsSeed.returns))) }) : "")
      + (d.generatedAt ? " " + t("foot.generated", { d: d.generatedAt }) : "");
    const an = $("allocNote");
    an.hidden = !d.allocSource;
    if (d.allocSource) an.textContent = t("alloc.note", { n: fmt(d.allocMoved) });
  }
  function fillSortOptions() {
    const sel = $("fSort");
    const cur = sel.value;
    [...sel.options].slice(1).forEach((o) => o.remove());
    const d = data;
    const totals = d.officeIndex != null ? [["store", "Store Total"], ["total", "Company Total"]] : [["total", "Total"]];
    const opts = [...d.stores.map((s, i) => [String(i), s]), ...totals];
    fillSelect(sel, opts.map((o) => o[0]), opts.map((o) => t("f.sortBy", { name: o[1] })));
    sel.value = cur;
  }
  window.I18N.onChange(() => {
    applyTheme();
    if (!data) return;
    applyStaticTexts();
    fillSortOptions();
    closePop();
    renderFrame(data);
    render();
    updateReturnInfo();
  });

  /* ---------- load ---------- */
  // 毎回かならず最新の在庫データを読む (ブラウザや配信側に古いデータが残っていても使わない)
  fetch(`stock.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      data = d;
      groups = d.officeIndex != null ? [...d.stores, "Store Total", "Company Total"] : [...d.stores, "Total"];
      RKEY = `returns:${d.asOfDate || d.source}`;
      return initReturns().then(() => d);
    })
    .then((d) => {
      d.items.forEach((it, n) => {
        it._id = n;
        it._search = `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase();
        recompute(it);
      });
      d._grand = sum(d.items.map((it) => it._tq));
      updateReturnInfo();
      applyStaticTexts();
      $("source").textContent = d.title;

      $("dlOffice").hidden = !d.officeSource;
      fillSortOptions();
      $("rateToggle").hidden = !d.salesRate;
      renderFrame(d);
      render();
      showView(view);
    })
    .catch((err) => {
      $("asof").textContent = t("loadFail");
      console.error(err);
    });
})();
