#!/usr/bin/env python3
"""Çevrimdışı, bağımlılıksız build; ikon üretmek için Pillow kullanılır."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'extension'
# Özgün ve küçük başlangıç listesi; üçüncü taraf filtre listesi kopyalanmaz.
DOMAINS = [
 'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adservice.google.com',
 'googletagservices.com', 'pagead2.googlesyndication.com', 'google-analytics.com',
 'analytics.google.com', 'adnxs.com', 'adsrvr.org', 'amazon-adsystem.com', 'criteo.com',
 'criteo.net', 'taboola.com', 'outbrain.com', 'pubmatic.com', 'rubiconproject.com',
 'openx.net', 'casalemedia.com', 'smartadserver.com', 'advertising.com', 'adform.net',
 'adroll.com', 'quantserve.com', 'scorecardresearch.com', 'mathtag.com', 'yieldmo.com',
 'sharethrough.com', 'lijit.com', 'sovrn.com', 'media.net', 'zedo.com', 'serving-sys.com',
 'moatads.com', 'doubleverify.com', 'adsafeprotected.com', 'hotjar.com', 'hotjar.io',
 'clarity.ms', 'bat.bing.com', 'ads.twitter.com', 'analytics.twitter.com', 'ads.linkedin.com',
 'snap.licdn.com', 'connect.facebook.net', 'pixel.facebook.com', 'ads.tiktok.com',
 'analytics.tiktok.com', 'sc-static.net', 'tr.snapchat.com', 'ads.yahoo.com', 'gemini.yahoo.com',
 'ads.yandex.ru', 'an.yandex.ru', 'mc.yandex.ru', 'adnxs-simple.com', 'ads.avct.cloud',
 'bidswitch.net', 'bidr.io', 'bluekai.com', 'demdex.net', 'everesttech.net', 'flashtalking.com',
 'innovid.com', 'spotxchange.com', 'spotx.tv', 'teads.tv', 'tremorhub.com', 'unrulymedia.com',
 'undertone.com', 'adcolony.com', 'unityads.unity3d.com', 'applovin.com', 'vungle.com',
 'chartboost.com', 'inmobi.com', 'tapjoy.com', 'adswizz.com', 'ads.stickyadstv.com',
 'ads.youtube.com', 'imasdk.googleapis.com'
]

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def build():
    key = (ROOT / 'scripts/public-key.txt').read_text().strip()
    identifier = ''.join(chr(97 + int(c, 16)) for c in hashlib.sha256(base64.b64decode(key)).hexdigest()[:32])
    (ROOT / 'CHROME_ID.txt').write_text(identifier + '\n')
    rules = [{'id': i, 'priority': 1, 'action': {'type': 'block'}, 'condition': {
        'urlFilter': '||' + domain + '^', 'resourceTypes': ['sub_frame', 'stylesheet', 'script', 'image', 'font',
        'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
    }} for i, domain in enumerate(sorted(set(DOMAINS)), 1)]
    dump(SOURCE / 'rules.json', rules)
    css = (SOURCE / 'cosmetic.css').read_text()
    # CSS tercih değişince mevcut sayfada da kaldırılır; video oynatıcısına müdahale yok.
    (SOURCE / 'content.js').write_text('''// Hafif görsel gizleme; sürekli DOM taraması veya video döngüsü yok.
(() => {
  const api = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo ? browser : chrome;
  const style = document.createElement('style');
  style.textContent = CSS;
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
'''.replace('CSS;', json.dumps(css) + ';'), encoding='utf-8')
    manifest = {
      'manifest_version': 3, 'name': 'VEIL · Tor & Reklam Kalkanı', 'version': '1.0.2',
      'description': 'Yerel Tor yönetimi, temel reklam engelleme ve bağlantı durumunu açıkça gösteren hafif tarayıcı aracı.',
      'minimum_chrome_version': '120', 'key': key,
      'permissions': ['proxy', 'privacy', 'declarativeNetRequest', 'storage', 'alarms', 'notifications', 'nativeMessaging'],
      'host_permissions': ['<all_urls>'],
      'background': {'service_worker': 'background.js'},
      'action': {'default_popup': 'popup.html', 'default_title': 'VEIL · Bağlantını yönet', 'default_icon': {'16':'icons/icon16.png','32':'icons/icon32.png'}},
      'icons': {str(n): f'icons/icon{n}.png' for n in [16,32,48,128]},
      'options_ui': {'page': 'setup.html', 'open_in_tab': True},
      'declarative_net_request': {'rule_resources': [{'id': 'ads', 'enabled': True, 'path': 'rules.json'}]},
      'content_scripts': [{'matches':['http://*/*', 'https://*/*'], 'js':['content.js'], 'run_at':'document_idle'}],
      'content_security_policy': {'extension_pages': "script-src 'self'; object-src 'none'; base-uri 'none'"}
    }
    dump(SOURCE / 'manifest.json', manifest)
    for name in ['chrome', 'firefox']:
        folder = ROOT / 'dist' / name
        if folder.exists(): shutil.rmtree(folder)
        shutil.copytree(SOURCE, folder)
        m = json.loads(json.dumps(manifest))
        if name == 'firefox':
            del m['minimum_chrome_version']; del m['key']
            m['background'] = {'scripts': ['core.js', 'background.js']}
            m['browser_specific_settings'] = {'gecko': {'id': 'veil@hwyne.local', 'strict_min_version': '140.0',
                'data_collection_permissions': {'required': ['none']}}}
        dump(folder / 'manifest.json', m)
        with zipfile.ZipFile(ROOT / 'dist' / f'veil-{name}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            for p in sorted(folder.rglob('*')):
                if p.is_file(): archive.write(p, p.relative_to(folder))
    print(f'Chrome ID: {identifier}; {len(rules)} ağ kuralı; Chrome + Firefox build hazır.')

if __name__ == '__main__': build()
