/* 業務改善マニュアル — イラスト版（インフォグラフィック）
 *
 *   window.KaizenInfo.render(lang, meta) → HTML（冊子 × 横長スライド 1280×720）
 *   window.KaizenInfo.mount(el)      → ページ送り・拡大縮小・印刷範囲の設定
 *   lang: 'ja' | 'en' | 'th'、meta: 本文（kaizen.md など）の title / subtitle / company / date / version
 *
 *   イラストはすべてこのファイルの SVG で描いています（外部画像なし。PDF にしても崩れません）。
 *   項目の文言は下の ITEMS（3 言語）を直接編集します。文章版（kaizen.md など）とは別管理です。
 */
(function (root) {
  'use strict';

  /* ======================= 色 ======================= */
  var C = {
    navy: '#1f4e78', blue: '#4a7fb5', sky: '#dbe8f5', gold: '#e0a91b', cream: '#fff4d6',
    red: '#e25c4b', redS: '#fde3df', green: '#2f8f5b', greenS: '#dff3e7', skin: '#f2c49b',
    hair: '#3b2f2a', gray: '#8a94a3', light: '#eef1f5', ink: '#26303b', white: '#ffffff',
    teal: '#2a8c8c', tealS: '#dcf1f1', purple: '#7a5aa6', purpleS: '#ece6f5', orange: '#e07b2e'
  };
  var CH = [ // 章ごとの色
    { c: C.navy, s: C.sky }, { c: C.teal, s: C.tealS }, { c: '#b7790f', s: C.cream },
    { c: C.purple, s: C.purpleS }, { c: '#c4572e', s: '#fbe6dc' }, { c: C.green, s: C.greenS }
  ];

  /* ======================= SVG の部品 ======================= */
  function svg(vb, body, cls) { return '<svg viewBox="' + vb + '" class="' + (cls || '') + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + '</svg>'; }
  function g(x, y, s, body) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')">' + body + '</g>'; }
  function t(x, y, txt, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 12) + '" font-weight="' + (o.fw || 700) + '" fill="' + (o.fill || C.ink) + '" font-family="inherit">' + txt + '</text>';
  }
  function ground(cx, cy, rx, col) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + (rx * 0.12) + '" fill="' + (col || C.light) + '"/>'; }
  var sw = function (c, w) { return ' stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" '; };

  // 人（足元が原点、高さ約 90）
  function person(x, y, s, o) {
    o = o || {};
    var sh = o.shirt || C.blue, m = o.mood || 'happy', b = '';
    b += '<rect x="-13" y="-24" width="11" height="24" rx="4" fill="' + C.ink + '"/><rect x="2" y="-24" width="11" height="24" rx="4" fill="' + C.ink + '"/>';
    if (o.arms === 'up') {
      b += '<path d="M14 -50 L28 -72"' + sw(sh, 9) + 'fill="none"/><circle cx="29" cy="-75" r="5" fill="' + C.skin + '"/>';
      b += '<path d="M-15 -50 L-21 -29"' + sw(sh, 9) + 'fill="none"/><circle cx="-22" cy="-26" r="5" fill="' + C.skin + '"/>';
    } else if (o.arms === 'hold') {
      b += '<path d="M-15 -50 Q-20 -36 -6 -32"' + sw(sh, 9) + 'fill="none"/><path d="M15 -50 Q20 -36 6 -32"' + sw(sh, 9) + 'fill="none"/>';
    } else if (o.arms === 'head') { // 頭を抱える
      b += '<path d="M-15 -52 L-20 -76"' + sw(sh, 9) + 'fill="none"/><circle cx="-19" cy="-80" r="5" fill="' + C.skin + '"/>';
      b += '<path d="M15 -52 L20 -76"' + sw(sh, 9) + 'fill="none"/><circle cx="19" cy="-80" r="5" fill="' + C.skin + '"/>';
    } else {
      b += '<path d="M-16 -50 L-21 -29"' + sw(sh, 9) + 'fill="none"/><circle cx="-22" cy="-26" r="5" fill="' + C.skin + '"/>';
      b += '<path d="M16 -50 L21 -29"' + sw(sh, 9) + 'fill="none"/><circle cx="22" cy="-26" r="5" fill="' + C.skin + '"/>';
    }
    b += '<path d="M-19 -22 v-22 q0 -16 19 -16 q19 0 19 16 v22 z" fill="' + sh + '"/>';
    b += '<circle cx="0" cy="-74" r="15" fill="' + C.skin + '"/>';
    b += o.long ? '<path d="M-16 -74 a16 16 0 0 1 32 0 v14 q-3 2 -5 0 v-13 q-11 -7 -22 0 v13 q-2 2 -5 0z" fill="' + (o.hair || C.hair) + '"/>'
      : '<path d="M-15 -76 a15 15 0 0 1 30 0 q-7 -7 -15 -6 q-8 0 -15 6z" fill="' + (o.hair || C.hair) + '"/>';
    b += '<circle cx="-5" cy="-74" r="1.8" fill="#2b2b2b"/><circle cx="5" cy="-74" r="1.8" fill="#2b2b2b"/>';
    if (m === 'sad') b += '<path d="M-5 -65 q5 -4 10 0"' + sw('#2b2b2b', 1.8) + 'fill="none"/>';
    else if (m === 'worried') b += '<path d="M-4 -66 h8"' + sw('#2b2b2b', 1.8) + 'fill="none"/><path d="M19 -88 q4 6 0 9 q-4 -3 0 -9z" fill="#7fb8e6"/>';
    else b += '<path d="M-5 -67 q5 5 10 0"' + sw('#2b2b2b', 1.8) + 'fill="none"/><circle cx="-9" cy="-69" r="2.5" fill="#f19a8b" opacity=".6"/><circle cx="9" cy="-69" r="2.5" fill="#f19a8b" opacity=".6"/>';
    return g(x, y, s, b);
  }

  function clipboard(x, y, s, checks) {
    var b = '<rect x="0" y="4" width="46" height="60" rx="5" fill="#fff"' + sw(C.navy, 2.5) + '/><rect x="14" y="0" width="18" height="9" rx="3" fill="' + C.navy + '"/>';
    (checks || [1, 1, 0]).forEach(function (c, i) {
      var yy = 20 + i * 13;
      b += '<rect x="7" y="' + (yy - 5) + '" width="9" height="9" rx="2" fill="' + (c ? C.greenS : '#fff') + '"' + sw(c ? C.green : C.gray, 1.6) + '/>';
      if (c) b += '<path d="M8.5 ' + yy + ' l2.5 2.5 l4.5 -5"' + sw(C.green, 2) + 'fill="none"/>';
      b += '<rect x="20" y="' + (yy - 2) + '" width="20" height="4" rx="2" fill="' + C.light + '"/>';
    });
    return g(x, y, s, b);
  }
  function calendar(x, y, s, label, o) {
    o = o || {};
    var b = '<rect x="0" y="6" width="56" height="50" rx="6" fill="#fff"' + sw(C.navy, 2.5) + '/>' +
      '<path d="M1.5 13 a6 6 0 0 1 6 -6 h41 a6 6 0 0 1 6 6 v8 h-53z" fill="' + (o.top || C.red) + '"/>' +
      '<rect x="12" y="0" width="5" height="12" rx="2.5" fill="' + C.navy + '"/><rect x="39" y="0" width="5" height="12" rx="2.5" fill="' + C.navy + '"/>' +
      t(28, 46, label, { fs: o.fs || 17, fill: o.fill || C.ink });
    return g(x, y, s, b);
  }
  function clock(cx, cy, r, h, m, o) {
    o = o || {};
    var b = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff"' + sw(o.ring || C.navy, r / 8) + '/>';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6, r1 = r * 0.78, r2 = r * (i % 3 ? 0.86 : 0.9);
      b += '<line x1="' + (cx + r1 * Math.sin(a)) + '" y1="' + (cy - r1 * Math.cos(a)) + '" x2="' + (cx + r2 * Math.sin(a)) + '" y2="' + (cy - r2 * Math.cos(a)) + '"' + sw(C.gray, r / 18) + '/>';
    }
    var ha = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30;
    b += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.5 * Math.sin(ha)) + '" y2="' + (cy - r * 0.5 * Math.cos(ha)) + '"' + sw(C.ink, r / 8) + '/>';
    b += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.72 * Math.sin(ma)) + '" y2="' + (cy - r * 0.72 * Math.cos(ma)) + '"' + sw(o.hand || C.red, r / 12) + '/>';
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r / 10) + '" fill="' + C.ink + '"/>';
    return b;
  }
  function stopwatch(cx, cy, r) {
    return '<rect x="' + (cx - r * 0.18) + '" y="' + (cy - r * 1.32) + '" width="' + (r * 0.36) + '" height="' + (r * 0.3) + '" rx="2" fill="' + C.navy + '"/>' +
      '<path d="M' + (cx + r * 0.62) + ' ' + (cy - r * 0.95) + ' l' + (r * 0.18) + ' ' + (-r * 0.18) + '"' + sw(C.navy, r / 7) + '/>' +
      clock(cx, cy, r, 0, 20, { ring: C.navy, hand: C.red }) +
      '<path d="M' + cx + ' ' + cy + ' L' + cx + ' ' + (cy - r * 0.78) + ' A' + (r * 0.78) + ' ' + (r * 0.78) + ' 0 0 1 ' + (cx + r * 0.68) + ' ' + (cy + r * 0.39) + 'z" fill="' + C.red + '" opacity=".18"/>';
  }
  function pos(x, y, s) {
    var b = '<path d="M2 56 h56 l-7 -18 h-42z" fill="' + C.navy + '"/><rect x="7" y="4" width="46" height="32" rx="4" fill="' + C.ink + '"/>' +
      '<rect x="11" y="8" width="38" height="22" rx="2" fill="' + C.sky + '"/>' + t(30, 25, '฿', { fs: 14, fill: C.navy }) +
      '<rect x="14" y="44" width="32" height="5" rx="2" fill="' + C.blue + '"/>';
    return g(x, y, s, b);
  }
  function card(x, y, s) { return g(x, y, s, '<rect width="40" height="26" rx="4" fill="' + C.gold + '"/><rect y="6" width="40" height="5" fill="#8f6a0d"/><rect x="5" y="16" width="12" height="5" rx="1" fill="' + C.cream + '"/>'); }
  function qr(x, y, s) {
    var b = '<rect width="28" height="28" rx="3" fill="#fff"' + sw(C.ink, 2) + '/>';
    [[4, 4], [16, 4], [4, 16]].forEach(function (p) { b += '<rect x="' + p[0] + '" y="' + p[1] + '" width="8" height="8" fill="' + C.ink + '"/>'; });
    b += '<rect x="17" y="17" width="3" height="3" fill="' + C.ink + '"/><rect x="21" y="21" width="3" height="3" fill="' + C.ink + '"/><rect x="17" y="21" width="3" height="3" fill="' + C.ink + '"/>';
    return g(x, y, s, b);
  }
  function cash(x, y, s) { return g(x, y, s, '<rect width="42" height="24" rx="3" fill="#5fae7a"/><rect x="3" y="3" width="36" height="18" rx="2" fill="none" stroke="#bfe3c9" stroke-width="1.5"/><circle cx="21" cy="12" r="6" fill="#bfe3c9"/>' + t(21, 16, '฿', { fs: 9, fill: C.green })); }
  function coin(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.gold + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.72) + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="' + (r / 7) + '"/>' + t(cx, cy + r * 0.38, '฿', { fs: r, fill: '#fff' }); }
  function box(x, y, s, label) {
    var b = '<path d="M0 14 l20 -10 h32 l-20 10z" fill="#ecc98e"/><rect x="0" y="14" width="32" height="28" fill="#d9a35a"/><path d="M32 14 l20 -10 v28 l-20 10z" fill="#c48a45"/><rect x="12" y="14" width="8" height="28" fill="#f3dfb5" opacity=".85"/>';
    if (label) b += t(26, 36, label, { fs: 11, fill: '#6b4a1c' });
    return g(x, y, s, b);
  }
  function truck(x, y, s, col) {
    col = col || C.teal;
    var b = '<rect x="0" y="0" width="70" height="40" rx="4" fill="#fff"' + sw(col, 3) + '/><rect x="8" y="10" width="28" height="6" rx="3" fill="' + col + '" opacity=".35"/>' +
      '<path d="M72 10 h18 l12 14 v16 h-30z" fill="' + col + '"/><path d="M76 14 h12 l8 10 h-20z" fill="' + C.sky + '"/>' +
      '<circle cx="18" cy="42" r="8" fill="' + C.ink + '"/><circle cx="18" cy="42" r="3" fill="' + C.gray + '"/><circle cx="86" cy="42" r="8" fill="' + C.ink + '"/><circle cx="86" cy="42" r="3" fill="' + C.gray + '"/>';
    return g(x, y, s, b);
  }
  function store(x, y, s) {
    var b = '<rect x="4" y="26" width="92" height="58" fill="#fff"' + sw(C.navy, 2.5) + '/>';
    for (var i = 0; i < 6; i++) b += '<path d="M' + (i * 16 + 2) + ' 14 h16 v12 a8 8 0 0 1 -16 0z" fill="' + (i % 2 ? '#fff' : C.gold) + '"' + sw(C.navy, 1.5) + '/>';
    b += '<rect x="0" y="6" width="100" height="10" rx="3" fill="' + C.navy + '"/>' +
      '<rect x="14" y="46" width="30" height="24" rx="2" fill="' + C.sky + '"' + sw(C.navy, 1.5) + '/><rect x="56" y="46" width="26" height="38" rx="2" fill="' + C.blue + '"/><circle cx="76" cy="66" r="2" fill="#fff"/>';
    return g(x, y, s, b);
  }
  function warehouse(x, y, s) {
    var b = '<path d="M0 34 L50 6 L100 34 V84 H0z" fill="' + C.sky + '"' + sw(C.navy, 2.5) + '/><rect x="24" y="44" width="52" height="40" fill="#fff"' + sw(C.navy, 2) + '/>';
    for (var i = 0; i < 5; i++) b += '<line x1="24" y1="' + (52 + i * 7) + '" x2="76" y2="' + (52 + i * 7) + '"' + sw(C.gray, 1.4) + '/>';
    return g(x, y, s, b);
  }
  function shoe(x, y, s, col) {
    col = col || C.blue;
    var b = '<path d="M2 30 q0 -12 10 -14 l14 -10 q6 -4 10 2 l6 8 q14 2 30 6 q10 3 10 10 v4 h-80z" fill="' + col + '"/>' +
      '<rect x="0" y="32" width="84" height="7" rx="3" fill="#fff"' + sw(C.gray, 1.5) + '/>' +
      '<path d="M24 12 l8 6 M30 8 l8 6"' + sw('#fff', 2) + '/>';
    return g(x, y, s, b);
  }
  function magnifier(x, y, s) { return g(x, y, s, '<circle cx="18" cy="18" r="15" fill="' + C.sky + '" fill-opacity=".55"' + sw(C.navy, 5) + '/><path d="M29 29 L44 44"' + sw(C.navy, 7) + '/>'); }
  function tag(x, y, s, label, col) {
    return g(x, y, s, '<path d="M0 18 L12 2 h52 a4 4 0 0 1 4 4 v24 a4 4 0 0 1 -4 4 h-52z" fill="' + (col || C.red) + '"/><circle cx="12" cy="18" r="3.5" fill="#fff"/>' + t(42, 23, label, { fs: 13, fill: '#fff', fw: 800 }));
  }
  function robot(x, y, s) {
    var b = '<line x1="26" y1="2" x2="26" y2="12"' + sw(C.navy, 3) + '/><circle cx="26" cy="3" r="4" fill="' + C.gold + '"/>' +
      '<rect x="4" y="12" width="44" height="34" rx="9" fill="' + C.sky + '"' + sw(C.navy, 2.5) + '/>' +
      '<circle cx="18" cy="28" r="4.5" fill="' + C.navy + '"/><circle cx="34" cy="28" r="4.5" fill="' + C.navy + '"/><path d="M19 38 q7 5 14 0"' + sw(C.navy, 2) + 'fill="none"/>' +
      '<rect x="10" y="50" width="32" height="24" rx="6" fill="' + C.blue + '"/>' + t(26, 67, 'AI', { fs: 11, fill: '#fff' });
    return g(x, y, s, b);
  }
  function doc(x, y, s, kind, col) {
    col = col || C.navy;
    var b = '<path d="M0 0 h32 l12 12 v46 h-44z" fill="#fff"' + sw(col, 2.2) + '/><path d="M32 0 v12 h12" fill="' + C.light + '"' + sw(col, 2.2) + '/>';
    if (kind === 'bars') b += '<rect x="8" y="38" width="6" height="12" fill="' + C.blue + '"/><rect x="18" y="30" width="6" height="20" fill="' + C.gold + '"/><rect x="28" y="22" width="6" height="28" fill="' + C.green + '"/>';
    else if (kind === 'codes') for (var i = 0; i < 4; i++) b += '<rect x="7" y="' + (18 + i * 9) + '" width="10" height="4" rx="1" fill="' + col + '"/><rect x="20" y="' + (18 + i * 9) + '" width="16" height="4" rx="1" fill="' + C.light + '"/>';
    else for (var j = 0; j < 4; j++) b += '<rect x="7" y="' + (18 + j * 9) + '" width="' + (j === 3 ? 18 : 30) + '" height="4" rx="2" fill="' + C.light + '"/>';
    return g(x, y, s, b);
  }
  function stamp(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" fill-opacity=".85"' + sw(C.red, r / 6) + '/><path d="M' + (cx - r * 0.45) + ' ' + cy + ' l' + (r * 0.3) + ' ' + (r * 0.32) + ' l' + (r * 0.6) + ' ' + (-r * 0.62) + '"' + sw(C.red, r / 5) + 'fill="none"/>'; }
  function okCircle(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.green + '"/><path d="M' + (cx - r * 0.45) + ' ' + cy + ' l' + (r * 0.3) + ' ' + (r * 0.32) + ' l' + (r * 0.6) + ' ' + (-r * 0.62) + '"' + sw('#fff', r / 4) + 'fill="none"/>'; }
  function ngCircle(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.red + '"/><path d="M' + (cx - r * 0.38) + ' ' + (cy - r * 0.38) + ' l' + (r * 0.76) + ' ' + (r * 0.76) + ' M' + (cx + r * 0.38) + ' ' + (cy - r * 0.38) + ' l' + (-r * 0.76) + ' ' + (r * 0.76) + '"' + sw('#fff', r / 4) + '/>'; }
  function qmark(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.gold + '"/>' + t(cx, cy + r * 0.42, '?', { fs: r * 1.3, fill: '#fff', fw: 800 }); }
  function bubble(x, y, s, inner) {
    var b = '<path d="M4 0 h44 a4 4 0 0 1 4 4 v24 a4 4 0 0 1 -4 4 h-30 l-10 9 v-9 h-4 a4 4 0 0 1 -4 -4 v-24 a4 4 0 0 1 4 -4z" fill="#fff"' + sw(C.green, 2.5) + '/>';
    b += inner === 'dots' ? '<circle cx="16" cy="16" r="3" fill="' + C.gray + '"/><circle cx="26" cy="16" r="3" fill="' + C.gray + '"/><circle cx="36" cy="16" r="3" fill="' + C.gray + '"/>'
      : '<path d="M17 16 l6 6 l12 -12"' + sw(C.green, 4) + 'fill="none"/>';
    return g(x, y, s, b);
  }
  function papers(x, y, s) {
    var b = '';
    for (var i = 0; i < 5; i++) b += '<rect x="' + (i % 2 ? 4 : 0) + '" y="' + (40 - i * 9) + '" width="46" height="10" rx="2" transform="rotate(' + (i % 2 ? 4 : -3) + ' 25 ' + (45 - i * 9) + ')" fill="#fff"' + sw(C.gray, 1.6) + '/>';
    return g(x, y, s, b);
  }
  function broom(x, y, s) { return g(x, y, s, '<path d="M30 0 L18 44"' + sw('#a0682b', 5) + '/><path d="M8 44 h22 l6 22 h-34z" fill="' + C.gold + '"/><path d="M10 52 l-2 14 M18 52 v14 M26 52 l2 14"' + sw('#b07d10', 1.5) + '/>'); }
  function bin(x, y, s) { return g(x, y, s, '<rect x="2" y="8" width="40" height="6" rx="3" fill="' + C.green + '"/><rect x="16" y="2" width="12" height="6" rx="2" fill="' + C.green + '"/><path d="M5 16 h34 l-4 40 h-26z" fill="' + C.greenS + '"' + sw(C.green, 2.5) + '/><path d="M16 24 v24 M22 24 v24 M28 24 v24"' + sw(C.green, 2) + '/>'); }
  function sparkle(cx, cy, r, col) { return '<path d="M' + cx + ' ' + (cy - r) + ' Q' + cx + ' ' + cy + ' ' + (cx + r) + ' ' + cy + ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + r) + ' Q' + cx + ' ' + cy + ' ' + (cx - r) + ' ' + cy + ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - r) + 'z" fill="' + (col || C.gold) + '"/>'; }
  function sun(cx, cy, r) {
    var b = '';
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; b += '<line x1="' + (cx + r * 1.35 * Math.cos(a)) + '" y1="' + (cy + r * 1.35 * Math.sin(a)) + '" x2="' + (cx + r * 1.75 * Math.cos(a)) + '" y2="' + (cy + r * 1.75 * Math.sin(a)) + '"' + sw(C.gold, r / 4) + '/>'; }
    return b + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.gold + '"/>';
  }
  function phone(x, y, s) {
    return g(x, y, s, '<rect width="34" height="60" rx="6" fill="' + C.ink + '"/><rect x="3" y="7" width="28" height="44" rx="2" fill="#fff"/>' +
      '<rect x="7" y="12" width="20" height="8" rx="2" fill="' + C.sky + '"/><rect x="7" y="24" width="20" height="8" rx="2" fill="' + C.sky + '"/><rect x="7" y="36" width="20" height="8" rx="2" fill="' + C.greenS + '"/>' +
      '<circle cx="31" cy="6" r="7" fill="' + C.red + '"/>' + t(31, 10, '3', { fs: 9, fill: '#fff' }));
  }
  function wrench(x, y, s) { return g(x, y, s, '<path d="M6 34 L26 14"' + sw(C.gray, 7) + '/><circle cx="30" cy="10" r="9" fill="' + C.gray + '"/><circle cx="33" cy="7" r="4" fill="#fff"/>'); }
  function needle(x, y, s) { return g(x, y, s, '<path d="M4 36 L36 4"' + sw(C.gray, 3) + '/><circle cx="33" cy="7" r="2" fill="#fff"/><path d="M33 7 q10 10 -2 20 q-12 10 2 18"' + sw(C.red, 2) + 'fill="none"/>'); }
  function booth(x, y, s) {
    var b = '<rect x="0" y="0" width="120" height="16" rx="3" fill="' + C.teal + '"/><rect x="8" y="16" width="4" height="70" fill="' + C.gray + '"/><rect x="108" y="16" width="4" height="70" fill="' + C.gray + '"/>' +
      '<rect x="20" y="24" width="80" height="26" rx="2" fill="#fff"' + sw(C.teal, 2) + '/>' + shoe(26, 26, 0.32, C.red) + shoe(52, 26, 0.32, C.blue) + shoe(76, 26, 0.32, C.gold) +
      '<rect x="14" y="58" width="92" height="28" rx="3" fill="' + C.tealS + '"' + sw(C.teal, 2) + '/>';
    return g(x, y, s, b);
  }
  function tableGrid(x, y, w, h, rows, cols, fill) {
    var b = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="#fff"' + sw(C.navy, 2) + '/>';
    var cw = w / cols, rh = h / rows;
    b += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + rh + '" rx="4" fill="' + C.navy + '"/>';
    for (var r = 1; r < rows; r++) for (var c = 0; c < cols; c++) { var f = fill && fill(r, c); if (f) b += f(x + c * cw + cw / 2, y + r * rh + rh / 2, Math.min(cw, rh)); }
    for (var i = 1; i < cols; i++) b += '<line x1="' + (x + i * cw) + '" y1="' + (y + rh) + '" x2="' + (x + i * cw) + '" y2="' + (y + h) + '"' + sw(C.light, 1.5) + '/>';
    for (var j = 2; j < rows; j++) b += '<line x1="' + x + '" y1="' + (y + j * rh) + '" x2="' + (x + w) + '" y2="' + (y + j * rh) + '"' + sw(C.light, 1.5) + '/>';
    return b;
  }
  function face(cx, cy, r, col) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (col || C.blue) + '"/><circle cx="' + cx + '" cy="' + (cy - r * 0.12) + '" r="' + (r * 0.45) + '" fill="' + C.skin + '"/>'; }
  function arrow(x1, y1, x2, y2, col, dash) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 8;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + sw(col || C.gray, 3) + (dash ? 'stroke-dasharray="5 6"' : '') + '/>' +
      '<path d="M' + x2 + ' ' + y2 + ' L' + (x2 - L * Math.cos(a - 0.5)) + ' ' + (y2 - L * Math.sin(a - 0.5)) + ' M' + x2 + ' ' + y2 + ' L' + (x2 - L * Math.cos(a + 0.5)) + ' ' + (y2 - L * Math.sin(a + 0.5)) + '"' + sw(col || C.gray, 3) + 'fill="none"/>';
  }
  function curve(x1, y1, cx, cy, x2, y2, col) {
    var a = Math.atan2(y2 - cy, x2 - cx), L = 9;
    return '<path d="M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2 + '"' + sw(col, 3) + 'fill="none" stroke-dasharray="5 6"/>' +
      '<path d="M' + x2 + ' ' + y2 + ' L' + (x2 - L * Math.cos(a - 0.5)) + ' ' + (y2 - L * Math.sin(a - 0.5)) + ' M' + x2 + ' ' + y2 + ' L' + (x2 - L * Math.cos(a + 0.5)) + ' ' + (y2 - L * Math.sin(a + 0.5)) + '"' + sw(col, 3) + 'fill="none"/>';
  }

  /* ======================= 主役のイラスト（300 × 180） ======================= */
  var VB = '0 0 300 180';
  var SCENES = {
    pos: function (L) {
      return ground(150, 168, 140) + sun(268, 26, 11) + t(268, 54, L.am, { fs: 11, fill: '#b7790f' }) +
        '<rect x="20" y="118" width="130" height="10" rx="3" fill="#c9a77a"/><rect x="28" y="128" width="8" height="40" fill="#b08a5c"/><rect x="134" y="128" width="8" height="40" fill="#b08a5c"/>' +
        pos(70, 62, 1) + person(52, 168, 0.9, { shirt: C.navy, mood: 'happy' }) +
        card(176, 30, 0.9) + qr(184, 74, 0.95) + cash(172, 112, 0.95) +
        arrow(216, 52, 236, 76, C.gray, true) + arrow(216, 88, 236, 92, C.gray, true) + arrow(216, 124, 236, 108, C.gray, true) +
        clipboard(240, 64, 1.05, [1, 1, 1]) + okCircle(286, 138, 11);
    },
    refund: function (L) {
      return ground(150, 168, 140) + pos(40, 80, 0.95) + person(220, 168, 0.95, { shirt: C.gold, mood: 'happy', long: 1 }) +
        curve(110, 82, 160, 20, 196, 70, C.green) + coin(150, 40, 14) +
        calendar(232, 14, 0.85, L.today, { top: C.green, fs: 12 }) + okCircle(120, 150, 12) + '<rect x="20" y="138" width="90" height="10" rx="3" fill="#c9a77a"/>';
    },
    sku: function (L) {
      return ground(150, 168, 140) + doc(20, 34, 1.15, 'codes', C.red) + t(46, 118, 'SD', { fs: 13, fill: C.red }) +
        doc(20, 124 - 2, 0, 'codes') + doc(236, 34, 1.15, 'codes', C.navy) + t(262, 118, L.ours, { fs: 11, fill: C.navy }) +
        robot(124, 50, 1.05) + arrow(78, 70, 116, 80, C.gray, true) + arrow(234, 70, 186, 80, C.gray, true) +
        doc(70, 120, 0.7, 'codes', C.red) + t(86, 172, 'CTL', { fs: 11, fill: C.red }) + qmark(196, 44, 12);
    },
    monthly: function (L) {
      return ground(150, 168, 140) + calendar(46, 34, 1.7, '1–5', { top: C.navy, fs: 15 }) + t(94, 150, L.bizDays, { fs: 12, fill: C.navy }) +
        arrow(150, 90, 178, 90, C.gray) + doc(190, 40, 1.6, 'bars') + okCircle(266, 130, 14);
    },
    restock: function (L) {
      return ground(150, 168, 146) + warehouse(6, 74, 0.95) + truck(106, 116, 0.82, C.teal) + store(196, 80, 0.95) +
        calendar(126, 20, 1, L.monThu, { top: C.teal, fs: 11 }) + doc(196, 6, 0.95) + stamp(232, 52, 12) + arrow(110, 160, 190, 160, C.teal, true);
    },
    online: function (L) {
      return ground(150, 168, 140) + phone(26, 66, 1.3) + clock(150, 76, 50, 14, 0, { ring: C.red, hand: C.red }) +
        t(150, 160, '14:00', { fs: 18, fill: C.red, fw: 800 }) + box(218, 86, 0.95) + box(244, 116, 0.95) + okCircle(266, 60, 13);
    },
    equip: function (L) {
      return ground(150, 168, 140) + booth(16, 54, 1.15) + clipboard(178, 46, 1.4, [1, 1, 1]) + person(266, 168, 0.85, { shirt: C.teal, mood: 'happy', arms: 'up' });
    },
    vehicle: function (L) {
      return ground(150, 168, 140) + truck(30, 104, 1.2, C.blue) + calendar(176, 20, 1.15, L.minus1, { top: C.blue, fs: 13 }) + bubble(212, 96, 1.3, 'check');
    },
    event: function (L) {
      return ground(150, 168, 140) + box(14, 116, 0.95, '1') + box(48, 128, 0.95, '2') + box(26, 88, 0.95, '3') +
        booth(92, 56, 1.0) + arrow(78, 100, 92, 100, C.gray) + '<rect x="232" y="54" width="52" height="68" rx="4" fill="' + C.navy + '"/><rect x="238" y="60" width="40" height="56" rx="2" fill="#fff"/>' +
        '<rect x="244" y="70" width="28" height="4" rx="2" fill="' + C.light + '"/><rect x="244" y="80" width="28" height="4" rx="2" fill="' + C.light + '"/><rect x="244" y="90" width="20" height="4" rx="2" fill="' + C.light + '"/>' + t(258, 140, L.handbook, { fs: 11, fill: C.navy });
    },
    times: function (L) {
      return ground(150, 168, 140) + stopwatch(70, 92, 46) + shoe(140, 104, 1.1, C.red) + t(184, 72, '1:40', { fs: 20, fill: C.red, fw: 800 }) + t(184, 90, L.perPair, { fs: 11, fill: C.ink });
    },
    qc: function (L) {
      return ground(150, 168, 140) + shoe(40, 92, 1.5, C.blue) + magnifier(116, 40, 1.6) + person(250, 168, 0.95, { shirt: '#b7790f', mood: 'happy', arms: 'hold' }) + okCircle(56, 60, 13);
    },
    bgrade: function (L) {
      return ground(150, 168, 140) + shoe(20, 104, 1.25, C.blue) + tag(150, 34, 1.4, '-15%', C.gold) + tag(150, 96, 1.4, '-50%', C.red) +
        wrench(40, 30, 1.2) + coin(270, 64, 14) + coin(258, 92, 12) + coin(278, 116, 13);
    },
    pc: function (L) {
      var cols = [C.blue, C.gold, C.green, C.purple, C.red];
      return ground(150, 168, 140) + tableGrid(20, 26, 260, 130, 5, 6, function (r, c) {
        if (c === 0) return function (x, y) { return '<rect x="' + (x - 14) + '" y="' + (y - 4) + '" width="28" height="8" rx="3" fill="' + C.light + '"/>'; };
        return function (x, y, m) { return face(x, y, m * 0.3, cols[(r * 3 + c) % 5]); };
      }) + okCircle(272, 28, 13);
    },
    clean: function (L) {
      return ground(150, 168, 140) + broom(36, 70, 1.4) + bin(110, 92, 1.3) + sparkle(98, 50, 10) + sparkle(190, 66, 7) +
        '<circle cx="232" cy="100" r="40" fill="none"' + sw(C.green, 3) + 'stroke-dasharray="6 7"/>' +
        face(232, 60, 11, C.blue) + face(272, 100, 11, C.gold) + face(232, 140, 11, C.purple) + face(192, 100, 11, C.red) + arrow(262, 72, 266, 78, C.green) + arrow(202, 128, 198, 122, C.green);
    }
  };

  // 追加分の主役イラスト
  Object.assign(SCENES, {
    input: function () {
      return ground(150, 168, 140) + papers(14, 70, 1.15) + arrow(80, 100, 108, 100, C.gray, true) + robot(114, 46, 1.05) +
        arrow(188, 100, 214, 100, C.gray, true) + doc(220, 40, 1.15, 'bars') + okCircle(270, 140, 12);
    },
    wholesale: function () {
      return ground(150, 168, 140) + store(14, 60, 1.05) + truck(112, 120, 0.55, C.teal) +
        person(214, 168, 0.95, { shirt: C.teal, mood: 'happy', arms: 'up' }) + person(262, 168, 0.95, { shirt: C.navy, mood: 'happy' }) +
        t(262, 44, 'BD', { fs: 14, fill: C.navy }) + bubble(176, 20, 0.9, 'check');
    },
    zort: function () {
      return ground(150, 168, 140) + warehouse(6, 74, 0.95) + box(118, 120, 0.8) + box(132, 96, 0.7) + arrow(170, 110, 196, 96, C.gray, true) +
        g(204, 30, 1.9, ICON.data()) + t(250, 134, 'Zort', { fs: 18, fill: C.blue, fw: 800 }) + okCircle(282, 40, 12);
    },
    shift: function () {
      var cols = [C.blue, C.gold, C.green, C.purple, C.red];
      return ground(150, 168, 140) + tableGrid(14, 30, 180, 124, 4, 5, function (r, c) {
        if (c === 0) return function (x, y) { return '<rect x="' + (x - 12) + '" y="' + (y - 4) + '" width="24" height="8" rx="3" fill="' + C.light + '"/>'; };
        return function (x, y, m) { return face(x, y, m * 0.3, cols[(r * 2 + c) % 5]); };
      }) + clock(250, 80, 34, 9, 0, { ring: C.purple }) + t(250, 140, 'IN · OUT', { fs: 13, fill: C.purple });
    },
    claim: function () {
      return ground(150, 168, 140) + phone(24, 50, 1.45) + shoe(96, 104, 1.15, C.red) + magnifier(150, 70, 0.9) +
        doc(214, 34, 1.05) + okCircle(268, 132, 13);
    },
    basics: function (L) {
      return ground(150, 168, 140) + calendar(20, 36, 1.35, '', { top: C.blue }) + doc(118, 40, 1.05) + stamp(160, 104, 15) +
        bubble(210, 46, 1.25, 'dots') + sparkle(200, 30, 7);
    },
    deadline: function (L) {
      return ground(150, 168, 140) + clock(94, 84, 56, 17, 0, { ring: C.red, hand: C.red }) + t(94, 164, L.today, { fs: 14, fill: C.red }) +
        person(226, 168, 0.95, { shirt: C.green, mood: 'happy', arms: 'up' }) + okCircle(270, 50, 13);
    },
    rollout: function (L) {
      return ground(150, 168, 140) + calendar(18, 40, 1.2, L.fri, { top: C.gold, fs: 14 }) + arrow(92, 96, 116, 96, C.gray, true) +
        calendar(122, 40, 1.2, '1', { top: C.teal, fs: 18 }) + arrow(196, 96, 218, 96, C.gray, true) + calendar(224, 40, 1.2, '2', { top: C.green, fs: 18 }) +
        okCircle(278, 132, 12);
    },
    cutover: function () {
      return ground(150, 168, 140) + calendar(16, 44, 1.15, '11/16', { top: C.teal, fs: 12 }) + calendar(118, 44, 1.15, '11/23', { top: C.blue, fs: 12 }) +
        calendar(220, 44, 1.15, '11/30', { top: C.green, fs: 12 }) + arrow(84, 96, 112, 96, C.gray, true) + arrow(186, 96, 214, 96, C.gray, true) + okCircle(276, 140, 12);
    },
    dncheck: function () {
      return ground(150, 168, 140) + doc(20, 36, 1.15) + t(46, 128, 'DN', { fs: 14, fill: C.navy }) + box(96, 92, 1.0) + arrow(70, 100, 92, 100, C.gray, true) +
        okCircle(160, 76, 13) + arrow(180, 110, 204, 110, C.gray, true) + store(206, 70, 0.95);
    },
    stocktake: function (L) {
      return ground(150, 168, 140) + warehouse(6, 74, 0.95) + clipboard(126, 50, 1.3, [1, 1, 1]) + calendar(206, 40, 1.15, L.monthEnd, { top: C.gold, fs: 11 }) + okCircle(270, 140, 12);
    },
    records: function () {
      return ground(150, 168, 140) + doc(18, 40, 1.0) + doc(46, 52, 1.0) + stamp(98, 118, 13) + arrow(122, 100, 150, 100, C.gray, true) +
        store(160, 66, 1.0) + shoe(198, 128, 0.55, C.gold) + okCircle(276, 52, 12);
    },
    onsite: function () {
      return ground(150, 168, 140) + doc(16, 40, 1.15, 'bars') + arrow(78, 100, 100, 100, C.gray, true) + store(104, 66, 0.9) +
        person(232, 168, 0.95, { shirt: C.gold, mood: 'happy', arms: 'up' }) + magnifier(250, 30, 0.8);
    },
    notice: function () {
      return ground(150, 168, 140) + calendar(24, 40, 1.4, '30', { top: C.purple, fs: 18 }) + bubble(122, 40, 1.3, 'dots') +
        person(236, 168, 0.95, { shirt: C.purple, mood: 'happy', arms: 'up' });
    },
    wording: function () {
      return ground(150, 168, 140) + phone(26, 50, 1.45) + bubble(98, 36, 1.2, 'dots') + robot(186, 56, 0.95) + okCircle(272, 140, 12);
    },
    receipt: function () {
      return ground(150, 168, 140) + box(20, 108, 1.0) + phone(98, 56, 1.3) + clock(214, 84, 40, 3, 0, { ring: C.gold }) + t(214, 150, '3–4', { fs: 14, fill: C.gold });
    },
    promo: function () {
      return ground(150, 168, 140) + '<rect x="24" y="30" width="110" height="70" rx="6" fill="#fff"' + sw(C.red, 3) + '/>' + t(79, 74, 'SALE', { fs: 24, fill: C.red, fw: 800 }) +
        '<rect x="74" y="100" width="8" height="64" fill="' + C.gray + '"/>' + person(196, 168, 0.95, { shirt: C.green, mood: 'happy', arms: 'up' }) + bubble(226, 30, 1.0, 'check');
    }
  });

  /* 「これまで」「これから」の小さな絵（120 × 92） */
  var MINI = {
    pile: function () { return person(36, 88, 0.82, { mood: 'worried', arms: 'head', shirt: C.gray }) + papers(66, 30, 0.95) + qmark(108, 16, 9); },
    wait: function () { return person(36, 88, 0.82, { mood: 'sad', shirt: C.gray }) + clock(90, 44, 22, 4, 40, { ring: C.red }); },
    search: function () { return person(36, 88, 0.82, { mood: 'worried', shirt: C.gray }) + magnifier(68, 24, 1) + qmark(108, 16, 9); },
    mess: function () { return person(36, 88, 0.82, { mood: 'worried', arms: 'head', shirt: C.gray }) + box(66, 50, 0.7) + box(84, 28, 0.6) + ngCircle(108, 16, 9); },
    late: function () { return person(36, 88, 0.82, { mood: 'sad', shirt: C.gray }) + truck(64, 54, 0.5, C.gray) + clock(104, 26, 13, 4, 40, { ring: C.red }); },
    check: function () { return person(36, 88, 0.82, { mood: 'happy', arms: 'up', shirt: C.green }) + clipboard(70, 20, 0.95, [1, 1, 1]); },
    calendar: function (L) { return person(36, 88, 0.82, { mood: 'happy', arms: 'up', shirt: C.green }) + calendar(66, 22, 0.85, L.mon, { top: C.green, fs: 12 }); },
    fast: function () { return person(36, 88, 0.82, { mood: 'happy', arms: 'up', shirt: C.green }) + truck(64, 50, 0.5, C.green) + okCircle(106, 22, 10); },
    ai: function () { return person(36, 88, 0.82, { mood: 'happy', shirt: C.green }) + robot(70, 14, 0.85); },
    money: function () { return person(36, 88, 0.82, { mood: 'happy', arms: 'up', shirt: C.green }) + coin(84, 34, 13) + coin(100, 60, 11) + tag(64, 64, 0.55, '%', C.gold); },
    table: function () { return person(36, 88, 0.82, { mood: 'happy', shirt: C.green }) + tableGrid(64, 18, 50, 46, 4, 3, function (r, c) { return function (x, y, m) { return face(x, y, m * 0.32, [C.blue, C.gold, C.purple][c]); }; }); },
    timer: function () { return person(36, 88, 0.82, { mood: 'happy', arms: 'up', shirt: C.green }) + stopwatch(92, 46, 20); }
  };

  /* 手順の小さなアイコン（48 × 48） */
  var ICON = {
    pos: function () { return pos(6, 4, 0.6); },
    pay: function () { return card(4, 8, 0.6) + qr(20, 20, 0.75); },
    search: function () { return magnifier(6, 6, 0.75); },
    check: function () { return clipboard(10, 4, 0.62, [1, 1, 1]); },
    list: function () { return doc(12, 6, 0.6); },
    box: function () { return box(4, 10, 0.75); },
    stamp: function () { return doc(6, 6, 0.55) + stamp(32, 32, 11); },
    data: function () { return '<ellipse cx="24" cy="12" rx="16" ry="6" fill="' + C.blue + '"/><path d="M8 12 v22 a16 6 0 0 0 32 0 v-22" fill="' + C.sky + '"' + sw(C.blue, 2.5) + '/><path d="M8 23 a16 6 0 0 0 32 0"' + sw(C.blue, 2) + 'fill="none"/>'; },
    store: function () { return store(2, 2, 0.44); },
    truck: function () { return truck(2, 14, 0.42, C.teal); },
    load: function () { return box(2, 14, 0.5) + truck(18, 22, 0.28, C.teal); },
    booth: function () { return booth(2, 8, 0.37); },
    count: function () { return clipboard(12, 4, 0.62, [1, 1, 0]); },
    cal: function () { return calendar(5, 4, 0.68, '', { top: C.blue }); },
    chat: function () { return bubble(2, 4, 0.85, 'dots'); },
    clock: function () { return clock(24, 24, 18, 10, 10, { ring: C.navy }); },
    claim: function () { return phone(6, 4, 0.66) + shoe(22, 22, 0.42, C.red); },
    face: function () { return face(24, 26, 18, C.blue); },
    dl: function () { return doc(10, 4, 0.55) + '<path d="M34 22 v16 M27 31 l7 8 l7 -8"' + sw(C.green, 3.5) + 'fill="none"/>'; },
    ai: function () { return robot(8, 4, 0.55); },
    chart: function () { return doc(10, 4, 0.6, 'bars'); },
    paste: function () { return clipboard(6, 6, 0.55, [1, 1, 1]) + doc(24, 18, 0.38); },
    phone: function () { return phone(13, 4, 0.66); },
    gear: function () {
      var b = ''; for (var i = 0; i < 8; i++) b += '<rect x="21" y="5" width="6" height="9" rx="1.5" fill="' + C.gray + '" transform="rotate(' + (i * 45) + ' 24 24)"/>';
      return b + '<circle cx="24" cy="24" r="12" fill="' + C.gray + '"/><circle cx="24" cy="24" r="5" fill="#fff"/>';
    },
    type: function () {
      var b = '<rect x="3" y="14" width="42" height="24" rx="4" fill="' + C.light + '"' + sw(C.navy, 2) + '/>';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) b += '<rect x="' + (7 + c * 6.2) + '" y="' + (18 + r * 6) + '" width="4.6" height="4" rx="1" fill="' + C.navy + '" opacity=".75"/>';
      return b + '<path d="M30 4 l6 6 l-14 14 l-7 1 l1 -7z" fill="' + C.gold + '"' + sw(C.ink, 1.2) + '/>';
    },
    xls: function () {
      var b = '<rect x="6" y="6" width="36" height="36" rx="4" fill="#fff"' + sw('#1d7a45', 2.5) + '/><rect x="6" y="6" width="36" height="9" rx="3" fill="#1d7a45"/>';
      for (var r = 0; r < 3; r++) b += '<line x1="6" y1="' + (24 + r * 6) + '" x2="42" y2="' + (24 + r * 6) + '"' + sw('#9ccfb1', 1.2) + '/>';
      return b + '<line x1="18" y1="15" x2="18" y2="42"' + sw('#9ccfb1', 1.2) + '/><line x1="30" y1="15" x2="30" y2="42"' + sw('#9ccfb1', 1.2) + '/>';
    },
    pen: function () { return '<path d="M34 6 l8 8 l-22 22 l-11 3 l3 -11z" fill="' + C.gold + '"' + sw(C.ink, 1.6) + '/><path d="M12 28 l8 8"' + sw(C.ink, 1.6) + '/>'; },
    paper: function () { return papers(0, 2, 0.92); },
    calc: function () {
      var b = '<rect x="10" y="4" width="28" height="40" rx="4" fill="' + C.navy + '"/><rect x="14" y="8" width="20" height="9" rx="2" fill="' + C.sky + '"/>';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) b += '<rect x="' + (14 + c * 7) + '" y="' + (21 + r * 7) + '" width="5.5" height="5" rx="1" fill="#fff"/>';
      return b;
    },
    two: function () { return face(16, 26, 12, C.gray) + face(32, 26, 12, C.gray); },
    bank: function () {
      return '<path d="M4 18 L24 6 L44 18z" fill="' + C.navy + '"/><rect x="6" y="38" width="36" height="5" rx="1" fill="' + C.navy + '"/>' +
        '<rect x="10" y="20" width="5" height="17" fill="' + C.blue + '"/><rect x="21.5" y="20" width="5" height="17" fill="' + C.blue + '"/><rect x="33" y="20" width="5" height="17" fill="' + C.blue + '"/>' + t(24, 16, '฿', { fs: 8, fill: '#fff' });
    },
    sort: function () {
      return '<rect x="4" y="6" width="17" height="15" rx="3" fill="' + C.green + '"/><rect x="27" y="6" width="17" height="15" rx="3" fill="' + C.gold + '"/>' +
        '<rect x="4" y="27" width="17" height="15" rx="3" fill="' + C.red + '"/><rect x="27" y="27" width="17" height="15" rx="3" fill="' + C.gray + '"/>';
    }
  };

  /* ======================= 文言（3 言語） ======================= */
  var UI = {
    ja: {
      kicker: 'イラストで見る 業務改善', before: 'これまで', after: 'これから', how: 'やり方', check: 'チェック',
      howToRead: 'このマニュアルの見方', legendBefore: '困っていたこと', legendAfter: '新しいやり方', legendCheck: 'できているかの確認',
      areas: '改善する 5 つのエリア', chapter: function (n) { return '第 ' + n + ' 章'; }, appendix: '付録', inReview: '内容確認中',
      textNote: 'くわしい説明は右上の「文章」で見られます。', confidential: '社内資料・取り扱い注意',
      am: '朝', today: '今日', hours: '2 名がこの作業にかける時間（1 か月 = 21 営業日）', perMonthU: '時間 / 月', nowWay: '今のやり方', newWay: '変えた後', hbNow: '今', hbNew: '変えた後', perDay: function (m) { return '1 日あたり 約 ' + m + ' 分 短縮（2 名合計）'; }, monthEnd: '月末', monThu: '月・木', fri: '金', ours: '自社', bizDays: '営業日', mon: '月', minus1: '前日', handbook: '手順書', perPair: '1 足あたり'
    },
    en: {
      kicker: 'Process improvement, in pictures', before: 'Before', after: 'From now on', how: 'How', check: 'Check',
      howToRead: 'How to read this manual', legendBefore: 'What went wrong', legendAfter: 'The new way', legendCheck: 'How we know it works',
      areas: '5 areas we are improving', chapter: function (n) { return 'Chapter ' + n; }, appendix: 'Appendix', inReview: 'Being confirmed',
      textNote: 'For full details, switch to “Text” at the top right.', confidential: 'Internal use only',
      am: 'AM', today: 'Today', hours: 'Time 2 people spend on this a month (21 working days)', perMonthU: 'hours / month', nowWay: 'The way it is now', newWay: 'The new way', hbNow: 'Now', hbNew: 'New way', perDay: function (m) { return 'About ' + m + ' min saved a day (2 people)'; }, monthEnd: 'END', monThu: 'MON·THU', fri: 'FRI', ours: 'Ours', bizDays: 'business days', mon: 'MON', minus1: '−1 day', handbook: 'Handbook', perPair: 'per pair'
    },
    th: {
      kicker: 'ปรับปรุงการทำงาน ดูเข้าใจง่ายด้วยภาพ', before: 'แบบเดิม', after: 'แบบใหม่', how: 'วิธีทำ', check: 'ตรวจสอบ',
      howToRead: 'วิธีอ่านคู่มือนี้', legendBefore: 'ปัญหาที่เคยเกิด', legendAfter: 'วิธีทำงานแบบใหม่', legendCheck: 'ดูว่าทำได้จริงหรือไม่',
      areas: '5 ส่วนงานที่จะปรับปรุง', chapter: function (n) { return 'บทที่ ' + n; }, appendix: 'ภาคผนวก', inReview: 'อยู่ระหว่างตรวจสอบ',
      textNote: 'ดูรายละเอียดทั้งหมดได้ที่ปุ่ม “ข้อความ” มุมขวาบน', confidential: 'เอกสารใช้ภายในบริษัท',
      am: 'เช้า', today: 'วันนี้', hours: 'เวลาที่ 2 คนใช้กับงานนี้ต่อเดือน (21 วันทำการ)', perMonthU: 'ชั่วโมง / เดือน', nowWay: 'วิธีที่ทำอยู่ตอนนี้', newWay: 'วิธีใหม่', hbNow: 'ตอนนี้', hbNew: 'วิธีใหม่', perDay: function (m) { return 'ลดได้ประมาณ ' + m + ' นาทีต่อวัน (2 คนรวมกัน)'; }, monthEnd: 'สิ้นเดือน', monThu: 'จ.·พฤ.', fri: 'ศ.', ours: 'ของเรา', bizDays: 'วันทำการ', mon: 'จ.', minus1: '−1 วัน', handbook: 'คู่มือ', perPair: 'ต่อ 1 คู่'
    }
  };

  // 章
  var CHAPTERS = [
    { icon: 'pos', t: { ja: '経理', en: 'Accounting', th: 'บัญชี' },
      d: null,
      kpi: { v: '59.4', per: 'NEE 31.4h / NUT 28.0h',
        u: { ja: '時間 / 月 減らせる見込み', en: 'hours a month saved (expected)', th: 'ชั่วโมงต่อเดือนที่คาดว่าลดได้' },
        l: { ja: '2 名で月 193.6 時間の 31%。空いた約 52.5 時間 / 月は、毎日の照合・毎月の元帳・棚卸し・月次レポートへ', en: '31% of 193.6 hours a month (2 people). The freed ~52.5 hours a month go to daily checks, monthly ledgers, stock counts and the monthly report', th: '31% ของ 193.6 ชั่วโมงต่อเดือน (2 คน) เวลาที่ได้คืนประมาณ 52.5 ชั่วโมงต่อเดือน ใช้กับการตรวจรายวัน บัญชีรายเดือน นับสต็อก และรายงานประจำเดือน' },
        per2: 'NEE 104.8h / NUT 88.8h', base: '193.6h',
        notes: [
          { ja: '作業時間：NUT・NEE の Daily Report（2/11〜4/3）から、決算書関連の業務を除いた時間で算出', en: 'Work hours: from NUT’s and NEE’s Daily Reports (11 Feb – 3 Apr), excluding year-end closing work', th: 'ชั่วโมงทำงาน: จาก Daily Report ของ NUT และ NEE (11 ก.พ. – 3 เม.ย.) ไม่รวมงานปิดงบ' },
          { ja: '削減見込み：Daily Report を AI が分析して出した推定', en: 'Expected saving: an estimate from AI analysis of the Daily Reports', th: 'ที่คาดว่าลดได้: ประมาณการจากการวิเคราะห์ Daily Report ด้วย AI' },
          { ja: '1 か月 = 21 営業日（今月の営業日数）で換算', en: '1 month = 21 working days (this month’s count)', th: '1 เดือน = 21 วันทำการ (จำนวนวันทำการเดือนนี้)' }] } },
    { icon: 'truck', t: { ja: '店舗・イベント・オンライン物流', en: 'Store, Event & Online Logistics', th: 'โลจิสติกส์ร้านค้า อีเวนต์ และออนไลน์' },
      d: { ja: '商品の動きをオフィスが計画的に管理', en: 'The office plans how stock moves', th: 'ออฟฟิศวางแผนการเคลื่อนย้ายสินค้า' } },
    { icon: 'box', t: { ja: '在庫・倉庫・QC', en: 'Stock, Warehouse & QC', th: 'สต็อก คลังสินค้า และ QC' },
      d: { ja: '在庫は Zort で管理、QC は基準どおり', en: 'Stock in Zort, QC by the standard', th: 'สต็อกใน Zort และ QC ตามมาตรฐาน' } },
    { icon: 'check', t: { ja: 'HR・PC 管理', en: 'HR & PC Management', th: 'HR และการดูแล PC' },
      d: { ja: 'だれが・いつ・どこに入るかを見える化', en: 'Show who works where, and when', th: 'เห็นชัดว่าใคร อยู่ที่ไหน เมื่อไร' } },
    { icon: 'claim', t: { ja: 'EC・顧客対応', en: 'E-commerce & Customer Service', th: 'อีคอมเมิร์ซและบริการลูกค้า' },
      d: { ja: 'クレームは証明がそろってから', en: 'Claims only with full proof', th: 'รับเคลมเมื่อหลักฐานครบ' } },
    { icon: 'clean', t: { ja: '全体', en: 'Company-wide', th: 'ทั้งบริษัท' },
      d: { ja: '全員で守るルールと進め方', en: 'Rules for everyone, and the roll-out', th: 'กฎที่ทุกคนต้องทำ และขั้นตอนเริ่มใช้' } }
  ];

  // 項目
  var ITEMS = [
    /* ---------- 第 1 章 経理 ---------- */
    { ch: 0, scene: 'pos', bm: 'pile', am: 'check',
      t: { ja: '売上の毎日照合と返金メモ', en: 'Daily sales check & refund memos', th: 'กระทบยอดขายทุกวัน และบันทึกคืนเงิน' },
      when: { ja: '毎朝（11 月 4 日から）', en: 'Every morning (from 4 Nov)', th: 'ทุกเช้า (ตั้งแต่ 4 พ.ย.)' },
      b: { ja: '確認は毎週月曜だけ。ずれに気づくのが遅く、E-Tax は最大約 1 週間待ち', en: 'Checked only on Mondays — gaps found late, E-Tax took up to a week', th: 'ตรวจแค่ทุกวันจันทร์ เจอส่วนต่างช้า และ E-Tax รอได้ถึงประมาณ 1 สัปดาห์' },
      a: { ja: '毎朝、前日の店舗・イベントの売上を照合', en: 'Every morning, check yesterday’s store and event sales', th: 'ทุกเช้า กระทบยอดของเมื่อวาน ทั้งหน้าร้านและอีเวนต์' },
      steps: [
        ['pos', { ja: 'POS と端末・QR 入金を比べて記録', en: 'POS vs. terminal & QR — record it', th: 'เทียบ POS กับเครื่องรูดและ QR แล้วบันทึก' }],
        ['search', { ja: 'QR とカードの誤入力・他店の混入を確認', en: 'Look for QR/card mix-ups and other stores’ sales', th: 'ตรวจ QR กับบัตรสลับกัน และยอดร้านอื่นปน' }],
        ['list', { ja: 'E-Tax は 1〜2 営業日で発行', en: 'Issue E-Tax within 1–2 working days', th: 'ออก E-Tax ภายใน 1–2 วันทำการ' }],
        ['check', { ja: 'その日のうちに店舗へ確認', en: 'Ask the store the same day', th: 'สอบถามร้านภายในวัน' }],
        ['pay', { ja: '返金・振替はすぐメモ → 金曜の支払いへ', en: 'Refund or transfer: memo now → Friday payments', th: 'คืนเงินหรือโอน: ทำบันทึกทันที → รอบจ่ายวันศุกร์' }]],
      c: { ja: 'ずれに翌営業日に気づく・E-Tax は 1〜2 営業日・返金は Refund Log へ', en: 'Gaps found the next working day · E-Tax in 1–2 days · refunds in the Refund Log', th: 'เจอส่วนต่างภายในวันทำการถัดไป · E-Tax ภายใน 1–2 วัน · คืนเงินบันทึกใน Refund Log' } },
    { ch: 0, scene: 'input', bm: 'pile', am: 'ai',
      t: { ja: '手入力を「取り込む・読む・貼る」に', en: 'Import, read, paste — not type', th: 'เลิกคีย์มือ: นำเข้า อ่าน วาง' },
      b: { ja: '手入力と二重確認が多く、売上の確認は週 1 回だけ', en: 'Lots of typing and double checks — sales checked only weekly', th: 'คีย์มือและตรวจซ้ำมาก ตรวจยอดขายได้แค่สัปดาห์ละครั้ง' },
      a: { ja: '①〜⑦を新しいやり方で。空いた時間は品質の確認へ', en: 'Do ①–⑦ the new way; the time saved goes to quality checks', th: 'ทำ ①–⑦ ด้วยวิธีใหม่ เวลาที่ได้คืนใช้ตรวจคุณภาพ' },
      cards: [
        ['bank', { ja: '① 銀行', en: '① Bank', th: '① ธนาคาร' }, { ja: '明細を取り込み、AI の候補を確認', en: 'Import statements, check AI matches', th: 'นำเข้ารายการ แล้วตรวจคู่ที่ AI เสนอ' }, 40.5, 17.7],
        ['chart', { ja: '② Sales Record', en: '② Sales Record', th: '② Sales Record' }, { ja: 'POS レポートを貼る', en: 'Paste the POS report', th: 'วางรายงาน POS' }, 8.1, 3.2],
        ['sort', { ja: '③ Shopee・Lazada', en: '③ Shopee · Lazada', th: '③ Shopee · Lazada' }, { ja: 'マクロで照合、番号は PEAK で', en: 'Match with a macro; PEAK numbers them', th: 'ตรวจด้วยแมโคร ให้ PEAK ออกเลข' }, 34.1, 14.4],
        ['ai', { ja: '④ 経費・仕入 VAT', en: '④ Expenses · purchase VAT', th: '④ ค่าใช้จ่าย · VAT ซื้อ' }, { ja: 'AI で読み取る', en: 'Read with AI', th: 'ให้ AI อ่านเอกสาร' }, 61.7, 33.5],
        ['store', { ja: '⑤ 百貨店', en: '⑤ Department stores', th: '⑤ ห้างสรรพสินค้า' }, { ja: 'SKU 対応表と突合表', en: 'SKU mapping + matching sheet', th: 'ตารางจับคู่ SKU + ตารางกระทบยอด' }, 16.4, 8.0],
        ['gear', { ja: '⑥ 定型書類', en: '⑥ Routine documents', th: '⑥ เอกสารประจำ' }, { ja: 'Excel で一括取込', en: 'Bulk import from Excel', th: 'นำเข้าจาก Excel ทีเดียว' }, 26.8, 16.0],
        ['paper', { ja: '⑦ 紙', en: '⑦ Paper', th: '⑦ กระดาษ' }, { ja: '必要な書類だけ紙で', en: 'Paper only where required', th: 'ใช้กระดาษเฉพาะที่จำเป็น' }, 41.7, 29.1]],
      c: { ja: '結果が今のやり方と同じか・作業時間が減ったか', en: 'Results match the old way · less work time', th: 'ผลตรงกับวิธีเดิมไหม · เวลาทำงานลดลงไหม' } },
    { ch: 0, cont: true, mark: '①', scene: 'input',
      t: { ja: '① 銀行：明細を取り込み、AI の候補で照合', en: '① Bank: import statements, match with AI', th: '① ธนาคาร: นำเข้ารายการ แล้วกระทบยอดด้วย AI' },
      detail: { h: '40.5h → 17.7h',
        ni: ['type', 'store', 'xls', 'pen'],
        ns: [{ ja: '手で入力', en: 'Typed by hand', th: 'คีย์เอง' }, { ja: '店舗分も別に入力', en: 'Stores typed separately', th: 'คีย์ยอดร้านแยก' }, { ja: '数か月まとめて照合', en: 'Months matched at once', th: 'กระทบยอดรวมหลายเดือน' }, { ja: 'PEAK で手直し', en: 'Fixed by hand in PEAK', th: 'แก้เองใน PEAK' }],
        as: [{ ja: 'ダウンロード', en: 'Download', th: 'ดาวน์โหลด' }, { ja: 'PEAK に取込', en: 'Import to PEAK', th: 'นำเข้า PEAK' }, { ja: 'AI の候補を確定', en: 'Confirm AI matches', th: 'ยืนยันคู่จาก AI' }, { ja: '合わない分だけ調査', en: 'Check mismatches only', th: 'ตรวจเฉพาะที่ไม่ตรง' }, { ja: '月末に残高確認', en: 'Month-end balance check', th: 'ตรวจยอดสิ้นเดือน' }],
        now: [{ ja: '銀行明細を見て、入金額を手で入力', en: 'Type deposits in by hand from the statement', th: 'ดูรายการเดินบัญชีแล้วคีย์ยอดเงินเข้าเอง' },
          { ja: '店舗の入金も別に入力', en: 'Enter store deposits separately', th: 'คีย์เงินเข้าจากร้านแยกอีกรอบ' },
          { ja: '2〜3 か月分をまとめて Excel で照合', en: 'Match 2–3 months at once in Excel', th: 'กระทบยอด 2–3 เดือนรวมกันใน Excel' },
          { ja: '合わない金額を PEAK で修正', en: 'Fix mismatches in PEAK', th: 'แก้ยอดที่ไม่ตรงใน PEAK' }],
        after: [
          [{ ja: '毎週月曜の午前', en: 'Monday morning', th: 'เช้าวันจันทร์' }, { ja: '前週分の明細を口座ごとにダウンロード（KBank は PDF、BBL は CSV）', en: 'Download last week’s statement for each account (KBank PDF, BBL CSV)', th: 'ดาวน์โหลดรายการสัปดาห์ก่อนทุกบัญชี (KBank เป็น PDF, BBL เป็น CSV)' }, 'dl'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'PEAK の銀行ファイル取込に入れ、AI 照合を選ぶ', en: 'Import into PEAK’s bank file import; choose AI matching', th: 'นำเข้าไฟล์ธนาคารใน PEAK เลือกกระทบยอดด้วย AI' }, 'data'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'AI の一致候補を見て、正しいものをまとめて確定', en: 'Review AI matches and confirm the right ones together', th: 'ดูคู่ที่ AI เสนอ แล้วยืนยันรายการที่ถูกทั้งหมด' }, 'ai'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '合わない分だけ原因を調べる（店舗入金は POS の売上で確認）', en: 'Look into mismatches only (check store deposits against POS sales)', th: 'หาสาเหตุเฉพาะรายการที่ไม่ตรง (เงินเข้าจากร้านเทียบกับยอด POS)' }, 'search'],
          [{ ja: '月末', en: 'Month-end', th: 'สิ้นเดือน' }, { ja: '照合レポートで残高が明細と合うか確認（作る人と確かめる人は別）', en: 'Check the balance against the statement in the report (maker and checker differ)', th: 'ตรวจยอดคงเหลือกับรายการเดินบัญชีในรายงาน (คนทำกับคนตรวจเป็นคนละคน)' }, 'check']],
        note: { ja: '2〜3 か月分をまとめる処理がなくなり、決算の照合も減ります', en: 'No more batching 2–3 months; year-end matching shrinks too', th: 'ไม่ต้องรวม 2–3 เดือนอีก งานกระทบยอดตอนปิดงบก็ลดลง' } } },
    { ch: 0, cont: true, mark: '②', scene: 'input',
      t: { ja: '② Sales Record：POS レポートを貼るだけ', en: '② Sales Record: just paste the POS report', th: '② Sales Record: แค่วางรายงาน POS' },
      detail: { h: '8.1h → 3.2h',
        ni: ['paper', 'calc', 'type'],
        ns: [{ ja: 'レシートを集める', en: 'Collect receipts', th: 'รวบรวมใบเสร็จ' }, { ja: '店舗別に集計', en: 'Total by store', th: 'รวมยอดตามร้าน' }, { ja: '3〜4 店を手入力', en: 'Type 3–4 stores', th: 'คีย์ 3–4 ร้าน' }],
        as: [{ ja: 'Zort から出力', en: 'Export from Zort', th: 'ส่งออกจาก Zort' }, { ja: 'シートに貼る', en: 'Paste into the sheet', th: 'วางลงชีต' }, { ja: '自動で集計', en: 'Totals made for you', th: 'สรุปยอดอัตโนมัติ' }],
        now: [{ ja: '店舗ごとの EDC 伝票やレシートを集める', en: 'Collect EDC slips and receipts from each store', th: 'รวบรวมสลิป EDC และใบเสร็จของแต่ละร้าน' },
          { ja: '店舗別に集計する', en: 'Total them by store', th: 'รวมยอดแยกตามร้าน' },
          { ja: 'スプレッドシートに 3〜4 店分を入力', en: 'Type 3–4 stores into the spreadsheet', th: 'คีย์ 3–4 ร้านลงสเปรดชีต' }],
        after: [
          [{ ja: '毎日', en: 'Daily', th: 'ทุกวัน' }, { ja: 'Zort の Report → Sales から前日分を Excel で出力', en: 'Export yesterday from Zort Report → Sales to Excel', th: 'ส่งออกยอดเมื่อวานจาก Zort Report → Sales เป็น Excel' }, 'pos'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'シートに貼る。手入力はしない', en: 'Paste it into the sheet — no typing', th: 'วางลงชีต ไม่ต้องคีย์' }, 'paste'],
          [{ ja: '自動', en: 'Automatic', th: 'อัตโนมัติ' }, { ja: '店舗別・支払方法別に集計される。イベントも同じ表に', en: 'Totals by store and payment type appear; events go in the same sheet', th: 'สรุปตามร้านและวิธีชำระเงินให้เอง อีเวนต์อยู่ในตารางเดียวกัน' }, 'chart']],
        note: { ja: 'Zort の POS レポートに店舗別・支払方法別が出るかは確認中', en: 'Still checking that Zort’s POS report splits by store and payment type', th: 'กำลังตรวจว่ารายงาน POS ของ Zort แยกตามร้านและวิธีชำระได้หรือไม่' } } },
    { ch: 0, cont: true, mark: '③', scene: 'input',
      t: { ja: '③ Shopee・Lazada：マクロで照合、番号は PEAK で', en: '③ Shopee · Lazada: macro matching, PEAK numbering', th: '③ Shopee · Lazada: ตรวจด้วยแมโคร PEAK ออกเลข' },
      detail: { h: '34.1h → 14.4h',
        ni: ['xls', 'pay', 'pen', 'ng'],
        ns: [{ ja: 'Excel で突き合わせ', en: 'Matched in Excel', th: 'เทียบใน Excel' }, { ja: '入金を照合', en: 'Payouts matched', th: 'เทียบเงินเข้า' }, { ja: '番号を 1 件ずつ修正', en: 'Numbers fixed one by one', th: 'แก้เลขทีละรายการ' }, { ja: '重複を手で取消', en: 'Duplicates cancelled by hand', th: 'ยกเลิกรายการซ้ำเอง' }],
        as: [{ ja: 'データを出力', en: 'Export data', th: 'ส่งออกข้อมูล' }, { ja: 'マクロ実行', en: 'Run the macro', th: 'รันแมโคร' }, { ja: '4 つに自動で分類', en: 'Sorted into 4', th: 'แยก 4 กลุ่มอัตโนมัติ' }, { ja: '差異だけ確認', en: 'Check gaps only', th: 'ตรวจเฉพาะส่วนต่าง' }, { ja: 'PEAK が番号を振る', en: 'PEAK numbers them', th: 'PEAK ออกเลข' }, { ja: 'VAT 合計を確認', en: 'Check VAT totals', th: 'ตรวจยอด VAT' }],
        now: [{ ja: '売上・費用・入金を Excel で突き合わせる', en: 'Match sales, fees and payments in Excel', th: 'เทียบยอดขาย ค่าธรรมเนียม และเงินเข้าใน Excel' },
          { ja: '銀行明細と入金額を照合', en: 'Match payments to the bank statement', th: 'เทียบเงินเข้ากับรายการเดินบัญชี' },
          { ja: '月 215〜258 件の番号を 1 件ずつ直す', en: 'Fix 215–258 numbers one by one each month', th: 'แก้เลข 215–258 รายการทีละรายการทุกเดือน' },
          { ja: '重複が来たら手で取り消す', en: 'Cancel duplicates by hand', th: 'ยกเลิกรายการซ้ำเอง' }],
        after: [
          [{ ja: '毎月 15 日ごろ', en: 'Around the 15th', th: 'ประมาณวันที่ 15' }, { ja: '注文・入金データと銀行明細を出力', en: 'Export orders, payouts and the bank statement', th: 'ส่งออกข้อมูลออเดอร์ เงินเข้า และรายการธนาคาร' }, 'dl'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '月別フォルダに保存し、マクロを実行', en: 'Save in the month’s folder and run the macro', th: 'บันทึกในโฟลเดอร์ของเดือน แล้วรันแมโคร' }, 'gear'],
          [{ ja: 'マクロ', en: 'Macro', th: 'แมโคร' }, { ja: '一致・金額差異・未入金・重複に分ける', en: 'Sorts into matched, amount gap, unpaid, duplicate', th: 'แยกเป็น ตรงกัน ยอดต่าง ยังไม่ได้รับเงิน และซ้ำ' }, 'sort'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '差異と未入金だけ確認し、原因を書く', en: 'Check only gaps and unpaid; write the cause', th: 'ตรวจเฉพาะส่วนต่างและยังไม่ได้รับเงิน เขียนสาเหตุ' }, 'search'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'PEAK へ送り、番号は PEAK が振る（Zort の番号は変えない）', en: 'Send to PEAK; PEAK numbers them (Zort numbers stay)', th: 'ส่งเข้า PEAK ให้ PEAK ออกเลข (ไม่แก้เลขใน Zort)' }, 'stamp'],
          [{ ja: 'PP.30 の前', en: 'Before PP.30', th: 'ก่อน ภ.พ.30' }, { ja: 'PEAK TAX の売上 VAT 報告書で合計を確認', en: 'Check totals in the PEAK TAX sales VAT report', th: 'ตรวจยอดรวมในรายงาน VAT ขายของ PEAK TAX' }, 'check']],
        note: { ja: 'PEAK の採番で日付順の連番になるかは確認中', en: 'Still checking PEAK numbering keeps date order', th: 'กำลังตรวจว่า PEAK ออกเลขเรียงตามวันที่ได้หรือไม่' } } },
    { ch: 0, cont: true, mark: '④', scene: 'input',
      t: { ja: '④ 経費・仕入 VAT：AI で読み取る', en: '④ Expenses · purchase VAT: read with AI', th: '④ ค่าใช้จ่าย · VAT ซื้อ: ให้ AI อ่าน' },
      detail: { h: '61.7h → 33.5h',
        ni: ['paper', 'xls', 'two'],
        ns: [{ ja: '紙を見て手入力', en: 'Typed from paper', th: 'คีย์จากกระดาษ' }, { ja: 'Excel で報告書', en: 'Report built in Excel', th: 'ทำรายงานใน Excel' }, { ja: '2 人で全件確認', en: 'Two people check all', th: 'สองคนตรวจทุกใบ' }],
        as: [{ ja: 'File Vault へ', en: 'Into File Vault', th: 'ใส่ File Vault' }, { ja: 'AI が読み取る', en: 'AI reads it', th: 'AI อ่านเอกสาร' }, { ja: '原本と見比べる', en: 'Compare with original', th: 'เทียบต้นฉบับ' }, { ja: '科目を確定', en: 'Set the account', th: 'กำหนดบัญชี' }, { ja: 'PP.30 を出力', en: 'Output PP.30', th: 'ออก ภ.พ.30' }, { ja: '2 人目は一部だけ', en: 'Second check: some only', th: 'คนที่สองตรวจบางส่วน' }],
        now: [{ ja: '紙の請求書を見て支払伝票を手で入力', en: 'Type payment vouchers from paper invoices', th: 'ดูใบแจ้งหนี้กระดาษแล้วคีย์ใบสำคัญจ่าย' },
          { ja: '仕入 VAT 報告書を Excel で作る', en: 'Build the purchase VAT report in Excel', th: 'ทำรายงาน VAT ซื้อใน Excel' },
          { ja: '2 人が同じ書類を全件確認', en: 'Two people check every document', th: 'สองคนตรวจเอกสารเดียวกันทุกใบ' }],
        after: [
          [{ ja: '届いた日', en: 'Day it arrives', th: 'วันที่ได้รับ' }, { ja: '書類を File Vault へ（PC・アプリ・LINE）', en: 'Put it in File Vault (PC, app or LINE)', th: 'ใส่เอกสารใน File Vault (PC แอป หรือ LINE)' }, 'phone'],
          [{ ja: '週 2 回', en: 'Twice a week', th: 'สัปดาห์ละ 2 ครั้ง' }, { ja: 'SMART Key が番号・明細・取引先を読み取る', en: 'SMART Key reads the number, lines and supplier', th: 'SMART Key อ่านเลขที่ รายการ และคู่ค้า' }, 'ai'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '原本と入力欄を同じ画面で確認し、オレンジの警告を消す', en: 'Compare original and fields side by side; clear orange warnings', th: 'เทียบต้นฉบับกับช่องกรอกในหน้าเดียว แก้คำเตือนสีส้ม' }, 'search'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '勘定科目を確定して記録', en: 'Fix the account and record it', th: 'กำหนดผังบัญชีแล้วบันทึก' }, 'stamp'],
          [{ ja: '毎月 19〜20 日', en: '19th–20th', th: 'วันที่ 19–20' }, { ja: 'PEAK TAX で PP.30 と仕入税の報告書を出力', en: 'Make PP.30 and the purchase tax report in PEAK TAX', th: 'ออก ภ.พ.30 และรายงานภาษีซื้อใน PEAK TAX' }, 'list'],
          [{ ja: '毎月 20〜21 日', en: '20th–21st', th: 'วันที่ 20–21' }, { ja: '2 人目は高額・新規取引先・抜き取りだけ確認', en: 'The second check covers only large, new-supplier and sampled items', th: 'คนที่สองตรวจเฉพาะยอดสูง คู่ค้าใหม่ และสุ่มตรวจ' }, 'face']],
        note: { ja: '2 人目の確認を絞るのは B-Like が認めたあと', en: 'The second check is reduced only after B-Like agrees', th: 'ลดการตรวจของคนที่สองหลัง B-Like เห็นชอบเท่านั้น' } } },
    { ch: 0, cont: true, mark: '⑤', scene: 'sku',
      t: { ja: '⑤ 百貨店：SKU 対応表と突合表', en: '⑤ Department stores: SKU table & matching sheet', th: '⑤ ห้าง: ตารางจับคู่ SKU และตารางกระทบยอด' },
      detail: { h: '16.4h → 8.0h',
        ni: ['search', 'list', 'pen'],
        ns: [{ ja: 'SKU を 1 行ずつ確認', en: 'SKUs checked line by line', th: 'ตรวจ SKU ทีละบรรทัด' }, { ja: '店ごとに別データ', en: 'A file per store', th: 'ทำไฟล์แยกแต่ละห้าง' }, { ja: 'CN 前に手で確認', en: 'Hand-check before CN', th: 'ตรวจเองก่อนออก CN' }],
        as: [{ ja: '補充リスト受取', en: 'Get the restock list', th: 'รับรายการเติมของ' }, { ja: '貼ると自動作成', en: 'Paste → files made', th: 'วางแล้วได้ไฟล์' }, { ja: '赤い行だけ確認', en: 'Check red rows only', th: 'ตรวจแถวสีแดง' }, { ja: '納品書を発行', en: 'Issue delivery notes', th: 'ออกใบส่งของ' }, { ja: '差の分だけ CN', en: 'CN for the gap only', th: 'ออก CN ส่วนต่าง' }],
        now: [{ ja: '表記の違う SKU を 1 行ずつ確認', en: 'Check differently written SKUs line by line', th: 'ตรวจ SKU ที่เขียนต่างกันทีละบรรทัด' },
          { ja: 'Siam 用と Central 用のデータを別々に作る', en: 'Make Siam and Central data separately', th: 'ทำข้อมูลของ Siam และ Central แยกกัน' },
          { ja: 'CN の前に金額を手で確認', en: 'Check amounts by hand before each CN', th: 'ตรวจยอดเองก่อนออก CN' }],
        after: [
          [{ ja: '毎週水曜まで', en: 'By Wednesday', th: 'ภายในวันพุธ' }, { ja: '補充リスト（自社 SKU と数量）を受け取る', en: 'Receive the restock list (our SKU + quantity)', th: 'รับรายการเติมของ (SKU ของเรา + จำนวน)' }, 'list'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'Excel に貼ると Siam 用と SCON 用ができる', en: 'Paste into Excel — Siam and SCON files are made', th: 'วางใน Excel ได้ไฟล์ Siam และ SCON' }, 'data'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '赤い行だけ確認して対応表に追加', en: 'Check only red rows and add them to the table', th: 'ตรวจเฉพาะแถวสีแดง แล้วเพิ่มในตาราง' }, 'search'],
          [{ ja: '木曜の配送前', en: 'Before Thursday delivery', th: 'ก่อนส่งวันพฤหัสฯ' }, { ja: '納品書を発行（Siam は PO を依頼、Central は SCON へ）', en: 'Issue delivery notes (ask Siam for a PO; Central goes into SCON)', th: 'ออกใบส่งของ (ขอ PO จาก Siam, Central ใส่ใน SCON)' }, 'truck'],
          [{ ja: '売上報告が届いたら', en: 'When sales reports arrive', th: 'เมื่อได้รายงานยอดขาย' }, { ja: '貼って差を見て、差の分だけ CN を発行', en: 'Paste, see the difference, issue CN only for it', th: 'วางแล้วดูส่วนต่าง ออก CN เฉพาะส่วนต่าง' }, 'pay']],
        note: { ja: 'SKU 確認の時間はこれから測るので、削減はもっと大きくなる見込み', en: 'SKU-check time is not measured yet, so the saving should be larger', th: 'ยังไม่ได้วัดเวลาตรวจ SKU จึงคาดว่าลดได้มากกว่านี้' } } },
    { ch: 0, cont: true, mark: '⑥', scene: 'input',
      t: { ja: '⑥ 定型書類：Excel でまとめて取り込む', en: '⑥ Routine documents: bulk import from Excel', th: '⑥ เอกสารประจำ: นำเข้าจาก Excel ทีเดียว' },
      detail: { h: '26.8h → 16.0h',
        ni: ['type', 'list', 'pos'],
        ns: [{ ja: '費用を 1 件ずつ仕訳', en: 'Fees posted one by one', th: 'บันทึกค่าธรรมเนียมทีละรายการ' }, { ja: '請求書を 1 件ずつ', en: 'Invoices one by one', th: 'ใบแจ้งหนี้ทีละใบ' }, { ja: '画面で手入力', en: 'Typed on screen', th: 'คีย์บนหน้าจอ' }],
        as: [{ ja: '明細を集める', en: 'Gather statements', th: 'รวบรวมรายการ' }, { ja: 'マクロで変換', en: 'Convert by macro', th: 'แปลงด้วยแมโคร' }, { ja: '例外を確認', en: 'Check exceptions', th: 'ตรวจรายการพิเศษ' }, { ja: 'PEAK へ取込', en: 'Import to PEAK', th: 'นำเข้า PEAK' }, { ja: '確認して承認', en: 'Review & approve', th: 'ตรวจแล้วอนุมัติ' }],
        now: [{ ja: 'Shopee・Lazada・KBank の費用を 1 件ずつ仕訳', en: 'Post Shopee, Lazada and KBank fees one by one', th: 'บันทึกค่าธรรมเนียม Shopee Lazada KBank ทีละรายการ' },
          { ja: '委託先やグループ間の請求書を 1 件ずつ作る', en: 'Make consignment and group invoices one by one', th: 'ทำใบแจ้งหนี้ฝากขายและระหว่างกลุ่มทีละใบ' },
          { ja: '委託の売上や商品データを画面で入力', en: 'Type consignment sales and product data on screen', th: 'คีย์ยอดฝากขายและข้อมูลสินค้าบนหน้าจอ' }],
        after: [
          [{ ja: '月末〜月初', en: 'Month-end to start', th: 'สิ้นเดือนถึงต้นเดือน' }, { ja: '費用明細と、委託・グループ間の売上を集める（③の結果を使う）', en: 'Gather fee statements and consignment/group sales (use ③’s results)', th: 'รวบรวมรายการค่าธรรมเนียม และยอดฝากขาย/ระหว่างกลุ่ม (ใช้ผลจาก ③)' }, 'list'],
          [{ ja: 'マクロ', en: 'Macro', th: 'แมโคร' }, { ja: 'PEAK の取込用 Excel に変える', en: 'Turns them into PEAK’s import Excel', th: 'แปลงเป็น Excel สำหรับนำเข้า PEAK' }, 'gear'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: '合計と色の付いた例外を確認（税務の書類は人が確定）', en: 'Check totals and coloured exceptions (people confirm tax documents)', th: 'ตรวจยอดรวมและรายการที่มีสี (เอกสารภาษีให้คนยืนยัน)' }, 'search'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'PEAK へ取り込む', en: 'Import into PEAK', th: 'นำเข้า PEAK' }, 'data'],
          [{ ja: '続けて', en: 'Then', th: 'ต่อจากนั้น' }, { ja: 'できた書類を確認して承認', en: 'Review the documents and approve', th: 'ตรวจเอกสารที่ได้แล้วอนุมัติ' }, 'stamp']],
        note: { ja: '源泉徴収票と E-Tax は社外へ出す書類なので、今回は変えない', en: 'Withholding certificates and E-Tax go to outside parties, so they stay as they are', th: 'หนังสือรับรองหัก ณ ที่จ่ายและ E-Tax ส่งออกภายนอก จึงยังไม่เปลี่ยน' } } },
    { ch: 0, scene: 'cutover', am: 'check',
      t: { ja: '切り替えは「並行」で', en: 'Switch over in parallel', th: 'เปลี่ยนแบบทำคู่กัน' },
      a: { ja: '試してから今のやり方と並行で回し、問題なければ本番へ', en: 'Try it, run it next to the old way, then go live if all is well', th: 'ทดลอง ทำคู่กับวิธีเดิม ถ้าไม่มีปัญหาจึงใช้จริง' },
      golive: [
        ['bank', { ja: '① 銀行', en: '① Bank', th: '① ธนาคาร' }, '11/23'],
        ['chart', { ja: '② Sales Record', en: '② Sales Record', th: '② Sales Record' }, '11/23'],
        ['sort', { ja: '③ Shopee・Lazada', en: '③ Shopee · Lazada', th: '③ Shopee · Lazada' }, { ja: '11月締め', en: 'Nov close', th: 'ปิด พ.ย.' }],
        ['ai', { ja: '④ 経費・仕入 VAT', en: '④ Expenses · VAT', th: '④ ค่าใช้จ่าย · VAT' }, '11/30'],
        ['store', { ja: '⑤ 百貨店', en: '⑤ Dept. stores', th: '⑤ ห้าง' }, '12/3', { ja: 'の納品から', en: 'delivery', th: 'รอบส่งของ' }],
        ['gear', { ja: '⑥ 定型書類', en: '⑥ Routine docs', th: '⑥ เอกสารประจำ' }, { ja: '12月分', en: 'Dec', th: 'ธ.ค.' }, { ja: 'の請求から', en: 'invoices', th: 'ใบแจ้งหนี้' }],
        ['paper', { ja: '⑦ 紙', en: '⑦ Paper', th: '⑦ กระดาษ' }, '?', { ja: 'Hikari の確認後', en: 'after Hikari confirms', th: 'หลัง Hikari ยืนยัน' }]],
      fridays: ['11/27', '12/4', '12/11', '12/18'],
      rules: [
        ['clock', { ja: '毎週金曜 15 分で確認（11 月 27 日から）', en: 'Every Friday, 15 minutes (from 27 Nov)', th: 'ทุกวันศุกร์ 15 นาที (ตั้งแต่ 27 พ.ย.)' }],
        ['stamp', { ja: '問題があれば本番に進まず、手順を直して続ける', en: 'Problems? Don’t go live — fix the steps and keep going', th: 'มีปัญหา ไม่ใช้จริง ปรับขั้นตอนแล้วทำต่อ' }]] },
    { ch: 0, scene: 'sku', bm: 'search', am: 'ai',
      t: { ja: '百貨店の SKU は対応表で', en: 'Department-store SKUs: one mapping table', th: 'SKU ห้าง: ใช้ตารางจับคู่' },
      when: { ja: 'Siam Discovery・Central', en: 'Siam Discovery · Central', th: 'Siam Discovery · Central' },
      b: { ja: 'コードが違うので、1 行ずつ目で確認', en: 'Their codes differ — every line checked by eye', th: 'รหัสไม่ตรงกัน ต้องตรวจด้วยตาทีละบรรทัด' },
      a: { ja: '自社 SKU と百貨店コードの対応表を 1 つ作る', en: 'Build one table: our SKU ↔ store codes', th: 'ทำตารางเดียว: SKU ของเรา ↔ รหัสห้าง' },
      steps: [
        ['list', { ja: '補充リストを貼る', en: 'Paste the restock list', th: 'วางรายการเติมของ' }],
        ['data', { ja: '各百貨店の形式で自動作成', en: 'Each store’s format is made for you', th: 'ได้ไฟล์ตามรูปแบบแต่ละห้าง' }],
        ['search', { ja: '赤い行だけ確認して表に追加', en: 'Check only red rows; add them to the table', th: 'ตรวจเฉพาะแถวสีแดง แล้วเพิ่มในตาราง' }],
        ['pay', { ja: '売上報告との差の分だけ CN', en: 'CN only for the difference', th: 'ออก CN เฉพาะส่วนต่าง' }]] },
    { ch: 0, scene: 'monthly', bm: 'wait', am: 'check',
      t: { ja: '月次財務レポート', en: 'Monthly financial report', th: 'รายงานการเงินประจำเดือน' },
      when: { ja: '毎月初 5 営業日以内', en: 'Within 5 working days each month', th: 'ภายใน 5 วันทำการแรกของเดือน' },
      b: { ja: '会計の確認は半期に 1 回だけ', en: 'Accounts were reviewed only twice a year', th: 'ตรวจบัญชีแค่ครึ่งปีครั้ง' },
      a: { ja: '毎月、経営陣にレポートを出す', en: 'Give management a report every month', th: 'ส่งรายงานให้ผู้บริหารทุกเดือน' },
      steps: [
        ['data', { ja: '1 日目　銀行明細を取り込み照合', en: 'Day 1 · import & match bank statements', th: 'วันที่ 1 · นำเข้าและกระทบยอดธนาคาร' }],
        ['pos', { ja: '2 日目　Zort の売上を PEAK へ', en: 'Day 2 · Zort sales to PEAK', th: 'วันที่ 2 · ส่งยอดขาย Zort เข้า PEAK' }],
        ['list', { ja: '3 日目　経費書類を記帳', en: 'Day 3 · book expense documents', th: 'วันที่ 3 · บันทึกเอกสารค่าใช้จ่าย' }],
        ['search', { ja: '4 日目　勘定残高を確認', en: 'Day 4 · check account balances', th: 'วันที่ 4 · ตรวจยอดคงเหลือบัญชี' }],
        ['stamp', { ja: '5 日目まで　作成・署名して提出', en: 'By day 5 · make, sign, submit', th: 'ภายในวันที่ 5 · ทำ เซ็น แล้วส่ง' }]],
      c: { ja: '初回は 10 月分を 11 月 10 日までに。間に合わない項目は明記して出す', en: 'First one: October, by 10 Nov. Mark anything not yet final', th: 'ครั้งแรก: เดือน ต.ค. ภายใน 10 พ.ย. ระบุรายการที่ยังไม่สรุป' } },

    /* ---------- 第 2 章 物流 ---------- */
    { ch: 1, scene: 'restock', bm: 'mess', am: 'calendar',
      t: { ja: '店舗の補充は決まった配送日に', en: 'Restock stores on set delivery days', th: 'เติมสินค้าสาขาตามวันส่งที่กำหนด' },
      when: { ja: '11 月 9 日の週から', en: 'From the week of 9 Nov', th: 'ตั้งแต่สัปดาห์ 9 พ.ย.' },
      b: { ja: 'PC の発注待ちで欠品し、補充が毎日のように発生', en: 'Waiting for PC orders meant stock-outs and restocking almost daily', th: 'รอ PC สั่งของ ทำให้ของขาด และต้องเติมแทบทุกวัน' },
      a: { ja: 'Ying が毎週、売上と在庫を見て補充リストを作り、配送日に送る', en: 'Each week Ying makes the list from sales and stock, and ships on delivery days', th: 'ทุกสัปดาห์ Ying ทำรายการจากยอดขายและสต็อก แล้วส่งในวันจัดส่ง' },
      rows: [
        [{ ja: '毎週月曜', en: 'Every Monday', th: 'ทุกวันจันทร์' }, { ja: 'K-Village・Central Ladprao・Thaniya', en: 'K-Village · Central Ladprao · Thaniya', th: 'K-Village · Central Ladprao · Thaniya' }],
        [{ ja: '毎週木曜', en: 'Every Thursday', th: 'ทุกวันพฤหัสฯ' }, { ja: 'Siam Discovery・Central Chidlom', en: 'Siam Discovery · Central Chidlom', th: 'Siam Discovery · Central Chidlom' }],
        [{ ja: '毎月 15 日・30 日', en: '15th & 30th', th: 'วันที่ 15 และ 30' }, { ja: 'Paradise', en: 'Paradise', th: 'Paradise' }],
        [{ ja: '委託店・百貨店', en: 'Consignment · dept. stores', th: 'ร้านฝากขาย · ห้าง' }, { ja: '週の売上で判断（例：週 12 足以上）', en: 'Decide from weekly sales (e.g. 12+ pairs a week)', th: 'ดูจากยอดขายรายสัปดาห์ (เช่น 12 คู่ขึ้นไป)' }]],
      extra: [
        ['store', { ja: 'PC は在庫カウントと発注をやめ、接客と売場に集中', en: 'PCs stop counting and ordering — customers and the floor come first', th: 'PC เลิกนับสต็อกและสั่งของ โฟกัสลูกค้าและหน้าร้าน' }],
        ['truck', { ja: '売上を見て、配送の回数を足すこともある', en: 'Extra deliveries may be added, based on sales', th: 'อาจเพิ่มรอบส่งตามยอดขาย' }]] },
    { ch: 1, scene: 'dncheck', bm: 'search', am: 'check',
      t: { ja: '伝票と中身を照合', en: 'Delivery note = what’s in the box', th: 'ใบส่งของต้องตรงกับของในกล่อง' },
      b: { ja: '納品と在庫移動の記録がそろわず、あとから確認できない', en: 'Delivery and stock records didn’t line up, so nothing could be checked later', th: 'บันทึกการส่งและการย้ายสต็อกไม่ตรงกัน ตรวจย้อนหลังไม่ได้' },
      a: { ja: '送る前と受け取るときに、伝票と中身を照合', en: 'Check the note against the box before sending and on arrival', th: 'ตรวจใบส่งของกับของ ทั้งก่อนส่งและตอนรับ' },
      steps: [
        ['list', { ja: '店舗別の補充リスト', en: 'Restock list per store', th: 'รายการเติมของแต่ละร้าน' }],
        ['box', { ja: 'ピッキング・DN 作成', en: 'Pick · Delivery Note', th: 'หยิบของ · DN' }],
        ['stamp', { ja: 'DN と箱の中身を照合して発送', en: 'Check DN vs. box, then ship', th: 'ตรวจ DN กับของในกล่อง แล้วส่ง' }],
        ['data', { ja: '在庫に反映、Store Restock に入力', en: 'Update stock; fill in Store Restock', th: 'อัปเดตสต็อก กรอก Store Restock' }],
        ['store', { ja: 'PC が受け取って照合', en: 'The PC checks it on arrival', th: 'PC ตรวจตอนรับของ' }]],
      extra: [
        ['truck', { ja: '週末：Paradise Park からのオンライン発送は、PC が Online Shipping シートに入力して売上報告と一緒に送る。オフィスが月曜に店舗在庫を減らす', en: 'Weekends: online orders shipped from Paradise Park go in the Online Shipping sheet, sent with the sales report. The office deducts store stock on Monday', th: 'เสาร์–อาทิตย์: ออเดอร์ออนไลน์ที่ส่งจาก Paradise Park ให้ PC กรอกชีต Online Shipping ส่งพร้อมรายงานยอดขาย ออฟฟิศตัดสต็อกร้านวันจันทร์' }]],
      c: { ja: '違いはその日のうちにグループへ', en: 'Any difference goes to the group the same day', th: 'ไม่ตรง แจ้งกลุ่มภายในวันนั้น' } },
    { ch: 1, scene: 'wholesale', am: 'check',
      t: { ja: '卸取引先は補充後にフォロー', en: 'Follow up wholesale customers', th: 'ติดตามลูกค้าค้าส่งหลังเติมสินค้า' },
      a: { ja: '補充したら、コーディネーターが取引先にフォロー', en: 'After restocking, the coordinator follows up', th: 'หลังเติมสินค้า ผู้ประสานงานติดตามผลกับลูกค้า' },
      steps: [
        ['truck', { ja: '卸取引先に補充', en: 'Restock the customer', th: 'เติมสินค้าให้ลูกค้า' }],
        ['check', { ja: '取引先にフォロー', en: 'Follow up', th: 'ติดตามผล' }],
        ['store', { ja: 'バンコクは陳列後に BD と訪問', en: 'Bangkok: visit with BD once displayed', th: 'กรุงเทพฯ: ไปเยี่ยมพร้อม BD หลังวางขาย' }]] },
    { ch: 1, scene: 'online', bm: 'late', am: 'fast',
      t: { ja: 'Shopee は 14:00 までの注文を当日発送', en: 'Shopee: orders by 2 PM ship today', th: 'Shopee: สั่งก่อน 14:00 น. ส่งวันนี้' },
      when: { ja: '毎日', en: 'Every day', th: 'ทุกวัน' },
      b: { ja: '朝の梱包のあとに入った注文が、発送されていなかった', en: 'Orders after the morning packing weren’t shipped', th: 'ออเดอร์ที่เข้าหลังแพ็กรอบเช้า ไม่ได้ส่ง' },
      a: { ja: '14:00 に Ying が新しい注文をもう一度確認し、当日発送', en: 'At 2 PM Ying checks for new orders again and ships them today', th: '14:00 น. Ying เช็กออเดอร์ใหม่อีกครั้ง แล้วส่งภายในวัน' },
      timeline: true,
      c: { ja: '全部送ったら Routine Check List（Office Warehouse）にチェック', en: 'Tick the Routine Check List (Office Warehouse) once all are sent', th: 'ส่งครบแล้วติ๊กใน Routine Check List (Office Warehouse)' } },
    { ch: 1, scene: 'equip', bm: 'search', am: 'check',
      t: { ja: 'イベント備品はリストで準備', en: 'Event equipment: use the list', th: 'เตรียมอุปกรณ์อีเวนต์ตามรายการ' },
      b: { ja: '正確なリストがなく、箱の中身が分からず二度手間', en: 'No exact list — nobody knew what was in the boxes', th: 'ไม่มีรายการที่ชัดเจน ไม่รู้ว่าในกล่องมีอะไร ทำซ้ำสองรอบ' },
      a: { ja: 'Ying が Furniture・ACCESSORIES シートでイベントごとに確定', en: 'Ying fixes the list per event in the Furniture and ACCESSORIES sheets', th: 'Ying สรุปรายการต่ออีเวนต์ในชีต Furniture และ ACCESSORIES' },
      steps: [
        ['check', { ja: '準備するとき', en: 'Preparing', th: 'ตอนเตรียม' }],
        ['load', { ja: '積み込む前', en: 'Before loading', th: 'ก่อนขึ้นรถ' }],
        ['booth', { ja: '設営するとき', en: 'At setup', th: 'ตอนจัดบูธ' }]],
      c: { ja: 'リストの確認欄に ✅', en: 'Tick ✅ on the list', th: 'ติ๊ก ✅ ในรายการ' } },
    { ch: 1, scene: 'vehicle', bm: 'wait', am: 'fast',
      t: { ja: '車は前日までに確保', en: 'Book the vehicle a day ahead', th: 'จองรถล่วงหน้า 1 วัน' },
      b: { ja: '直前にアプリで呼び、待ち時間と追加料金が出た（200 バーツが 800 バーツに）', en: 'Last-minute app bookings meant waiting and extra fees (200 baht became 800)', th: 'เรียกรถผ่านแอปกระชั้นชิด ต้องรอและเสียเงินเพิ่ม (200 บาทกลายเป็น 800)' },
      a: { ja: '1 日前までに Ying が手配し、VEHICLE シートに記入', en: 'Ying books it by the day before and fills in the VEHICLE sheet', th: 'Ying จองรถก่อน 1 วัน แล้วกรอกชีต VEHICLE' },
      extra: [
        ['truck', { ja: '設営と撤収は専用便や往復便を定例に', en: 'Make setup and pack-up trips regular (dedicated or round trip)', th: 'รถจัดบูธและเก็บบูธ ใช้เที่ยวประจำหรือไป-กลับ' }],
        ['clock', { ja: '撤収の Lalamove は、終わる見込みの時間で予約', en: 'Book the pack-up Lalamove for when work will finish', th: 'จอง Lalamove ตอนเก็บบูธ ตามเวลาที่คาดว่าจะเสร็จ' }]],
      c: { ja: 'グループには「時間」と「確保完了」だけ', en: 'Post only the time and “confirmed” in the group', th: 'แจ้งกลุ่มแค่ “เวลา” และ “ได้รถแล้ว”' } },
    { ch: 1, scene: 'event', bm: 'mess', am: 'check',
      t: { ja: 'イベントは手順書どおり', en: 'Run events by the handbook', th: 'ทำอีเวนต์ตามคู่มือ' },
      b: { ja: 'やり方がバラバラで、毎回すべての在庫を数えていた', en: 'Different every time, and all stock was counted every time', th: 'ทำไม่เหมือนกัน และนับสต็อกทั้งหมดทุกครั้ง' },
      a: { ja: '全員が同じ手順・同じ担当で。在庫は Zort で記録（付録）', en: 'Same steps, same people, every time; stock recorded in Zort (appendix)', th: 'ทุกคนทำขั้นตอนและหน้าที่เดียวกัน บันทึกสต็อกใน Zort (ภาคผนวก)' },
      stages: true,
      extra: [
        ['stamp', { ja: '③ の承認が出るまで、準備を始めない', en: 'Don’t start preparing until step ③ is approved', th: 'ห้ามเริ่มเตรียมจนกว่าขั้นที่ ③ จะอนุมัติ' }],
        ['count', { ja: '初日の朝、販売前に全商品を数える（PC 責任者）', en: 'First morning: count everything before selling (PC lead)', th: 'เช้าวันแรก นับสินค้าทั้งหมดก่อนขาย (หัวหน้า PC)' }],
        ['list', { ja: '各工程の予定日と完了日は CHECKLIST シートへ', en: 'Plan and done dates for each step go in the CHECKLIST sheet', th: 'วันที่วางแผนและวันที่เสร็จของแต่ละขั้น กรอกในชีต CHECKLIST' }]],
      c: { ja: 'Delivery Note ＝ 返送＋販売。ずれは報告して承認', en: 'Delivery Note = returned + sold. Gaps reported and approved', th: 'Delivery Note = ส่งกลับ + ขาย ส่วนต่างต้องรายงานและอนุมัติ' } },

    /* ---------- 第 3 章 在庫・倉庫・QC ---------- */
    { ch: 2, scene: 'zort', bm: 'search', am: 'check',
      t: { ja: '在庫は Zort で管理', en: 'Manage stock in Zort', th: 'จัดการสต็อกใน Zort' },
      b: { ja: '正確な在庫が分からず、イベント前に毎回すべて数えていた', en: 'The real stock wasn’t known, so everything was counted before each event', th: 'ไม่รู้สต็อกจริง ต้องนับทั้งหมดก่อนทุกอีเวนต์' },
      a: { ja: '入出庫はすべて Zort に記録。準備はシステムの在庫から出す', en: 'Every in and out goes in Zort; prepare from the system stock', th: 'บันทึกเข้า-ออกทั้งหมดใน Zort เตรียมของจากสต็อกในระบบ' },
      rules: [
        ['box', { ja: '在庫を動かす仕事（オンライン配送・イベント準備・返品交換・店舗補充）は倉庫担当が責任を持つ', en: 'Warehouse staff own every job that moves stock (online shipping, event prep, returns & exchanges, store restock)', th: 'พนักงานคลังรับผิดชอบงานที่เคลื่อนย้ายสต็อก (ส่งออนไลน์ เตรียมอีเวนต์ คืน-เปลี่ยนสินค้า เติมสินค้าสาขา)' }],
        ['check', { ja: 'オフィス在庫は棚卸しして Zort に反映済み。店舗の分も順に反映', en: 'Office stock is counted and in Zort; stores are being added', th: 'สต็อกออฟฟิศนับแล้วและอยู่ใน Zort สาขาทยอยเพิ่ม' }],
        ['truck', { ja: '例：コーディネーターは梱包・配送までを請け負う', en: 'e.g. the coordinator takes on packing and shipping', th: 'ตัวอย่าง: ผู้ประสานงานรับงานถึงการแพ็กและจัดส่ง' }]] },
    { ch: 2, scene: 'stocktake', am: 'check',
      t: { ja: '毎月末に棚卸し', en: 'Month-end stock count', th: 'นับสต็อกทุกสิ้นเดือน' },
      when: { ja: '毎月末', en: 'Month-end', th: 'สิ้นเดือน' },
      a: { ja: '経理と倉庫担当で実数を数え、システムとの差を確認', en: 'Accounting and the warehouse count, then compare with the system', th: 'บัญชีกับคลังนับของจริง แล้วเทียบกับระบบ' },
      rules: [
        ['list', { ja: '差は Stock Discrepancy Log に入力', en: 'Log differences in the Stock Discrepancy Log', th: 'บันทึกส่วนต่างใน Stock Discrepancy Log' }],
        ['cal', { ja: '棚卸しの日は補充しない。NUT が店舗へ前もって知らせる', en: 'No restocking on count day — NUT tells stores in advance', th: 'วันนับสต็อกไม่เติมของ NUT แจ้งร้านล่วงหน้า' }],
        ['truck', { ja: '必要なら棚卸しの前に補充しておく', en: 'Restock before the count if needed', th: 'ถ้าจำเป็น ให้เติมของก่อนวันนับ' }]] },
    { ch: 2, scene: 'records', bm: 'search', am: 'check',
      t: { ja: '伝票はセットで保管、入荷品は店頭へ', en: 'Keep notes in pairs; put new stock out', th: 'เก็บเอกสารเป็นชุด ของเข้าใหม่ต้องออกหน้าร้าน' },
      b: { ja: '書類がばらばらで確認できず、入荷した商品が倉庫に眠っていた', en: 'Papers were scattered, and new stock sat in the warehouse', th: 'เอกสารกระจัดกระจาย และของเข้าใหม่ค้างอยู่ในคลัง' },
      a: { ja: '納品書と返却伝票は 1 セットにして経理で保管', en: 'Delivery and return notes are kept as one set by Accounting', th: 'ใบส่งของกับใบรับคืนเก็บเป็นชุดเดียวที่บัญชี' },
      rules: [
        ['data', { ja: '送った数・戻った数・システムの入出庫が合うか確認', en: 'Check sent, returned and system figures all match', th: 'ตรวจว่าจำนวนส่ง จำนวนคืน และระบบตรงกัน' }],
        ['store', { ja: '入荷したら、店頭へ出したかを確認', en: 'After stock arrives, check it went on the shelf', th: 'ของเข้าแล้ว ตรวจว่าออกหน้าร้านแล้ว' }],
        ['search', { ja: '売れない商品は、まず店頭の在庫を確認', en: 'If something isn’t selling, first check the shop-floor stock', th: 'ของขายไม่ออก ให้ตรวจสต็อกหน้าร้านก่อน' }]] },
    { ch: 2, scene: 'times', bm: 'wait', am: 'timer',
      t: { ja: '基準時間で計画する', en: 'Plan with standard times', th: 'วางแผนด้วยเวลามาตรฐาน' },
      b: { ja: '基準がなく、検品待ちが何か月も残り、クレーム期限も過ぎた', en: 'No standard — inspections waited months, and claim deadlines passed', th: 'ไม่มีเกณฑ์ ของรอตรวจค้างหลายเดือน และเลยกำหนดเคลม' },
      a: { ja: '足数 × 基準時間 で人数と日程を決める', en: 'Pairs × standard time → people and schedule', th: 'จำนวนคู่ × เวลามาตรฐาน → กำหนดคนและวัน' },
      stats: true,
      c: { ja: '開始と終了の時刻を QC シートに記録。基準と大きく違えば理由を書く', en: 'Log start and end times in the QC sheet; note why if far from standard', th: 'บันทึกเวลาเริ่มและเสร็จในชีต QC ถ้าต่างจากเกณฑ์มาก ให้เขียนเหตุผล' } },
    { ch: 2, scene: 'qc', bm: 'search', am: 'check',
      t: { ja: '初期 QC：全足を 4 つに分ける', en: 'Initial QC: sort every pair into 4', th: 'QC เบื้องต้น: แยกทุกคู่เป็น 4 กลุ่ม' },
      b: { ja: '人によって判断がちがった', en: 'Each person judged differently', th: 'แต่ละคนตัดสินไม่เหมือนกัน' },
      a: { ja: '検査項目は同じ。1 足 1 分 40 秒', en: 'Same checks for all — 1 min 40 sec a pair', th: 'ตรวจรายการเดียวกัน คู่ละ 1 นาที 40 วินาที' },
      bins: true,
      c: { ja: '戻ってきた不良の数（月ごと）', en: 'Defects sent back (per month)', th: 'จำนวนของชำรุดที่ถูกส่งคืน (ต่อเดือน)' } },
    { ch: 2, scene: 'bgrade', bm: 'mess', am: 'money',
      t: { ja: 'B 品は早く現金化', en: 'Turn B-grade into cash fast', th: 'เปลี่ยนสินค้าเกรด B เป็นเงินให้เร็ว' },
      b: { ja: 'ルールがなく、倉庫に眠っていた', en: 'No rules — items sat in the warehouse', th: 'ไม่มีกฎ ของค้างอยู่ในคลัง' },
      a: { ja: '4 つに分けて、すぐ販売・修理。B-GRADE シートに記録', en: 'Sort into 4, sell or repair right away; log it in the B-GRADE sheet', th: 'แยก 4 กลุ่ม ขายหรือซ่อมทันที บันทึกในชีต B-GRADE' },
      tree: true,
      c: { ja: '販売・修理までの日数／B 品の在庫数（月 1 回）', en: 'Days to sale or repair · B-grade stock (monthly)', th: 'จำนวนวันถึงขายหรือซ่อม · สต็อกเกรด B (เดือนละครั้ง)' } },

    /* ---------- 第 4 章 HR・PC 管理 ---------- */
    { ch: 3, scene: 'pc', bm: 'search', am: 'table',
      t: { ja: '担当 PC の予定表', en: 'PC schedule', th: 'ตาราง PC' },
      b: { ja: 'だれがどこにいるか、分かりにくかった', en: 'Hard to know who was where', th: 'ไม่รู้ว่าใครอยู่ที่ไหน' },
      a: { ja: '「日付 × 店舗・イベント」の表を作る', en: 'One table: date × store / event', th: 'ทำตาราง “วันที่ × สาขา / อีเวนต์”' },
      c: { ja: '空欄（担当未定）がない', en: 'No blank (unassigned) cells', th: 'ไม่มีช่องว่าง (ยังไม่มีคนประจำ)' } },
    { ch: 3, scene: 'shift', am: 'table',
      t: { ja: 'シフト表で配置と打刻を見る', en: 'Shift sheet: who’s where, and clock-ins', th: 'ตารางกะ: ใครอยู่ไหน และเวลาเข้า-ออก' },
      when: { ja: '11 月 9 日から', en: 'From 9 Nov', th: 'ตั้งแต่ 9 พ.ย.' },
      a: { ja: 'Pong が Store Staff Shift Schedule に全店舗・イベントの配置と打刻を入力', en: 'Pong enters every store’s and event’s staff and clock-ins in the Store Staff Shift Schedule', th: 'Pong กรอกคนและเวลาเข้า-ออกของทุกสาขาและอีเวนต์ใน Store Staff Shift Schedule' },
      steps: [
        ['list', { ja: '配置と打刻を入力', en: 'Enter staff & clock-ins', th: 'กรอกคนและเวลา' }],
        ['data', { ja: 'PC 別に配置日数・打刻日数を見る', en: 'See days placed and clocked, per PC', th: 'ดูจำนวนวันประจำและวันลงเวลา ต่อ PC' }],
        ['pos', { ja: '売上と打刻を合わせて見る', en: 'Look at sales with clock-ins', th: 'ดูยอดขายคู่กับเวลาเข้า-ออก' }],
        ['search', { ja: '売上ゼロ・打刻の異常は現場へ', en: 'Zero sales or odd clock-ins: go on site', th: 'ยอดเป็นศูนย์หรือเวลาผิดปกติ ไปดูหน้างาน' }]] },
    { ch: 3, scene: 'onsite', bm: 'search', am: 'check',
      t: { ja: '売上が落ちたら現場で確かめる', en: 'Sales drop? Check on site', th: 'ยอดตก ให้ไปดูหน้างาน' },
      b: { ja: 'PC の報告を聞くだけで、現地確認も原因分析もしなかった', en: 'We only listened to the PC — no site visit, no analysis', th: 'ฟังแค่รายงานของ PC ไม่ไปดูหน้างาน ไม่วิเคราะห์สาเหตุ' },
      a: { ja: '売れる人を現場へ送り、接客を確認する', en: 'Send a strong seller to the site to watch the selling', th: 'ส่งคนที่ขายเก่งไปดูการขายที่หน้างาน' },
      rules: [
        ['search', { ja: '場所・客層・PC の動きを分析し、次のイベントに生かす', en: 'Look at location, customers and PC behaviour; use it next time', th: 'วิเคราะห์ทำเล กลุ่มลูกค้า และการทำงานของ PC แล้วใช้ในอีเวนต์ถัดไป' }],
        ['pos', { ja: '配置後も HR が売上を見る。経理も異常に気づいたら HR へ', en: 'HR keeps watching sales after placing staff; Accounting tells HR about odd numbers', th: 'HR ดูยอดขายต่อหลังจัดคน บัญชีเจอตัวเลขผิดปกติให้แจ้ง HR' }],
        ['face', { ja: '家族ペアのシフトは、いつもより注意して現場を確認', en: 'Family pairs on one shift: check on site more carefully', th: 'กะที่เป็นคนในครอบครัวคู่กัน ให้ตรวจหน้างานละเอียดกว่าปกติ' }]] },
    { ch: 3, scene: 'notice', bm: 'wait', am: 'check',
      t: { ja: '行事は前もって告知', en: 'Announce events early', th: 'แจ้งกิจกรรมล่วงหน้า' },
      b: { ja: 'タンブンの告知が前日で、準備が間に合わない人が出た', en: 'The Tambun notice came the day before — some couldn’t prepare', th: 'แจ้งทำบุญแค่วันก่อน บางคนเตรียมไม่ทัน' },
      a: { ja: '準備が必要な行事は前もって告知（HR）', en: 'HR announces anything that needs preparing in advance', th: 'HR แจ้งกิจกรรมที่ต้องเตรียมตัวล่วงหน้า' },
      rules: [
        ['cal', { ja: '社員旅行は 1 か月前に告知', en: 'Company trip: announce a month ahead', th: 'ทริปบริษัท แจ้งล่วงหน้า 1 เดือน' }],
        ['cal', { ja: '予定は先に Google カレンダーへ', en: 'Put it in Google Calendar first', th: 'ใส่ Google Calendar ก่อน' }]] },

    /* ---------- 第 5 章 EC・顧客対応 ---------- */
    { ch: 4, scene: 'claim', bm: 'search', am: 'check',
      t: { ja: 'クレームは証明がそろってから', en: 'Claims: proof first', th: 'เคลม: ต้องมีหลักฐานครบก่อน' },
      b: { ja: '必要な情報を確かめず、手順を飛ばしていた', en: 'We didn’t ask for the facts and skipped steps', th: 'ไม่ได้ขอข้อมูลที่จำเป็น และข้ามขั้นตอน' },
      a: { ja: '購入証明と破損写真がそろうまで、先へ進めない', en: 'Nothing moves until we have proof of purchase and damage photos', th: 'ยังไม่ดำเนินการจนกว่าจะได้หลักฐานการซื้อและรูปความเสียหาย' },
      steps: [
        ['chat', { ja: '時間がかかるなら「確認します」と返す', en: 'Need time? Reply “We’ll check”', th: 'ถ้าใช้เวลา ตอบว่า “ขอตรวจสอบก่อน”' }],
        ['list', { ja: '購入証明と破損写真を本人から', en: 'Proof + photos from the customer', th: 'หลักฐานการซื้อ + รูป จากลูกค้า' }],
        ['store', { ja: '卸先で購入 → その店舗へ案内', en: 'Bought at a retailer → send to that store', th: 'ซื้อจากร้านตัวแทน → แนะนำไปร้านนั้น' }],
        ['ok', { ja: '自社で購入 → 修理・新モデルへ交換・返金', en: 'Bought from us → repair, swap to a new model, or refund', th: 'ซื้อจากเรา → ซ่อม เปลี่ยนรุ่นใหม่ หรือคืนเงิน' }]],
      c: { ja: '迷ったら島田さん・Bew さんに確認', en: 'Unsure? Ask Shimada or Bew', th: 'ไม่แน่ใจ ถามคุณชิมาดะหรือคุณ Bew' } },
    { ch: 4, scene: 'wording', bm: 'mess', am: 'check',
      t: { ja: '外国人のお客様への文面', en: 'Writing to overseas customers', th: 'ข้อความถึงลูกค้าต่างชาติ' },
      b: { ja: 'AI の文章をそのまま送り、受付前から何度も謝っていた', en: 'AI text was sent as is, apologising again and again before anything was checked', th: 'ส่งข้อความ AI ตรง ๆ และขอโทษหลายครั้งตั้งแต่ยังไม่รับเรื่อง' },
      a: { ja: '事実を確かめる前は「Sorry to hear that」くらいに', en: 'Before the facts are checked, keep it to “Sorry to hear that”', th: 'ก่อนตรวจข้อเท็จจริง พูดแค่ “Sorry to hear that”' },
      rules: [
        ['chat', { ja: 'AI には「短く簡潔に」と指示する', en: 'Tell the AI: short and simple', th: 'สั่ง AI ว่า “สั้นและกระชับ”' }],
        ['check', { ja: 'AI の文章は読んでから送る', en: 'Read AI text before sending', th: 'อ่านข้อความ AI ก่อนส่ง' }],
        ['face', { ja: '迷ったら AI か Supervisor に相談', en: 'Unsure? Ask the AI or a supervisor', th: 'ไม่แน่ใจ ถาม AI หรือหัวหน้า' }]] },
    { ch: 4, scene: 'receipt', bm: 'wait', am: 'check', review: true,
      t: { ja: '受取確認の遅れを防ぐ', en: 'Don’t let “order received” drag', th: 'ไม่ให้การยืนยันรับสินค้าล่าช้า' },
      b: { ja: '受取確認を押さない客がいて、最大 30 日かかる', en: 'Some customers never confirm receipt — up to 30 days', th: 'ลูกค้าบางคนไม่กดยืนยันรับ ใช้เวลาถึง 30 วัน' },
      a: { ja: '到着後 3〜4 日で未確認の客を確かめ、アドミンからお願いする', en: '3–4 days after delivery, find unconfirmed orders and have admin ask', th: 'หลังของถึง 3–4 วัน ดูลูกค้าที่ยังไม่ยืนยัน แล้วให้แอดมินขอให้กด' } },

    /* ---------- 第 6 章 全体 ---------- */
    { ch: 5, scene: 'clean', bm: 'mess', am: 'check',
      t: { ja: 'ゴミ・掃除は当番制', en: 'Trash & cleaning rota', th: 'เวรทิ้งขยะและทำความสะอาด' },
      when: { ja: '週替わり', en: 'Weekly', th: 'หมุนเวียนรายสัปดาห์' },
      b: { ja: 'デスクが散らかり、給湯室とゴミ出しの担当がいなかった', en: 'Messy desks; nobody owned the kitchenette or trash', th: 'โต๊ะรก ไม่มีคนรับผิดชอบห้องเตรียมเครื่องดื่มและขยะ' },
      a: { ja: 'Trash & Cleaning Duty の当番が担当日に行う。デスクは各自', en: 'The Trash & Cleaning Duty rota does it on their day; desks are your own', th: 'เวรตาม Trash & Cleaning Duty ทำในวันของตัวเอง โต๊ะทำเอง' },
      areas: true,
      c: { ja: '当番表のチェック欄が毎週うまっている', en: 'The rota is ticked every week', th: 'ช่องเช็กในตารางเวรครบทุกสัปดาห์' } },
    { ch: 5, scene: 'basics', am: 'check',
      t: { ja: '毎日の基本ルール', en: 'Everyday basics', th: 'กฎพื้นฐานทุกวัน' },
      a: { ja: '決めた手順を、全員が同じように守る', en: 'Everyone follows the agreed steps the same way', th: 'ทุกคนทำตามขั้นตอนที่ตกลงกันเหมือนกัน' },
      rules: [
        ['list', { ja: '日報に「作業・時間・困ったこと」を毎日書く', en: 'Daily report: tasks, time, problems — every day', th: 'รายงานประจำวัน: งาน เวลา ปัญหา ทุกวัน' }],
        ['cal', { ja: '予定と期限は会社の Google カレンダーへ（11 月から）', en: 'Plans and deadlines in the company Google Calendar (from November)', th: 'แผนงานและกำหนดส่ง ใส่ Google Calendar ของบริษัท (ตั้งแต่ พ.ย.)' }],
        ['stamp', { ja: '社長や Bew にサインを頼む書類は、作成者が先にサイン。ミスは本人が直す', en: 'Documents for the president or Bew: the maker signs first and fixes their own mistakes', th: 'เอกสารที่ให้ประธานหรือคุณ Bew เซ็น ผู้ทำเซ็นก่อน ผิดให้แก้เอง' }],
        ['chat', { ja: '店舗・取引先の情報は、その日のうちにグループへ', en: 'News from stores or partners goes to the group the same day', th: 'ข้อมูลจากร้านหรือคู่ค้า แจ้งกลุ่มภายในวันนั้น' }]] },
    { ch: 5, scene: 'deadline', am: 'fast',
      t: { ja: '期限のない指示は、その日のうちに', en: 'No deadline given? Finish it today', th: 'คำสั่งไม่มีกำหนดส่ง ทำให้เสร็จวันนั้น' },
      a: { ja: '指示があった日が締め切り', en: 'The day you get it is the deadline', th: 'วันที่ได้รับคำสั่งคือวันกำหนดส่ง' },
      rules: [
        ['clock', { ja: 'その日のうちに終える', en: 'Finish it the same day', th: 'ทำให้เสร็จภายในวันนั้น' }],
        ['chat', { ja: '間に合わないときは島田さんに説明し、何日かかるか報告', en: 'Can’t make it? Tell Shimada why, and how many days it will take', th: 'ทำไม่ทัน ให้อธิบายคุณชิมาดะ และแจ้งว่าใช้เวลากี่วัน' }]] },
    { ch: 5, scene: 'promo', bm: 'wait', am: 'fast',
      t: { ja: '止まった仕事は自分から動かす', en: 'Stalled work? Push it yourself', th: 'งานค้าง ต้องผลักดันเอง' },
      b: { ja: '看板データが確認待ちで止まり、作成者の退職後はだれも追わなかった', en: 'Sign artwork sat waiting for approval; after its maker left, nobody followed up', th: 'ไฟล์ป้ายค้างรออนุมัติ หลังคนทำลาออกก็ไม่มีใครตาม' },
      a: { ja: 'データができたらすぐ見積もり。確認が遅れたら担当者が Bew や社長へ催促', en: 'Get a quote as soon as the artwork is ready; if approval is slow, the owner chases Bew or the president', th: 'ไฟล์เสร็จให้ขอใบเสนอราคาทันที ถ้าอนุมัติช้า ผู้รับผิดชอบตามคุณ Bew หรือประธาน' } },
    { ch: 5, scene: 'rollout', am: 'check',
      t: { ja: '進め方：2 か月で見直す', en: 'Roll-out: review after 2 months', th: 'ขั้นตอน: ทบทวนใน 2 เดือน' },
      a: { ja: '開始日から、新しい手順で始める', en: 'From the start date, work the new way', th: 'เริ่มทำตามขั้นตอนใหม่ตั้งแต่วันเริ่ม' },
      phases: true,
      rules: [
        ['list', { ja: '日報を毎日。オフィスが AI で分析し、フォローに使う', en: 'Daily report every day — the office analyses it with AI for follow-up', th: 'รายงานประจำวันทุกวัน ออฟฟิศใช้ AI วิเคราะห์เพื่อติดตามผล' }],
        ['chat', { ja: '例外や困ったことは、止めずにその日のうちにグループへ', en: 'Exceptions or problems: don’t stop — tell the group the same day', th: 'กรณีพิเศษหรือปัญหา ไม่ต้องหยุดงาน แจ้งกลุ่มภายในวันนั้น' }],
        ['cal', { ja: '毎月初めの月次定例で、続ける・直す・やめるを決める', en: 'At the monthly meeting, decide what to keep, fix or stop', th: 'ประชุมประจำเดือน ตัดสินว่าทำต่อ แก้ หรือหยุด' }]] }
  ];

  // 追加の図で使う文言
  var X = {
    timeline: {
      ja: ['朝の発送', '14:00 締め切り', '当日発送', '翌日発送'], en: ['Morning shipment', '2 PM cut-off', 'Ships today', 'Ships tomorrow'],
      th: ['ส่งรอบเช้า', 'ปิดรับ 14:00 น.', 'ส่งวันนี้', 'ส่งพรุ่งนี้']
    },
    stats: [
      { v: '1:40', u: { ja: '分 / 足', en: 'min / pair', th: 'นาที / คู่' }, l: { ja: '初期 QC', en: 'Initial QC', th: 'QC เบื้องต้น' }, ic: 'search', col: C.red },
      { v: '1:00', u: { ja: '分 / 足', en: 'min / pair', th: 'นาที / คู่' }, l: { ja: '接着修理', en: 'Glue repair', th: 'ซ่อมติดกาว' }, ic: 'glue', col: '#b7790f' },
      { v: '—', u: { ja: '外部委託', en: 'Outsourced', th: 'ส่งช่างภายนอก' }, l: { ja: '縫製修理', en: 'Stitch repair', th: 'ซ่อมเย็บ' }, ic: 'stitch', col: C.purple },
      { v: '2:13', u: { ja: '分 / 個', en: 'min / piece', th: 'นาที / ชิ้น' }, l: { ja: 'アームスリーブ・バフ QC', en: 'Arm sleeve & buff QC', th: 'QC ปลอกแขนและบัฟ' }, ic: 'check', col: C.blue },
      { v: '111', u: { ja: '足 / 時間', en: 'pairs / hour', th: 'คู่ / ชั่วโมง' }, l: { ja: 'イベント梱包（約 32.5 秒 / 足）', en: 'Event packing (≈32.5 sec / pair)', th: 'แพ็กสินค้าอีเวนต์ (≈32.5 วินาที / คู่)' }, ic: 'box', col: C.teal }
    ],
    example: {
      ja: { title: '例：300 足のイベント', p1: '1 人', p2: '2 人', qc: '初期 QC', pack: '梱包' },
      en: { title: 'Example: a 300-pair event', p1: '1 person', p2: '2 people', qc: 'Initial QC', pack: 'Packing' },
      th: { title: 'ตัวอย่าง: อีเวนต์ 300 คู่', p1: '1 คน', p2: '2 คน', qc: 'QC เบื้องต้น', pack: 'แพ็กสินค้า' }
    },
    bins: [
      { l: { ja: '良品', en: 'Good', th: 'ปกติ' }, col: C.green, ic: 'ok' },
      { l: { ja: '接着修理', en: 'Glue repair', th: 'ซ่อมติดกาว' }, col: '#b7790f', ic: 'glue' },
      { l: { ja: '縫製修理', en: 'Stitch repair', th: 'ซ่อมเย็บ' }, col: C.purple, ic: 'stitch' },
      { l: { ja: 'B 品', en: 'B-grade', th: 'เกรด B' }, col: C.red, ic: 'tag' }
    ],
    tree: [
      { k: { ja: '修理できる', en: 'Repairable', th: 'ซ่อมได้' }, v: { ja: '修理 → 再 QC → 良品で販売', en: 'Repair → QC again → sell as good', th: 'ซ่อม → QC ใหม่ → ขายเป็นของปกติ' }, col: C.green, ic: 'glue' },
      { k: { ja: '小さな傷・汚れ・クラック', en: 'Minor marks or cracks', th: 'ตำหนิ รอยเปื้อน รอยร้าวเล็กน้อย' }, v: { ja: '15% OFF（それ以上は管理者に確認）', en: '15% off (more needs a manager’s OK)', th: 'ลด 15% (ลดมากกว่านี้ต้องถามผู้จัดการ)' }, col: C.gold, tag: '-15%' },
      { k: { ja: '部品の欠損', en: 'Missing parts', th: 'ชิ้นส่วนขาดหาย' }, v: { ja: '最大 50% OFF', en: 'Up to 50% off', th: 'ลดสูงสุด 50%' }, col: C.red, tag: '-50%' },
      { k: { ja: '販売できない', en: 'Not sellable', th: 'ขายไม่ได้' }, v: { ja: '理由を記録して処分', en: 'Note why, then dispose', th: 'บันทึกเหตุผล แล้วทิ้ง' }, col: C.gray, ic: 'ng' }
    ],
    areas: [
      { l: { ja: 'ゴミ出し', en: 'Trash', th: 'ทิ้งขยะ' }, ic: 'bin' }, { l: { ja: '床・机', en: 'Floor & desks', th: 'พื้นและโต๊ะ' }, ic: 'broom' },
      { l: { ja: '倉庫の通路', en: 'Warehouse aisles', th: 'ทางเดินในคลัง' }, ic: 'box' }, { l: { ja: 'トイレ・給湯', en: 'Toilet & kitchenette', th: 'ห้องน้ำและมุมเครื่องดื่ม' }, ic: 'spark' }
    ],
    phases: [
      { w: { ja: '開始日から', en: 'From the start', th: 'ตั้งแต่วันเริ่ม' }, b: { ja: '始める', en: 'Start', th: 'เริ่ม' }, d: { ja: '新しい手順で', en: 'Work the new way', th: 'ทำตามขั้นตอนใหม่' }, col: C.teal },
      { w: { ja: '毎週金曜', en: 'Every Friday', th: 'ทุกวันศุกร์' }, b: { ja: 'フォロー', en: 'Follow-up', th: 'ติดตามผล' }, d: { ja: '15 分で進み具合と困りごと', en: '15 min: progress & problems', th: '15 นาที: ความคืบหน้าและปัญหา' }, col: C.gold },
      { w: { ja: '1 か月後', en: 'After 1 month', th: 'หลัง 1 เดือน' }, b: { ja: '中間確認', en: 'Midpoint check', th: 'ตรวจกลางทาง' }, d: { ja: '手順を少し直す', en: 'Adjust the steps', th: 'ปรับขั้นตอนเล็กน้อย' }, col: C.blue },
      { w: { ja: '2 か月後', en: 'After 2 months', th: 'หลัง 2 เดือน' }, b: { ja: '見直し', en: 'Review', th: 'ทบทวน' }, d: { ja: '止める・直すを決める', en: 'Decide what to stop or fix', th: 'ตัดสินใจหยุดหรือแก้' }, col: C.green }
    ],
    stages: [
      { l: { ja: '準備・出庫', en: 'Prepare & stock out', th: 'เตรียมของ · เบิกออก' }, n: { ja: '1–6 · 3〜1 営業日前', en: '1–6 · 3–1 working days before', th: '1–6 · 3–1 วันทำการก่อนงาน' }, ic: 'box' },
      { l: { ja: '会期中', en: 'During the event', th: 'ระหว่างงาน' }, n: { ja: '7–8 · 初日〜', en: '7–8 · from day 1', th: '7–8 · ตั้งแต่วันแรก' }, ic: 'booth' },
      { l: { ja: 'Close・棚戻し', en: 'Close & back to shelves', th: 'ปิดงาน · เก็บขึ้นชั้น' }, n: { ja: '9–15 · 〜2 営業日目', en: '9–15 · to working day 2', th: '9–15 · ถึงวันทำการที่ 2' }, ic: 'check' }
    ]
  };

  // 付録：イベント手順（15 ステップ）
  var APX = {
    title: { ja: 'イベント手順（15 ステップ）', en: 'Event procedure (15 steps)', th: 'ขั้นตอนอีเวนต์ (15 ขั้นตอน)' },
    rolesTitle: { ja: '担当と役割', en: 'Who does what', th: 'ใครทำอะไร' },
    roles: [
      { n: 'Hoshino', r: { ja: 'Event Proposal（レイアウト・商品リスト）、Case ①／② の判断', en: 'Event Proposal (layout, product list); decides Case ① or ②', th: 'ทำ Event Proposal (Layout, Product list) และตัดสิน Case ①/②' }, col: C.navy },
      { n: 'Ying', r: { ja: 'Delivery Note、商品準備、設営、補充、撤収、結果報告', en: 'Delivery Note, preparing stock, setup, restocks, pack-up, report', th: 'Delivery Note เตรียมสินค้า จัดบูธ เติมสินค้า เก็บบูธ รายงานผล' }, col: C.teal },
      { n: { ja: '倉庫担当', en: 'Warehouse', th: 'คลังสินค้า' }, r: { ja: '商品準備、設営、撤収、翌営業日のカウント、棚戻し（着任までは経理が主導）', en: 'Preparing stock, setup, pack-up, next-day count, back to shelves (Accounting leads until they start)', th: 'เตรียมสินค้า จัดบูธ เก็บบูธ นับวันถัดไป เก็บขึ้นชั้น (บัญชีดูแลจนกว่าจะมีคน)' }, col: '#b7790f' },
      { n: { ja: 'PC 責任者', en: 'PC in charge', th: 'PC ผู้รับผิดชอบ' }, r: { ja: '初日朝の受領カウント、補充のカウント、レジ締め', en: 'First-morning count, restock count, closes the register', th: 'นับรับสินค้าเช้าวันแรก นับสินค้าเติม ปิดยอด POS' }, col: C.purple },
      { n: { ja: '経理', en: 'Accounting', th: 'ฝ่ายบัญชี' }, r: { ja: 'Zort の在庫移動、売上レポート、照合', en: 'Zort stock transfers, sales report, reconciliation', th: 'โอนสต็อกใน Zort ออกรายงานยอดขาย กระทบยอด' }, col: C.green },
      { n: 'Shimada', r: { ja: 'Delivery Note と差異の承認', en: 'Approves the Delivery Note and differences', th: 'อนุมัติ Delivery Note และส่วนต่าง' }, col: C.red }
    ],
    lanes: [
      { l: { ja: '準備・出庫（3〜1 営業日前）', en: 'Prepare & stock out (3–1 working days before)', th: 'เตรียมของ · เบิกออก (3–1 วันทำการก่อนงาน)' }, col: C.navy, steps: [
        ['1', 'Event Proposal', 'Hoshino'], ['2', 'Delivery Note', 'Ying'], ['3', { ja: '承認（Sign）', en: 'Sign', th: 'ลงนาม (Sign)' }, 'Shimada'],
        ['4', { ja: '商品準備', en: 'Prepare', th: 'เตรียมสินค้า' }, { ja: 'Ying＋倉庫', en: 'Ying + warehouse', th: 'Ying + คลัง' }], ['5', { ja: 'Zort 出庫', en: 'Stock out (Zort)', th: 'เบิกออก (Zort)' }, { ja: '経理', en: 'Accounting', th: 'บัญชี' }]] },
      { l: { ja: '会期中（初日〜）', en: 'During the event (from day 1)', th: 'ระหว่างงาน (ตั้งแต่วันแรก)' }, col: C.teal, steps: [
        ['6', { ja: '設営（前日）', en: 'Setup (day before)', th: 'จัดบูธ (วันก่อนงาน)' }, { ja: 'Ying＋倉庫', en: 'Ying + warehouse', th: 'Ying + คลัง' }],
        ['7', { ja: '受領カウント（初日朝）', en: 'Receipt count (first morning)', th: 'นับรับสินค้า (เช้าวันแรก)' }, 'PC'],
        ['8', { ja: '補充（発送＋Zort）', en: 'Refill (ship + Zort)', th: 'เติมสินค้า (ส่ง + Zort)' }, { ja: 'Ying・経理', en: 'Ying · Accounting', th: 'Ying · บัญชี' }]] },
      { l: { ja: 'Close・棚戻し（Close 当日〜2 営業日目）', en: 'Close & back to shelves (Close day to working day 2)', th: 'ปิดงาน · เก็บขึ้นชั้น (วันปิดงานถึงวันทำการที่ 2)' }, col: '#b7790f', steps: [
        ['9', { ja: 'Close（封印・搬出）', en: 'Close (seal, load out)', th: 'ปิดงาน (ซีลกล่อง ขนออก)' }, { ja: 'PC・Ying・倉庫', en: 'PC · Ying · warehouse', th: 'PC · Ying · คลัง' }],
        ['10', { ja: 'カウント（翌営業日）', en: 'Count (next business day)', th: 'นับสินค้า (วันทำการถัดไป)' }, { ja: '倉庫', en: 'Warehouse', th: 'คลัง' }],
        ['11', { ja: '照合', en: 'Reconcile', th: 'กระทบยอด' }, { ja: '経理', en: 'Accounting', th: 'บัญชี' }],
        ['12', { ja: '差異承認', en: 'Approve differences', th: 'อนุมัติส่วนต่าง' }, 'Ying · Shimada'],
        ['13', { ja: 'Zort で本倉庫へ', en: 'Zort back to main', th: 'โอนกลับคลังหลัก (Zort)' }, { ja: '経理', en: 'Accounting', th: 'บัญชี' }],
        ['14', { ja: '棚戻し', en: 'Back to shelves', th: 'เก็บขึ้นชั้น' }, { ja: '倉庫', en: 'Warehouse', th: 'คลัง' }],
        ['15', { ja: '結果報告', en: 'Report results', th: 'รายงานผล' }, 'Ying → Shimada']] }
    ],
    cases: [
      { k: 'Case ①', v: { ja: '終わったら本倉庫の棚へ戻す（通常）', en: 'After the event, back to the main warehouse shelves (normal)', th: 'จบงานแล้ว นำกลับขึ้นชั้นที่คลังหลัก (ปกติ)' } },
      { k: 'Case ②', v: { ja: '次が 2 週間以内・同規模以上なら、数えて照合したあと、封をして待機エリアへ（⑬⑭は省く）。待機中は店舗・オンラインで売らない', en: 'Next event within 2 weeks and as big or bigger: count and reconcile, then seal it in the holding area (skip ⑬⑭). Not sold in stores or online while waiting', th: 'อีเวนต์ถัดไปภายใน 2 สัปดาห์และขนาดเท่าเดิมขึ้นไป: นับและกระทบยอด แล้วซีลเก็บที่พื้นที่พักสินค้า (ข้าม ⑬⑭) ระหว่างรอห้ามขายที่ร้านหรือออนไลน์' } }
    ],
    checksTitle: { ja: 'どこで、だれが、何をチェックするか', en: 'Where, who and what to check', th: 'ตรวจที่ไหน ใคร อะไร' },
    checks: [
      ['③', { ja: '島田', en: 'Shimada', th: 'ชิมาดะ' }, { ja: 'Delivery Note の内容', en: 'Delivery Note contents', th: 'เนื้อหา Delivery Note' }, { ja: '承認まで準備しない', en: 'No prep until approved', th: 'ไม่เตรียมจนกว่าจะอนุมัติ' }],
      ['⑤', { ja: '経理', en: 'Accounting', th: 'บัญชี' }, { ja: 'Zort の移動数 ＝ 署名済み DN', en: 'Zort transfer = signed DN', th: 'ยอดโอนใน Zort = DN ที่เซ็นแล้ว' }, { ja: '一致させる', en: 'Make them match', th: 'ทำให้ตรงกัน' }],
      ['⑦', { ja: 'PC 責任者', en: 'PC lead', th: 'หัวหน้า PC' }, { ja: '初日の朝：陳列＋予備の実数 ＝ 持出数', en: 'First morning: shelf + spare = sent', th: 'เช้าวันแรก: ของโชว์ + สำรอง = จำนวนที่ส่ง' }, { ja: 'その日に Ying と経理へ。島田の承認後に Zort を直す', en: 'Tell Ying and Accounting that day; fix Zort after Shimada approves', th: 'แจ้ง Ying และบัญชีวันนั้น แก้ Zort หลังชิมาดะอนุมัติ' }],
      ['⑧', { ja: 'PC 責任者', en: 'PC lead', th: 'หัวหน้า PC' }, { ja: '補充で届いた実数', en: 'Refill actually received', th: 'ของเติมที่ได้รับจริง' }, { ja: 'Return Note に記入', en: 'Write it on the Return Note', th: 'กรอกใน Return Note' }],
      ['⑨', { ja: 'Ying＋倉庫', en: 'Ying + warehouse', th: 'Ying + คลัง' }, { ja: 'Close 当日：箱数と封印', en: 'Close day: box count and seals', th: 'วันปิดงาน: จำนวนกล่องและซีล' }, { ja: '会場では商品を数えない', en: 'Don’t count products at the venue', th: 'ไม่นับสินค้าที่หน้างาน' }],
      ['⑩', { ja: '倉庫', en: 'Warehouse', th: 'คลัง' }, { ja: '翌営業日：封印と全箱の実数', en: 'Next day: seals and every box', th: 'วันทำการถัดไป: ซีลและของทุกกล่อง' }, { ja: '封印が破れていれば記録', en: 'Note any broken seal', th: 'ซีลขาดให้บันทึก' }],
      ['⑪', { ja: '経理', en: 'Accounting', th: 'บัญชี' }, { ja: '受領＋補充−販売 ＝ 実数', en: 'Received + refill − sold = counted', th: 'รับ + เติม − ขาย = นับได้' }, { ja: '差異表を作る', en: 'Make the difference sheet', th: 'ทำตารางส่วนต่าง' }],
      ['⑫', { ja: 'Ying → 島田', en: 'Ying → Shimada', th: 'Ying → ชิมาดะ' }, { ja: '1 点でも差があれば原因', en: 'Any gap at all: the cause', th: 'ต่างแม้ 1 ชิ้น: หาสาเหตุ' }, { ja: '承認後に Zort を移動', en: 'Move in Zort after approval', th: 'โอนใน Zort หลังอนุมัติ' }]
    ],
    forms: { ja: '帳票：Delivery Note（Ying）・Return Note（Ying＋倉庫）　未定：現金売上の受け渡し方法（⑨）', en: 'Forms: Delivery Note (Ying) · Return Note (Ying + warehouse). Still open: how cash sales are handed over (⑨)', th: 'เอกสาร: Delivery Note (Ying) · Return Note (Ying + คลัง) ยังไม่สรุป: วิธีส่งมอบเงินสด (⑨)' },
    note: { ja: '数える人と Zort に入力する人は別。Zort の移動と売上レポートは経理だけが行う。', en: 'The person who counts never enters the numbers in Zort. Only Accounting moves stock in Zort and runs sales reports.', th: 'คนนับกับคนบันทึกใน Zort ต้องเป็นคนละคน การโอนใน Zort และรายงานยอดขายทำโดยฝ่ายบัญชีเท่านั้น' }
  };

  /* ======================= 冊子（スライド）の文言 ======================= */
  var DK = {
    ja: { shelf: '部門ごとの冊子', open: 'クリックして開く', items: function (n) { return n + ' 項目'; }, toShelf: '冊子一覧', prev: '前へ', next: '次へ',
      full: '全画面', exitFull: '全画面を終了', contents: 'この冊子の内容', rotate: '横向きにすると大きく表示されます', handbook: 'イベント手順書',
      keys: '← → キーでページ送り', page: function (a, b) { return a + ' / ' + b; } },
    en: { shelf: 'Booklets by department', open: 'Click to open', items: function (n) { return n + (n === 1 ? ' topic' : ' topics'); }, toShelf: 'All booklets', prev: 'Back', next: 'Next',
      full: 'Full screen', exitFull: 'Exit full screen', contents: 'In this booklet', rotate: 'Turn your phone sideways for a bigger view', handbook: 'Event handbook',
      keys: 'Use the ← → keys to turn pages', page: function (a, b) { return a + ' / ' + b; } },
    th: { shelf: 'คู่มือแยกตามแผนก', open: 'คลิกเพื่อเปิดอ่าน', items: function (n) { return n + ' หัวข้อ'; }, toShelf: 'คู่มือทั้งหมด', prev: 'ก่อนหน้า', next: 'ถัดไป',
      full: 'เต็มจอ', exitFull: 'ออกจากเต็มจอ', contents: 'เนื้อหาในเล่มนี้', rotate: 'หมุนโทรศัพท์เป็นแนวนอนเพื่อดูภาพใหญ่ขึ้น', handbook: 'คู่มือขั้นตอนอีเวนต์',
      keys: 'กดปุ่ม ← → เพื่อเปลี่ยนหน้า', page: function (a, b) { return a + ' / ' + b; } }
  };
  var APX_BOOK = 1; // イベント手順書（付録）は物流の冊子の最後に入れる

  /* ======================= 組み立て ======================= */
  var lang = 'ja', meta = {};
  var COMPANY = 'BAREFOOTINC(THAILAND) CO., LTD / Endeavorz Co., Ltd.';
  var DOC_DATE = '2026-11-18'; // イラスト版の日付（文章版の date とは別）
  function L(v) { return v == null ? '' : (typeof v === 'string' ? v : (v[lang] != null ? v[lang] : v.ja)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(name, cls) {
    var body;
    if (name === 'clean') body = broom(10, 4, 0.55);
    else if (name === 'glue') body = '<rect x="14" y="14" width="20" height="28" rx="4" fill="' + C.gold + '"/><rect x="19" y="6" width="10" height="10" rx="2" fill="' + C.gray + '"/><path d="M24 2 v4"' + sw(C.gray, 3) + '/><rect x="17" y="24" width="14" height="8" rx="2" fill="#fff" opacity=".7"/>';
    else if (name === 'stitch') body = needle(4, 4, 1);
    else if (name === 'ok') body = okCircle(24, 24, 16);
    else if (name === 'ng') body = ngCircle(24, 24, 16);
    else if (name === 'tag') body = tag(2, 10, 0.64, 'B', C.red);
    else if (name === 'bin') body = bin(4, 0, 0.72);
    else if (name === 'broom') body = broom(10, 4, 0.55);
    else if (name === 'spark') body = sparkle(24, 24, 16) + sparkle(38, 10, 6, C.blue);
    else body = (ICON[name] || ICON.check)();
    return svg('0 0 48 48', body, cls || 'ig-ic');
  }
  function colVars(i) { return '--c:' + CH[i].c + ';--s:' + CH[i].s; }
  function itemsOf(i) { return ITEMS.filter(function (it) { return it.ch === i; }); }

  // 冊子ごとのページ一覧（表紙・各項目・付録）
  function pagesOf(i) {
    var p = [{ kind: 'cover' }];
    var n = 0;
    itemsOf(i).forEach(function (it) {
      if (!it.cont) n++;
      p.push({ kind: 'item', it: it, no: (i + 1) + '.' + n });
    });
    if (i === APX_BOOK) { p.push({ kind: 'apx1' }); p.push({ kind: 'apx2' }); p.push({ kind: 'apx3' }); }
    return p;
  }

  function slide(b, p, cls, style, body, foot) {
    return '<section class="sl ' + cls + '" data-b="' + b + '" data-p="' + p + '"' + (style ? ' style="' + style + '"' : '') + '>' +
      '<div class="sl-in">' + body + '</div>' + (foot || '') + '</section>';
  }
  function foot(i, p, n) {
    var U = UI[lang];
    return '<footer class="sl-foot"><span>' + esc(COMPANY) + ' · ' + esc(meta.title || '') + '</span>' +
      '<span><b>' + esc(U.chapter(i + 1)) + ' ' + esc(L(CHAPTERS[i].t)) + '</b>　' + esc(DK[lang].page(p, n)) + '</span></footer>';
  }

  // 1 枚目：冊子が並んだ本棚
  function renderShelf() {
    var U = UI[lang], D = DK[lang];
    var art = sparkle(40, 30, 12) + sparkle(1180, 40, 9, C.blue);
    var books = CHAPTERS.map(function (c, i) {
      var n = itemsOf(i).length;
      return '<a class="bk" href="#/b' + (i + 1) + '" data-go="b' + (i + 1) + '" style="' + colVars(i) + '">' +
        '<span class="bk-no">' + esc(U.chapter(i + 1)) + '</span>' + icon(c.icon, 'bk-ic') +
        '<b class="bk-t">' + esc(L(c.t)) + '</b>' +
        '<span class="bk-n">' + esc(D.items(n)) + (i === APX_BOOK ? ' + ' + esc(D.handbook) : '') + '</span></a>';
    }).join('');
    var legend = '<div class="sh-legend">' +
      '<span class="lg is-before">' + svg('0 0 120 92', MINI.pile(U), 'lg-art') + '<b>' + esc(U.before) + '</b><small>' + esc(U.legendBefore) + '</small></span><i>➜</i>' +
      '<span class="lg is-after">' + svg('0 0 120 92', MINI.check(U), 'lg-art') + '<b>' + esc(U.after) + '</b><small>' + esc(U.legendAfter) + '</small></span><i>➜</i>' +
      '<span class="lg is-check">' + svg('0 0 48 48', okCircle(24, 24, 18), 'lg-art lg-ok') + '<b>' + esc(U.check) + '</b><small>' + esc(U.legendCheck) + '</small></span></div>';
    return slide(0, 1, 'sl-shelf', '',
      '<div class="sh-top"><span>' + esc(COMPANY) + '</span><span>' + esc(meta.dateText || '') + '</span></div>' +
      '<div class="sh-head"><div><h1 class="sh-title">' + esc(meta.title || '') + '</h1></div>' +
      '<p class="sh-hint">' + esc(D.shelf) + '<br><span>👆 ' + esc(D.open) + '</span></p></div>' +
      '<div class="sh-books">' + books + '</div><div class="sh-plank" aria-hidden="true">' + svg('0 0 1200 60', art) + '</div>' +
      '<div class="sh-bottom"><span class="sh-how">' + esc(U.howToRead) + '</span>' + legend + '</div>',
      '<footer class="sl-foot"><span>' + esc(U.confidential) + '</span><span class="sl-keys">' + esc(D.keys) + '</span></footer>');
  }

  // 冊子の表紙
  function renderBookCover(i, pages) {
    var U = UI[lang], D = DK[lang], c = CHAPTERS[i];
    var rows = pages.map(function (pg, k) {
      if (pg.kind === 'cover') return '';
      if (pg.kind === 'apx2' || pg.kind === 'apx3' || (pg.kind === 'item' && pg.it.cont)) return '';
      var label = pg.kind === 'item' ? L(pg.it.t) : D.handbook;
      var no = pg.kind === 'item' ? pg.no : U.appendix;
      return '<li><a href="#/b' + (i + 1) + '/' + (k + 1) + '" data-go="b' + (i + 1) + '/' + (k + 1) + '"><span class="tc-no">' + esc(no) + '</span><span class="tc-t">' + esc(label) + '</span>' +
        (pg.kind === 'item' && pg.it.review ? '<span class="ig-pill">' + esc(U.inReview) + '</span>' : '') + '<span class="tc-p">' + (k + 1) + '</span></a></li>';
    }).join('');
    var heroScene = SCENES[itemsOf(i)[0].scene](U);
    return slide(i + 1, 1, 'sl-bcover', colVars(i),
      '<div class="bc-cover"><span class="bc-no">' + esc(U.chapter(i + 1)) + '</span>' + icon(c.icon, 'bc-ic') +
      '<h1 class="bc-t">' + esc(L(c.t)) + '</h1>' + (c.d ? '<p class="bc-d">' + esc(L(c.d)) + '</p>' : '') +
      '<div class="bc-art">' + svg(VB, heroScene) + '</div><span class="bc-co">' + esc(COMPANY) + '</span></div>' +
      '<div class="bc-toc"><h2>' + esc(D.contents) + '</h2><ol>' + rows + '</ol>' + (c.kpi ?
        '<div class="ig-kpi bc-kpi"><b>' + esc(c.kpi.v) + '</b><span><strong>' + esc(L(c.kpi.u)) + ' <small>(' + esc(c.kpi.per) + ')</small></strong>' +
        esc(L(c.kpi.l)) + ' <small>(' + esc(c.kpi.base) + ' = ' + esc(c.kpi.per2) + ')</small></span></div>' +
        '<ul class="bc-notes">' + c.kpi.notes.map(function (n) { return '<li>' + esc(L(n)) + '</li>'; }).join('') + '</ul>' : '') + '</div>',
      foot(i, 1, pages.length));
  }

  // 項目のページ
  function renderItem(it, no) {
    var U = UI[lang];
    var h = '<header class="ig-item-head"><span class="ig-no">' + no + '</span><h2>' + esc(L(it.t)) + '</h2>' +
      (it.review ? '<span class="ig-pill">' + esc(U.inReview) + '</span>' : '') + (it.when ? '<span class="ig-when">🕘 ' + esc(L(it.when)) + '</span>' : '') + '</header>';
    if (it.detail) {
      var d = it.detail;
      var nowTiles = d.now.map(function (x, k) {
        return '<li>' + icon((d.ni || [])[k] || 'ng', 'ig-ic dn-ic') + '<b>' + esc(L((d.ns || [])[k] || x)) + '</b><small>' + esc(L(x)) + '</small></li>';
      }).join('');
      var flow = d.after.map(function (x, k) {
        return '<li><span class="df-n">' + (k + 1) + '</span><span class="df-when">' + esc(L(x[0])) + '</span>' + icon(x[2] || 'check', 'ig-ic df-ic') +
          '<b>' + esc(L((d.as || [])[k] || x[1])) + '</b><small>' + esc(L(x[1])) + '</small></li>';
      }).join('');
      return h + '<div class="dt-top">' + hoursBars(d.h, U) +
        '<div class="dt-now"><div class="dt-now-h">' + svg('0 0 120 92', MINI.pile(U), 'dt-now-art') + '<b>' + esc(U.nowWay) + '</b></div><ol>' + nowTiles + '</ol></div></div>' +
        '<div class="dt-new"><div class="dt-new-h">' + svg('0 0 120 92', MINI.check(U), 'dt-now-art') + '<b>' + esc(U.newWay) + '</b></div><ol class="dt-flow">' + flow + '</ol></div>' +
        (d.note ? '<p class="ig-dnote">※ ' + esc(L(d.note)) + '</p>' : '');
    }
    if (it.golive) {
      var tiles = it.golive.map(function (g) {
        var lab = typeof g[2] === 'string' ? g[2] : L(g[2]);
        return '<li>' + svg('0 0 56 58', calendar(0, 2, 1, esc(lab), { top: C.green, fs: calFs(lab) }), 'gl-cal') +
          (g[3] ? '<small class="gl-sub">' + esc(L(g[3])) + '</small>' : '') + icon(g[0], 'ig-ic gl-ic') + '<b>' + esc(L(g[1])) + '</b></li>';
      }).join('');
      var fr = it.fridays.map(function (f) { return '<li>' + svg('0 0 56 58', calendar(0, 2, 1, f, { top: C.gold, fs: 13 }), 'gl-fri') + '</li>'; }).join('') + '<li class="gl-more">…</li>';
      return h + '<div class="ig-card is-after gl-after">' + svg('0 0 120 92', MINI.check(U), 'ig-mini') + '<div><b>' + esc(U.after) + '</b><p>' + esc(L(it.a)) + '</p></div></div>' +
        '<ol class="gl-tiles">' + tiles + '</ol>' +
        '<div class="gl-bottom"><div class="gl-friday">' + icon('clock', 'ig-ic') + '<b>' + esc(L(it.rules[0][1])) + '</b><ol>' + fr + '</ol></div>' +
        '<p class="ig-dnote">' + icon('stamp', 'ig-ic gl-note-ic') + esc(L(it.rules[1][1])) + '</p></div>';
    }
    if (it.small) {
      return h + '<div class="it-body is-small"><div class="it-left">' + svg(VB, SCENES[it.scene](U), 'ig-hero') + '</div>' +
        '<div class="it-right"><div class="ig-ba-one"><b>' + esc(U.after) + '</b><p>' + esc(L(it.a)) + '</p></div></div></div>';
    }
    var left = svg(VB, SCENES[it.scene](U), 'ig-hero');
    if (it.extra) left += '<div class="ig-extra">' + it.extra.map(function (e) { return '<div>' + icon(e[0]) + '<span>' + esc(L(e[1])) + '</span></div>'; }).join('') + '</div>';
    if (it.kpi) left += '<div class="ig-kpi"><b>' + esc(it.kpi.v) + '</b><span><strong>' + esc(L(it.kpi.u)) + '</strong>' + esc(L(it.kpi.l)) + '</span></div>';
    var right = (it.b ? '<div class="ig-card is-before">' + svg('0 0 120 92', MINI[it.bm](U), 'ig-mini') + '<div><b>' + esc(U.before) + '</b><p>' + esc(L(it.b)) + '</p></div></div>' +
      '<div class="ig-down" aria-hidden="true">▼</div>' : '') +
      '<div class="ig-card is-after">' + svg('0 0 120 92', MINI[it.am](U), 'ig-mini') + '<div><b>' + esc(U.after) + '</b><p>' + esc(L(it.a)) + '</p></div></div>';
    if (it.steps) right += '<div class="ig-how"><span class="ig-label">' + esc(U.how) + '</span><ol class="ig-steps">' + it.steps.map(function (s, i) {
      return '<li><span class="ig-step-n">' + (i + 1) + '</span>' + icon(s[0]) + '<span>' + esc(L(s[1])) + '</span></li>';
    }).join('') + '</ol></div>';
    if (it.rows) right += '<div class="ig-rows">' + it.rows.map(function (r) { return '<div><b>' + esc(L(r[0])) + '</b><span>' + esc(L(r[1])) + '</span></div>'; }).join('') + '</div>';
    if (it.phases) right += '<ol class="ig-phases">' + X.phases.map(function (p) {
      return '<li style="--b:' + p.col + '"><small>' + esc(L(p.w)) + '</small><b>' + esc(L(p.b)) + '</b><span>' + esc(L(p.d)) + '</span></li>';
    }).join('') + '</ol>';
    if (it.rules) right += '<ul class="ig-rules">' + it.rules.map(function (r) { return '<li>' + icon(r[0]) + '<span>' + esc(L(r[1])) + '</span></li>'; }).join('') + '</ul>';
    if (it.timeline) right += timeline();
    if (it.stats) right += stats();
    if (it.bins) right += '<div class="ig-bins">' + X.bins.map(function (b) { return '<div style="--b:' + b.col + '">' + icon(b.ic) + '<b>' + esc(L(b.l)) + '</b></div>'; }).join('') + '</div>';
    if (it.tree) right += '<div class="ig-tree">' + X.tree.map(function (r) {
      var ic = r.tag ? svg('0 0 72 40', tag(2, 2, 1, r.tag, r.col), 'ig-tag') : icon(r.ic);
      return '<div class="ig-tree-row" style="--b:' + r.col + '">' + ic + '<b>' + esc(L(r.k)) + '</b><span>' + esc(L(r.v)) + '</span></div>';
    }).join('') + '</div>';
    if (it.areas) right += '<div class="ig-bins">' + X.areas.map(function (a) { return '<div style="--b:' + C.green + '">' + icon(a.ic) + '<b>' + esc(L(a.l)) + '</b></div>'; }).join('') + '</div>';
    if (it.stages) right += '<div class="ig-stages">' + X.stages.map(function (s, i) {
      return '<div>' + icon(s.ic) + '<b>' + esc(L(s.l)) + '</b><span>' + esc(L(s.n)) + '</span></div>' + (i < 2 ? '<span class="ig-stage-arrow">➜</span>' : '');
    }).join('') + '</div>';
    h += '<div class="it-body"><div class="it-left">' + left + '</div><div class="it-right">' + right + '</div></div>';
    if (it.cards) h += '<p class="cd-unit">' + esc(U.hours) + '</p><ol class="ig-cards">' + it.cards.map(function (c) {
      return '<li>' + icon(c[0], 'ig-ic cd-ic') + '<b>' + esc(L(c[1])) + '</b>' +
        '<span class="cd-bars"><i class="is-now" style="width:100%"></i><i class="is-new" style="width:' + (c[4] / c[3] * 100).toFixed(0) + '%"></i></span>' +
        '<em>' + perMonth(c[3]).toFixed(1) + ' → ' + perMonth(c[4]).toFixed(1) + 'h</em><strong class="cd-pct">−' + Math.round((c[3] - c[4]) / c[3] * 100) + '%</strong><small>' + esc(L(c[2])) + '</small></li>';
    }).join('') + '</ol>';
    if (it.c) h += '<div class="ig-check">' + svg('0 0 48 48', okCircle(24, 24, 20), 'ig-check-ic') + '<b>' + esc(U.check) + '</b><span>' + esc(L(it.c)) + '</span></div>';
    return h;
  }

  // カレンダーの数字・文字が枠（幅 約 48）に収まる大きさ
  function calFs(lab) {
    var w = 0; for (var i = 0; i < lab.length; i++) w += lab.charCodeAt(i) > 0x2e7f ? 1 : 0.62;
    return Math.max(8, Math.min(15, Math.floor(46 / w)));
  }
  // 経理の時間は日報の 38 営業日分。1 か月 = 21 営業日に換算して見せる
  var REPORT_DAYS = 38, MONTH_DAYS = 21;
  function perMonth(h) { return Math.round(h * MONTH_DAYS / REPORT_DAYS * 10) / 10; }
  // 「今 → 変えた後」の時間を棒グラフで（2 名合計・1 か月あたり）
  function hoursBars(h, U) {
    var m = /([\d.]+)h\s*→\s*([\d.]+)h/.exec(h) || [0, 1, 1];
    var a = perMonth(parseFloat(m[1])), b = perMonth(parseFloat(m[2])), cut = a - b;
    var pct = Math.round(cut / a * 100), perDay = Math.round(cut * 60 / MONTH_DAYS);
    return '<div class="ig-hbar"><small>' + svg('0 0 48 48', face(16, 24, 11, C.blue) + face(32, 24, 11, C.gold), 'hb-ppl') + esc(U.hours) + '</small>' +
      '<div class="hb-row is-now"><span>' + esc(U.hbNow) + '</span><i><em style="width:100%"></em></i><b>' + a.toFixed(1) + 'h</b></div>' +
      '<div class="hb-row is-new"><span>' + esc(U.hbNew) + '</span><i><em style="width:' + (b / a * 100).toFixed(1) + '%"></em></i><b>' + b.toFixed(1) + 'h</b></div>' +
      '<div class="hb-save">' + icon('clock', 'hb-ic') + '<b>−' + cut.toFixed(1) + 'h（−' + pct + '%）</b><span>' + esc(U.perDay(perDay)) + '</span></div></div>';
  }

  function timeline() {
    var w = X.timeline[lang] || X.timeline.ja;
    var b = '<rect x="20" y="40" width="560" height="14" rx="7" fill="' + C.light + '"/>' +
      '<rect x="20" y="40" width="330" height="14" rx="7" fill="' + C.green + '"/><rect x="350" y="40" width="230" height="14" rx="7" fill="' + C.gray + '" opacity=".45"/>' +
      '<line x1="350" y1="22" x2="350" y2="72"' + sw(C.red, 4) + '/>' + clock(350, 14, 12, 14, 0, { ring: C.red }) +
      t(40, 30, '9:00', { fs: 13, a: 'start', fill: C.ink }) + t(560, 30, '18:00', { fs: 13, a: 'end', fill: C.gray });
    return '<div class="ig-timeline">' + svg('0 0 600 80', b) +
      '<div class="ig-tl-labels"><span class="is-today">✔ ' + esc(w[2]) + '</span><span class="is-next">' + esc(w[3]) + '</span></div></div>';
  }
  function stats() {
    var e = X.example[lang] || X.example.ja;
    var h = '<div class="ig-stats">' + X.stats.map(function (s) {
      return '<div style="--b:' + s.col + '">' + icon(s.ic) + '<b class="ig-stat-v">' + s.v + '</b><span class="ig-stat-u">' + esc(L(s.u)) + '</span><span class="ig-stat-l">' + esc(L(s.l)) + '</span></div>';
    }).join('') + '</div>';
    var rows = [[e.qc, e.p1, 500, '8h20m'], [e.qc, e.p2, 250, '4h10m'], [e.pack, e.p1, 160, '2h40m'], [e.pack, e.p2, 80, '1h20m']];
    var b = '';
    rows.forEach(function (r, i) {
      var y = 6 + i * 28, w = r[2] * 30 / 60, col = i < 2 ? C.red : C.teal;
      b += t(170, y + 15, esc(r[0]) + ' · ' + esc(r[1]), { fs: 13, a: 'end', fw: 600 }) +
        '<rect x="180" y="' + y + '" width="' + w + '" height="20" rx="5" fill="' + col + '" opacity="' + (i % 2 ? 0.6 : 1) + '"/>' + t(188 + w, y + 15, r[3], { fs: 13, a: 'start' });
    });
    return h + '<div class="ig-example"><b>' + esc(e.title) + '</b>' + svg('0 0 600 118', b) + '</div>';
  }

  // 付録（イベント手順書）：1 枚目＝担当と Case、2 枚目＝15 ステップ
  function renderApx1() {
    var U = UI[lang], D = DK[lang];
    return '<header class="ig-item-head"><span class="ig-no is-apx">' + esc(U.appendix) + '</span><h2>' + esc(D.handbook) + '：' + esc(L(APX.rolesTitle)) + '</h2></header>' +
      '<div class="ig-roles">' + APX.roles.map(function (r) {
        return '<div style="--b:' + r.col + '">' + svg('0 0 48 48', face(24, 26, 20, r.col), 'ig-role-ic') + '<b>' + esc(L(r.n)) + '</b><span>' + esc(L(r.r)) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="ig-cases">' + APX.cases.map(function (c) { return '<div><b>' + c.k + '</b><span>' + esc(L(c.v)) + '</span></div>'; }).join('') + '</div>' +
      '<div class="ig-check">' + svg('0 0 48 48', okCircle(24, 24, 20), 'ig-check-ic') + '<span>' + esc(L(APX.note)) + '</span></div>';
  }
  function renderApx2() {
    var U = UI[lang], D = DK[lang];
    return '<header class="ig-item-head"><span class="ig-no is-apx">' + esc(U.appendix) + '</span><h2>' + esc(L(APX.title)) + '</h2></header>' +
      '<div class="ig-lanes">' + APX.lanes.map(function (ln) {
        return '<div class="ig-lane" style="--b:' + ln.col + '"><h3>' + esc(L(ln.l)) + '</h3><ol>' + ln.steps.map(function (s) {
          return '<li><span class="ig-step-n">' + s[0] + '</span><b>' + esc(L(s[1])) + '</b><span class="ig-who">' + esc(L(s[2])) + '</span></li>';
        }).join('') + '</ol></div>';
      }).join('') + '</div>';
  }

  function renderApx3() {
    var U = UI[lang];
    return '<header class="ig-item-head"><span class="ig-no is-apx">' + esc(U.appendix) + '</span><h2>' + esc(L(APX.checksTitle)) + '</h2></header>' +
      '<div class="ig-checks">' + APX.checks.map(function (r) {
        return '<div><span class="ig-step-n">' + r[0] + '</span><b>' + esc(L(r[1])) + '</b><span>' + esc(L(r[2])) + '</span><em>' + esc(L(r[3])) + '</em></div>';
      }).join('') + '</div><p class="ig-forms">' + esc(L(APX.forms)) + '</p>';
  }

  function render(lng, m) {
    lang = UI[lng] ? lng : 'ja';
    meta = m || {};
    var D = DK[lang];
    var h = '<div class="deck" id="deck"><div class="stage"><div class="slides">' + renderShelf();
    CHAPTERS.forEach(function (c, i) {
      var pages = pagesOf(i), n = pages.length;
      pages.forEach(function (pg, k) {
        if (pg.kind === 'cover') { h += renderBookCover(i, pages); return; }
        var body = pg.kind === 'item' ? renderItem(pg.it, pg.no) : pg.kind === 'apx1' ? renderApx1() : pg.kind === 'apx2' ? renderApx2() : renderApx3();
        h += slide(i + 1, k + 1, 'sl-item' + (pg.kind === 'item' ? '' : ' sl-apx'), colVars(i) + (pg.kind === 'item' ? (pg.it.b || pg.it.small ? '' : ';--z0:1.15') : ';--z0:' + (pg.kind === 'apx1' ? 1.15 : pg.kind === 'apx3' ? 1.1 : 1.3)), body, foot(i, k + 1, n));
      });
    });
    h += '</div></div>' +
      '<nav class="deck-nav" aria-label="pages">' +
      '<button type="button" class="dn-shelf" data-act="shelf">▦ ' + esc(D.toShelf) + '</button>' +
      '<span class="dn-mid"><button type="button" data-act="prev" aria-label="' + esc(D.prev) + '">‹ ' + esc(D.prev) + '</button>' +
      '<span class="dn-page" aria-live="polite"></span>' +
      '<button type="button" data-act="next" aria-label="' + esc(D.next) + '">' + esc(D.next) + ' ›</button></span>' +
      '<button type="button" class="dn-full" data-act="full" data-on="' + esc(D.exitFull) + '" data-off="' + esc(D.full) + '">⛶ ' + esc(D.full) + '</button>' +
      '</nav><p class="deck-rotate">📱↻ ' + esc(D.rotate) + '</p></div>';
    return h;
  }

  /* ======================= 画面の動き（ページ送り・拡大縮小・印刷） ======================= */
  var deck = null, cur = { b: 0, p: 1 };
  function counts(b) { return b === 0 ? 1 : pagesOf(b - 1).length; }
  function parseHash() {
    var m = /^#\/b(\d)(?:\/(\d+))?$/.exec(location.hash || '');
    if (!m) return { b: 0, p: 1 };
    var b = Math.min(Math.max(+m[1], 1), CHAPTERS.length);
    return { b: b, p: Math.min(Math.max(+(m[2] || 1), 1), counts(b)) };
  }
  function go(b, p, replace) {
    var hash = b === 0 ? '#/' : '#/b' + b + (p > 1 ? '/' + p : '');
    if (location.hash !== hash) { if (replace) history.replaceState(null, '', hash); else location.hash = hash; }
    show();
  }
  function show() {
    if (!deck || !document.body.contains(deck)) return;
    cur = parseHash();
    deck.querySelectorAll('.sl').forEach(function (s) { s.classList.toggle('on', +s.dataset.b === cur.b && +s.dataset.p === cur.p); });
    var n = counts(cur.b), D = DK[lang];
    deck.classList.toggle('at-shelf', cur.b === 0);
    deck.querySelector('.dn-page').textContent = cur.b === 0 ? '' : L(CHAPTERS[cur.b - 1].t) + '　' + D.page(cur.p, n);
    deck.querySelector('[data-act="prev"]').disabled = cur.b === 0;
    deck.querySelector('[data-act="next"]').disabled = cur.b === 0 || cur.p >= n;
    fit();
  }
  function step(d) {
    if (cur.b === 0) { if (d > 0) go(1, 1); return; }
    var n = counts(cur.b), p = cur.p + d;
    if (p < 1) { go(0, 1); return; }
    if (p > n) { if (cur.b < CHAPTERS.length) go(cur.b + 1, 1); return; }
    go(cur.b, p);
  }
  // 画面の大きさに合わせてスライド（1280 × 720）を縮小・拡大
  function fit() {
    if (!deck) return;
    var stage = deck.querySelector('.stage'), nav = deck.querySelector('.deck-nav');
    var top = stage.getBoundingClientRect().top + window.scrollY;
    var fs = document.fullscreenElement != null;
    var w = Math.max(200, window.innerWidth - (fs ? 0 : 24));
    var h = Math.max(150, window.innerHeight - (fs || window.innerHeight <= 520 ? 0 : top) - nav.offsetHeight - (fs ? 8 : 20));
    var k = Math.min(w / 1280, h / 720);
    if (window.innerWidth < 700) k = Math.min(w / 1280, 1); // スマホは幅いっぱい
    deck.style.setProperty('--k', k.toFixed(4));
  }
  // 文字がはみ出すページだけ、文字を少し小さくする
  function shrinkToFit() {
    if (!deck) return;
    deck.classList.add('measuring');
    deck.querySelectorAll('.sl').forEach(function (s) {
      var inner = s.querySelector('.sl-in'), z = parseFloat(s.style.getPropertyValue('--z0')) || 1;
      s.style.setProperty('--z', z.toFixed(2));
      while (inner.scrollHeight > inner.clientHeight + 1 && z > 0.72) { z -= 0.04; s.style.setProperty('--z', z.toFixed(2)); }
    });
    deck.classList.remove('measuring');
  }
  function markPrint() {
    if (!deck) return;
    var b = parseHash().b; // 本棚なら全冊、冊子を開いているならその冊子だけ
    var last = null;
    deck.querySelectorAll('.sl').forEach(function (s) {
      var on = b === 0 || +s.dataset.b === b;
      s.classList.toggle('pr', on); s.classList.remove('pr-last'); if (on) last = s;
    });
    if (last) last.classList.add('pr-last');
  }
  var bound = false;
  function mount(el) {
    deck = el.querySelector('.deck');
    if (!deck) return;
    deck.addEventListener('click', function (e) {
      var a = e.target.closest('[data-go]');
      if (a) { e.preventDefault(); var m = /^b(\d)(?:\/(\d+))?$/.exec(a.dataset.go); go(+m[1], +(m[2] || 1)); return; }
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'prev') step(-1); else if (act === 'next') step(1); else if (act === 'shelf') go(0, 1);
      else if (act === 'full') {
        if (document.fullscreenElement) document.exitFullscreen(); else if (deck.requestFullscreen) deck.requestFullscreen().catch(function () {});
      }
    });
    var sx = null;
    deck.addEventListener('touchstart', function (e) { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
    });
    if (!bound) {
      bound = true;
      window.addEventListener('hashchange', show);
      window.addEventListener('resize', fit);
      window.addEventListener('beforeprint', markPrint);
      document.addEventListener('fullscreenchange', function () {
        var b = deck && deck.querySelector('[data-act="full"]');
        if (b) b.textContent = '⛶ ' + (document.fullscreenElement ? b.dataset.on : b.dataset.off);
        fit();
      });
      document.addEventListener('keydown', function (e) {
        if (!deck || !document.body.contains(deck) || document.body.classList.contains('is-editing')) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
        else if (e.key === 'Home') { e.preventDefault(); go(0, 1); }
      });
    }
    show();
    var after = function () { shrinkToFit(); fit(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(after); else after();
  }

  root.KaizenInfo = { date: DOC_DATE, render: render, mount: mount, markPrint: function () { markPrint(); } };
})(typeof self !== 'undefined' ? self : this);
