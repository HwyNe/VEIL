# VEIL · Tor & Reklam Kalkanı

HwyNe için hazırlanmış açık kaynaklı Chrome / Firefox eklentisi. Koyu arayüz, özgün SVG/PNG ikonlar, yerel Tor yönetimi, temel reklam filtreleme ve isteğe bağlı bağış hatırlatması içerir.

## Önce tasarımı gör

`VEIL_Onizleme.html` dosyasını tarayıcıda aç. Bu çevrimdışı demo gerçek bağlantı kurmaz; “Hazır”, “Tor aktif” ve “Bağlantı kesildi” durumlarını gösterir. Gerçek eklenti aşağıdaki kurulumla çalışır.

## CachyOS / Arch üzerinde hızlı kurulum

1. ZIP dosyasını kalıcı bir klasöre çıkar. Örneğin `~/Uygulamalar/VEIL`. Çıkarılmış klasörü daha sonra silme veya taşıma; tarayıcı buradan yükler.
2. Chrome'da `chrome://extensions` adresini aç ve **Geliştirici modu** seçeneğini aç.
3. **Paketlenmemiş öğe yükle** düğmesinden `dist/chrome` klasörünü seç. `manifest.json` doğrudan bu klasörde olmalı.
4. ZIP'ten çıkardığın VEIL klasöründe bir terminal aç ve şunu çalıştır:

   ```bash
   bash native/install-linux.sh
   ```

   Betik eksikse Tor ve Python'u dağıtımın imzalı paket deposundan kurar. Paket kurulumu için gerektiğinde normal sudo parolanı kendi terminalinde girersin. Betiğin kendisini sudo ile çalıştırma. Tarayıcıya ait kullanıcı ayarlarına yerel yardımcı kaydedilir. Sistemin tüm trafiği için proxy kurulmaz.

5. Tarayıcıyı yeniden aç. VEIL → Ayarlar → **Kurulumu kontrol et** düğmesine bas.
6. Eklenti panelinden **Tor modunu aç** düğmesine bas. İlk başlangıç birkaç dakika sürebilir; bu sırada normal bağlantı devam eder. **TOR DOĞRULANDI** yazısı çıkınca web proxy'si Tor'a geçmiştir.
7. Daha önce açık olan sayfaları yenile. Normal oturumların çerezleri korunur; Tor açmak oturum geçmişini veya hesabını anonimleştirmez.

Chrome eklenti kimliği `CHROME_ID.txt` içindedir. Paketin public key alanı bu kimliği sabit tutar; özel anahtar pakette yoktur. Aynı kimlik Linux kurucusu tarafından kullanılır. Kendi Chrome Web Store sürümünde farklı kimlik verilirse `python3 native/install.py --chrome-id YENI_KIMLIK` ile yardımcı kaydını yenile.

## Firefox

1. `about:debugging#/runtime/this-firefox` → **Geçici eklenti yükle** → `dist/firefox/manifest.json` dosyasını seç.
2. `about:addons` → VEIL → Ayrıntılar → **Gizli pencerelerde çalıştır → İzin ver** seç. Firefox, tarayıcı genelindeki proxy ayarı için bu izni zorunlu tutar.
3. Yukarıdaki aynı Linux kurulum betiğini çalıştır. Chrome ve Firefox kayıtlarını birlikte oluşturur.
4. VEIL panelinden Tor modunu aç.

Firefox geçici kurulumları tarayıcı kapanınca kaldırılır. Kalıcı normal Firefox dağıtımı için Mozilla AMO üzerinden imzalama gerekir; bu ZIP imzalı bir mağaza paketi değildir. Firefox build'i MV3 event page, Chrome build'i MV3 service worker kullanır. Hedef: Chrome 120+, Firefox 140+.

## Windows ve macOS

Bu platformlar için kurucular kaynak olarak dahildir; bu ortamda gerçek cihaz testi yapılmadı.

### Windows

Python 3'ü ve Tor Project'in resmî **Expert Bundle** paketini kur/çıkar. Expert Bundle'daki `tor.exe` ve yanındaki kitaplık dosyalarını birlikte koru. Chrome'a `dist/chrome` klasörünü paketlenmemiş olarak yükle. PowerShell'den:

