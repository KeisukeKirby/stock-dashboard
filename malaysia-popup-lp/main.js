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

  // ---- Booth directions video (modal) ----
  var videoBtn = document.getElementById('videoBtn');
  var videoModal = document.getElementById('videoModal');
  var boothVideo = document.getElementById('boothVideo');
  var videoClose = document.getElementById('videoClose');
  if (videoBtn && videoModal && boothVideo) {
    var closeVideo = function () {
      boothVideo.pause();
      if (videoModal.open) videoModal.close();
    };
    videoBtn.addEventListener('click', function () {
      if (typeof videoModal.showModal === 'function') {
        videoModal.showModal();
        var p = boothVideo.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        window.open('video/how-to-get-to-the-booth.mp4', '_blank');
      }
    });
    if (videoClose) videoClose.addEventListener('click', closeVideo);
    videoModal.addEventListener('click', function (ev) {
      if (ev.target === videoModal) closeVideo();
    });
    videoModal.addEventListener('close', function () { boothVideo.pause(); });
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
