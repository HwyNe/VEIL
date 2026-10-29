#!/usr/bin/env python3
"""Gerçek popup HTML/CSS'sinden çevrimdışı, açıkça etiketli arayüz demosu."""
from pathlib import Path
import base64
import re
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'extension/popup.html').read_text()
main=re.search(r'<main>(.*?)</main>',source,re.S).group(1)
logo=base64.b64encode((ROOT/'extension/icons/logo.svg').read_bytes()).decode()
main=main.replace('icons/logo.svg','data:image/svg+xml;base64,'+logo).replace('href="setup.html"','href="#about"').replace('target="_blank"','')
css=(ROOT/'extension/style.css').read_text()
render=(ROOT/'extension/popup.js').read_text().split('function countdown()')[1].split('async function run(task)')[0]
render='function countdown()'+render
script='''const $ = id => document.getElementById(id); let current, busy = false;
RENDER
let demo={...VeilCore.defaults()};
function scene(name){
  demo.status=name; demo.torEnabled=name!=='off'; demo.ip='örnek çıkış'; demo.adblockPaused=name==='fallback';
  demo.retryUntil=Date.now()+24*60*1000; demo.lastError=''; render(demo);
  document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('selected',b.dataset.scene===name));
  $('verification').textContent=name==='connected'?'DEMO · Gerçek bağlantı yok':'ARAYÜZ ÖNİZLEMESİ';
}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>scene(b.dataset.scene));
$('torToggle').onclick=()=>scene(demo.torEnabled?'off':'connected');
$('retry').onclick=()=>scene('connected');
$('adToggle').onclick=()=>{demo.adblockEnabled=!demo.adblockEnabled;render(demo);};
$('adTest').onclick=()=>{$('adTestResult').hidden=false;$('adTestResult').textContent='DEMO: Bu dosya tarayıcıdaki gerçek kuralları test etmez.';};
$('support').onclick=()=>{document.getElementById('about').scrollIntoView({behavior:'smooth'});};
setInterval(countdown,1000); scene('off');
'''.replace('RENDER',render)
html='''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VEIL · Arayüz önizlemesi</title><style>CSS
body{min-height:100vh;background:radial-gradient(ellipse at 10% 20%,#1b3028,transparent 55%),radial-gradient(ellipse at 95% 90%,#282238,transparent 50%),#11151a}.preview-wrap{max-width:1100px;margin:auto;padding:50px 28px;display:grid;grid-template-columns:1fr 380px;gap:75px;align-items:center}.intro h1{font-size:66px;letter-spacing:-3px;line-height:1.05;margin:30px 0}.intro p{color:var(--muted);font-size:16px;line-height:1.8;max-width:490px}.demo-badge{display:inline-block;border:1px solid #bfb4f766;color:var(--purple);padding:9px 13px;border-radius:30px;font-size:10px;letter-spacing:1.3px}.scene-list{display:flex;flex-wrap:wrap;gap:8px;margin:28px 0}.scene-list button{background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px}.scene-list button.selected{color:var(--mint);border-color:var(--mint)}.phone{border:1px solid #46534d;border-radius:28px;background:var(--bg);box-shadow:0 30px 100px #0007;overflow:hidden}.phone main{padding:22px}.intro .note{font-size:12px;line-height:1.8;border-left:2px solid var(--purple);padding-left:15px}.intro .eyebrow{color:var(--mint)}@media(max-width:850px){.preview-wrap{grid-template-columns:1fr;gap:35px;max-width:560px}.phone{max-width:380px;width:100%;margin:auto}.intro h1{font-size:50px}}
</style></head><body><div class="preview-wrap"><section class="intro"><span class="demo-badge">ETKİLEŞİMLİ ARAYÜZ DEMOSU · BAĞLANTI KURMAZ</span><div class="eyebrow">VEIL / BY HWYNE</div><h1>Biraz daha<br>özgür.<br>Biraz daha sakin.</h1><p>Tor bağlantısı, reklam kalkanı ve anlaşılır durum bilgisi. Hafif bir tarayıcı eklentisi için tasarlanmış tek panel.</p><div class="scene-list"><button data-scene="off">Hazır</button><button data-scene="connected">Tor aktif</button><button data-scene="fallback">Bağlantı kesildi</button></div><p class="note" id="about">Bu dosya yalnızca arayüzü gösterir. Gerçek Tor veya reklam engelleme çalıştırmaz. Çalışan eklenti, yardımcı kurulum dosyaları ve kaynak kod VEIL paketindedir. Bağlantı kesilince normal IP ile devam edilir; reklamlar açılır ve 24 dakika sonra Tor yeniden denenir.</p></section><section class="phone">MAIN</section></div><script>CORE</script><script>SCRIPT</script></body></html>'''
html=html.replace('CSS\n',css+'\n').replace('MAIN',main).replace('CORE',(ROOT/'extension/core.js').read_text()).replace('SCRIPT',script)
(ROOT/'VEIL_Onizleme.html').write_text(html,encoding='utf-8')
print('Çevrimdışı arayüz demosu hazır.')
