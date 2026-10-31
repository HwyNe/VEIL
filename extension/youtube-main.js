// YouTube sayfa dünyası (MAIN) betiği: reklam verisini oynatıcı yanıtından ayıklar.
// Video akışı engellenmez; yalnızca oynatıcıya gelen JSON içindeki reklam alanları silinir.
// Açık/kapalı durumu eklentinin yalıtılmış betiği <html data-veil-yt="off"> ile bildirir.
(() => {
  'use strict';
  if (window.__veilYt) return;
  Object.defineProperty(window, '__veilYt', { value: true });
  const KEYS = ['adPlacements', 'playerAds', 'adSlots'];
  const enabled = () => document.documentElement?.getAttribute('data-veil-yt') !== 'off';
  function strip(o) {
    if (!o || typeof o !== 'object') return;
    for (const key of KEYS) if (key in o) delete o[key];
  }
  // Yalnızca üst düzey, playerResponse ve dizi öğeleri taranır; derin gezinme yok.
  function prune(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item === 'object') { strip(item); strip(item.playerResponse); }
    } else { strip(value); strip(value.playerResponse); }
    return value;
  }
  const safe = value => { try { return enabled() ? prune(value) : value; } catch { return value; } };

  // 1) İlk sayfa yüklemesi: satır içi betik ytInitialPlayerResponse atar.
  let initial;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true, enumerable: true,
      get: () => initial,
      set: value => { initial = safe(value); }
    });
  } catch { /* Sayfa özelliği önceden tanımlamışsa diğer yollar yine çalışır. */ }

  // 2) Sayfa içi gezinme: yanıtlar JSON.parse veya Response.json ile okunur.
  const nativeParse = JSON.parse;
  JSON.parse = new Proxy(nativeParse, {
    apply: (target, thisArg, args) => safe(Reflect.apply(target, thisArg, args))
  });
  const nativeJson = Response.prototype.json;
  Response.prototype.json = function (...args) {
    const result = nativeJson.apply(this, args);
    return String(this.url || '').includes('/youtubei/v1/') ? result.then(safe) : result;
  };
})();