```powershell
& .\native\install-windows.ps1 -TorPath 'C:\Tor\tor\tor.exe'
```

Kurucu PyInstaller'ı pip ile kurar ve native host'u bilgisayarında `.exe` olarak üretir. Kullanıcı düzeyinde HKCU native messaging kayıtları ekler; yönetici oturumu gerekmez. İmzasız yerel executable ve PowerShell çalıştırma kısıtları kurum/cihaz ilkelerine bağlıdır; betik bu ilkeleri devre dışı bırakmaz. Hazır imzalı Windows kurulum EXE'si veya Tor binary'si bu pakette yoktur.

### macOS

Homebrew kurulu olmalı. Chrome eklentisini yükledikten sonra:

```bash
bash native/install-macos.sh
```

Betik eksikse `tor` ve `python` Homebrew paketlerini kurar; yardımcıyı kullanıcı düzeyinde kaydeder.

### Paketli tarayıcılar

Kurucu standart masaüstü Chrome, Chromium, Brave, Edge ve Firefox native host konumlarını hedefler. Flatpak/Snap tarayıcıların sandbox/portal yapılandırması farklıdır; bu ilk sürüm için desteklenmiş kabul edilmemelidir. Böyle bir tarayıcıda native yardımcının bulunamaması Tor bağlantısının kurulmuş olduğu anlamına gelmez. Standart masaüstü tarayıcı kullan veya kendi Tor servisinle harici modu seç.

## Bağlantı kesilince tam olarak ne olur?

- Yönetilen Tor durdurulur. Proxy üzerindeki bu eklentiye ait ayar temizlenir; tarayıcının önceden geçerli olan normal/sistem ayarı geri gelir. Bu eski ayar başka bir proxy ise geri gelen ayar odur.
- Reklam engellemenin hem ağ kuralları hem sayfaya eklenen görsel gizleme stili geçici olarak kapanır. Mevcut sayfadaki engellenmiş reklamlar otomatik yeniden yüklenmeyebilir; yeni isteklerde ve sayfa yenilemelerinde reklamlar görünebilir.
- Bildirimde **normal IP ile devam edildiği ve reklamların görünebileceği** yazılır. İşletim sistemi bildirimleri engellenmişse durum panelde ve eklenti rozetinde görünür.
- Panelde 24 dakikalık geri sayım başlar. Bu, Tor ağına ait bir kota veya garanti değil, eklentinin yeniden deneme aralığıdır.
- Süre sonunda Tor yeniden denenir. Tor hazırlanırken normal bağlantı ve duraklatılmış reklam kalkanı devam eder. Başarıyla doğrulanınca önceki AdBlock tercihin geri gelir. Tekrar başarısız olursa normal bağlantı ve yeni 24 dakikalık bekleme devam eder.
- **Şimdi yeniden dene** beklemeyi atlar. **Tor modunu kapat** otomatik denemeyi durdurur ve önceki AdBlock tercihini hemen geri getirir.
- Eklenti interneti durdurmak için genel bir bloklama kuralı kullanmaz. Proxy'nin çöküşü ile hatanın algılanması arasındaki kısa aralıkta bazı istekler doğal olarak hata alabilir; bunlar otomatik tekrar gönderilmez.
- Tor bağlantısı aktifken dakika başına bir sağlık kontrolü yapılır. Chrome proxy hata olayları ayrıca anlık geçişi tetikleyebilir. Dolayısıyla kopma algılaması her koşulda anlık değildir. Chrome kapalıyken veya bilgisayar uykudayken alarm çalışmaz; yeniden açılınca kalan süreye göre planlanır.

## Kendi Tor servisimi kullanabilir miyim?

Evet. Önce Tor modunu kapat. Ayarlar → **Mevcut yerel SOCKS5 / Tor servisim** → portu seç → Kaydet. Tipik sistem Tor portu 9050, Tor Browser portu 9150'dir; gerçek yapılandırman farklı olabilir. Sunucu adresi bu ilk sürümde 127.0.0.1 ile sınırlıdır. Harici modda native yardımcı kullanılmaz ve eklenti dış servisi başlatamaz/durduramaz; yalnızca tarayıcının kullanımını açıp kapatır.

