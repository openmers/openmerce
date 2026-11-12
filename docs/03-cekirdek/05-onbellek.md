# Önbellek


- **İzin listesi, sezgi değil.** Yalnızca açıkça listelenen herkese açık rotalar (ana sayfa, ürün, kategori, içerik sayfası, katalog API'si) paylaşımlı önbelleğe girer. Sepet, checkout, hesap, sipariş, admin her zaman `private, no-store`. Listede olmayan rota varsayılan olarak `no-store`.
- **Etiketli temizleme.** Yanıtlar `Cache-Tag` taşır (`product:<public_id>`, `category:<...>`, `shell`). Yazma işleminden hemen sonra ilgili etiketler temizlenir.
  - İçerik değişiklikleri (seyrek): etiket temizliği başarısızsa tümünü temizle; o da başarısızsa istek hata döner. Bayat içerik sessizce kabul edilmez.
  - Stok geçişleri (checkout sıklığında): yalnızca ürün etiketi, en iyi çaba; başarısızsa kısa TTL güvenlik ağıdır.
- **Stok kova olarak gösterilir.** Vitrin `stokta / az kaldı / tükendi` görür, kesin adedi değil. Kova değişmedikçe önbellek temizlenmez; kesin adet de dışarı sızmaz.
- Sepet, stok ve fiyat hesaplaması asla önbellekten okunmaz.
- **Kişiye özel parça önbellekli HTML'e girmez.** Sepet rozeti ve hesap göstergesi sayfayla birlikte render edilmez; istemcide doldurulur (bkz. [storefront](../07-istemciler/01-storefront.md)). Böylece ürün ve kategori sayfaları herkes için aynıdır ve okuma trafiğinin çoğu veritabanına hiç ulaşmaz.
- **Herkese açık sayfa render yolunda dış çağrı yok.** Benzer ürünler, öneriler ve benzeri türetilmiş veriler yazma anında hesaplanıp ürün satırına kaydedilir; sayfa yalnızca okur. (Minshop'ta her ürün sayfası iki vektör araması yapıyordu ve yanıt 12 saniyeye kadar çıkıyordu; ön hesaplamaya geçince sorun kalktı.)

## Segment anahtarı

Paylaşımlı önbellek anahtarı = URL + `ctx.segment` (kanal + dil + para birimi + fiyat listesi kümesi). Anonim B2C tek segmenttir. Giriş yapmış B2B alıcısında segment oturumdan gelir ve yanıt `Vary` yerine anahtarın parçası olarak önbelleklenir; aynı fiyat listesini paylaşan şirketler aynı kopyayı görür. Giriş zorunlu kanallarda segment çerezi imzalıdır; imzasız veya geçersiz segment anonim segmente düşer, başkasının fiyatı sızmaz.

Fiyat listesi değişince yalnızca o listenin etiketi (`pl:<public_id>`) temizlenir.

## Bellek içi sıcak yapılandırma

Kanallar, bölgeler, vergi oranları, kargo ve ödeme yöntemleri, etkin promosyonlar ve özel alan tanımları süreç belleğinde tutulur (TTL 30 sn + `settings_version` sayacı). İstek başına sorgulanmazlar. Workers'ta bellek çağrılar arasında garanti değildir; ıska durumunda KV'den, o da yoksa veritabanından tek sorguyla yüklenir.

## Oturum önbelleği

Oturum doğrulaması önbellekten yapılır (KV / LRU, kısa TTL). Çıkış, parola değişimi ve rol değişimi anahtarı siler. Vendure'un `SessionCacheStrategy`'sinin karşılığıdır.

## Önbelleğe girmeyenler

Sepet, checkout, hesap, sipariş, teklif, şirket kredisi, admin, kesin stok adedi, senkron kanca yanıtları (yalnızca sepet özeti anahtarıyla, saniyeler düzeyinde).
