/* Zort の在庫 (api/zort) を読み込み、ダッシュボードの拠点に振り分ける。
   window.ZORT_CACHED = 前回読み込んだ Zort の在庫 (このブラウザに保存。なければ null)。すぐ表示するために使う
   window.ZORT        = Promise<最新の Zort の在庫 | null>
     どちらも { fetchedAt, locations: [ { name, kind, stock: { SKU: 数量 } } ], byLocation, names }
     kind: "office" | "store" | "event" | "other"  (store は Store Total に入る。other・event は Company Total のみ)
   Zort が未設定・失敗のときは null (stock.json の数のまま表示する)。 */
(() => {
  // Zort の倉庫名 → [ダッシュボードの拠点名, 種類]。名前の空白・記号を除き小文字で比べ、上から順に最初に一致したもの。
  // どれにも当てはまらない倉庫は、Zort の倉庫名のまま「other」の列として追加する。
  const MAP = [
    [/คลังสินค้าหลัก|^main|headoffice|^office$/, "Office", "office"],
    [/^online$/, "Office", "office"], // Online 倉庫の在庫は Office に合算する
    [/^kvillage/, "K Village", "store"],
    [/chidlom|^centralcl/, "Central CL (Department)", "store"],
    [/siam/, "Siam Discovery", "store"],
    [/paradise/, "Paradise Park", "store"],
    [/coollabo.*lp|^centrallp|ladprao|lardprao/, "Central LP", "store"],
    [/thaniya/, "Thaniya", "store"],
    [/pathwild/, "Pathwild", "store"],
    [/^event/, null, "event"], // Event 1 など (名前はそのまま)
  ];
  // アカウントごとに担当する拠点。そのアカウントがつながっている間は、ほかのアカウントの同じ拠点の倉庫は
  // 「拠点名 (アカウント名)」の別の列にする (例: BFT にもある K Village 倉庫 → "K Village (BFT)")。
  // 担当アカウントのそのほかの倉庫も「倉庫名 (アカウント名)」の別の列にする (例: EDV の The Mall → "The Mall (EDV)")。
  // 別の列は、VFF / Vivo の在庫が 1 足でもある (マイナスを含む) ときだけ出す。
  const ACCOUNT_ONLY = { EDV: ["K Village", "Central LP"] };

  const norm = (s) => String(s || "").toLowerCase().replace(/[\s._\-/()]/g, "");
  const classify = (name) => {
    const n = norm(name);
    const hit = MAP.find(([re]) => re.test(n));
    return hit ? { name: hit[1] || String(name).trim(), kind: hit[2] } : { name: String(name).trim(), kind: "other" };
  };

  function build(j) {
    if (!j || !j.configured || !j.stores) return null;
    const accounts = new Set(j.stores.map((s) => String(s.store).toUpperCase()));
    const owner = {}; // 拠点 → それを担当するアカウント
    Object.entries(ACCOUNT_ONLY).forEach(([acc, locs]) => { if (accounts.has(acc)) locs.forEach((l) => (owner[l] = acc)); });
    const locations = [];
    for (const st of j.stores) {
      const acc = String(st.store).toUpperCase();
      for (const wh of st.warehouses) {
        if (/^(รอ|ของเสีย|สินค้าตัวอย่าง)$/.test(String(wh.name).trim())) continue; // 仮の倉庫は使わない
        let c = classify(wh.name);
        const extra = (ACCOUNT_ONLY[acc] && !ACCOUNT_ONLY[acc].includes(c.name)) || (owner[c.name] && owner[c.name] !== acc);
        if (extra) {
          if (!Object.values(wh.stock).some((q) => q)) continue;
          c = { name: `${ACCOUNT_ONLY[acc] ? String(wh.name).trim() : c.name} (${st.store})`, kind: "other", extra: true };
        }
        let loc = locations.find((l) => l.name === c.name);
        if (!loc) locations.push((loc = { ...c, stock: {} }));
        for (const [sku, q] of Object.entries(wh.stock)) loc.stock[sku] = (loc.stock[sku] || 0) + q;
      }
    }
    // 拠点の並びは MAP の順 (アカウントが増えても列の順が変わらないように)
    const order = (l) => { const i = MAP.findIndex(([, name]) => name === l.name); return i < 0 ? 99 : i; };
    locations.sort((a, b) => order(a) - order(b));
    const byLocation = Object.fromEntries(locations.map((l) => [l.name, l.stock]));
    return { fetchedAt: j.fetchedAt, locations, byLocation, names: j.names || {} };
  }

  const KEY = "zortCache";
  let cached = null;
  try { cached = build(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (_) {}
  window.ZORT_CACHED = cached;

  // 時刻はどの端末でもタイ時間で出す (端末の時間帯設定で表示が変わらないように)
  window.ZORT_TIME = (iso) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
  };

  // 読み込みの状態 (画面の注意書き用): { ok, stale, fallback, at }
  //   ok=false: Zort (共有スナップショット) に接続できなかった。at = 表示中の数の時刻
  const status = { ok: true, stale: false, at: cached ? cached.fetchedAt : null };
  window.ZORT_STATUS = status;
  const notify = () => window.dispatchEvent(new CustomEvent("zort-status", { detail: status }));

  // サーバーに 1 つだけある共有スナップショットを読む。全員が同じ数・同じ時刻になる
  let current = cached;
  const load = (since) =>
    fetch(`api/zort${since ? `?since=${encodeURIComponent(since)}` : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.same) { Object.assign(status, { ok: true, stale: false, at: j.fetchedAt }); notify(); return null; }
        const z = build(j);
        if (z) {
          try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (_) {}
          current = z;
          Object.assign(status, { ok: true, stale: !!j.stale, at: z.fetchedAt });
        } else Object.assign(status, { ok: false, at: current ? current.fetchedAt : null });
        notify();
        return z;
      })
      .catch(() => { Object.assign(status, { ok: false, at: current ? current.fetchedAt : null }); notify(); return null; });
  window.ZORT = load().then((z) => z || null);

  // 1 分ごとに「共有スナップショットが新しくなったか」だけを確かめ (軽い)、新しくなったら読み込んで "zort-update" で知らせる。
  // スナップショットは 10 分ごとに Zort から読み直される。開いている全員の画面が 1 分以内に同じ数にそろう。
  const poll = () =>
    load(current && status.ok ? current.fetchedAt : null).then((z) => {
      if (z) window.dispatchEvent(new CustomEvent("zort-update", { detail: z }));
    });
  setInterval(() => { if (!document.hidden) poll(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { poll(); checkVersion(); } });
  window.addEventListener("online", poll);

  // 開きっぱなしのタブ (スマホなど) が古い版の画面のままにならないように、新しい版が出ていたら読み込み直す。
  // 入力中・未保存のときは読み込み直さず、画面に「新しい版があります」と出す。
  const myVer = (() => { const m = /[?&]v=(\d+)/.exec((document.currentScript && document.currentScript.src) || ""); return m ? m[1] : null; })();
  let lastCheck = 0;
  window.ZORT_NEW_VERSION = false;
  function checkVersion() {
    if (!myVer || Date.now() - lastCheck < 120000) return;
    lastCheck = Date.now();
    fetch(`./?vcheck=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((html) => {
        const m = /zort\.js\?v=(\d+)/.exec(html);
        if (!m || m[1] === myVer) return;
        if (!window.APP_CAN_RELOAD || window.APP_CAN_RELOAD()) { location.reload(); return; }
        window.ZORT_NEW_VERSION = true;
        notify();
      })
      .catch(() => {});
  }
  setInterval(() => { if (!document.hidden) checkVersion(); }, 600000);
})();
