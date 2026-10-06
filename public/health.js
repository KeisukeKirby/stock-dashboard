/* 筋トレ・健康管理ダッシュボード。計画・ルールはこのファイルに、記録はブラウザの localStorage に保存 */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  const mdLabel = (s) => { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}`; };

  /* ---------- テーマ (在庫ダッシュボードと同じ localStorage "theme") ---------- */
  const THEMES = ["auto", "light", "dark"];
  const THEME_LABEL = { auto: "自動", light: "ライト", dark: "ダーク" };
  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  const applyTheme = () => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    $("themeLabel").textContent = THEME_LABEL[theme];
  };
  applyTheme();
  $("themeToggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch (_) {}
    applyTheme();
    renderCharts();
  });

  /* ---------- レストタイムの区分 ---------- */
  const REST = {
    big: { name: "大筋群・高重量種目", ex: "ベンチ、スクワット、デッドリフト、懸垂など", range: "90〜120秒", sec: 90, why: "大きな筋肉をしっかり回復させて、高重量でもフォームを崩さない。筋力＆筋肥大の両方に最適" },
    mid: { name: "中重量・補助種目", ex: "ショルダープレス、ローイング、ランジ、ヒップスラストなど", range: "60〜90秒", sec: 75, why: "ある程度の回復を確保しつつ、代謝・パンプ感も狙う。バランス体型を作る補助に最適" },
    power: { name: "瞬発系・ジャンプ系", ex: "ジャンプスクワット、スプリント、ケトルベルスイングなど", range: "60〜90秒（全力なら90秒）", sec: 60, why: "疲労が残りすぎると動作が鈍るので、しっかり回復させつつスピード重視" },
    body: { name: "自重・体幹系", ex: "プランク、バーピー、腹筋ローラーなど", range: "30〜60秒", sec: 30, why: "心拍数を保ったまま継続して、体幹・持久力に効かせる" },
    circuit: { name: "サーキット・HIIT", ex: "種目間 15〜30秒、サイクル間 1〜2分", range: "15〜30秒 / 1〜2分", sec: 20, why: "心肺機能アップ・脂肪燃焼を狙うので、心拍数を落としすぎない" },
    cardio: { name: "有酸素", ex: "ランニング、バイク、スイム", range: "—", sec: 0, why: "ウエイトの後に行う" },
  };

  /* ---------- 週間プラン (曜日 0=日) ---------- */
  const PLAN = {
    1: { name: "上半身プッシュ（胸・肩・三頭筋）＋体幹", goal: "厚い胸・肩を作りつつ、体幹安定", ex: [
      { n: "ベンチプレス or ダンベルプレス", r: "8〜12回 × 4セット", c: "big", s: 90, g: "chest", note: "インクライン30度・デクライン・フラットを組み合わせる。上げ切らない" },
      { n: "ショルダープレス（バーベル or ダンベル）", r: "8〜12回 × 3セット", c: "mid", s: 75, g: "shoulders" },
      { n: "ディップス or プッシュアップ", r: "限界まで × 3セット", c: "body", s: 60, g: "chest" },
      { n: "サイドレイズ（肩）", r: "12〜15回 × 3セット", c: "mid", s: 60, g: "shoulders", note: "肩を動かさない・小指を上げない・地面と平行まで・肘は少し曲げたまま" },
      { n: "プランク", r: "60秒 × 3セット", c: "body", s: 30, g: "core" },
    ] },
    2: { name: "下半身（脚・お尻）＋ジャンプ系", goal: "パワフルな下半身＋爆発力", ex: [
      { n: "スクワット（バーベル or 自重）", r: "8〜12回 × 4セット", c: "big", s: 120, g: "legs", note: "足は肩幅くらい・太ももが地面と平行になるまで・下ろすとき腰を丸めない" },
      { n: "デッドリフト", r: "6〜10回 × 3セット", c: "big", s: 120, g: "legs" },
      { n: "ランジ or ブルガリアンスクワット", r: "10〜12回 × 3セット", c: "mid", s: 75, g: "legs" },
      { n: "ジャンプスクワット・ボックスジャンプ", r: "12回 × 3セット", c: "power", s: 60, g: "legs" },
      { n: "カーフレイズ", r: "15〜20回 × 3セット", c: "mid", s: 60, g: "legs" },
    ] },
    3: { name: "有酸素＋サーキット", goal: "脂肪燃焼＋格闘技的持久力", ex: [
      { n: "ランニング 5km（中強度） or インターバル走 400m × 6本", r: "", c: "cardio", s: 0, g: "cardio" },
      { n: "サーキット（30秒ずつ × 3セット）", r: "種目間 15〜30秒・サイクル間 1〜2分", c: "circuit", s: 60, g: "cardio", head: true },
      { n: "バーピー", r: "30秒", c: "circuit", s: 20, g: "cardio", sub: true },
      { n: "マウンテンクライマー", r: "30秒", c: "circuit", s: 20, g: "core", sub: true },
      { n: "ジャンプスクワット", r: "30秒", c: "circuit", s: 20, g: "legs", sub: true },
      { n: "腕立て伏せ", r: "30秒", c: "circuit", s: 20, g: "chest", sub: true },
    ] },
    4: { name: "上半身プル（背中・二頭筋）＋体幹", goal: "引きの強さ＋逆三角形の背中", ex: [
      { n: "懸垂", r: "限界まで × 4セット", c: "big", s: 120, g: "back", note: "できるだけ負荷を上げる（加重）" },
      { n: "バーベルロー or ダンベルロー", r: "8〜12回 × 3セット", c: "mid", s: 75, g: "back" },
      { n: "フェイスプル", r: "12〜15回 × 3セット", c: "mid", s: 60, g: "shoulders" },
      { n: "アームカール（ダンベル / バーベル）", r: "10〜12回 × 3セット", c: "mid", s: 60, g: "arms", note: "肘は動かさない。グリップを内・外・真ん中で変える" },
      { n: "腹筋ローラー", r: "10〜15回 × 3セット", c: "body", s: 45, g: "core" },
    ] },
    5: { name: "下半身（瞬発＋安定）", goal: "爆発力＋横の動きの安定性", ex: [
      { n: "フロントスクワット", r: "6〜8回 × 3セット", c: "big", s: 120, g: "legs" },
      { n: "ケトルベルスイング", r: "12〜15回 × 3セット", c: "power", s: 90, g: "legs" },
      { n: "レッグカール or ヒップスラスト", r: "10〜12回 × 3セット", c: "mid", s: 75, g: "legs" },
      { n: "サイドランジ", r: "10〜12回 × 3セット", c: "mid", s: 60, g: "legs" },
    ] },
    6: { name: "全身サーキット＋HIIT", goal: "全身の燃焼＋俊敏性", ex: [
      { n: "サーキット（3〜5セット・インターバル 1分）", r: "", c: "circuit", s: 60, g: "cardio", head: true },
      { n: "バーピー", r: "20回", c: "circuit", s: 20, g: "cardio", sub: true },
      { n: "懸垂", r: "10回", c: "circuit", s: 20, g: "back", sub: true },
      { n: "腕立て伏せ", r: "20回", c: "circuit", s: 20, g: "chest", sub: true },
      { n: "ジャンプスクワット", r: "20回", c: "circuit", s: 20, g: "legs", sub: true },
      { n: "HIIT：バイク or 100m ダッシュ × 8本", r: "", c: "power", s: 90, g: "cardio" },
    ] },
    0: { name: "休養 or アクティブリカバリー", goal: "回復日（ここで筋肉が仕上がる）", rest: true, ex: [
      { n: "ヨガ・ストレッチ", r: "30分", c: "cardio", s: 0, g: "recovery" },
      { n: "軽いジョグ or スイム", r: "", c: "cardio", s: 0, g: "recovery" },
      { n: "サウナ＋水風呂", r: "", c: "cardio", s: 0, g: "recovery", note: "筋肉痛・炎症があるところは温めず冷やす" },
    ] },
  };
  const GROUP = { chest: "胸", back: "背中", legs: "脚・お尻", shoulders: "肩", arms: "腕", core: "体幹", cardio: "有酸素", recovery: "回復", other: "その他" };
  const GROUP_ORDER = ["chest", "back", "legs", "shoulders", "arms", "core", "other"];
  const guessGroup = (name) => {
    const n = name.toLowerCase();
    if (/プランク|腹筋|クランチ|ローラー|マウンテン|体幹/.test(n)) return "core";
    if (/カール(?!.*レッグ)|二頭|三頭|トライセ|アーム/.test(n)) return /レッグカール/.test(n) ? "legs" : "arms";
    if (/ショルダー|サイドレイズ|フェイスプル|肩|リアレイズ|フロントレイズ/.test(n)) return "shoulders";
    if (/懸垂|ロー|プルダウン|プルアップ|チンニング|背中|ラット/.test(n)) return "back";
    if (/スクワット|デッド|ランジ|レッグ|ヒップ|カーフ|スイング|ジャンプ|脚/.test(n)) return "legs";
    if (/ベンチ|プレス|腕立て|プッシュ|ディップス|フライ|プルオーバー|胸/.test(n)) return "chest";
    return "other";
  };

  /* ---------- 基本エクササイズ ---------- */
  const FIVE = [
    { n: "ベンチプレス", tips: ["胸の基本種目。インクライン 30 度も組み合わせる", "上げ切らず、胸に負荷を残す"] },
    { n: "フロントプルダウン", tips: ["肩幅より一こぶし分広く握る", "胸を張って引く", "バーが顎より下まで引く"] },
    { n: "サイドレイズ", tips: ["肩を動かさない", "小指を上げない", "地面と平行になるまで上げる", "肘は少し曲げたまま", "座りでも立ちでも OK"] },
    { n: "スクワット", tips: ["足は肩幅くらい", "太ももが地面と平行になるまでしゃがむ", "下ろすとき腰を丸めない"] },
    { n: "ワンレッグ自重デッドリフト", tips: ["フォームを意識する", "バランスと裏もも・お尻"] },
    { n: "クランチ", tips: ["肩甲骨が浮くくらいまで", "手は後ろ", "息を吐きながら上げる、吸いながら戻す", "ボールクランチも"] },
  ];

  /* ---------- 健康部門: 毎日の習慣 ---------- */
  const HABITS = [
    { g: "食事", items: [
      { id: "dinner", n: "夕食を 19〜20 時までに終えた", d: "夜遅くの食事は避ける" },
      { id: "early", n: "カロリーの大部分を午前〜午後の早い時間に" },
      { id: "protein", n: "毎食タンパク質 30g 以上", d: "肉、魚、大豆、プロテインなど" },
      { id: "veg", n: "毎食、繊維質の野菜を中心に（葉物野菜は必ず）" },
      { id: "fish", n: "シーフード or EPA / DHA 500〜1000mg" },
      { id: "ferment", n: "発酵食品（納豆・キムチ・ヨーグルト）" },
      { id: "nuts", n: "ナッツ・豆・全粒穀物" },
      { id: "berry", n: "ベリー（週に何回か）" },
      { id: "nojunk", n: "ジャンク・スナック・加工食品・パン・白米を避けた" },
      { id: "nocarb", n: "夕食に急速に消化される炭水化物を取らなかった" },
      { id: "sametime", n: "毎日同じ時間に食事", d: "腹八分目" },
    ] },
    { g: "嗜好品・サプリ", items: [
      { id: "alcohol", n: "アルコールは 1 杯まで" },
      { id: "caffeine", n: "カフェインは午前〜午後の早い時間まで" },
      { id: "whey", n: "プロテインを飲んだ" },
      { id: "supp", n: "亜鉛・ビタミン D・E・マグネシウム", d: "テストステロンを増やす" },
    ] },
    { g: "生活・回復", items: [
      { id: "sleep", n: "睡眠 7 時間以上" },
      { id: "sun", n: "日光を浴びた" },
      { id: "nature", n: "自然との触れ合い" },
      { id: "social", n: "他者とのコミュニケーション・貢献" },
      { id: "digital", n: "夜はデジタルデバイス・人工照明を控えた" },
      { id: "care", n: "回復ケア（お風呂で温める・ストレッチ）", d: "筋肉痛・炎症は温めず冷やす" },
    ] },
  ];
  const HABIT_ALL = HABITS.flatMap((g) => g.items);

  /* ---------- ファイルの受け渡し (ダウンロードできない環境ではテキストを表示してコピー) ---------- */
  const NO_DL = !!window.HEALTH_NO_DOWNLOAD;
  const deliver = (text, filename, mime) => {
    if (!NO_DL) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
    }
    const showText = () => { $("dlName").textContent = filename; $("dlText").value = text; $("dlCopy").textContent = "コピー"; $("dlDlg").hidden = false; $("dlText").focus(); $("dlText").select(); };
    // claude.ai の Artifact: downloads 機能で保存 (閲覧者が確認してから保存)。使えない・断られた以外はテキスト表示に切り替える
    const use = window.claude && typeof window.claude.use === "function" ? window.claude.use("downloads") : Promise.resolve(null);
    Promise.resolve(use).then((dl) => {
      if (!dl) { showText(); return; }
      return dl.save({ filename, data: text }).then(() => showMsg(`${filename} を保存しました`), (e) => { if (!e || e.code !== "declined") showText(); });
    }).catch(showText);
  };
  $("dlClose").addEventListener("click", () => { $("dlDlg").hidden = true; });
  $("dlCopy").addEventListener("click", () => {
    const done = () => { $("dlCopy").textContent = "コピーしました"; };
    const fallback = () => { $("dlText").select(); try { document.execCommand("copy"); done(); } catch (_) {} };
    if (navigator.clipboard) navigator.clipboard.writeText($("dlText").value).then(done, fallback); else fallback();
  });
  let msgT;
  const showMsg = (text, err) => { const m = $("msg"); m.textContent = text; m.classList.toggle("err", !!err); m.hidden = false; clearTimeout(msgT); msgT = setTimeout(() => { m.hidden = true; }, 4000); };

  /* ---------- 保存 ---------- */
  const KEY = "health.v1";
  const blank = () => ({ ex: {}, habits: {}, body: [], sets: [], cycleStart: "", timerSec: 90 });
  let db = blank();
  try { db = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) {} };
  const exKey = (dow, i) => `${dow}-${i}`;
  const exDone = (date, dow, i) => !!(db.ex[date] && db.ex[date][exKey(dow, i)]);
  const setEx = (date, dow, i, v) => { db.ex[date] = db.ex[date] || {}; if (v) db.ex[date][exKey(dow, i)] = 1; else delete db.ex[date][exKey(dow, i)]; if (!Object.keys(db.ex[date]).length) delete db.ex[date]; save(); };
  const habitOn = (date, id) => !!(db.habits[date] && db.habits[date][id]);
  const setHabit = (date, id, v) => { db.habits[date] = db.habits[date] || {}; if (v) db.habits[date][id] = 1; else delete db.habits[date][id]; if (!Object.keys(db.habits[date]).length) delete db.habits[date]; save(); };
  const habitCount = (date) => Object.keys(db.habits[date] || {}).filter((id) => HABIT_ALL.some((h) => h.id === id)).length;
  // その日の種目のうち、サーキットの見出し行以外がすべてチェックされているか
  const dayStatus = (date) => {
    const dow = parse(date).getDay();
    const plan = PLAN[dow];
    const items = plan.ex.map((e, i) => ({ e, i })).filter((x) => !x.e.head);
    const done = items.filter((x) => exDone(date, dow, x.i)).length;
    return { total: items.length, done, full: done === items.length, rest: !!plan.rest };
  };

  /* ---------- タブ ---------- */
  const VIEWS = ["today", "train", "health", "log"];
  const showView = (v) => {
    if (!VIEWS.includes(v)) v = "today";
    VIEWS.forEach((x) => { $(`view-${x}`).hidden = x !== v; $(`tab-${x}`).setAttribute("aria-selected", x === v); $(`tab-${x}`).tabIndex = x === v ? 0 : -1; });
    if (location.hash !== `#${v}`) history.replaceState(null, "", `#${v}`);
    if (v === "log") renderCharts();
  };
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.goto)));
  addEventListener("hashchange", () => showView(location.hash.slice(1)));

  /* ---------- 今日 ---------- */
  let viewDow = new Date().getDay();
  const sel = $("daySelect");
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => { const o = document.createElement("option"); o.value = d; o.textContent = `${DOW[d]}曜${d === new Date().getDay() ? "（今日）" : ""}`; sel.appendChild(o); });
  sel.value = viewDow;
  sel.addEventListener("change", () => { viewDow = Number(sel.value); renderToday(); });

  const restBtn = (e) => (e.s > 0 ? `<span class="ex-rest"><button class="ghost small" type="button" data-rest="${e.s}" data-for="${esc(e.n)}">休憩 ${e.s}秒</button></span>` : `<span class="ex-rest"><span class="hint">${esc(REST[e.c].range === "—" ? "" : REST[e.c].range)}</span></span>`);

  function renderToday() {
    const d = new Date();
    const date = today();
    $("todayLabel").textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
    $("todayMenu").textContent = PLAN[d.getDay()].name;
    const plan = PLAN[viewDow];
    $("todayTitle").textContent = `${DOW[viewDow]}曜：${plan.name}`;
    $("todayGoal").textContent = plan.goal;
    const list = $("todayList");
    const items = plan.ex.map((e, i) => ({ e, i }));
    list.innerHTML = items.map(({ e, i }) => {
      if (e.head) return `<p class="ex-head">${esc(e.n)}${e.r ? ` — ${esc(e.r)}` : ""}</p>`;
      const on = exDone(date, viewDow, i);
      return `<label class="ex${on ? " done" : ""}${e.sub ? " sub" : ""}">
        <input type="checkbox" data-i="${i}" ${on ? "checked" : ""}>
        <span class="ex-main"><span class="ex-name">${esc(e.n)}</span>
          <span class="ex-meta">${e.r ? `<span>${esc(e.r)}</span>` : ""}<span class="cat">${esc(REST[e.c].name)}</span><span class="cat">${esc(GROUP[e.g] || "")}</span></span>
          ${e.note ? `<span class="ex-note">${esc(e.note)}</span>` : ""}</span>
        ${restBtn(e)}</label>`;
    }).join("");
    if (plan.rest) list.insertAdjacentHTML("afterbegin", `<p class="rest-day">今日は回復日。筋肉はここで仕上がります。軽く動かして血流を良くし、しっかり寝る。筋肉痛や炎症があるところは温めず冷やす。</p>`);
    const st = dayStatus(date);
    $("todayDone").textContent = viewDow === d.getDay() ? `${st.done} / ${st.total} 完了` : "";
    list.querySelectorAll("input[type=checkbox]").forEach((cb) => cb.addEventListener("change", () => {
      setEx(date, viewDow, Number(cb.dataset.i), cb.checked);
      cb.closest(".ex").classList.toggle("done", cb.checked);
      const s = dayStatus(date); $("todayDone").textContent = viewDow === d.getDay() ? `${s.done} / ${s.total} 完了` : "";
      renderKpis(); renderWeek();
    }));
    list.querySelectorAll("[data-rest]").forEach((b) => b.addEventListener("click", (ev) => {
      ev.preventDefault();
      startTimer(Number(b.dataset.rest), b.dataset.for);
    }));
    renderTodayHabits();
  }

  function renderTodayHabits() {
    const date = today();
    const el = $("todayHabits");
    el.innerHTML = HABIT_ALL.map((h) => `<label class="habit${habitOn(date, h.id) ? " on" : ""}"><input type="checkbox" data-id="${h.id}" ${habitOn(date, h.id) ? "checked" : ""}><span><span class="hn">${esc(h.n)}</span></span></label>`).join("");
    el.querySelectorAll("input").forEach((cb) => cb.addEventListener("change", () => {
      setHabit(date, cb.dataset.id, cb.checked);
      cb.closest(".habit").classList.toggle("on", cb.checked);
      renderKpis(); if ($("habitDate").value === date) renderHabits(); renderHeat();
    }));
  }

  /* ---------- KPI ---------- */
  const weekDates = (base) => { const d = parse(base); const off = (d.getDay() + 6) % 7; const mon = addDays(base, -off); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); };
  const dayHasAny = (date) => !!(db.ex[date] && Object.keys(db.ex[date]).length) || !!(db.habits[date] && Object.keys(db.habits[date]).length) || db.body.some((b) => b.date === date) || db.sets.some((s) => s.date === date);
  function renderKpis() {
    const t = today();
    const wk = weekDates(t).slice(0, 6);
    const full = wk.filter((d) => d <= t && dayStatus(d).full).length;
    const part = wk.filter((d) => d <= t && !dayStatus(d).full && dayStatus(d).done > 0).length;
    $("kWeek").textContent = full;
    $("kWeekNote").textContent = part ? `すべて完了した日。一部だけ実施 ${part} 日` : "月〜土の計画をすべて完了した日";
    const hc = habitCount(t);
    $("kHabit").textContent = hc;
    $("kHabitAll").textContent = ` / ${HABIT_ALL.length}`;
    let streak = 0; let d = dayHasAny(t) ? t : addDays(t, -1);
    while (dayHasAny(d) && streak < 3650) { streak++; d = addDays(d, -1); }
    $("kStreak").textContent = streak;
    const body = [...db.body].filter((b) => b.weight != null).sort((a, b) => a.date.localeCompare(b.date));
    const last = body[body.length - 1];
    if (last) {
      $("kWeight").textContent = last.weight.toFixed(1);
      const prev = body.length > 1 ? body[body.length - 2] : null;
      const first = body[0];
      let note = `${mdLabel(last.date)} 時点`;
      if (prev) { const diff = last.weight - prev.weight; note += `、前回比 ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg`; }
      if (first && first !== last) { const diff = last.weight - first.weight; note += `、開始から ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg`; }
      $("kWeightNote").textContent = note;
    } else { $("kWeight").textContent = "–"; $("kWeightNote").textContent = "記録タブで入力"; }
  }

  /* ---------- 休憩タイマー ---------- */
  let tSec = db.timerSec || 90, tEnd = 0, tTick = null, tFor = "";
  const fmtT = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const setPreset = (sec) => { tSec = sec; db.timerSec = sec; save(); document.querySelectorAll("#timerPresets button").forEach((b) => b.classList.toggle("on", Number(b.dataset.sec) === sec)); };
  const drawTimer = () => {
    const ring = $("timerRing");
    if (!tEnd) { $("timerTime").textContent = fmtT(tSec); $("timerSub").textContent = "待機中"; ring.style.setProperty("--p", 0); ring.className = "timer-ring"; document.title = "筋トレ・健康管理ダッシュボード"; return; }
    const remain = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000));
    $("timerTime").textContent = fmtT(remain);
    ring.style.setProperty("--p", ((tSec - remain) / tSec) * 100);
    document.title = `${fmtT(remain)} 休憩`;
    if (remain <= 0) { finishTimer(); }
  };
  const beep = () => {
    if (!$("timerSound").checked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22); });
    } catch (_) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };
  function startTimer(sec, label) {
    if (sec) setPreset(sec);
    tFor = label || "";
    $("timerFor").textContent = tFor ? `${tFor} の後` : "";
    tEnd = Date.now() + tSec * 1000;
    clearInterval(tTick); tTick = setInterval(drawTimer, 200);
    $("timerRing").className = "timer-ring running";
    $("timerSub").textContent = "休憩中";
    $("timerStart").textContent = "やり直す";
    drawTimer();
    if (location.hash !== "#today") showView("today");
    $("timerRing").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function finishTimer() {
    clearInterval(tTick); tTick = null; tEnd = 0;
    $("timerTime").textContent = "0:00"; $("timerSub").textContent = "次のセット！";
    $("timerRing").className = "timer-ring finished"; $("timerRing").style.setProperty("--p", 100);
    $("timerStart").textContent = "もう一度";
    document.title = "次のセット！";
    beep();
  }
  $("timerStart").addEventListener("click", () => startTimer(0, tFor));
  $("timerReset").addEventListener("click", () => { clearInterval(tTick); tTick = null; tEnd = 0; tFor = ""; $("timerFor").textContent = ""; $("timerStart").textContent = "スタート"; drawTimer(); });
  document.querySelectorAll("#timerPresets button").forEach((b) => b.addEventListener("click", () => { setPreset(Number(b.dataset.sec)); if (!tEnd) drawTimer(); }));
  setPreset(tSec); drawTimer();

  /* ---------- プログラムの周期 ---------- */
  $("cycleStart").value = db.cycleStart || "";
  const renderCycle = () => {
    const m = $("cycleMeter"), note = $("cycleNote");
    if (!db.cycleStart) { m.querySelector(".meter-fill").style.width = "0%"; m.classList.remove("over"); note.textContent = "開始日を入れると経過週数を表示します。3 か月くらいで体が変わります。"; return; }
    const days = Math.floor((parse(today()) - parse(db.cycleStart)) / 86400000);
    const weeks = Math.floor(days / 7);
    const pct = Math.min(100, (days / 91) * 100);
    m.querySelector(".meter-fill").style.width = `${pct}%`;
    m.classList.toggle("over", weeks >= 12);
    note.textContent = weeks >= 12 ? `${weeks} 週目。3 か月を超えました。種目を入れ替える時期です（2〜3 か月で変える）。`
      : weeks >= 8 ? `${weeks} 週目（${days} 日）。2 か月を超えました。そろそろ種目を変える準備を。`
      : `${weeks} 週目（${days} 日）。3 か月まであと ${Math.max(0, 91 - days)} 日。`;
  };
  $("cycleStart").addEventListener("change", () => { db.cycleStart = $("cycleStart").value; save(); renderCycle(); });
  renderCycle();

  /* ---------- 筋トレ部門 ---------- */
  function renderWeek() {
    const t = today(); const dow = new Date().getDay();
    const wk = weekDates(t);
    $("weekGrid").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const p = PLAN[d]; const date = wk[(d + 6) % 7];
      const st = dayStatus(date);
      const badge = d === dow ? `<span class="badge">今日</span>` : st.full && !st.rest ? `<span class="badge">完了</span>` : "";
      const main = p.ex.filter((e) => !e.sub && !e.head);
      const subs = p.ex.filter((e) => e.sub);
      const heads = p.ex.filter((e) => e.head);
      const li = (e) => `<li><b>${esc(e.n)}</b>${e.r ? esc(e.r) : ""}</li>`;
      const circuit = heads.length ? `<li><b>${esc(heads[0].n)}</b>${subs.map((e) => esc(e.n + (e.r ? ` ${e.r}` : ""))).join(" / ")}</li>` : "";
      return `<div class="day-card${d === dow ? " today" : ""}${p.rest ? " rest" : ""}">
        <p class="dow"><span>${DOW[d]}曜 <span class="hint">${mdLabel(date)}</span></span>${badge}</p>
        <p class="dname">${esc(p.name)}</p>
        <p class="dgoal">👉 ${esc(p.goal)}</p>
        <ul>${main.slice(0, 3).map(li).join("")}${d === 3 || d === 6 ? circuit : ""}${main.length > 3 ? `<details><summary>あと ${main.length - 3} 種目 ▾</summary><ul>${main.slice(3).map(li).join("")}</ul></details>` : ""}</ul>
      </div>`;
    }).join("");
  }
  $("restTable").innerHTML = ["big", "mid", "power", "body", "circuit"].map((k) => { const r = REST[k]; return `<div class="rest-row"><span class="rn">${esc(r.name)}</span><span class="rs">${esc(r.range)}</span><span class="rx">${esc(r.ex)}。${esc(r.why)}</span></div>`; }).join("");
  $("fiveGrid").innerHTML = FIVE.map((f, i) => `<div class="five"><p class="no">${i + 1}</p><p class="fn">${esc(f.n)}</p><ul>${f.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");

  /* ---------- 健康部門 ---------- */
  $("habitDate").value = today(); $("habitDate").max = today();
  $("habitDate").addEventListener("change", () => { if (!$("habitDate").value) $("habitDate").value = today(); renderHabits(); renderHeat(); });
  function renderHabits() {
    const date = $("habitDate").value || today();
    const el = $("habitGroups");
    el.innerHTML = HABITS.map((g) => {
      const on = g.items.filter((h) => habitOn(date, h.id)).length;
      return `<div class="habit-group"><h3><span>${esc(g.g)}</span><span class="count">${on} / ${g.items.length}</span></h3><div class="habit-list">${g.items.map((h) => `<label class="habit${habitOn(date, h.id) ? " on" : ""}"><input type="checkbox" data-id="${h.id}" ${habitOn(date, h.id) ? "checked" : ""}><span><span class="hn">${esc(h.n)}</span>${h.d ? `<span class="hd">${esc(h.d)}</span>` : ""}</span></label>`).join("")}</div></div>`;
    }).join("");
    $("habitDone").textContent = `${habitCount(date)} / ${HABIT_ALL.length}（${date === today() ? "今日" : mdLabel(date)}）`;
    el.querySelectorAll("input").forEach((cb) => cb.addEventListener("change", () => {
      setHabit(date, cb.dataset.id, cb.checked);
      renderHabits(); renderHeat(); renderKpis(); if (date === today()) renderTodayHabits();
    }));
  }
  function renderHeat() {
    const t = today(); const wk = weekDates(t);
    const weeks = [3, 2, 1, 0].map((n) => wk.map((d) => addDays(d, -7 * n)));
    const sel = $("habitDate").value;
    let html = `<span class="wk"></span>${[1, 2, 3, 4, 5, 6, 0].map((d) => `<span class="dh">${DOW[d]}</span>`).join("")}`;
    weeks.forEach((w) => {
      html += `<span class="wk">${mdLabel(w[0])}〜</span>`;
      w.forEach((date) => {
        const c = habitCount(date), r = c / HABIT_ALL.length;
        const lvl = c === 0 ? 0 : r >= 0.9 ? 4 : r >= 0.7 ? 3 : r >= 0.4 ? 2 : 1;
        const future = date > t; const st = dayStatus(date);
        const tr = !future && st.done > 0 && !st.rest ? `、トレ ${st.done}/${st.total}` : "";
        html += `<button type="button" class="cell${date === t ? " today" : ""}${future ? " future" : ""}${date === sel ? " sel" : ""}" data-l="${future ? 0 : lvl}" data-date="${date}" data-tip="${esc(`${mdLabel(date)}（${DOW[parse(date).getDay()]}）習慣 ${c}/${HABIT_ALL.length}${tr}`)}" ${future ? "disabled" : ""} aria-label="${esc(date)}"></button>`;
      });
    });
    $("heat").innerHTML = html;
    $("heat").querySelectorAll(".cell:not(.future)").forEach((b) => b.addEventListener("click", () => { $("habitDate").value = b.dataset.date; renderHabits(); renderHeat(); }));
  }

  /* ---------- ツールチップ ---------- */
  const tip = $("tip");
  const showTip = (x, y, html) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = `${Math.min(innerWidth - r.width - 8, Math.max(8, x + 12))}px`; tip.style.top = `${y - r.height - 12 < 8 ? y + 16 : y - r.height - 12}px`; };
  const hideTip = () => { tip.hidden = true; };
  document.addEventListener("mousemove", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTip(e.clientX, e.clientY, esc(el.dataset.tip)); else if (!tip.hidden && !e.target.closest(".line-chart")) hideTip(); });
  document.addEventListener("touchstart", (e) => { const el = e.target.closest("[data-tip]"); if (el) { const t = e.touches[0]; showTip(t.clientX, t.clientY, esc(el.dataset.tip)); setTimeout(hideTip, 1800); } }, { passive: true });

  /* ---------- 記録: 体 ---------- */
  $("bodyForm").date.value = today(); $("setForm").date.value = today();
  $("bodyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target; const date = f.date.value; if (!date) return;
    const num = (v) => (v === "" ? null : Number(v));
    const rec = { date, weight: num(f.weight.value), fat: num(f.fat.value), sleep: num(f.sleep.value) };
    if (rec.weight == null && rec.fat == null && rec.sleep == null) return;
    const i = db.body.findIndex((b) => b.date === date);
    if (i >= 0) db.body[i] = Object.assign({}, db.body[i], Object.fromEntries(Object.entries(rec).filter(([, v]) => v != null))); else db.body.push(rec);
    save(); f.weight.value = f.fat.value = f.sleep.value = "";
    renderKpis(); renderCharts(); renderLog();
  });
  /* ---------- 記録: トレーニング ---------- */
  let exFilter = "";
  $("setForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target; const name = f.ex.value.trim(); if (!name || !f.date.value) return;
    db.sets.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: f.date.value, ex: name, weight: f.weight.value === "" ? null : Number(f.weight.value), reps: Number(f.reps.value), sets: Number(f.sets.value) || 1 });
    save(); exFilter = name; f.weight.value = ""; f.reps.value = ""; f.sets.value = 1;
    renderKpis(); renderCharts(); renderLog();
  });
  const exNames = () => { const seen = new Map(); [...db.sets].sort((a, b) => b.date.localeCompare(a.date)).forEach((s) => { if (!seen.has(s.ex)) seen.set(s.ex, 1); }); return [...seen.keys()]; };
  const PLAN_NAMES = [...new Set(Object.values(PLAN).flatMap((p) => p.ex.filter((e) => !e.head).flatMap((e) => e.n.split(/ or |・/).map((s) => s.replace(/（.*?）|[:：].*$|\s*\d.*$/g, "").trim()).filter(Boolean))).concat(["ダンベルフライ", "インクラインダンベルプレス", "ダンベルプルオーバー", "バーベルカール", "インクラインダンベルカール", "フロントプルダウン", "ワンレッグ自重デッドリフト", "クランチ"]))];
  $("exSelect").addEventListener("change", () => { exFilter = $("exSelect").value; renderExChart(); });

  /* ---------- 折れ線グラフ (SVG) ---------- */
  function lineChart(el, pts, { cls, unit, goal, fmt = (v) => v, decimals = 1 }) {
    el.innerHTML = "";
    if (!pts.length) { el.innerHTML = `<div class="empty">まだ記録がありません</div>`; return; }
    const W = el.clientWidth || 600, H = el.clientHeight || 200, L = 40, R = 48, T = 12, B = 24;
    const xs = pts.map((p) => parse(p.date).getTime());
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 86400000 * 3; x1 += 86400000 * 3; }
    let ys = pts.map((p) => p.y); if (goal != null) ys = ys.concat(goal);
    let y0 = Math.min(...ys), y1 = Math.max(...ys); let span = y1 - y0; if (span < Math.max(1, Math.abs(y1) * 0.08)) span = Math.max(1, Math.abs(y1) * 0.08); y0 -= span * 0.3; y1 += span * 0.3; if (y0 < 0 && Math.min(...ys) >= 0) y0 = 0;
    let step = niceStep((y1 - y0) / 4); if (decimals === 0 && step < 1) step = 1; y0 = Math.floor(y0 / step) * step; y1 = Math.ceil(y1 / step) * step;
    const X = (t) => L + ((t - x0) / (x1 - x0)) * (W - L - R), Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g class="grid">`;
    for (let v = y0; v <= y1 + 1e-9; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="tick" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(Math.round(v * 100) / 100)}</text>`;
    s += `</g>`;
    const n = pts.length; const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L - R) / 56))));
    pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text class="tick" x="${X(parse(p.date).getTime())}" y="${H - 6}" text-anchor="middle">${mdLabel(p.date)}</text>`; });
    if (goal != null) s += `<line class="goal" x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}"></line>`;
    const path = pts.map((p, i) => `${i ? "L" : "M"}${X(parse(p.date).getTime())},${Y(p.y)}`).join(" ");
    if (n > 1) s += `<path class="ar ${cls}" stroke="none" d="${path} L${X(parse(pts[n - 1].date).getTime())},${Y(y0)} L${X(parse(pts[0].date).getTime())},${Y(y0)} Z"></path><path class="ln ${cls}" d="${path}"></path>`;
    s += `<line class="cross" id="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"></line>`;
    pts.forEach((p) => { s += `<circle class="dot ${cls}" cx="${X(parse(p.date).getTime())}" cy="${Y(p.y)}" r="4"></circle>`; });
    const last = pts[n - 1];
    s += `<text class="end-label" x="${X(parse(last.date).getTime()) + 8}" y="${Y(last.y) + 4}">${last.y.toFixed(decimals)}${unit}</text>`;
    pts.forEach((p, i) => { const x = X(parse(p.date).getTime()); const xl = i ? (x + X(parse(pts[i - 1].date).getTime())) / 2 : L; const xr = i < n - 1 ? (x + X(parse(pts[i + 1].date).getTime())) / 2 : W - R; s += `<rect class="hit" x="${xl}" y="${T}" width="${Math.max(1, xr - xl)}" height="${H - T - B}" data-i="${i}"></rect>`; });
    s += `</svg>`;
    el.innerHTML = s;
    const svg = el.querySelector("svg"), cross = el.querySelector("#cross");
    el.querySelectorAll(".hit").forEach((r) => {
      const p = pts[Number(r.dataset.i)]; const x = X(parse(p.date).getTime());
      const on = (ev) => { cross.style.display = ""; cross.setAttribute("x1", x); cross.setAttribute("x2", x); const t = ev.touches ? ev.touches[0] : ev; showTip(t.clientX, t.clientY, `${esc(p.date)}<br><b>${p.y.toFixed(decimals)}${unit}</b>${p.extra ? `<br>${esc(p.extra)}` : ""}`); };
      r.addEventListener("mousemove", on); r.addEventListener("touchstart", on, { passive: true });
    });
    svg.addEventListener("mouseleave", () => { cross.style.display = "none"; hideTip(); });
  }
  const niceStep = (raw) => { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };

  function renderCharts() {
    const body = [...db.body].sort((a, b) => a.date.localeCompare(b.date));
    const w = body.filter((b) => b.weight != null).map((b) => ({ date: b.date, y: b.weight, extra: b.fat != null ? `体脂肪率 ${b.fat}%` : "" }));
    lineChart($("weightChart"), w, { cls: "series-body", unit: " kg" });
    $("weightRange").textContent = w.length ? `${mdLabel(w[0].date)} 〜 ${mdLabel(w[w.length - 1].date)}（${w.length} 件）` : "";
    lineChart($("sleepChart"), body.filter((b) => b.sleep != null).map((b) => ({ date: b.date, y: b.sleep })), { cls: "series-sleep", unit: " h", goal: 7 });
    renderExChart(); renderVolume();
  }
  function renderExChart() {
    const names = exNames();
    const selEl = $("exSelect");
    if (!names.includes(exFilter)) exFilter = names[0] || "";
    selEl.innerHTML = names.map((n) => `<option value="${esc(n)}" ${n === exFilter ? "selected" : ""}>${esc(n)}</option>`).join("") || `<option value="">（記録なし）</option>`;
    $("exList").innerHTML = [...new Set(names.concat(PLAN_NAMES))].map((n) => `<option value="${esc(n)}">`).join("");
    const rows = db.sets.filter((s) => s.ex === exFilter);
    const weighted = rows.some((s) => s.weight != null && s.weight > 0);
    const byDate = {};
    rows.forEach((s) => { const v = weighted ? (s.weight || 0) : s.reps; const cur = byDate[s.date]; if (!cur || v > cur.y) byDate[s.date] = { date: s.date, y: v, extra: weighted ? `${s.weight} kg × ${s.reps} 回 × ${s.sets} セット` : `${s.reps} 回 × ${s.sets} セット` }; });
    const pts = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    lineChart($("exChart"), pts, { cls: "series-train", unit: weighted ? " kg" : " 回", decimals: weighted ? 1 : 0 });
    if (pts.length) {
      const best = pts.reduce((m, p) => (p.y > m.y ? p : m), pts[0]);
      const first = pts[0], last = pts[pts.length - 1];
      const diff = last.y - first.y;
      $("exNote").textContent = `${exFilter}：最高 ${best.y}${weighted ? " kg" : " 回"}（${mdLabel(best.date)}）。${pts.length > 1 ? `最初の記録から ${diff >= 0 ? "+" : ""}${Math.round(diff * 10) / 10}${weighted ? " kg" : " 回"}。` : ""}${diff > 0 ? "重量が伸びていれば筋肉痛がなくても効いています。" : pts.length > 3 && diff <= 0 ? "伸びが止まったら種目を変える・セット数を少し増やす。" : ""}`;
    } else $("exNote").textContent = weighted ? "" : "自重種目は回数を記録してください。";
  }
  function renderVolume() {
    const el = $("volChart"); const t = today();
    const wk = weekDates(t); const weeks = [7, 6, 5, 4, 3, 2, 1, 0].map((n) => addDays(wk[0], -7 * n));
    const data = weeks.map((mon) => { const sun = addDays(mon, 6); const g = {}; db.sets.filter((s) => s.date >= mon && s.date <= sun).forEach((s) => { const k = guessGroup(s.ex); g[k] = (g[k] || 0) + (s.sets || 1); }); return { mon, g, total: Object.values(g).reduce((a, b) => a + b, 0) }; });
    const max = Math.max(20, ...data.map((d) => d.total)); const step = niceStep(max / 4); const top = Math.ceil(max / step) * step;
    let html = "";
    for (let v = 0; v <= top; v += step) html += `<div class="grid${v === 0 ? " base" : ""}" style="bottom:${22 + (v / top) * (el.clientHeight - 22 || 178)}px"><span>${v}</span></div>`;
    html += `<div class="grid goal" style="bottom:${22 + (10 / top) * (el.clientHeight - 22 || 178)}px"><span>10</span></div>`;
    html += `<div class="cols">${data.map((d) => `<div class="col" data-tip="${esc(`${mdLabel(d.mon)}〜の週：${d.total} セット${GROUP_ORDER.filter((k) => d.g[k]).map((k) => ` / ${GROUP[k]} ${d.g[k]}`).join("")}`)}"><span class="vtot">${d.total || ""}</span>${GROUP_ORDER.filter((k) => d.g[k]).reverse().map((k, i, arr) => `<span class="seg-b${i === 0 ? " cap" : ""}" data-g="${k}" style="height:${(d.g[k] / top) * 100}%"></span>`).join("")}<span class="xl">${mdLabel(d.mon)}</span></div>`).join("")}</div>`;
    el.innerHTML = html;
    let lg = el.nextElementSibling; if (!lg || !lg.classList.contains("vol-legend")) { lg = document.createElement("div"); lg.className = "vol-legend"; el.after(lg); }
    const used = GROUP_ORDER.filter((k) => data.some((d) => d.g[k]));
    lg.innerHTML = used.length ? used.map((k) => `<span><i style="background:${{ chest: "#2a78d6", back: "#eb6834", legs: "#1baf7a", shoulders: "#eda100", arms: "#e87ba4", core: "#4a3aa7", other: "#8a8c8f" }[k]}"></i>${GROUP[k]}</span>`).join("") : `<span class="hint">トレーニング記録を入れると部位ごとに積み上がります（種目名から部位を判定）</span>`;
  }

  /* ---------- 記録の一覧 ---------- */
  function renderLog() {
    const rows = [
      ...db.body.map((b) => ({ date: b.date, kind: "体", desc: [b.weight != null ? `体重 ${b.weight} kg` : "", b.fat != null ? `体脂肪 ${b.fat}%` : "", b.sleep != null ? `睡眠 ${b.sleep} h` : ""].filter(Boolean).join("・"), w: "", reps: "", sets: "", del: () => { db.body = db.body.filter((x) => x !== b); } })),
      ...db.sets.map((s) => ({ date: s.date, kind: "筋トレ", desc: s.ex, w: s.weight != null ? s.weight : "", reps: s.reps, sets: s.sets, del: () => { db.sets = db.sets.filter((x) => x !== s); } })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    $("logCount").textContent = `${rows.length} 件`;
    $("logBody").innerHTML = rows.length ? rows.map((r, i) => `<tr><td>${esc(r.date)}</td><td class="kind">${r.kind}</td><td>${esc(r.desc)}</td><td class="num">${r.w}</td><td class="num">${r.reps}</td><td class="num">${r.sets}</td><td><button class="del" type="button" data-i="${i}" title="削除">×</button></td></tr>`).join("") : `<tr><td colspan="7" class="empty-note">まだ記録がありません</td></tr>`;
    $("logBody").querySelectorAll(".del").forEach((b) => b.addEventListener("click", () => {
      if (!b.classList.contains("arm")) { b.classList.add("arm"); b.textContent = "削除する"; setTimeout(() => { b.classList.remove("arm"); b.textContent = "×"; }, 3000); return; }
      rows[Number(b.dataset.i)].del(); save(); renderKpis(); renderCharts(); renderLog();
    }));
  }
  $("dlCsv").addEventListener("click", () => {
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["date", "kind", "item", "weight_kg", "reps", "sets", "fat_pct", "sleep_h"].join(",")];
    db.body.forEach((b) => lines.push([b.date, "body", "", b.weight ?? "", "", "", b.fat ?? "", b.sleep ?? ""].map(q).join(",")));
    db.sets.forEach((s) => lines.push([s.date, "training", s.ex, s.weight ?? "", s.reps, s.sets, "", ""].map(q).join(",")));
    deliver("\ufeff" + lines.join("\r\n"), `health_log_${today()}.csv`, "text/csv");
  });

  /* ---------- 書き出し・読み込み ---------- */
  $("exportBtn").addEventListener("click", () => {
    deliver(JSON.stringify(db, null, 1), `health_${today()}.json`, "application/json");
  });
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", () => {
    const f = $("importFile").files[0]; if (!f) return;
    f.text().then((txt) => {
      const d = JSON.parse(txt);
      if (!d || typeof d !== "object" || !("ex" in d || "habits" in d || "body" in d || "sets" in d)) throw new Error("bad");
      Object.assign(db.ex, d.ex || {}); Object.assign(db.habits, d.habits || {});
      (d.body || []).forEach((b) => { const i = db.body.findIndex((x) => x.date === b.date); if (i >= 0) db.body[i] = b; else db.body.push(b); });
      const ids = new Set(db.sets.map((s) => s.id)); (d.sets || []).forEach((s) => { if (!ids.has(s.id)) db.sets.push(s); });
      if (d.cycleStart) { db.cycleStart = d.cycleStart; $("cycleStart").value = d.cycleStart; }
      save(); renderAll(); showMsg("読み込みました（同じ日の記録は読み込んだ方で上書き）");
    }).catch(() => showMsg("読み込めませんでした。このダッシュボードで書き出した JSON ファイルを選んでください。", true)).finally(() => { $("importFile").value = ""; });
  });

  /* ---------- 起動 ---------- */
  function renderAll() { renderToday(); renderKpis(); renderWeek(); renderHabits(); renderHeat(); renderCycle(); renderLog(); renderCharts(); }
  renderAll();
  showView(location.hash.slice(1) || "today");
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderCharts, 150); });
  // 日付が変わったら今日の表示を更新 (開きっぱなしのとき)
  let curDay = today(); setInterval(() => { if (today() !== curDay) { curDay = today(); $("habitDate").value = curDay; $("habitDate").max = curDay; $("bodyForm").date.value = $("setForm").date.value = curDay; renderAll(); } }, 60000);
})();