Yönetilen mod sistem Tor'undan ayrı `127.0.0.1:19050` SOCKS5 ve cookie kimlik doğrulamalı `127.0.0.1:19051` kontrol portu kullanır. Bir Tor relay/exit node kurmaz. Bu iki port kullanımda ise anlaşılır hata gösterilir; başka süreç öldürülmez. Aynı kullanıcıdaki farklı tarayıcılar aynı yönetilen Tor sürecini paylaşır; birinde kapatmak diğerini etkileyebilir. İlk sürümde aynı anda tek tarayıcı/profil kullanılması önerilir.

## Reklam kalkanı

81 özgün temel alan adı kuralı ve dar kapsamlı görsel gizleme seçicileri içerir. Kurallar DNR ile tarayıcı ağ katmanında uygulanır; service worker'ın her sayfada veya video boyunca açık kalması gerekmez. Sayfalardaki küçük içerik betiği yalnızca ayar değişikliklerini dinler ve stil ekler/kaldırır. Sürekli DOM taraması, video zaman atlatma, sesle oynama veya uzak script enjeksiyonu yoktur.

YouTube'da görünen bazı reklam alanları gizlenir; platformun video akışı içindeki reklamlarını tamamen engelleme garantisi yoktur. Genel video/CDN alan adları veya bütün MP4 dosyaları engellenmez. Birinci taraf reklamlar, sponsorlu içerik ve kurallarda bulunmayan takipçiler kalabilir. Bazı giriş/analiz özellikleri filtrelerle etkilenebilir; tek bir sitede sorun varsa AdBlock'u geçici kapat. Bu sürümde site bazlı istisna editörü veya otomatik uzak filtre listesi güncellemesi yoktur.

## Bağış ve tek geliştirici dili

Arayüz “Bana destek ol” ve “Bu projeyi tek başıma geliştiriyorum” dilini kullanır. Kişisel hesabın bilinmediği için sahte ödeme bağlantısı eklenmedi. Ayarlardan kendi HTTPS Buy Me a Coffee, Patreon veya Ko-fi bağlantını gir. Kaydettiğinde ilk hatırlatma üç gün sonrasına planlanır. Link boşsa hatırlatma oluşturulmaz; kalıcı destek düğmesi ayarlara götürür.

“Bir daha gösterme” hem panelde hem destek bildiriminde vardır. Destek sayfası yalnızca kullanıcı tıklayınca açılır. Bir Pro aboneliği, lisans sunucusu veya ödeme alma altyapısı bu sürüme eklenmedi; bu ayrı bir ürün kararıdır.

## Gizlilik ve sınırlar

- Yalnızca kurulu olduğu tarayıcının proxy ayarını değiştirir; işletim sisteminin genel bağlantısını değiştirmez. Sisteme eklenen Tor servisi ve yardımcının dosyaları ayrı yerel bileşenlerdir.
- SOCKS5 üzerinden yönlendirme, Tor Browser'a eşdeğer anonimlik sağlamaz. Tarayıcı parmak izi, açık hesaplar, çerezler, DNS/WebRTC ve tarayıcı içi servisler gibi konular tarayıcıya ve platforma bağlıdır. Bu proje sızıntısızlık veya bütün trafik için anonimlik garantisi vermez.
- Desteklenen tarayıcı ayarlarıyla WebRTC'nin proxy dışı UDP kullanımı ve ağ tahmini sınırlandırılmaya çalışılır. Bir ayar uygulanamazsa panel bunu bildirir. Mevcut WebRTC oturumlarını sonlandırmaz.
- Tek dış sağlık adresi `https://check.torproject.org/api/ip` adresidir. Çıkış IP'si ve doğrulama sonucu bu servis tarafından görülebilir. Başarılı doğrulamada çıkış IP'si son durumu göstermek için yerel ayarlarda tutulur; Tor kapatılınca silinir. Geliştiriciye telemetri gönderilmez.
- Ayarlar `storage.local` içindedir; gezinme geçmişi toplanmaz, bulut senkronizasyonu yoktur. Kurucular paket yöneticisi/Homebrew/pip ile yazılım indirebilir; bunlar eklentinin arka planında sessizce çalışan işlemler değildir.
- `<all_urls>` izni temel ağ filtreleme, Firefox uyumluluğu ve bütün normal web sayfalarında tercih kontrollü görsel gizleme için istenir. İçerik betiği metin, parola, çerez veya sayfa HTML'si toplamaz.
- Otomatik normal bağlantıya dönmek kullanıcının özellikle istediği davranıştır; gizlilik gereksinimi yüksek işler için uygun bir bağlantı kesme koruması değildir.
- Tarayıcı kapanınca yerel Tor süreci çalışmaya devam edebilir. Kaynak tüketimini bitirmek için kapatmadan önce VEIL'den Tor modunu kapat. “RAM dostu” tasarım, Tor sürecinin bellek kullanmayacağı anlamına gelmez; ölçülmüş bir RAM rakamı vaat edilmez.

