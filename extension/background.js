/* MV3: olay gelince uyanır; reklam filtresi bu dosya uyurken de çalışır. */
if (typeof importScripts === 'function') importScripts('core.js');
const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
const firefox = api.runtime.getURL('').startsWith('moz-extension:');
const C = globalThis.VeilCore;
const NATIVE = 'com.hwyne.veil';
const HEALTH = 'https://check.torproject.org/api/ip';
let queue = Promise.resolve();
const serial = task => {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
};
async function state() {
  const { veil } = await api.storage.local.get('veil');
  return { ...C.defaults(), ...veil };
}
async function save(s) { await api.storage.local.set({ veil: s }); await badge(s); return s; }
async function badge(s) {
  const text = s.torEnabled ? (s.status === 'connected' ? 'TOR' : 'NET') : ((s.adblockActive ?? wantsFilters(s)) ? 'AD' : '');
  await api.action.setBadgeText({ text });
  await api.action.setBadgeBackgroundColor({ color: s.torEnabled && s.status !== 'connected' ? '#b74a36' : '#276852' });
}
async function notify(id, title, message, buttons = []) {
  try {
    await api.notifications.create(id, { type: 'basic', iconUrl: 'icons/icon128.png', title, message, buttons });
  } catch { /* İşletim sistemi bildirimleri kapalıysa durum popup'ta görünür. */ }
}
function wantsFilters(s) { return s.adblockEnabled && !s.adblockPaused && s.status !== 'fallback'; }
async function readFilters(s) {
  const enabled = await api.declarativeNetRequest.getEnabledRulesets();
  s.adblockActive = enabled.includes('ads');
  s.filterError = s.adblockActive !== wantsFilters(s) ? 'Reklam tercihi ile tarayıcının etkin kuralları farklı. Düğmeyle tekrar dene.' : '';
  return enabled;
}
async function filters(s) {
  const active = wantsFilters(s);
  await api.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: active ? ['ads'] : [], disableRulesetIds: active ? [] : ['ads']
  });
  await readFilters(s);
  if (s.adblockActive !== active) throw new Error('Reklam kuralı değişikliği tarayıcı tarafından doğrulanmadı.');
}
async function native(command, extra = {}) {
  let result;
  try { result = await api.runtime.sendNativeMessage(NATIVE, { command, ...extra }); }
  catch (e) {
    const error = new Error(`Tor yardımcısına ulaşılamadı. Kurulum sayfasını aç. (${e.message})`);
    error.code = 'NATIVE_TRANSPORT'; throw error;
  }
  if (!result || !result.ok) throw new Error(result?.error || 'Tor yardımcısından geçerli yanıt alınamadı.');
  return result;
}
function controlled(d) { return ['controllable_by_this_extension', 'controlled_by_this_extension'].includes(d.levelOfControl); }
async function applyProxy(s) {
  if (firefox && !await api.extension.isAllowedIncognitoAccess()) {
    throw new Error('Firefox: Eklenti ayrıntılarında “Gizli pencerelerde çalıştır → İzin ver” seçilmeli.');
  }
  const before = await api.proxy.settings.get({ incognito: false });
  if (!controlled(before)) throw new Error('Proxy ayarını başka bir eklenti veya kurum ilkesi yönetiyor.');
  const value = firefox
    ? { proxyType: 'manual', socks: `127.0.0.1:${s.port}`, socksVersion: 5, proxyDNS: true, passthrough: '' }
    : { mode: 'fixed_servers', rules: { singleProxy: { scheme: 'socks5', host: '127.0.0.1', port: s.port }, bypassList: ['<-loopback>'] } };
  await api.proxy.settings.set(firefox ? { value } : { value, scope: 'regular' });
  if (!await ownsProxy(s)) throw new Error('Proxy ayarı uygulanamadı veya başka bir eklenti tarafından değiştirildi.');
}
async function ownsProxy(s) {
  const d = await api.proxy.settings.get({ incognito: false });
  if (d.levelOfControl !== 'controlled_by_this_extension') return false;
  const v = d.value;
  return firefox ? v.proxyType === 'manual' && v.socks === `127.0.0.1:${s.port}` && v.proxyDNS === true
    : v.mode === 'fixed_servers' && v.rules?.singleProxy?.scheme === 'socks5' &&
      v.rules.singleProxy.host === '127.0.0.1' && v.rules.singleProxy.port === s.port;
}
async function privacy(enable) {
  const warnings = [];
  const network = api.privacy?.network || {};
  for (const [name, value] of [['networkPredictionEnabled', false], ['webRTCIPHandlingPolicy', 'disable_non_proxied_udp']]) {
    const setting = network[name];
    if (!setting) { if (enable) warnings.push(`${name} desteklenmiyor`); continue; }
    try {
      const d = await setting.get({});
      if (enable) {
        if (!controlled(d)) throw new Error('ayar başka yerde yönetiliyor');
        await setting.set({ value });
        const applied = await setting.get({});
        if (applied.value !== value) throw new Error('ayar uygulanamadı');
      } else if (d.levelOfControl === 'controlled_by_this_extension') await setting.clear({});
    } catch { if (enable) warnings.push(`${name} ayarlanamadı`); }
  }
  return warnings.join('; ');
}
async function healthAlarm(s) {
  if (s.torEnabled && s.status !== 'fallback') {
    await api.alarms.clear('tor-retry');
    if (!await api.alarms.get('tor-health')) await api.alarms.create('tor-health', { periodInMinutes: 1 });
  } else {
    await api.alarms.clear('tor-health');
    if (s.torEnabled && s.retryUntil) {
      await api.alarms.create('tor-retry', { when: Math.max(Date.now() + 1000, s.retryUntil) });
    } else await api.alarms.clear('tor-retry');
  }
}
async function lost(s, error) {
  // Kullanıcının seçimi: hata durumunda normal taramaya ve reklamlara dön.
  await api.proxy.settings.clear(firefox ? {} : { scope: 'regular' });
  await privacy(false);
  if (s.mode === 'managed') { try { await native('stop'); } catch {} }
  s.retryUntil = Date.now() + C.RETRY_MS;
  s.status = 'fallback';
  s.adblockPaused = true;
  s.lastError = error;
  s.ip = '';
  await filters(s); await save(s);
  await healthAlarm(s);
  await notify('veil-disconnected', 'VEIL · Normal bağlantıya geçildi',
    'Tor devre dışı. Normal IP ile devam ediyorsun; reklamlar görünebilir. 24 dakika sonra Tor yeniden denenecek.', [{ title: 'Durumu aç' }]);
  return s;
}
async function check(s, { start = false } = {}) {
  if (!s.torEnabled) return s;
  try {
    if (s.status === 'connected' && !await ownsProxy(s)) throw new Error('Proxy ayarı başka bir işlem tarafından değiştirildi.');
    if (s.mode === 'managed') {
      let n;
      try { n = await (start ? native('start', { exitCountry: s.exitCountry || '' }) : native('status')); }
      catch (e) {
        s.nativeAvailable = e.code !== 'NATIVE_TRANSPORT';
        throw e;
      }
      s.nativeAvailable = true;
      s.bootstrap = n.bootstrap || 0;
      if (!n.running && !start) n = await native('start', { exitCountry: s.exitCountry || '' });
      if (!n.socksReady || n.bootstrap < 100) {
        // İlk bootstrap hata sayılmaz; Tor'u bitmeden durdurup döngüye girme.
        if (s.status === 'connecting' && Date.now() < s.connectDeadline) {
          s.status = 'connecting'; s.bootstrap = n.bootstrap || 0;
          await save(s); await healthAlarm(s); return s;
        }
        throw new Error(`Tor başlatılamadı · %${n.bootstrap || 0}.`);
      }
    }
    if (!await ownsProxy(s)) {
      s.privacyWarning = await privacy(true);
      await applyProxy(s);
    }
    // Proxy ayarının bulunması yeterli değildir; Tor çıkışı ayrıca doğrulanır.
    let response;
    try { response = await fetch(HEALTH, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(12000) }); }
    catch (e) {
      throw new Error(s.exitCountry ? `Tor doğrulanamadı. Seçili çıkış ülkesinde (${s.exitCountry.toUpperCase()}) kullanılabilir çıkış olmayabilir; ayarlardan “Otomatik”i dene.` : e.message);
    }
    if (!response.ok) throw new Error('Tor doğrulama servisine ulaşılamadı.');
    const info = await response.json();
    if (info.IsTor !== true) throw new Error('Bağlantı Tor çıkışı olarak doğrulanmadı.');
    if (!await ownsProxy(s)) throw new Error('Doğrulama sırasında proxy ayarı değişti.');
    s.status = 'connected'; s.adblockPaused = false; s.ip = typeof info.IP === 'string' ? info.IP.slice(0, 64) : '';
    s.lastVerifiedAt = Date.now(); s.retryUntil = 0; s.lastError = ''; s.bootstrap = 100;
    await filters(s); await save(s); await healthAlarm(s);
    return s;
  } catch (e) { return lost(s, e.message || 'Tor bağlantısı doğrulanamadı.'); }
}
async function enable(s) {
  // Tor ilk açılışta hazırlanırken normal trafik devam eder; bloklama kuralı yok.
  if (s.status === 'fallback') s.adblockPaused = true;
  s.torEnabled = true; s.status = 'connecting'; s.retryUntil = 0; s.ip = ''; s.lastError = '';
  s.connectDeadline = Date.now() + 180000;
  await filters(s); await save(s);
  try {
    return await check(s, { start: true });
  } catch (e) { return lost(s, e.message); }
}
async function disable(s) {
  // clear(): önceki sistem/eklenti ayarını geri bırakır; zorla DIRECT yazmaz.
  await api.proxy.settings.clear(firefox ? {} : { scope: 'regular' });
  await privacy(false);
  s.torEnabled = false; s.status = 'off'; s.adblockPaused = false; s.retryUntil = 0; s.ip = ''; s.lastError = ''; s.privacyWarning = '';
  await filters(s); await save(s); await healthAlarm(s);
  if (s.mode === 'managed') {
    try { await native('stop'); } catch { /* Yardımcı kurulu değilse kapatma işlemini engelleme. */ }
  }
  return s;
}
async function reminders(s) {
  if (s.reminderEnabled && s.supportUrl) {
    if (!await api.alarms.get('support')) await api.alarms.create('support', { when: Math.max(Date.now() + 1000, s.nextDonationAt) });
  } else await api.alarms.clear('support');
}
async function initialize(recover = false) {
  let s = await state();
  await filters(s); await healthAlarm(s); await reminders(s); await save(s);
  if (recover && s.torEnabled) {
    if (s.status === 'fallback') return;
    try { await check(s); }
    catch (e) { await lost(s, e.message); }
  }
}
async function command(m) {
  let s = await state();
  switch (m.type) {
    case 'GET': await readFilters(s); return { state: s, extensionId: api.runtime.id, firefox };
    case 'TOR': s = m.enabled ? await enable(s) : await disable(s); break;
    case 'RETRY':
      if (!s.torEnabled) throw new Error('Önce Tor modunu aç.');
      s = await enable(s); break;
    case 'ADBLOCK': {
      s.adblockEnabled = Boolean(m.enabled);
      // Önce niyeti sakla: worker kesilirse sonraki açılış eski tercihi geri uygulamasın.
      await api.storage.local.set({ veil: s });
      try { await filters(s); await save(s); }
      catch (e) {
        try { await readFilters(s); } catch { s.adblockActive = null; }
        s.filterError = e.message; await save(s); e.state = s; throw e;
      }
      break;
    }
    case 'TEST_ADBLOCK': {
      const enabledRulesets = await readFilters(s);
      let matched = null, note = '';
      try {
        const outcome = await api.declarativeNetRequest.testMatchOutcome({
          url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          type: 'xmlhttprequest', initiator: 'https://example.com'
        });
        matched = outcome.matchedRules.some(rule => rule.rulesetId === 'ads');
      } catch { note = 'Kural eşleşme testi bu tarayıcı/kurulumda kullanılamıyor.'; }
      return { state: s, diagnostics: { enabledRulesets, active: s.adblockActive, matched, note } };
    }
    case 'SETTINGS': {
      const nextMode = m.mode === 'external' ? 'external' : 'managed';
      const nextPort = nextMode === 'managed' ? 19050 : C.port(m.port);
      if (s.torEnabled && (nextMode !== s.mode || nextPort !== s.port)) throw new Error('Bağlantı türünü değiştirmeden önce Tor modunu kapat.');
      const nextCountry = nextMode === 'managed' ? C.exitCountry(m.exitCountry) : '';
      if (s.torEnabled && nextCountry !== (s.exitCountry || '')) throw new Error('Çıkış ülkesini değiştirmeden önce Tor modunu kapat.');
      s.mode = nextMode; s.port = nextPort; s.exitCountry = nextCountry; s.supportUrl = C.supportUrl(m.supportUrl);
      s.reminderEnabled = Boolean(m.reminderEnabled);
      s.nextDonationAt = Date.now() + C.DONATION_MS;
      if (!s.reminderEnabled) s.donationPending = false;
      await api.alarms.clear('support'); await save(s); await reminders(s); break;
    }
    case 'DISMISS_SUPPORT':
      s.donationPending = false;
      if (m.forever) { s.reminderEnabled = false; await api.alarms.clear('support'); }
      await save(s); break;
    case 'OPEN_SUPPORT':
      if (!s.supportUrl) return { setupRequired: true, state: s };
      await api.tabs.create({ url: C.supportUrl(s.supportUrl) }); break;
    case 'NATIVE_STATUS': return { native: await native('status'), state: s };
    default: throw new Error('Bilinmeyen istek.');
  }
  return { state: s, extensionId: api.runtime.id, firefox };
}
api.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== api.runtime.id || !sender.url?.startsWith(api.runtime.getURL(''))) return false;
  serial(() => command(message)).then(value => reply({ ok: true, ...value }), e => reply({ ok: false, error: e.message, ...(e.state ? { state: e.state } : {}) }));
  return true;
});
api.runtime.onInstalled.addListener(details => {
  serial(async () => {
    await initialize(true);
    if (details.reason === 'install') await api.tabs.create({ url: api.runtime.getURL('setup.html') });
  }).catch(console.error);
});
api.runtime.onStartup.addListener(() => serial(() => initialize(true)).catch(console.error));
api.alarms.onAlarm.addListener(alarm => serial(async () => {
  let s = await state();
  if (alarm.name === 'tor-health' && s.torEnabled && s.status !== 'fallback') await check(s);
  if (alarm.name === 'tor-retry' && s.torEnabled && s.status === 'fallback') await enable(s);
  if (alarm.name === 'support' && s.reminderEnabled && s.supportUrl) {
    s.donationPending = true; s.nextDonationAt = Date.now() + C.DONATION_MS;
    await save(s); await api.alarms.clear('support'); await reminders(s);
    await notify('veil-support', 'VEIL · Bir kahve molası ☕', 'Bu projeyi tek başıma geliştiriyorum. Bana bir kahve ısmarlamak ister misin?',
      [{ title: 'Destek ol ☕' }, { title: 'Bir daha gösterme' }]);
  }
}).catch(console.error));
api.notifications.onClicked.addListener(id => {
  if (id === 'veil-support') serial(() => command({ type: 'OPEN_SUPPORT' })).catch(console.error);
  else api.tabs.create({ url: api.runtime.getURL('setup.html') });
});
api.notifications.onButtonClicked.addListener((id, index) => {
  serial(async () => {
    if (id === 'veil-support') await command(index === 0 ? { type: 'OPEN_SUPPORT' } : { type: 'DISMISS_SUPPORT', forever: true });
    else await api.tabs.create({ url: api.runtime.getURL('setup.html') });
    await api.notifications.clear(id);
  }).catch(console.error);
});
(api.proxy.onProxyError || api.proxy.onError)?.addListener(() => serial(async () => {
  const s = await state();
  if (s.torEnabled && s.status === 'connected') await lost(s, 'Proxy bağlantı hatası alındı.');
}).catch(console.error));
api.proxy.settings.onChange.addListener(() => serial(async () => {
  const s = await state();
  if (s.torEnabled && s.status === 'connected' && !await ownsProxy(s)) await lost(s, 'Proxy ayarı başka bir işlem tarafından değiştirildi.');
}).catch(console.error));
// Her uyanışta eksik alarmı onar; sürekli döngü veya kalıcı native port yok.
serial(() => initialize(false)).catch(console.error);
