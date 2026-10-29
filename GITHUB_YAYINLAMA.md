# GitHub'da paylaşma

Bu paket doğrudan `hwyne/VEIL` deposunun köküne yüklemen için hazırlandı. Hesabında yayımlama veya dosya değiştirme işlemi yapılmadı.

1. GitHub'da `https://github.com/hwyne/VEIL` deposunu aç.
2. Açıklama olarak şunu kullanabilirsin: `Local Tor management and a lightweight ad shield for Chrome and Firefox. Experimental, open source, MIT licensed.`
3. README ve lisans pakette hazır. Mevcut depoda farklı dosyalar varsa üzerine yazmadan önce onları incele.
4. Bu ZIP'in içeriğini çıkar. GitHub'da **Add file → Upload files** seç. README.md, LICENSE, extension, native, dist ve diğer proje dosyalarını **deponun köküne** yükle. ZIP'te fazladan üst klasör yoktur; çıkarılan klasörün kendisini değil, içindeki dosya ve klasörleri sürükle. ZIP dosyasını tek başına depoya yüklemek kaynak dosyalarını görünür yapmaz. Linux dosya yöneticisinde gizli dosyaları da görmek için Ctrl+H kullanabilirsin.
5. Ana README otomatik görüntülenir. Türkçe ve İngilizce açıklamalar arasında geçiş bağlantısı vardır.
6. İlk paylaşımı deneysel ön sürüm olarak tanıt. Henüz yapılmayan gerçek tarayıcı/Tor testlerini tamamlanmış gibi sunma.
7. Bağış hesabın hazır olduğunda `.github/FUNDING.example.yml` şablonunu gerçek bilgilerle `.github/FUNDING.yml` olarak kaydet. GitHub web yükleyicisinde gizli klasörü seçmek zor olabilir; Add file → Create new file ile `.github/FUNDING.yml` yolunu oluşturarak da ekleyebilirsin.
8. Kullanıcılar için README'deki dist/chrome seçimini görünür tut. “Manifest eksik” hatasını önleyen nokta doğru klasörü yüklemektir.

GitHub, bir projenin yıldız veya indirme sayısına göre otomatik ödeme yapmaz. Bağış almak için çalışan bir ödeme/sponsorluk hesabı ve gerçek bir destek bağlantısı gerekir. Chrome mağazasına çıkmak, yerel Tor yardımcısının kurulum gereksinimini tek başına kaldırmaz; kurulum kolaylığı ayrı bir geliştirme hedefidir.

İlk geri bildirimlerde özellikle şunları iste: işletim sistemi ve tarayıcı sürümü, native helper kurulum sonucu, Tor doğrulaması, kopunca normal bağlantıya dönüş ve videoların sorunsuz oynayıp oynamadığı. Gizli kullanıcı verisi isteme.
