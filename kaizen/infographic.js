/* 業務改善マニュアル — イラスト版（インフォグラフィック）
 *
 *   window.KaizenInfo.render(lang, meta) → HTML
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
    { c: C.purple, s: C.purpleS }, { c: C.green, s: C.greenS }
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
        calendar(126, 20, 1, L.mon, { top: C.teal, fs: 13 }) + doc(196, 6, 0.95) + stamp(232, 52, 12) + arrow(110, 160, 190, 160, C.teal, true);
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
    count: function () { return clipboard(12, 4, 0.62, [1, 1, 0]); }
  };

  /* ======================= 文言（3 言語） ======================= */
  var UI = {
    ja: {
      kicker: 'イラストで見る 業務改善', before: 'これまで', after: 'これから', how: 'やり方', check: 'チェック',
      howToRead: 'このマニュアルの見方', legendBefore: '困っていたこと', legendAfter: '新しいやり方', legendCheck: 'できているかの確認',
      areas: '改善する 5 つのエリア', chapter: function (n) { return '第 ' + n + ' 章'; }, appendix: '付録', inReview: '内容確認中',
      textNote: 'くわしい説明は右上の「文章」で見られます。', confidential: '社内資料・取り扱い注意',
      am: '朝', today: '今日', ours: '自社', bizDays: '営業日', mon: '月', minus1: '前日', handbook: '手順書', perPair: '1 足あたり'
    },
    en: {
      kicker: 'Process improvement, in pictures', before: 'Before', after: 'From now on', how: 'How', check: 'Check',
      howToRead: 'How to read this manual', legendBefore: 'What went wrong', legendAfter: 'The new way', legendCheck: 'How we know it works',
      areas: '5 areas we are improving', chapter: function (n) { return 'Chapter ' + n; }, appendix: 'Appendix', inReview: 'Being confirmed',
      textNote: 'For full details, switch to “Text” at the top right.', confidential: 'Internal use only',
      am: 'AM', today: 'Today', ours: 'Ours', bizDays: 'business days', mon: 'MON', minus1: '−1 day', handbook: 'Handbook', perPair: 'per pair'
    },
    th: {
      kicker: 'ปรับปรุงการทำงาน ดูเข้าใจง่ายด้วยภาพ', before: 'แบบเดิม', after: 'แบบใหม่', how: 'วิธีทำ', check: 'ตรวจสอบ',
      howToRead: 'วิธีอ่านคู่มือนี้', legendBefore: 'ปัญหาที่เคยเกิด', legendAfter: 'วิธีทำงานแบบใหม่', legendCheck: 'ดูว่าทำได้จริงหรือไม่',
      areas: '5 ส่วนงานที่จะปรับปรุง', chapter: function (n) { return 'บทที่ ' + n; }, appendix: 'ภาคผนวก', inReview: 'อยู่ระหว่างตรวจสอบ',
      textNote: 'ดูรายละเอียดทั้งหมดได้ที่ปุ่ม “ข้อความ” มุมขวาบน', confidential: 'เอกสารใช้ภายในบริษัท',
      am: 'เช้า', today: 'วันนี้', ours: 'ของเรา', bizDays: 'วันทำการ', mon: 'จ.', minus1: '−1 วัน', handbook: 'คู่มือ', perPair: 'ต่อ 1 คู่'
    }
  };

  // 章
  var CHAPTERS = [
    { icon: 'pos', t: { ja: '経理', en: 'Accounting', th: 'บัญชี' },
      d: { ja: '売上・決済・返金を毎日確認', en: 'Check sales, payments and refunds every day', th: 'ตรวจยอดขาย การชำระเงิน และการคืนเงินทุกวัน' } },
    { icon: 'truck', t: { ja: '店舗・イベント・オンライン物流', en: 'Store, Event & Online Logistics', th: 'โลจิสติกส์ร้านค้า อีเวนต์ และออนไลน์' },
      d: { ja: '商品の動きをオフィスが計画的に管理', en: 'The office plans how stock moves', th: 'ออฟฟิศวางแผนการเคลื่อนย้ายสินค้า' } },
    { icon: 'search', t: { ja: 'QC・検品', en: 'QC & Inspection', th: 'QC และการตรวจสินค้า' },
      d: { ja: '時間の基準と、仕分けのルール', en: 'Standard times and sorting rules', th: 'เวลามาตรฐานและกฎการคัดแยก' } },
    { icon: 'check', t: { ja: '人事', en: 'HR', th: 'ฝ่ายบุคคล' },
      d: { ja: 'だれが・いつ・どこに入るかを見える化', en: 'Show who works where, and when', th: 'เห็นชัดว่าใคร อยู่ที่ไหน เมื่อไร' } },
    { icon: 'clean', t: { ja: '全体', en: 'Company-wide', th: 'ทั้งบริษัท' },
      d: { ja: '全員で守るルール', en: 'Rules for everyone', th: 'กฎที่ทุกคนต้องทำ' } }
  ];

  // 項目
  var ITEMS = [
    /* ---------- 第 1 章 経理 ---------- */
    { ch: 0, scene: 'pos', bm: 'pile', am: 'check',
      t: { ja: '毎日、売上を照合する', en: 'Reconcile sales every day', th: 'กระทบยอดขายทุกวัน' },
      when: { ja: '毎営業日・午前', en: 'Every business day · morning', th: 'ทุกวันทำการ · ช่วงเช้า' },
      b: { ja: 'あとでまとめて確認していたので、差額の原因が分からなくなっていた', en: 'Checks were done later in batches, so the cause of differences got lost', th: 'ตรวจรวมกันทีหลัง จึงหาสาเหตุของส่วนต่างไม่ได้' },
      a: { ja: '毎朝、前日分を照合してチェック表に記入する', en: 'Every morning, reconcile yesterday’s sales and fill in the check sheet', th: 'ทุกเช้า กระทบยอดของเมื่อวาน แล้วกรอกตารางตรวจ' },
      steps: [
        ['pos', { ja: 'POS 売上を出す', en: 'Pull POS sales', th: 'ดึงยอดขาย POS' }],
        ['pay', { ja: '決済データと照合', en: 'Match with payment data', th: 'เทียบกับข้อมูลการชำระเงิน' }],
        ['search', { ja: '差額は当日中に理由を確認', en: 'Find the reason for any gap the same day', th: 'มีส่วนต่าง หาสาเหตุภายในวัน' }],
        ['check', { ja: 'チェック表に記入', en: 'Fill in the check sheet', th: 'กรอกตารางตรวจ' }]],
      c: { ja: 'チェック表が毎日埋まっている・差額を翌日に残さない', en: 'Check sheet filled in daily · no gaps left for the next day', th: 'กรอกตารางครบทุกวัน · ไม่มีส่วนต่างค้างถึงวันถัดไป' } },
    { ch: 0, scene: 'refund', bm: 'wait', am: 'check',
      t: { ja: '返金案件を毎日チェック', en: 'Check for refunds every day', th: 'เช็กรายการคืนเงินทุกวัน' },
      when: { ja: '毎日', en: 'Every day', th: 'ทุกวัน' },
      b: { ja: 'その都度確認しておらず、照合が合わない・お客様を待たせていた', en: 'Not checked as they happened — sales didn’t match and customers waited', th: 'ไม่ได้เช็กทันที ยอดไม่ตรง และลูกค้าต้องรอ' },
      a: { ja: '毎日チェックし、当日中または翌朝一番に処理する', en: 'Check daily and process the same day, or first thing next morning', th: 'เช็กทุกวัน ดำเนินการภายในวัน หรือเป็นงานแรกของเช้าวันถัดไป' },
      c: { ja: '返金の発生日と処理日を表に記録', en: 'Record the date each refund happened and was processed', th: 'บันทึกวันที่เกิดและวันที่ดำเนินการคืนเงิน' } },
    { ch: 0, scene: 'sku', bm: 'search', am: 'ai', review: true,
      t: { ja: 'Siam Discovery・Central の SKU コード照合', en: 'Matching Siam Discovery & Central SKU codes', th: 'เทียบรหัส SKU ของ Siam Discovery และ Central' },
      b: { ja: '相手のコードが自社と違うため、1 行ずつ目で確認していた', en: 'Their codes differ from ours, so every line was checked by eye', th: 'รหัสไม่ตรงกับของบริษัท ต้องตรวจด้วยตาทีละบรรทัด' },
      a: { ja: 'AI を使って照合する', en: 'Match the codes with AI', th: 'ใช้ AI ช่วยเทียบรหัส' } },
    { ch: 0, scene: 'monthly', small: true,
      t: { ja: '月次レポート', en: 'Monthly report', th: 'รายงานประจำเดือน' },
      a: { ja: '毎月初 5 営業日以内に提出', en: 'Submit within the first 5 business days of each month', th: 'ส่งภายใน 5 วันทำการแรกของทุกเดือน' } },

    /* ---------- 第 2 章 物流 ---------- */
    { ch: 1, scene: 'restock', bm: 'mess', am: 'calendar',
      t: { ja: '店舗の在庫はオフィスが管理、毎週月曜に補充', en: 'The office manages store stock and restocks every Monday', th: 'ออฟฟิศดูแลสต็อกสาขา และเติมสินค้าทุกวันจันทร์' },
      when: { ja: '毎週月曜日', en: 'Every Monday', th: 'ทุกวันจันทร์' },
      b: { ja: 'PC が毎回在庫を確認して依頼していたので、販売に集中できなかった', en: 'PCs had to check stock and request items each time — less time for selling', th: 'PC ต้องเช็กสต็อกและขอของเองทุกครั้ง จึงโฟกัสการขายไม่ได้' },
      a: { ja: 'オフィスが在庫と売れ行きを見て、月曜にまとめて補充する', en: 'The office watches stock and sales and restocks every Monday', th: 'ออฟฟิศดูสต็อกและยอดขาย แล้วเติมของให้ทุกวันจันทร์' },
      steps: [
        ['list', { ja: '補充リストを作る', en: 'Make the restock list', th: 'ทำรายการเติมสินค้า' }],
        ['box', { ja: 'ピッキング・デリバリーノート作成', en: 'Pick items · write the Delivery Note', th: 'หยิบของ · ทำ Delivery Note' }],
        ['stamp', { ja: '承認・照合して発送', en: 'Approve, check, then ship', th: 'อนุมัติ ตรวจ แล้วส่ง' }],
        ['data', { ja: '在庫データに反映', en: 'Update the stock data', th: 'อัปเดตข้อมูลสต็อก' }],
        ['store', { ja: '店舗で受領チェック', en: 'Store checks on arrival', th: 'สาขาตรวจตอนรับของ' }]],
      extra: [
        ['count', { ja: '月末：PC が在庫を数えて報告し、システムの在庫と照合', en: 'Month-end: the PC counts and reports stock, and it is matched with the system', th: 'สิ้นเดือน: PC นับสต็อกและรายงาน แล้วเทียบกับสต็อกในระบบ' }],
        ['truck', { ja: '週末：Paradise Park からのオンライン発送はリストにして、売上報告と一緒に送る', en: 'Weekends: online orders shipped from Paradise Park go on a list sent with the daily sales report', th: 'เสาร์–อาทิตย์: ออเดอร์ออนไลน์ที่ส่งจาก Paradise Park ให้ทำรายการ ส่งพร้อมรายงานยอดขาย' }]],
      c: { ja: '毎週月曜に全店舗へ発送・月末の差異件数を記録', en: 'All stores shipped every Monday · month-end differences recorded', th: 'ส่งครบทุกสาขาทุกวันจันทร์ · บันทึกรายการไม่ตรงสิ้นเดือน' } },
    { ch: 1, scene: 'online', bm: 'late', am: 'fast',
      t: { ja: 'オンライン注文は 14:00 締め・当日発送', en: 'Online orders: 2 PM cut-off, same-day shipping', th: 'ออเดอร์ออนไลน์ ปิดรับ 14:00 น. ส่งภายในวัน' },
      when: { ja: '毎日', en: 'Every day', th: 'ทุกวัน' },
      b: { ja: '朝の発送のあとに入った注文は、翌日発送になっていた', en: 'Orders that came in after the morning shipment waited until the next day', th: 'ออเดอร์ที่เข้ามาหลังส่งรอบเช้า ต้องรอส่งวันรุ่งขึ้น' },
      a: { ja: '14:00 までの注文は必ず当日発送', en: 'Every order received by 2 PM ships the same day', th: 'ออเดอร์ที่เข้าก่อน 14:00 น. ส่งภายในวันทุกออเดอร์' },
      timeline: true,
      c: { ja: '発送したら表にチェック', en: 'Tick the sheet once shipped', th: 'ส่งแล้วติ๊กในตาราง' } },
    { ch: 1, scene: 'equip', bm: 'search', am: 'check',
      t: { ja: 'イベント備品はチェックリストで準備', en: 'Prepare event equipment with a checklist', th: 'เตรียมอุปกรณ์อีเวนต์ด้วยเช็กลิสต์' },
      b: { ja: '備品を探したり確認したりに時間がかかり、抜け漏れも起きていた', en: 'Time was lost searching and checking, and items were forgotten', th: 'เสียเวลาหาของและเช็ก และมีของตกหล่น' },
      a: { ja: '備品・什器リストで 3 回チェックして抜け漏れを防ぐ', en: 'Check with the equipment list three times so nothing is missed', th: 'เช็กด้วยรายการอุปกรณ์ 3 ครั้ง ไม่ให้มีของตกหล่น' },
      steps: [
        ['check', { ja: '準備するとき', en: 'When preparing', th: 'ตอนเตรียมของ' }],
        ['load', { ja: '積み込む前', en: 'Before loading', th: 'ก่อนขนขึ้นรถ' }],
        ['booth', { ja: '設営するとき', en: 'At setup', th: 'ตอนจัดบูธ' }]],
      c: { ja: '備品リストの確認欄に ✅ を入れる', en: 'Tick ✅ on the equipment list', th: 'ติ๊ก ✅ ในรายการอุปกรณ์' } },
    { ch: 1, scene: 'vehicle', bm: 'wait', am: 'fast',
      t: { ja: '車両は前日までに確保', en: 'Book the vehicle by the day before', th: 'จองรถให้ได้ภายในวันก่อนหน้า' },
      b: { ja: '直前に配車していたので、待ち時間で積み込み・搬入・搬出が遅れていた', en: 'Last-minute bookings meant waiting, so loading and moving started late', th: 'จองรถกระชั้นชิด ต้องรอรถ ทำให้ขนของล่าช้า' },
      a: { ja: '1 日前までに車両を確保する', en: 'Have the vehicle confirmed by the day before', th: 'ได้รถก่อนวันงานอย่างน้อย 1 วัน' },
      c: { ja: '配車表に記入。グループには「時間」と「確保完了」だけ報告', en: 'Fill in the vehicle schedule; post only the time and “confirmed” in the group', th: 'กรอกตารางจัดรถ แจ้งในกลุ่มแค่ “เวลา” และ “ได้รถแล้ว”' } },
    { ch: 1, scene: 'event', bm: 'mess', am: 'check',
      t: { ja: 'イベントは手順書どおりに', en: 'Run every event by the handbook', th: 'ทำอีเวนต์ตามคู่มือขั้นตอน' },
      b: { ja: '毎回やり方がバラバラで準備に時間がかかり、棚戻しが遅れて在庫差異の原因にも', en: 'Different every time, so preparation was slow; late returns to the shelves caused stock gaps', th: 'ทำไม่เหมือนกันทุกครั้ง เตรียมนาน เก็บขึ้นชั้นช้า ทำให้สต็อกไม่ตรง' },
      a: { ja: '手順書のプロセスを守って効率化（付録を参照）', en: 'Follow the handbook to work efficiently (see the appendix)', th: 'ทำตามคู่มือขั้นตอนเพื่อให้มีประสิทธิภาพ (ดูภาคผนวก)' },
      stages: true,
      c: { ja: 'Delivery Note と「返送＋販売数」が一致。差異は報告して承認', en: 'Delivery Note = returned + sold. Any gap is reported and approved', th: 'Delivery Note ตรงกับ “ส่งกลับ + ขาย” ส่วนต่างต้องรายงานและอนุมัติ' } },

    /* ---------- 第 3 章 QC ---------- */
    { ch: 2, scene: 'times', bm: 'wait', am: 'timer',
      t: { ja: '作業時間の基準で準備を計画', en: 'Plan with standard work times', th: 'วางแผนงานด้วยเวลามาตรฐาน' },
      b: { ja: '作業が人まかせで時間が読めず、直前に人を集めてムダが出ていた', en: 'Work depended on certain people, time was unpredictable, and help was found at the last minute', th: 'งานขึ้นกับบางคน คาดเวลาไม่ได้ ต้องหาคนกระชั้นชิด เสียเวลาและค่าแรง' },
      a: { ja: '「足数 × 基準時間」で、人数と日程を先に決める', en: 'Decide people and schedule first: pairs × standard time', th: 'กำหนดคนและตารางงานก่อน: จำนวนคู่ × เวลามาตรฐาน' },
      stats: true,
      c: { ja: '計画した時間と、実際にかかった時間の差', en: 'The gap between planned and actual time', th: 'ส่วนต่างระหว่างเวลาตามแผนกับเวลาจริง' } },
    { ch: 2, scene: 'qc', bm: 'search', am: 'check',
      t: { ja: '初期 QC：全足を検査して 4 つに分ける', en: 'Initial QC: inspect every pair, sort into 4', th: 'QC เบื้องต้น: ตรวจทุกคู่ แยกเป็น 4 กลุ่ม' },
      b: { ja: '検査の項目や判断が人によって違い、検品時間も見積もれなかった', en: 'Checks and judgment varied by person, and inspection time could not be estimated', th: 'รายการตรวจและการตัดสินต่างกันไปแต่ละคน และคาดเวลาไม่ได้' },
      a: { ja: '検査項目を固定し、1 足 1 分 40 秒が目安', en: 'Fixed check items — about 1 min 40 sec per pair', th: 'กำหนดรายการตรวจชัดเจน ประมาณคู่ละ 1 นาที 40 วินาที' },
      bins: true,
      c: { ja: '店舗・お客様から戻ってきた不良の件数（月ごと）', en: 'Defects returned from stores or customers (per month)', th: 'จำนวนสินค้าชำรุดที่ถูกส่งคืนจากสาขาหรือลูกค้า (ต่อเดือน)' } },
    { ch: 2, scene: 'bgrade', bm: 'mess', am: 'money',
      t: { ja: 'B 品は早く仕分けて現金化', en: 'Sort B-grade items fast and turn them into cash', th: 'คัดแยกสินค้าเกรด B ให้เร็ว เปลี่ยนเป็นเงินสด' },
      b: { ja: 'B 品のルールがなく、直せる商品まで倉庫に眠っていた', en: 'No rules for B-grade items — even repairable ones sat in the warehouse', th: 'ไม่มีกฎสำหรับสินค้าเกรด B แม้แต่ของที่ซ่อมได้ก็ค้างในคลัง' },
      a: { ja: 'QC の結果で 4 つに仕分けて、すぐ販売・修理へ', en: 'Sort into 4 groups by the QC result, then sell or repair right away', th: 'คัดแยกเป็น 4 กลุ่มตามผล QC แล้วนำไปขายหรือซ่อมทันที' },
      tree: true,
      c: { ja: '仕分けから販売・修理までの日数・倉庫の B 品数（月 1 回）', en: 'Days from sorting to sale or repair · B-grade pairs in stock (monthly)', th: 'จำนวนวันจากคัดแยกถึงขายหรือส่งซ่อม · จำนวนเกรด B ในคลัง (เดือนละครั้ง)' } },

    /* ---------- 第 4 章 人事 ---------- */
    { ch: 3, scene: 'pc', bm: 'search', am: 'table',
      t: { ja: '担当 PC の予定表を作る', en: 'Make a PC schedule', th: 'ทำตาราง PC ประจำสาขาและอีเวนต์' },
      b: { ja: '予定が一覧になっておらず、だれがどこにいるか分かりにくかった', en: 'No single schedule — hard to know who was where', th: 'ไม่มีตารางรวม ไม่รู้ว่าใครอยู่ที่ไหน' },
      a: { ja: '「日付 × 店舗・イベント」の表を作る', en: 'One table: date × store / event', th: 'ทำตาราง “วันที่ × สาขา / อีเวนต์”' },
      c: { ja: '表に空欄（担当未定）がない', en: 'No blank (unassigned) cells', th: 'ไม่มีช่องว่าง (ยังไม่มีคนประจำ)' } },

    /* ---------- 第 5 章 全体 ---------- */
    { ch: 4, scene: 'clean', bm: 'mess', am: 'check',
      t: { ja: 'ゴミ・掃除は当番制', en: 'Rotating trash & cleaning duty', th: 'เวรทิ้งขยะและทำความสะอาด' },
      when: { ja: '週替わり', en: 'Weekly rotation', th: 'หมุนเวียนรายสัปดาห์' },
      b: { ja: '担当が決まっておらず、気づいた人だけがやっていた', en: 'No one was assigned — only whoever noticed did it', th: 'ไม่มีคนรับผิดชอบ ใครเห็นก็ทำ' },
      a: { ja: '週替わりの当番が、掲示したチェックリストで行う', en: 'A weekly rota, done with a posted checklist', th: 'มีเวรประจำสัปดาห์ ทำตามเช็กลิสต์ที่ติดประกาศไว้' },
      areas: true,
      c: { ja: '当番表のチェック欄が毎週埋まっている', en: 'The rota’s check boxes are filled in every week', th: 'ช่องเช็กในตารางเวรครบทุกสัปดาห์' } }
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
      { k: { ja: '修理できる', en: 'Repairable', th: 'ซ่อมได้' }, v: { ja: '接着は社内・縫製は外部 → 再 QC → 良品として販売', en: 'Glue in-house · stitching outsourced → QC again → sell as good', th: 'ติดกาวเอง · งานเย็บส่งภายนอก → QC อีกครั้ง → ขายเป็นสินค้าปกติ' }, col: C.green, ic: 'glue' },
      { k: { ja: '軽い傷・汚れ（直せない）', en: 'Minor damage (can’t repair)', th: 'ตำหนิเล็กน้อย (ซ่อมไม่ได้)' }, v: { ja: '15% OFF でクリアランス（15% を超える割引は管理者に確認）', en: 'Clearance at 15% off (over 15% needs a manager’s OK)', th: 'ลดราคาล้างสต็อก 15% (ลดเกิน 15% ต้องให้ผู้จัดการยืนยัน)' }, col: C.gold, tag: '-15%' },
      { k: { ja: '部品の欠損', en: 'Missing parts', th: 'ชิ้นส่วนขาดหาย' }, v: { ja: '最大 50% OFF で販売', en: 'Sell at up to 50% off', th: 'ขายลดสูงสุด 50%' }, col: C.red, tag: '-50%' },
      { k: { ja: '販売できない', en: 'Not sellable', th: 'ขายไม่ได้' }, v: { ja: '理由を記録して処分', en: 'Record the reason, then dispose', th: 'บันทึกเหตุผล แล้วนำไปทิ้ง' }, col: C.gray, ic: 'ng' }
    ],
    areas: [
      { l: { ja: 'ゴミ出し', en: 'Trash', th: 'ทิ้งขยะ' }, ic: 'bin' }, { l: { ja: '床・机', en: 'Floor & desks', th: 'พื้นและโต๊ะ' }, ic: 'broom' },
      { l: { ja: '倉庫の通路', en: 'Warehouse aisles', th: 'ทางเดินในคลัง' }, ic: 'box' }, { l: { ja: 'トイレ・給湯', en: 'Toilet & kitchenette', th: 'ห้องน้ำและมุมเครื่องดื่ม' }, ic: 'spark' }
    ],
    stages: [
      { l: { ja: '準備・出庫', en: 'Prepare & stock out', th: 'เตรียมของ · เบิกออก' }, n: '1–5', ic: 'box' },
      { l: { ja: '会期中', en: 'During the event', th: 'ระหว่างงาน' }, n: '6–8', ic: 'booth' },
      { l: { ja: 'Close・棚戻し', en: 'Close & back to shelves', th: 'ปิดงาน · เก็บขึ้นชั้น' }, n: '9–15', ic: 'check' }
    ]
  };

  // 付録：イベント手順（15 ステップ）
  var APX = {
    title: { ja: 'イベント手順（15 ステップ）', en: 'Event procedure (15 steps)', th: 'ขั้นตอนอีเวนต์ (15 ขั้นตอน)' },
    rolesTitle: { ja: '担当と役割', en: 'Who does what', th: 'ใครทำอะไร' },
    roles: [
      { n: 'Hoshino', r: { ja: 'Event Proposal（レイアウト・商品リスト）、Case ①／② の判断', en: 'Event Proposal (layout, product list); decides Case ① or ②', th: 'ทำ Event Proposal (Layout, Product list) และตัดสิน Case ①/②' }, col: C.navy },
      { n: 'Ying', r: { ja: 'Delivery Note、商品準備、設営、補充、撤収、結果報告', en: 'Delivery Note, preparing stock, setup, restocks, pack-up, report', th: 'Delivery Note เตรียมสินค้า จัดบูธ เติมสินค้า เก็บบูธ รายงานผล' }, col: C.teal },
      { n: { ja: '倉庫担当', en: 'Warehouse', th: 'คลังสินค้า' }, r: { ja: '商品準備、設営、撤収、翌営業日のカウント、棚戻し', en: 'Preparing stock, setup, pack-up, next-day count, back to shelves', th: 'เตรียมสินค้า จัดบูธ เก็บบูธ นับวันถัดไป เก็บขึ้นชั้น' }, col: '#b7790f' },
      { n: { ja: 'PC 責任者', en: 'PC in charge', th: 'PC ผู้รับผิดชอบ' }, r: { ja: '初日朝の受領カウント、補充のカウント、レジ締め', en: 'First-morning count, restock count, closes the register', th: 'นับรับสินค้าเช้าวันแรก นับสินค้าเติม ปิดยอด POS' }, col: C.purple },
      { n: { ja: '経理', en: 'Accounting', th: 'ฝ่ายบัญชี' }, r: { ja: 'Zort の在庫移動、売上レポート、照合', en: 'Zort stock transfers, sales report, reconciliation', th: 'โอนสต็อกใน Zort ออกรายงานยอดขาย กระทบยอด' }, col: C.green },
      { n: 'Shimada', r: { ja: 'Delivery Note と差異の承認', en: 'Approves the Delivery Note and differences', th: 'อนุมัติ Delivery Note และส่วนต่าง' }, col: C.red }
    ],
    lanes: [
      { l: { ja: '準備・出庫', en: 'Prepare & stock out', th: 'เตรียมของ · เบิกออก' }, col: C.navy, steps: [
        ['1', 'Event Proposal', 'Hoshino'], ['2', 'Delivery Note', 'Ying'], ['3', { ja: '承認（Sign）', en: 'Sign', th: 'ลงนาม (Sign)' }, 'Shimada'],
        ['4', { ja: '商品準備', en: 'Prepare', th: 'เตรียมสินค้า' }, { ja: 'Ying＋倉庫', en: 'Ying + warehouse', th: 'Ying + คลัง' }], ['5', { ja: 'Zort 出庫', en: 'Stock out (Zort)', th: 'เบิกออก (Zort)' }, { ja: '経理', en: 'Accounting', th: 'บัญชี' }]] },
      { l: { ja: '会期中', en: 'During the event', th: 'ระหว่างงาน' }, col: C.teal, steps: [
        ['6', { ja: '設営（前日）', en: 'Setup (day before)', th: 'จัดบูธ (วันก่อนงาน)' }, { ja: 'Ying＋倉庫', en: 'Ying + warehouse', th: 'Ying + คลัง' }],
        ['7', { ja: '受領カウント（初日朝）', en: 'Receipt count (first morning)', th: 'นับรับสินค้า (เช้าวันแรก)' }, 'PC'],
        ['8', { ja: '補充（発送＋Zort）', en: 'Refill (ship + Zort)', th: 'เติมสินค้า (ส่ง + Zort)' }, { ja: 'Ying・経理', en: 'Ying · Accounting', th: 'Ying · บัญชี' }]] },
      { l: { ja: 'Close・棚戻し', en: 'Close & back to shelves', th: 'ปิดงาน · เก็บขึ้นชั้น' }, col: '#b7790f', steps: [
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
      { k: 'Case ②', v: { ja: '次のイベントが 2 週間以内・同規模以上なら、棚に戻さず待機エリアで保管', en: 'Next event within 2 weeks and the same size or larger: keep it packed in the holding area', th: 'อีเวนต์ถัดไปภายใน 2 สัปดาห์ และขนาดเท่าเดิมหรือใหญ่กว่า: ไม่ขึ้นชั้น เก็บที่พื้นที่พักสินค้า' } }
    ],
    note: { ja: '数える人と Zort に入力する人は別。Zort の移動と売上レポートは経理だけが行う。', en: 'The person who counts never enters the numbers in Zort. Only Accounting moves stock in Zort and runs sales reports.', th: 'คนนับกับคนบันทึกใน Zort ต้องเป็นคนละคน การโอนใน Zort และรายงานยอดขายทำโดยฝ่ายบัญชีเท่านั้น' }
  };

  /* ======================= 組み立て ======================= */
  var lang = 'ja';
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

  function renderCover(m) {
    var art = ground(310, 300, 290, C.light) + warehouse(10, 196, 1.2) + truck(140, 248, 0.95, C.teal) +
      person(285, 300, 1.15, { shirt: C.navy, mood: 'happy', arms: 'up' }) + person(350, 300, 1.08, { shirt: C.gold, mood: 'happy', long: 1 }) +
      person(415, 300, 1.12, { shirt: C.teal, mood: 'happy', arms: 'hold' }) + store(455, 165, 1.45) +
      clipboard(318, 34, 1.5, [1, 1, 1]) + okCircle(404, 52, 20) + shoe(36, 120, 1.0, C.red) +
      sparkle(160, 96, 13) + sparkle(256, 70, 8, C.blue) + sparkle(596, 120, 10, C.blue);
    var chips = CHAPTERS.map(function (c, i) {
      return '<span class="ig-chip" style="--c:' + CH[i].c + ';--s:' + CH[i].s + '">' + icon(c.icon, 'ig-chip-ic') + '<b>' + esc(L(c.t)) + '</b></span>';
    }).join('');
    return '<section class="ig-cover" id="top">' +
      '<div class="cover-top"><span>' + esc(m.company || '') + '</span><span>' + esc(m.dateText || '') + '</span></div>' +
      '<p class="ig-kicker">' + esc(UI[lang].kicker) + '</p>' +
      '<h1 class="ig-title">' + esc(m.title || '') + '</h1>' +
      (m.subtitle ? '<p class="ig-sub">' + esc(m.subtitle) + '</p>' : '') +
      '<div class="ig-chips">' + chips + '</div>' +
      '<div class="ig-cover-art">' + svg('0 0 620 320', art) + '</div>' +
      '<p class="cover-foot">' + esc(UI[lang].confidential) + '</p></section>';
  }

  function renderGuide() {
    var U = UI[lang];
    var h = '<section class="ig-guide"><h2 class="ig-h2" id="toc">' + esc(U.howToRead) + '</h2><div class="ig-legend">' +
      '<div class="ig-leg is-before">' + svg('0 0 120 92', MINI.pile(U), 'ig-leg-art') + '<b>' + esc(U.before) + '</b><span>' + esc(U.legendBefore) + '</span></div>' +
      '<div class="ig-leg-arrow" aria-hidden="true">➜</div>' +
      '<div class="ig-leg is-after">' + svg('0 0 120 92', MINI.check(U), 'ig-leg-art') + '<b>' + esc(U.after) + '</b><span>' + esc(U.legendAfter) + '</span></div>' +
      '<div class="ig-leg-arrow" aria-hidden="true">➜</div>' +
      '<div class="ig-leg is-check">' + svg('0 0 48 48', okCircle(24, 24, 18), 'ig-leg-art ig-leg-ok') + '<b>' + esc(U.check) + '</b><span>' + esc(U.legendCheck) + '</span></div></div>';
    h += '<h2 class="ig-h2">' + esc(U.areas) + '</h2><div class="ig-areas">';
    CHAPTERS.forEach(function (c, i) {
      var items = ITEMS.filter(function (it) { return it.ch === i; });
      h += '<a class="ig-area" href="#igch' + (i + 1) + '" style="--c:' + CH[i].c + ';--s:' + CH[i].s + '">' + icon(c.icon, 'ig-area-ic') +
        '<span class="ig-area-no">' + esc(U.chapter(i + 1)) + '</span><b>' + esc(L(c.t)) + '</b><span class="ig-area-d">' + esc(L(c.d)) + '</span>' +
        '<ul>' + items.map(function (it) { return '<li>' + esc(L(it.t)) + '</li>'; }).join('') + '</ul></a>';
    });
    return h + '</div><p class="ig-textnote">' + esc(U.textNote) + '</p></section>';
  }

  function renderItem(it, no) {
    var U = UI[lang], col = CH[it.ch];
    var h = '<article class="ig-item' + (it.small ? ' is-small' : '') + '" style="--c:' + col.c + ';--s:' + col.s + '">';
    h += '<header class="ig-item-head"><span class="ig-no">' + no + '</span><h3>' + esc(L(it.t)) + '</h3>' +
      (it.review ? '<span class="ig-pill">' + esc(U.inReview) + '</span>' : '') + (it.when ? '<span class="ig-when">🕘 ' + esc(L(it.when)) + '</span>' : '') + '</header>';
    if (it.small) {
      return h + '<div class="ig-small">' + svg(VB, SCENES[it.scene](U), 'ig-hero') + '<div class="ig-ba-one is-after"><b>' + esc(U.after) + '</b><p>' + esc(L(it.a)) + '</p></div></div></article>';
    }
    h += '<div class="ig-top">' + svg(VB, SCENES[it.scene](U), 'ig-hero') + '<div class="ig-ba">' +
      '<div class="ig-card is-before">' + svg('0 0 120 92', MINI[it.bm](U), 'ig-mini') + '<div><b>' + esc(U.before) + '</b><p>' + esc(L(it.b)) + '</p></div></div>' +
      '<div class="ig-down" aria-hidden="true">▼</div>' +
      '<div class="ig-card is-after">' + svg('0 0 120 92', MINI[it.am](U), 'ig-mini') + '<div><b>' + esc(U.after) + '</b><p>' + esc(L(it.a)) + '</p></div></div>' +
      '</div></div>';
    if (it.steps) h += '<div class="ig-how"><span class="ig-label">' + esc(U.how) + '</span><ol class="ig-steps">' + it.steps.map(function (s, i) {
      return '<li><span class="ig-step-n">' + (i + 1) + '</span>' + icon(s[0]) + '<span>' + esc(L(s[1])) + '</span></li>';
    }).join('') + '</ol></div>';
    if (it.extra) h += '<div class="ig-extra">' + it.extra.map(function (e) { return '<div>' + icon(e[0]) + '<span>' + esc(L(e[1])) + '</span></div>'; }).join('') + '</div>';
    if (it.timeline) h += timeline();
    if (it.stats) h += stats();
    if (it.bins) h += '<div class="ig-bins">' + X.bins.map(function (b) { return '<div style="--b:' + b.col + '">' + icon(b.ic) + '<b>' + esc(L(b.l)) + '</b></div>'; }).join('') + '</div>';
    if (it.tree) h += '<div class="ig-tree">' + X.tree.map(function (r) {
      var ic = r.tag ? svg('0 0 72 40', tag(2, 2, 1, r.tag, r.col), 'ig-tag') : icon(r.ic);
      return '<div class="ig-tree-row" style="--b:' + r.col + '">' + ic + '<b>' + esc(L(r.k)) + '</b><span class="ig-tree-arrow">➜</span><span>' + esc(L(r.v)) + '</span></div>';
    }).join('') + '</div>';
    if (it.areas) h += '<div class="ig-bins ig-areas4">' + X.areas.map(function (a) { return '<div style="--b:' + C.green + '">' + icon(a.ic) + '<b>' + esc(L(a.l)) + '</b></div>'; }).join('') + '</div>';
    if (it.stages) h += '<div class="ig-stages">' + X.stages.map(function (s, i) {
      return '<div>' + icon(s.ic) + '<b>' + esc(L(s.l)) + '</b><span>' + s.n + '</span></div>' + (i < 2 ? '<span class="ig-stage-arrow">➜</span>' : '');
    }).join('') + '</div>';
    if (it.c) h += '<div class="ig-check">' + svg('0 0 48 48', okCircle(24, 24, 20), 'ig-check-ic') + '<b>' + esc(U.check) + '</b><span>' + esc(L(it.c)) + '</span></div>';
    return h + '</article>';
  }

  function timeline() {
    var w = X.timeline[lang] || X.timeline.ja;
    var b = '<rect x="20" y="40" width="560" height="14" rx="7" fill="' + C.light + '"/>' +
      '<rect x="20" y="40" width="330" height="14" rx="7" fill="' + C.green + '"/><rect x="350" y="40" width="230" height="14" rx="7" fill="' + C.gray + '" opacity=".45"/>' +
      '<line x1="350" y1="22" x2="350" y2="72"' + sw(C.red, 4) + '/>' + clock(350, 14, 12, 14, 0, { ring: C.red }) +
      t(40, 30, '9:00', { fs: 13, a: 'start', fill: C.ink }) + t(560, 30, '18:00', { fs: 13, a: 'end', fill: C.gray });
    return '<div class="ig-timeline">' + svg('0 0 600 80', b) +
      '<div class="ig-tl-labels"><span class="is-today">✔ ' + esc(w[2]) + '</span><span class="is-cut">' + esc(w[1]) + '</span><span class="is-next">' + esc(w[3]) + '</span></div></div>';
  }
  function stats() {
    var e = X.example[lang] || X.example.ja;
    var h = '<div class="ig-stats">' + X.stats.map(function (s) {
      return '<div style="--b:' + s.col + '">' + icon(s.ic) + '<b class="ig-stat-v">' + s.v + '</b><span class="ig-stat-u">' + esc(L(s.u)) + '</span><span class="ig-stat-l">' + esc(L(s.l)) + '</span></div>';
    }).join('') + '</div>';
    // 例：300 足（棒グラフ。1 時間 = 30 px）
    var rows = [[e.qc, e.p1, 500, '8h20m'], [e.qc, e.p2, 250, '4h10m'], [e.pack, e.p1, 160, '2h40m'], [e.pack, e.p2, 80, '1h20m']];
    var b = '';
    rows.forEach(function (r, i) {
      var y = 10 + i * 30, w = r[2] * 30 / 60, col = i < 2 ? C.red : C.teal;
      b += t(150, y + 15, esc(r[0]) + ' · ' + esc(r[1]), { fs: 12, a: 'end', fw: 600 }) +
        '<rect x="160" y="' + y + '" width="' + w + '" height="20" rx="5" fill="' + col + '" opacity="' + (i % 2 ? 0.6 : 1) + '"/>' + t(168 + w, y + 15, r[3], { fs: 12, a: 'start' });
    });
    return h + '<div class="ig-example"><b>' + esc(e.title) + '</b>' + svg('0 0 600 130', b) + '</div>';
  }

  function renderChapterHead(i) {
    var c = CHAPTERS[i];
    return '<header class="ig-ch-head" id="igch' + (i + 1) + '" style="--c:' + CH[i].c + ';--s:' + CH[i].s + '">' + icon(c.icon, 'ig-ch-ic') +
      '<div><span class="ig-ch-no">' + esc(UI[lang].chapter(i + 1)) + '</span><h2>' + esc(L(c.t)) + '</h2><p>' + esc(L(c.d)) + '</p></div></header>';
  }

  function renderAppendix() {
    var U = UI[lang];
    var h = '<section class="ig-chapter ig-apx" id="igapx"><header class="ig-ch-head" style="--c:' + C.ink + ';--s:' + C.light + '">' + icon('booth', 'ig-ch-ic') +
      '<div><span class="ig-ch-no">' + esc(U.appendix) + '</span><h2>' + esc(L(APX.title)) + '</h2></div></header>';
    h += '<h3 class="ig-h3">' + esc(L(APX.rolesTitle)) + '</h3><div class="ig-roles">' + APX.roles.map(function (r) {
      return '<div style="--b:' + r.col + '">' + svg('0 0 48 48', face(24, 26, 20, r.col), 'ig-role-ic') + '<b>' + esc(L(r.n)) + '</b><span>' + esc(L(r.r)) + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="ig-lanes">' + APX.lanes.map(function (ln) {
      return '<div class="ig-lane" style="--b:' + ln.col + '"><h4>' + esc(L(ln.l)) + '</h4><ol>' + ln.steps.map(function (s) {
        return '<li><span class="ig-step-n">' + s[0] + '</span><b>' + esc(L(s[1])) + '</b><span class="ig-who">' + esc(L(s[2])) + '</span></li>';
      }).join('') + '</ol></div>';
    }).join('') + '</div>';
    h += '<div class="ig-cases">' + APX.cases.map(function (c) { return '<div><b>' + c.k + '</b><span>' + esc(L(c.v)) + '</span></div>'; }).join('') + '</div>';
    h += '<div class="ig-check ig-apx-note">' + svg('0 0 48 48', okCircle(24, 24, 20), 'ig-check-ic') + '<span>' + esc(L(APX.note)) + '</span></div>';
    return h + '</section>';
  }

  function render(lng, meta) {
    lang = UI[lng] ? lng : 'ja';
    meta = meta || {};
    var h = '<div class="ig">' + renderCover(meta) + renderGuide();
    CHAPTERS.forEach(function (c, i) {
      var n = 0;
      h += '<section class="ig-chapter">' + renderChapterHead(i);
      ITEMS.forEach(function (it) { if (it.ch === i) { n++; h += renderItem(it, (i + 1) + '.' + n); } });
      h += '</section>';
    });
    h += renderAppendix() + '</div>';
    return h;
  }

  root.KaizenInfo = { render: render };
})(typeof self !== 'undefined' ? self : this);
