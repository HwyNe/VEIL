/* API mock'larıyla davranış testleri: gerçek bir Tor bağlantısı taklit edilmez. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const C = require('../extension/core.js');
const ROOT = path.join(__dirname, '..', 'extension');
const ID = 'kmjkencpopaggdejieeiemoinifnlgkm';
const clone = v => structuredClone(v);
function event() { const handlers=[]; return { handlers, addListener(fn) { handlers.push(fn); } }; }
async function setup({ saved, firefox=false, nativeResult, fetchResult, denyProxy=false, privateAccess=true } = {}) {
  let stored = saved ? clone(saved) : undefined;
  let proxy={ levelOfControl: 'controllable_by_this_extension', value: { mode:'system' } };
  let dynamic=[], enabled=['ads']; const alarms=new Map(), notifications=[], opened=[], nativeCalls=[];
  const prefix = firefox ? 'moz-extension://11111111-2222-3333-4444-555555555555/' : `chrome-extension://${ID}/`;
  const setting = () => {
    let value=true, owner='controllable_by_this_extension';
    return {get:async()=>({value,levelOfControl:owner}),set:async x=>{value=x.value;owner='controlled_by_this_extension';},clear:async()=>{value=true;owner='controllable_by_this_extension';}};
  };
  const api = {
    runtime: { id: firefox ? 'veil@hwyne.local' : ID, getURL:p=>prefix+p,
      onMessage:event(), onInstalled:event(), onStartup:event(),
      sendNativeMessage:async(_,m)=>{nativeCalls.push(m.command); if (nativeResult instanceof Error) throw nativeResult; return nativeResult || {ok:true,running:true,bootstrap:100,socksReady:true,torInstalled:true};}
    },
    extension:{isAllowedIncognitoAccess:async()=>privateAccess},
    storage:{local:{get:async()=>({veil:clone(stored)}),set:async({veil})=>{stored=clone(veil);}}},
    action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
    notifications:{onClicked:event(),onButtonClicked:event(),create:async(id,o)=>{notifications.push({id,...o});},clear:async()=>{}},
    tabs:{create:async x=>opened.push(x)},
    alarms:{get:async n=>alarms.get(n),create:async(n,o)=>alarms.set(n,o),clear:async n=>alarms.delete(n),onAlarm:event()},
    declarativeNetRequest:{
      getEnabledRulesets:async()=>clone(enabled),
      updateEnabledRulesets:async x=>{enabled=enabled.filter(id=>!x.disableRulesetIds.includes(id));for(const id of x.enableRulesetIds)if(!enabled.includes(id))enabled.push(id);},
      testMatchOutcome:async()=>({matchedRules:enabled.includes('ads')?[{rulesetId:'ads',ruleId:1}]:[]}),
      updateDynamicRules:async x=>{dynamic=dynamic.filter(r=>!x.removeRuleIds.includes(r.id)).concat(clone(x.addRules));}
    },
    proxy:{onProxyError:event(),settings:{get:async()=>clone(proxy),set:async x=>{if(denyProxy)throw new Error('proxy failed');proxy={levelOfControl:'controlled_by_this_extension',value:clone(x.value)};},clear:async()=>{proxy={levelOfControl:'controllable_by_this_extension',value:{mode:'system'}};},onChange:event()}},
    privacy:{network:{networkPredictionEnabled:setting(),webRTCIPHandlingPolicy:setting()}}
  };
  if (firefox) api.runtime.getBrowserInfo=async()=>({name:'Firefox'});
  const context = vm.createContext({chrome:api,...(firefox?{browser:api}:{}),URL,AbortSignal,console,Date,
    fetch:async()=>{ if(fetchResult instanceof Error) throw fetchResult; return {ok:true,json:async()=>fetchResult || {IsTor:true,IP:'185.220.101.1'}}; }});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'core.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'background.js'),'utf8'),context);
  await vm.runInContext('queue',context);
  async function send(message) {
    return await new Promise(resolve=>api.runtime.onMessage.handlers[0](message,{id:api.runtime.id,url:prefix+'popup.html'},resolve));
  }
  return {api,context,send,get stored(){return stored;},get proxy(){return proxy;},get enabled(){return enabled;},get dynamic(){return dynamic;},alarms,notifications,opened,nativeCalls};
}
test('port ve bağış URL doğrulaması',()=>{
  assert.equal(C.port('9050'),9050);
  for(const n of [0,80,65536,NaN,3.14]) assert.throws(()=>C.port(n));
  assert.equal(C.supportUrl('https://buymeacoffee.com/hwyne'),'https://buymeacoffee.com/hwyne');
  for(const u of ['javascript:alert(1)','http://patreon.com/u','https://patreon.com.evil.test/u','https://u:p@patreon.com/x','https://ko-fi.com:8443/a']) assert.throws(()=>C.supportUrl(u));
  assert.equal(C.remaining(24000,0),'00:24'); assert.equal(C.remaining(0,1),'00:00');
});
test('Tor doğrulanmadan aktif gösterilmez; başarılı açılış filtreyi korur',async()=>{
  const h=await setup(); const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.ok,true); assert.equal(r.state.status,'connected');
  assert.equal(h.proxy.value.rules.singleProxy.port,19050); assert.deepEqual(h.enabled,['ads']);
  assert.equal(h.dynamic.length,0); assert.ok(h.alarms.has('tor-health'));
});
test('reklam kalkanı Tor açıkken bağımsız kapanıp açılır ve gerçek kurallar doğrulanır',async()=>{
  const h=await setup();await h.send({type:'TOR',enabled:true});
  const before=h.nativeCalls.length;
  const off=await h.send({type:'ADBLOCK',enabled:false});
  assert.equal(off.ok,true);assert.equal(off.state.adblockEnabled,false);assert.equal(off.state.adblockActive,false);
  assert.deepEqual(h.enabled,[]);assert.equal(off.state.status,'connected');assert.equal(h.nativeCalls.length,before);
  const on=await h.send({type:'ADBLOCK',enabled:true});
  assert.equal(on.state.adblockActive,true);assert.deepEqual(h.enabled,['ads']);assert.equal(on.state.status,'connected');
});
test('tarayıcı kapatma isteğini uygulamadıysa başarı/kapalı gösterilmez',async()=>{
  const h=await setup();h.api.declarativeNetRequest.updateEnabledRulesets=async()=>{};
  const off=await h.send({type:'ADBLOCK',enabled:false});
  assert.equal(off.ok,false);assert.equal(off.state.adblockActive,true);assert.equal(off.state.adblockEnabled,false);
  assert.match(off.error,/doğrulanmadı/);assert.deepEqual(h.enabled,['ads']);
});
test('DNR API reddederse gerçek açık durum ve hata birlikte döner',async()=>{
  const h=await setup();h.api.declarativeNetRequest.updateEnabledRulesets=async()=>{throw new Error('DNR rejected');};
  const off=await h.send({type:'ADBLOCK',enabled:false});
  assert.equal(off.ok,false);assert.equal(off.state.adblockActive,true);assert.equal(off.state.filterError,'DNR rejected');
});
test('GET saklanan tercih yerine gerçek tarayıcı durumunu da okur',async()=>{
  const h=await setup();await h.send({type:'ADBLOCK',enabled:false});
  h.api.declarativeNetRequest.getEnabledRulesets=async()=>['ads'];
  const r=await h.send({type:'GET'});
  assert.equal(r.state.adblockEnabled,false);assert.equal(r.state.adblockActive,true);assert.match(r.state.filterError,/farklı/);
});
test('kural tanısı hem açıkken eşleşmeyi hem kapalıyken eşleşmemeyi gösterir',async()=>{
  const h=await setup();let r=await h.send({type:'TEST_ADBLOCK'});
  assert.equal(r.diagnostics.active,true);assert.equal(r.diagnostics.matched,true);
  await h.send({type:'ADBLOCK',enabled:false});r=await h.send({type:'TEST_ADBLOCK'});
  assert.equal(r.diagnostics.active,false);assert.equal(r.diagnostics.matched,false);
});
test('reklamı kapatma tercihi worker yeniden başladığında korunur',async()=>{
  const h=await setup();await h.send({type:'ADBLOCK',enabled:false});
  const restarted=await setup({saved:h.stored});const r=await restarted.send({type:'GET'});
  assert.equal(r.state.adblockEnabled,false);assert.equal(r.state.adblockActive,false);assert.deepEqual(restarted.enabled,[]);
});
test('Tor hatasında normal bağlantı, reklamlar ve 24 dakikalık tek seferlik alarm',async()=>{
  const h=await setup({fetchResult:new Error('offline')}); const before=Date.now();
  const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.state.status,'fallback'); assert.equal(r.state.torEnabled,true);
  assert.equal(h.proxy.value.mode,'system'); assert.deepEqual(h.enabled,[]); assert.equal(h.dynamic.length,0);
  assert.ok(r.state.retryUntil>=before+C.RETRY_MS); assert.ok(h.alarms.has('tor-retry')); assert.ok(!h.alarms.has('tor-health'));
  assert.equal(h.notifications[0].id,'veil-disconnected'); assert.match(h.notifications[0].message,/Normal IP/);
  assert.ok(h.nativeCalls.includes('stop'));
});
test('Tor olmayan çıkış reddedilir ve normal bağlantıya dönülür',async()=>{
  const h=await setup({fetchResult:{IsTor:false,IP:'1.2.3.4'}});
  const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.state.status,'fallback'); assert.equal(r.state.ip,''); assert.match(r.state.lastError,/doğrulanmadı/);
});
test('yeniden deneme başarılıysa önceki AdBlock tercihi geri gelir',async()=>{
  const h=await setup({saved:{...C.defaults(),torEnabled:true,status:'fallback',retryUntil:Date.now()+C.RETRY_MS}});
  assert.deepEqual(h.enabled,[]);
  const r=await h.send({type:'RETRY'});
  assert.equal(r.state.status,'connected'); assert.deepEqual(h.enabled,['ads']); assert.equal(r.state.retryUntil,0);
  assert.ok(!h.alarms.has('tor-retry'));
});
test('kullanıcı AdBlock kapatmışsa yeniden bağlantıda da kapalı kalır',async()=>{
  const h=await setup({saved:{...C.defaults(),adblockEnabled:false,torEnabled:true,status:'fallback'}});
  const r=await h.send({type:'RETRY'}); assert.equal(r.state.status,'connected'); assert.deepEqual(h.enabled,[]);
});
test('24 dk sonrasında Tor hazırlanırken reklamlar açık kalır',async()=>{
  const h=await setup({saved:{...C.defaults(),torEnabled:true,status:'fallback'},nativeResult:{ok:true,running:true,bootstrap:40,socksReady:true}});
  const r=await h.send({type:'RETRY'}); assert.equal(r.state.status,'connecting');
  assert.equal(r.state.adblockPaused,true); assert.deepEqual(h.enabled,[]); assert.equal(h.proxy.value.mode,'system');
});
test('native helper yoksa sahte başarı yok; normal bağlantı açık kalır',async()=>{
  const h=await setup({nativeResult:new Error('host missing')});
  const r=await h.send({type:'TOR',enabled:true}); assert.equal(r.state.status,'fallback');
  assert.equal(r.state.nativeAvailable,false); assert.equal(h.dynamic.length,0);
});
test('yardımcı yanıt verip Tor hatası döndürürse kurulum eksik denmez',async()=>{
  const h=await setup({nativeResult:{ok:false,error:'Tor başlatılamadı (çıkış 7). [err] early startup failure'}});
  const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.state.status,'fallback'); assert.equal(r.state.nativeAvailable,true);
  assert.match(r.state.lastError,/early startup failure/);
  assert.doesNotMatch(r.state.lastError,/Kurulum sayfasını aç/);
});
test('bootstrap sürerken Tor durdurulmaz; üç dakika sonunda hata fallback olur',async()=>{
  const h=await setup({nativeResult:{ok:true,running:true,bootstrap:15,socksReady:true}});
  const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.state.status,'connecting'); assert.ok(!h.nativeCalls.includes('stop'));
  assert.equal(h.proxy.value.mode,'system'); assert.equal(h.dynamic.length,0);
  vm.runInContext('state().then(s => { s.connectDeadline=0; return save(s); })',h.context);
  await vm.runInContext('queue',h.context);
  await h.api.alarms.onAlarm.handlers[0]({name:'tor-health'});
  await vm.runInContext('queue',h.context);
  assert.equal(h.stored.status,'fallback'); assert.equal(h.dynamic.length,0);
});
test('kapatma normal proxyyi ve AdBlock tercihini geri getirir, alarmı siler',async()=>{
  const h=await setup(); await h.send({type:'TOR',enabled:true});
  const r=await h.send({type:'TOR',enabled:false}); assert.equal(r.state.status,'off'); assert.equal(r.state.torEnabled,false);
  assert.equal(h.proxy.value.mode,'system'); assert.deepEqual(h.enabled,['ads']); assert.equal(h.alarms.size,0);
});
test('Firefox manuel SOCKS5 ve proxyDNS; gizli pencere izni zorunlu',async()=>{
  const h=await setup({firefox:true}); const r=await h.send({type:'TOR',enabled:true});
  assert.equal(r.state.status,'connected'); assert.equal(h.proxy.value.socks,'127.0.0.1:19050'); assert.equal(h.proxy.value.proxyDNS,true);
  const denied=await setup({firefox:true,privateAccess:false});
  const no=await denied.send({type:'TOR',enabled:true}); assert.equal(no.state.status,'fallback'); assert.match(no.state.lastError,/Gizli/);
});
test('destek linki yoksa hatırlatma ve yönlendirme oluşturulmaz',async()=>{
  const h=await setup(); assert.ok(!h.alarms.has('support'));
  const r=await h.send({type:'OPEN_SUPPORT'}); assert.equal(r.setupRequired,true); assert.equal(h.opened.length,0);
});
test('bağış alarmı bildirim oluşturur; bir daha gösterme alarmı kaldırır',async()=>{
  const h=await setup({saved:{...C.defaults(),supportUrl:'https://ko-fi.com/hwyne'}});
  await h.api.alarms.onAlarm.handlers[0]({name:'support'}); await vm.runInContext('queue',h.context);
  assert.equal(h.stored.donationPending,true); assert.equal(h.notifications[0].id,'veil-support');
  await h.send({type:'DISMISS_SUPPORT',forever:true}); assert.equal(h.stored.reminderEnabled,false); assert.ok(!h.alarms.has('support'));
});
test('aktif Tor portu değiştirilemez; ayar doğrulaması kısmi yazım yapmaz',async()=>{
  const h=await setup(); await h.send({type:'TOR',enabled:true});
  const r=await h.send({type:'SETTINGS',mode:'external',port:9050,supportUrl:'',reminderEnabled:false});
  assert.equal(r.ok,false); assert.equal(h.stored.mode,'managed');
});
test('harici modda native helper çağrılmaz',async()=>{
  const h=await setup({saved:{...C.defaults(),mode:'external',port:9050}});
  const r=await h.send({type:'TOR',enabled:true}); assert.equal(r.state.status,'connected'); assert.equal(h.nativeCalls.length,0);
});
test('restart sırasında fallback süresi korunur; Tor otomatik erken açılmaz',async()=>{
  const deadline=Date.now()+60000;
  const h=await setup({saved:{...C.defaults(),torEnabled:true,status:'fallback',retryUntil:deadline}});
  h.api.runtime.onStartup.handlers[0](); await vm.runInContext('queue',h.context);
  assert.equal(h.stored.retryUntil,deadline); assert.equal(h.stored.status,'fallback'); assert.equal(h.nativeCalls.length,0);
});
test('24 dakika alarmı Tor yeniden bağlantısını başlatır',async()=>{
  const h=await setup({saved:{...C.defaults(),torEnabled:true,status:'fallback',retryUntil:Date.now()-1}});
  await h.api.alarms.onAlarm.handlers[0]({name:'tor-retry'}); await vm.runInContext('queue',h.context);
  assert.equal(h.stored.status,'connected');
});
test('proxy hata olayı normal bağlantıya döndürür',async()=>{
  const h=await setup(); await h.send({type:'TOR',enabled:true});
  h.api.proxy.onProxyError.handlers[0](); await vm.runInContext('queue',h.context);
  assert.equal(h.stored.status,'fallback'); assert.equal(h.dynamic.length,0);
});
test('yabancı web sayfasından kontrol mesajı kabul edilmez',async()=>{
  const h=await setup(); let called=false;
  const handled=h.api.runtime.onMessage.handlers[0]({type:'TOR',enabled:true},{id:ID,url:'https://example.com/'},()=>{called=true;});
  assert.equal(handled,false); assert.equal(called,false); assert.equal(h.stored.torEnabled,false);
});
