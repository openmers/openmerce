# Favori listesi (wishlist): built-in app

**Biçim kararı:** built-in app (`@openmers/builtin-wishlist`), varsayılan kapalı. Her mağazaya gerekmez; müşteri oturumuna ve vitrin okuma modeline bağlandığı için tak-çalıştır app olamaz ([../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md)). Etkinleştirme: [../04-genisletme/02-built-in-apps.md](../04-genisletme/02-built-in-apps.md) bölüm 4.

> **Kaynak.** Medusa RSC-Labs wishlist eklentisi okundu: müşteri başına tek liste, ilk eklemede oluşur, ürün+varyant+adet, JWT ile paylaşım, 5 uç, yönetici arayüzü yok. Eklentideki sorunlar: JWT sırrı için sabit varsayılan değer, paylaşım jetonunu iptal etme yolu yok, jeton ömrü belgelenmemiş. Burada bunlar düzeltilir.

## 1. Veri

| Tablo | İçerik |
|---|---|
| `bia_wishlist_lists` | `id`, `customer_id` (benzersiz, v1'de müşteri başına tek liste), `share_token_hash?`, `share_expires_at?`, `created_at` |
| `bia_wishlist_items` | `list_id`, `product_id`, `variant_id?`, `quantity` (1–99), `added_at`, `price_at_add?` (para birimiyle, düşüş bildirimi için) ; anahtar `(list_id, product_id, variant_id)` |

Çoklu liste (hediye listesi vb.) v1'de yok; `list_id` zaten anahtarda olduğu için sonra eklenir.

## 2. Davranış

- **Ekleme/çıkarma/adet:** `Shop API /x/builtin.wishlist/...`, oturum zorunlu. Liste ilk eklemede oluşur. Sınır: 200 öğe.
- **Misafir:** giriş yapmamış ziyaretçinin listesi tarayıcıda (`localStorage`) tutulur; giriş yapınca sunucudaki listeyle **birleşir** (aynı ürün+varyantta büyük adet kalır). Sunucuda misafir listesi yok.
- **Vitrin okuma:** liste okunurken ürün adı, görsel, fiyat, stok durumu okuma modelinden (`catalog_index`) gelir; her öğe için ayrı sorgu yok. Silinmiş veya yayından kalkmış ürün "artık satışta değil" olarak gösterilir.
- **Sepete ekle:** mevcut sepet ucunu çağırır; stoksuz varyant uyarı verir.
- **Paylaşım:** rastgele 32 bayt jeton üretilir, **yalnızca özeti** saklanır; bağlantı `…/wishlist/shared/<jeton>`. Varsayılan ömür 30 gün, yenilenir veya kullanıcı tarafından iptal edilir (iptal özeti siler). Paylaşılan görünüm yalnızca ürünleri gösterir; sahibin adı/e-postası yoktur, `noindex`, `no-store`.
- **Fiyat düşüşü / stok geri geldi bildirimi:** isteğe bağlı ayar (kapalı). `price_at_add` ile `catalog_index` fiyatı olay işi (`product.price_changed`, `stock.restocked`) karşılaştırır; izinli müşteriye bildirim ([../05-ticaret/15-bildirimler.md](../05-ticaret/15-bildirimler.md)), günde en çok 1 e-posta/müşteri. Pazarlama izni gerekir ([../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md) bölüm 9).
- **Analitik:** admin ürün sayfasında "kaç listede" sayacı (okuma modeline `indexExtend` ile eklenir, vitrin okumasını yavaşlatmaz). Pixel'e `AddToWishlist` olayı izne bağlı gönderilir ([../10-tak-calistir-apps/01-pixel.md](../10-tak-calistir-apps/01-pixel.md)).

## 3. Admin ve ajan

Müşteri ayrıntısında "Favoriler" paneli (salt okunur). Ayar sayfası: etkin/kapalı, paylaşım ömrü, bildirimler. Ajan: `wishlist.stats` (`read`); en çok favorilenen ürünler.

## 4. Gizlilik

Liste kişisel veridir: müşteri anonimleştirilince silinir; veri indirmeye girer. Paylaşılan bağlantıda kişisel veri yok.

## 5. Performans ve test

Vitrin sayfaları listeyi okumaz (istemci tarafı, `no-store` API). Liste tek anahtar sorgusu. Test: misafir birleşimi, sınır, paylaşım jetonu iptali ve süre dolumu, silinmiş ürün, kaldırılan plugin sonrası tabloların durması, bildirim sıklığı sınırı.

## 6. Kapsam dışı / açık

Çoklu liste, hediye listesi (satın alma işaretleme), toplu "hepsini sepete ekle". ⚠️ Fiyat düşüşü bildiriminin hukuki yönü (pazarlama izni kapsamı) doğrulanmadı.
