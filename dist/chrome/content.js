// Hafif görsel gizleme; sürekli DOM taraması veya video döngüsü yok.
(() => {
  const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
  const style = document.createElement('style');
  style.textContent = "/* Dar se\u00e7iciler: sayfa ba\u015f\u0131na JS g\u00f6zlemcisi veya s\u00fcrekli tarama yok. */\nins.adsbygoogle,\niframe[src*=\"doubleclick.net\"],\niframe[src*=\"googlesyndication.com\"],\nytd-ad-slot-renderer,\nytd-display-ad-renderer,\nytd-promoted-sparkles-web-renderer,\nytd-promoted-video-renderer,\nytd-in-feed-ad-layout-renderer,\nytd-banner-promo-renderer,\nytd-statement-banner-renderer,\nytd-companion-slot-renderer,\nytd-player-legacy-desktop-watch-ads-renderer,\nytd-rich-item-renderer:has(ytd-ad-slot-renderer),\nytd-rich-section-renderer:has(ytd-ad-slot-renderer),\n#masthead-ad,\n#player-ads,\n.ytp-ad-overlay-container,\n.ytp-ad-overlay-slot { display: none !important; }\n";
  let observed = false;
  function update(s) {
    if (s?.adblockEnabled && !s.adblockPaused && s.status !== 'fallback') {
      if (!style.isConnected) (document.head || document.documentElement).append(style);
    } else style.remove();
  }
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.veil) { observed = true; update(changes.veil.newValue); }
  });
  api.storage.local.get('veil').then(({ veil }) => { if (!observed) update(veil); });
})();
