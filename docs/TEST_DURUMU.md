# Test durumu · 29 Ekim 2026

Bu paket kaynak teslimidir. Chrome Web Store / AMO'ya yüklenmiş, imzalanmış veya yayımlanmış değildir.

## Otomatik doğrulamalar

- 26 Node.js davranış testi: tarayıcı API mock'larıyla proxy açma/kapama, Tor olmayan çıkışın reddi, doğrulama hatası, normal trafiğe dönüş, reklam kalkanının duraklaması, tercihlerin geri gelmesi, 24 dakikalık alarm, yeniden başlatmada sürenin korunması, Firefox ayarları, eksik native host, destek hatırlatması, mesaj kaynağı doğrulaması ve gerçek etkin kural listesini okuyarak kapatma durumunun doğrulanması.
- 11 Python testi: gerçek subprocess üzerinden native messaging çerçevesi, geçersiz komut/JSON/boyut reddi, parçalı okuma, Tor yokken hata ve başkasına ait sürece sinyal gönderilmemesi.
- 5 arayüz davranış testi: DOM mock'larıyla popup açılışı, düğmeler, normal bağlantı sayacı, açık sayfada görsel gizlemenin kaldırılıp geri gelmesi ve tercihyle gerçek etkin kurallar farklıysa doğru durumun gösterilmesi.
- İzole geçici HOME dizininde Linux kurucusunun altı native host manifesti oluşturması, oluşturulan executable üzerinden gerçek stdio durum mesajı ve kaldırma işlemi doğrulandı. Ortam yalnızca root UID'sini desteklediği için kurucunun kullanıcı UID kontrolü bu testte taklit edildi; gerçek kullanıcı sisteminde kurulum testi yapılmış sayılmaz.
- JavaScript sözdizimi, Python derlenebilirlik ve HTML içindeki kimliklerle UI betiklerindeki referansların eşleşmesi kontrol edildi.
- Chrome / Firefox manifest dosyaları, yerel varlıklar ve kural listesi build sırasında üretildi.

## Yapılmayan canlı testler

Bu yürütme ortamında Chrome / Firefox kurulu değildi. Chrome for Testing indirme denemesi geçerli bir arşiv döndürmedi. Bu nedenle gerçek tarayıcıya yükleme, gerçek Tor ağına bağlanma, işletim sistemi bildiriminin görünmesi, YouTube üzerinde filtre etkisi, gerçek DNS/WebRTC sızıntı incelemesi veya RAM ölçümü yapılmış olarak sunulmaz. Windows/macOS kurucuları gerçek cihazda çalıştırılmadı.

API mock testlerinin geçmesi gerçek tarayıcı uyumluluğunu veya anonimliği kanıtlamaz. Firefox ve Chrome için canlı kontroller aşağıdadır.

## Kullanıcının bilgisayarında kabul kontrolü

1. Chrome'a `dist/chrome` klasörünü yükle. Eklenti hata sayfasında hata olmamalı; kurulum sayfası açılmalı.
2. Native yardımcıyı kur ve kurulum sayfasından kontrol et. Tor programının bulunduğunu gör.
3. Tor modunu aç. Tor bootstrap tamamlanınca “TOR DOĞRULANDI” görünmeli. https://check.torproject.org/ sayfası Tor çıkışını doğrulamalı. Eklenti Tor Browser'ın yerini aldığı şeklinde değerlendirilmemeli.
4. İnternet bağlantısını kısa süre kesip geri aç veya yönetilen Tor'u test amacıyla durdur. Bildirim / NET rozeti / normal bağlantı durumu görünmeli. Normal tarama geri gelmeli, reklam kalkanı duraklamalı ve 24 dakikalık sayaç başlamalı.
5. “Şimdi yeniden dene”ye bas. Tor bağlantısı doğrulanınca kalkanın önceki tercihi geri gelmeli. Kalkan kapalı tercih edilmişse kapalı kalmalı.
6. Fallback sırasında tarayıcıyı kapat/aç. Geri sayım sıfırlanmamalı. Süre geçmişse alarm kısa süre sonra yeniden denemeli.
7. Tor'u kapat. Normal proxy ayarı geri gelmeli, 24 dakikalık Tor alarmı kaldırılmalı. Başka VPN/proxy eklentileriyle çakışma varsa arayüz bunu göstermeli.
8. AdBlock açık ve kapalıyken geliştirme araçlarının Network sekmesinde örnek bir reklam alanı isteğini karşılaştır. Engellenen isteklerde ERR_BLOCKED_BY_CLIENT beklenir. Bütün reklamların kalkması beklenmez.
9. YouTube'da normal bir video oynat. Video dosyaları genel olarak engellenmemeli. Reklamlar yine görünebilir; tam YouTube engellemesi bu sürümün doğrulanmış özelliği değildir.
10. Bağış URL'sini kendi sayfanla ayarla. Test için geliştirme service worker konsolunda `chrome.alarms.create('support', {delayInMinutes: 0.5})` kullanabilirsin. Bildirim ve “Bir daha gösterme” tercihini kontrol et. Normal sürüm üç günlük aralık kullanır.
11. Firefox'ta özel pencere iznini vererek aynı akışı test et. İzin verilmediğinde anlaşılır uyarı beklenir.
12. Tarayıcının Görev Yöneticisi'nde service worker'ın boşta sürekli çalışmadığını incele. İşletim sisteminde Tor'un ayrı bir süreç olarak bellek kullandığını göz önünde bulundur.

