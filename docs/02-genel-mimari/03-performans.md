# Performans mimarisi

Bu belge diğer bütün belgelerin uyması gereken performans kurallarını toplar. Buradaki sayılar **hedeftir, ölçüm değildir**; hiçbir kod henüz yazılmadı. Hedefler CI'da k6 ile ölçülmeden doğrulanmış sayılmaz (bölüm 8).

## 1. Okuma yolu: normalize tablolara dokunma

Trafiğin büyük çoğunluğu katalog okumasıdır. Üç katman, dıştan içe:

| Katman | Ne | İsabet durumunda maliyet |
|---|---|---|
| 1. Kenar / proxy önbelleği | Herkese açık HTML ve katalog API yanıtları, etiketli | Veritabanı yok, Worker yok |
| 2. Okuma modeli | `catalog_index` (liste, filtre, arama) ve `product_view` (ürün sayfası için hazır JSON) | Tek indeksli sorgu, join yok |
| 3. Yazma modeli | Normalize tablolar | Yalnızca admin ve yazma komutları |

- Liste, filtre ve arama **yalnızca** `catalog_index`'ten okur ([../05-ticaret/02-katalog-ve-arama.md](../05-ticaret/02-katalog-ve-arama.md)). Vendure'un `SearchIndexItem` tablosuyla aynı fikir.
- Ürün sayfası tek satır okur: `product_view(channel, lang, slug)` içindeki hazır sunum modeli.
- Okuma modeli yazma anında değil, **işle** güncellenir; yazma komutu yalnızca bir `reindex` işi bırakır.

## 2. Önbellek anahtarı: kişi değil segment

B2B'de her müşterinin fiyatı farklı olabilir; bu, sayfa önbelleğini öldürür. Çözüm: fiyatı belirleyen şey müşteri değil **fiyat listesidir** ve fiyat listesi sayısı azdır.

- Önbellek anahtarı = `kanal + dil + para birimi + fiyat listesi kümesi` (segment).
- Anonim B2C ziyaretçisi tek segmenttir; sayfalar herkese aynıdır.
- Giriş yapmış B2B alıcısının segmenti oturumda durur; aynı fiyat listesine sahip yüz şirket aynı önbelleği paylaşır.
- Tek bir şirkete özel fiyat listesi varsa o segment yine önbelleklenir, yalnızca daha az paylaşılır.
- Sepet, hesap, kredi durumu hiçbir zaman önbelleğe girmez; istemci adasında doldurulur.

Ayrıntı: [../03-cekirdek/05-onbellek.md](../03-cekirdek/05-onbellek.md).

## 3. İstek başına veritabanı turu bütçesi

D1'de her sorgu bir ağ turudur; SQLite'ta süreç içi çağrıdır ama tek yazıcı vardır. Bu yüzden bütçe sorgu süresi değil **tur sayısıdır**.

| İstek | Hedef tur |
|---|---|
| Katalog listesi / arama | 1 (indeks + toplam aynı `batch` içinde) |
| Ürün sayfası | 1 |
| Sepeti hesapla | 2 (sepet + satırlar; fiyat + stok kovası + vergi oranı tek `batch`) |
| Checkout rezervasyonu | 1 `atomic()` |
| Settlement | 1 `atomic()` |

Kurallar:

- **N+1 yasak.** Döngü içinde sorgu yok; kimlik listesi toplanır, tek `IN (...)` sorgusu atılır. GraphQL alan çözücüsü olmadığı için bu, handler başına elle yazılmış bir-iki sorgudur.
- Bağımsız okumalar tek `batch` ile gönderilir.
- **Sıcak yapılandırma bellekte durur:** kanallar, bölgeler, vergi oranları, etkin promosyonlar, kargo yöntemleri. Kısa TTL (30 sn) + yazmada sürüm sayacı ile geçersiz kılma. Bunlar istek başına sorgulanmaz.
- **Oturum** önbellekten doğrulanır (KV / LRU); veritabanına yalnızca ıskada gidilir.
- **Sayfalama imleçlidir** (`WHERE (sort_key, id) > (?, ?)`); `OFFSET` yok.
- Toplam sayı yalnızca istenirse hesaplanır; filtre sayıları (facet) indeks tablosundan tek gruplamayla gelir ve segment başına önbelleklenir.

