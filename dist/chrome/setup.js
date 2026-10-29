'use strict';
const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
const $ = id => document.getElementById(id);
async function send(m) { const r = await api.runtime.sendMessage(m); if (!r?.ok) throw new Error(r?.error || 'Eklenti yanıt vermedi.'); return r; }
function syncPort() {
  $('port').disabled = $('mode').value === 'managed';
  if ($('mode').value === 'managed') $('port').value = 19050;
  else if ($('port').value === '19050') $('port').value = 9050;
}
$('mode').addEventListener('change', syncPort);
$('settings').addEventListener('submit', async e => {
  e.preventDefault(); $('save').disabled = true;
  try {
    await send({ type: 'SETTINGS', mode: $('mode').value, port: $('port').value, supportUrl: $('supportUrl').value, reminderEnabled: $('reminderEnabled').checked });
    $('saveResult').textContent = 'Kaydedildi. Bağlantı hatası durumunda normal trafiğe geçiş etkin.';
  } catch (e) { $('saveResult').textContent = e.message; }
  finally { $('saveResult').hidden = false; $('save').disabled = false; }
});
$('nativeCheck').addEventListener('click', async () => {
  $('nativeCheck').disabled = true;
  try {
    const r = await send({ type: 'NATIVE_STATUS' });
    $('nativeResult').textContent = r.native.torInstalled ? `Yardımcı hazır · Tor ${r.native.running ? 'çalışıyor' : 'başlatılmaya hazır'}` : 'Yardımcı hazır, fakat Tor bulunamadı. Kurulum betiğini yeniden çalıştır.';
  } catch { $('nativeResult').textContent = 'Yardımcı bulunamadı. Kurulum betiğini çalıştır, sonra tarayıcıyı yeniden aç.'; }
  finally { $('nativeCheck').disabled = false; }
});
$('openPopup').addEventListener('click', async () => {
  try { await api.action.openPopup(); } catch { await api.tabs.create({ url: api.runtime.getURL('popup.html') }); }
});
send({ type: 'GET' }).then(({ state: s, extensionId, firefox }) => {
  $('extensionId').textContent = extensionId; $('firefoxHint').hidden = !firefox;
  $('mode').value = s.mode; $('port').value = s.port; $('supportUrl').value = s.supportUrl; $('reminderEnabled').checked = s.reminderEnabled;
  $('port').disabled = s.mode === 'managed';
}).catch(e => { $('saveResult').hidden = false; $('saveResult').textContent = e.message; });
