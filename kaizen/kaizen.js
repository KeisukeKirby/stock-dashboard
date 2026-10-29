/* 業務改善マニュアル — 本文の読み込み・描画・編集・保存・PDF 化・言語切り替え
 *
 *   言語:     右上の 日本語 / English / ไทย。URL の ?lang=ja|en|th でも指定でき、選んだ言語はブラウザに記憶
 *             言語ごとに別の本文（kaizen.md / kaizen.en.md / kaizen.th.md、共有保存も言語ごと）
 *   読み込み: /api/kaizen?lang=..（Upstash Redis に共有保存）→ なければリポジトリの初期本文
 *   編集:     右上「編集」→ 左にテキスト、右にプレビュー。「保存して共有」で全員に共有（いま表示中の言語だけ）
 *   PDF:      右上「PDF にする」→ ブラウザの印刷（A4 縦）で「PDF に保存」
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var doc = $('doc');
  var params = new URLSearchParams(location.search);
  var LANGS = ['ja', 'en', 'th'];
  var SEED = { ja: 'kaizen.md', en: 'kaizen.en.md', th: 'kaizen.th.md' };
  var LOCALE = { ja: 'ja-JP', en: 'en-GB', th: 'th-TH' };

  /* ======================= 画面の文言 ======================= */
  var I18N = {
    ja: {
      docTitle: '業務改善マニュアル', toc: '目次', tocChapter: function (n) { return '第' + n + '章'; },
      chapter: function (n) { return '第 ' + n + ' 章'; }, appendix: '付録', history: '改訂履歴',
      historyHead: ['版', '日付', '内容'], confidential: '社内資料・取り扱い注意',
      labels: ['従来のプロセス', '問題点', '今後のプロセス', '確認のしかた'],
      edit: '編集', backToView: '閲覧に戻る', pdf: 'PDF にする', save: '保存して共有', help: '書き方',
      saveHistory: '保存履歴', download: '.md を保存', upload: '.md を開く', loading: '読み込み中…',
      hint: 'PDF：印刷画面で「送信先：PDF に保存」「用紙：A4」「背景のグラフィック：オン」を選びます。',
      sharedAt: function (d) { return '共有保存　最終更新 ' + d; },
      sharedNone: '共有保存（まだ保存されていません・初期本文を表示中）',
      localOnly: '共有保存が未設定です（保存はこのブラウザにのみ残ります）',
      langNote: '※ 言語ごとに別の本文です。この言語だけが保存されます。',
      draftFound: '保存していない下書きがこのブラウザに残っています。下書きを開きますか？\n（「キャンセル」で最新の保存内容を開きます）',
      discard: '保存していない変更があります。編集をやめますか？（下書きはこのブラウザに残ります）',
      saving: '保存中…', savedLocal: 'このブラウザに保存しました（共有保存は未設定）',
      saveCancelled: '保存を中止しました', conflictMsg: '他の人が先に保存しています。',
      conflict: '他の人が先に保存しています。\n「OK」＝自分の内容で上書き保存する\n「キャンセル」＝保存をやめる（.md をダウンロードして控えを取ってから、ページを再読み込みしてください）',
      saveFailed: function (e) { return '保存できませんでした: ' + e; },
      saved: function (d) { return '保存しました　' + d; },
      askKey: 'この文書の保存には編集キーが必要です。編集キーを入力してください。',
      fileLoaded: 'ファイルを読み込みました（まだ保存されていません）',
      noHistoryLocal: '共有保存が未設定のため、履歴はありません。', noHistory: '保存の履歴はまだありません。',
      historyPrompt: '保存の履歴（新しい順）。番号を入力すると、その内容を編集画面に読み込みます（保存するまで共有内容は変わりません）。',
      revLoaded: function (d) { return d + ' の内容を読み込みました（まだ保存されていません）'; },
      loadFailed: '読み込めませんでした。', historyFailed: function (e) { return '履歴を取得できませんでした: ' + e; },
      chars: '文字', switchDiscard: '保存していない変更があります。言語を切り替えますか？（下書きはこのブラウザに残ります）'
    },
    en: {
      docTitle: 'Process Improvement Manual', toc: 'Contents', tocChapter: function (n) { return 'Ch. ' + n; },
      chapter: function (n) { return 'Chapter ' + n; }, appendix: 'Appendix', history: 'Revision history',
      historyHead: ['Version', 'Date', 'Changes'], confidential: 'Internal use only',
      labels: ['Previous process', 'Problem', 'New process', 'How to check'],
      edit: 'Edit', backToView: 'Back to view', pdf: 'Save as PDF', save: 'Save & share', help: 'How to write',
      saveHistory: 'Save history', download: 'Download .md', upload: 'Open .md', loading: 'Loading…',
      hint: 'To make a PDF: in the print window choose “Save as PDF”, paper size “A4”, and turn on “Background graphics”.',
      sharedAt: function (d) { return 'Shared · last updated ' + d; },
      sharedNone: 'Shared (not saved yet — showing the original text)',
      localOnly: 'Shared saving is not set up (changes stay in this browser only)',
      langNote: 'Each language has its own text. Only this language is saved.',
      draftFound: 'An unsaved draft was found in this browser. Open the draft?\n(Choose “Cancel” to open the latest saved version.)',
      discard: 'You have unsaved changes. Stop editing? (Your draft stays in this browser.)',
      saving: 'Saving…', savedLocal: 'Saved in this browser (shared saving is not set up)',
      saveCancelled: 'Save cancelled', conflictMsg: 'Someone else saved first.',
      conflict: 'Someone else saved first.\n“OK” = overwrite with your version\n“Cancel” = don’t save (download your .md as a backup, then reload the page)',
      saveFailed: function (e) { return 'Could not save: ' + e; },
      saved: function (d) { return 'Saved ' + d; },
      askKey: 'An edit key is needed to save this document. Please enter the edit key.',
      fileLoaded: 'File loaded (not saved yet)',
      noHistoryLocal: 'Shared saving is not set up, so there is no history.', noHistory: 'There is no save history yet.',
      historyPrompt: 'Save history (newest first). Enter a number to load that version into the editor (the shared text does not change until you save).',
      revLoaded: function (d) { return 'Loaded the version from ' + d + ' (not saved yet)'; },
      loadFailed: 'Could not load it.', historyFailed: function (e) { return 'Could not get the history: ' + e; },
      chars: 'characters', switchDiscard: 'You have unsaved changes. Switch language anyway? (Your draft stays in this browser.)'
    },
    th: {
      docTitle: 'คู่มือปรับปรุงการทำงาน', toc: 'สารบัญ', tocChapter: function (n) { return 'บทที่ ' + n; },
      chapter: function (n) { return 'บทที่ ' + n; }, appendix: 'ภาคผนวก', history: 'ประวัติการแก้ไข',
      historyHead: ['ฉบับ', 'วันที่', 'รายละเอียด'], confidential: 'เอกสารใช้ภายในบริษัท',
      labels: ['กระบวนการเดิม', 'ปัญหา', 'กระบวนการใหม่', 'วิธีตรวจสอบ'],
      edit: 'แก้ไข', backToView: 'กลับไปหน้าอ่าน', pdf: 'บันทึกเป็น PDF', save: 'บันทึกและแชร์', help: 'วิธีเขียน',
      saveHistory: 'ประวัติการบันทึก', download: 'ดาวน์โหลด .md', upload: 'เปิดไฟล์ .md', loading: 'กำลังโหลด…',
      hint: 'วิธีทำ PDF: ในหน้าต่างพิมพ์ ให้เลือก “บันทึกเป็น PDF” ขนาดกระดาษ “A4” และเปิด “กราฟิกพื้นหลัง”',
      sharedAt: function (d) { return 'บันทึกร่วมกัน · อัปเดตล่าสุด ' + d; },
      sharedNone: 'บันทึกร่วมกัน (ยังไม่มีการบันทึก — แสดงเนื้อหาตั้งต้น)',
      localOnly: 'ยังไม่ได้ตั้งค่าการบันทึกร่วมกัน (การแก้ไขจะเก็บไว้ในเบราว์เซอร์นี้เท่านั้น)',
      langNote: 'แต่ละภาษามีเนื้อหาแยกกัน จะบันทึกเฉพาะภาษานี้',
      draftFound: 'พบฉบับร่างที่ยังไม่ได้บันทึกในเบราว์เซอร์นี้ ต้องการเปิดฉบับร่างหรือไม่\n(เลือก “ยกเลิก” เพื่อเปิดฉบับที่บันทึกล่าสุด)',
      discard: 'มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการเลิกแก้ไขหรือไม่ (ฉบับร่างยังเก็บไว้ในเบราว์เซอร์นี้)',
      saving: 'กำลังบันทึก…', savedLocal: 'บันทึกไว้ในเบราว์เซอร์นี้แล้ว (ยังไม่ได้ตั้งค่าการบันทึกร่วมกัน)',
      saveCancelled: 'ยกเลิกการบันทึกแล้ว', conflictMsg: 'มีคนอื่นบันทึกไปก่อนแล้ว',
      conflict: 'มีคนอื่นบันทึกไปก่อนแล้ว\n“ตกลง” = บันทึกทับด้วยเนื้อหาของคุณ\n“ยกเลิก” = ไม่บันทึก (ดาวน์โหลด .md เก็บไว้ก่อน แล้วโหลดหน้าใหม่)',
      saveFailed: function (e) { return 'บันทึกไม่สำเร็จ: ' + e; },
      saved: function (d) { return 'บันทึกแล้ว ' + d; },
      askKey: 'ต้องใช้รหัสแก้ไขเพื่อบันทึกเอกสารนี้ กรุณาใส่รหัสแก้ไข',
      fileLoaded: 'โหลดไฟล์แล้ว (ยังไม่ได้บันทึก)',
      noHistoryLocal: 'ยังไม่ได้ตั้งค่าการบันทึกร่วมกัน จึงไม่มีประวัติ', noHistory: 'ยังไม่มีประวัติการบันทึก',
      historyPrompt: 'ประวัติการบันทึก (ล่าสุดอยู่บน) ใส่หมายเลขเพื่อโหลดฉบับนั้นเข้าหน้าแก้ไข (เนื้อหาที่แชร์จะยังไม่เปลี่ยนจนกว่าจะบันทึก)',
      revLoaded: function (d) { return 'โหลดฉบับวันที่ ' + d + ' แล้ว (ยังไม่ได้บันทึก)'; },
      loadFailed: 'โหลดไม่สำเร็จ', historyFailed: function (e) { return 'ดึงประวัติไม่สำเร็จ: ' + e; },
      chars: 'ตัวอักษร', switchDiscard: 'มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการเปลี่ยนภาษาหรือไม่ (ฉบับร่างยังเก็บไว้ในเบราว์เซอร์นี้)'
    }
  };

  var lang = pickLang();
  var T = I18N[lang];
  var state = { text: '', updatedAt: null, shared: false, locked: false, editing: false, dirty: false };

  function pickLang() {
    var q = params.get('lang');
    if (LANGS.indexOf(q) >= 0) return q;
    var saved = safeGet('kaizen.lang');
    if (LANGS.indexOf(saved) >= 0) return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (/^th/i.test(nav)) return 'th';
    if (/^en/i.test(nav)) return 'en';
    return 'ja';
  }
  function lsKey(base) { return lang === 'ja' ? base : base + '.' + lang; } // ja は従来のキーのまま
  var LS_KEY = 'kaizen.editKey';

  /* ======================= 言語切り替え ======================= */
  function applyUi() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = T[el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.textContent = v;
    });
    $('editBtn').textContent = state.editing ? T.backToView : T.edit;
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('.help-body').forEach(function (el) { el.hidden = el.getAttribute('data-lang') !== lang; });
  }

  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { switchLang(b.getAttribute('data-lang')); });
  });

  function switchLang(next) {
    if (next === lang || LANGS.indexOf(next) < 0) return;
    if (state.editing && state.dirty && !confirm(T.switchDiscard)) return;
    var wasEditing = state.editing;
    if (state.editing) { state.editing = false; state.dirty = false; document.body.classList.remove('is-editing'); }
    lang = next; T = I18N[lang];
    safeSet('kaizen.lang', lang);
    var u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    state = { text: '', updatedAt: null, shared: false, locked: false, editing: false, dirty: false };
    doc.innerHTML = '<p class="loading">' + esc(T.loading) + '</p>';
    applyUi();
    load().then(function () { showDoc(); if (wasEditing) openEditor(); });
  }

  /* ======================= 読み込み ======================= */
  applyUi();
  load().then(function () {
    showDoc();
    if (params.get('edit') === '1') openEditor();
    if (params.get('print') === '1') {
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () { window.print(); }, 300);
      });
    }
  });

  function load() {
    var want = lang;
    return fetch('api/kaizen?lang=' + want, { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (want !== lang) return;
        if (res.ok && res.j.shared) {
          state.shared = true; state.locked = !!res.j.locked;
          state.updatedAt = res.j.updatedAt || null;
          if (res.j.text) { state.text = res.j.text; return; }
        }
        return loadSeed();
      })
      .catch(loadSeed);
  }

  function loadSeed() {
    var local = safeGet(lsKey('kaizen.localText'));
    if (!state.shared && local) { state.text = local; return Promise.resolve(); }
    return fetch(SEED[lang] + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { state.text = t || window.KaizenMD.TEMPLATE; })
      .catch(function () { state.text = window.KaizenMD.TEMPLATE; });
  }

  // 他の人の保存を取り込む（閲覧中・画面に戻ったとき）
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || state.editing || !state.shared) return;
    fetch('api/kaizen?lang=' + lang, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.shared && j.text && j.updatedAt && j.updatedAt !== state.updatedAt) {
        state.text = j.text; state.updatedAt = j.updatedAt; showDoc();
      }
    }).catch(function () {});
  });

  /* ======================= 描画 ======================= */
  function showDoc() {
    var data = window.KaizenMD.parse(state.text);
    doc.innerHTML = renderDoc(data);
    doc.setAttribute('aria-busy', 'false');
    doc.dataset.ready = '1';
    var title = data.title || T.docTitle;
    document.title = title;
    $('tbTitle').textContent = title;
    $('tbVersion').textContent = data.version ? 'v' + data.version : '';
    setFooter(title + (data.version ? '　v' + data.version : ''));
    updateStatus();
  }

  function updateStatus() {
    var el = $('tbStatus');
    if (!el) return;
    if (state.shared) {
      el.textContent = state.updatedAt ? T.sharedAt(fmtDate(state.updatedAt)) : T.sharedNone;
      el.className = 'toolbar-status is-shared';
    } else {
      el.textContent = T.localOnly;
      el.className = 'toolbar-status is-local';
    }
  }

  function renderDoc(data) {
    var numbered = data.chapters.filter(function (c) { return !c.appendix; });
    var html = renderCover(data) + renderToc(data, numbered);
    data.chapters.forEach(function (ch) {
      html += renderChapter(ch, ch.appendix ? null : numbered.indexOf(ch) + 1);
    });
    html += renderHistory(data);
    html += '<p class="doc-end">' + esc(data.company || '') + '　' + esc(data.title || '') + (data.version ? '　v' + esc(data.version) : '') + '　' + esc(fmtDay(data.date)) + '</p>';
    return html;
  }

  function renderCover(d) {
    return '<section class="cover" id="top">' +
      '<div class="cover-top"><span>' + esc(d.company || '') + '</span><span>' + esc(fmtDay(d.date)) + '</span></div>' +
      '<div class="cover-body">' +
        '<p class="cover-kicker">PROCESS IMPROVEMENT MANUAL</p>' +
        '<h1 class="cover-title">' + esc(d.title || T.docTitle) + '</h1>' +
        (d.subtitle ? '<p class="cover-sub">' + esc(d.subtitle) + '</p>' : '') +
        '<div class="cover-rule"></div>' +
      '</div>' +
      '<p class="cover-foot">' + esc(T.confidential) + '</p>' +
    '</section>';
  }

  function renderToc(d, numbered) {
    var h = '<section class="front"><h2 class="front-h" id="toc">' + esc(T.toc) + '</h2><nav class="toc" aria-label="' + esc(T.toc) + '"><ol>';
    d.chapters.forEach(function (ch) {
      var n = ch.appendix ? null : numbered.indexOf(ch) + 1;
      h += '<li><a class="toc-ch" href="#' + esc(ch.id) + '"><span class="num">' + esc(ch.appendix ? T.appendix : T.tocChapter(n)) + '</span><span>' + esc(ch.title) + '</span></a>';
      if (ch.sections.length) {
        h += '<ol>';
        ch.sections.forEach(function (s, i) {
          var sn = ch.appendix ? String.fromCharCode(65 + i) : n + '.' + (i + 1);
          h += '<li><span class="num">' + sn + '</span><a href="#' + esc(s.id) + '">' + esc(s.title) + '</a>' + pill(s.status) + '</li>';
        });
        h += '</ol>';
      }
      h += '</li>';
    });
    return h + '</ol></nav></section>';
  }

  function renderHistory(d) {
    if (!d.history || !d.history.length) return '';
    return '<section class="history" id="history"><h2>' + esc(T.history) + '</h2>' +
      table({ head: T.historyHead, widths: ['14%', '20%', '66%'],
        rows: d.history.map(function (r) { return [r.version, r.date, r.note]; }) }) + '</section>';
  }

  function renderChapter(ch, n) {
    var h = '<section class="chapter" id="' + esc(ch.id) + '">';
    h += '<header class="chapter-head"><span class="chapter-num">' + esc(ch.appendix ? T.appendix : T.chapter(n)) + '</span><h2>' + esc(ch.title) + '</h2></header>';
    if (ch.lead) h += '<p class="chapter-lead">' + inline(ch.lead) + '</p>';
    (ch.intro || []).forEach(function (b) { h += block(b); });
    ch.sections.forEach(function (s, i) {
      var sn = ch.appendix ? T.appendix + ' ' + String.fromCharCode(65 + i) : n + '.' + (i + 1);
      h += '<section class="section" id="' + esc(s.id) + '">';
      h += '<header class="section-head"><span class="num">' + esc(sn) + '</span><h3>' + esc(s.title) + '</h3>' + pill(s.status) + '</header>';
      s.blocks.forEach(function (b) { h += block(b); });
      h += '</section>';
    });
    return h + '</section>';
  }

  function block(b) {
    switch (b.type) {
      case 'p': return '<p class="block">' + inline(b.text) + '</p>';
      case 'h': return '<h4 class="sub">' + inline(b.text) + '</h4>';
      case 'ul': return '<ul class="b-ul">' + listItems(b.items) + '</ul>';
      case 'ol': return '<ol class="b-ol">' + listItems(b.items) + '</ol>';
      case 'table': return table(b);
      case 'note':
        return '<aside class="note note-' + esc(b.kind || 'info') + '"><div class="note-bar"></div><div class="note-body">' +
          (b.title ? '<p class="note-title">' + inline(b.title) + '</p>' : '') + '<p>' + inline(b.text) + '</p></div></aside>';
      case 'check':
        return '<div class="check">' + (b.title ? '<div class="check-title">' + inline(b.title) + '</div>' : '') +
          '<ul>' + (b.items || []).map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul></div>';
      case 'flow':
        return '<div class="flow">' + (b.steps || []).map(function (s) {
          return '<div class="flow-step"><span class="flow-title">' + inline(s.title) + '</span>' + inline(s.text) + '</div>';
        }).join('') + '</div>';
      case 'proposal':
        return '<div class="proposal">' +
          cell(T.labels[0], b.current, '') + cell(T.labels[1], b.issue, '') +
          cell(T.labels[2], b.plan, 'is-plan') + cell(T.labels[3], b.effect, 'is-effect') + '</div>';
      case 'kv':
        return '<dl class="kv">' + (b.items || []).map(function (kv) {
          return '<dt>' + inline(kv[0]) + '</dt><dd>' + inline(kv[1]) + '</dd>';
        }).join('') + '</dl>';
      case 'form':
        return '<div class="form">' + (b.rows || []).map(function (r) {
          var l = Math.min(4, Math.max(1, r.lines || 1));
          return '<div class="form-row"><div class="form-label">' + inline(r.label) + '</div><div class="form-field l' + l + '"></div></div>';
        }).join('') + '</div>';
      case 'pagebreak': return '<div class="pagebreak"></div>';
      default: return '<p class="block">' + inline(b.text || '') + '</p>';
    }
  }

  // 4 枠の 1 行。本文が空の行は出さない
  function cell(label, text, cls) {
    if (!text || !String(text).trim()) return '';
    return '<div class="proposal-row ' + cls + '"><div class="lbl">' + esc(label) + '</div><p>' + inline(text) + '</p></div>';
  }
  function listItems(items) {
    return (items || []).map(function (it) {
      if (typeof it === 'string') return '<li>' + inline(it) + '</li>';
      var sub = it.sub && it.sub.length ? '<ul>' + it.sub.map(function (s) { return '<li>' + inline(s) + '</li>'; }).join('') + '</ul>' : '';
      return '<li>' + inline(it.text || '') + sub + '</li>';
    }).join('');
  }
  function table(b) {
    var h = '<table class="b-table">';
    if (b.caption) h += '<caption>' + inline(b.caption) + '</caption>';
    if (b.widths) h += '<colgroup>' + b.widths.map(function (w) { return '<col style="width:' + esc(w) + '">'; }).join('') + '</colgroup>';
    var nw = function (c) { return String(c == null ? '' : c).trim().length <= 8 ? ' class="nw"' : ''; }; // 短いセルは折り返さない
    if (b.head) h += '<thead><tr>' + b.head.map(function (c) { return '<th' + nw(c) + '>' + inline(c) + '</th>'; }).join('') + '</tr></thead>';
    h += '<tbody>' + (b.rows || []).map(function (r) {
      return '<tr>' + r.map(function (c) { return '<td' + nw(c) + '>' + inline(c) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
    return h;
  }
  function pill(status) {
    if (!status) return '';
    var cls = /ドラフト|draft|ร่าง/i.test(status) ? 'pill-draft' : /試行|trial|ทดลอง/i.test(status) ? 'pill-trial' : /運用|live|ใช้งาน/i.test(status) ? 'pill-live' : 'pill-plan';
    return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
  }

  /* ======================= 編集 ======================= */
  var ta = $('editor'), preview = $('preview'), renderTimer = null;

  $('editBtn').addEventListener('click', function () { state.editing ? closeEditor() : openEditor(); });
  $('cancelBtn').addEventListener('click', closeEditor);
  $('saveBtn').addEventListener('click', save);
  $('helpBtn').addEventListener('click', function () { $('help').hidden = !$('help').hidden; });
  $('downloadBtn').addEventListener('click', downloadMd);
  $('uploadInput').addEventListener('change', uploadMd);
  $('historyBtn').addEventListener('click', showHistory);
  $('printBtn').addEventListener('click', printPdf);
  $('printBtn2').addEventListener('click', printPdf);

  ta.addEventListener('input', function () {
    state.dirty = true;
    safeSet(lsKey('kaizen.draft'), ta.value);
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 250);
  });
  ta.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Tab') { // 2 文字下げ
      e.preventDefault();
      var s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      ta.dispatchEvent(new Event('input'));
    }
  });
  window.addEventListener('beforeunload', function (e) {
    if (state.editing && state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  function openEditor() {
    state.editing = true;
    document.body.classList.add('is-editing');
    var draft = safeGet(lsKey('kaizen.draft'));
    if (draft && draft !== state.text && confirm(T.draftFound)) {
      ta.value = draft; state.dirty = true;
    } else {
      ta.value = state.text; state.dirty = false; safeDel(lsKey('kaizen.draft'));
    }
    ta.lang = lang;
    $('editBtn').textContent = T.backToView;
    setSaveMsg(T.langNote);
    renderPreview();
    ta.focus();
  }

  function closeEditor() {
    if (state.dirty && !confirm(T.discard)) return;
    state.editing = false;
    document.body.classList.remove('is-editing');
    $('editBtn').textContent = T.edit;
    showDoc();
  }

  function renderPreview() {
    preview.innerHTML = renderDoc(window.KaizenMD.parse(ta.value));
  }

  function save() {
    var text = ta.value, saveLang = lang;
    setSaveMsg(T.saving);
    if (!state.shared) {
      safeSet(lsKey('kaizen.localText'), text); safeDel(lsKey('kaizen.draft'));
      state.text = text; state.dirty = false;
      setSaveMsg(T.savedLocal);
      return;
    }
    var headers = { 'Content-Type': 'application/json' };
    var key = safeGet(LS_KEY);
    if (state.locked && !key) { key = askKey(); if (key === null) { setSaveMsg(T.saveCancelled); return; } }
    if (key) headers['X-Edit-Key'] = key;
    fetch('api/kaizen?lang=' + saveLang, { method: 'PUT', headers: headers, body: JSON.stringify({ text: text, base: state.updatedAt, lang: saveLang }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (saveLang !== lang) return;
        if (res.status === 401) {
          safeDel(LS_KEY);
          var k = askKey();
          if (k === null) { setSaveMsg(T.saveCancelled); return; }
          state.locked = true;
          return save();
        }
        if (res.status === 409) {
          setSaveMsg(T.conflictMsg);
          if (confirm(T.conflict)) { state.updatedAt = res.j.updatedAt; return save(); }
          return;
        }
        if (res.status !== 200) { setSaveMsg(T.saveFailed((res.j && res.j.error) || res.status)); return; }
        state.text = text; state.updatedAt = res.j.updatedAt; state.dirty = false; safeDel(lsKey('kaizen.draft'));
        setSaveMsg(T.saved(fmtDate(state.updatedAt)));
        updateStatus();
      })
      .catch(function (e) { setSaveMsg(T.saveFailed(e)); });
  }

  function askKey() {
    var k = prompt(T.askKey);
    if (k === null) return null;
    k = k.trim();
    if (k) safeSet(LS_KEY, k);
    return k;
  }

  function setSaveMsg(t) { $('saveMsg').textContent = t; }

  function downloadMd() {
    var text = state.editing ? ta.value : state.text;
    var d = window.KaizenMD.parse(text);
    var name = (d.title || 'kaizen') + (d.version ? '_v' + d.version.replace(/[^\w.\-]+/g, '') : '') + '_' + lang + '.md';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function uploadMd(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      if (!state.editing) openEditor();
      ta.value = String(r.result); state.dirty = true; renderPreview();
      setSaveMsg(T.fileLoaded);
    };
    r.readAsText(f, 'utf-8');
    e.target.value = '';
  }

  function showHistory() {
    if (!state.shared) { alert(T.noHistoryLocal); return; }
    fetch('api/kaizen?history=1&lang=' + lang, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var list = (j && j.history) || [];
      if (!list.length) { alert(T.noHistory); return; }
      var lines = list.map(function (h, i) { return (i + 1) + ') ' + fmtDate(h.at) + '　' + (h.head || '').replace(/^version:\s*/, 'v') + '　' + h.size + ' ' + T.chars; });
      var pick = prompt(T.historyPrompt + '\n\n' + lines.join('\n'));
      var n = parseInt(pick, 10);
      if (!n || !list[n - 1]) return;
      fetch('api/kaizen?lang=' + lang + '&rev=' + encodeURIComponent(list[n - 1].at), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (rev) {
        if (!rev || typeof rev.text !== 'string') { alert(T.loadFailed); return; }
        if (!state.editing) openEditor();
        ta.value = rev.text; state.dirty = true; renderPreview();
        setSaveMsg(T.revLoaded(fmtDate(rev.updatedAt)));
      });
    }).catch(function (e) { alert(T.historyFailed(e)); });
  }

  /* ======================= PDF ======================= */
  function printPdf() {
    if (state.editing) doc.innerHTML = preview.innerHTML; // 編集中は、いま書いている内容で PDF にする
    var after = function () {
      window.removeEventListener('afterprint', after);
      if (state.editing) showDoc();
    };
    window.addEventListener('afterprint', after);
    window.print();
  }

  /* ======================= ユーティリティ ======================= */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  // 表紙・巻末の日付は言語に合わせて表示（タイ語は仏暦）
  function fmtDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return s || '';
    try {
      return new Intl.DateTimeFormat(LOCALE[lang], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    } catch (e) { return s; }
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso || '');
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var footerStyle = null;
  function setFooter(text) {
    if (!footerStyle) { footerStyle = document.createElement('style'); document.head.appendChild(footerStyle); }
    footerStyle.textContent = '@page { @bottom-left { content: ' + JSON.stringify(text) + '; } }\n' +
      '@page :first { @bottom-left { content: none; } @bottom-center { content: none; } }';
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function safeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
})();
