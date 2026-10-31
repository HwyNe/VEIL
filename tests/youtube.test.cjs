/* YouTube betikleri: DOM/tarayıcı API'leri mock'lanır; gerçek YouTube yanıtı kullanılmaz. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'extension');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const flush = () => new Promise(r => setImmediate(r));

function mainWorld({ off = false } = {}) {
  const attrs = new Map(off ? [['data-veil-yt', 'off']] : []);
  const win = {};
  class FakeResponse { constructor(body, url) { this.body = body; this.url = url; } json() { return Promise.resolve(structuredClone(this.body)); } }
  // Bağlamın kendi JSON/Proxy nesneleri kullanılır; böylece testler Node'un gerçek JSON'unu değiştirmez.
  const ctx = vm.createContext({ window: win, document: { documentElement: { getAttribute: k => attrs.get(k) ?? null } },
    Response: FakeResponse });
  vm.runInContext(read('youtube-main.js'), ctx);
  return { ctx, win, FakeResponse, attrs };
}
const sample = () => ({ playerResponse: { adPlacements: [1], playerAds: [2], adSlots: [3], videoDetails: { id: 'x' } }, adSlots: [4], keep: 1 });

test('JSON.parse sonucundan reklam alanları silinir, video bilgisi kalır', () => {
  const { ctx } = mainWorld();
  const out = vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(sample()))})`, ctx);
  assert.equal('adPlacements' in out.playerResponse, false);
  assert.equal('playerAds' in out.playerResponse, false);
  assert.equal('adSlots' in out.playerResponse, false);
  assert.equal('adSlots' in out, false);
  assert.equal(out.playerResponse.videoDetails.id, 'x'); assert.equal(out.keep, 1);
  assert.equal(vm.runInContext('JSON.stringify(JSON.parse("[1,\\"a\\",null]"))', ctx), '[1,"a",null]');
});
test('ytInitialPlayerResponse atanırken ayıklanır', () => {
  const { win } = mainWorld();
  win.ytInitialPlayerResponse = { adPlacements: [1], playerAds: [1], streamingData: { ok: true } };
  assert.equal('adPlacements' in win.ytInitialPlayerResponse, false);
  assert.equal(win.ytInitialPlayerResponse.streamingData.ok, true);
});
test('youtubei yanıtları Response.json ile ayıklanır; başka adresler dokunulmaz', async () => {
  const { FakeResponse } = mainWorld();
  const a = await new FakeResponse(sample(), 'https://www.youtube.com/youtubei/v1/player?x=1').json();
  assert.equal('adPlacements' in a.playerResponse, false);
  const b = await new FakeResponse(sample(), 'https://example.com/data').json();
  assert.equal('adPlacements' in b.playerResponse, true);
});
test('kapalı durumda (data-veil-yt=off) hiçbir şey silinmez', () => {
  const { ctx, win } = mainWorld({ off: true });
  const out = vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(sample()))})`, ctx);
  assert.equal('adPlacements' in out.playerResponse, true);
  win.ytInitialPlayerResponse = { adPlacements: [1] };
  assert.equal('adPlacements' in win.ytInitialPlayerResponse, true);
});

function isolated({ saved } = {}) {
  const attrs = new Map(); let changed; const intervals = [];
  const video = { duration: 30, currentTime: 0, muted: false };
  const classes = new Set(); let skipClicks = 0, mo;
  const player = { classList: { contains: c => classes.has(c) }, querySelector: s => s.includes('video') ? video : null, observe() {} };
  const skip = { click: () => { skipClicks++; } };
  let skipVisible = false;
  const doc = { documentElement: { setAttribute: (k, v) => attrs.set(k, v) },
    querySelector: s => s === '#movie_player' ? player : (skipVisible ? skip : null), addEventListener() {} };
  const ctx = vm.createContext({ chrome: { storage: { local: { get: async () => ({ veil: saved }) }, onChanged: { addListener: fn => { changed = fn; } } } },
    document: doc, MutationObserver: class { constructor(fn) { mo = fn; } observe() {} disconnect() {} },
    setInterval: (fn) => { intervals.push(fn); return intervals.length; }, clearInterval() {}, Number, Boolean });
  vm.runInContext(read('youtube.js'), ctx);
  return { attrs, video, classes, trigger: () => mo(), intervals, get skipClicks() { return skipClicks; }, showSkip() { skipVisible = true; },
    changed: v => changed({ veil: { newValue: v } }, 'local') };
}
test('durum sayfa betiğine data-veil-yt ile iletilir; duraklatınca kapanır', async () => {
  const t = isolated({ saved: { adblockEnabled: true } }); await flush();
  assert.equal(t.attrs.get('data-veil-yt'), 'on');
  t.changed({ adblockEnabled: true, status: 'fallback', adblockPaused: true });
  assert.equal(t.attrs.get('data-veil-yt'), 'off');
  t.changed({ adblockEnabled: false });
  assert.equal(t.attrs.get('data-veil-yt'), 'off');
});
test('ad-showing iken reklam sona sarılır, skip düğmesi tıklanır, ses sonra geri gelir', async () => {
  const t = isolated({ saved: { adblockEnabled: true } }); await flush();
  t.intervals[0]();                       // oynatıcıya bağlan
  t.classes.add('ad-showing'); t.showSkip(); t.trigger();
  assert.equal(t.video.currentTime, 30); assert.equal(t.video.muted, true); assert.equal(t.skipClicks, 1);
  t.classes.delete('ad-showing'); t.trigger();
  assert.equal(t.video.muted, false);     // kullanıcının önceki ses durumu geri geldi
});
test('kapalıyken reklam sarılmaz', async () => {
  const t = isolated({ saved: { adblockEnabled: false } }); await flush();
  t.intervals[0](); t.classes.add('ad-showing'); t.trigger();
  assert.equal(t.video.currentTime, 0); assert.equal(t.video.muted, false);
});
test('manifest YouTube betiklerini document_start ve MAIN dünyasında kaydeder', () => {
  const m = JSON.parse(read('manifest.json')); const yt = m.content_scripts.filter(c => c.matches.some(x => x.includes('youtube.com')));
  assert.equal(yt.length, 2);
  const main = yt.find(c => c.js[0] === 'youtube-main.js');
  assert.equal(main.world, 'MAIN'); assert.equal(main.run_at, 'document_start'); assert.equal(main.all_frames, true);
  assert.equal(yt.find(c => c.js[0] === 'youtube.js').run_at, 'document_start');
});
test('YouTube yol kuralları var; youtube.com alan adının tamamı engellenmez', () => {
  const rules = JSON.parse(read('rules.json')); const filters = rules.map(r => r.condition.urlFilter);
  for (const f of ['||youtube.com/pagead/', '||youtube.com/api/stats/ads', '||youtube.com/youtubei/v1/player/ad_break']) assert.ok(filters.includes(f), f);
  assert.ok(!filters.includes('||youtube.com^')); assert.ok(!filters.includes('||googlevideo.com^'));
  assert.equal(new Set(rules.map(r => r.id)).size, rules.length);
});
