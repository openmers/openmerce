# Vendure, Saleor, Medusa, minshop: neyi aldık, neyi almadık

> **Kaynakların güvenilirliği**
> - Vendure kısmı, `vendure-docs-linkler.md` içindeki resmî belgelerden sekiz sayfa okunarak doğrulandı (stok, worker/iş kuyruğu, kanallar, stratejiler, arama eklentisi, yatay ölçekleme, fiyat, siparişler). Fiyat sayfası kesik geldi; o kısım özetten.
> - Saleor ve Medusa kısmı önceki oturumlarda okunan resmî belgelere ve kullanıcının getirdiği analiz dosyalarına dayanır.
> - Reddit karşılaştırma dosyasındaki performans tablosu (Vendure 33 ms, Saleor 498 ms, Medusa 997 ms ürün API'si) **tek bir geliştiricinin kendi kurulumundaki testidir**; ben Reddit'i açamadım, rakamları doğrulamadım. Aşağıdaki "Vendure neden hızlı" açıklaması benim çıkarımımdır, ölçüm değildir.

## 1. Karar tablosu

| Konu | Vendure | Saleor | Medusa | OpenMers | Neden |
|---|---|---|---|---|---|
| Çekirdeği özelleştirme | Strateji + yapılandırılabilir operasyon | Uygulama (dış servis) | Workflow kancası, modül değiştirme | **Vendure modeli** | Süreç içi çağrı ağ çağrısından hızlıdır; kavram tektir |
| Eklenti | Derleme zamanı plugin (NestJS modülü) | Yok (yalnızca app) | Modül + plugin | **Derleme zamanı built-in app** | Workers'ta çalışma anında kod yüklenemez ama derlemeye dahil edilen kod çalışır |
| Deploy'suz kurulum | Yok | **Apps: manifest, izinli token, webhook, iframe** | Yok | **Saleor modeli** | Mağaza sahibi tıklayıp kurar; yabancı kod süreçte çalışmaz |
| Çoklu mağaza / pazar | **Channel** | Channel | Sales channel + region | **Vendure kanalı** + Saleor'un kanal başına depo eşlemesi | Tek kavram: para birimi, dil, vergi, fiyat, stok, B2B/B2C |
| Sepet | Sepet = `AddingItems` durumundaki sipariş | Checkout ayrı nesne | Cart ayrı nesne | **Ayrı `carts`** | `orders` küçük ve temiz kalır; terk edilmiş sepetler sipariş sorgularını yavaşlatmaz |
| Sipariş durumu | Tek durum makinesi, `OrderProcess` ile genişler | Ayrı sipariş/ödeme/teslimat durumları | Ayrı durumlar | **Üç eksen** (sipariş, ödeme, teslimat) + Vendure tarzı geçiş bekçileri | Kısmi iade ve kısmi gönderim tek eksende patlar |
| Stok | `stockOnHand` / `stockAllocated`, depo, hareket kaydı; tahsis ödemede, düşüm gönderimde | Depo + kanal eşlemesi, rezervasyon | Lokasyon + rezervasyon | **Vendure modeli**, ama rezervasyon checkout başında | Aşırı satışı ödeme öncesinde engeller; ERP mutlak miktarı `on_hand`'e yazar, rezervle yarışmaz |
| Fiyat | Kanal + para birimi başına fiyat; müşteriye özel fiyat strateji ile | Kanal başına fiyat | **Price list + kural** | **Medusa fiyat listesi** verisi + **Vendure stratejisi** | B2B için veri modeli şart; istisnalar strateji ile |
| Arama / listeleme | **Ayrı `SearchIndexItem` tablosu**, iş kuyruğuyla güncellenir | Veritabanı sorgusu / harici | Harici arama önerilir | **Vendure modeli**: `catalog_index` | Listeleme tek tablodan, join'siz |
| Arka plan işleri | **Ayrı worker süreci + iş kuyruğu** (DB veya Redis) | Celery | Workflow motoru + Redis | **Vendure modeli**, kuyruk = outbox tablosu | Ek servis yok; Workers'ta kuyruk tüketicisi zaten ayrı çağrıdır |
| Çok adımlı süreç | Servis + olay | Webhook | **Workflow + telafi** | **Adım zinciri** (her adım idempotent outbox satırı), motor yok | Telafi adımı da başarısız olabilir; durum makinesi + uzlaştırma daha sağlam |
| Promosyon | **Koşul + eylem** operasyonları | Kural + voucher | Kampanya kuralları | **Vendure modeli** | Yeni koşul = bir fonksiyon |
| Kargo / ödeme yöntemi | **Uygunluk denetleyicisi + hesaplayıcı / işleyici** | Senkron webhook | Provider modülü | **Vendure modeli**; uygulamalar için Saleor'un senkron kancası | İkisi aynı portu doldurur |
| Özel veri | **Custom fields** (tipli, şemaya girer) | **metadata / private_metadata** | metadata + link | **İkisi**: built-in app için tipli özel alan, uygulama için metadata | Tipli alan indekslenir; metadata şema değişikliği istemez |
| API | GraphQL (Shop + Admin ayrı) | GraphQL | REST | **oRPC** (Shop + Admin ayrı), OpenAPI çıktısı | Alan çözücü ve N+1 yok; her uç tek, elle yazılmış sorgu |
| Yetki | Rol + CRUD izinleri, kanal başına | İzin grupları | Basit | **Vendure modeli** | Kanal başına rol B2B/çok mağaza için gerekli |
| Özel alanlar için admin | React uzantıları | Dashboard uygulamaları (iframe) | Widget / UI route | Built-in app: Svelte bileşeni; uygulama: iframe | |
| Altyapı | Node + PostgreSQL (+Redis) | Python + PostgreSQL + Redis + Celery | Node + PostgreSQL + Redis | **Tek süreç + SQLite** veya **Worker + D1** | Ürünün temel farkı |

## 2. Vendure neden hızlı görünüyor (çıkarım)

1. **Listeleme ve arama ayrı, düz bir indeks tablosundan okunur.** Ürün, varyant, çeviri, fiyat ve koleksiyon tablolarına istek anında join atılmaz.
2. **İndeks güncellemesi, koleksiyon üyeliği ve e-posta istek dışında, worker'da yapılır.**
3. **Özelleştirme süreç içi fonksiyon çağrısıdır;** araya workflow motoru veya ağ çağrısı girmez.
4. **Kanal ve bölge verisi bellekte tutulur** (varsayılan 30 sn).

OpenMers dördünü de alır ve iki şey ekler: kenar önbelleği (segment anahtarlı) ve ürün sayfası için hazır sunum JSON'u. Ayrıntı: [03-performans.md](03-performans.md).

## 3. Vendure'dan bilerek ayrıldığımız yerler

| Vendure | OpenMers | Neden |
|---|---|---|
| GraphQL | oRPC | Alan çözücüler N+1 üretir, DataLoader gerektirir; kenar önbelleği GET + sabit yanıtla daha kolay |
| NestJS, TypeORM, dekoratörler | Hono, Drizzle, düz fonksiyonlar | Workers'ta paket boyutu ve soğuk başlangıç; `reflect-metadata` yok |
| PostgreSQL | SQLite / D1 | Ek servis yok; karşılığı: tek yazıcı ([03-performans.md](03-performans.md) bölüm 6) |
| Sepet = sipariş | Ayrı sepet | Yukarıda |
| Stok tahsisi ödemede | Rezervasyon checkout başında | Aşırı satış |
| Görsel istek anında dönüştürülür ve önbelleğe alınır | Boyutlar yüklemede üretilir | İstek yolunda CPU yok |
| Özel alan = yeni sütun (migration) | JSON sütunu + isteğe bağlı ifade indeksi | D1'de sık şema değişikliği pahalı; built-in app eklemek migration zorlamasın |
| Tek durum makinesine özel durum eklenebilir | Durumlar sabit, bekçi eklenir | Özel durumlar her raporu ve entegrasyonu kırar; ihtiyaç kanıtlanırsa açılır |

## 4. Medusa'dan dersler

| Medusa'da gözlenen | OpenMers kararı |
|---|---|
| PostgreSQL + Redis + server + worker; edge'de çalışmaz | Tek süreç + SQLite veya tek Worker + D1 |
| Modüller arası veri için Module Links + Query öğrenmek gerekiyor | Tek şema, join serbest; sınır kod düzeyinde (bir feature diğerinin tablosuna yazmaz) |
| Workflow motoru, adım başına retry ve compensation | `atomic()` + outbox adım zinciri |
| Dönüş sayfası ile webhook'un aynı sepeti aynı anda tamamlaması | Settlement token; kilit yok |
| Sağlayıcıda başarılı, backend'de zaman aşımı; belirsiz iadeler | Uzlaştırma işi |
| Evrensel dead-letter yok | Outbox `dead` durumu + admin'den yeniden deneme |
| Admin çekirdek formları değiştirilemiyor | Admin monorepoda sıradan Svelte; built-in app bileşen ekler, uygulama iframe ekler |
| Eklenti sürüm uyumsuzlukları | Resmî built-in app'ler çekirdekle aynı sürümde; her port için sözleşme testi |
| ERP tarifinde canlı fiyat/stok çağrısı | Senkron; istek yolunda dış çağrı yok ([../10-tak-calistir-apps/02-erp.md](../10-tak-calistir-apps/02-erp.md)) |

Aldığımız: fiyat listesi + kural veri modeli, satış kanalı için yayınlanabilir API anahtarı, uzun süreçleri adımlara bölme disiplini.

## 5. Saleor'dan aldıklarımız

Uygulama modeli (manifest, kurulumda token, izinler, imzalı webhook, senkron kanca, iframe + köprü), `metadata` / `private_metadata`, kanal başına depo eşlemesi, checkout'un siparişten ayrı nesne olması. Almadığımız: her özelleştirme için ayrı servis yazma zorunluluğu (bizde built-in app var), GraphQL.

## 6. Minshop'tan aldıklarımız

Feature klasörleri, atomik rezervasyon ve settlement token'ı, outbox, önekli dış kimlikler ve sızıntı kapısı, izin listeli önbellek + etiketli temizleme, stok kovaları, şifreli sır kasası, kapalı başlayan admin, iki katmanlı yapılandırma, tema sunum modelleri, tek sahipli medya, gerçek D1 üzerinde yarış testi.

| Konu | Minshop | OpenMers | Neden |
|---|---|---|---|
| Yapı | Tek Astro uygulaması | Ayrı API + üç istemci | Mobil ve admin aynı API'yi kullanıyor |
| Hedef | Yalnızca Cloudflare | Cloudflare + self-host | `Platform` arayüzü |
| Veri erişimi | Elle SQL | Drizzle + koşullu ifadeler için `sql` şablonu | Tip güvenliği |
| Stok | `stock_levels` tek sayı | Depo başına `on_hand` / `reserved` | Çoklu depo, ERP, B2B |
| Ödenmemiş sipariş | Hiç yok | Havale/kapıda için `pending_payments`; B2B vadeli sipariş | Türkiye ve B2B |

## 7. Şimdilik kapsam dışı

*Dijital ürün teslimatı kapsam içine alındı (çekirdek, asgari): [../05-ticaret/10-kargo-ve-teslimat.md](../05-ticaret/10-kargo-ve-teslimat.md) bölüm 7.*

Pazaryeri / çoklu satıcı (Vendure bunu satıcı başına kanal ve sipariş bölme ile yapıyor; kanal ve depo modelimiz buna engel değil), abonelik, hediye kartı, tema mağazası, GraphQL, çok sunuculu self-host.
