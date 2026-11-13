# Veritabanı kataloğu: ticaret (docs/05-ticaret)

> **Denetim (2026-11-13).** 92 `###` başlığı, 91 tablo (2026-11-13 ek: üç katalog bağlantı tablosu) (`currency_rates` dahil; `notification_types` kodda sabit liste olduğu için tablo değil). 343 karar işareti. Kalan açık 6, hepsi Denetim B'de ve dosya sonundaki listede. Denetim A'nın bölüm sonu açık soruları (sayaç tablosu, satır toplamı, indirim payları) işaretsiz metin olarak duruyor. Kapatılmamış çıkarım/öneri işareti yok. İki denetçi: **A** kanal–sipariş (bölüm 1–8: kanallar, katalog, okuma modeli, fiyat, stok, sepet/checkout, ödeme, sipariş), **B** promosyon–belge (bölüm 9–son: promosyon, vergi, kargo, iade, dijital, müşteri, medya, içerik, bildirim, günlük özet, belge). `public_id` öneklerinde çakışma yok.

**Kapsam.** `docs/05-ticaret/01..17` belgelerinin hepsi baştan sona okundu. Bu belgelerde geçen her tablo burada; tanımı başka belgede olan tablolar (şirket, kredi, `order_guest_access`, `external_refs`, `audit_log`, outbox, `invoices`, `customer_payment_methods`) yalnızca ilişki olarak anılır, sona "tanımı olmayan" listesine yazılır. Ek kaynak olarak yalnızca `docs/yol-haritasi/02-asama-2-ticaret.md` kullanıldı, o da yalnızca 05-ticaret belgelerinin sütun listesi vermediği yerlerde (`channels`, `media`, `payment_methods`) ve her seferinde "(yol haritası)" diye işaretlendi.

**Grup özeti.** Kanallar ve kanal bağlantıları; katalog yazma modeli (ürün, varyant, seçenek, özellik, koleksiyon, çeviri, medya kullanımı); vitrin okuma modeli (`catalog_index`, iki eşleşme tablosu, FTS5, `product_view`); fiyat listeleri; depo ve stok; sepet ve checkout rezervasyonu; ödeme, bekleyen ödeme, para iadesi; sipariş ve alt tabloları; promosyon; vergi bölgeleri ve oranları; kargo yöntemi, gönderim, dijital ürün, ürün iadesi; müşteri modülü; medya; içerik, menü, yönlendirme; bildirim; günlük özet tabloları; belge sürümleri.

**Tablo sayısı: 91** (`currency_rates` dahil; FTS5 sanal tabloları `catalog_fts` ve `customer_search` dahil. `notification_types` kodda sabit liste olduğu için sayıya girmez, notuna bakın).

## Ortak kurallar (her tabloda geçerli, tekrar yazılmadı)

Kaynak: `docs/03-cekirdek/03-veri-kurallari.md`, `.claude/skills/database/openmers-db-structure/SKILL.md`, `docs/ATLANANLAR.md` 2026-11-13 kararları.