## 4. Yazma yolu: kısa ve tek seferde

- Her komut tek `atomic()`; içinde yalnızca o komutun satırları.
- E-posta, webhook, indeks, koleksiyon üyeliği, ERP, görsel işleme istek dışındadır.
- Toplu işler (içe aktarma, tam yeniden indeksleme, fiyat listesi yükleme) sabit boyutlu parçalara bölünür; her parça ayrı iş, imleç kalıcıdır.
- Stok kovası değişmediyse indeks ve önbellek temizliği tetiklenmez.

## 5. Genişletme maliyeti

| Yol | Maliyet | Nerede kullanılabilir |
|---|---|---|
| Strateji / operasyon / built-in app | Fonksiyon çağrısı | Her yerde, okuma yolu dahil (saf ve hızlı olmak şartıyla) |
| Uygulama webhook'u | İstek dışı | Her olayda |
| Uygulama senkron kancası | Ağ turu + zaman aşımı riski | **Yalnızca** sepet/checkout: kargo oranı, ödeme, vergi |

Herkese açık sayfa render yolunda dış çağrı yoktur. Senkron kanca sonuçları sepet özeti anahtarıyla kısa süre önbelleklenir.

## 6. Yazma sınırı (tek yazıcı)

D1'de ve SQLite'ta yazmalar tek sıradan geçer. Koşullu rezervasyon aşırı satışı önler ama yazma hacmini artırmaz.

- Büyük kampanyadan önce paralel checkout yük testi şarttır.
- Okuma modeli güncellemeleri işle ve toplu yazılır; checkout yazmalarıyla yarışmasın diye iş tüketicisi yazma hızını sınırlar.
- Yetmezse sıradaki adım: stok hedefi başına Durable Object ile sıraya koymak (Cloudflare). Self-host'ta SQLite zaten tek yazıcılıdır. Bu adım ihtiyaç kanıtlanmadan eklenmez.
- Çok kiracılı SaaS'ta mağaza başına ayrı D1; bir mağazanın kampanyası diğerini yavaşlatmaz.

## 7. Hedefe özgü ayarlar

**Self-host (SQLite):** WAL, `synchronous = NORMAL`, `busy_timeout`, `foreign_keys = ON`, hazırlanmış ifade önbelleği; yazmalar tek bağlantıdan, okumalar ayrı salt-okunur bağlantıdan. Uzun okuma transaction'ı tutulmaz (Litestream checkpoint'i için).

**Cloudflare:** okumalar için D1 okuma kopyaları (Sessions API) kullanılabilir; yazmadan hemen sonraki okuma tutarlılığı için oturum yer imi taşınır. *Bu özelliğin güncel durumu ve sınırları belgeden doğrulanmadı.* Smart Placement ile Worker veritabanına yakın çalıştırılır.

**Her ikisi:** görsel boyutları yüklemede üretilir; istek anında dönüştürme yok.

## 8. Ölçüm ve kapılar

| Kapı | Nasıl |
|---|---|
| Sorgu planı | Listelenen her vitrin sorgusu için `EXPLAIN QUERY PLAN` testi: tam tablo taraması görülürse test kırılır |
| İndeks varlığı | Migration ile gelen indeksler entegrasyon testinde doğrulanır |
| Tur sayısı | Entegrasyon testinde sorgu sayacı; bütçe aşılırsa test kırılır |
| Yük | k6: katalog listesi, ürün sayfası, sepet, paralel checkout; 10.000 ve 100.000 ürünlük tohum veriyle |
| Gerileme | `main` üzerinde her gece; p95 eşiği aşılırsa uyarı |

Başlangıç hedefleri (önbellek ıskasında, kaynak sunucuda): katalog API p95 < 50 ms, ürün sayfası verisi p95 < 30 ms, sepet hesabı p95 < 80 ms. Bunlar ilk ölçümden sonra gerçek değerlerle değiştirilir.

## 9. Bilinçli olarak yapmadıklarımız

- Redis yok. Self-host tek kopyadır; çok sunuculu kurulum gelirse önbellek ve sayaç adaptörü eklenir.
- İstek anında tam metin dışı "akıllı" arama yok; vektör arama `SearchProvider` adaptörü olarak sonradan.
- Okuma modeli için ayrı veritabanı yok; aynı veritabanında ayrı tablolar.
