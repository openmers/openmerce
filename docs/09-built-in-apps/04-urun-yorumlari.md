# Ürün yorumları (reviews): built-in app

**Biçim kararı:** built-in app (`@openmers/builtin-reviews`), varsayılan kapalı. Vitrin okuma modeline (puan toplamı), SEO'ya ve müşteri oturumuna bağlanır; her mağazaya gerekmez ([../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md)).

> **Kaynak.** Medusa `@lambdacurry/medusa-product-reviews` README'si okundu: puan ve yorum, durumlar `approved · pending · flagged`, yönetici yanıtı, istatistik uçları, `defaultReviewStatus` seçeneği, SDK. **Veri modeli, doğrulanmış satın alma, fotoğraf ve sıralama seçenekleri belgelenmemiş.** Aşağıdaki kapsam bizim tasarımımızdır.

## 1. Veri

| Tablo | İçerik |
|---|---|
| `bia_reviews_reviews` | `id`, `product_id`, `variant_id?`, `customer_id?`, `order_line_id?` (doğrulanmış satın alma), `rating` (1–5), `title?`, `body` (≤ 5000), `display_name`, `status` (`pending · approved · flagged · rejected`), `verified_purchase`, `locale`, `source` (`storefront · import · invite`), `helpful_count`, `created_at`, `edited_at?` |
| `bia_reviews_responses` | `review_id` (benzersiz), `body`, `author_id`, `created_at` |
| `bia_reviews_media` | `review_id`, `asset_id`, `position` (en çok 5 görsel) |
| `bia_reviews_stats` | `product_id`, `count`, `sum`, `histogram` (JSON 1..5), güncel toplam |
| `bia_reviews_requests` | Yorum isteği e-postası: `order_id`, `sent_at`, `state` |

## 2. Kurallar

- **Bir müşteri bir ürüne tek yorum;** düzenleme yeniden onaya girer (ayara bağlı).
- **Doğrulanmış satın alma:** yorum, müşterinin teslim edilmiş sipariş satırına bağlıysa `verified_purchase = true`. Mağaza yalnızca doğrulanmışlara izin verebilir (ayar).
- **Varsayılan durum:** `pending` (Medusa'nın varsayılanı `approved`). Güvenilir müşteri (önceden onaylanmış yorumu olan) otomatik `approved` ayarı vardır.
- **Moderasyon:** admin sırası `pending` ve `flagged`; onayla, reddet, yanıtla (tek yanıt, düzenlenebilir). Kötüye kullanım bildirimi (müşteri "şikâyet et") `flagged` yapar. Toplu onay.
- **Hız sınırı ve spam:** IP + oturum başına saatlik sınır, bal küpü alanı; kural dışı içerik (bağlantı sayısı) otomatik `flagged`. CAPTCHA kullanılmaz (bot koruması üçüncü taraf servisle ayrıdır).
- **İçerik:** düz metin (HTML temizlenir); dil sipariş/oturum dilinden. Argo filtresi yok, yönetici moderasyonu esastır.

## 3. Okuma ve performans

- **Puan toplamı** `bia_reviews_stats`'ta tutulur ve **okuma modeline** (`catalog_index`, `product_view`) `indexExtend` ile eklenir: ürün listesinde ve sayfasında yıldız/sayı için ek sorgu yoktur.
- Onay, ret ve silme olayı o ürünün istatistiğini **yeniden hesaplar** (artırma değil; idempotent) ve `reindex(product_id)` yazar.
- Yorum listesi sayfalıdır (imleç), `approved`, sıralama: en yeni, en yüksek puan, en yararlı. Ürün sayfasının ilk 5 yorumu `product_view` içine gömülmez; ayrı önbelleklenebilir API (segmentten bağımsız, kanal+dil anahtarlı kısa TTL).
- **SEO:** `aggregateRating` ve `Review` JSON-LD ürün şemasına eklenir ([../05-ticaret/14-seo.md](../05-ticaret/14-seo.md)); yalnızca yeterli sayıda onaylı yorum varsa. ⚠️ Arama motorlarının "kendi sitesindeki yorum" kurallarına uyum doğrulanmadı.

## 4. Yorum isteği

Teslim edildikten N gün sonra (ayar) müşteriye e-posta ([../05-ticaret/15-bildirimler.md](../05-ticaret/15-bildirimler.md)). Hizmet bildirimi sayılıp sayılmayacağı belirsiz olduğundan varsayılan **izne bağlı**; imzalı tek kullanımlık bağlantı yorum formunu açar (giriş gerekmez, `source = invite`). Aynı müşteriye siparişteki ürün başına tek istek.

## 5. Admin, API, ajan

Admin: ürün detayında "Yorumlar" paneli, ayrı "Yorum kuyruğu" sayfası. Shop API: liste, oluştur/düzenle, istatistik, yararlı oyu, şikâyet. Admin API: durum değiştirme, yanıt CRUD, toplu işlem. Ajan: `reviews.list` (`read`), `reviews.moderate` (`write`), `reviews.reply` (`external`, çünkü herkese açık metin yayımlar → onay kartı).

## 6. Gizlilik ve veri taşıma

`display_name` müşterinin seçtiği addır (varsayılan "Ad S."). Müşteri anonimleştirilince yorum kalır, `display_name` "Anonim" olur, `customer_id` kopar; müşteri isterse yorumları da silinir (veri silme akışında seçenek). Başka platformdan gelen yorumlar `source = import` ile taşınır ([../08-isletme/08-veri-tasima.md](../08-isletme/08-veri-tasima.md)); rıza ve doğrulama bilgisi yoktur.

## 7. Test

Tek yorum kuralı, doğrulanmış satın alma, durum geçişleri, istatistiğin yeniden hesaplanması (çift olay), toplam puan okuma modelinde, spam sınırı, yorum isteği tekrarının engellenmesi, anonimleştirmede kalma, kaldırılan eklentide tabloların durması.

## 8. Açık

Fotoğraflı yorum depolama sınırları, çeviri, satıcı yanıtının bildirimi, ürün Soru-Cevap bölümü (ayrı özellik, yapılmadı).