- `id` INTEGER PK (iç kimlik, API'ye çıkmaz). Dışa açılan varlıkta `public_id` TEXT benzersiz: önek + 10 karakter Crockford base32. Kalıcı önekler yalnızca şunlar: `prod_ var_ col_ ord_ itm_ ref_ cus_ com_ quo_ chn_ pl_`. Listede olmayan önek "önek belgede yok" diye işaretlendi.
- Zaman: UTC epoch milisaniye INTEGER. `created_at` / `updated_at` tüm yazma tablolarında var (karar: 16 bölüm 5 imleçli dışa aktarma `updated_since` ister; damgaları uygulama katmanı yazar, tetikleyici yok).
- Para: INTEGER küçük birim + yanında `currency` TEXT (ISO 4217). Oran: baz puan INTEGER (%20 = 2000).
- JSON yalnızca birlikte okunup birlikte yazılan veri için (TEXT, Drizzle `text({ mode: 'json' })`). Filtrelenen alan sütun olur ya da ifade indeksi alır.
- Yumuşak silme (`deleted_at`) yalnızca katalog ve müşteri için. Sipariş, ödeme, stok hareketi silinmez.
- Eşzamanlı düzenlenen satırlar `version` INTEGER taşır; admin yazması `WHERE version = ?` ile yapılır.
- `atomic(stmts)` = `db.batch()`. İnteraktif transaction yok; doğruluk koşullu `UPDATE ... WHERE` / `INSERT ... SELECT ... WHERE` ile sağlanır.
- Metadata anahtar ayırıcısı `.`. Kredi sütununun adı `credit_limit`.
- Built-in app tabloları `bia_<id>_` önekli olur ve çekirdek şemaya girmez.
- Çekirdek müşteri ve şirket şemasında vergi kimliği olarak yalnızca `tax_id` + `tax_id_type` var. Vergi dairesi, TC kimlik ve e-fatura mükellefiyeti e-fatura modülünün alanıdır.
- SQLite/D1 (Drizzle `sqlite-core`), D1 başına 10 GB. Her liste/filtre sorgusunun indeksi aynı migration'da gelir. Migration'lar eklemelidir.
- Sahip klasörleri: `packages/core/src/features/` altında bugün `channels, catalog, catalogIndex, pricing, stock, tax, promotions, shipping, fulfillment, cart, checkout, payments, orders, customers, media, pages, notify` var (yol haritası). `seo` için ayrı klasör açılmaz, yönlendirme `features/pages`'te yaşar; `reports` ve `documents` yeni klasör olarak eklenir (karar: 16 ve 17 belgeleri bu iki grubu ayrı tutuyor, yol haritasında yoklar).

---

# 1. Kanallar

### `channels`
- **Sahip:** `packages/core/src/features/channels`, şema `packages/db/src/schema/channels.ts`.
- **Kaynak:** `05-ticaret/01-kanallar.md` bölüm 1, 4, 6; `06-odeme-ve-iade.md` bölüm 7 (`statement_name`); sütun adlarının bir kısmı yol haritası madde 1'den.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `chn_` |
| `code` | TEXT | hayır | kanal kodu, benzersiz (karar: 01 bölüm 1 kanal çözümünde kod kullanılır) |
| `type` | TEXT | hayır | `b2c` · `b2b` · `hybrid` |
| `default_currency` | TEXT(3) | hayır | varsayılan para birimi (karar: 01 bölüm 1 "varsayılan + izin verilenler") |
| `currencies` | TEXT (JSON dizi) | hayır | izin verilen para birimleri, `default_currency` dahil (karar: birlikte okunur, bellekte, filtrelenmez) |
| `default_lang` | TEXT | hayır | varsayılan dil; global varsayılan `en` |
| `langs` | TEXT (JSON dizi) | hayır | izin verilen diller, `default_lang` dahil (karar: `currencies` ile aynı gerekçe) |
| `prices_include_tax` | INTEGER (bool) | hayır | B2C'de genelde 1, B2B'de 0 |
| `default_tax_zone_id` | INTEGER FK `zones` | evet | adres yokken kullanılan vergi bölgesi (karar: ad 01 bölüm 1 alan adından) |
| `default_shipping_zone_id` | INTEGER FK `zones` | evet | adres yokken kullanılan kargo bölgesi (karar: aynı) |
| `default_price_list_id` | INTEGER FK `price_lists` | evet | kanalın `default_currency` için `base` listesi; boşken kanal satış yapamaz (karar: kanal listeden önce oluşur, döngüsel FK için boş olabilir) |
| `access` | TEXT | hayır | `public` · `login_required` · `approved_companies_only` |
| `guest_checkout` | INTEGER (bool) | hayır | misafir alışveriş, varsayılan 1 (karar: 01 bölüm 1 "misafir alışveriş" kanal ayarı) |
| `min_order_amounts` | TEXT (JSON) | evet | para birimi başına en az sipariş tutarı `{ "USD": 5000 }`, küçük birim (karar: çok para birimli kanalda tek tamsayı yetmez; 05 bölüm 1.1 ek ücret haritasıyla aynı desen) |
| `sync_prices` | INTEGER (bool) | hayır | varsayılan 0 |
| `statement_name` | TEXT | evet | kısa ASCII ekstre adı |
| `timezone` | TEXT | hayır | IANA saat dilimi adı, varsayılan `UTC` (karar: 16 bölüm 2 raporda gün kanalın saat dilimine göre kesilir) |
| `is_default` | INTEGER (bool) | hayır | silinemeyen varsayılan kanal (karar: 01 giriş paragrafı) |
| `settings` | TEXT (JSON) | hayır | kanal başına görünüm/iletişim ayarları: logo, mağaza adı, e-posta göndereni, yasal sayfa rolleri, SEO şablonları, robots, analitik/Pixel kimlikleri, kanonik tercihi, IBAN, seçili `legal_policy` (karar: birlikte okunur, bellekte, filtrelenmez; tema `channel_themes` tablosunda, `03`) |
| `settings_version` | INTEGER | hayır | ayar değişince artar; bellek kopyası ve `chn:<id>` etiketi temizlenir. Admin yazması `WHERE settings_version = ?` ile koşullu (karar: ayrı `version` sütunu gereksiz) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** PK `id`; benzersiz `public_id`, `code`; kısmi benzersiz `(is_default) WHERE is_default = 1` (karar: tek varsayılan kanal). Tablo küçük ve bellekte tutulur; istek yolunda sorgulanmaz.
- **Kurallar:** Varsayılan kanal silinemez. Ayar değişikliği `settings_version` artırır. Kanal ayarları (01 bölüm 6; 10 bölüm 3; 13 bölüm 1; 14 bölüm 3; 06 bölüm 9) `settings` JSON'undadır; şeması kodda tiplidir (`features/channels/settings.ts`).
- **İlişkiler:** `channel_domains`, `channel_stock_locations`, tüm `*_channels` bağlantı tabloları, `carts`, `orders`, `price_lists`, `pages`, `menus`, `redirects`, `notification_*`, `stats_daily_*`, `channel_themes` (`03`).
- **Yapılacaklar:**
  - şema dosyası `schema/channels.ts`
  - ilk migration + varsayılan kanal tohumu
  - `features/channels/queries/loadChannels.ts` (bellek yüklemesi)
  - test: varsayılan kanalın silinmemesi, `settings_version` artışı
- **Açık sorular:** —

### `channel_domains`
- **Sahip:** `features/channels`, şema `schema/channels.ts`.
- **Kaynak:** `01-kanallar.md` bölüm 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK (karar: alan adı metni değişebilir, iç anahtar tamsayı) |
| `domain` | TEXT | hayır | ana bilgisayar adı, küçük harf |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `default_lang` | TEXT | evet | alan adının varsayılan dili; boşsa kanalın `default_lang`'ı |
| `is_primary` | INTEGER (bool) | hayır | kanalın birincil alan adı (karar: 01 bölüm 6 "biri birincildir") |
| `secondary_mode` | TEXT | evet | yalnız ikincil alan adında: `redirect` (birincile 301) · `serve` (kendi `default_lang`'ıyla sunar, kanonik birincil). Birincilde boş (karar: 01 bölüm 6 "birincile yönlenir veya dil seçer"; `CHECK ((is_primary = 1) = (secondary_mode IS NULL))`) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `domain`; kısmi benzersiz `(channel_id) WHERE is_primary = 1` (karar: kanal başına tek birincil).
- **Kurallar:** Tablo bellekte. Bilinmeyen alan adı 404 döner, varsayılan kanala düşmez. Self-host Caddy izinli alan adı listesini API'den sorar.
- **İlişkiler:** `channels`.
- **Yapılacaklar:**
  - şema
  - migration
  - `queries/loadChannels.ts` içinde birlikte yüklenir
  - `resolveChannel.test.ts`
- **Açık sorular:** —

### `channel_stock_locations`
- **Sahip:** `features/stock`, şema `schema/stock.ts` (karar: `00-genel.md` migration tablosu 0009).
- **Kaynak:** `01-kanallar.md` bölüm 1; `04-stok.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER FK `channels` | hayır | |
| `location_id` | INTEGER FK `stock_locations` | hayır | |
| `priority` | INTEGER | hayır | `stockLocation` stratejisinin sırası (küçük önce) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: öncelik değişir, ortak kural) |

- **Anahtar ve indeksler:** PK `(channel_id, location_id)` (karar: bağlantı tablosu, `id` yok).
- **Kurallar:** Satılabilir stok, kanalın depoları üzerinden toplanır. Paket varyantında eşleme taban varyanta uygulanır. Tablo kanal tablosuyla birlikte bellekte tutulur (karar: 01 bölüm 4 kanal çözümü sorgu atmaz; depo seçimi her checkout'ta çalışır).
- **İlişkiler:** `channels`, `stock_locations`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/channels/queries/loadChannels.ts` içinde birlikte yüklenir
- **Açık sorular:** —

### `product_channels`
- **Sahip:** `features/channels` (atama) / `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` migration tablosu 0006).
- **Kaynak:** `01-kanallar.md` bölüm 2; `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `product_id` | INTEGER FK `products` | hayır | |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez, `updated_at` yok) |

- **Anahtar ve indeksler:** PK `(product_id, channel_id)`; ek indeks `(channel_id, product_id)` (karar: admin'de kanala göre ürün listesi).
- **Kurallar:** Alt kanalda oluşan ürün varsayılan kanala da otomatik atanır. Varsayılan kanaldan silmek ürünü tüm kanallardan çıkarır. Ekleme/çıkarma bir `reindex` işi doğurur. Vitrin bu tabloya gitmez.
- **İlişkiler:** `products`, `channels`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/channels/assign/assignProductToChannel.ts`, `removeFromDefaultChannel.ts`
  - `integration-tests/core/__tests__/channels/assign.test.ts`
- **Açık sorular:** —

### `variant_channels`
- **Sahip:** `features/channels`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `01-kanallar.md` bölüm 2; `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `variant_id` | INTEGER FK `product_variants` | hayır | |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez) |

- **Anahtar ve indeksler:** PK `(variant_id, channel_id)`; ek indeks `(channel_id, variant_id)` (karar: `no_price` listesi ve kanal süzgeci).
- **Kurallar:** Ürün kanala atanınca tüm varyantlar varsayılan olarak atanır; tek tek çıkarılabilir. Kanalın `base` listesinde fiyatı olmayan varyant `no_price` durumunda kalır ve satılamaz (0 TL olarak gösterilmez).
- **İlişkiler:** `product_variants`, `channels`, `prices`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/channels/queries/listNoPriceVariants.ts`
  - test: ürün atanınca bütün varyantların atanması
- **Açık sorular:** —

### `collection_channels`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1 ("`collection_channels` …"); veri kuralları bölüm 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `collection_id` | INTEGER FK `collections` | hayır | |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez) |

- **Anahtar ve indeksler:** PK `(collection_id, channel_id)`; ek indeks `(channel_id, collection_id)` (karar: veri kuralları bölüm 4 bağlantı tablosu deseni, `product_channels` ile aynı).
- **Kurallar:** Ekleme/çıkarma koleksiyonun varyantları için `reindex` yazar (karar: `catalog_index_collections` satırları kanal başınadır, 02 bölüm 3 "koleksiyon değişince indekslenir").
- **İlişkiler:** `collections`, `channels`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `customer_channels`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2; `01-kanallar.md` bölüm 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `customer_id` | INTEGER FK `customers` | hayır | |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `created_at` | INTEGER | hayır | kanala kayıt anı (karar: bağlantı satırı güncellenmez, `updated_at` yok) |

- **Anahtar ve indeksler:** PK `(customer_id, channel_id)`; `(channel_id, customer_id)` (karar: admin listesinde kanal süzgeci).
- **Kurallar:** Ortak müşteri hesabında müşteri iki kanala da kayıtlıdır ama her sitede ayrı giriş yapar.
- **İlişkiler:** `customers`, `channels`.
- **Yapılacaklar:**
  - şema
  - migration
  - müşteri listesi kanal süzgeci sorgusu
- **Açık sorular:** —

---

# 2. Katalog (yazma modeli)

### `products`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006; dosya 250 satırı aşarsa grup bölünür).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 6; `05-sepet-ve-checkout.md` bölüm 1.1; `10-kargo-ve-teslimat.md` bölüm 3 (`withdrawal_exempt`); `14-seo.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `prod_` |
| `personalization` | TEXT (JSON) | evet | kişiselleştirme tanımı; kapalı şema, en çok 10 alan |
| `withdrawal_exempt_kind` | TEXT | evet | cayma istisnası türü; boş = istisna yok. Değer seçili `legal_policy`'nin `withdrawal.exempt_kinds` listesinden (`personalized`, `perishable` …) (karar: 10 bölüm 3 "bayrak + gerekçe" tek sütunda; gerekçesiz bayrak olmaz, liste kodda değil ilkede) |
| `robots` | TEXT | evet | boşsa kanal şablonu (karar: 14 bölüm 3; dile bağlı değil. Çevrilebilir SEO alanları `product_translations`'ta) |
| `content_hash` | TEXT | evet | içe aktarılan kaydın kanonik içeriğinin SHA-256 hex'i (karar: 02 bölüm 6 "içerik özetiyle değişmeyeni atlama"; satırda yoksa her içe aktarmada ürün yeniden okunup hesaplanır) |
| `custom_fields` | TEXT (JSON) | evet | (karar: veri kuralları bölüm 6) |
| `metadata`, `private_metadata` | TEXT (JSON) | evet | anahtar ayırıcı `.` (karar: veri kuralları bölüm 6) |
| `version` | INTEGER | hayır | ürün eşzamanlı düzenlenir (veri kuralları 7) |
| `deleted_at` | INTEGER | evet | yumuşak silme |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(deleted_at, updated_at)` (karar: admin listesi ve `updated_since` senkronu).
- **Kurallar:** Ad, slug, açıklama ve çevrilebilir SEO alanları `product_translations` tablosunda. Ürünün en az bir varyantı olur. Her değişiklik `reindex(product_id)` yazar. Toplu içe aktarma `content_hash` aynıysa kaydı atlar. Silinen üründe ayara göre 301 ya da 410 döner.
- **İlişkiler:** `product_variants`, `product_options`, `product_translations`, `product_channels`, `product_assets`, `product_facet_values`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/catalog/queries/{getProduct,listProducts,upsertMany}.ts`
  - test: `version` çakışması, `products.upsertMany` idempotentliği
  - tohum: örnek ürün
- **Açık sorular:** —

### `product_variants`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1; `04-stok.md` bölüm 1, 8, 9; `05-sepet-ve-checkout.md` bölüm 1.1; `10-kargo-ve-teslimat.md` bölüm 1, 3, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `var_` |
| `product_id` | INTEGER FK `products` | hayır | |
| `sku` | TEXT | hayır | (karar: ERP, içe aktarma ve görsel eşlemesi SKU ile yürür, 02 bölüm 7, 04 bölüm 8) |
| `barcode` | TEXT | evet | |
| `weight` | INTEGER | evet | gram (karar: tamsayı küçük birim deseni) |
| `length`, `width`, `height` | INTEGER | evet | milimetre; desi bunlardan hesaplanır (karar: aynı) |
| `tax_category_id` | INTEGER FK `tax_categories` | hayır | (karar: 09 bölüm 2 vergi satırı her satırda kategori ister; tohumda varsayılan kategori) |
| `track_inventory` | INTEGER (bool) | hayır | dijital varyantta varsayılan 0 |
| `allow_backorder` | INTEGER (bool) | hayır | 04 bölüm 1 |
| `backorder_floor` | INTEGER | evet | `allow_backorder = 1` iken satılabilirin inebileceği en düşük değer (≤ 0); boşsa sınır yok (karar: 04 bölüm 1 "alt sınır ayarlı"; ürün başına farklı olabildiği için varyantta) |
| `min_order_qty` | INTEGER | evet | en az sipariş adedi (karar: ad 02 bölüm 1 "en az sipariş adedi") |
| `order_multiple` | INTEGER | evet | paket katı (karar: ad 02 bölüm 1 "paket katı") |
| `fulfillment_type` | TEXT | hayır | `physical` (varsayılan) · `digital` |
| `lead_time_days` | INTEGER | evet | tahmini hazırlık süresi |
| `personalization` | TEXT (JSON) | evet | `null` = üründen devral, `{enabled:false}` = kapalı |
| `base_variant_id` | INTEGER FK self | evet | paket varyantının taban varyantı |
| `unit_factor` | INTEGER | hayır | ≥ 1, varsayılan 1 |
| `withdrawal_exempt_kind` | TEXT | evet | boşsa ürünün değeri geçerli (karar: 10 bölüm 3 "ürün/varyant bayrağı", `products` ile aynı biçim) |
| `custom_fields`, `metadata`, `private_metadata` | TEXT (JSON) | evet | (karar: veri kuralları bölüm 6) |
| `version` | INTEGER | hayır | (karar: admin ve ERP aynı varyantı yazar; çarpan değişikliği koşullu) |
| `deleted_at` | INTEGER | evet | yumuşak silme |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; kısmi benzersiz `(sku) WHERE deleted_at IS NULL` (karar: silinen varyantın SKU'su yeniden kullanılabilir); `(product_id)`; `(base_variant_id)` (paket varyantlarını bulmak için).
- **Kurallar:**
  - Paket zinciri yoktur: taban varyant paket olamaz, taban ile paket aynı üründe olmalıdır. `CHECK (unit_factor >= 1)`.
  - Çarpan yalnızca açık rezervasyon veya sipariş yokken değişir. Paket varyantının `stock_levels` satırı olmaz.
  - Fiyat ve stok her zaman varyanttadır.
- **İlişkiler:** `products`, `option_values` (kombinasyon `variant_option_values` ile), `variant_facet_values`, `stock_levels`, `prices`, `variant_channels`, `digital_assets`, `product_assets`, `cart_lines`, `order_lines`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/catalog/queries/getVariantsForCart.ts`
  - test: paket kuralları (04 bölüm 8 test listesi), çarpan değişikliğinin açık rezervasyonda reddi (yarış testi)
- **Açık sorular:** — (Tablo adı `product_variants`; 04 ve 05'teki `variants.` kısaltmadır. Karar: 02 bölüm 1 tablo listesi yetkilidir.)

### `product_options`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1; veri kuralları bölüm 5.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `product_id` | INTEGER FK `products` | hayır | (karar: seçenek ürüne özeldir, Vendure `ProductOptionGroup` modeli; paylaşımlı küme v1 dışı) |
| `code` | TEXT | hayır | `size`, `color` (karar: içe aktarma ve ERP kodla eşler) |
| `position` | INTEGER | hayır | gösterim sırası (karar) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `(product_id, code)`; `(product_id, position)` (karar).
- **Kurallar:** Örnek seçenekler: beden, renk. Ad `product_option_translations(option_id, lang, name)` tablosunda (karar: veri kuralları bölüm 5 `<varlık>_translations`; tablo katalogda yok, "Açık sorular (A)").
- **İlişkiler:** `option_values`, `products`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `option_values`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `option_id` | INTEGER FK `product_options` | hayır | (karar) |
| `code` | TEXT | hayır | (karar: 02 bölüm 7 ERP görseli seçenek değeriyle eşler) |
| `position` | INTEGER | hayır | (karar) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `(option_id, code)`; `(option_id, position)` (karar).
- **Kurallar:** Görsel seçenek değerine bağlanabilir (`product_assets.option_value_id`). ERP senkronu görseli seçenek değeriyle eşler. Ad `option_value_translations(option_value_id, lang, name)` tablosunda (karar: veri kuralları bölüm 5; tablo katalogda yok).
- **İlişkiler:** `product_options`, `product_assets`, varyant kombinasyonu.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `facets`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `code` | TEXT | hayır | `brand`, `material` (karar: içe aktarma kodla eşler) |
| `private` | INTEGER (bool) | hayır | 1 ise yalnızca admin görür |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `code` (karar).
- **Kurallar:** Örnekler: marka, malzeme. `private = 1` özellikler `catalog_index_facets`, `catalog_fts` ve `product_view`'a yazılmaz (karar: 02 bölüm 1 "yalnızca admin içindir"). Ad `facet_translations(facet_id, lang, name)` tablosunda (karar: veri kuralları bölüm 5; tablo katalogda yok).
- **İlişkiler:** `facet_values`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `facet_values`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `facet_id` | INTEGER FK `facets` | hayır | |
| `code` | TEXT | hayır | (karar: içe aktarma kodla eşler) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `(facet_id, code)` (karar; `(facet_id)` aramasını da karşılar).
- **Kurallar:** Değer ürüne ya da varyanta bağlanır. Filtre `catalog_index_facets` üzerinden çalışır. Ad `facet_value_translations(facet_value_id, lang, name)` tablosunda (karar: veri kuralları bölüm 5; tablo katalogda yok).
- **İlişkiler:** `facets`, `catalog_index_facets`, `product_facet_values`, `variant_facet_values`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `collections`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 2 ("Koleksiyon ağacı"); `14-seo.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `col_` |
| `parent_id` | INTEGER FK self | evet | ağaç yapısı |
| `position` | INTEGER | hayır | kardeşler arası sıra (karar) |
| `filters` | TEXT (JSON) | evet | `CollectionFilter` operasyonları `[{code, args}]`; elle üyelik de bir operasyondur (`variantIds` / `productIds` argümanlı) (karar: veri kuralları bölüm 9 "operasyon argümanları" JSON; elle üyelik Vendure'daki gibi filtre, ayrı tablo yok) |
| `inherit_filters` | INTEGER (bool) | hayır | varsayılan 1 |
| `indexable_filters` | TEXT (JSON) | evet | temiz adresle indekslenecek filtreler, koleksiyon başına ayar (karar: 14 bölüm 1 koleksiyon ayarı, birlikte okunur) |
| `robots` | TEXT | evet | boşsa kanal şablonu (karar: 14 bölüm 3; çevrilebilir SEO alanları `collection_translations`'ta) |
| `version` | INTEGER | hayır | (karar: filtre düzenlemesi üyelik işi tetikler, çakışan yazma kaybolmamalı) |
| `deleted_at` | INTEGER | evet | yumuşak silme |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(parent_id, position)`.
- **Kurallar:** Üyelik elle ya da filtreyle olur; ikisi de `filters` içindedir. Üst koleksiyonun filtresi değişince bütün alt dalın üyeliği arka plan işinde yeniden hesaplanır. "Alt koleksiyonları dahil et" seçeneği en çok 3 derinliğe iner. Kategori ayrı bir kavram değildir; kategori de koleksiyondur.
- **İlişkiler:** `collection_variants`, `collection_channels`, `collection_translations`, `catalog_index_collections`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/catalog/queries/listCollectionTree.ts`
  - test: filtre mirası (kesişim) ve derinlik sınırı
- **Açık sorular:** —

### `collection_variants`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `collection_id` | INTEGER FK `collections` | hayır | |
| `variant_id` | INTEGER FK `product_variants` | hayır | |

- **Anahtar ve indeksler:** PK `(collection_id, variant_id)`; ek indeks `(variant_id)` (karar: ürün reindex'inde üyelik varyanttan okunur).
- **Kurallar:** Hesaplanmış üyeliktir; parçalı bir işle güncellenir. Zaman sütunu yok (karar: türetilmiş tablo, iş satırları yeniden yazar).
- **İlişkiler:** `collections`, `product_variants`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/catalog/jobs/recomputeCollection.ts`
- **Açık sorular:** —

### `product_translations`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006 `*_translations`).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1 (`*_translations`); veri kuralları bölüm 5; `14-seo.md` bölüm 1, 3; `01-kanallar.md` bölüm 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK (karar: `channel_id` boş olabildiği için bileşik PK kurulamaz) |
| `product_id` | INTEGER FK `products` | hayır | |
| `lang` | TEXT | hayır | |
| `channel_id` | INTEGER FK `channels` | evet | boş = tüm kanallar; dolu = o kanal için ad/slug geçersiz kılması (karar: 01 bölüm 6 "aynı ürün farklı ad ile") |
| `name` | TEXT | hayır | |
| `slug` | TEXT | hayır | |
| `description` | TEXT | evet | |
| `seo_title`, `seo_description` | TEXT | evet | boşsa ad ve açıklamadan türetilir (karar: 14 bölüm 3, dile bağlı) |
| `social` | TEXT (JSON) | evet | Open Graph ve Twitter kart alanları (başlık, açıklama, görsel `media_id`) (karar: 14 bölüm 3; birlikte okunup yazılır) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz ifade indeksi `(product_id, lang, ifnull(channel_id, 0))`; benzersiz `(lang, slug)` (karar: 14 bölüm 1 slug'ı `(kanal, dil)` içinde benzersiz ister; kanal başına benzersizlik bağlantı tablosu üzerinden indekslenemez, dil başına global benzersizlik bunu güvenceye alır ve indekslenir).
- **Kurallar:** Slug değişince aynı `atomic()` içinde `redirects` satırı yazılır. İndeksleme önce kanal satırını, yoksa kanalsız satırı, yoksa kanalın varsayılan dilini kullanır.
- **İlişkiler:** `products`, `channels`, `redirects`.
- **Yapılacaklar:**
  - şema
  - migration
  - test: slug değişiminde 301; kanal geçersiz kılmasının indekste önce gelmesi
- **Açık sorular:** —

### `collection_translations`
- **Sahip:** `features/catalog`, şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1 (`*_translations`); `14-seo.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `collection_id` | INTEGER FK `collections` | hayır | |
| `lang` | TEXT | hayır | |
| `name`, `slug` | TEXT | hayır | |
| `description` | TEXT | evet | |
| `seo_title`, `seo_description` | TEXT | evet | (karar: 14 bölüm 3 koleksiyon için de) |
| `social` | TEXT (JSON) | evet | (karar: `product_translations` ile aynı) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** PK `(collection_id, lang)`; benzersiz `(lang, slug)` (karar: `product_translations` ile aynı gerekçe).
- **Kurallar:** Slug değişince `redirects` satırı aynı `atomic()` içinde. Kanal başına koleksiyon adı belgede istenmediği için `channel_id` yok (karar).
- **İlişkiler:** `collections`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** — (Seçenek, seçenek değeri, özellik ve özellik değeri çeviri tabloları katalogda yok; "Açık sorular (A)".)

### `product_assets`
- **Sahip:** `features/catalog` (kullanım kaydı; dosyanın sahibi `media`), şema `schema/catalog.ts` (karar: `00-genel.md` 0006).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1, 7; `12-medya.md`.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK (karar: iki düzey sütunu boş olabildiği için bileşik PK yok) |
| `product_id` | INTEGER FK `products` | hayır | |
| `variant_id` | INTEGER FK `product_variants` | evet | varyant düzeyi |
| `option_value_id` | INTEGER FK `option_values` | evet | seçenek değeri düzeyi |
| `asset_id` | INTEGER FK `media` | hayır | |
| `position` | INTEGER | hayır | |
| `created_at` | INTEGER | hayır | (karar: atama güncellenmez, sil + ekle) |

- **Anahtar ve indeksler:** `(product_id, position)`; `(asset_id)` (medya silmede `NOT EXISTS` kontrolü için zorunlu).
- **Kurallar:** Görsel varyant → seçenek değeri → ürün sırasıyla indeksleme anında çözülür. Atamayı kaldırmak dosyayı silmez. `CHECK (variant_id IS NULL OR option_value_id IS NULL)` (karar: 02 bölüm 7 üç ayrı düzey).
- **İlişkiler:** `products`, `product_variants`, `option_values`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
  - yarış testi: medya silme ile atama
- **Açık sorular:** —

### `variant_option_values`
- **Sahip:** `features/catalog`, şema `schema/catalog-options.ts` (karar: `00-genel.md` 0006; "Açık sorular (A)" kapandı 2026-11-13).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `variant_id` | INTEGER FK `product_variants` | hayır | |
| `option_id` | INTEGER FK `product_options` | hayır | değerin seçeneği; `(option_value_id, option_id)` bileşik FK ile `option_values(id, option_id)`'ye bağlı (karar: kuralı DB zorlar) |
| `option_value_id` | INTEGER FK `option_values` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez, sil + ekle; `public_id` yok) |

- **Anahtar ve indeksler:** PK `(variant_id, option_value_id)`; benzersiz `(variant_id, option_id)`; ters arama `(option_value_id, variant_id)`. `option_values` üzerinde bileşik FK hedefi için benzersiz `(id, option_id)`. WITHOUT ROWID değil (drizzle-kit üretmiyor).
- **Kurallar:** Varyantın seçenek değeri kombinasyonu. Bir varyant aynı seçenekten en çok bir değer taşır.
- **İlişkiler:** `product_variants`, `option_values`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `product_facet_values`
- **Sahip:** `features/catalog`, şema `schema/catalog-facets.ts` (karar: `00-genel.md` 0006; "Açık sorular (A)" kapandı 2026-11-13).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `product_id` | INTEGER FK `products` | hayır | |
| `facet_value_id` | INTEGER FK `facet_values` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez, sil + ekle; `public_id` yok) |

- **Anahtar ve indeksler:** PK `(product_id, facet_value_id)`; ters arama `(facet_value_id, product_id)`.
- **Kurallar:** Ürün düzeyi özellik değeri; değişiklik `reindex` yazar.
- **İlişkiler:** `products`, `facet_values`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `variant_facet_values`
- **Sahip:** `features/catalog`, şema `schema/catalog-facets.ts` (karar: `00-genel.md` 0006; "Açık sorular (A)" kapandı 2026-11-13).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `variant_id` | INTEGER FK `product_variants` | hayır | |
| `facet_value_id` | INTEGER FK `facet_values` | hayır | |
| `created_at` | INTEGER | hayır | (karar: bağlantı satırı güncellenmez, sil + ekle; `public_id` yok) |

- **Anahtar ve indeksler:** PK `(variant_id, facet_value_id)`; ters arama `(facet_value_id, variant_id)`.
- **Kurallar:** Varyant düzeyi özellik değeri; değişiklik `reindex` yazar.
- **İlişkiler:** `product_variants`, `facet_values`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

---

# 3. Okuma modeli (vitrin)

### `catalog_index`
- **Sahip:** `features/catalogIndex`, şema `schema/read-model.ts` (karar: `00-genel.md` 0018).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 2, 3, 4, 7; `04-stok.md` bölüm 5, 9; `14-seo.md` bölüm 5.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER | hayır | |
| `lang` | TEXT | hayır | |
| `variant_id` | INTEGER | hayır | |
| `product_id` | INTEGER | hayır | |
| `product_public_id` | TEXT | hayır | |
| `slug`, `name`, `sku` | TEXT | hayır | |
| `thumb` | TEXT (JSON) | evet | hazır görsel URL kümesi (varyantın kendi küçük görseli) |
| `collection_ids` | TEXT (JSON) | evet | gösterim; filtre eşleşme tablosundan yapılır |
| `facet_value_ids` | TEXT (JSON) | evet | aynı |
| `price_min`, `price_max` | INTEGER | evet | kanalın varsayılan listesine göre. `group_first = 1` satırında ürünün tüm kanal varyantlarının aralığı, diğer satırlarda varyantın kendi kademe aralığı (karar: ürün kartı tek satır okur, aralığı ayrıca hesaplamaz) |
| `currency` | TEXT(3) | hayır | |
| `stock_bucket` | TEXT | hayır | `out` · `low` · `in` |
| `lead_time_days` | INTEGER | evet | 04 bölüm 9 |
| `sort_name` | TEXT | hayır | |
| `created_at` | INTEGER | hayır | ürünün oluşturulma anı, "yeni" sıralaması (karar: satır yazım anı değil) |
| `sales_rank` | INTEGER | evet | |
| `group_first` | INTEGER (bool) | hayır | ürün başına tek kart |

- **Anahtar ve indeksler:**
  - PK `(channel_id, lang, variant_id)`; tablo `rowid`'li kalır (karar: `catalog_fts` `rowid` ile bağlanır, `WITHOUT ROWID` olmaz).
  - Sıralama ve imleç için `(channel_id, lang, group_first, sort_name, variant_id)`, `(channel_id, lang, group_first, created_at, variant_id)`, `(channel_id, lang, group_first, price_min, variant_id)`, `(channel_id, lang, group_first, sales_rank, variant_id)` (karar: 02 bölüm 2'deki dört sıralama anahtarı; `variant_id` imleç eşitlik bozucusu).
  - `(product_id)` (karar: reindex silmesi).
  - Site haritası PK sırasıyla imleçli okur.
- **Kurallar:** Yalnızca reindex işi yazar: ürünün bütün `(kanal, dil)` satırları tek `atomic()` içinde yeniden yazılır. Stok adedi değişip kova aynı kaldıysa yazılmaz. Nihai tutarlıdır; sepet ve checkout bu tabloyu okumaz. `updated_at` yok (karar: türetilmiş, her yazım tam yeniden yazımdır).
- **İlişkiler:** `catalog_index_facets`, `catalog_index_collections`, `catalog_fts`. FK yok (karar: türetilmiş tablo; kaynak silinince reindex temizler, FK yazma sırasını kilitler).
- **Yapılacaklar:**
  - şema
  - migration
  - `features/catalogIndex/queries/{listByCollection,listFiltered,facetCounts,search}.ts`
  - `features/catalogIndex/jobs/reindexProduct.ts`, tam ve imleçli yeniden indeksleme
  - test: `EXPLAIN QUERY PLAN` testi (zorunlu, tam tarama yok)
  - test: kova değişmeyince yazılmama
- **Açık sorular:** —

### `catalog_index_facets`
- **Sahip:** `features/catalogIndex`, şema `schema/read-model.ts` (karar: `00-genel.md` 0018).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 2, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER | hayır | |
| `facet_value_id` | INTEGER | hayır | |
| `variant_id` | INTEGER | hayır | |

- **Anahtar ve indeksler:** kaplayan PK `(channel_id, facet_value_id, variant_id)`, `WITHOUT ROWID` (karar: dar tablo, tüm erişim PK aralığı).
- **Kurallar:** Filtreli liste en seçici filtreden başlar, diğer filtreleri `EXISTS` ile ekler. Filtre sayıları `GROUP BY facet_value_id` ile hesaplanır ve segment başına önbelleklenir. Satır dilden bağımsızdır; sonuç `catalog_index` PK'sine `(channel_id, :lang, variant_id)` ile bağlanır (karar: özellik üyeliği dile göre değişmez, satır sayısı dil sayısıyla çarpılmaz).
- **İlişkiler:** `catalog_index`.
- **Yapılacaklar:**
  - şema
  - migration
  - sorgu planı testi
- **Açık sorular:** —

### `catalog_index_collections`
- **Sahip:** `features/catalogIndex`, şema `schema/read-model.ts` (karar: `00-genel.md` 0018).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 2, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER | hayır | |
| `collection_id` | INTEGER | hayır | |
| `variant_id` | INTEGER | hayır | |

- **Anahtar ve indeksler:** kaplayan PK `(channel_id, collection_id, variant_id)`, `WITHOUT ROWID` (karar: `catalog_index_facets` ile aynı).
- **Kurallar:** Yalnızca koleksiyonun kendi etkin filtresine (miras dahil) uyan varyantlar yazılır; çalışma anında ağaç gezilmez. "Alt koleksiyonları dahil et" seçeneği `IN` ile en çok 3 derinlik kullanır. Varsayılan sıra bu tabloda `variant_id` imleciyle aralık taramasıdır; ad, fiyat, yeni, çok satan sıralaması `catalog_index` sıralama indeksinden okur ve koleksiyonu `EXISTS (catalog_index_collections ...)` ile süzer (karar: 02 bölüm 4 filtreli liste deseniyle aynı, ek indeks gerekmez).
- **İlişkiler:** `catalog_index`, `collections`.
- **Yapılacaklar:**
  - şema
  - migration
  - sorgu planı testi (aralık taraması + PK erişimi; sıralı sayfada `EXISTS`)
- **Açık sorular:** —

### `catalog_fts`
- **Sahip:** `features/catalogIndex`, şema `schema/read-model.ts` (FTS5 sanal tablo; Drizzle'da ham SQL migration) (karar: `00-genel.md` 0018).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 2, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `rowid` | INTEGER | hayır | `catalog_index.rowid` (karar: bileşik PK'li satıra tek tamsayıyla bağlanır) |
| `name`, `sku`, `facet_text`, `description_excerpt` | TEXT | evet | katlanmış metin: ad, SKU, özellik değerleri, açıklama özeti (karar: 02 bölüm 2 dört alan) |

- **Anahtar ve indeksler:** FTS5 kendi indeksini taşır. Tek tablo; kanal ve dil `catalog_index` birleşiminden süzülür (karar: "dil başına" satır `catalog_index` satırının dilidir; katlama uygulama yardımcısında olduğu için tokenizer dilden bağımsız, dil başına tablo migration sayısını dil sayısına bağlardı).
- **Kurallar:** Türkçe katlama (ı/i, ş/s) indeksleme ve sorgu anında aynı yardımcıyla yapılır. Akış: `MATCH` → `catalog_index` (`rowid` ile, `channel_id` ve `lang` süzgeci). Reindex aynı `atomic()` içinde önce eski `catalog_index` satırlarının `rowid`'leriyle FTS satırlarını, sonra indeks satırlarını siler, yenilerini yazar.
- **İlişkiler:** `catalog_index`.
- **Yapılacaklar:**
  - migration (ham SQL)
  - `queries/search.ts`
  - test: katlama; reindex sonrası artık FTS satırı kalmaması
- **Açık sorular:** —

### `product_view`
- **Sahip:** `features/catalogIndex`, şema `schema/read-model.ts` (karar: `00-genel.md` 0018).
- **Kaynak:** `02-katalog-ve-arama.md` bölüm 2, 7; `04-stok.md` bölüm 9; `05-sepet-ve-checkout.md` bölüm 1.1 (performans); `14-seo.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER | hayır | |
| `lang` | TEXT | hayır | |
| `slug` | TEXT | hayır | |
| `product_id` | INTEGER | hayır | (karar: reindex silmesi) |
| `data` | TEXT (JSON) | hayır | varyantlar, seçenekler, varyant başına görsel listesi ve `srcset`, özellikler, açık özel alanlar, ekmek kırıntısı, benzer ürünler, varsayılan fiyat, kişiselleştirme tanımı, `lead_time_days`, `hreflang` eşleşmeleri, SEO meta |

- **Anahtar ve indeksler:** PK `(channel_id, lang, slug)`; `(product_id)` (karar: reindex silmesi).
- **Kurallar:** Ürün sayfası tek satır okur. Farklı segmentin fiyatı aynı turda `prices` üzerinden tek `IN` sorgusuyla alınıp JSON'daki fiyatın üzerine yazılır. `data` 512 KB'ı aşarsa reindex satırı yazmaz, ürünü hata olarak raporlar (karar: D1 satır sınırının altında güvenli pay; ölçümle güncellenir).
- **İlişkiler:** `catalog_index` (aynı iş yazar), `prices`.
- **Yapılacaklar:**
  - şema
  - migration
  - `queries/getProductView.ts`
  - sorgu planı testi
- **Açık sorular:** —

---

# 4. Fiyat

### `price_lists`
- **Sahip:** `features/pricing`, şema `schema/pricing.ts`.
- **Kaynak:** `03-fiyat.md` bölüm 1, 2, 3; `01-kanallar.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `pl_` |
| `name` | TEXT | hayır | |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `currency` | TEXT(3) | hayır | oluşturulduktan sonra değişmez (karar: `prices.currency` bununla aynı kalmalı) |
| `type` | TEXT | hayır | `base` · `sale` · `contract` |
| `priority` | INTEGER | hayır | |
| `starts_at`, `ends_at` | INTEGER | evet | |
| `includes_tax` | INTEGER (bool) | hayır | |
| `status` | TEXT | hayır | `active` · `expired` (karar: belgede yalnız süre dolumu geçişi var; elle kapatma `ends_at` ile yapılır, taslak durumu istenmiyor) |
| `fx_source_price_list_id` | INTEGER FK self | evet | doluysa liste kur dönüşümü görevinin hedefidir, fiyatları bu listeden `currency_rates` ile yazılır; boşsa fiyatlar elle/ERP ile girilir (karar: 03 bölüm 4 kaynak → hedef eşleşmesi hedef listede) |
| `fx_rounding` | TEXT (JSON) | evet | kur dönüşümünün yuvarlama kuralı (ör. `{ "mode": "ceil", "step": 100, "ending": 99 }`) (karar: 03 bölüm 4 "kur + yuvarlama kuralı"; birlikte okunur) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(channel_id, type)` (karar: oturum çözümü ve admin listesi); kısmi benzersiz `(channel_id, currency) WHERE type = 'base'` (karar: 03 bölüm 4 para birimi başına ayrı liste, kanal başına bir `base`); `(fx_source_price_list_id)` (karar: kur görevi hedefleri bulur).
- **Kurallar:** Her kanalın para birimi başına bir `base` listesi vardır; `channels.default_price_list_id` varsayılan para biriminin listesidir. Geçerlilik tarihi sorguda değil seçimde değerlendirilir. Süresi dolan listeyi zamanlanmış görev `expired` yapar ve `pl:<id>` etiketini temizler. Kur dönüşümü görevi kaynak listeden hedef listeye yazar; kur yoksa yazmaz ve raporlar.
- **İlişkiler:** `prices`, `price_list_targets`, `channels`, `currency_rates`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/pricing/queries/resolveListsForSession.ts`
  - zamanlanmış görevler `expireLists`, `convertFxLists`
- **Açık sorular:** —

### `price_list_targets`
- **Sahip:** `features/pricing`, şema `schema/pricing.ts`.
- **Kaynak:** `03-fiyat.md` bölüm 1, 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK (karar: hedef sütunları boş olabildiği için bileşik PK kurulamaz) |
| `price_list_id` | INTEGER FK `price_lists` | hayır | |
| `customer_group_id` | INTEGER FK `customer_groups` | evet | |
| `company_id` | INTEGER FK `companies` (`03`) | evet | |
| `created_at` | INTEGER | hayır | (karar: hedef satırı güncellenmez, sil + ekle) |

- **Anahtar ve indeksler:** `CHECK (customer_group_id IS NULL OR company_id IS NULL)`; ikisi de boşsa hedef "herkes" (karar: polimorfik `target_type/target_id` yerine iki FK, çünkü bütünlük ve indeks FK ile sağlanır). Benzersiz ifade indeksi `(price_list_id, ifnull(customer_group_id, 0), ifnull(company_id, 0))`; girişte çözüm için `(customer_group_id)`, `(company_id)` (karar).
- **Kurallar:** Liste girişte bir kez çözülür ve `ctx.priceListIds` olarak oturuma yazılır. Anonim ziyaretçi yalnızca `base` listesini ve herkese açık (hedefi "herkes" olan) `sale` listelerini görür.
- **İlişkiler:** `price_lists`, `customer_groups`, `companies` (`03`).
- **Yapılacaklar:**
  - şema
  - migration
  - sorgu `resolveListsForSession`
- **Açık sorular:** —

### `prices`
- **Sahip:** `features/pricing`, şema `schema/pricing.ts`.
- **Kaynak:** `03-fiyat.md` bölüm 1, 2, 7; `02-katalog-ve-arama.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `price_list_id` | INTEGER FK `price_lists` | hayır | |
| `variant_id` | INTEGER FK `product_variants` | hayır | |
| `min_qty` | INTEGER | hayır | miktar kademesi (1, 10, 50 …) |
| `amount` | INTEGER | hayır | küçük birim |
| `compare_at_amount` | INTEGER | evet | üstü çizili fiyat |
| `currency` | TEXT(3) | hayır | listenin para birimiyle aynı (karar: veri kuralları bölüm 2 "her tutarın yanında para birimi"; `product_view` üzerine yazma join'siz okur; liste para birimi değişmediği için kayma olmaz) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural; ERP senkronu `updated_at` ile izlenir) |

- **Anahtar ve indeksler:** PK `(price_list_id, variant_id, min_qty)`. Ürün sayfası ve sepet `variant_id IN (...) AND price_list_id IN (...)` sorgusunu atar; PK ile karşılanır, sorgu planı testi gerekir.
- **Kurallar:** `prices.setMany` parçalı ve idempotenttir; `currency`'yi listeden yazar. Varsayılan listede yazma reindex ve etiket temizliği tetikler. `sync_prices` açıksa aynı para birimli kanalların varsayılan listelerine de yazılır.
- **İlişkiler:** `price_lists`, `product_variants`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/pricing/queries/{pricesForVariants,setMany}.ts`
  - sorgu planı testi
  - `syncPrices.test.ts`
- **Açık sorular:** —

### `currency_rates`
- **Sahip:** `features/pricing`, şema `schema/pricing.ts` (`00-genel.md` karar 10: çekirdek tablo; abonelik modülü yalnız okur).
- **Kaynak:** `00-genel.md` karar 10; `03-fiyat.md` bölüm 4 (kur dönüşümü görevi, sipariş anındaki kur); `09-built-in-apps/02-abonelik.md` tablo listesi ve "Çok para birimi" maddesi (`RateProvider`, günlük kur).

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | `YYYY-MM-DD`, UTC takvim günü (karar: 02-abonelik "gün × para birimi çifti"; gün anahtarı saat değil) |
| `base` | TEXT(3) | hayır | kaynak para birimi |
| `quote` | TEXT(3) | hayır | hedef para birimi |
| `rate_e9` | INTEGER | hayır | 1 `base` = `rate_e9 / 10^9` `quote` (karar: kesin tamsayı aritmetiği, ondalık `real` yuvarlama farkı üretir; kur değeri 10^9 ölçekte JS güvenli tamsayıya sığar; tutar × kur çarpımı `BigInt` ile yapılır) |
| `source` | TEXT | hayır | `manual` ya da `RateProvider` kodu (karar: 02-abonelik "elle girilen / harici kaynak") |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: elle düzeltme olur, ortak kural) |

- **Anahtar ve indeksler:** PK `(day, base, quote)`; `(base, quote, day)` (karar: kur görevi ve rapor "çiftin en son kuru"nu arar).
- **Kurallar:** Kur istek anında kullanılmaz (veri kuralları bölüm 2). Okuyucular: kur dönüşümü görevi (`price_lists.fx_source_price_list_id`), sipariş settlement'ı (`orders.fx_rate` anlık görüntüsü), günlük rapor ve abonelik modülü. Kur yoksa tahmin edilmez: görev yazmaz, rapor "kur yok" der. Yalnız `RateProvider` görevi ve admin yazar.
- **İlişkiler:** `price_lists`, `orders` (anlık görüntü, FK yok), `bia_subscriptions_*` (okur).
- **Yapılacaklar:**
  - şema
  - migration
  - `features/pricing/queries/{latestRate,upsertRates}.ts`
  - `RateProvider` stratejisi + zamanlanmış görev
  - test: kur yokken dönüşümün yazmaması
- **Açık sorular:** —

---

# 5. Stok

### `stock_locations`
- **Sahip:** `features/stock`, şema `schema/stock.ts`.
- **Kaynak:** `04-stok.md` bölüm 1; `10-kargo-ve-teslimat.md` bölüm 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `loc_` (karar: mağazadan teslim seçimi vitrine depo kimliği döndürür; önek veri kuralları listesine eklenmeli) |
| `name` | TEXT | hayır | |
| `address_line1`, `address_line2` | TEXT | evet | (karar: `00-genel.md` genel adres sütunları; JSON değil) |
| `city`, `region`, `district`, `postal_code` | TEXT | evet | (karar: aynı) |
| `country_code` | TEXT(2) | evet | ISO 3166-1 alpha-2 (karar: aynı) |
| `active` | INTEGER (bool) | hayır | |
| `pickup_enabled` | INTEGER (bool) | hayır | mağazadan teslim |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`.
- **Kurallar:** Ülkeye özgü adres alanları (mahalle vb.) çekirdekte yok, modülün `custom_fields`'ındadır (`00-genel.md` ortak kurallar).
- **İlişkiler:** `channel_stock_locations`, `stock_levels`, `fulfillments`, `order_lines` (depo).
- **Yapılacaklar:**
  - şema
  - migration
  - tohum: varsayılan depo
- **Açık sorular:** —

### `stock_levels`
- **Sahip:** `features/stock`, şema `schema/stock.ts`.
- **Kaynak:** `04-stok.md` bölüm 1, 2, 4, 6, 8; `05-sepet-ve-checkout.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `variant_id` | INTEGER FK `product_variants` | hayır | yalnızca taban varyant |
| `location_id` | INTEGER FK `stock_locations` | hayır | |
| `on_hand` | INTEGER | hayır | ERP yalnızca bu sütunu yazar |
| `reserved` | INTEGER | hayır | |
| `safety` | INTEGER | hayır | |
| `version` | INTEGER | hayır | |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural; tutarlılık denetimi son yazımı gösterir) |

- **Anahtar ve indeksler:** PK `(variant_id, location_id)`.
- **Kurallar:**
  - Ayırma koşullu yapılır: `UPDATE ... SET reserved = reserved + :n WHERE ... AND on_hand - reserved - safety >= :n AND EXISTS (rezervasyon 'active')`.
  - Gönderimde `on_hand −` ve `reserved −`. İptal ve bırakmada `reserved −`. İade satılabilir durumdaysa `on_hand +`.
  - `allow_backorder` açık varyantta koşul `on_hand - reserved - safety - :n >= product_variants.backorder_floor` olur; `backorder_floor` boşsa koşul yok (karar: alt sınır varyantta, bkz. `product_variants`).
  - `stock.setMany` `version` korumalı yazar. Paket varyantına stok sayımı yazılamaz.
  - Tutarlılık denetimi farkı düzeltmez, yalnızca raporlar.
- **İlişkiler:** `product_variants`, `stock_locations`, `stock_movements`, `checkout_reservations`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/stock/queries/{reserve,release,decrementOnFulfill,setMany,availableForChannel}.ts`
  - yarış testleri: son ürüne iki alıcı; rezervasyon sırasında ERP `on_hand` yazması; paket son kolisi
  - zamanlanmış tutarlılık görevi
- **Açık sorular:** —

### `stock_movements`
- **Sahip:** `features/stock`, şema `schema/stock.ts`.
- **Kaynak:** `04-stok.md` bölüm 1, 4, 8; `05-sepet-ve-checkout.md` bölüm 3; `10-kargo-ve-teslimat.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `variant_id` | INTEGER FK `product_variants` | hayır | stok satırının varyantı (taban varyant) (karar: tutarlılık denetimi `stock_levels` PK'siyle aynı anahtarla toplar; paketin tabanı sonradan değişse de hareket doğru satırda kalır) |
| `sold_variant_id` | INTEGER FK `product_variants` | evet | satılan paket varyantı; paketsiz harekette boş (karar: 04 bölüm 8 "hareket kaydı hem paket satırını hem taban miktarını yazar") |
| `location_id` | INTEGER FK `stock_locations` | hayır | transfer iki satır yazar, depo başına bir (karar) |
| `kind` | TEXT | hayır | `adjustment` · `reservation` · `release` · `sale` · `return` · `transfer` · `erp_sync` |
| `quantity` | INTEGER | hayır | işaretli, satılan varyantın biriminde |
| `units` | INTEGER | hayır | işaretli taban birim farkı = `quantity × unit_factor`; paketsizde `quantity`. `erp_sync`'te yeni `on_hand` − eski (karar: 04 bölüm 8 `stock_movements.units`) |
| `ref_type` | TEXT | evet | `reservation` · `order` · `fulfillment` · `return` · `import` · `manual` (karar: 04 bölüm 1 "referans"; dar sabit liste) |
| `ref_id` | INTEGER | evet | ilgili tablonun iç `id`'si (karar: iç tablo, API'ye çıkmaz) |
| `created_at` | INTEGER | hayır | (karar: yalnız eklenir, `updated_at` yok) |

- **Anahtar ve indeksler:** `(variant_id, location_id, created_at)` (karar: toplam ile `on_hand` karşılaştırması); `(ref_type, ref_id)` (karar: sipariş/gönderim ekranı hareketleri bulur).
- **Kurallar:** Yalnızca eklenir; silinmez, güncellenmez. Stok yazmasıyla aynı batch'e girer. `openmers stock merge-units` tek bir `adjustment` yazar. Tutarlılık denetimi `on_hand`'i etkileyen türlerin (`adjustment`, `sale`, `return`, `transfer`, `erp_sync`) `units` toplamını kullanır.
- **İlişkiler:** `stock_levels`, `checkout_reservations`, `orders`, `fulfillments`.
- **Yapılacaklar:**
  - şema
  - migration
  - tutarlılık denetimi sorgusu
- **Açık sorular:** —

---

# 6. Sepet ve checkout

### `carts`
- **Sahip:** `features/cart`, şema `schema/cart.ts`.
- **Kaynak:** `05-sepet-ve-checkout.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `cart_` (karar: sepet API'de döner, 05 bölüm 1; önek veri kuralları listesine eklenmeli) |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `customer_id` | INTEGER FK `customers` | evet | |
| `company_id` | INTEGER FK `companies` (`03`) | evet | B2B |
| `name` | TEXT | evet | B2B adlandırılmış sepet (karar: 05 bölüm 1 "birden çok adlandırılmış sepet"; `03` dosyası `carts.name` ekini doğrular) |
| `status` | TEXT | hayır | `active` · `awaiting_approval` · `closed`; varsayılan `active` (karar: 05 bölüm 5 settlement "sepeti kapatma"; `awaiting_approval` `03` dosyası `approval_requests` kuralından) |
| `currency` | TEXT(3) | hayır | |
| `shipping_address`, `billing_address` | TEXT (JSON) | evet | genel adres anahtarları (`address_line1/2`, `city`, `region`, `district?`, `postal_code`, `country_code`; faturada `tax_id`, `tax_id_type`) (karar: misafirin adresi tablo satırı değildir; kayıtlı adres seçilince kopyalanır, rezervasyon anlık görüntüsü buradan alınır) |
| `shipping_method_id` | INTEGER FK `shipping_methods` | evet | |
| `coupon_codes` | TEXT (JSON dizi) | evet | |
| `email` | TEXT | evet | dijital ve misafir checkout'ta zorunlu (karar: 10 bölüm 7; zorunluluk checkout doğrulamasında, sütun boş olabilir) |
| `version` | INTEGER | hayır | |
| `expires_at` | INTEGER | hayır | |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(customer_id, status)`, `(company_id, status)` (karar: `activeCart` ve adlandırılmış sepet listesi); terk edilmiş sepet görevi için `(expires_at)`.
- **Kurallar:** Tutar saklanmaz. Anonim sepetin anahtarı imzalı çerezdir. Girişte `cartMerge` stratejisi çalışır. Terk edilmiş sepet hatırlatılır, süresi dolunca **sert silinir**. Kişiselleştirme görselleri sepetle birlikte silinir. `closed` sepet yazılamaz; süpürme görevi `closed` sepeti de siler (karar: sipariş sepete değil rezervasyon anlık görüntüsüne dayanır).
- **İlişkiler:** `cart_lines`, `checkout_reservations`, `channels`, `customers`, `companies`, `shipping_methods`, `approval_requests` (`03`).
- **Yapılacaklar:**
  - şema
  - migration
  - `features/cart/queries/{getCart,mergeCarts,sweepExpired}.ts`
- **Açık sorular:** —

### `cart_lines`
- **Sahip:** `features/cart`, şema `schema/cart.ts`.
- **Kaynak:** `05-sepet-ve-checkout.md` bölüm 1, 1.1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK (karar: "sil + ekle" düzenlemesi ve API satır kimliği için tekil anahtar) |
| `cart_id` | INTEGER FK `carts` | hayır | sepet silinince satır da silinir (`ON DELETE CASCADE`) |
| `variant_id` | INTEGER FK `product_variants` | hayır | |
| `quantity` | INTEGER | hayır | |
| `custom_fields` | TEXT (JSON) | evet | `line_key`'e girmez |
| `personalization` | TEXT (JSON) | evet | doğrulanmış; görsel için `media_id` |
| `line_key` | TEXT | hayır | kanonik kişiselleştirme JSON'unun SHA-256'sının ilk 16 baytı, 32 karakter küçük harf hex; kişiselleştirme yoksa `''` (karar: `''` metinde belirsiz değildir, BLOB'da boş değer ve NULL ayrımı `ON CONFLICT`'i bozar) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `(cart_id, variant_id, line_key)` (`ON CONFLICT ... DO UPDATE` için).
- **Kurallar:** Ekleme tek koşullu yazmadır. Düzenleme "sil + ekle" ile yapılır, adet korunur. Stok burada ayrılmaz. Başka sepetin `media_id` değeri reddedilir.
- **İlişkiler:** `carts`, `product_variants`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/cart/lines/{addLine,updateLine,removeLine}.ts`
  - 05 bölüm 1.1 test listesi
- **Açık sorular:** —

### `checkout_reservations`
- **Sahip:** `features/checkout`, şema `schema/cart.ts` (karar: `00-genel.md` 0013).
- **Kaynak:** `05-sepet-ve-checkout.md` bölüm 3, 4, 5, 6; `04-stok.md` bölüm 2; `08-promosyon.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `rsv_` (karar: ödeme sağlayıcısına ve dönüş sayfasına giden kimlik; önek veri kuralları listesine eklenmeli) |
| `cart_id` | INTEGER | hayır | kaynak sepetin `id`'si; FK yok (karar: sepet süresi dolunca sert silinir, rezervasyon ve sipariş kalır) |
| `channel_id` | INTEGER FK `channels` | hayır | |
| `snapshot` | TEXT (JSON) | hayır | satırlar, fiyatlar, indirim, vergi, kargo, adresler, depo dağılımı, atıf verisi |
| `payment_method_id` | INTEGER FK `payment_methods` | hayır | (karar: belgedeki `payment_method`; işleyici ve argümanları settlement, iade ve uzlaştırmada yöntem kaydından okunur, 06 bölüm 7) |
| `status` | TEXT | hayır | `active` · `payment_pending` · `settled` · `released` · `expired` · `failed` |
| `expires_at` | INTEGER | hayır | |
| `source` | TEXT | hayır | `web · agent · admin · api`, varsayılan `web` (karar 2026-11-13: ajan ticareti raporlanabilsin; `08-ajan-ticareti.md`) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; uzlaştırma ve süpürme için kısmi indeks `(status, expires_at) WHERE status IN ('active','payment_pending')`; `(cart_id)`; temizlik için `(status, updated_at)` (karar).
- **Kurallar:**
  - `INSERT ... SELECT ... WHERE <bütün kalemler yeterli> AND <sepet version değişmedi>`.
  - Stok ve kupon artışları `EXISTS (status='active')` koşuluna bağlıdır.
  - Bırakma yalnızca `active` ya da `payment_pending` durumundan yapılır. Geçişler `WHERE status = :beklenen` ile; `version` yok (karar: durum koşulu yeterli).
  - Barındırılan ödeme sayfasında yerel süre dolsa bile bırakılmaz; havale/EFT'de `expires_at` yetkilidir.
  - Saklama: `settled` satır silinmez (sipariş kalemlerinin kaynağı, `orders.reservation_id` FK'si). `released` · `expired` · `failed` satırlar 30 gün sonra silinir; süre `settings` ile değişir (karar: geç gelen ödeme settlement'ı anlık görüntüye ihtiyaç duyar, 05 bölüm 5; uzlaştırma penceresinden uzun tutulur).
- **İlişkiler:** `carts`, `stock_levels`, `promotions`, `pending_payments`, `payment_methods`, `orders.reservation_id`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/checkout/queries/{createReservation,releaseReservation,listStale,purgeOld}.ts`
  - yarış testleri (05 bölüm 8)
- **Açık sorular:** —

---

# 7. Ödeme ve para iadesi

### `payment_methods`
- **Sahip:** `features/payments`, şema `schema/payments.ts`.
- **Kaynak:** `06-odeme-ve-iade.md` bölüm 1, 6, 7, 9; tablo adı yol haritası madde 267'de.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `code` | TEXT | hayır | benzersiz yöntem kodu; vitrin ve API yöntemi bununla seçer (karar: Vendure `PaymentMethod.code`; dışa açık kimlik olarak `public_id` yerine yeterli) |
| `name` | TEXT | hayır | |
| `position` | INTEGER | hayır | sıra |
| `handler_code` | TEXT | hayır | `PaymentHandler` kodu (karar: 06 bölüm 1 "işleyici, argümanlarıyla") |
| `handler_args` | TEXT (JSON) | evet | `statementDescriptor`, kapıda ödeme hizmet bedeli dahil; sır içermez |
| `checker_code` | TEXT | evet | `PaymentEligibilityChecker` |
| `checker_args` | TEXT (JSON) | evet | |
| `enabled` | INTEGER (bool) | hayır | varsayılan 1 (karar: 06 bölüm 9 "ikisi de kapatılabilir") |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `code`; küçük tablo, bellekte tutulur.
- **Kurallar:** Sağlayıcı anahtarları kasada (`secrets`, `01`) durur, satırda tutulmaz. İade, ödemenin yapıldığı yöntem kaydının anahtarlarıyla çalışır. Kanal bağlantısı `payment_method_channels(payment_method_id, channel_id)` bağlantı tablosundadır (karar: veri kuralları bölüm 4 ödeme yöntemini `<varlık>_channels` ile bağlar; 06 bölüm 7 "kanal başına ayrı yöntem kaydı" da bununla çalışır; 0017).
- **İlişkiler:** `payment_method_channels` (0017, `commerce-links.ts`), `payments`, `pending_payments`, `checkout_reservations`, `secrets` (`01`).
- **Yapılacaklar:**
  - şema
  - migration
  - tohum: havale/EFT ve kapıda ödeme
- **Açık sorular:** —

### `payments`
- **Sahip:** `features/payments`, şema `schema/payments.ts`.
- **Kaynak:** `06-odeme-ve-iade.md` bölüm 4, 7; `05-sepet-ve-checkout.md` bölüm 5.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `pay_` (karar: sipariş ayrıntısı API'si ödemeleri listeler; önek veri kuralları listesine eklenmeli) |
| `order_id` | INTEGER FK `orders` | hayır | |
| `payment_method_id` | INTEGER FK `payment_methods` | hayır | |
| `amount` | INTEGER | hayır | |
| `currency` | TEXT(3) | hayır | (karar: veri kuralları bölüm 2) |
| `state` | TEXT | hayır | `authorized` · `settled` · `declined` · `cancelled` |
| `provider_reference` | TEXT | evet | |
| `external_refunded_amount` | INTEGER | hayır | elle kaydedilen (sağlayıcıya dokunmayan) iadelerin EKLEMELİ toplamı, varsayılan 0 (öneri, Minshop incelemesi); `refunded_amount + external_refunded_amount <= amount` koşulu `UPDATE ... WHERE` içinde |
| `refunded_amount` | INTEGER | hayır | sağlayıcının bildirdiği kümülatif iade tutarı, varsayılan 0 (karar: 06 bölüm 3 iade olayları kümülatif ve mutlak; senkron ödeme başına tutulur, bkz. `refunds`) |
| `statement_descriptor` | TEXT | evet | anlık görüntü |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(order_id)`; kısmi benzersiz `(payment_method_id, provider_reference) WHERE provider_reference IS NOT NULL` (karar: webhook eşlemesi ve çift kayıt engeli).
- **Kurallar:** Silinmez. Bir siparişin birden çok ödemesi olabilir. Siparişin ödeme durumu bu kayıtlardan türetilir. Ödeme kaydı settlement token koşuluyla yazılır; durum geçişi `WHERE state = :beklenen` ile. Ödeme webhook'u için ayrı olay tablosu yok: tekillik `settlement_token` ve `(payment_method_id, provider_reference)` benzersizliğiyle, iade olayında `refunded_amount` koşuluyla sağlanır (karar: 05 bölüm 5 ve 06 bölüm 3 kuralları bunu zaten karşılar; yol haritasındaki `payment_webhook_events` açılmaz).
- **İlişkiler:** `orders`, `payment_methods`, `refunds`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/payments/queries/{recordPayment,listForOrder}.ts`
  - yarış testi: aynı webhook'un iki teslimatı
- **Açık sorular:** —

### `pending_payments`
- **Sahip:** `features/payments`, şema `schema/payments.ts`.
- **Kaynak:** `06-odeme-ve-iade.md` bölüm 1, 4, 9.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `reservation_id` | INTEGER FK `checkout_reservations` | hayır | |
| `payment_method_id` | INTEGER FK `payment_methods` | hayır | (karar: havale ile kapıda ödeme ayrımı ve IBAN/hizmet bedeli argümanları) |
| `amount` | INTEGER | hayır | beklenen tutar (karar: banka entegrasyonu ve admin onayı tutarı karşılaştırır) |
| `currency` | TEXT(3) | hayır | (karar: veri kuralları bölüm 2) |
| `state` | TEXT | hayır | `pending` · `confirmed` · `cancelled` · `expired` (karar: 06 bölüm 9 "admin onayı veya banka entegrasyonu", "süre dolunca otomatik iptal"; `cancelled` admin/müşteri iptali) |
| `expires_at` | INTEGER | evet | havalede süre dolumu; kapıda ödemede boş (karar: kapıda ödeme sipariş onayıyla kesinleşir, süresi yok) |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `(reservation_id)` (karar: rezervasyon başına tek bekleyen ödeme); süpürme için kısmi `(expires_at) WHERE state = 'pending'` (karar).
- **Kurallar:** Havale ve kapıda ödeme için kullanılır. Admin onayı ya da banka entegrasyonu `pending → confirmed` yapar ve aynı `atomic()` içinde settlement'ı çağırır. Süre dolunca `expired` olur, rezervasyon bırakılır. Geçişler `WHERE state = 'pending'` ile. Admin onayı ekranda rezervasyonun `rsv_` kimliğiyle yapılır, tabloya `public_id` gerekmez (karar).
- **İlişkiler:** `checkout_reservations`, `payment_methods`.
- **Yapılacaklar:**
  - şema
  - migration
  - zamanlanmış görev `sweepPendingPayments`
- **Açık sorular:** Kapıda ödeme hizmet bedelinin siparişte nerede durduğu (bkz. "Açık sorular (A)").

### `refunds`
- **Sahip:** `features/payments`, şema `schema/payments.ts`.
- **Kaynak:** `06-odeme-ve-iade.md` bölüm 3, 4, 5; `05-sepet-ve-checkout.md` bölüm 6; `07-siparis.md` bölüm 5, 9.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `ref_` (karar: önek veri kuralları listesinde) |
| `payment_id` | INTEGER FK `payments` | hayır | |
| `order_id` | INTEGER FK `orders` | hayır | (karar: 07 bölüm 9 ciro raporu `orders` ve `refunds`'tan okunur; ödeme join'i olmadan kanal/tarih süzgeci) |
| `return_id` | INTEGER FK `returns` | evet | ürün iadesinden doğan para iadesi (karar: 10 bölüm 3 iade akışı para iadesine bağlanır) |
| `amount` | INTEGER | hayır | |
| `currency` | TEXT(3) | hayır | (karar: veri kuralları bölüm 2) |
| `reason` | TEXT | evet | |
| `state` | TEXT | hayır | `pending` · `settled` · `failed` · `unknown` |
| `lines` | TEXT (JSON) | evet | satır dökümü; vergi satırlarına oransal dağıtım (karar: birlikte okunup yazılır) |
| `source` | TEXT | hayır | `admin` · `provider` · `manual` (karar: 06 bölüm 5 üç yol) |
| `provider_event_id` | TEXT | evet | sağlayıcı olay kimliği (karar: 06 bölüm 3 "olay kimliği idempotency sınırıdır") |
| `provider_refund_id` | TEXT | evet | sağlayıcı iade kimliği (öneri, Minshop incelemesi); kısmi benzersiz `(payment_id, provider_refund_id)` |
| `idempotency_key` | TEXT | evet | yönetici iadesinde istemci anahtarı (öneri); benzersiz, sağlayıcıya da iletilir |
| `reverses_refund_id` | INTEGER FK `refunds` | evet | ters kayıt (öneri); kısmi benzersiz, bir iade yalnız bir kez iptal edilir |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: ortak kural) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(payment_id)`; `(order_id)`; kısmi benzersiz `(payment_id, provider_event_id) WHERE provider_event_id IS NOT NULL` (karar); uzlaştırma için kısmi indeks `(state) WHERE state = 'unknown'`; raporlama için `(created_at)` (karar).
- **Kurallar:** `unknown` durumdaki iade yeniden denenmez; uzlaştırma çözemezse admin'e düşer. Sağlayıcı iade olayları kümülatif ve mutlak tutar taşır: senkron ödeme başınadır, `UPDATE payments SET refunded_amount = :kümülatif WHERE id = ? AND refunded_amount < :kümülatif` başarılıysa aynı `atomic()` içinde fark tutarında `refunds` satırı yazılır; çift ve sırasız teslimat etkisizdir (karar: satır başına senkron sağlayıcı verisinde yok). E-fatura iadesi için outbox adımı yazılır. Silinmez.
- **İlişkiler:** `payments`, `orders` (türetilmiş ödeme durumu), `returns`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/payments/queries/{recordRefund,listUnknown}.ts`
  - test: kümülatif tutarda çift ve sırasız teslimat
- **Açık sorular:** —

---

# 8. Sipariş

### `orders`
- **Sahip:** `features/orders`, şema `schema/orders.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1, 2, 6; `05-sepet-ve-checkout.md` bölüm 1.1, 5; `03-fiyat.md` bölüm 4; `10-kargo-ve-teslimat.md` bölüm 3, 7; `13-icerik-ve-gezinme.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `ord_` |
| `number` | TEXT | hayır | yıl + kanal başına sıra, boşluksuz |
| `channel_id` | INTEGER FK | hayır | |
| `customer_id` | INTEGER FK | hayır | tek müşteri kaydı (misafir de bir müşteri satırıdır) |
| `company_id` | INTEGER FK | evet | |
| `placed_by_customer_id` | INTEGER FK | evet | |
| `reservation_id` | INTEGER FK | hayır | `ON CONFLICT(reservation_id)` |
| `source` | TEXT | hayır | rezervasyondan kopyalanır: `web · agent · admin · api`, varsayılan `web` (karar 2026-11-13; indeks `(channel_id, source, created_at)` rapor için) |
| `settlement_token` | TEXT | evet | settlement'ı yalnızca bir çağrının kazanması için |
| `currency` | TEXT | hayır | |
| `subtotal_net`, `tax_total`, `total_gross`, `discount_total`, `shipping_total` | INTEGER | hayır | sırayla net, vergi, brüt, indirim, kargo toplamı (karar: 07 bölüm 1 beş toplamı sayıyor, adlar bu satırda sabitlendi; tutarlar tek `currency` ile birlikte okunur) |
| `shipping_address`, `billing_address` | TEXT (JSON) | evet | anlık görüntü |
| `shipping_region` | TEXT | evet | teslimat adresindeki `region` kopyası; `access_policies` kapsamı bölge filtresi için (karar: JSON içinde filtrelenmez; indeks `(channel_id, shipping_region)`) |
| `assigned_admin_id` | INTEGER FK | evet | `admin_users.id`; `access_policies` kapsamı `assigned_to` (karar) |
| `state` | TEXT | hayır | `placed` · `completed` · `cancelled` |
| `payment_status` | TEXT | hayır | önbellek: `awaiting` · `authorized` · `paid` · `partially_refunded` · `refunded` (karar: 07 bölüm 2 değerleri; ad, `payments`/`refunds`'tan türetilen değerden gelir, sütun yalnız liste sorgusu içindir) |
| `fulfillment_status` | TEXT | hayır | önbellek: `unfulfilled` · `partially_fulfilled` · `fulfilled` · `delivered` · `returned` (karar: 07 bölüm 2 değerleri; `fulfillments`'tan türetilir) |
| `po_number` | TEXT | evet | |
| `payment_terms` | TEXT | evet | |
| `lang` | TEXT | hayır | bildirim ve belge dili (karar: 07 bölüm 10 "siparişteki dil"; kanalın `default_lang`'i sonradan değişse sipariş kendi dilini korur, anlık görüntü) |
| `fx_rate` | TEXT (JSON) | evet | sipariş anındaki kur (karar: 03 bölüm 4 + anlık görüntü kuralı; `currency_rates`'e join edilmez, `{ base, quote, rate_e9, day }` kopyalanır) |
| `legal_snapshot` | TEXT (JSON) | evet | onaylanan yasal metin sürümleri, cayma bilgilendirmesinin gösterildiği an ve sürümü, `legal_policy` sürümü, kişiye özel ürün ve dijital ürün onay zaman damgaları (karar: tek JSON, anahtarları kodda tipli; belge alanları sayıp sütun adı vermiyor, 10 bölüm 3 ilke sürümünün siparişe yazıldığını söylüyor) |
| `stock_exception` | INTEGER (bool) | hayır | geç gelen ödemede stok istisnası (karar: 05 bölüm 5 "stok istisnası ile işaretlenir"; koşullu ayırma yetmezse 1 olur ve admin'e düşer) |
| `has_personalization` | INTEGER (bool) | hayır | admin süzgeci (05 bölüm 1.1) |
| `custom_fields` | TEXT (JSON) | evet | |
| `placed_at` | INTEGER | hayır | indekslerde geçiyor |
| `updated_at` | INTEGER | hayır | `orders.list?updated_since=` için (16 bölüm 5) |

- **Anahtar ve indeksler:**
  - benzersiz `public_id`, `reservation_id`, `(channel_id, number)` (belge yalnızca `number` diyor).
  - `(channel_id, placed_at)`, `(customer_id, placed_at)`, `(company_id, placed_at)`.
  - açık siparişler için `state` kısmi indeksi.
  - `(updated_at)` (karar: 16 bölüm 5 `orders.list?updated_since=` imleçli dışa aktarma artan sırada okur; indekssiz tam tarama olur).
- **Kurallar:**
  - Yalnızca kesinleşmiş sipariş bulunur.
  - Durum geçişi `WHERE state = :beklenen` ile yapılır ve aynı batch'te `order_events` + outbox yazılır.
  - Türetilmiş iki durum sütunu ilgili yazmayla aynı `atomic()` içinde güncellenir.
  - Silinmez. Anonimleştirmede anlık görüntüler yasal süre boyunca kalır.
- **İlişkiler:** `order_lines`, `order_adjustments`, `order_tax_lines`, `order_shipping_lines`, `order_events`, `order_notes`, `payments`, `fulfillments`, `returns`, `documents`, `order_guest_access` (tanımı veri kurallarında).
- **Yapılacaklar:**
  - şema `schema/orders.ts`
  - migration (indeksler aynı dosyada)
  - `features/orders/queries/{settle,transition,listByChannel,listByCustomer,getByNumber}.ts`
  - yarış testleri: settlement'ın iki tetikleyicisi, dönüş sayfası + webhook, sayaç
  - müşteri sayfası sorgu planı testi
- **Sayaç (karar 2026-11-13):** `order_number_counters(channel_id, period, last_value, updated_at)`, PK `(channel_id, period)`, 0017. `number` kanal başına benzersiz (`orders_number_uq`). Dönem stratejiye bağlı (varsayılan yıl; dönemsiz strateji 0). Settlement `atomic()`'i içinde `INSERT … ON CONFLICT DO UPDATE SET last_value = last_value + 1`; atomic geri alınırsa sayaç da geri alınır, boşluk oluşmaz.
- **Açık sorular:** Toplam sütunlarının adları, türetilmiş durum sütunlarının adları ve yasal/onay anlık görüntüsünün biçimi bu bölümde karara bağlandı.

### `order_lines`
- **Sahip:** `features/orders`, şema `schema/order-lines.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1; `05-sepet-ve-checkout.md` bölüm 1.1; `04-stok.md` bölüm 8; `10-kargo-ve-teslimat.md` bölüm 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `itm_` (karar: veri kuralları bölüm 1 önek listesindeki `itm_` sipariş kalemine ayrıldı; listede başka sahibi yok, çakışma yok) |
| `order_id` | INTEGER FK | hayır | |
| `variant_id` | INTEGER FK | hayır | referans |
| `name`, `sku` | TEXT | hayır | anlık görüntü |
| `unit_price_net`, `unit_price_gross` | INTEGER | hayır | |
| `base_unit_price` | INTEGER | hayır | ek ücret öncesi birim fiyat |
| `surcharge` | INTEGER | hayır | kişiselleştirme ek ücreti (varsayılan 0) |
| `quantity` | INTEGER | hayır | |
| `stock_units` | INTEGER | hayır | adet × `unit_factor` anlık görüntüsü |
| `location_id` | INTEGER FK | evet | depo |
| `personalization` | TEXT (JSON) | evet | doğrulanmış anlık görüntü; görselde `media_id` + dosya adı |
| `fulfillment_type` | TEXT | hayır | `physical` · `digital` (karar: 10 bölüm 7 `variants.fulfillment_type` anlık görüntüsü, varsayılan `physical`; karma sepette dijital satırı kargo grubundan ayırır) |
| `customizes_goods` | INTEGER (bool) | hayır | iade kuralı için satır düzeyi işaret (karar: 05 bölüm 1.1 alan düzeyi `customizesGoods` bayrağı; dolu alanlardan biri true ise 1, varsayılan 0 — tanım sonradan değişse sipariş etkilenmez) |

- **Anahtar ve indeksler:** `(order_id)`; `(variant_id)` (karar: admin'de varyant bazlı sipariş geçmişi ve iade denetimi bu yolu kullanır; ağır raporlar 16 bölüm 2 gereği günlük özetten okunur).
- **Kurallar:** Satır yerinde düzenlenmez. Tek istisna: sipariş `unfulfilled` iken ek ücreti değiştirmeyen kişiselleştirme düzeltmesi; eski değer `order_notes` ve `audit_log`'a düşer.
- **İlişkiler:** `orders`, `fulfillment_lines`, `digital_entitlements`, `order_tax_lines`, `order_adjustments`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/orders/queries/correctPersonalization.ts`
  - test: ek ücreti değiştiren düzeltmenin reddi
- **Açık sorular:** Satırın net/brüt toplamı da saklanacak mı? Belgede yok.

### `order_adjustments`
- **Sahip:** `features/orders` (üretici `promotions`), şema `schema/order-lines.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1; `08-promosyon.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `order_id` | INTEGER FK | hayır | |
| `order_line_id` | INTEGER FK | evet | boşsa sipariş düzeyi |
| `source` | TEXT | hayır | `promotion` · `coupon` · `manual` |
| `promotion_id` | INTEGER FK | evet | |
| `amount` | INTEGER | hayır | |
| `target` | TEXT | hayır | `line` · `order` · `shipping` (karar: 08 bölüm 2.3 üç eylem türü; kargo indiriminin satırı olmadığı için ayrım sütunda tutulur, `CHECK ((target = 'line') = (order_line_id IS NOT NULL))`) |
| `description` | TEXT | evet | anlık görüntü (karar: promosyon/kupon adı sipariş anında kopyalanır — anlık görüntü kuralı; promosyon yeniden adlandırılır veya silinir, join edilmez; elle indirimde boş kalabilir) |

- **Anahtar ve indeksler:** `(order_id)`.
- **Kurallar:** Sipariş düzeyi indirim satırlara oransal dağıtılır.
- **İlişkiler:** `orders`, `order_lines`, `promotions`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** Dağıtılmış satır payları ayrı satır olarak mı tutulacak? Belgede yok.

### `order_tax_lines`
- **Sahip:** `features/orders` (üretici `tax`), şema `schema/order-lines.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1; `09-vergi.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `order_id` | INTEGER FK | hayır | (karar: kargo vergisi satırı da siparişe bağlı; `(order_id)` indeksi tüm vergi satırlarını tek sorguda verir) |
| `order_line_id` | INTEGER FK | evet | boşsa kargo vergisi (karar: 09 bölüm 2.5 kargo kendi vergi kategorisinde; kargo satırına ayrı FK yerine tek tablo) |
| `rate_bp` | INTEGER | hayır | oran, baz puan |
| `amount` | INTEGER | hayır | |
| `tax_category` | TEXT | evet | anlık görüntü (karar: yerel stratejide kategori kodu kopyalanır — 09 bölüm 4 oran değişikliği eski siparişi etkilemez; dış vergi servisi satırında boş kalabilir, 09 bölüm 5) |

- **Anahtar ve indeksler:** `(order_id)`.
- **Kurallar:** Yuvarlama satır düzeyindedir. Muhasebe dönem raporu KDV oranına göre döküm verir.
- **İlişkiler:** `orders`, `order_lines`, `order_shipping_lines`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** — (karar: `order_line_id` boş olan satır kargo vergisidir; kargo satırında ayrı vergi sütunu yok).

### `order_shipping_lines`
- **Sahip:** `features/orders` (üretici `shipping`), şema `schema/order-lines.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1; `10-kargo-ve-teslimat.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `order_id` | INTEGER FK | hayır | |
| `shipping_method_id` | INTEGER FK | evet | referans |
| `method_name` | TEXT | hayır | anlık görüntü (karar: 10 bölüm 1 "yöntemi ve ücreti anlık görüntü olarak saklar"; `shipping_method_id` silinse de görünen ad kalır) |
| `weight` | INTEGER | evet | fiyatlanan ağırlık |
| `amount` | INTEGER | hayır | ücret |

- **Anahtar ve indeksler:** `(order_id)`.
- **Kurallar:** v1'de sipariş başına tek kargo satırı vardır (çok depolu sepette de). Dijital kalemler kargo grubuna girmez.
- **İlişkiler:** `orders`, `shipping_methods`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `order_events`
- **Sahip:** `features/orders`, şema `schema/orders.ts`.
- **Kaynak:** `07-siparis.md` bölüm 1, 3, 10.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `order_id` | INTEGER FK | hayır | |
| `kind` | TEXT | hayır | `state_change` (karar: 07 bölüm 3 her geçişte bir olay yazar; notlar `order_notes`'ta durur ve zaman çizelgesinde birleştirilir — 07 bölüm 1, 10. Built-in app kancası kendi `kind`'ini yazabildiği için CHECK yok) |
| `from_state`, `to_state` | TEXT | evet | geçişte önceki ve yeni durum (karar: 07 bölüm 3; ilk `placed` olayında `from_state` boş, `to_state` dolu; diğer `kind`'lerde ikisi de boş) |
| `actor` | TEXT (JSON) | evet | aktör |
| `data` | TEXT (JSON) | evet | olay ayrıntısı: ödeme/gönderim kimliği, gerekçe (karar: birlikte yazılıp birlikte okunur, filtrelenmez — ortak kural JSON) |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** `(order_id, created_at)`.
- **Kurallar:** Yalnızca eklenir. Zaman çizelgesinde `order_notes` ile birleşik gösterilir.
- **İlişkiler:** `orders`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `order_notes`
- **Sahip:** `features/orders`, şema `schema/order-notes.ts`.
- **Kaynak:** `07-siparis.md` bölüm 10.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `order_id` | INTEGER FK | hayır | |
| `body` | TEXT | hayır | ≤ 5000 karakter |
| `visibility` | TEXT | hayır | `internal` · `customer` |
| `pinned` | INTEGER (bool) | hayır | |
| `author_id` | INTEGER | hayır | |
| `author_name` | TEXT | hayır | anlık görüntü |
| `created_at` | INTEGER | hayır | |
| `edited_at` | INTEGER | evet | |
| `deleted_at` | INTEGER | evet | yumuşak silme |

- **Anahtar ve indeksler:** `(order_id, pinned DESC, created_at DESC)` (karar: 07 bölüm 10 "sabitlenen not üstte", kalanı yeniden eskiye).
- **Kurallar:** Yazar notu 15 dakika içinde düzeltebilir; düzenleme `WHERE created_at > now-15dk AND author_id = ?` ile yapılır. Silme yönetici yetkisiyle ve denetim kaydıyla olur. `customer` notu bildirim gönderir. Kişisel veri içerir; anonimleştirmede yasal saklamaya tabidir. `CHECK(length(body) <= 5000)`.
- **İlişkiler:** `orders`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/orders/queries/{addNote,listNotes,editNote}.ts`
  - test: 15 dakika penceresi
- **Açık sorular:** Veri kuralları yumuşak silmeyi yalnızca katalog ve müşteri için tanımlıyor (çelişki listesine bakın).

---

# 9. Promosyon

### `promotions`
- **Sahip:** `features/promotions`, şema `schema/promotions.ts`.
- **Kaynak:** `08-promosyon.md` bölüm 1, 3, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `prm_` (karar: admin API'de görünür; önek listede yok) |
| `name` | TEXT | hayır | |
| `starts_at`, `ends_at` | INTEGER | evet | |
| `enabled` | INTEGER (bool) | hayır | |
| `priority` | INTEGER | hayır | |
| `coupon_code` | TEXT | evet | |
| `usage_limit` | INTEGER | evet | NULL = sınırsız |
| `per_customer_limit` | INTEGER | evet | NULL = sınırsız |
| `used` | INTEGER | hayır | varsayılan 0 (karar: 08 bölüm 3 SQL'i kullanıyor; sütun listesine eklendi) |
| `conditions` | TEXT (JSON) | hayır | `[{code, args}]` |
| `actions` | TEXT (JSON) | hayır | |
| `stackable` | INTEGER (bool) | hayır | |
| `apply_to_contract` | INTEGER (bool) | hayır | varsayılan 0 (karar: 08 bölüm 4 "promosyon başına ayar") |
| `version` | INTEGER | hayır | (karar: admin eşzamanlı düzenleme; `used` artışı `version`'a dokunmaz) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; kupon araması için benzersiz `coupon_code` (kısmi, `WHERE coupon_code IS NOT NULL`; karar: kupon kodu mağaza genelinde tek promosyonu gösterir). Etkin promosyonlar kanal başına bellekte.
- **Kurallar:** `UPDATE promotions SET used = used + 1 WHERE id = ? AND (usage_limit IS NULL OR used < usage_limit) AND EXISTS (rezervasyon)` (düzeltme: belgedeki `used < usage_limit` NULL sınırda hiç artmaz). Yalnızca sıfırdan büyük indirim üreten promosyonda artar. Bırakmada geri alınır. Müşteri başına sınır `promotion_usage` koşullu INSERT'iyle aynı `atomic()` içinde uygulanır (karar, aşağıda).
- **İlişkiler:** `promotion_channels` (karar: 01 bölüm 2 `<varlık>_channels` kalıbı; 0017, `commerce-links.ts`), `promotion_usage`, `order_adjustments`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/promotions/queries/{loadActive,incrementUsage,releaseUsage}.ts`
  - yarış testi: sınırlı kuponun son kullanımı; müşteri başına sınırın son kullanımı
- **Açık sorular:** —

### `promotion_usage`
- **Sahip:** `features/promotions`, şema `schema/promotions.ts`.
- **Kaynak:** `08-promosyon.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `promotion_id` | INTEGER FK | hayır | |
| `customer_id` | INTEGER FK | evet | (karar: 08 bölüm 1 "müşteri"; müşteri bilinmiyorsa müşteri başına sınır uygulanmaz) |
| `reservation_id` | INTEGER FK | hayır | `checkout_reservations` (karar: satır rezervasyonda yazılır, bırakmada silinir; 08 bölüm 3 "sayaç geri alınır") |
| `order_id` | INTEGER FK | evet | settlement'ta doldurulur (karar: rezervasyonda sipariş yoktur) |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** müşteri başına sınır için `(promotion_id, customer_id)`; benzersiz `(promotion_id, reservation_id)` (çift yazım engeli).
- **Kurallar:** 0 indirimde satır yazılmaz. Müşteri başına sınır: `INSERT ... SELECT ... WHERE p.per_customer_limit IS NULL OR (SELECT count(*) FROM promotion_usage WHERE promotion_id = ? AND customer_id = ?) < p.per_customer_limit`, `used` artışıyla aynı `atomic()` içinde (karar).
- **İlişkiler:** `promotions`, `customers`, `checkout_reservations`, `orders`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

---

# 10. Vergi

### `zones`
- **Sahip:** `features/tax`, şema `schema/tax-shipping.ts` (00-genel sırası).
- **Kaynak:** `09-vergi.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `zon_` (karar: admin API'de düzenlenir) |
| `name` | TEXT | hayır | (karar: admin listesinde görünen ad) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`. Bellekte tutulur.
- **Kurallar:** Vergi ve kargo bu tabloyu ortak kullanır.
- **İlişkiler:** `zone_members`, `tax_rates`, `shipping_methods`, `channels`.
- **Yapılacaklar:**
  - şema
  - migration
  - tohum: ülke bölgeleri
- **Açık sorular:** —

### `zone_members`
- **Sahip:** `features/tax`, şema `schema/tax-shipping.ts`.
- **Kaynak:** `09-vergi.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `zone_id` | INTEGER FK | hayır | |
| `country` | TEXT(2) | hayır | ISO 3166-1 alpha-2 (karar: adres `country` ile aynı biçim) |
| `region` | TEXT | evet | ISO 3166-2 alt bölge kodu; NULL = tüm ülke (karar: genel adres sütunu `region` ile aynı ad, pazardan bağımsız) |

- **Anahtar ve indeksler:** benzersiz ifade indeksi `(zone_id, country, coalesce(region, ''))` (karar: SQLite benzersiz indekste NULL'ları farklı sayar).
- **Kurallar:** —
- **İlişkiler:** `zones`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `tax_categories`
- **Sahip:** `features/tax`, şema `schema/tax-shipping.ts`.
- **Kaynak:** `09-vergi.md` bölüm 1, 2, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `code` | TEXT | hayır | tohum örnekleri `standard`, `reduced`, `food`, `book`, `shipping`; kapalı liste değil (karar: 09 bölüm 1 "…" diye açık bırakıyor) |
| `name` | TEXT | hayır | |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `code` (karar: API dış anahtarı `code`; `public_id` gerekmez).
- **Kurallar:** Kargo ücretinin kendi kategorisi var. Kişiselleştirme ek ücreti satırın kategorisini alır.
- **İlişkiler:** `product_variants`, `tax_rates`, `shipping_methods`.
- **Yapılacaklar:**
  - şema
  - migration
  - tohum
- **Açık sorular:** —

### `tax_rates`
- **Sahip:** `features/tax`, şema `schema/tax-shipping.ts`.
- **Kaynak:** `09-vergi.md` bölüm 1, 3, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `txr_` (karar: admin API'de düzenlenir) |
| `zone_id` | INTEGER FK | hayır | |
| `tax_category_id` | INTEGER FK | hayır | |
| `customer_group_id` | INTEGER FK | evet | NULL = herkes |
| `rate_bp` | INTEGER | hayır | baz puan |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz ifade indeksi `(zone_id, tax_category_id, coalesce(customer_group_id, 0))` (düzeltme: düz benzersiz indeks NULL grupta çift satıra izin verir).
- **Kurallar:** Oran değişikliği yalnızca yeni sepetleri etkiler; sipariş anlık görüntü taşır. Şirket başına oran, şirketi bir müşteri grubuna koyarak tanımlanır (karar: 09 bölüm 3 parantezde `customer_group` diyor; ayrı `company_id` sütunu yok).
- **İlişkiler:** `zones`, `tax_categories`, `customer_groups`.
- **Yapılacaklar:**
  - şema
  - migration
  - tohum: çekirdek yalnızca kategori setini getirir; ülke oranları ülke paketinin tohumudur (TR paketi: %1, %10, %20). Global varsayılan pazar kararı.
- **Açık sorular:** Muafiyet belgesi ve geçerlilik tarihi (09 bölüm 3) nerede tutulacak: (açık: şirket kaydı `03` dosyasında; çekirdek sütun mu, modül `custom_fields` mı belgede yok).

---

# 11. Kargo, teslimat, iade, dijital ürün

### `shipping_methods`
- **Sahip:** `features/shipping`, şema `schema/tax-shipping.ts` (00-genel sırası).
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 1, 4; tablo adı yol haritası madde 203'te.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `shm_` (karar: sepette seçilen yöntem API'ye çıkar) |
| `name` | TEXT | hayır | |
| `zone_id` | INTEGER FK | evet | bölge |
| `checker_code`, `checker_args` | TEXT / TEXT (JSON) | evet | `ShippingEligibilityChecker` |
| `calculator_code`, `calculator_args` | TEXT / TEXT (JSON) | hayır | sabit, ağırlık kademesi, desi, tutar üstü ücretsiz, app. Canlı fiyat app'inin zaman aşımı ve yedek ücreti (tutar + para birimi) `calculator_args` içindedir (karar: 10 bölüm 1 bunu hesaplayıcının parçası sayar; ayrı `fallback_amount` sütunu para birimsiz kalırdı, kaldırıldı) |
| `tax_category_id` | INTEGER FK | hayır | kargonun vergi kategorisi (karar: 09 bölüm 2 madde 5 "kargo ücreti kendi vergi kategorisine sahiptir") |
| `pickup_location_id` | INTEGER FK | evet | `stock_locations`; mağazadan teslim yöntemi (karar: 10 bölüm 4 depo bir kargo yöntemi olarak sunulur; uygunluk denetleyicisi bu depoda stok arar) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`. Bellekte tutulur.
- **Kurallar:** Yerleşik hesaplayıcılarla seçenek listesi sorgu atmaz (10 bölüm 1).
- **İlişkiler:** `shipping_method_channels` (karar: `<varlık>_channels` kalıbı; 0017, `commerce-links.ts`), `zones`, `tax_categories`, `stock_locations`, `order_shipping_lines`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `fulfillments`
- **Sahip:** `features/fulfillment`, şema `schema/fulfillment.ts`.
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 2, 3, 6, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `ful_` (karar: gönderim müşteri sipariş sayfasında ve admin API'de görünür) |
| `order_id` | INTEGER FK | hayır | |
| `location_id` | INTEGER FK | evet | `stock_locations`; dijitalde boş (karar: dijital teslimatta stok düşümü ve depo yok, 10 bölüm 7) |
| `kind` | TEXT | hayır | `physical` (varsayılan) · `digital` |
| `state` | TEXT | hayır | `pending` · `shipped` · `delivered` · `cancelled` |
| `handler_code` | TEXT | hayır | varsayılan `manual` (karar: 10 bölüm 2, 6 `FulfillmentHandler` seçimi; outbox işi hangi işleyiciyi çağıracağını buradan okur) |
| `carrier` | TEXT | evet | |
| `tracking_number` | TEXT | evet | |
| `tracking_url_template` | TEXT | evet | (karar: 10 bölüm 6 "isteğe bağlı bağlantı şablonu"; ad belgeye uyar) |
| `label_media_id` | INTEGER FK | evet | `media`; etiket dosyası (karar: dosyanın tek sahibi `media`, 12) |
| `delivered_at` | INTEGER | evet | cayma süresinin başlangıcı; admin elle girebilir |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(order_id)`; taşıyıcı webhook eşleşmesi için `(carrier, tracking_number)` (karar: 10 bölüm 2 takip güncellemesi).
- **Kurallar:** Oluşturma tek `atomic()` içindedir: satırlar + stok düşümü + `sale` hareketleri + `order.fulfilled` + siparişin teslimat durumu. Durum geçişi koşulludur (`UPDATE ... WHERE state = ?`; `version` gerekmez).
- **İlişkiler:** `orders`, `fulfillment_lines`, `stock_locations`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/fulfillment/queries/{createFulfillment,markShipped,markDelivered}.ts`
- **Açık sorular:** —

### `fulfillment_lines`
- **Sahip:** `features/fulfillment`, şema `schema/fulfillment.ts` (00-genel 0016 listesinde unutulmuş; aynı dosyaya girer).
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `fulfillment_id` | INTEGER FK | hayır | |
| `order_line_id` | INTEGER FK | hayır | |
| `quantity` | INTEGER | hayır | kısmi gönderim |

- **Anahtar ve indeksler:** PK `(fulfillment_id, order_line_id)`; `(order_line_id)` (kalan adet hesabı).
- **Kurallar:** Gönderilen adet sipariş adedini aşamaz: `INSERT ... SELECT ... WHERE (SELECT coalesce(sum(fl.quantity), 0) FROM fulfillment_lines fl JOIN fulfillments f ON f.id = fl.fulfillment_id WHERE fl.order_line_id = ? AND f.state <> 'cancelled') + ? <= order_lines.quantity` (karar: koşullu yazma kuralı; iptal edilen gönderim sayılmaz).
- **İlişkiler:** `fulfillments`, `order_lines`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `returns`
- **Sahip:** `features/fulfillment` (karar: 00-genel 0016 `fulfillment.ts` içinde), şema `schema/fulfillment.ts`.
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 3; `05-sepet-ve-checkout.md` bölüm 1.1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `ret_` (karar: müşteri iadeyi hesabından açar, API'de görünür) |
| `order_id` | INTEGER FK | hayır | |
| `lines` | TEXT (JSON) | hayır | `[{order_line_id, quantity, restockable}]` (karar: satırlar iadeyle birlikte okunur/yazılır, süzülmez; ayrı `return_lines` yok. Satılabilir işareti satır başınadır, üst düzey `restockable` sütunu kaldırıldı) |
| `reason` | TEXT | evet | |
| `state` | TEXT | hayır | `requested` · `approved` · `received` · `rejected` |
| `kind` | TEXT | hayır | `withdrawal` · `other` |
| `notice_channel` | TEXT | evet | `form` · `email` · `written` (karar: 10 bölüm 3 "hesaptan form, e-posta veya yazılı") |
| `notice_at` | INTEGER | evet | bildirim zaman damgası |
| `return_code` | TEXT | evet | taşıyıcı app'inden gelen iade kargo kodu (karar: 10 bölüm 3) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(order_id)`; admin kuyruğu için `(state, created_at)` (karar: bekleyen iadeler listesi).
- **Kurallar:** Teslim alınınca satılabilir satırlar için stok `on_hand +`, ardından para iadesi ayrı adım. Cayma penceresi `delivered_at` ve sipariş anındaki ilke sürümüyle hesaplanır. İstisnalı satır müşteri formunda seçilemez. Durum geçişi koşulludur (`WHERE state = ?`). `returns.carrier` ve kişiselleştirme kuralı sütun değil, `legal_policy` / kanal ayarı anahtarıdır (karar: 10 bölüm 3 "`returns.carrier` ayarı").
- **İlişkiler:** `orders`, `refunds`, `stock_movements`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/fulfillment/queries/{requestReturn,receiveReturn}.ts`
- **Açık sorular:** —

### `digital_assets`
- **Sahip:** `features/fulfillment` (karar: dijital teslimatı bu özellik yürütür), şema `schema/media.ts` (00-genel 0007).
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 2, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `variant_id` | INTEGER FK | hayır | `product_variants` |
| `media_id` | INTEGER FK | hayır | özel kova |
| `version` | INTEGER | hayır | dosya sürümü (karar: belge adı korunur; iyimser kilit sayacı değildir, satır eşzamanlı düzenlenmez) |
| `label` | TEXT | evet | |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** `(variant_id, version)`; `(media_id)` (medya silme kontrolü). `public_id` yok (karar: varyant altında yönetilir, indirme hak üzerinden yapılır).
- **Kurallar:** Bir varyantın birden çok dosyası ve sürümü olabilir.
- **İlişkiler:** `product_variants`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `digital_entitlements`
- **Sahip:** `features/fulfillment`, şema `schema/fulfillment.ts` (00-genel 0016).
- **Kaynak:** `10-kargo-ve-teslimat.md` bölüm 2, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `ent_` (karar: `GET /shop/downloads/:entitlement_public_id`, 10 bölüm 7) |
| `order_line_id` | INTEGER FK | hayır | |
| `customer_id` | INTEGER FK | evet | misafirde boş |
| `media_id` | INTEGER FK | hayır | |
| `token_hash` | TEXT | hayır | yalnızca özet saklanır |
| `expires_at` | INTEGER | hayır | varsayılan 365 gün (ayar) |
| `download_limit` | INTEGER | hayır | varsayılan 5 (ayar) |
| `downloads` | INTEGER | hayır | varsayılan 0 |
| `revoked_at` | INTEGER | evet | |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: yönetici uzatma/sıfırlama satırı günceller) |

- **Anahtar ve indeksler:** benzersiz `public_id`, `token_hash`; `(order_line_id)`.
- **Kurallar:** İndirme koşullu artışla sayılır: `UPDATE ... SET downloads = downloads + 1 WHERE id = ? AND downloads < download_limit AND revoked_at IS NULL AND expires_at > ?` (karar: koşullu yazma kuralı; etkilenen satır 0 ise 403). İade ya da iptalde `revoked_at` dolar. Bağlantı ve jeton hiçbir zaman sipariş alanı olarak dönmez.
- **İlişkiler:** `order_lines`, `customers`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/fulfillment/queries/{grantEntitlements,consumeDownload,revokeForLine}.ts`
  - 10 bölüm 7 test listesi
  - yarış testi: son indirme hakkı
- **Açık sorular:** —

---

# 12. Müşteriler

### `customers`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2, 3, 8.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `cus_` |
| `email` | TEXT | hayır | anonimleştirmede `anon+<id>@invalid` |
| `email_normalized` | TEXT | hayır | küçük harf, kırpılmış; benzersiz |
| `email_verified_at` | INTEGER | evet | |
| `first_name`, `last_name` | TEXT | evet | |
| `company_name` | TEXT | evet | yalnızca görünen metin |
| `phone` | TEXT | evet | E.164 |
| `locale` | TEXT | evet | |
| `user_id` | INTEGER FK | evet | `users.id` (`01`); boşsa hesapsız (karar: `users.id` integer, `01` dosyası kararı) |
| `assigned_admin_id` | INTEGER FK | evet | `admin_users.id`; `access_policies` kapsamı `assigned_to` bunu okur (karar: politika kapsam sütunu) |
| `source` | TEXT | hayır | `checkout` · `register` · `admin` · `import` · `marketplace` |
| `state` | TEXT | hayır | `active` · `disabled` · `anonymized` |
| `default_shipping_address_id` | INTEGER FK | evet | |
| `default_billing_address_id` | INTEGER FK | evet | |
| `merged_into` | INTEGER FK self | evet | (karar: 11 bölüm 8 birleştirmede kaynak bu işareti alır) |
| `legal_hold` | INTEGER (bool) | hayır | varsayılan 0; 1 iken anonimleştirme durur (karar: 11 bölüm 17.1 "yasal tutma") |
| `deletion_requested_at` | INTEGER | evet | silme talebi; 10 gün sonra iş anonimleştirir, iptalde NULL (karar: 11 bölüm 17.1; 00-genel karar 9, ayrı kuyruk tablosu yok) |
| `custom_fields`, `metadata`, `private_metadata` | TEXT (JSON) | evet | |
| `created_by` | INTEGER FK | evet | `admin_users` |
| `version` | INTEGER | hayır | |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`, `email_normalized`; benzersiz `user_id` (kısmi, `WHERE user_id IS NOT NULL`; karar: bir hesap tek müşteri satırına bağlanır); listede sıralama için `(created_at)`; silme işi için kısmi `(deletion_requested_at) WHERE deletion_requested_at IS NOT NULL` (karar).
- **Kurallar:**
  - E-posta başına tek kayıt.
  - `user_id` yalnızca e-posta doğrulandıktan sonra bağlanır (`UPDATE ... WHERE user_id IS NULL`; karar: koşullu yazma, 11 bölüm 3).
  - Yumuşak silme (`deleted_at`) yok; silme anonimleştirmedir (karar: 11 bölüm 8 veri kurallarındaki genel kuraldan özeldir).
  - En çok 20 adres. Varsayılan adres değişikliği tek `atomic()`.
  - Anonimleştirme için açık sipariş, aktif abonelik ve bekleyen iade olmamalı.
  - İki tarafta da `user_id` varsa birleştirme reddedilir.
  - Tam e-posta ve telefon `customers:read_pii` ister; yoksa maskeli gösterilir.
- **İlişkiler:** `addresses`, `customer_stats`, `customer_spend`, `customer_tags`, `customer_notes`, `customer_group_members`, `customer_channels`, `consents`, `customer_consent_state`, `orders`, `carts`, `customer_search`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/queries/{findByEmail,createGuest,linkUser,anonymize,listCustomers}.ts`
  - 11 bölüm 16 test listesi
  - yarış testi: aynı e-postayla eşzamanlı misafir checkout (benzersiz indeks)
- **Açık sorular:** —

### `addresses`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2, 4.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `adr_` (karar: vitrin adres defteri API'si adresi kimlikle adresler) |
| `customer_id` | INTEGER FK | hayır | |
| `label` | TEXT | evet | |
| `first_name`, `last_name` | TEXT | evet | ad (karar: `customers` ile aynı iki sütun) |
| `company` | TEXT | evet | firma |
| `address_line1`, `address_line2` | TEXT | hayır / evet | |
| `city` | TEXT | hayır | (düzeltme: 11 bölüm 2 ve 00-genel ortak kural; önceki katalogda yoktu) |
| `region` | TEXT | evet | eyalet/il |
| `district` | TEXT | evet | ilçe vb. (düzeltme: `neighborhood` kaldırıldı; mahalle gibi ülkeye özgü alan ülke paketinin `custom_fields`'ı, 11 bölüm 4) |
| `postal_code` | TEXT | evet | |
| `country` | TEXT(2) | hayır | ISO 3166-1 alpha-2 (karar) |
| `phone` | TEXT | evet | E.164 |
| `tax_id` | TEXT | evet | KDV/VAT numarası; hassas |
| `tax_id_type` | TEXT | evet | |
| `custom_fields` | TEXT (JSON) | evet | ülkeye özgü alanlar (e-fatura modülü, ülke paketi) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(customer_id)`; ülke süzgeci için `(country)` (karar: 11 bölüm 6 süzgeç listesi; süzgeç varsayılan teslimat adresinden yapılır).
- **Kurallar:**
  - Müşteri başına en çok 20 adres: koşullu `INSERT ... SELECT ... WHERE (SELECT count(*) ...) < 20` (karar: koşullu yazma kuralı).
  - Ekleme ve silme müşterinin `version` sayacıyla korunur.
  - Varsayılan adres silinirse varsayılan alan temizlenir.
  - Anonimleştirmede adresler sert silinir. `tax_id` günlüğe ve ajana maskeli gider.
- **İlişkiler:** `customers`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/queries/{addAddress,removeAddress}.ts`
  - ülke başına adres doğrulama şeması (`Zod`, 11 bölüm 4); TR il/ilçe/mahalle verisi TR paketinin tohumudur, çekirdekte değil (karar: 11 bölüm 4)
- **Açık sorular:** —

### `customer_stats`
- **Sahip:** `features/customers`, şema `schema/read-model.ts` (00-genel 0018).
- **Kaynak:** `11-musteriler.md` bölüm 2, 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `customer_id` | INTEGER FK | hayır | PK |
| `orders_count` | INTEGER | hayır | |
| `paid_orders_count` | INTEGER | hayır | |
| `first_order_at`, `last_order_at` | INTEGER | evet | |
| `last_seen_at` | INTEGER | evet | |
| `updated_at` | INTEGER | hayır | son yeniden hesap (karar: gecelik uzlaştırma örneklemi için) |

- **Anahtar ve indeksler:** PK `customer_id`; listede sıralama için `(last_order_at)`, `(orders_count)`.
- **Kurallar:** Değerler artırılmaz, yeniden hesaplanır (idempotent). Kaynak olaylar `order.placed`, `order.paid`, `refund.settled`, `order.cancelled`.
- **İlişkiler:** `customers`, `orders`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/jobs/recomputeStats.ts`
  - test: çift ve sırasız olay
- **Açık sorular:** —

### `customer_spend`
- **Sahip:** `features/customers`, şema `schema/read-model.ts` (00-genel 0018).
- **Kaynak:** `11-musteriler.md` bölüm 2, 17 (karar 3).

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `customer_id` | INTEGER FK | hayır | |
| `currency` | TEXT(3) | hayır | |
| `total_paid` | INTEGER | hayır | |
| `total_refunded` | INTEGER | hayır | |
| `updated_at` | INTEGER | hayır | (karar: `customer_stats` ile aynı) |

- **Anahtar ve indeksler:** PK `(customer_id, currency)`; harcamaya göre sıralama ve akıllı kural için ifade indeksi `(currency, total_paid - total_refunded)` (karar: 11 karar 3 arayüz ve kural net değeri kullanır).
- **Kurallar:** Kur dönüşümü yapılmaz. Gösterilen değer `paid - refunded`.
- **İlişkiler:** `customers`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `customer_tags`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2, 17 (karar 4).

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `customer_id` | INTEGER FK | hayır | |
| `tag` | TEXT | hayır | kırpılmış, küçük harf |

- **Anahtar ve indeksler:** PK `(customer_id, tag)`; süzgeç ve otomatik tamamlama için `(tag)`.
- **Kurallar:** Yeniden adlandırma ve birleştirme toplu iştir. Anonimleştirmede kişisel metin silinir.
- **İlişkiler:** `customers`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `customer_notes`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `cnt_` (karar: admin notu sabitler/siler, API kimliği gerekir) |
| `customer_id` | INTEGER FK | hayır | |
| `author_id` | INTEGER FK | hayır | `admin_users` |
| `body` | TEXT | hayır | en çok 5000 karakter (karar: `order_notes` ile aynı sınır) |
| `pinned` | INTEGER (bool) | hayır | |
| `created_at`, `updated_at` | INTEGER | hayır | (karar: sabitleme satırı günceller) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(customer_id, created_at)`.
- **Kurallar:** Anonimleştirmede kişisel metin silinir.
- **İlişkiler:** `customers`, `admin_users`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `customer_groups`
- **Sahip:** `features/customers`, şema `schema/customers.ts` (00-genel 0011).
- **Kaynak:** `11-musteriler.md` bölüm 2, 5.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `cgr_` (karar: önek listede yok) |
| `name` | TEXT | hayır | |
| `description` | TEXT | evet | |
| `kind` | TEXT | hayır | `manual` · `smart` |
| `rule` | TEXT (JSON) | evet | kapalı şema; en çok 12 koşul, 2 düzey |
| `affects_commerce` | INTEGER (bool) | hayır | |
| `rule_version` | INTEGER | hayır | |
| `last_evaluated_at` | INTEGER | evet | |
| `metadata` | TEXT (JSON) | evet | |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`.
- **Kurallar:** En çok 20 akıllı grup. Akıllı grubun üyeleri elle düzenlenemez. Kural değişince `rule_version` artar ve toplu iş başlar.
- **İlişkiler:** `customer_group_members`, `price_list_targets`, `tax_rates`, promosyon koşulları.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/groups/compileRule.ts` (kuralı SQL'e derler) ve üç kullanımı
  - test: üç kullanımın aynı kümeyi vermesi
- **Açık sorular:** —

### `customer_group_members`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2, 5.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `group_id` | INTEGER FK | hayır | |
| `customer_id` | INTEGER FK | hayır | |
| `source` | TEXT | hayır | `manual` · `rule` |
| `added_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(group_id, customer_id)`; `(customer_id)`.
- **Kurallar:** Bir müşterinin ticari grup sayısı en çok 50. Ticari grupta üyelik değişince yalnızca o müşterinin oturum `version` sayacı artar.
- **İlişkiler:** `customer_groups`, `customers`.
- **Yapılacaklar:**
  - şema
  - migration
  - test: `affects_commerce` olmayan grupta oturumun değişmemesi
- **Açık sorular:** —

### `consents`
- **Sahip:** `features/customers`, şema `schema/customers.ts` (00-genel 0011).
- **Kaynak:** `11-musteriler.md` bölüm 2, 8, 9; `15-bildirimler.md` bölüm 5, 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `customer_id` | INTEGER FK | hayır | |
| `channel` | TEXT | hayır | `email` · `sms` · `call` · `push` |
| `purpose` | TEXT | hayır | `marketing` · `analytics` |
| `status` | TEXT | hayır | `granted` · `withdrawn` |
| `source` | TEXT | hayır | `checkout` · `account` · `admin` · `import` · `unsubscribe` · `bounce` (karar: 11 bölüm 9 kaynak listesi; `bounce` = 15 bölüm 6 kalıcı geri dönen adres, pazarlama iznini `withdrawn` yapar) |
| `reason` | TEXT | evet | `source = admin` iken zorunlu (karar: 11 bölüm 9 "gerekçe zorunlu") |
| `text_version` | TEXT | evet | onaylanan metin sürümü; `bounce`/`import` satırında boş olabilir (karar: 11 bölüm 9) |
| `ip_hash` | TEXT | evet | ham IP saklanmaz |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** `(customer_id, created_at)`.
- **Kurallar:** Yalnızca eklenir. Anonimleştirmeden sonra kanıt olarak kalır. Taşımada kayıt yoksa müşteri izinsiz sayılır.
- **İlişkiler:** `customers`, `customer_consent_state`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/queries/recordConsent.ts`
- **Açık sorular:** —

### `customer_consent_state`
- **Sahip:** `features/customers`, şema `schema/customers.ts`.
- **Kaynak:** `11-musteriler.md` bölüm 2, 8, 9.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `customer_id` | INTEGER FK | hayır | |
| `channel` | TEXT | hayır | |
| `purpose` | TEXT | hayır | |
| `status` | TEXT | hayır | |
| `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(customer_id, channel, purpose)`; pazarlama izni süzgeci için `(channel, purpose, status)` (karar: 11 bölüm 6 "pazarlama izni" süzgeci).
- **Kurallar:** `consents` yazımıyla aynı `atomic()` içinde güncellenir. Birleştirmede daha kısıtlayıcı durum geçerli olur.
- **İlişkiler:** `customers`, `consents`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `customer_merges`
- **Sahip:** `features/customers`, şema `schema/reports.ts` (00-genel 0021).
- **Kaynak:** `11-musteriler.md` bölüm 2, 8, 17.1; 00-genel karar 9.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `kind` | TEXT | hayır | `merge` · `erasure` (karar: 00-genel karar 9; 17.1 imha kaydı ayrı tablo açılmadan burada) |
| `source_customer_id` | INTEGER FK | hayır | birleştirmede kaynak, imhada anonimleştirilen müşteri |
| `target_customer_id` | INTEGER FK | evet | yalnızca `merge` (karar) |
| `moved` | TEXT (JSON) | hayır | taşınanlar; imhada silinen alan adları (değer değil) |
| `admin_id` | INTEGER FK | evet | `admin_users`; müşteri kendi hesabını sildiyse boş (karar: 11 bölüm 8) |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** `(target_customer_id)`, `(source_customer_id)`; saklama süpürmesi için `(kind, created_at)` (karar).
- **Kurallar:** Geri alınamaz. Toplu parçalar halinde yürür. `erasure` satırı en az 3 yıl saklanır (11 bölüm 17.1, süre ayar); satırda kişisel veri yoktur.
- **İlişkiler:** `customers`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/customers/merge/mergeCustomers.ts`
  - test (11 bölüm 16)
- **Açık sorular:** —

### `customer_exports`
- **Sahip:** `features/customers`, şema `schema/reports.ts` (00-genel 0021).
- **Kaynak:** `11-musteriler.md` bölüm 2, 8, 10; 00-genel karar 9.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `cex_` (karar: arayüz iş durumunu ve indirmeyi bu kimlikle izler) |
| `kind` | TEXT | hayır | `admin_csv` · `subject_access` (karar: 00-genel karar 9, "verilerimi indir" aynı tablo) |
| `admin_id` | INTEGER FK | evet | `admin_users`; `admin_csv`'de dolu |
| `customer_id` | INTEGER FK | evet | `subject_access`'te veri sahibi |
| `filter` | TEXT (JSON) | evet | süzgeç ya da seçili kimlikler; `subject_access`'te boş |
| `fields` | TEXT (JSON) | evet | seçilen alanlar (karar: 11 bölüm 10 "hangi alanlar seçilir") |
| `status` | TEXT | hayır | `pending` · `running` · `done` · `failed` (karar: iş durumu) |
| `r2_key` | TEXT | evet | özel kova |
| `finished_at` | INTEGER | evet | |
| `download_count` | INTEGER | hayır | varsayılan 0 |
| `download_limit` | INTEGER | hayır | (karar: 11 bölüm 10 "indirme sayısı sınırlı"; varsayılan ayar) |
| `expires_at` | INTEGER | evet | bitişten 24 saat sonra (karar: 11 bölüm 10 varsayılan) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(admin_id, created_at)`, `(customer_id, created_at)` (karar: iş listeleri).
- **Kurallar:** İndirme `UPDATE ... SET download_count = download_count + 1 WHERE id = ? AND download_count < download_limit AND expires_at > ?` ile sayılır (karar: koşullu yazma). Süre dolunca 404 döner. Her dışa aktarma denetim kaydına da yazılır.
- **İlişkiler:** `admin_users`, `customers`.
- **Yapılacaklar:**
  - şema
  - migration
  - iş `exportCustomers`, iş `exportSubjectData`
- **Açık sorular:** —

### `customer_search`
- **Sahip:** `features/customers`, şema `schema/read-model.ts` (00-genel 0018; FTS5, ham SQL migration).
- **Kaynak:** `11-musteriler.md` bölüm 2, 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `email`, `name`, `phone_digits`, `company_name` | TEXT (FTS5) | | e-posta, ad, telefon (yalnızca rakamlar), şirket adı |
| `phone_reversed` | TEXT (FTS5) | | ters çevrilmiş telefon rakamları (karar: FTS5 önek araması bu sütunda telefon sonek aramasını karşılar, 11 bölüm 6) |
| `rowid` | INTEGER | | `customers.id` |

- **Anahtar ve indeksler:** FTS5; önek araması.
- **Kurallar:** Müşteri yazımıyla aynı `atomic()` içinde güncellenir. Anonimleştirmede satır silinir (karar: 11 bölüm 8 kişisel veri silinir).
- **İlişkiler:** `customers`.
- **Yapılacaklar:**
  - migration
  - `features/customers/queries/searchCustomers.ts`
- **Açık sorular:** —

---

# 13. Medya

### `media`
- **Sahip:** `features/media`, şema `schema/media.ts`.
- **Kaynak:** `12-medya.md`; `05-sepet-ve-checkout.md` bölüm 1.1; sütun adlarının bir kısmı yol haritası madde 364'ten.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `med_` (karar: `POST /shop/uploads/:id/confirm` ve bölüm ayarlarındaki "medya kimliği" API'ye çıkar; iç `id` çıkamaz) |
| `status` | TEXT | hayır | `pending` · `ready` · `rejected` (karar: 12 onaylı değeri adlandırmıyor; `ready`) |
| `bucket` | TEXT | hayır | `public` · `private` |
| `key` | TEXT | hayır | içerik özetli yol |
| `mime` | TEXT | evet | |
| `bytes` | INTEGER | evet | (karar: 12 onayda HEAD ile boyut okunur, sınır denetimi) |
| `width`, `height` | INTEGER | evet | |
| `sizes` | TEXT (JSON) | evet | üretilen genişlik merdiveni, ör. `[320, 640, 1000]` (karar: 12 "sabit genişlik merdiveni"; işleyici yoksa NULL) |
| `owner_kind`, `owner_id` | TEXT / INTEGER | evet | `cart` · `order`; kişiselleştirme görselinin sahibi |
| `poster_media_id` | INTEGER FK self | evet | video kapağı |
| `created_at`, `updated_at` | INTEGER | hayır | onaysızlar `created_at`'ten 1 saat sonra süpürülür; onay `updated_at` yazar |

- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz `(bucket, key)` (karar: anahtar içerik özetlidir, aynı yol iki kayıt olamaz); süpürme için `(status, created_at)`; `(owner_kind, owner_id)`.
- **Kurallar:**
  - Silme tek ifadedir: `DELETE ... WHERE NOT EXISTS (kullanımlar)`.
  - Sınırlar varsayılan 10 MB ve 8000 px. SVG kabul edilmez. Tür sihirli sayıyla doğrulanır.
  - Satın alınmayan sepetin görselleri silinir. Siparişe geçen görsel anonimleştirmede silinir.
- **İlişkiler:** `product_assets`, `cart_lines`, `order_lines`, `digital_assets`, `digital_entitlements`, `fulfillments` (etiket), `posts` (kapak), `sections` (referans).
- **Yapılacaklar:**
  - şema
  - migration
  - `features/media/queries/{createPending,confirm,deleteIfUnused,sweepPending}.ts`
  - yarış testi: "ata + sil"
- **Açık sorular:** `NOT EXISTS` kullanım listesi FK'li tablolar için kapalıdır: `product_assets`, `cart_lines`, `order_lines`, `digital_assets`, `digital_entitlements`, `fulfillments.label_media_id`, `posts.cover_media_id`, `media.poster_media_id`. (açık: JSON içindeki referanslar, `sections.settings`, kanal logosu, tema ayarları, tek SQL ifadesinde denetlenemez; ayrı kullanım tablosu mu, `json_each` taraması mı belgede yok.)

---

# 14. İçerik ve gezinme

### `pages`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1, 5, 7; `14-seo.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `pag_` (karar: admin ve harici CMS API'si sayfayı kimlikle yazar, 13 bölüm 7) |
| `channel_id` | INTEGER FK | hayır | |
| `status` | TEXT | hayır | `draft` · `published` |
| `published_at` | INTEGER | evet | ileri tarihli yayın |
| `robots` | TEXT | evet | (karar: 14 bölüm 3; dile bağlı değil) |
| `version` | INTEGER | hayır | hem eşzamanlı düzenleme sayacı hem siparişe yazılan metin sürümü; her kayıtta artar (karar: 13 bölüm 1 "onaylanan metnin sürümü") |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; zamanlanmış yayın için `(status, published_at)` (karar: 13 bölüm 5 zamanlanmış görev).
- **Kurallar:** Slug, başlık, gövde (Markdown) ve `seo_title`/`seo_description` çeviri tablosundadır. Yasal rol ve ana sayfa rolü kanal ayarındadır. Her değişiklik `page:<id>` etiketini temizler. Sürüm geçmişi yoktur; sipariş `(page_id, version)` anlık görüntüsü taşır.
- **İlişkiler:** `page_translations`, `sections`, `channels`, `menu_items`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/pages/queries/{getPageBySlug,publishScheduled}.ts`
  - sorgu planı testi
- **Açık sorular:** (açık: sürüm geçmişi v1'de yok, 13 bölüm 5; siparişin onayladığı eski yasal metnin tam içeriği nerede gösterilecek belgede yok. Denetim kaydı yalnız önce/sonra özeti tutar.)

### `page_translations`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1 ("çeviri tablosuyla").

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `page_id` | INTEGER FK | hayır | |
| `channel_id` | INTEGER FK | hayır | `pages.channel_id`'nin kopyası (karar: 14 bölüm 1 slug `(kanal, dil)` içinde benzersiz; benzersiz indeks join'le kurulamaz) |
| `lang` | TEXT | hayır | |
| `slug`, `title` | TEXT | hayır | |
| `body` | TEXT | evet | Markdown |
| `seo_title`, `seo_description` | TEXT | evet | (karar: 14 bölüm 3 ad olarak veriyor; dile bağlı) |
| `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(page_id, lang)`; benzersiz `(channel_id, lang, slug)` (vitrin araması tek indeksle, join yok).
- **Kurallar:** Slug değişince aynı `atomic()` içinde otomatik 301 yazılır. `channel_id` sayfayla aynı `atomic()` içinde yazılır; sayfanın kanalı değişmez.
- **İlişkiler:** `pages`, `redirects`.
- **Yapılacaklar:**
  - şema
  - migration
  - sorgu planı testi
- **Açık sorular:** —

### `posts`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `pst_` (karar: `pages` ile aynı gerekçe) |
| `channel_id` | INTEGER FK | hayır | |
| `status` | TEXT | hayır | `draft` · `published` |
| `published_at` | INTEGER | evet | |
| `author` | TEXT | evet | serbest metin yazar adı (karar: 13 bölüm 1 "yazar"; yönetici FK değil) |
| `cover_media_id` | INTEGER FK | evet | kapak görseli |
| `robots` | TEXT | evet | (karar: `pages` ile aynı) |
| `version` | INTEGER | hayır | eşzamanlı düzenleme |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; blog listesi için `(channel_id, status, published_at)` (karar: 13 bölüm 5 yayın sırası).
- **Kurallar:** `pages` ile aynı. Slug, başlık, gövde, özet (`excerpt`) ve SEO alanları `post_translations(post_id, channel_id, lang, slug, title, body, excerpt, seo_title, seo_description, updated_at)` tablosundadır (karar: çevrilebilir alan kuralı ve `page_translations` kalıbı; tanımı sondaki listede).
- **İlişkiler:** `post_tags`, `media`, `post_translations`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `post_tags`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `post_id` | INTEGER FK | hayır | |
| `tag` | TEXT | hayır | serbest metin, kırpılmış ve küçük harf (karar: `customer_tags` kalıbı, 11 karar 4) |

- **Anahtar ve indeksler:** PK `(post_id, tag)`; etiket sayfası için `(tag)` (karar).
- **Kurallar:** Etiket ayrı varlık değildir (karar: belge yalnızca tablo adı veriyor; en küçük model).
- **İlişkiler:** `posts`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `menus`
- **Sahip:** `features/pages`, şema `schema/content.ts` (00-genel 0019).
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `channel_id` | INTEGER FK | hayır | |
| `code` | TEXT | hayır | `header`, `footer` … |
| `source` | TEXT | hayır | `manual` (varsayılan) · `collections` (karar: 13 bölüm 3 "koleksiyon ağacından otomatik menü bir kaynak seçeneğidir") |
| `version` | INTEGER | hayır | (karar: menü ağacı bütün olarak yazılır, eşzamanlı düzenleme korunur) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `(channel_id, code)`; API menüyü `code` ile adresler, `public_id` yok (karar). Bellekte tutulur.
- **Kurallar:** Değişiklik `menu:<id>` ve `shell` etiketlerini temizler.
- **İlişkiler:** `menu_items`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `menu_items`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `menu_id` | INTEGER FK | hayır | |
| `parent_id` | INTEGER FK self | evet | ağaç yapısı |
| `position` | INTEGER | hayır | |
| `target_type` | TEXT | hayır | `collection` · `product` · `page` · `post` · `url` |
| `target_id` | INTEGER | evet | `url` dışında dolu; çok biçimli, FK yok |
| `url` | TEXT | evet | yalnızca `target_type = url` |

- **Anahtar ve indeksler:** `(menu_id, parent_id, position)`. `public_id` yok (karar: ağaç `menus` üzerinden bütün olarak yazılır).
- **Kurallar:** Hedef silindiyse ya da yayından kalktıysa öğe render edilmez. Etiket `menu_item_translations(menu_item_id, lang, label)` tablosundadır; çeviri yoksa hedefin adı kullanılır (karar: çevrilebilir alan kuralı; tanımı sondaki listede).
- **İlişkiler:** `menus`, `menu_item_translations` ve hedef tablolar.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `sections`
- **Sahip:** `features/pages`, şema `schema/content.ts`.
- **Kaynak:** `13-icerik-ve-gezinme.md` bölüm 1, 2, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `page_id` | INTEGER FK | hayır | (karar: ana sayfa da bir `pages` satırıdır; kanal ayarında `home` rolüyle işaretlenir, yasal rol kalıbı, 13 bölüm 1-2 "Sayfa = sıralı bölüm listesi") |
| `position` | INTEGER | hayır | |
| `type` | TEXT | hayır | temada tanımlı bölüm türü |
| `settings` | TEXT (JSON) | hayır | yalnızca referans taşır (`public_id`, medya `public_id`) |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** `(page_id, position)`. `public_id` yok (karar: bölüm listesi sayfa üzerinden bütün olarak yazılır, harici CMS de böyle yazar, 13 bölüm 7).
- **Kurallar:** Ayarlar temadaki Zod şemasıyla doğrulanır. Sayfa bütün referansları tek `batch` ile çözer. Liste yazımı sayfanın `version`'ıyla korunur.
- **İlişkiler:** `pages`, `media`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** (açık: taslak önizleme var, 13 bölüm 2 ve `07-istemciler/04-tema-sistemi.md`, ama taslak bölümlerin nerede tutulduğu, ayrı satır mı, ayrı sütun mu, belgede yok. Önceki katalogdaki uydurma `status` sütunu kaldırıldı.)

### `redirects`
- **Sahip:** `features/pages` (karar: `features/seo` klasörü yok; yönlendirme içerik/slug yazımıyla birlikte yaşar), şema `schema/content.ts` (00-genel 0019).
- **Kaynak:** `14-seo.md` bölüm 2; `13-icerik-ve-gezinme.md` bölüm 1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `rdr_` (karar: admin elle ekler/siler, içe aktarır) |
| `channel_id` | INTEGER FK | hayır | |
| `from_path` | TEXT | hayır | |
| `to_path` | TEXT | evet | yalnızca `status = 410` iken boş (karar: 14 bölüm 2 silinen ürün "301 veya 410"; aynı tablo) |
| `status` | INTEGER | hayır | 301 · 302 · 410 |
| `hits` | INTEGER | hayır | varsayılan 0 |
| `source` | TEXT | hayır | `auto` · `manual` · `import` |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz `(channel_id, from_path)`; zincir düzeltmesi için `(channel_id, to_path)`.
- **Kurallar:**
  - Slug güncellemesiyle aynı `atomic()` içinde yazılır.
  - Zincir oluşmaz: eski hedefe işaret eden satırlar yeni hedefe güncellenir.
  - Yalnızca 404 olacak istekte sorgulanır (14 bölüm 2).
  - `hits` yanıt döndükten sonra (`waitUntil`) tek `UPDATE ... SET hits = hits + 1` ile artar (karar: yalnızca 404 yolunda çalıştığı için sıcak yol değil; yanıtı bekletmez).
- **İlişkiler:** `product_translations`, `collection_translations`, `page_translations`, `post_translations`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/pages/queries/{findRedirect,upsertAutoRedirect}.ts`
  - test: zincirsiz yönlendirme
- **Açık sorular:** —

---

# 15. Bildirimler

### `notification_types` (tablo değil: kodda sabit liste)
- **Sahip:** `features/notify`, dosya `features/notify/types.ts`. Şema dosyası ve migration yok (00-genel karar 2).
- **Kaynak:** `15-bildirimler.md` bölüm 1 ("kodda tanımlı"), 2, 5.

| alan (TypeScript) | tür | açıklama |
|---|---|---|
| `code` | `string` | tür kimliği; `notification_templates.type_code`, `notification_settings.type_code`, `notification_log.type_code` buna başvurur |
| `event` | `string` | tetikleyen olay |
| `recipientResolver` | işlev | alıcıyı çözer |
| `dataSchema` | Zod şeması | şablon verisi |
| `transports` | `Transport[]` | desteklenen iletim kanalları (`email · sms · push · admin · webhook`) |
| `marketing` | `boolean` | işlemsel / pazarlama (karar: 15 bölüm 5 ayrımı izin denetimini belirler) |

- **Kurallar:** Built-in app'ler kendi modül kodunda tür kaydeder (15 bölüm 2); kimlik çakışması açılışta hata verir. Tablolarda `type_code` için FK yoktur; yazımda kod listesine karşı doğrulanır. Tür listeden kalkarsa ilgili şablon ve ayar satırları yok sayılır.
- **İlişkiler:** `notification_templates`, `notification_settings`, `notification_log` (kod düzeyinde).
- **Yapılacaklar:**
  - `features/notify/types.ts`
  - test: her türün örnek veriyle render'ı (15 bölüm 8)
- **Açık sorular:** —

### `notification_templates`
- **Sahip:** `features/notify`, şema `schema/notify.ts` (00-genel 0020).
- **Kaynak:** `15-bildirimler.md` bölüm 1, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `type_code` | TEXT | hayır | kodda tanımlı tür (00-genel karar 2; FK yok) |
| `transport` | TEXT | hayır | `email` · `sms` · `push` · `admin` · `webhook` (karar: 15 bölüm 1 kanal listesi) |
| `channel_id` | INTEGER FK | hayır | satış kanalı |
| `lang` | TEXT | hayır | |
| `subject` | TEXT | evet | SMS/push'ta boş |
| `body` | TEXT | hayır | |
| `default_version` | INTEGER | hayır | düzenlendiği andaki yerleşik şablon sürümü; yerleşik sürüm büyükse admin "varsayılan değişti" notu görür (karar: 15 bölüm 3) |
| `version` | INTEGER | hayır | eşzamanlı düzenleme |
| `created_at`, `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `(type_code, transport, channel_id, lang)`; API bu dörtlü anahtarla adresler, `public_id` yok (karar).
- **Kurallar:** Satır yoksa yerleşik varsayılan kullanılır. Düzenlenmiş şablona sürüm güncellemesi dokunmaz.
- **İlişkiler:** `channels`.
- **Yapılacaklar:**
  - şema
  - migration
  - render testi (tüm diller)
- **Açık sorular:** —

### `notification_settings`
- **Sahip:** `features/notify`, şema `schema/notify.ts` (00-genel 0020).
- **Kaynak:** `15-bildirimler.md` bölüm 1, 7.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `channel_id` | INTEGER FK | hayır | |
| `type_code` | TEXT | hayır | kodda tanımlı tür (FK yok) |
| `transport` | TEXT | hayır | `notification_templates.transport` değerleri |
| `enabled` | INTEGER (bool) | hayır | |
| `updated_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(channel_id, type_code, transport)`.
- **Kurallar:** Satır yoksa türün koddaki varsayılanı geçerlidir (karar: şablon tablosuyla aynı "boşsa yerleşik" kuralı). Gönderen adı ve adresi bu tabloda değil, kanal kapsamlı `settings` anahtarıdır (karar: 15 bölüm 7 tür başına değil satış kanalı başına).
- **İlişkiler:** `channels`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `notification_log`
- **Sahip:** `features/notify`, şema `schema/notify.ts` (00-genel 0020).
- **Kaynak:** `15-bildirimler.md` bölüm 1, 5, 6, 8; `11-musteriler.md` bölüm 7 (zaman çizelgesinde gönderilen e-postalar).

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `channel_id` | INTEGER FK | hayır | satış kanalı (karar: kanal başına rol süzgeci) |
| `customer_id` | INTEGER FK | evet | müşteri zaman çizelgesi için (karar: 11 bölüm 7); yönetici/webhook alıcısında boş |
| `recipient_masked` | TEXT | hayır | maskeli alıcı |
| `type_code` | TEXT | hayır | kodda tanımlı tür |
| `transport` | TEXT | hayır | |
| `status` | TEXT | hayır | `sent` · `failed` · `no_provider` · `suppressed` (karar: 15 bölüm 6 "gönderilmedi (sağlayıcı yok)" = `no_provider`, hata sayılmaz; izin yok/kalıcı geri dönüş = `suppressed`) |
| `provider_id` | TEXT | evet | sağlayıcının ileti kimliği |
| `outbox_id` | INTEGER | hayır | `outbox.id`; FK değil, outbox satırı 7 gün sonra silinir (00-genel karar 8) |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `(outbox_id)` (karar: 15 bölüm 6 sağlayıcı idempotency anahtarı = outbox satır kimliği; aynı olayın ikinci teslimatı tek ileti); `(created_at)`; `(customer_id, created_at)`.
- **Kurallar:** Kişisel veri maskelenir. Kalıcı geri dönen adres `consents`'e `source = bounce`, `status = withdrawn` satırı yazar (karar, `consents`'e bakın); bu tabloda işaret yok.
- **İlişkiler:** `outbox` (`01`), `channels`, `customers`.
- **Yapılacaklar:**
  - şema
  - migration
  - test: maskeleme; aynı olayın iki teslimatında tek ileti
- **Açık sorular:** (açık: saklama süresi belgede yok; süpürme işi ve süre ayarı tanımlanmalı.)

---

# 16. Raporlama

### `stats_daily_sales`
- **Sahip:** `features/reports` (karar: yeni klasör; yol haritasında yok, eklenmeli), şema `schema/reports.ts` (00-genel 0021).
- **Kaynak:** `16-raporlama.md` bölüm 2, 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | `YYYY-MM-DD`, kanalın saat dilimine göre takvim günü (karar: an değil takvim günü; metin sıralanabilir, dönüşüm yazımda bir kez yapılır. Tüm `stats_daily_*` tablolarında aynı) |
| `channel_id` | INTEGER FK | hayır | |
| `currency` | TEXT(3) | hayır | |
| `orders_count` | INTEGER | hayır | |
| `gross`, `discount`, `net`, `tax`, `shipping`, `refund_amount` | INTEGER | hayır | |
| `refund_count` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(day, channel_id, currency)`.
- **Kurallar:** Değerler `ON CONFLICT DO UPDATE` ile artırılır. Sipariş `atomic()`'i içinde değildir. Gecelik doğrulama farkı düzeltir. Kişisel veri yoktur.
- **İlişkiler:** `stats_applied_events`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/reports/jobs/{applyEvent,nightlyVerify,rebuild}.ts`
  - 16 bölüm 8 testleri
- **Açık sorular:** —

### `stats_daily_products`
- **Sahip:** `features/reports`, şema `schema/reports.ts`.
- **Kaynak:** `16-raporlama.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | `stats_daily_sales` ile aynı |
| `channel_id` | INTEGER FK | hayır | |
| `variant_id` | INTEGER FK | hayır | |
| `currency` | TEXT(3) | hayır | (düzeltme: `net` para tutarı; 16 bölüm 2 "farklı para birimleri toplanmaz") |
| `quantity` | INTEGER | hayır | |
| `net` | INTEGER | hayır | |
| `refund_quantity` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(day, channel_id, variant_id, currency)`.
- **Kurallar:** `stats_daily_sales` ile aynı.
- **İlişkiler:** `channels`, `product_variants`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `stats_daily_customers`
- **Sahip:** `features/reports`, şema `schema/reports.ts`.
- **Kaynak:** `16-raporlama.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | `stats_daily_sales` ile aynı |
| `channel_id` | INTEGER FK | hayır | |
| `new_customers`, `returning_customers`, `guest_orders` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(day, channel_id)`.
- **Kurallar:** "Misafir siparişi" = sipariş anında müşterinin `user_id`'si boş (hesapsız) olan sipariş (karar: 11 bölüm 3 tek kayıt modeli; ayrı misafir kaydı yok).
- **İlişkiler:** `channels`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `stats_daily_b2b`
- **Sahip:** `features/reports`, şema `schema/reports.ts`.
- **Kaynak:** `16-raporlama.md` bölüm 2, 6.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | siparişin kanalının saat dilimine göre |
| `channel_id` | INTEGER FK | hayır | (düzeltme: "gün" kanal saat dilimine bağlı ve 16 bölüm 6 kanal başına rol süzgeci ister) |
| `company_id` | INTEGER FK | hayır | `companies` (`03`) |
| `currency` | TEXT(3) | hayır | (düzeltme: `net` ve `open_balance` para tutarı) |
| `orders_count` | INTEGER | hayır | |
| `net` | INTEGER | hayır | |
| `open_balance` | INTEGER | hayır | gün sonu açık bakiye anlık görüntüsü |

- **Anahtar ve indeksler:** PK `(day, channel_id, company_id, currency)`.
- **Kurallar:** `stats_daily_sales` ile aynı.
- **İlişkiler:** `channels`, `companies`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** —

### `stats_daily_funnel`
- **Sahip:** `features/reports`, şema `schema/reports.ts`.
- **Kaynak:** `16-raporlama.md` bölüm 2.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `day` | TEXT | hayır | `stats_daily_sales` ile aynı |
| `channel_id` | INTEGER FK | hayır | |
| `sessions`, `add_to_cart`, `checkout_started`, `orders` | INTEGER | hayır | |

- **Anahtar ve indeksler:** PK `(day, channel_id)`.
- **Kurallar:** Değerler müşteri olaylarından gelir.
- **İlişkiler:** `channels`.
- **Yapılacaklar:**
  - şema
  - migration
- **Açık sorular:** (açık: "müşteri olayları"nın kaynağı, Pixel mi sunucu olayı mı, ve oturum sayısının nasıl sayılacağı belgede yok.)

### `stats_applied_events`
- **Sahip:** `features/reports`, şema `schema/reports.ts`.
- **Kaynak:** `16-raporlama.md` bölüm 3.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `event_id` | INTEGER | hayır | `outbox.id` (karar: `01` outbox'ta olay kimliği satır kimliğidir) |
| `applied_at` | INTEGER | hayır | (karar: süpürme için) |

- **Anahtar ve indeksler:** PK `event_id`; `(applied_at)`.
- **Kurallar:** Özet artışıyla aynı `atomic()` içinde yazılır; artış `WHERE NOT EXISTS` ya da `INSERT OR IGNORE` sonucuna bağlanır. 30 günden eski satırlar silinir (karar: outbox `sent` satırları 7 günde silinir, 00-genel karar 8; daha eski olay yeniden teslim edilemez, kalan sapmayı gecelik doğrulama düzeltir).
- **İlişkiler:** `outbox` (FK değil).
- **Yapılacaklar:**
  - şema
  - migration
  - test: çift işleme
- **Açık sorular:** —

---

# 17. Belgeler

### `documents`
- **Sahip:** `features/documents` (karar: yeni klasör; yol haritasında yok, eklenmeli), şema `schema/reports.ts` (00-genel 0021).
- **Kaynak:** `17-belgeler.md`; `05-sepet-ve-checkout.md` bölüm 1.1.

| ad | tür | boş olabilir mi | açıklama |
|---|---|---|---|
| `id` | INTEGER | hayır | PK |
| `public_id` | TEXT | hayır | `doc_` (karar: müşteri kendi siparişinin belgesini indirir, API'ye çıkar) |
| `order_id` | INTEGER FK | hayır | |
| `kind` | TEXT | hayır | `order_summary` · `packing_slip` · `delivery_note` · `return_label` (karar: 17 karar tablosundaki dört belge) |
| `version` | INTEGER | hayır | belge sürümü (karar: belge adı; iyimser kilit değil, satır yazıldıktan sonra değişmez) |
| `content_hash` | TEXT | hayır | |
| `r2_key` | TEXT | hayır | özel kova |
| `created_at` | INTEGER | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz `(order_id, kind, version)`.
- **Kurallar:** Sipariş değişince yeni sürüm üretilir, eskisi kalır. `content_hash` son sürümle aynıysa yeni sürüm yazılmaz (karar: değişmeyen içerik sürüm çoğaltmasın). Sürüm `INSERT ... SELECT coalesce(max(version), 0) + 1 ...` ile, benzersiz indeks yarışı keser. Erişim: müşteri yalnızca kendi siparişinin belgesini görür; admin `orders:read` ister. Resmî fatura bu tabloda değil (`invoices`, `03`).
- **İlişkiler:** `orders`.
- **Yapılacaklar:**
  - şema
  - migration
  - `features/documents/queries/{createVersion,latestForOrder}.ts`
- **Açık sorular:** —

---

## Belgelerde adı geçip tanımı olmayan tablolar

| Ad / kavram | Geçtiği yer | Durum |
|---|---|---|
| `promotion_channels`, `shipping_method_channels`, `payment_method_channels`, `stock_location` ve rol kanal bağlantıları | 01 bölüm 2 (`<varlık>_channels`), veri kuralları bölüm 4 | Denetim B: `promotion_channels(promotion_id, channel_id)` ve `shipping_method_channels(shipping_method_id, channel_id)` adları karar, PK iki sütun, ek indeks `(channel_id)`; tablo bölümü yazılmalı, 00-genel 0010/0012 listesine eklenmeli. Rol kanal bağlantısı 00-genel karar 1 ile kalktı (`admin_role_assignments.channel_id`) |
| Ürün/varyant–özellik değeri bağlantısı | 02 bölüm 1 ("ürün veya varyanta bağlanır") | kapandı (2026-11-13): `product_facet_values`, `variant_facet_values` |
| Varyant–seçenek değeri bağlantısı | 02 bölüm 1 ("seçenek değerleri kombinasyonu") | kapandı (2026-11-13): `variant_option_values` |
| Diğer `*_translations` (varyant, seçenek, özellik, yazı, menü öğesi) | 02 bölüm 1, 13 bölüm 1 | Denetim B: `post_translations` (sütunlar `posts` kurallarında) ve `menu_item_translations(menu_item_id, lang, label)` karar; tablo bölümü yazılmalı, 00-genel 0019 listesine eklenmeli. Varyant/seçenek/özellik ilk yarının işi |
| Elle koleksiyon üyeliği | 02 bölüm 1 | belgede yok |
| Sipariş numarası sayaç tablosu | 07 bölüm 6 ("sayaç satırı") | kapandı: `order_number_counters`, 0017 |
| Sipariş düzeltme kaydı (fark satırları) | 07 bölüm 4 | belgede yok |
| Muafiyet belgesi ve geçerlilik tarihi | 09 bölüm 3 | açık (açık sorular listesi, madde B1) |
| `return_lines` | 10 bölüm 3 ("satırlar") | kapandı (Denetim B): ayrı tablo yok, `returns.lines` JSON |
| `legal_policy` (hukuk ilkesi ve sürümleri) | 10 bölüm 3 | "ayar" deniyor; sürüm siparişe yazılacağına göre sürümlü saklama gerekir, belgede yok |
| Cayma istisna türleri listesi | 10 bölüm 3 ("ayar/tablo olarak tutulur") | belgede yok |
| Kayıtlı görünümler (müşteri listesi) | 11 bölüm 6 | belgede yok |
| İmha kaydı (en az 3 yıl) | 11 bölüm 17.1 | kapandı (00-genel karar 9): `customer_merges.kind = erasure` |
| Silme talebi kuyruğu (10 gün, iptal edilebilir) | 11 bölüm 17.1 | kapandı (00-genel karar 9): `customers.deletion_requested_at` |
| Hesap daveti tokenı | 11 bölüm 3 | belgede yok (muhtemelen Better Auth) |
| Kişisel veri dışa aktarma işi ("verilerimi indir") | 11 bölüm 8 | kapandı (00-genel karar 9): `customer_exports.kind = subject_access` |
| Kalıcı geri dönen (bounce) e-posta işareti | 15 bölüm 6 | kapandı (Denetim B): `consents.source = bounce`, `status = withdrawn` |
| Ürün beslemesi dosyaları ve iş kaydı | 14 bölüm 7 | belgede yok (depolamaya yazılır) |
| Ödeme webhook olay kimliği (idempotency) | 06 bölüm 3 | 05-ticaret içinde yok; yol haritası `payment_webhook_events` diyor |
| Kanal başına IBAN | 06 bölüm 9 | belgede yok |
| B2B onay kuyruğu | 07 bölüm 2 | `06-b2c-b2b` belgelerinde |
| `order_guest_access` | 07 bölüm 7 | tanımı `03-cekirdek/03-veri-kurallari.md` içinde |
| `external_refs` | 02 bölüm 6 (ERP) dolaylı | tek çekirdek tablo, `01` dosyasında (00-genel karar 3) |
| `audit_log` | 05 bölüm 1.1; 11 bölüm 7 | tanımı `03-cekirdek/06-guvenlik-ve-yetki.md` içinde |
| outbox | 02, 05, 07, 15 | tanımı `03-cekirdek/04-olaylar-isler-outbox.md` içinde |
| `invoices` | 17 | çekirdek, pazardan bağımsız (`kind` = `invoice · credit_note`), tanımı `03` dosyasında; Türkiye'ye özgü alanlar `bia_efatura_*` (00-genel karar 6) |
| `customer_payment_methods` | 06 bölüm 8 | tanımı `09-built-in-apps/02-abonelik.md` içinde |
| Şirket, kredi ve oturum tabloları | 05, 07, 09, 16 | `06-b2c-b2b`, `03-cekirdek/08-kimlik-dogrulama.md` |

## Belgeler arası çelişkiler

1. **Varyant tablosunun adı:** 02 `product_variants` diyor; 04 bölüm 9 ve 05 bölüm 1.1 `variants.lead_time_days` / `variants.personalization` diyor. Katalog `product_variants` adını kullanıyor.
2. **Müşteri silme:** veri kuralları bölüm 7 "silme yumuşak (`deleted_at`), katalog ve müşteri için" diyor; 11 bölüm 1 ve 8 müşteride yumuşak silme yerine anonimleştirme kullanıyor, `customers` tablosunda `deleted_at` yok. **Kapandı (Denetim B):** özel belge (11) geçerli; `deleted_at` yok, silme = anonimleştirme.
3. **`order_notes.deleted_at`:** veri kuralları yumuşak silmeyi yalnızca katalog ve müşteri için tanımlıyor ve sipariş verisinin silinmeyeceğini söylüyor; 07 bölüm 10 notlarda yumuşak silme tanımlıyor.
4. **`customers.merged_into`:** 11 bölüm 8'de geçiyor, bölüm 2'deki tablo listesinde yok. Aynı şey yasal tutma ve silme talebi alanları için de geçerli. **Kapandı (Denetim B):** `merged_into`, `legal_hold`, `deletion_requested_at` sütun olarak eklendi.
5. **`promotions.used`:** 08 bölüm 3'teki SQL'de kullanılıyor, bölüm 1'deki sütun listesinde yok. **Kapandı (Denetim B):** sütun eklendi; SQL NULL sınır için düzeltildi.
6. **Sipariş sütunları:** 07 bölüm 1 tablosunda `placed_at`, `reservation_id` (05 bölüm 5 `ON CONFLICT(reservation_id)`), türetilmiş iki durum sütunu, kur anlık görüntüsü (03 bölüm 4), yasal metin ve onay sürümleri (05, 10, 13), stok istisnası işareti ve sipariş dili yok; diğer belgeler bunlara dayanıyor.
7. **Varyant sütunları:** `allow_backorder`, `base_variant_id`, `unit_factor` (04) ve `withdrawal_exempt` (10) 02 bölüm 1'deki tablo listesinde yok. `stock_locations.pickup_enabled` (10) 04 listesinde yok. `channels.statement_name` (06) 01 listesinde yok.
8. **Slug'ın benzersizlik kapsamı:** 14 bölüm 1 "slug `(kanal, dil)` içinde benzersiz, çeviri tablosunda durur" diyor; veri kuralları bölüm 5 çeviri tablosunu `(varlık_id, lang)` olarak tanımlıyor, kanal içermiyor. 01 bölüm 6 kanal başına farklı ad da istiyor.
9. **Vergi oranı kapsamı:** 09 bölüm 3 "müşteri grubu veya şirket başına oran" diyor; bölüm 1'deki `tax_rates` anahtarında yalnızca `customer_group` var. **Kapandı (Denetim B):** şirket başına oran şirketi müşteri grubuna koyarak (09 bölüm 3 parantezi).
10. **Global karar ile 05 ve 06:** 05 bölüm 4 ve 06 bölüm 1 iyzico ve PayTR'yi çekirdek barındırılan sayfa işleyicileri arasında sayıyor. 2026-11-13 kararına göre bunlar Türkiye ek modülü; global varsayılan Stripe (06'da ilk test işleyicisi Polar).
11. **Global karar ile 11:** `addresses` için "il/ilçe/mahalle" sütunları ve TR il/ilçe/mahalle tohum verisi çekirdekte anlatılıyor (11 bölüm 2, 4). Karar Türkiye'ye özgü olanı modüle koyuyor. Vergi alanları kararla uyumlu (`tax_id` + `tax_id_type`). **Kapandı (Denetim B):** 11'in güncel metni zaten `city`, `region`, `district?` diyor ve bölge listelerini ülke paketine koyuyor; çelişki katalogdaydı (`neighborhood`), düzeltildi.
12. **Cayma ve iade kuralları:** 10 bölüm 3 Türk mevzuatını (14 gün, md. 15) çekirdek akış gibi anlatıyor ama sayıları `legal_policy` ayarına (`policy-tr`) bağlıyor. Global varsayılan ilkenin ne olacağı belgede yok.
13. **`notification_types`:** 15 bölüm 1 tabloda listeliyor ama "kodda tanımlı" diyor. **Kapandı (00-genel karar 2):** tablo değil, `features/notify/types.ts`.
14. **`stats_daily_products` ve `stats_daily_b2b`:** anahtarlarında `currency` yok ama para tutarı taşıyorlar. 16 bölüm 2'deki "farklı para birimleri toplanmaz" kuralı ve veri kuralları bölüm 2 ile çelişiyor. **Kapandı (Denetim B):** iki tablonun anahtarına `currency`, `stats_daily_b2b`'ye `channel_id` eklendi.
15. **`returns.carrier` ve `returns.personalized`:** 05 ve 10 bunları "ayar" olarak anlatıyor ama adlandırma `returns` tablosunun sütunu gibi okunuyor. **Kapandı (Denetim B):** sütun değil, ayar anahtarı.
16. **Önekler:** veri kurallarındaki önek listesi depo, sepet, rezervasyon, müşteri grubu, dijital hak, medya, ödeme, promosyon ve gönderim için önek vermiyor. Bunların bir kısmı API'de `public_id` olarak dönüyor (ör. `/shop/downloads/:entitlement_public_id`, sepet `public_id`). **Denetim B önekleri (karar, veri kuralları listesine eklenmeli):** `prm_` promosyon, `zon_` bölge, `txr_` vergi oranı, `shm_` kargo yöntemi, `ful_` gönderim, `ret_` iade, `ent_` dijital hak, `adr_` adres, `cnt_` müşteri notu, `cgr_` müşteri grubu, `cex_` dışa aktarma, `med_` medya, `pag_` sayfa, `pst_` yazı, `rdr_` yönlendirme, `doc_` belge. 2026-11-13 itibarıyla dosyadaki diğer öneklerle (`chn_ prod_ var_ col_ pl_ loc_ cart_ rsv_ pay_ ord_ itm_ ref_ cus_`) ve `03` dosyasındakilerle (`com_ quo_ apr_`) çakışma yok.

## Açık sorular (Denetim B: promosyondan belgelere)

- **B1.** Vergi muafiyet belgesi ve geçerlilik tarihi (09 bölüm 3) nerede: şirket kaydında (`03`) çekirdek sütun mu, modül `custom_fields`'ı mı?
- **B2.** `media` silme denetimi: JSON içindeki medya referansları (`sections.settings`, kanal logosu, tema ayarları) tek ifadeli `NOT EXISTS` ile denetlenemez; ayrı kullanım tablosu mu, `json_each` taraması mı?
- **B3.** `pages`: sürüm geçmişi yokken siparişin onayladığı eski yasal metnin tam içeriği nerede saklanır/gösterilir?
- **B4.** `sections`: taslak önizlemenin veri modeli (ayrı satır mı, ayrı sütun mu) belgede yok.
- **B5.** `notification_log` saklama süresi belgede yok.
- **B6.** `stats_daily_funnel`: müşteri olaylarının kaynağı (Pixel / sunucu) ve oturum sayımı belgede yok.
- **B7.** 00-genel migration sırası (00-genel düzeltilmeli, bu dosya değil): `tax_rates.customer_group_id` (0010) → `customer_groups` (0011); `promotion_usage.reservation_id` (0012) → `checkout_reservations` (0013) ve `order_id` → `orders` (0015) hedefleri sonra geliyor. SQLite FK hedefini oluşturmada denetlemez, ama "hedef önce" kuralı bozuk. Ayrıca 00-genel listelerinde `fulfillment_lines`, `post_translations`, `menu_item_translations`, `promotion_channels`, `shipping_method_channels` yok; 0019-0021 satırındaki tablo adları bu dosyadaki yerleşimle uyumlu.
