/* Vibram FiveFingers Pop-Up @ Ativo Plaza — small enhancements, no dependencies */
(function () {
  'use strict';

  // ---- Event times (Malaysia, UTC+8) ----
  var EVENT_START = new Date('2026-11-13T12:00:00+08:00');
  var EVENT_END = new Date('2026-11-15T20:00:00+08:00');

  // ---- Mobile menu ----
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Countdown ----
  var cd = document.getElementById('countdown');
  if (cd) {
    var elD = document.getElementById('cdD');
    var elH = document.getElementById('cdH');
    var elM = document.getElementById('cdM');
    var elS = document.getElementById('cdS');
    var label = document.getElementById('cdLabel');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var now = Date.now();
      if (now >= EVENT_END.getTime()) {
        cd.classList.add('is-live');
        label.textContent = 'Thank you for visiting us at Ativo Plaza';
        return;
      }
      if (now >= EVENT_START.getTime()) {
        cd.classList.add('is-live');
        label.textContent = 'Happening now at Ativo Plaza · until 8 PM';
        return;
      }
      var diff = Math.floor((EVENT_START.getTime() - now) / 1000);
      var d = Math.floor(diff / 86400);
      var h = Math.floor((diff % 86400) / 3600);
      var m = Math.floor((diff % 3600) / 60);
      var s = diff % 60;
      elD.textContent = pad(d);
      elH.textContent = pad(h);
      elM.textContent = pad(m);
      elS.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---- Add to calendar (.ics) ----
  var icsBtn = document.getElementById('icsBtn');
  if (icsBtn) {
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Barefoot Malaysia//Pop-Up Store//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:vff-popup-ativo-plaza-2026@barefoot-malaysia',
      'DTSTAMP:20261022T000000Z',
      'DTSTART;TZID=Asia/Kuala_Lumpur:20261113T120000',
      'DTEND;TZID=Asia/Kuala_Lumpur:20261115T200000',
      'SUMMARY:Barefoot Malaysia Pop-Up Store - Vibram FiveFingers (up to 30% off)',
      'LOCATION:Ativo Plaza\\, Damansara Avenue\\, Bandar Sri Damansara\\, Kuala Lumpur',
      'DESCRIPTION:Try on the full Vibram FiveFingers lineup and enjoy up to 30% off. 13-15 Nov 2026\\, 12 PM - 8 PM daily. Map: https://maps.app.goo.gl/J7KbaWQLKpgPjHMJ6',
      'URL:https://maps.app.goo.gl/J7KbaWQLKpgPjHMJ6',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    icsBtn.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics));
  }

  // ---- Reveal on scroll ----
  var targets = document.querySelectorAll('.checklist li, .life-card, .issues li, .vs-col, .step, .about-copy, .about-visual, .details-card, .map, .faq-item');
  targets.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Sticky header offset for in-page links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      ev.preventDefault();
      var top = el.getBoundingClientRect().top + window.pageYOffset - 68;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.replaceState(null, '', '#' + id);
    });
  });
})();
