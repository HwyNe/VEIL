'use strict';
const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
const $ = id => document.getElementById(id);
let current, busy = false;
async function send(message) {
  const r = await api.runtime.sendMessage(message);
  if (!r?.ok) { if (r?.state) render(r.state); throw new Error(r?.error || 'Arka plan yanıt vermedi. Eklentiyi yeniden yükle.'); }
  return r;
}
function countdown() {
  if (current?.status === 'fallback') $('countdown').textContent = `Tor yeniden denenecek · ${VeilCore.remaining(current.retryUntil)}`;
}
function render(s) {
  current = s;
  const fallback = s.status === 'fallback', connected = s.status === 'connected', connecting = s.status === 'connecting';
  $('hero').classList.toggle('fallback', fallback);
  $('statusChip').textContent = connected ? 'TOR DOĞRULANDI' : fallback ? 'NORMAL BAĞLANTI' : connecting ? `TOR BAŞLATILIYOR · %${s.bootstrap || 0}` : 'HAZIR';
  $('headline').textContent = connected ? 'Biraz daha özgür.' : fallback ? 'İnternet devam ediyor.' : connecting ? 'Bağlantı kuruluyor.' : 'Kontrol sende.';
  $('description').textContent = connected ? 'Web bağlantın Tor üzerinden yönlendiriliyor.' : fallback ? 'Tor kapalı. Normal IP ile gezinmeye devam ediyorsun; reklamlar görünebilir.' : connecting ? 'Tor hazırlanırken normal bağlantı devam eder. İlk açılış birkaç dakika sürebilir.' : 'Tor bağlantısını ve reklam kalkanını buradan yönet.';
  $('torToggle').textContent = s.torEnabled ? 'Tor modunu kapat' : 'Tor modunu aç';
  $('torToggle').disabled = busy;
  $('retry').hidden = !fallback; $('retry').disabled = busy;
  $('countdown').hidden = !fallback; countdown();
  const paused = fallback || s.adblockPaused;
  const effectiveAdblock = s.adblockActive ?? (s.adblockEnabled && !paused);
  $('adToggle').setAttribute('aria-checked', String(effectiveAdblock)); $('adToggle').disabled = busy || paused;
  $('adToggle').textContent = paused ? 'Beklemede' : effectiveAdblock ? 'Engellemeyi kapat' : 'Engellemeyi aç';
  $('adTest').disabled = busy;
  $('adStatus').textContent = effectiveAdblock ? 'Ağ kuralları aktif' : paused ? 'Geçici olarak duraklatıldı · reklamlar açık' : 'Ağ kuralları kapalı';
  $('filterError').hidden = !s.filterError; $('filterError').textContent = s.filterError || '';
  $('connectionType').textContent = s.mode === 'managed' ? 'YÖNETİLEN TOR' : `SOCKS5 · ${s.port}`;
  $('verification').textContent = connected ? `Çıkış · ${s.ip || 'doğrulandı'}` : fallback ? '24 dk sonra yeniden deneme' : 'Henüz doğrulanmadı';
  $('warning').hidden = !s.privacyWarning;
  $('warning').textContent = s.privacyWarning ? `Bazı gizlilik ayarları uygulanamadı: ${s.privacyWarning}` : '';
  $('error').hidden = !s.lastError; $('error').textContent = s.lastError;
  $('donationCard').hidden = !s.donationPending;
}
async function run(task) {
  busy = true; if (current) render(current);
  try { const r = await task(); if (r?.state) render(r.state); }
  catch (e) { $('error').hidden = false; $('error').textContent = e.message; }
  finally { busy = false; if (current) { $('torToggle').disabled = false; $('adToggle').disabled = current.status === 'fallback' || current.adblockPaused; $('retry').disabled = false; $('adTest').disabled = false; } }
}
$('torToggle').addEventListener('click', () => run(() => send({ type: 'TOR', enabled: !current.torEnabled })));
$('adToggle').addEventListener('click', () => run(async () => {
  $('adTestResult').hidden = true;
  return send({ type: 'ADBLOCK', enabled: !(current.adblockActive ?? current.adblockEnabled) });
}));
$('adTest').addEventListener('click', () => run(async () => {
  const r = await send({ type: 'TEST_ADBLOCK' });
  const d = r.diagnostics;
  $('adTestResult').textContent = `Tarayıcıdaki VEIL kuralları: ${d.active ? 'AÇIK' : 'KAPALI'}. ` +
    (d.matched === null ? d.note : `Örnek reklam isteğiyle ${d.matched ? 'eşleşiyor' : 'eşleşmiyor'}. Bu bir kural testidir; gerçek indirme yapmaz.`);
  $('adTestResult').hidden = false; return r;
}));
$('retry').addEventListener('click', () => run(() => send({ type: 'RETRY' })));
$('support').addEventListener('click', () => run(async () => {
  const r = await send({ type: 'OPEN_SUPPORT' });
  if (r.setupRequired) await api.tabs.create({ url: api.runtime.getURL('setup.html#support-settings') });
  return r;
}));
$('later').addEventListener('click', () => run(() => send({ type: 'DISMISS_SUPPORT', forever: false })));
$('never').addEventListener('click', () => run(() => send({ type: 'DISMISS_SUPPORT', forever: true })));
api.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.veil && !busy) render(changes.veil.newValue); });
// Yalnızca popup açıkken bir saniyelik metin güncellemesi yapılır.
const timer = setInterval(countdown, 1000);
window.addEventListener('unload', () => clearInterval(timer));
run(() => send({ type: 'GET' }));