Bağlantı hatası beklenirken internete çıkış devam edecek şekilde tasarlanmıştır. Test sırasında kesintiye kadar açık kalmış bağlantılar, cache ve tarayıcının iç sayfaları test sonucunu yanıltabilir; yeni normal web istekleri ve sayfa yenilemeleri kullan.

## 1.0.1 düzeltmesi

Kullanıcının Tor 0.4.9.14 başlangıç çıktısında, `Log notice file` yolundaki tırnakların günlük başlatmasını bozduğu doğrulandı. Tor artık `Log notice stdout` kullanır; native host stdout ve stderr akışlarını Python üzerinden `tor.log` dosyasına yönlendirir. Başlangıçta kapanan sürecin çıkış kodu ve son hata satırları arayüze iletilir. Yardımcının bulunamamasıyla Tor sürecinin hata vermesi ayrı gösterilir. Boşluk içeren geçici dizinde gerçek subprocess ile erken stdout/stderr hatası, dolu port ve çalışan sürecin yeniden kullanımı test edildi. Düzeltme sonrası canlı Tor ağı bağlantısı henüz doğrulanmadı. Toplam 34 otomatik test başarılı.

## 1.0.2: reklam kapatma tanısı

Kullanıcı aynı reklam kaynağının VEIL kurulu olduğunda ERR_BLOCKED_BY_CLIENT ile engellendiğini, VEIL kaldırıldığında opaque fetch yanıtı verdiğini bildirdi. Bu, örnek isteği VEIL’in engellediğini gösterir. Eski reklam kapatma düğmesinin neden beklenen etkiyi vermediği bu ortamda gerçek tarayıcıyla tekrarlanamadı. Yeni sürüm getEnabledRulesets ile etkin kuralları doğrular, API uygulamaz/reddederse arayüzde aktif durumu ve hatayı korur. Kontrol ekranın üstündedir. Tanı düğmesi varsayımsal DNR eşleşmesini gösterir; gerçek ağ testi yerine geçmez. Toplam 42 otomatik test geçmiştir. Yeni sürümün kullanıcı cihazındaki açık/kapalı karşılaştırması hâlâ yapılmalıdır.

## 1.1.0: YouTube reklamları ve çıkış ülkesi

Otomatik testler (hepsi mock): 44 Node + 15 Python = 59 test geçti. Yeni testler: oynatıcı yanıtından reklam alanı silme (`JSON.parse`, `ytInitialPlayerResponse`, `Response.json`), kapalıyken dokunmama, reklam başlayınca skip düğmesi/sona sarma/sesi geri getirme, manifest kaydı (`MAIN`, `document_start`), YouTube yol kuralları, çıkış ülkesi doğrulaması ve native `exitCountry` alanının izin listesi, torrc çıktısı ve ülke değişince yeniden başlatma.

**Doğrulanmayanlar:** Gerçek YouTube yanıtları, gerçek oynatıcı DOM'u, YouTube'un sunucu tarafı reklam gömmesi ve “reklam engelleyici” uyarıları, gerçek Chrome/Firefox yüklemesi, canlı Tor ile `ExitNodes {tr}` (Türkiye'de az çıkış olabilir), GeoIP dosyası olmayan Tor kurulumları.

Kabul kontrolü:
1. Eklentiyi yeniden yükle, YouTube sekmesini yenile. Reklamı olan bir videoyu aç; reklam hiç görünmemeli veya bir saniye içinde geçilmeli, video sesi sonra normale dönmeli.
2. Geliştirici konsolunda sayfa `<html data-veil-yt="on">` olmalı; kalkan kapalıyken `off`.
3. Ayarlar → Tor çıkış ülkesi → Türkiye, Tor'u kapat/aç. TOR DOĞRULANDI görünmeli; görünmezse VEIL normal bağlantıya döner, “Otomatik”i seç.
4. YouTube “reklam engelleyici” uyarısı gösterirse bu sürüm onu aşmaya çalışmaz; Reklam kalkanını kapatabilirsin.
