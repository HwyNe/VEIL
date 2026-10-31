<p align="center">
  <img src="extension/icons/icon128.png" alt="VEIL kalkanı" width="96" height="96">
</p>

<h1 align="center">VEIL</h1>
<p align="center">Yerel Tor yönetimi ve hafif reklam kalkanı.<br>HwyNe tarafından geliştirilen açık kaynaklı Chrome / Firefox projesi.</p>
<p align="center"><a href="#kurulum">Kurulum</a> · <a href="README.en.md">English</a> · <a href="README_TR.md">Ayrıntılı rehber</a> · <a href="docs/TEST_DURUMU.md">Test durumu</a> · <a href="LICENSE">MIT lisansı</a></p>

**Depo:** [hwyne/VEIL](https://github.com/hwyne/VEIL)

> **Deneysel ön sürüm.** Proje henüz Chrome Web Store / Firefox AMO'da yayımlanmadı. Otomatik davranış testleri mevcut; gerçek Chrome/Firefox ve canlı Tor ağı testi bu geliştirme ortamında yapılmadı. Geri bildirimler doğrultusunda geliştirilecek.

## Neler yapar?

- **Yerel Tor:** Tarayıcının proxy destekleyen web isteklerini yerel SOCKS5 üzerinden yönlendirir. Yardımcı kurulduktan sonra Tor'u eklentiden başlatıp durdurabilirsin.
- **Reklam kalkanı:** 86 ağ kuralı (81 alan adı + 5 YouTube reklam yolu), sınırlı görsel gizleme ve YouTube için ayrı reklam ayıklama/atlama betiği. Kurallar, arka plan kodu uyurken de çalışır.
- **Açık durum bilgisi:** Tor bağlantısını `check.torproject.org` üzerinden doğrular; doğrulanmamış bağlantıyı aktif olarak göstermez.
- **Kesintide normal bağlantı:** Tor koparsa normal taramaya döner ve reklam kalkanını geçici duraklatır. Kullanıcıya bildirim gösterir; 24 dakika sonra yeniden dener. Bu sırada normal IP adresi kullanılır.
- **Bağımsız tercihler:** Tor ve AdBlock ayrı yönetilir. Tor yeniden doğrulanınca önceki reklam kalkanı tercihi geri gelir.
- **İsteğe bağlı destek:** Kalıcı destek düğmesi ve kapatılabilir üç günlük hatırlatma. Bağış hesabı bağlantısı girilmeden hatırlatma oluşturulmaz.
- **Yerel arayüz:** Uzak font, uzak JavaScript, analiz/telemetri servisi veya arayüz framework'ü yok.

**Kapsam:** Yalnızca eklentinin kurulu olduğu tarayıcının ayarları değiştirilir. Bütün bilgisayar için VPN kurulmaz. Tor Browser'ın anonimlik korumaları sağlanmaz; YouTube reklamlarının tamamının engellenmesi vaat edilmez; YouTube yöntemlerini sık değiştirir.

## Kurulum

### 1. Kaynağı indir

Bu GitHub deposunda **Code → Download ZIP** seçeneğini kullan ve dosyayı kalıcı bir klasöre çıkar. Eklentiyi yükledikten sonra bu klasörü silme veya taşıma.

Önce görünümü incelemek istersen [VEIL_Onizleme.html](VEIL_Onizleme.html) dosyasını indirip tarayıcıda aç. Bu dosya **arayüz demosudur; gerçek Tor bağlantısı veya reklam engelleme çalıştırmaz.** GitHub dosya görünümü HTML demosunu çalıştırmaz.

### 2. Tarayıcıya yükle

| Tarayıcı | İşlem | Seçilecek klasör / dosya |
| --- | --- | --- |
| Chrome 120+ | `chrome://extensions` → Geliştirici modu → Paketlenmemiş öğe yükle | **`dist/chrome` klasörü** |
| Firefox 140+ | `about:debugging#/runtime/this-firefox` → Geçici eklenti yükle | **`dist/firefox/manifest.json` dosyası** |

**Chrome'a depo kökünü, İndirilenler klasörünü veya ZIP dosyasını yükleme.** Seçilen `dist/chrome` klasöründe doğrudan `manifest.json` bulunmalı.

Firefox'ta ayrıca Eklentiler → VEIL → Ayrıntılar → **Gizli pencerelerde çalıştır → İzin ver** seçilmeli. Firefox bunu proxy ayarı için zorunlu tutar. Geçici Firefox kurulumu tarayıcı kapanınca kaldırılır; kalıcı dağıtım için mağaza imzası gerekir.

### 3. Tor yardımcısını bir kez kur

Saf tarayıcı eklentisi Tor executable dosyasını doğrudan çalıştıramaz. Bunun için paketteki küçük native messaging yardımcısı gerekir. Kurulumdan sonra normal kullanım eklenti panelinden yapılır.

**CachyOS / Arch, Debian / Ubuntu veya Fedora:** Depodan çıkardığın klasörde terminal aç:

```bash
bash native/install-linux.sh
```

Betiği normal kullanıcınla çalıştır. Eksik Tor/Python paketi varsa dağıtımın paket yöneticisiyle kurar ve gerektiğinde sudo ister. Yardımcı kullanıcı düzeyinde kaydedilir; sistem genelinde proxy ayarı yazılmaz.

Tarayıcıyı yeniden aç → VEIL → Ayarlar → **Kurulumu kontrol et** → panelden **Tor modunu aç**. Tor hazırlanırken normal bağlantı devam eder. Açık sayfaları, bağlantı doğrulandıktan sonra yenile.

**Windows, macOS, kaldırma ve mevcut Tor servisi:** [Ayrıntılı rehber](README_TR.md). Bu platformların kurucuları gerçek cihazda test edilmedi. Flatpak/Snap tarayıcılarda native host erişimi bu ilk sürümde desteklenmiş kabul edilmez.

## Tor bağlantısı kesilirse

| Durum | Bağlantı | Reklam kalkanı |
| --- | --- | --- |
| Tor kapalı | Tarayıcının normal / önceki proxy ayarı | Kullanıcının tercihi |
| Tor hazırlanıyor | Normal bağlantı sürer | İlk açılışta kullanıcının tercihi; kesinti sonrası yeniden denemede duraklar |
| Tor doğrulandı | Yerel Tor SOCKS5 | Kullanıcının tercihi |
| Tor koptu | Normal / önceki proxy ayarına dönüş | Geçici olarak kapalı; reklamlar görünebilir |
| 24 dakikalık sayaç doldu | Tor yeniden denenir | Doğrulanınca önceki tercih geri gelir |

“Şimdi yeniden dene” ile beklemeyi atlayabilirsin. 24 dakika Tor ağına ait bir kullanım kotası değildir; uygulamanın yeniden deneme aralığıdır. Eklenti trafiği durdurmak için genel engelleme kuralı eklemez. Hatanın algılanmasına kadar bazı istekler hata alabilir. Tarayıcı kapalıyken/uykudayken alarm gecikebilir.

Yönetilen modda Tor bu bilgisayarda `127.0.0.1:19050` üzerinde çalışır. Aynı kullanıcıdaki farklı tarayıcılar süreci paylaşır; ilk sürüm için aynı anda tek tarayıcı/profil kullanılması önerilir. Önceden başka bir proxy ayarı varsa hata sonrası o ayar geri gelir. Harici Tor modunda eklenti dış Tor sürecini başlatamaz veya durduramaz.

## Sık karşılaşılan sorunlar

**“Manifest dosyası eksik veya okunamıyor.”**

Yanlış klasör seçilmiş olabilir. ZIP'i çıkar; Chrome'da **`dist/chrome`** klasörünü seç. Klasörü açtığında `manifest.json` dosyasını hemen görmelisin.

**“Tor yardımcısı hazır değil.”**

Kurulum betiğini çalıştır, tarayıcıyı yeniden aç ve Ayarlar → Kurulumu kontrol et seçeneğini kullan. Yalnızca eklenti dosyalarını yüklemek yerel Tor'u kurmaz. Mevcut Tor servisin varsa ayarlardan harici modu seçebilirsin.

**YouTube reklamları hâlâ görünüyor.**

1.1.0 ile YouTube için reklam verisini oynatıcı yanıtından ayıklayan ve atlanamayan reklamı geçen ayrı bir betik eklendi. Sorun sürerse sayfayı yenile, VEIL'i eklentiler sayfasından yeniden yükle ve Reklam kalkanının açık olduğunu kontrol et. Tor yeniden denemesi sırasında kalkan bilerek duraklar. Normal video dosyaları genel olarak engellenmez.

**YouTube reklamları yabancı ülkeden/dilinde geliyor.**

YouTube reklamı Tor çıkışının ülkesine göre seçer. Ayarlar → “Tor çıkış ülkesi” ile Türkiye gibi bir ülke seçebilirsin (Tor kapalıyken değiştir). Bu, seçenekleri azalttığı için bağlantıyı yavaşlatabilir ve gizliliği düşürür; çıkış bulunamazsa VEIL normal bağlantıya döner. Reklam engelleme çalışıyorsa çıkış ülkesi çoğu zaman önemsizdir.

**Tor kapalıyken AdBlock çalışır mı?**

Evet. Manuel olarak Tor modunu kapatınca reklam kalkanı kendi tercihinle çalışır. Otomatik kesinti beklemesinde ise kullanıcının istediği tasarım gereği geçici duraklatılır.

## Gizlilik ve izinler

- Ayarlar ve son bağlantı durumu cihazdaki `storage.local` içinde tutulur. Gezinti geçmişi veya sayfa içeriği geliştiriciye gönderilmez.
- `proxy`: tarayıcı proxy ayarı. `privacy`: desteklenen ağ tahmini/WebRTC ayarları. `nativeMessaging`: yerel Tor yardımcısı.
- `declarativeNetRequest`: ağ filtreleri. `storage`: tercihler. `alarms`: sağlık kontrolü, yeniden deneme ve destek zamanı. `notifications`: kullanıcı bildirimleri.
- `<all_urls>`: normal web sayfalarında filtreleme ve tercihe göre görsel gizleme. İçerik betiği parola, çerez veya sayfa metni toplamaz.
- Tor doğrulama servisi çıkış IP adresini görür. Açık hesaplar/çerezler korunur; Tor moduna geçmek kimliği gizleme garantisi vermez.
- Otomatik normal bağlantıya dönüşte gerçek IP sitelere görünür. Bu davranış gizlilik ihtiyacı yüksek işler için bağlantı kesme koruması değildir.

[Ayrıntılı sınırlar ve gizlilik açıklaması](README_TR.md#gizlilik-ve-sınırlar)

## Geliştirme ve test

Python 3.10+ ve Node.js 20+:

```bash
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/build.py
python3 scripts/preview.py
```

Build dosyaları `dist/chrome` ve `dist/firefox` altında oluşur. Yalnızca ikonları yeniden üretmek için Pillow gerekir. Çalışan eklenti bir npm/pip paketine bağlı değildir; native host Python standart kitaplığı ve ayrıca kurulan Tor programını kullanır.

**Mevcut doğrulama:** 31 Node.js testi + 11 Python testi geçti. Tarayıcı API/DOM testleri mock kullanır; bunlar gerçek tarayıcı veya Tor ağı testi değildir. [Tam test durumu ve canlı kabul adımları](docs/TEST_DURUMU.md).

**Reklam kalkanını karşılaştır:** Panelin üstündeki “Engellemeyi kapat” düğmesini kullan. “Ağ kuralları kapalı” yazısını gör. “Reklam kuralını test et” düğmesi tarayıcıdaki gerçek kural listesini ve destekleniyorsa örnek istek eşleşmesini gösterir. Tor düğmesi reklam kalkanını manuel kapatmaz. Gerçek ağ denemesinde kalkan açıkken `ERR_BLOCKED_BY_CLIENT`, kapalıyken `no-cors` fetch için `Response type: opaque` beklenir; opaque yanıtta `status: 0` ve `ok: false` normaldir. Her reklamın engelleneceği anlamına gelmez.

## Katkı ve yol haritası

İlk hedef, kullanıcıların kurup gerçek cihazlarda deneyebileceği açık kaynaklı bir sürüm oluşturmak. Hata bildirirken tarayıcı/işletim sistemi sürümünü, kullanılan modu ve tekrar üretme adımlarını ekle. Parola, çerez veya özel gezinme kayıtlarını gönderme.

Planlanan işler; tamamlanmış özellikler olarak değerlendirilmemeli:

- [ ] Gerçek Chrome/Firefox ve Tor ağı kabul testleri
- [ ] Windows/macOS kurucularının gerçek cihaz testleri
- [ ] Komutsuz, daha kolay yardımcı kurulumu
- [ ] Site bazlı reklam istisnaları
- [ ] Filtre kapsamının geri bildirimlerle iyileştirilmesi
- [ ] Gizlilik ve performans ölçümleri
- [ ] Kullanım ve destek oluşursa mağaza dağıtımı

## Destek ol ☕

Bu projeyi tek başıma geliştiriyorum. Hata bildirmek, test etmek, katkı göndermek veya projeyi paylaşmak da destek olur. Bağışlar ileride dağıtım ve geliştirme masraflarına yardımcı olabilir; bu sürümde ücretli özellik yoktur.

**Bağış bağlantısı henüz eklenmedi.** Sahte veya başkasına ait bir ödeme bağlantısı kullanılmaz. Kendi hesabın hazır olduğunda [fonlama şablonunu](.github/FUNDING.example.yml) gerçek bilgilerle doldurarak `.github/FUNDING.yml` olarak kaydedebilirsin. Bu dosya varsayılan daldayken GitHub Sponsor düğmesini yapılandırır. Eklenti içindeki bağlantı ise Ayarlar sayfasında ayrıca yapılandırılır; ziyaretçinin ayarları geliştiricinin bağış hesabını oluşturmaz.

## Lisans

[MIT](LICENSE). Tor Project ile resmî bağlantısı yoktur. Tor binary'si depoya dahil değildir ve kendi lisansıyla dağıtılır.