## Kaldırma

Önce eklentiden Tor modunu kapat. Ardından paketin kökünden:

```bash
python3 native/install.py --uninstall
```

Windows'ta `py -3 native/install.py --uninstall` kullan. Sonra eklentiyi tarayıcıdan kaldır. Tor paketinin kendisi, oluşturulan Tor verisi ve günlükleri silinmez. Linux'ta kullanıcı verisi `~/.local/share/veil/tor`, yardımcı `~/.local/share/veil/native` dizinindedir. Windows'ta `%LOCALAPPDATA%\veil\tor` ve `%LOCALAPPDATA%\Veil\native` kullanılır. macOS'ta Tor verisi `~/.local/share/veil/tor`, yardımcı `~/Library/Application Support/Veil/native` altındadır.

## Kaynak yapısı

```text
extension/          Chrome için doğrudan yüklenebilir kaynak
  manifest.json    MV3 izinleri, DNR, popup
  background.js    Proxy, Tor doğrulama, normal trafiğe dönüş, alarmlar
  core.js          Doğrulama ve zaman yardımcıları
  popup.html/js    Ana kontrol paneli
  setup.html/js    Kurulum ve ayarlar
  rules.json       Paketlenmiş reklam kuralları
  content.js       Tercihe bağlı hafif görsel gizleme
  cosmetic.css     Görsel gizleme seçicilerinin kaynağı
  style.css        Yerel, frameworksüz arayüz
  icons/           Özgün SVG ve 16–512 piksel PNG ikonlar
native/            Tor native messaging yardımcısı ve kurucular
dist/chrome/       Yüklemeye hazır Chrome sürümü
dist/firefox/      Yüklemeye hazır Firefox sürümü
scripts/           Çevrimdışı build ve önizleme üretimi
tests/             Tarayıcı davranışı ve native mesaj protokolü testleri
docs/              Test durumu ve canlı kabul kontrolü
VEIL_Onizleme.html Çevrimdışı arayüz demosu
```

## Geliştirme

Python 3.10+ ve Node.js 20+ ile:

```bash
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/build.py
python3 scripts/preview.py
```

Yalnızca ikonları yeniden çizmek için Pillow gerekir: `python3 -m pip install pillow` ve `python3 scripts/icons.py`. Çalışan eklenti herhangi bir npm/pip paketine bağlı değildir. Linux/macOS native host Python standart kitaplığını kullanır; Tor ayrı programdır. Derleme uzak kod indirmez. Chrome/Firefox ZIP'lerinin içinde manifest kök dizindedir.

Testlerin neyi doğruladığı ve henüz neyin canlı test edilmediği `docs/TEST_DURUMU.md` içindedir. MIT lisansı proje kodunu kapsar. Tor, Python, tarayıcılar ve PyInstaller kendi lisanslarıyla dağıtılır; Tor binary'si bu ZIP'e kopyalanmamıştır. Tor Project ile resmî ortaklık yoktur.

## Başvurulan resmî belgeler

- https://developer.chrome.com/docs/extensions/reference/api/proxy
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/reference/api/alarms
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- https://support.torproject.org/tor-browser/security/using-tor-with-other-browsers/
- https://www.torproject.org/download/tor/

Hazırlanma tarihi: 29 Ekim 2026.
