// YouTube yalıtılmış betiği: durumu sayfa betiğine iletir; ayıklanamayan reklamı atlar.
// Yalnızca *.youtube.com üzerinde çalışır; oynatıcı sınıf değişimi dışında DOM taraması yoktur.
(() => {
  'use strict';
  const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
  const SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button';
  let on = true, player = null, observer = null, timer = 0, mutedByVeil = null, observed = false;

  function video() { return player?.querySelector('video.html5-main-video') || player?.querySelector('video'); }
  function restore() {
    const v = video();
    if (v && mutedByVeil !== null) v.muted = mutedByVeil;
    mutedByVeil = null;
  }
  function skipAd() {
    document.querySelector(SKIP)?.click();
    const v = video();
    if (v && Number.isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.2) {
      if (mutedByVeil === null) mutedByVeil = v.muted;
      v.muted = true;
      v.currentTime = v.duration; // Reklam bitmiş sayılır; asıl video devam eder.
    }
  }
  function tick() {
    if (on && player?.classList.contains('ad-showing')) {
      skipAd();
      if (!timer) timer = setInterval(tick, 400);
    } else {
      if (timer) { clearInterval(timer); timer = 0; }
      restore();
    }
  }
  function attach() {
    const p = document.querySelector('#movie_player');
    if (!p || p === player) return;
    observer?.disconnect();
    player = p;
    observer = new MutationObserver(tick);
    observer.observe(p, { attributes: true, attributeFilter: ['class'] });
    tick();
  }
  function update(s) {
    on = Boolean(s?.adblockEnabled !== false && !s?.adblockPaused && s?.status !== 'fallback');
    document.documentElement.setAttribute('data-veil-yt', on ? 'on' : 'off');
    tick();
  }
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.veil) { observed = true; update(changes.veil.newValue); }
  });
  api.storage.local.get('veil').then(({ veil }) => { if (!observed) update(veil); });

  // Oynatıcı geç oluşabilir; sınırlı sayıda deneme ve YouTube gezinme olayıyla bağlanır.
  document.addEventListener('yt-navigate-finish', attach);
  let tries = 0;
  const boot = setInterval(() => { attach(); if (player || ++tries > 60) clearInterval(boot); }, 500);
})();
