# Değişiklikler

## 1.0.2

- Reklam kalkanının kontrolü popup'ın üstüne taşındı. Tor düğmesinden ayrı, açıkça “Engellemeyi kapat / aç” yazan düğme kullanılır.
- Arayüz, saklanan tercih yanında tarayıcıdaki gerçek etkin kural listesini okur. Kapatma uygulanmazsa “kapalı” demek yerine gerçek aktif durumu ve hata gösterilir.
- Kullanıcının kapatma tercihi DNR değişikliğinden önce saklanır; worker kapanırsa önceki tercih geri uygulanmaz.
- Paketlenmemiş kurulumlar için reklam kuralı tanı düğmesi eklendi. Bu tanı gerçek reklam indirmez; etkin kural listesi ve varsayımsal istek eşleşmesini gösterir.
- Kapatma/açma, API reddi, uygulamadan başarılı yanıt veren API, worker yeniden başlatılması ve arayüzün gerçek durumu göstermesi için testler eklendi. 42 otomatik test geçti. Kullanıcının bildirdiği eski kapatma sorunu bu ortamda gerçek Chrome üzerinde birebir tekrar üretilemedi.

## 1.0.1

- Tor'un `Log notice file` içindeki tırnaklı yol nedeniyle başlamaması düzeltildi. Günlük çıktısı artık Python üzerinden dosyaya yazılır.
- Erken başlangıç stdout/stderr hataları kaybolmaz; Tor'un çıkış kodu ve son hata satırları eklentide görünür.
- Yardımcı bulunamadığında ve yardımcı çalışıp Tor hatası döndürdüğünde farklı açıklama gösterilir.
- Başlangıç hatası, boşluk içeren veri yolu, port çakışması ve çalışan Tor'un yeniden kullanımı için testler eklendi. 34 otomatik test geçti; canlı Tor bağlantısının doğrulanması hâlâ kullanıcı cihazında yapılmalı.

### Güncelleme

Yeni dosyaları çıkar. Mevcut proje dosyalarının üzerine kopyala; o klasörde `bash native/install-linux.sh` çalıştırarak kurulu native host'u yenile. Chrome eklentiler sayfasından VEIL'i yeniden yükle ve Tor modunu aç. Ayarlar aynı Chrome eklenti kimliği altında korunur.

### Mevcut Linux kurulumu için hızlı düzeltme

Tor modunu kapat ve aşağıdaki komutu normal kullanıcı olarak çalıştır. Bu komut kurulu eski yardımcıdaki yalnızca günlük yolu ifadesini düzeltir; `.bak` yedeği bırakır. Yardımcı kaynak kodunu değiştirdiği için Tor bir sonraki native başlangıçta yeni torrc üretir. Bu, 1.0.1'in geliştirilmiş hata raporlamasını eklemez; tam güncelleme için yeni paketi kur.

```bash
sed -i.bak "s/quoted(DATA \/ 'tor.log')/str(DATA \/ 'tor.log')/" "$HOME/.local/share/veil/native/host.py"
```

Ardından eklentiden Tor modunu yeniden aç. `TOR DOĞRULANDI` yazısını gördüğünde aynı tarayıcıda https://check.torproject.org/ ile çıkışı kontrol et.
