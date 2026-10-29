const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const C=require('../extension/core.js');
const root=path.join(__dirname,'../extension');
function node(){return {textContent:'',hidden:false,disabled:false,value:'',checked:false,isConnected:false,
  attrs:{},events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},
  remove(){this.isConnected=false;}};}
function dom(){
  const nodes=new Map();
  return {nodes,getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('popup ilk açılış ve Tor düğmesi doğru durumu gösterir',async()=>{
  const d=dom();let state=C.defaults();const tabs=[];
  const api={runtime:{getURL:p=>'chrome-extension://test/'+p,sendMessage:async m=>{
    if(m.type==='TOR')state={...state,torEnabled:m.enabled,status:m.enabled?'connected':'off',ip:'örnek'};
    if(m.type==='ADBLOCK')state.adblockEnabled=m.enabled;
    if(m.type==='OPEN_SUPPORT')return {ok:true,setupRequired:true};
    return {ok:true,state:structuredClone(state)};
  }},storage:{onChanged:{addListener(){}}},tabs:{create:async x=>tabs.push(x)}};
  const ctx=vm.createContext({chrome:api,document:d,window:{addEventListener(){}},VeilCore:C,setInterval:()=>1,clearInterval(){},console});
  vm.runInContext(fs.readFileSync(path.join(root,'popup.js'),'utf8'),ctx);await flush();
  assert.equal(d.getElementById('headline').textContent,'Kontrol sende.');
  await d.getElementById('torToggle').events.click();await flush();
  assert.equal(d.getElementById('statusChip').textContent,'TOR DOĞRULANDI');assert.equal(d.getElementById('torToggle').disabled,false);
  await d.getElementById('support').events.click();await flush();
  assert.match(tabs[0].url,/setup.html#support-settings/);
});
test('fallback paneli normal bağlantı ve 24 dakika bilgisini gösterir',async()=>{
  const d=dom();const s={...C.defaults(),torEnabled:true,status:'fallback',retryUntil:Date.now()+C.RETRY_MS};
  const api={runtime:{sendMessage:async()=>({ok:true,state:s})},storage:{onChanged:{addListener(){}}}};
  const ctx=vm.createContext({chrome:api,document:d,window:{addEventListener(){}},VeilCore:C,setInterval:()=>1,clearInterval(){},console});
  vm.runInContext(fs.readFileSync(path.join(root,'popup.js'),'utf8'),ctx);await flush();
  assert.equal(d.getElementById('statusChip').textContent,'NORMAL BAĞLANTI');
  assert.equal(d.getElementById('countdown').hidden,false);assert.match(d.getElementById('countdown').textContent,/24:00/);
  assert.match(d.getElementById('adStatus').textContent,/duraklatıldı/);assert.equal(d.getElementById('retry').hidden,false);
});
test('açık sayfada fallback stilini kaldırır; yeniden bağlantıda stil geri gelir',async()=>{
  let change;const style=node();
  const api={runtime:{},storage:{local:{get:async()=>({veil:{adblockEnabled:true,status:'connected'}})},onChanged:{addListener:f=>change=f}}};
  const ctx=vm.createContext({chrome:api,document:{createElement:()=>style,head:{append:n=>{n.isConnected=true;}}}});
  vm.runInContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),ctx);await flush();assert.equal(style.isConnected,true);
  change({veil:{newValue:{adblockEnabled:true,status:'fallback'}}},'local');assert.equal(style.isConnected,false);
  change({veil:{newValue:{adblockEnabled:true,status:'connecting',adblockPaused:true}}},'local');assert.equal(style.isConnected,false);
  change({veil:{newValue:{adblockEnabled:true,status:'connected',adblockPaused:false}}},'local');assert.equal(style.isConnected,true);
});
test('tercih kapalı olsa bile gerçek kurallar açıksa arayüz kapalı diye göstermez',async()=>{
  const d=dom();const s={...C.defaults(),adblockEnabled:false,adblockActive:true,filterError:'Tarayıcı kapatmayı doğrulamadı'};
  const api={runtime:{sendMessage:async()=>({ok:true,state:s})},storage:{onChanged:{addListener(){}}}};
  const ctx=vm.createContext({chrome:api,document:d,window:{addEventListener(){}},VeilCore:C,setInterval:()=>1,clearInterval(){},console});
  vm.runInContext(fs.readFileSync(path.join(root,'popup.js'),'utf8'),ctx);await flush();
  assert.equal(d.getElementById('adToggle').attrs['aria-checked'],'true');assert.equal(d.getElementById('adToggle').textContent,'Engellemeyi kapat');
  assert.equal(d.getElementById('adStatus').textContent,'Ağ kuralları aktif');assert.equal(d.getElementById('filterError').hidden,false);
});
test('doğrulanmış kapatma cevabı düğmeyi ve metni kapalı duruma getirir',async()=>{
  const d=dom();let s={...C.defaults(),adblockActive:true};
  const api={runtime:{sendMessage:async m=>{if(m.type==='ADBLOCK')s={...s,adblockEnabled:m.enabled,adblockActive:m.enabled};return {ok:true,state:s};}},storage:{onChanged:{addListener(){}}}};
  const ctx=vm.createContext({chrome:api,document:d,window:{addEventListener(){}},VeilCore:C,setInterval:()=>1,clearInterval(){},console});
  vm.runInContext(fs.readFileSync(path.join(root,'popup.js'),'utf8'),ctx);await flush();
  await d.getElementById('adToggle').events.click();await flush();
  assert.equal(d.getElementById('adStatus').textContent,'Ağ kuralları kapalı');assert.equal(d.getElementById('adToggle').textContent,'Engellemeyi aç');assert.equal(s.adblockEnabled,false);
});
