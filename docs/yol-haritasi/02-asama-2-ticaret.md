# Aşama 2: ticaret çekirdeği, ayrıntılı yapılacaklar (madde 14-30)

**Grubun amacı.** Sipariş alabilen en küçük dilim: kanal → katalog ve okuma modeli → fiyat → stok → vergi → promosyon → kargo → sepet ve checkout (rezervasyon, settlement) → ödeme → sipariş; ardından müşteri, medya, içerik, SEO, bildirim, rapor ve belge katmanları. Numaralar `docs/YOL-HARITASI.md` ile aynıdır.

**Kodun bugünkü durumu (2026-11-13, kod görülerek).** `packages/core/src/features/` altında `channels, catalog, catalogIndex, pricing, stock, tax, promotions, shipping, fulfillment, cart, checkout, payments, orders, customers, media, pages, notify` klasörleri var ama her birinde yalnız `index.ts` içinde `export {}` duruyor. `packages/db/src/index.ts`, `packages/contract/src/index.ts`, `packages/core/src/index.ts`, `packages/test-utils/src/index.ts` de boş. `apps/api`, `apps/storefront`, `apps/admin` yalnız `package.json` + `tsconfig.json`. `integration-tests/{api,core,race,contract}` içinde test yok, `integration-tests/helpers/index.ts` boş. `seo`, `reports`, `documents` için feature klasörü hiç yok (`02-genel-mimari/04-monorepo-klasor-yapisi.md` bölüm 1 listesinde de yoklar). Bu yüzden aşağıdaki **tüm alt görevler `-`**; hiçbir maddeye `+` verilmedi.

**Bağımlılık özeti.** Bu grubun tamamı aşama 1'e bağlıdır: `Platform` + `atomic()` (madde 5), `packages/db` şema/migration düzeni (6), yapılandırma ve strateji kaydı (7), `Ctx` + `packages/contract` (8), outbox/iş kuyruğu (9), önbellek etiketleri/segment (10), izin + denetim kaydı + `secrets` (11), oturum kümesi `{ id, groupIds, companyId, priceListIds }` (12), `packages/test-utils` çalıştırıcısı (D1 + SQLite). Grup içi sıra: 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23; 24 (müşteri) 21'den önce en az "tek kayıt + oturum kümesi" düzeyinde gelmeli; 25 (medya) 15'teki `product_assets` ve 21'deki kişiselleştirme görseli için erken gerekir; 26-30 sipariş akışı oturunca.

**Ortak yapı kuralları (skill'lerden).** Tablo grubu başına `packages/db/src/schema/<grup>.ts` + `schema/index.ts`; numaralı, eklemeli, tek konulu migration. İş mantığı `packages/core/src/features/<x>/`, `(ctx, girdi)` imzası, global `env` yok. Saf hesap ayrı dosyada (birim testi yanında), sorgu `features/<x>/queries/<ad>.ts`, çoklu yazma `atomic()` ile kendi dosyasında. Başka feature yalnız `index.ts` üzerinden import edilir. Dosya ≤ 250 satır (hedef 150), handler ≤ 40 satır ve `apps/api/src/{shop,admin,hooks}/<kaynak>/<rota>.ts` içinde tek rota; giriş/çıkış şekli `packages/contract`'tan. Kural tabloları (durum geçişleri, hata kodları, `legal_policy` varsayılanları) veri dosyasında. Admin ekranları yalnız `@openmers/ui` ile. Para tamsayı küçük birim. Veritabanı mock'lanmaz: entegrasyon `integration-tests/core`, HTTP `integration-tests/api`, yarış `integration-tests/race`, strateji/port `integration-tests/contract`; vitrin sorgusu `EXPLAIN QUERY PLAN` testine tabi.

---

### 14. `docs/05-ticaret/01-kanallar.md` — kanal modeli, çözümleme, çok alan adı

- **Kaynak kararlar:**
  - Silinemeyen bir varsayılan kanal her şeyi içerir; kanal `type` = `b2c · b2b · hybrid`, erişim `public · login_required · approved_companies_only`, `prices_include_tax`, varsayılan para birimi/dil + izinliler, varsayılan vergi/kargo bölgesi, varsayılan fiyat listesi, misafir alışveriş ve en az sipariş tutarı.
  - Bağlantılar `<varlık>_channels` tablolarında; ürün `product_channels`, varyant `variant_channels` (ürün atanınca tüm varyantlar varsayılan atanır). Alt kanalda oluşan ürün varsayılan kanala da atanır; varsayılan kanaldan silmek tüm kanallardan çıkarır.
  - Varsayılan fiyat listesinde fiyatı olmayan varyant `no_price` ile satılamaz (0 TL değil). `sync_prices` varsayılan kapalı; yalnız aynı para birimindeki kanallara yazar.
  - `channel_domains`: `domain → channel_id` (+ varsayılan dil), biri birincil; `Host` başlığından bellekte çözülür, bilinmeyen alan adı **404** (varsayılana düşmez).
  - Kanal tablosu bellekte; değişiklikte `settings_version` artar, `chn:<id>` etiketi temizlenir; ürün kanala ekleme/çıkarma bir `reindex` işidir.
  - Kanal `statement_name` alanı taşır (kısa, ASCII; bkz. madde 22).
- **Bağımlılık:** madde 6 (db), 7 (yapılandırma/`settings`), 8 (`Ctx`), 10 (önbellek etiketi), 11 (kanal başına rol).
- **Yapılacaklar:**
  1. `+` `packages/db/src/schema/channels.ts`: `channels` (`code`, `public_id`, `type`, para birimleri, diller, `prices_include_tax`, varsayılan bölge/fiyat listesi, erişim, misafir, en az tutar, `sync_prices`, `statement_name`, `settings_version`), `channel_domains`; ilk migration + varsayılan kanal tohumu.
  2. `-` `packages/db/src/schema/channel-links.ts`: `product_channels`, `variant_channels`, `collection_channels` vb. bağlantı tabloları (katalog tablolarıyla aynı migration serisinde, madde 15'e bağlı).
  3. `-` `packages/core/src/features/channels/types.ts` + `defaultChannel.ts`: kanal domain tipi, varsayılan kanalın silinemez kuralı (saf).
  4. `-` `features/channels/resolve/resolveChannel.ts` (saf): `Host` veya yayınlanabilir anahtar → kanal; bilinmeyen alan adı için tipli `UNKNOWN_DOMAIN` hatası.
  5. `-` `features/channels/registry/channelRegistry.ts`: kanal + alan adı tablosunu belleğe yükler, `settings_version` değişince yeniler; sorgu yalnız `queries/loadChannels.ts` içinde.
  6. `-` `features/channels/assign/assignProductToChannel.ts` (`atomic()`): ürün + tüm varyantların `variant_channels` satırları, varsayılan kanala da atama, `reindex(product_id)` olayı; `removeFromDefaultChannel.ts` tüm kanallardan çıkarır.
  7. `-` `features/channels/pricing/syncPrices.ts` (saf karar + `catalog`/`pricing` `index.ts` üzerinden yazma): `sync_prices` açıkken yalnız aynı para birimli kanalların varsayılan listesine yazar.
  8. `-` `features/channels/queries/listNoPriceVariants.ts`: varsayılan listede fiyatı olmayan varyantları admin uyarısı için döndürür.
  9. `-` `apps/api/src/platform/` istek ara katmanı: `ctx.channel` kurulumu `resolveChannel` ile; 404 eşlemesi handler'da değil ara katmanda.
  10. `-` `packages/contract/src/admin/channels.ts` + `apps/api/src/admin/channels/{list,get,update}.ts` (ince) ve admin kanal seçici (`@openmers/ui` `Select`).
- **Testler:**
  - `features/channels/resolve/resolveChannel.test.ts`: birincil/ikincil alan adı, bilinmeyen alan adı 404 tipi.
  - `integration-tests/core/__tests__/channels/assign.test.ts`: alt kanalda oluşan ürün varsayılanda da görünür; varsayılandan silme tüm kanallardan çıkarır; `reindex` olayı yazılır.
  - `integration-tests/core/__tests__/channels/syncPrices.test.ts`: farklı para birimine yazmaz.
  - `integration-tests/api/__tests__/shop/channelHost.test.ts`: bilinmeyen `Host` → 404, istek sorgu turu sayacı kanal çözümlemede 0.
- **Bitti sayılır:** varsayılan kanal tohumla gelir ve silme reddedilir; kanal çözümlemesi tur sayacında 0 veritabanı turu; bilinmeyen alan adı testi 404; fiyatsız varyant `no_price` döner.
- **Açık sorular / riskler:** ATLANANLAR bölüm "Core Concepts" (4): kanal–varyant atama kuralı Vendure'dan alındı, B2B fiyat senkronuyla (`06-b2c-b2b/03`) çakışması kontrol edilmedi. Self-host Caddy isteğe bağlı sertifika için "izinli alan adı listesi" ucu hangi pakette (api mi, deploy mu) belirsiz. Çok kiracılı SaaS kanalla değil ayrı DB ile; kiracı yönlendirmesi bu maddenin dışında.

---

### 15. `docs/05-ticaret/02-katalog-ve-arama.md` — yazma modeli, okuma modeli, FTS, reindex

- **Kaynak kararlar:**
  - Yazma: `products`, `product_variants` (SKU, barkod, ağırlık, ölçü, vergi kategorisi, `track_inventory`, en az adet, paket katı, `fulfillment_type`, `lead_time_days?`, `personalization?`), `product_options`/`option_values`, `facets`/`facet_values` (`private`), ağaç `collections` + `inherit_filters` (varsayılan açık), hesaplanmış `collection_variants`, `*_translations`, `product_assets`. Her üründe en az bir varyant; "kategori" = koleksiyon.
  - Okuma: `catalog_index` anahtarı `(channel_id, lang, variant_id)`; `catalog_index_facets` ve `catalog_index_collections` dar yardımcı tablolar (kaplayan indeks); `product_view` anahtarı `(channel_id, lang, slug)`, tek satır JSON sunum modeli.
  - `catalog_fts` (FTS5) dil başına; Türkçe katlama indeksleme ve sorguda aynı yardımcıyla.
  - `reindex(product_id)` olayı tekilleşir; iş ürünün tüm `(kanal, dil)` satırlarını tek `atomic()` içinde yazar; stok adedi değişip kova değişmezse tetiklenmez; toplu içe aktarmada tamponlanır.
  - Koleksiyon üyeliği indeksleme anında düz çözülür (miras dahil); "alt koleksiyonları dahil et" sorguda `IN`, derinlik ≤ 3.
  - Görsel çözümleme sırası varyant → seçenek değeri → ürün, indeksleme anında; tüm sorgular imleçli ve `EXPLAIN QUERY PLAN` testli.
- **Bağımlılık:** madde 14 (kanal bağlantıları), 6, 9 (`reindex` işi outbox'ta), 10 (etiket temizliği); fiyat ve stok kovası için 16 ve 17'nin `index.ts` yüzeyi (önce sahte değil, en az `base` fiyat ve kova okuyucusu).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/catalog-products.ts`, `catalog-options.ts`, `catalog-facets.ts`, `catalog-collections.ts`, `catalog-assets.ts`: yazma tabloları + çeviri tabloları, ayrı migration'lar.
  2. `-` `packages/db/src/schema/catalog-index.ts`: `catalog_index`, `catalog_index_facets`, `catalog_index_collections`, `product_view`, `catalog_fts` (FTS5 sanal tablo migration'ı D1 ve SQLite'ta).
  3. `-` `features/catalog/products/{createProduct,updateProduct,deleteProduct}.ts` (`atomic()` + `reindex` olayı); `features/catalog/variants/*.ts` (en az bir varyant kuralı saf `assertHasVariant.ts`).
  4. `-` `features/catalog/collections/resolveFilters.ts` (saf): `inherit_filters` ile kendi + üst filtrelerin kesişimi; `recomputeMembership.ts` (parçalı iş, dal başına).
  5. `-` `features/catalogIndex/text/foldTurkish.ts` (saf, ı/i ş/s …), hem indeksleyici hem arama sorgusu kullanır.
  6. `-` `features/catalogIndex/build/buildIndexRows.ts` + `buildProductView.ts` + `resolveVariantImages.ts` (saf): yazma modeli verisinden satırları, `group_first`, `price_min/max`, `stock_bucket`, hazır `srcset` ve varyant görsel listesini üretir.
  7. `-` `features/catalogIndex/jobs/reindexProduct.ts`: tekilleştirilmiş iş; tüm `(kanal, dil)` satırlarını tek `atomic()` ile değiştirir, etiketleri temizler; `bufferUpdates` bayrağı.
  8. `-` `features/catalogIndex/jobs/fullReindex.ts`: imleçli, parçalı, kaldığı yerden devam eden tam yeniden indeksleme.
  9. `-` `features/catalogIndex/queries/{listCollection,listFiltered,facetCounts,search,getProductView}.ts`: imleçli; filtreli liste en seçici filtreden başlar, diğerleri `EXISTS`.
  10. `-` `features/catalog/import/upsertMany.ts`: CSV ve `products.upsertMany` ortak yolu, içerik özetiyle değişmeyeni atlama, kayıt başına sonuç.
  11. `-` `packages/contract/src/{shop,admin}/catalog.ts` + `apps/api/src/shop/catalog/*.ts` (yalnız `catalogIndex` import eder) ve `apps/api/src/admin/products/*.ts`.
  12. `-` `SearchProvider` portu tanımı `features/catalogIndex/search/port.ts` (Meilisearch app'i madde 6. aşamada uygular).
- **Testler:**
  - `features/catalogIndex/text/foldTurkish.test.ts`, `build/*.test.ts` (miras kesişimi, görsel çözüm sırası, `group_first`).
  - `integration-tests/core/__tests__/catalogIndex/queryPlan.test.ts`: dört vitrin sorgusunda tam tarama yok.
  - `integration-tests/core/__tests__/catalogIndex/reindex.test.ts`: aynı ürün için ikinci iş eklenmez; kova değişmeyen stok yazması reindex üretmez; üst koleksiyon filtresi değişince alt dal üyeliği yenilenir.
  - `integration-tests/api/__tests__/shop/productPage.test.ts`: ürün sayfası 1 veritabanı turu.
- **Bitti sayılır:** vitrin listesi/ürün sayfası yalnız okuma modelinden okunur ve tur bütçesini aşmaz; `EXPLAIN QUERY PLAN` testi geçer; 10 bin ürünlük tohumda tam yeniden indeksleme kesintiden sonra devam eder; Türkçe "ışık" araması "isik" ile bulur.
- **Açık sorular / riskler:** FTS5 sınırı "ölçülmedi" (bölüm 5); D1'de FTS5 tokenizer davranışı SQLite ile birebir mi doğrulanmalı. `personalization` tanımının okuma modeline nasıl indeksleneceği (madde 21) şemada yok. ATLANANLAR: `variant_channels`, `digital_*`, `withdrawal_exempt` alanları veri kuralları belgesine henüz işlenmedi.

---

### 16. `docs/05-ticaret/03-fiyat.md` — fiyat listeleri, seçim stratejisi (saf)

- **Kaynak kararlar:**
  - `price_lists` (`type` = `base · sale · contract`, `priority`, `starts_at/ends_at`, `includes_tax`, `status`, `currency`, `channel_id`), `price_list_targets` (herkes/grup/şirket), `prices` PK `(price_list_id, variant_id, min_qty)` → `amount`, `compare_at_amount`.
  - Her kanalın bir `base` listesi var ve her satılan varyantın orada fiyatı bulunur.
  - Girişte bir kez `ctx.priceListIds`; istek anında tek `IN` sorgusu; `priceSelection` (saf): `contract` → geçerli `sale` → `base`, aynı türde `priority`, miktara uyan en yüksek `min_qty`.
  - `linePrice` (saf) girdisi `{ variant, quantity, selectedPrice, personalization }`; geçerlilik tarihi sorguda değil seçimde; süresi dolan liste zamanlanmış görevle `expired`.
  - İstemci fiyatı asla kullanılmaz; kur dönüşümü istek anında değil, zamanlanmış görevle hedef listeye yazılır; `prices.setMany` parçalı ve idempotent.
- **Bağımlılık:** 14 (kanal varsayılan listesi), 15 (varyant), 12 (oturum kümesi), 10 (`pl:<id>` etiketi ve segment), 7 (strateji kaydı).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/pricing.ts`: üç tablo + `(variant_id, price_list_id)` indeksi; migration.
  2. `-` `features/pricing/types.ts`: `PriceCandidate`, `SelectedPrice`, strateji tipleri.
  3. `-` `features/pricing/strategies/priceSelection.ts` (saf, varsayılan strateji) ve `linePrice.ts` (saf; kişiselleştirme ek ücreti `amount`/`percent`, para birimi başına).
  4. `-` `features/pricing/queries/loadPrices.ts`: tek `IN` sorgusu (varyantlar × liste kimlikleri).
  5. `-` `features/pricing/session/resolvePriceListIds.ts`: grup/şirket hedeflerinden öncelikli liste kümesi (giriş anında; anonimde `base` + herkese açık `sale`).
  6. `-` `features/pricing/write/setMany.ts`: parçalı, idempotent toplu yazma; varsayılan liste ise `reindex` + `pl:<id>` etiketi.
  7. `-` `features/pricing/jobs/expirePriceLists.ts` ve `jobs/convertCurrency.ts` (kur + yuvarlama kuralıyla hedef listeye yazar).
  8. `-` `packages/contract/src/admin/priceLists.ts` + `apps/api/src/admin/price-lists/*.ts` ince handler'lar.
- **Testler:**
  - `features/pricing/strategies/priceSelection.test.ts`: tür önceliği, `priority`, kademe seçimi, süresi dolmuş `sale` atlanır.
  - `linePrice.test.ts`: sabit ve yüzde ek ücret, boş alan ek ücret tetiklemez, çok para birimli tutar.
  - `integration-tests/core/__tests__/pricing/setMany.test.ts`: aynı yük iki kez = aynı sonuç; etiket temizliği olayı.
  - `integration-tests/contract/__tests__/segmentLeak.test.ts`: bir segmentin fiyatı başka segment anahtarından servis edilmez.
- **Bitti sayılır:** fiyat çözümlemesi istek başına tek sorgu; strateji birim testleri yeşil; segment sızıntı testi geçer; istemciden gelen fiyat alanı sözleşmede yok.
- **Açık sorular / riskler:** Kur kaynağı (hangi servis) belirtilmemiş. `contract` fiyatına ek ücret (`surcharge_on_contract`) ve teklif satırında `linePrice` atlanması B2B (aşama 4) ile birlikte test edilmeli. Kural motoru kapsam dışı.

---

### 17. `docs/05-ticaret/04-stok.md` — depolar, seviyeler, rezervasyon, paket birimi

- **Kaynak kararlar:**
  - `stock_locations`, `channel_stock_locations` (öncelik), `stock_levels (variant_id, location_id) → on_hand, reserved, safety, version`, eklemeli `stock_movements` (`adjustment · reservation · release · sale · return · transfer · erp_sync`).
  - Satılabilir = `on_hand − reserved − safety`; `track_inventory = false` kontrolsüz; `allow_backorder` alt sınırlı eksi.
  - Ayırma checkout başında, koşullu `UPDATE ... AND on_hand - reserved - safety >= :n AND EXISTS (rezervasyon active)`; gönderimde `on_hand −` ve `reserved −`.
  - ERP yalnız `on_hand` yazar (`stock.setMany`, `version` korumalı, `erp_sync` hareketi).
  - `stockDisplay` kova üretir (`out · low · in`); kova değişmezse indeks/önbellek dokunulmaz.
  - Paket birimi: `base_variant_id?` + `unit_factor` (≥ 1); paket varyantının `stock_levels` satırı yok, zincir yok; satılabilir `floor(taban / unit_factor)`; sipariş satırında `stock_units` anlık görüntü; çarpan değişikliği açık rezervasyon varken reddedilir. `lead_time_days` yalnız gösterim.
- **Bağımlılık:** 15 (varyant, `reindex`), 14 (kanal–depo), 5 (`atomic()`); rezervasyon satırı madde 21 ile birlikte biter.
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/stock.ts`: dört tablo + `stock_movements.units`; varyanta `base_variant_id`, `unit_factor`, `allow_backorder`, `lead_time_days` sütunları (katalog migration'ına ek, ayrı migration).
  2. `-` `features/stock/available/computeAvailable.ts` (saf): kanal depoları üzerinden toplam, paket için `floor`, backorder alt sınırı.
  3. `-` `features/stock/strategies/stockDisplay.ts` (saf, kova eşikleri) ve `stockLocation.ts` (saf, öncelik sırası, tek depodan karşılama tercihi).
  4. `-` `features/stock/reserve/buildReserveStatements.ts`: aynı varyant kalemlerini toplar, paket → taban birim çevirir, koşullu `UPDATE` ifadelerini üretir (checkout `atomic()`'ine verilir).
  5. `-` `features/stock/release/buildReleaseStatements.ts`: rezervasyon `active`/`payment_pending` koşullu ters ifade.
  6. `-` `features/stock/sale/buildSaleStatements.ts`: gönderimde `on_hand −`, `reserved −`, `sale` hareketi (madde 20 kullanır).
  7. `-` `features/stock/write/setMany.ts` (ERP/CSV, `version` korumalı) ve `adjust.ts` (sayım; paket varyantına yazma reddi).
  8. `-` `features/stock/units/changeUnitFactor.ts`: açık rezervasyon/sipariş varken red; `cli/mergeUnits.ts` (`openmers stock merge-units`).
  9. `-` `features/stock/jobs/auditReserved.ts`: `reserved`'i açık rezervasyon + gönderilmemiş kalemlerden yeniden hesaplar, düzeltmez, raporlar; `stock_movements` toplamı ile `on_hand` karşılaştırması.
  10. `-` Kova değişimi algılayıcı `features/stock/bucket/bucketChanged.ts` (saf) → yalnız değişince `reindex` olayı.
- **Testler:**
  - `computeAvailable.test.ts`: 25 adet, koli 12 → 2; backorder alt sınırı.
  - `integration-tests/race/__tests__/stock/lastUnit.test.ts`: son ürüne iki alıcı, tam bir kazanan, `reserved` asla `on_hand − safety`'yi aşmaz; son kolilere iki alıcı.
  - `integration-tests/race/__tests__/stock/erpDuringReserve.test.ts`: rezervasyon sırasında ERP `on_hand` yazması rezervasyonu ezmez.
  - `integration-tests/core/__tests__/stock/units.test.ts`: iptal/iade doğru çarpanla döner; açık rezervasyonda çarpan değişikliği reddedilir; paket varyantına sayım reddedilir; taban stok değişince paket kovası indekste değişir.
- **Bitti sayılır:** dört yarış/paket testi D1 ve SQLite'ta yeşil; kova değişmeyen stok yazması reindex üretmez (olay sayısıyla doğrulanır); denetim görevi kasıtlı bozulmuş `reserved` farkını raporlar.
- **Açık sorular / riskler:** Sıcak varyant için Durable Object kuyruğu "kanıtlanmış ihtiyaçta"; tek yazıcı sınırı ölçülmedi. ERP rezervinin mağaza siparişlerini içerip içermediği bağlayıcı sorusu (`10-tak-calistir-apps/02-erp.md` bölüm 6). Backorder "alt sınır ayarı" nerede tutulur (varyant mı kanal mı) belgede açık değil.

---

### 18. `docs/05-ticaret/09-vergi.md` — bölgeler, kategoriler, oranlar, satır vergisi

- **Kaynak kararlar:**
  - `zones`/`zone_members` (ülke/il kümeleri, kargo da kullanır), `tax_categories`, `tax_rates (zone, tax_category, customer_group?) → oran (baz puan)`; tümü bellekte.
  - `taxZone`: teslimat adresi, yoksa kanalın varsayılanı; `taxLine`: bölge + kategori oranı.
  - Fiyat vergi dahilse net geri hesaplanır, hariçse eklenir; her satır net ve brüt saklar; yuvarlama satır düzeyinde, sipariş vergisi satırların toplamı; e-fatura aynı yardımcıyı kullanır.
  - Kargonun kendi vergi kategorisi var; sipariş indirimi satırlara dağıtıldıktan sonra vergi hesaplanır.
  - Oran değişikliği yalnız yeni sepetleri etkiler; tevkifat/ÖTV e-fatura app'inde; dış vergi servisi `taxes:handle` senkron kanca, zaman aşımında yerel orana düşer. Türkiye oranları (%1, %10, %20) yalnız veri/tohum, çekirdek koduna gömülmez.
- **Bağımlılık:** 14 (kanal varsayılan bölgesi), 15 (varyant vergi kategorisi), 7 (strateji kaydı); senkron kanca kısmı aşama 5 (genişletme).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/tax.ts`: `zones`, `zone_members`, `tax_categories`, `tax_rates`; migration; tohum yalnız tek "standart" kategori (pazara özgü oran yok).
  2. `-` `features/tax/registry/taxRegistry.ts`: tabloları belleğe yükler, değişince yeniler; sorgu `queries/loadTaxConfig.ts`.
  3. `-` `features/tax/strategies/taxZone.ts` (saf) ve `taxLine.ts` (saf, varsayılan oran araması, müşteri grubu muafiyeti).
  4. `-` `features/tax/calc/splitGrossNet.ts` (saf): dahil/hariç dönüşüm, satır düzeyi yuvarlama; e-fatura app'inin de kullanacağı tek yardımcı olarak `index.ts`'ten açılır.
  5. `-` `features/tax/calc/allocateOrderDiscount.ts` (saf): sipariş indirimini satırlara oransal dağıtır (kalan kuruş kuralı tek yerde); promosyon da bunu kullanır.
  6. `-` `features/tax/hooks/externalTaxPort.ts`: senkron kanca portu + zaman aşımı yedeği (çağrı yalnız sepet/checkout).
  7. `-` `apps/api/src/admin/tax/*.ts` + `packages/contract/src/admin/tax.ts`: bölge/kategori/oran CRUD.
  8. `-` Türkiye KDV kategorileri için ayrı tohum dosyası `packages/db/seeds/tax-tr.ts` (yalnız TR kurulumunda çalıştırılır).
- **Testler:**
  - `splitGrossNet.test.ts`: dahil/hariç her iki yönde kuruş farkı yok; satır toplamı = sipariş vergisi.
  - `allocateOrderDiscount.test.ts`: kalan kuruş deterministik dağılır, toplam korunur.
  - `taxZone.test.ts`, `taxLine.test.ts`: adres yokken kanal varsayılanı; grup muafiyeti.
  - `integration-tests/contract/__tests__/taxHook.test.ts`: kanca zaman aşımında yerel orana düşer.
- **Bitti sayılır:** vergi hesabı bellekten, sepet hesabında ek sorgu yok; yuvarlama testleri yeşil; çekirdekte TR'ye özgü oran sabiti yok (grep ile).
- **Açık sorular / riskler:** Muafiyet "belge ve geçerlilik tarihiyle" şirket kaydında; tablo B2B'de (aşama 4) tanımlı değil. AB ters yükleme ve dijital hizmette müşteri ülkesi KDV'si strateji ile, çekirdekte yok. Kalan kuruş dağıtım kuralı belgede yazmıyor; seçilen kural belgeye geri yazılmalı.

---

### 19. `docs/05-ticaret/08-promosyon.md` — koşul/eylem, kupon, kullanım sınırı

- **Kaynak kararlar:**
  - `promotions` (kanal, tarih, `enabled`, `priority`, `coupon_code?`, `usage_limit?`, `per_customer_limit?`, `conditions`/`actions` JSON `[{code,args}]`, `stackable`), `promotion_usage`.
  - Kuponsuz otomatik, kuponlu kodla aday; etkin promosyonlar kanal başına bellekte derlenmiş.
  - Koşullar saf ve senkron; veri gerekirse `requires: ['customerOrderCount']` ile sepet verisi toplanırken tek sorgu.
  - Eylem `order_adjustments` üretir (satır, sipariş — oransal dağıtım, kargo); `stackable` olmayan uygulanınca kalanlar atlanır.
  - Sınır doğruluğu rezervasyon `atomic()`'inde `used < usage_limit` koşullu artış; yalnız > 0 indirim üretildiyse artar; bırakılırsa geri alınır.
  - `contract` fiyatlı satıra varsayılan promosyon uygulanmaz; indirim rozeti fiyat listesinden gelir.
- **Bağımlılık:** 16 (satır fiyatı, `contract` türü), 18 (`allocateOrderDiscount`), 24 (grup koşulu için oturum `groupIds`), 7 (operasyon kaydı).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/promotions.ts`: `promotions` (+ `used`), `promotion_usage`, `promotion_channels`; migration.
  2. `-` `features/promotions/operations/conditions/*.ts`: yerleşik koşullar (en az tutar, ürün/koleksiyon içerir, müşteri grubu, şirket, `personalized`, ilk sipariş `requires`), her biri ayrı dosya, saf.
  3. `-` `features/promotions/operations/actions/*.ts`: satır yüzde/tutar, sipariş indirimi, kargo indirimi; saf.
  4. `-` `features/promotions/registry/compilePromotions.ts`: kanal başına bellekte derleme, değişince yenileme.
  5. `-` `features/promotions/evaluate/applyPromotions.ts` (saf): tarih/kanal süzgeci, öncelik, `stackable`, `contract` satır atlama, etkisiz promosyonu işaretleme.
  6. `-` `features/promotions/reserve/buildUsageStatements.ts`: rezervasyon `atomic()` için koşullu `used + 1` (yalnız etkiliyse) + `promotion_usage`; ters ifade bırakmada.
  7. `-` `features/promotions/requires/collectRequirements.ts`: koşulların istediği verileri tek sorguya toplar (sepet verisi turunda).
  8. `-` `apps/api/src/admin/promotions/*.ts` + admin formu operasyon şemasından (`@openmers/ui`).
- **Testler:**
  - `applyPromotions.test.ts`: `stackable` kesmesi, öncelik, `contract` satırı atlama, 0 indirimli promosyon "etkisiz".
  - `integration-tests/race/__tests__/promotions/lastCoupon.test.ts`: sınırlı kuponun son kullanımına iki alıcı, tek kazanan.
  - `integration-tests/core/__tests__/promotions/usage.test.ts`: etkisiz promosyon sayacı tüketmez; bırakılan rezervasyon sayacı geri alır.
- **Bitti sayılır:** yarış testi tek kazanan verir; koşul içinde sorgu yok (koşul dosyaları `db` import etmez, lint/grep); sepet hesabında promosyon için ek tur yok.
- **Açık sorular / riskler:** `per_customer_limit` doğruluğu rezervasyonda nasıl sağlanır belgede yazmıyor (yalnız toplam `usage_limit` için ifade var). Misafir müşteride müşteri başına sınırın anahtarı (e-posta mı `customer_id` mi) belirsiz. Hediye kartı ve tek kullanımlık kod üretimi kapsam dışı.

---

### 20. `docs/05-ticaret/10-kargo-ve-teslimat.md` — kargo yöntemi, gönderim, iade, cayma, dijital

- **Kaynak kararlar:**
  - Kargo yöntemi = kayıt + `ShippingEligibilityChecker` + `ShippingCalculator`; yerleşik hesaplayıcılar sabit, ağırlık kademesi, desi, tutar üstü ücretsiz; yöntemler bellekte; sipariş ağırlık/yöntem/ücret anlık görüntüsü; çok depolu sepet v1'de tek kargo satırı.
  - `fulfillments` (`state` `pending · shipped · delivered · cancelled`, `kind` `physical · digital`, `delivered_at`) + `fulfillment_lines`; oluşturma tek `atomic()`: satırlar + stok düşümü + `sale` hareketleri + `order.fulfilled` + teslimat durumu sütunu. `FulfillmentHandler` dış çağrısı outbox adımı; çekirdekte `manual` işleyici.
  - `returns` (`state` `requested · approved · received · rejected`, `kind` `withdrawal · other`); teslim alınınca stok, sonra ayrı adım ödeme iadesi.
  - Cayma sayıları koda gömülmez: `legal_policy` (`policy-tr` örnek hazır ayar), siparişe ilke sürümü ve bilgilendirme metni sürümü/anı yazılır; pencere `delivered_at`'ten; `withdrawal_exempt` ürün/varyant bayrağı.
  - Dijital: `digital_assets`, `digital_entitlements` (varsayılan 365 gün, 5 indirme); `order.payment_settled` ile `kind = digital` fulfillment `delivered`; indirme `GET /shop/downloads/:id`, 15 dk imzalı bağlantı, bağlantı siparişte dönmez; iade/iptalde `revoked_at`.
  - Mağazadan teslim: `pickup_enabled` depo, `stockLocation` o depoyu zorlar.
- **Bağımlılık:** 17 (stok satış ifadeleri, `stockLocation`), 18 (zones, kargo vergi kategorisi), 23 (sipariş, teslimat durumu sütunu), 9 (outbox adımı), 25 (özel kova, dijital dosya), 7 (`legal_policy` ayarı).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/shipping.ts` (`shipping_methods`, kanal bağlantısı) ve `fulfillment.ts` (`fulfillments`, `fulfillment_lines`), `returns.ts`, `digital.ts`; ayrı migration'lar.
  2. `-` `features/shipping/calculators/{flat,weightTier,desi,freeOver}.ts` (saf) + `eligibility/*.ts` (saf, bölge, pickup).
  3. `-` `features/shipping/quote/quoteShipping.ts` (saf): sepet ağırlık/desi, yalnız fiziksel kalemler, uygun yöntemler + ücret; canlı oran kancası portu `hooks/shippingRatePort.ts` (zaman aşımı + yedek ücret, sepet özeti anahtarıyla kısa önbellek).
  4. `-` `features/fulfillment/create/createFulfillment.ts` (`atomic()`: satırlar + `stock` satış ifadeleri + olay + durum sütunu) ve `handlers/manualHandler.ts`.
  5. `-` `features/fulfillment/jobs/requestLabel.ts`: `pending` → taşıyıcıdan etiket → `shipped` outbox adımı; `tracking/applyTrackingUpdate.ts`.
  6. `-` `features/fulfillment/returns/{requestReturn,approveReturn,receiveReturn}.ts`: durum geçiş tablosu `returns/transitions.ts` (veri); teslimde `on_hand +` ve ödeme iadesi için ayrı outbox adımı.
  7. `-` `features/fulfillment/withdrawal/computeWindow.ts` (saf): `legal_policy` + `delivered_at` + istisna bayrağı + satır kişiselleştirme/dijital hakkından pencere ve seçilebilirlik.
  8. `-` `packages/core/src/config/legal-policy/policy-tr.ts` (veri) + şema (Zod); siparişe ilke sürümü anlık görüntüsü (madde 21 settlement).
  9. `-` `features/fulfillment/digital/{grantEntitlements,downloadEntitlement,revokeEntitlements}.ts`: hak üretimi, jeton özeti, imzalı bağlantıya yönlendirme, limit/süre 403.
  10. `-` `apps/api/src/shop/downloads/get.ts`, `apps/api/src/shop/returns/*.ts`, `apps/api/src/admin/fulfillments/*.ts` ince handler'lar.
- **Testler:**
  - Hesaplayıcı ve `computeWindow.test.ts` birim testleri (teslim yoksa pencere kapanmaz, istisnalı satır seçilemez).
  - `integration-tests/core/__tests__/fulfillment/create.test.ts`: tek `atomic()`, `on_hand`/`reserved` doğru, olay yazıldı.
  - `integration-tests/api/__tests__/shop/downloads.test.ts`: süresi dolmuş/iptal hak 403; başkasının hakkı reddedilir; iade sonrası erişim kapanır; misafir jetonu tek hak; bağlantı sipariş DTO'sunda yok.
  - `integration-tests/core/__tests__/shipping/mixedCart.test.ts`: karma sepette kargo satırı yalnız fiziksel kalemler.
- **Bitti sayılır:** elle teslimatla uçtan uca gönderim stoku düşürür; dijital indirme testleri yeşil; cayma sayıları kodda sabit değil (`policy-tr` dışında grep boş); kargo listesi yerleşik hesaplayıcılarla 0 sorgu.
- **Açık sorular / riskler:** ATLANANLAR: cayma maddeleri ikincil kaynağa (ilme.av.tr) dayanıyor, güncel konsolide md. 15 ve Danıştay kararı doğrulanmadı; `legal_policy` şeması `03-cekirdek/07-yapilandirma.md`'ye eklenmedi; `returns.kind`, `delivered_at`, `withdrawal_exempt` veri listelerine yazılmadı. Lisans anahtarı havuzu v2. Çok depolu sepette tek kargo satırı ile depo başına gönderimin ücret paylaşımı belirsiz.

---

### 21. `docs/05-ticaret/05-sepet-ve-checkout.md` — sepet, hesaplama boru hattı, rezervasyon, settlement

- **Kaynak kararlar:**
  - `carts` / `cart_lines` (`line_key`); sepette tutar saklanmaz; satır yazımı `ON CONFLICT(cart_id, variant_id, line_key) DO UPDATE`; stok burada ayrılmaz.
  - Kişiselleştirme: `products.personalization` + varyant geçersiz kılma, kapalı şema (≤ 10 alan), sunucuda doğrulama (`PERSONALIZATION_NOT_ALLOWED`, alan kodlu hatalar, NFC, kontrol karakteri), `line_key` = kanonik JSON SHA-256 ilk 16 bayt; ek ücret liste fiyatına eklenir ve satırın vergi oranını alır; `customizes_goods` alan düzeyi iade kuralı.
  - `calculate(ctx, cart, data) → CartTotals` saf; veri iki turda; sıra fiyat → promosyon → kargo → vergi → toplam.
  - `checkout_reservations` tek `atomic()`: koşullu `INSERT ... SELECT ... WHERE` (tüm kalemler yeterli + sepet `version`), stok ayırma, kupon sayacı, hareketler; durum `active → payment_pending → settled` veya `released | expired | failed`.
  - Barındırılan ödemede yalnız doğrulanmış webhook bırakır; havale/EFT'de yerel `expires_at` yetkili.
  - Settlement: `INSERT orders ... ON CONFLICT(reservation_id) DO NOTHING` + `settlement_token` UUID; tüm yan yazmalar token koşuluna bağlı; geç gelen ödeme "stok istisnası" ile kaydedilir; webhook, dönüş sayfası, uzlaştırma aynı fonksiyonu çağırır.
- **Bağımlılık:** 16, 17, 18, 19, 20 (boru hattı adımları), 24 (müşteri tek kayıt, `cartMerge`), 25 (kişiselleştirme görseli), 22 ve 23 (settlement'in yazdığı ödeme/sipariş tabloları; aynı sprintte), 9 (outbox `order.placed`).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/cart.ts` (`carts`, `cart_lines`) ve `checkout.ts` (`checkout_reservations`); migration.
  2. `-` `features/cart/personalization/{schema,validate,normalize,lineKey}.ts` (saf): kapalı Zod şeması, kural sırası (kapalıysa red, bilinmeyen anahtar, required/maxLength/pattern/select/mime), boş alan atma, kanonik `line_key`.
  3. `-` `features/cart/lines/{addLine,updateLine,removeLine}.ts`: tek koşullu yazma; düzenlemede eski satır sil + yeni ekle tek ifade grubunda; görsel `media_id` sahiplik denetimi `media` `index.ts` üzerinden.
  4. `-` `features/cart/calculate/calculate.ts` (saf orkestra) + `steps/{priceLines,applyPromotions,quoteShipping,applyTax,sumTotals}.ts`, yalnız ilgili feature'ların `index.ts`'ini kullanır.
  5. `-` `features/cart/queries/loadCartData.ts`: iki tur (sepet + satırlar; sonra fiyat/stok kovası/vergi kategorisi tek `batch`).
  6. `-` `features/cart/merge/cartMerge.ts` (saf strateji) + `mergeOnLogin.ts`; `jobs/abandonedCarts.ts` (hatırlatma + süre dolunca silme, kişiselleştirme görselleri dahil).
  7. `-` `features/checkout/reserve/createReservation.ts` (`atomic()`): koşullu `INSERT ... SELECT`, `stock` + `promotions` ifadeleri, hareketler; snapshot oluşturucu `reserve/buildSnapshot.ts` (saf; fiyat, indirim, vergi, kargo, adres, depo dağılımı, `legal_policy` sürümü, onay zaman damgaları).
  8. `-` `features/checkout/release/releaseReservation.ts`: `active`/`payment_pending` koşullu, iki kez bırakılamaz; `jobs/sweepExpired.ts` yalnız bekleyen (havale) yöntemler için.
  9. `-` `features/checkout/settle/settle.ts` (`atomic()`): sipariş ekle, token al, token koşullu satırlar/ödeme/rezervasyon `settled`/sepet kapatma/outbox; `settle/lateSettlement.ts` stok istisnası yolu.
  10. `-` `features/checkout/reconcile/reconcileJob.ts`: bekleyen rezervasyonları ve `unknown` iadeleri `fetchStatus` ile sorgulayıp `settle`/`release` çağırır.
  11. `-` `apps/api/src/shop/cart/*.ts`, `apps/api/src/shop/checkout/{reserve,return}.ts`, `apps/api/src/shop/uploads/{create,confirm}.ts` ince handler'lar; sözleşme `packages/contract/src/shop/{cart,checkout}.ts`.
  12. `-` Tur bütçesi sayacı testi için `packages/test-utils` içinde sorgu sayacı yardımcısı (madde 3'teki eksik kapıyla ortak).
- **Testler:**
  - `features/cart/personalization/*.test.ts`: madde 1.1 "Test" listesinin saf kısmı (kapalı varyant red, zorunlu alan, uzunluk/desen/seçenek, boş alan ek ücretsiz, aynı/farklı gravür satır davranışı, HTML/kontrol karakteri).
  - `features/cart/calculate/calculate.test.ts`: ek ücret promosyon sonrası doğru, çok para birimli ek ücret, toplam = satır toplamı.
  - `integration-tests/race/__tests__/checkout/*.test.ts`: bölüm 8'in altı zorunlu yarışı (son ürün, çift webhook, dönüş sayfası + webhook, son kupon, rezervasyonda ERP yazması, zaman aşımı + uzlaştırma).
  - `integration-tests/api/__tests__/shop/cartRoundTrips.test.ts`: sepet okuma tur bütçesi; başka sepetin `media_id`'si reddedilir.
- **Bitti sayılır:** altı yarış testi D1 ve SQLite'ta tek kazanan; aynı tetikleyici iki kez gelince tek sipariş; sepet okuma 2 veritabanı turunu aşmaz; kişiselleştirme testleri yeşil.
- **Açık sorular / riskler:** D1'de koşullu `INSERT ... SELECT` + çok ifadeli `batch` atomikliği varsayım, aşama 1 `atomic()` testine bağlı. ATLANANLAR: ek ücret KDV'si muhasebeci onayı bekliyor, kişiye özel üründe cayma istisnası mevzuatı doğrulanmadı; R2 imzalı PUT'ta boyut sınırı zorlanamıyor (HEAD denetimi). Adlandırılmış B2B sepetleri aşama 4'te.

---

### 22. `docs/05-ticaret/06-odeme-ve-iade.md` — ödeme yöntemi, işleyici portu, webhook, refund

- **Kaynak kararlar:**
  - Ödeme yöntemi = kayıt + `PaymentEligibilityChecker` + `PaymentHandler` (argümanlı); anahtarlar şifreli kasada; yöntemler bellekte.
  - `PaymentHandler`: `createCheckout`, `verifyWebhook` (imza burada), `fetchStatus?`, `capture?`, `refund?`; `Normalized` = `paid · release · pending · refundSync`; webhook rotası sağlayıcı adını bilmez.
  - Webhook: imzasız yazma yok; `fetchStatus` ile yeniden sorgu; iade olayları kümülatif mutlak tutar, olay kimliği idempotency; kaydedilemezse 5xx.
  - `payments` (`authorized · settled · declined · cancelled`), `pending_payments`, `refunds` (`pending · settled · failed · unknown`); ödeme durumu türetilir.
  - Belirsiz iade yeniden denenmez (`unknown` → uzlaştırma → admin); iade tutarı vergi satırlarına oransal dağılır ve e-fatura outbox adımı yazar.
  - Çekirdekte `manual` havale/EFT (kanal başına IBAN, süre dolunca iptal) ve kapıda ödeme; `statement_name` ödeme kaydına anlık görüntü; iade ödemenin yapıldığı yöntem kaydının anahtarlarıyla.
- **Bağımlılık:** 21 (rezervasyon, settlement, uzlaştırma), 11 (`secrets`), 14 (kanal), 18 (iade vergi dağıtımı). Sağlayıcı modülleri (`packages/modules/payment-*`) aşama 6.
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/payments.ts`: `payment_methods` (+ kanal), `payments`, `pending_payments`, `refunds`, `payment_webhook_events` (olay kimliği benzersiz); migration.
  2. `-` `features/payments/port/paymentHandler.ts`: arayüz + `Normalized` tipi; abonelik yetenekleri yalnız tip olarak (`billing = self | provider`).
  3. `-` `features/payments/registry/paymentMethods.ts`: bellekte yöntem listesi + uygunluk; `queries/loadPaymentMethods.ts`.
  4. `-` `features/payments/webhook/handleWebhook.ts`: sağlayıcıdan bağımsız akış (doğrula → olay kaydı idempotent → `fetchStatus` → `checkout.settle`/`release`/`refundSync`).
  5. `-` `features/payments/refunds/{createRefund,syncRefund,markManualRefund}.ts`: tek kayıt modeli; zaman aşımında `unknown`; kümülatif tutardan fark çıkarımı saf `refunds/cumulativeDelta.ts`.
  6. `-` `features/payments/refunds/allocateRefundTax.ts` (saf, `tax` `index.ts` yardımcısıyla) + e-fatura iade outbox adımı.
  7. `-` `features/payments/handlers/{bankTransfer,cashOnDelivery}.ts`: `manual` işleyiciler; havale süre dolumu `checkout` süpürücüsüne bağlanır.
  8. `-` `features/payments/state/derivePaymentState.ts` (saf): `awaiting · authorized · paid · partially_refunded · refunded` (madde 23 sütunu bunu kullanır).
  9. `-` `apps/api/src/hooks/payments/[method].ts` tek webhook rotası; `apps/api/src/admin/payments/{capture,refund}.ts`.
  10. `-` Test işleyicisi `packages/test-utils/src/fakePaymentHandler.ts` (gerçek DB ile, imza doğrulamalı) — Polar ilk gerçek işleyici olarak aşama 6'da.
- **Testler:**
  - `derivePaymentState.test.ts`, `cumulativeDelta.test.ts` (sırasız/çift olay aynı sonuç).
  - `integration-tests/race/__tests__/payments/doubleWebhook.test.ts`: aynı webhook iki eşzamanlı teslimat, tek ödeme kaydı.
  - `integration-tests/core/__tests__/payments/refundUnknown.test.ts`: zaman aşımı `unknown`, yeniden denenmez, uzlaştırma çözer.
  - `integration-tests/contract/__tests__/paymentHandler.suite.ts`: her işleyicinin geçeceği ortak sözleşme (imzasız webhook reddi dahil).
- **Bitti sayılır:** sahte işleyiciyle uçtan uca ödeme → settlement → kısmi iade çalışır; imzasız webhook hiçbir satır yazmaz; ortak sözleşme paketi var ve sahte işleyici geçer.
- **Açık sorular / riskler:** ATLANANLAR: iyzico/PayTR/Stripe off-session ve ekstre adı desteği doğrulanmadı; Polar keyfi tutar doğrulanmadı. `pending_payments` ile `payments` arasındaki geçiş (onay anında hangi satır yazılır) belgede ayrıntısız. MoR (`merchantOfRecord`) siparişlerinde vergi/fatura atlamanın sipariş tarafı tanımlanmadı.

---

### 23. `docs/05-ticaret/07-siparis.md` — sipariş tabloları, üç eksen, geçişler, notlar

- **Kaynak kararlar:**
  - `orders` (toplamlar, adres anlık görüntüleri, `state`, `po_number?`, `payment_terms?`, `settlement_token`), `order_lines` (anlık görüntü + `personalization`, `base_unit_price`, `surcharge`), `order_adjustments`, `order_tax_lines`, `order_shipping_lines`, `order_events`; indeksler `(channel_id, placed_at)`, `(customer_id, placed_at)`, `(company_id, placed_at)`, `number`, açık siparişler için kısmi `state`.
  - Üç eksen: `state` (`placed → completed`, `cancelled`) saklanır; ödeme ve teslimat durumu türetilir ve iki sütunda aynı `atomic()` ile önbelleklenir; `placed` öncesi durum yok.
  - Geçiş = `WHERE state = :beklenen` + `order_events` + outbox, tek `atomic()`; app'ler bekçi/sonrası kancası ekler, durum ekleyemez.
  - Sipariş sonrası değişiklik düzeltme kaydıdır (v1: gönderilmemiş kalemler, yalnız admin); iptal stok bırakır, iade başlatır (`unknown` ise sipariş yine `cancelled`).
  - `orderNumber`: yıl + kanal başına boşluksuz sayaç, settlement `atomic()` içinde; misafir erişimi `otk_...` token.
  - `order_notes`: `visibility` `internal · customer`, ≤ 5000, `pinned`, 15 dk düzenleme penceresi, yumuşak silme, `orders:note`.
- **Bağımlılık:** 21 (settlement yazar), 22 (ödeme türetimi), 20 (teslimat türetimi), 9, 11 (izin/denetim), madde 6'daki `otk_` token kuralı.
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/orders.ts`, `order-lines.ts`, `order-adjustments.ts`, `order-events.ts`, `order-notes.ts`, `order-counters.ts`; indeksler ve kısmi indeks; migration.
  2. `-` `features/orders/transitions/transitions.ts` (veri tablosu) + `applyTransition.ts` (`atomic()`, bekçi kancası çağrısı).
  3. `-` `features/orders/number/orderNumber.ts` (saf biçim) + `buildCounterStatement.ts` (settlement'e verilen koşullu sayaç ifadesi).
  4. `-` `features/orders/derived/refreshDerivedState.ts`: ödeme/teslimat sütunlarını ilgili yazmanın `atomic()`'ine ekleyen ifade üretici (`payments`/`fulfillment` `index.ts` türeticilerini kullanır).
  5. `-` `features/orders/edit/{buildAmendment,applyAmendment}.ts`: fark satırları + fiyat farkı + stok farkı; kişiselleştirme düzeltmesi (ek ücreti değiştirmeyen, `unfulfilled` iken) eski değeri nota ve denetime yazar.
  6. `-` `features/orders/cancel/cancelOrder.ts`: stok bırakma + iade başlatma + (B2B) kredi geri alma kancası.
  7. `-` `features/orders/notes/{addNote,editNote,deleteNote,listNotes}.ts`: 15 dk kuralı saf `canEditNote.ts`; müşteri notu bildirim olayı.
  8. `-` `features/orders/queries/{getOrder,listOrders,getGuestOrder}.ts`: imleçli, `has_personalization` süzgeci, `otk_` ile misafir erişimi.
  9. `-` `features/orders/steps/` adım zinciri tanımı (e-fatura → etiket → ERP → bildirim outbox satırları) ve admin'de "hangi adımda kaldı" sorgusu.
  10. `-` `apps/api/src/admin/orders/*.ts`, `apps/api/src/shop/orders/*.ts` ince handler'lar; admin sipariş sayfası/listesi `@openmers/ui` `DataTable` ile (aşama 3'e bırakılabilir, sözleşme burada).
- **Testler:**
  - `transitions.test.ts`, `canEditNote.test.ts`, `orderNumber.test.ts`.
  - `integration-tests/core/__tests__/orders/number.test.ts`: eşzamanlı settlement'larda numara boşluksuz ve tekil.
  - `integration-tests/core/__tests__/orders/cancel.test.ts`: iptal stok bırakır; iade `unknown` iken sipariş `cancelled`.
  - `integration-tests/api/__tests__/shop/guestOrder.test.ts`: `ord_` tek başına yetmez, iptal edilmiş `otk_` reddedilir; `customer` notu müşteriye görünür, `internal` görünmez.
  - Sorgu planı testi: müşteri ve kanal listeleri indeksli.
- **Bitti sayılır:** geçiş yanlış beklenen durumla 0 satır günceller ve olay yazmaz; numara yarış testi yeşil; türetilmiş sütunlar her ödeme/gönderim yazmasında tutarlı (karşılaştırma testi).
- **Açık sorular / riskler:** `completed`'e geçişin tetikleyicisi (teslim + cayma süresi sonu mu?) belgede yok. Düzeltme kaydının tablo adı belirtilmemiş. B2B onay kuyruğu sepet tarafında (aşama 4).

---

### 24. `docs/05-ticaret/11-musteriler.md` — müşteri modülü

- **Kaynak kararlar:**
  - Tek kayıt, e-posta başına: `email_normalized` benzersiz; hesap = `user_id` dolu; bağlama yalnız e-posta doğrulandıktan sonra; giriş yapılmadan checkout profil/adres değiştirmez; pazaryeri müşterisi `source = marketplace` ayrı satır, otomatik birleşmez.
  - Tablolar: `customers` (`state` `active · disabled · anonymized`, `version`, varsayılan adres kimlikleri müşteri satırında), `addresses` (≤ 20), `customer_stats`, `customer_spend (customer_id, currency)`, `customer_tags`, `customer_notes`, `customer_groups` (`manual · smart`, `rule`, `affects_commerce`, `rule_version`), `customer_group_members`, `customer_channels`, salt ekleme `consents` + `customer_consent_state`, `customer_merges`, `customer_exports`, FTS5 `customer_search` (aynı `atomic()`).
  - Akıllı grup kuralı kapalı şema, iç içe ≤ 2 düzey, ≤ 20 akıllı grup, ≤ 12 koşul; tek SQL derleyicisi üç yerde (tek müşteri, toplu, önizleme), bellek içi değerlendirici yok; olay anında + gecelik (1000'lik parça) + kural değişikliğinde `rule_version`.
  - Oturuma yalnız `affects_commerce = true` gruplar; değişince yalnız o müşterinin oturum `version`'ı artar; ticari grup üst sınırı 50.
  - İstatistik artırma değil yeniden hesaplama (idempotent); harcama net (`total_paid − total_refunded`), para birimi başına.
  - Anonimleştirme: ön koşul açık sipariş/aktif abonelik/bekleyen iade yok; e-posta `anon+<id>@invalid`; 10 gün bekleme ve iptal; yasal tutma; sipariş/fatura anlık görüntüleri saklama süresi kadar (`retention.invoice_years` varsayılan 10 ⚠️); imha kaydı ≥ 3 yıl. İzinler: `customers:read` maskeli, `read_pii` açar ve denetime yazar.
- **Bağımlılık:** 12 (Better Auth bağlantısı, oturum kümesi), 11 (izin, maskeleme, denetim), 9 (olaylar, işler), 23 (istatistik siparişten okur), 14 (`customer_channels`). İYS built-in app'i (`ConsentRegistry`) aşama 6.
- **Yapılacaklar** (belgenin bölüm 15 sırasıyla):
  1. `-` `packages/db/src/schema/customers.ts`, `addresses.ts`, `customer-search.ts` (FTS5); `features/customers/email/normalizeEmail.ts` (saf) ve `upsertCheckoutCustomer.ts` (hesapsız müşteri, profil değiştirmeme kuralı).
  2. `-` `features/customers/account/linkUserOnVerified.ts`: doğrulanmış e-postada `user_id` bağlama; doğrulama öncesi sipariş geçmişi gizli; `invite/sendAccountInvite.ts`.
  3. `-` `features/customers/addresses/{addAddress,updateAddress,deleteAddress,setDefault}.ts`: 20 sınırı, `version` kontrolü, varsayılan silinince alan temizlenir; ülke başına Zod adres şeması `addresses/schemas/<ülke>.ts`, TR il/ilçe tohum verisi ayrı seed.
  4. `-` `features/customers/stats/recomputeCustomerStats.ts` (olay işi, `(customer_id, placed_at)` indeksiyle yeniden okuma) + `jobs/sampleReconcileStats.ts`; `packages/db/src/schema/customer-stats.ts`.
  5. `-` `features/customers/queries/{listCustomers,getCustomer,searchCustomers}.ts`: imleçli, süzgeçler, FTS ön ek + e-posta tam eşleşme + telefon soneki; yaklaşık sayım; `mask/maskPii.ts` (saf).
  6. `-` `features/customers/tags/*.ts` (normalize, yeniden adlandır/birleştir işi) ve `notes/*.ts`.
  7. `-` `features/customers/groups/manual/*.ts` + `session/commerceGroupIds.ts`: `affects_commerce` gruplar, 50 sınırı, oturum `version` artışı.
  8. `-` `features/customers/consents/recordConsent.ts` (salt ekleme + durum, tek `atomic()`, IP özeti) ve imzalı `unsubscribe/unsubscribeLink.ts`; `ConsentRegistry` portu `consents/port.ts`.
  9. `-` `features/customers/anonymize/{checkPreconditions,requestDeletion,anonymizeCustomer}.ts`: 10 gün bekleme, yasal tutma bayrağı, imha kaydı, `customer.anonymized` olayı (kişisel veri yok); `jobs/retentionSweep.ts`.
  10. `-` `features/customers/groups/smart/{ruleSchema,compileRule}.ts` (saf: JSON → tek SQL koşulu) + `evaluateForCustomer.ts`, `recomputeGroup.ts` (parçalı), `previewRule.ts`.
  11. `-` `features/customers/bulk/*.ts` (≤ 500 kimlik veya "süzgeçteki hepsi" işi), kayıtlı görünümler, `export/exportCustomersJob.ts` (R2 parça CSV, 24 saat bağlantı, kişisel alan onayı) ve `export/personalDataExport.ts` (verilerimi indir).
  12. `-` `features/customers/merge/{previewMerge,mergeCustomers}.ts`: iki hesaplı red, daha kısıtlayıcı izin, `merged_into`, istatistik yeniden hesap.
  13. `-` `apps/api/src/admin/customers/*.ts`, `apps/api/src/shop/account/*.ts` (no-store, sahiplik filtresi, hız sınırı); `features/customers/events.ts` (sekiz olay adı + yükü).
- **Testler:** (bölüm 16 listesi)
  - `compileRule.test.ts` + `integration-tests/core/__tests__/customers/smartGroups.test.ts`: (a)(b)(c) aynı kümeyi verir, elle hesaplanan küme ile eşleşir.
  - `integration-tests/core/__tests__/customers/guestToMember.test.ts`: tek satır; doğrulanmamış kayıt misafir siparişlerini göremez; büyük/küçük harf ve boşluk aynı müşteri; benzersiz indeks ikinciyi reddeder; girişsiz checkout profili değiştirmez.
  - `addresses.test.ts`: 20 sınırı, varsayılan temizliği, sipariş anlık görüntüsü etkilenmez.
  - `stats.test.ts`: çift/sırasız olay aynı toplam. `session.test.ts`: ticari olmayan grup `version` artırmaz.
  - `anonymize.test.ts`, `merge.test.ts`, `export.test.ts` (izinsiz yönetici red, süresi dolan bağlantı 404, kişisel alanlar seçilmedikçe yok), `consents.test.ts` (yalnız ekleme, izinsize pazarlama olayı yok), `integration-tests/api/__tests__/admin/customersPii.test.ts` (maskeli e-posta, açılma denetimde).
- **Bitti sayılır:** bölüm 16'daki 13 test maddesinin hepsi yeşil; vitrin isteğinde müşteri sorgusu 0 (tur sayacı); admin listesi sipariş tablosunu taramıyor (`EXPLAIN QUERY PLAN`); log çıktısında e-posta deseni yok.
- **Açık sorular / riskler:** ATLANANLAR satır 19-25: Shopify "Amount spent" formülü, VUK 5 / TTK 10 yıl çelişkisi (`retention.invoice_years`), mesafeli satış ve imha tutanağı süreleri, ikas davranışı, İYS API'si, Medusa olay listesi, sınırların (20/20/12/50) ölçümsüz olması. Doğrulama öncesi "`disabled`-benzeri kısıtlı durum" ayrı bir `state` değeri mi belirsiz. `merged_into` ve "yasal tutma" alanları bölüm 2 tablo listesinde yok; şemaya eklenmeli.

---

### 25. `docs/05-ticaret/12-medya.md` — medya sahipliği, depolama sürücüleri, müşteri yüklemesi

- **Kaynak kararlar:**
  - Dosyanın tek sahibi `media`; diğerleri yalnız kullanım kaydı tutar; silme, referans varken tek SQL ifadesinde reddedilir ("önce kontrol et sonra yaz" yok).
  - Görsel boyutları yüklemede üretilir (ör. 320/640/1000 WebP), `ImageProcessor` portu (Cloudflare Images / Node'da `sharp`); işleyici yoksa tek boyut.
  - Tek varsayılan sürücü + `public`/`private` ad alanı; `private` bağlantı varsayılan 15 dk; sürücüler `r2`, `s3`, `local`, hepsi aynı sözleşme testini geçer; `cache_control` 1 yıl, içerik özeti dosya adında.
  - Müşteri yüklemesi: `private/personalization/<cart_public_id>/<özet>.<uzantı>`; `POST /shop/uploads` (`status = pending`) → doğrudan depoya → `POST /shop/uploads/:id/confirm` (HEAD boyut + sihirli sayı PNG/JPEG/WebP); ihlalde sil + `rejected`; onaysız 1 saatte süpürülür; SVG yok, varsayılan 10 MB / 8000 px; hız sınırı IP + sepet.
  - PDF/video önizlemesi yerleşik yok; video için `poster_media_id`.
- **Bağımlılık:** madde 5 (`storage` portu Platform'da), 6, 11 (imzalı bağlantı, hız sınırı), 9 (süpürme işi).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/media.ts`: `media` (`status`, `bucket`, `key`, `mime`, boyutlar, `owner_kind/owner_id`, `poster_media_id`), kullanım tabloları için ortak FK deseni; migration.
  2. `-` `features/media/storage/drivers/{r2,s3,local}.ts`: `storage` portunun üç uygulaması (Platform kurulumunda seçilir; `store.config.ts` `storage:` seçeneği).
  3. `-` `features/media/upload/{createUpload,confirmUpload}.ts`: imzalı URL, bekleyen kayıt; onayda HEAD + `sniffMagic.ts` (saf, ilk baytlardan tür ve boyut).
  4. `-` `features/media/images/sizeLadder.ts` (saf merdiven + `srcset`) ve `ImageProcessor` portu `images/port.ts`.
  5. `-` `features/media/delete/deleteMedia.ts`: referans yoksa silen tek koşullu ifade (`DELETE ... WHERE NOT EXISTS (kullanımlar)`).
  6. `-` `features/media/ownership/assertOwner.ts`: başka sepet/siparişin `media_id`'sini reddetme (sepet madde 21 kullanır).
  7. `-` `features/media/jobs/{sweepPending,sweepCartUploads}.ts`: 1 saatlik onaysızlar ve satın alınmayan sepet görselleri.
  8. `-` `features/media/links/signedUrl.ts`: `private` ad alanı için 15 dk bağlantı.
  9. `-` `apps/api/src/shop/uploads/*.ts`, `apps/api/src/admin/media/*.ts` ince handler'lar.
- **Testler:**
  - `sniffMagic.test.ts`: uzantısı/başlığı yanlış dosya reddedilir, SVG reddedilir.
  - `integration-tests/contract/__tests__/storageDriver.suite.ts`: üç sürücü aynı paketi geçer (S3 için MinIO).
  - `integration-tests/core/__tests__/media/delete.test.ts`: kullanımda olan medya silinemez; eşzamanlı "ata + sil" yarışında tutarlı sonuç (`integration-tests/race`).
  - `integration-tests/api/__tests__/shop/uploads.test.ts`: boyut/tür ihlalinde `rejected`, başka sepetin medyası reddedilir.
- **Bitti sayılır:** üç sürücü sözleşme testini geçer; kullanılan medya silme testi yeşil; yükleme gövdesi Worker'dan geçmez (imzalı URL testi).
- **Açık sorular / riskler:** ATLANANLAR: R2 imzalı PUT'ta boyut sınırı zorlanamıyor, sihirli sayı yeterliliği, Workers yükleme gövde sınırı, R2/Supabase S3 uyumluluğu doğrulanmadı. Cloudflare Images binding'inin maliyeti ve kotası belgede yok. "Yeniden kodlama yapılmaz" ile yükleme merdiveni üretimi müşteri yüklemesinde mi yönetici yüklemesinde mi ayrımı netleştirilmeli (belge: müşteri görselinde kodlama yok).

---

### 26. `docs/05-ticaret/13-icerik-ve-gezinme.md` — sayfalar, blog, menüler, bölümler

- **Kaynak kararlar:**
  - `pages` (kanal başına, Markdown, SEO alanları, `status`, `published_at`, çeviri), `posts`/`post_tags`, `menus`/`menu_items` (ağaç, sıralı; hedef koleksiyon/ürün/sayfa/yazı/dış bağlantı), `sections`, `redirects`.
  - Yasal sayfalar kanal ayarında **rol**; checkout onay kutuları rollere bağlı, sipariş onaylanan metin sürümünü saklar.
  - Bölüm = `type` + `settings` JSON; türler temada (Zod + Astro); yalnız referans taşır; sayfa referansları toplar ve tek `batch`; built-in app bölüm türü ekleyebilir, app ekleyemez.
  - Menü kanal başına bellekte; hedef silinirse öğe render edilmez, admin uyarısı; koleksiyon ağacından otomatik menü.
  - Markdown `html: false`, tek `renderMarkdown()`; kısa kod izin listesi; `draft → published`, ileri tarihli yayın; etiketler `page:<id>`, `menu:<id>`, `shell`; sürüm geçmişi yok, denetimde önce/sonra özeti.
- **Bağımlılık:** 14, 25 (görsel), 15 (koleksiyon/ürün referansları `catalogIndex` üzerinden), 10 (etiketler), 27 (redirects tablosu ve slug kuralı birlikte).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/content.ts` (`pages`, `posts`, `post_tags`, çeviriler) ve `navigation.ts` (`menus`, `menu_items`), `sections.ts`; migration.
  2. `-` `features/pages/markdown/renderMarkdown.ts` (saf, `html: false`, kısa kod izin listesi `shortcodes.ts` veri dosyası).
  3. `-` `features/pages/write/{createPage,updatePage,publishPage}.ts` + `jobs/publishScheduled.ts`; denetim özeti.
  4. `-` `features/pages/sections/collectRefs.ts` (saf) + `queries/resolveSectionRefs.ts` (tek `batch`).
  5. `-` `features/pages/menus/{menuRegistry,buildMenuTree,menuFromCollections}.ts`: bellekte ağaç, kırık hedef işaretleme.
  6. `-` `features/pages/legal/legalRoles.ts`: kanal ayarındaki rol → sayfa sürümü; checkout snapshot'ına sürüm (madde 21).
  7. `-` `apps/api/src/shop/pages/*.ts`, `apps/api/src/admin/pages/*.ts`, `admin/menus/*.ts`; admin bölüm formu Zod şemasından (`@openmers/ui`).
  8. `-` Varsayılan temada bölüm şeması örnekleri `apps/storefront/src/themes/default/src/sections/<ad>/schema.ts` (aşama 3 ile ortak; burada yalnız sözleşme).
- **Testler:**
  - `renderMarkdown.test.ts`: ham HTML kaçışlanır; izinsiz kısa kod düz metin.
  - `buildMenuTree.test.ts`: silinmiş hedef render edilmez.
  - `integration-tests/api/__tests__/shop/page.test.ts`: içerik sayfası tek veritabanı turu; ileri tarihli sayfa yayın anına kadar 404.
- **Bitti sayılır:** sayfa render'ı 1 turda; menü her istekte sorgulanmaz (tur sayacı 0); vitrin ve admin önizlemesi aynı `renderMarkdown` çıktısını verir.
- **Açık sorular / riskler:** `pages` ve `posts` aynı feature (`pages/`) mi olacak, ayrı `posts/` mu: monorepo belgesi yalnız `pages/` diyor. Taslak önizlemesinin yetki ve önbellek kuralı `07-istemciler/04-tema-sistemi.md`'ye bağlı. Harici CMS senkronu app işi.

---

### 27. `docs/05-ticaret/14-seo.md` — adresler, yönlendirme, meta, JSON-LD, site haritası

- **Kaynak kararlar:**
  - Kalıplar `/urun/<slug>` vb., önek kanal ve dil başına; slug `(kanal, dil)` içinde benzersiz; varyant `?variant=`, kanonik ürün adresi; filtreli liste `noindex, follow`, koleksiyon başına izinli temiz filtre.
  - `redirects` (`channel_id`, `from_path`, `to_path`, 301/302, `hits`, `source` `auto · manual · import`); slug değişince aynı `atomic()` içinde 301, zincir oluşmaz; silinen ürün ayarla 301 veya 410; yönlendirme yalnız 404 olacaksa bakılır.
  - Meta (`seo_title`, `seo_description`, OG, Twitter, `robots`) okuma modelinde hazır; kanonik birincil alan adıyla; `hreflang` + `x-default` indekslemede çözülür.
  - JSON-LD çekirdekte saf fonksiyon; fiyat anonim segment, stok kovadan.
  - `/sitemap.xml` dizin, tür/dil başına 50.000 sınırı, `catalog_index`'ten imleçli; `robots.txt` kanal başına, `b2b` kanalda `Disallow: /`; hazırlık ortamı `noindex`. Ürün beslemeleri (Google/Meta) iş ile dosyaya.
- **Bağımlılık:** 15 (`product_view`, `catalog_index`, slug çevirisi), 14 (alan adı, kanal türü), 26 (sayfa/yazı), 10.
- **Yapılacaklar:**
  1. `-` Yeni feature klasörü `packages/core/src/features/seo/` (`index.ts`); `packages/db/src/schema/redirects.ts` + migration.
  2. `-` `features/seo/redirects/{writeSlugRedirect,collapseChain}.ts`: slug güncelleme `atomic()`'ine eklenen ifadeler (katalog ve sayfalar `seo` `index.ts`'ini çağırır).
  3. `-` `features/seo/redirects/lookupRedirect.ts`: yalnız 404 yolunda tek indeksli sorgu + önbellek.
  4. `-` `features/seo/meta/buildMeta.ts` (saf, kanal şablonu `{ad} | {mağaza}`, boş alan türetme, kanonik, `robots`) ve `meta/buildHreflang.ts` (saf, indeksleyici kullanır).
  5. `-` `features/seo/jsonld/{product,itemList,breadcrumb,article,organization}.ts` (saf).
  6. `-` `features/seo/sitemap/{sitemapIndex,sitemapPage}.ts`: imleçli, 50.000 bölme, etiket `sitemap:<tür>:<dil>`; `robots/buildRobots.ts` (saf, kanal türü ve ortam).
  7. `-` `features/seo/feeds/buildFeedJob.ts`: Google Merchant / Meta besleme dosyası iş ile depoya.
  8. `-` `apps/storefront` rotaları `/sitemap.xml`, `/robots.txt` ve 404 → yönlendirme ara katmanı (aşama 3 vitrin iskeletiyle).
- **Testler:**
  - `jsonld/*.test.ts`: şema doğrulaması (Schema.org zorunlu alanları), B2B fiyatı girmez.
  - `buildHreflang.test.ts`: karşılıklılık + `x-default`.
  - `integration-tests/core/__tests__/seo/redirects.test.ts`: slug değişince 301, A→B→C yerine A→C.
  - `integration-tests/api/__tests__/shop/seo.test.ts`: filtreli sayfada `noindex` + kanonik; yayından kalkmış ürün site haritasında yok; B2B kanalda `Disallow: /`.
- **Bitti sayılır:** belge bölüm 8'deki yedi test yeşil; gerçek rota bulunduğunda `redirects` sorgusu atılmaz (tur sayacı); site haritası istek anında tüm kataloğu taramaz (`EXPLAIN QUERY PLAN`).
- **Açık sorular / riskler:** `seo` feature'ı monorepo belgesinde yok; eklenmesi belgeye işlenmeli. Kanallar arası kanonik seçimi kanal ayarı ama ayar adı yok. Core Web Vitals hedefleri ölçülmedi (k6/Lighthouse CI aşama 7). ATLANANLAR: `aggregateRating` kuralları doğrulanmadı.

---

### 28. `docs/05-ticaret/15-bildirimler.md` — türler, şablonlar, kanal, izin, teslimat

- **Kaynak kararlar:**
  - `notification_types` (kodda: olay, alıcı çözücü, veri şeması, kanallar), `notification_templates (tür, kanal, satış kanalı, dil)`, `notification_settings`, `notification_log` (alıcı maskeli).
  - Kanallar e-posta, SMS, push, admin içi, webhook; her biri port (`EmailProvider`, `SmsProvider`, `PushProvider`).
  - Şablon dili sınırlı (değişken, koşul, döngü, biçim), keyfi kod yok, Workers'ta çalışır; HTML + düz metin; varsayılanlar sürümle gelir, düzenlenmiş şablona dokunulmaz ("varsayılan değişti" notu); veri olay anındaki anlık görüntüden.
  - İşlemsel her zaman gider; pazarlama yalnız geçerli rızayla, tek tık çıkış `consents`'e yazar; toplu kampanya çekirdekte yok.
  - Olay → alıcı ve kanal başına bir outbox satırı (`kind = notify`), idempotency anahtarı = satır kimliği; sağlayıcı yoksa "gönderilmedi (sağlayıcı yok)" loglanır, hata değil; bounce ile pazarlama kesilir.
- **Bağımlılık:** 9 (outbox), 24 (`consents`, dil), 23/20/22 (tetikleyen olaylar), 14 (kanal başına gönderen), `packages/tokens` (e-posta renkleri, `+`). Sağlayıcı modülleri (`email-resend`, `sms-netgsm`) aşama 6.
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/notifications.ts`: templates, settings, log; migration (`notification_types` kodda, tablo değil ya da salt okunur kayıt — karar belgeye işlenmeli).
  2. `-` `features/notify/types/registry.ts` + `types/<tür>.ts` (müşteri, B2B, mağaza sahibi türleri, her biri ayrı dosya; veri şeması Zod).
  3. `-` `features/notify/template/engine.ts` (saf, sınırlı dil; Workers uyumlu kütüphane seçimi) + `renderEmail.ts` (ortak düzen, `packages/tokens`), `smsLength.ts` (saf, Türkçe karakter uyarısı).
  4. `-` `features/notify/dispatch/fanOut.ts`: olay → alıcı çözücü → kanal seçimi → outbox satırları; `isMarketing` için `customers` rıza durumu `index.ts` üzerinden.
  5. `-` `features/notify/dispatch/deliver.ts`: outbox tüketicisi, port çağrısı, idempotency anahtarı, sağlayıcı yoksa log.
  6. `-` `features/notify/ports/{email,sms,push,webhook}.ts` + `features/notify/log/maskRecipient.ts` (saf).
  7. `-` `features/notify/bounce/applyBounce.ts`: kalıcı geri dönen adresi işaretler.
  8. `-` `apps/api/src/admin/notifications/{templates,preview,testSend,settings}.ts` ince handler'lar.
- **Testler:**
  - `integration-tests/core/__tests__/notify/templates.test.ts`: her tür × her dil örnek veriyle hatasız render.
  - `consentGate.test.ts`: izin yokken pazarlama iletisi outbox'a yazılmaz.
  - `integration-tests/race/__tests__/notify/doubleDelivery.test.ts`: aynı olayın iki teslimatında tek ileti (sahte sağlayıcı çağrı sayısı).
  - `maskRecipient.test.ts` + log denetimi: `notification_log`'da tam e-posta yok.
- **Bitti sayılır:** belge bölüm 8'in dört testi yeşil; sağlayıcısız kurulumda sipariş akışı hatasız ilerler; şablon motoru Workers derlemesinde çalışır (wrangler/miniflare testi).
- **Açık sorular / riskler:** Şablon motoru kütüphanesi seçilmedi (Workers'ta `eval` yasak). İYS sorgu kancası aşama 6 (`modules/iys`), API doğrulanmadı. Admin içi bildirim kanalının tablosu belgede yok.

---

### 29. `docs/05-ticaret/16-raporlama.md` — özet tablolar, pano, dışa aktarma

- **Kaynak kararlar:**
  - Raporlar işlem tablolarından değil özet tablolardan: `stats_daily_sales`, `stats_daily_products`, `stats_daily_customers`, `stats_daily_b2b`, `stats_daily_funnel`.
  - "Gün" kanal saat dilimine göre; para birimleri toplanmaz (tek toplamda anlık kur, "yaklaşık").
  - Artımlı abone `order.placed`, `refund.settled`, `order.cancelled` → `ON CONFLICT DO UPDATE`, işlenen olay `stats_applied_events`'e aynı `atomic()` içinde; özet güncellemesi sipariş `atomic()`'i içinde değil.
  - Gecelik son N gün doğrulama düzeltir ve loglar; admin'den parçalı tam yeniden kurma.
  - Pano: bugün/dün/7-30 gün/özel, karşılaştırma; kartlar ciro, sipariş, ortalama sepet, iade oranı, dönüşüm; son siparişler işlem tablosundan tek indeksli sorgu.
  - `reports:read`, kanal başına süzülür; özetlerde kişisel veri yok; CSV dışa aktarma iş, muhasebe KDV dökümü.
- **Bağımlılık:** 23 ve 22 (olaylar, `refunds`), 24 (yeni/tekrar eden müşteri), 9 (abone), 11 (`reports:read`); `stats_daily_b2b` aşama 4, `stats_daily_funnel` müşteri olayları (Pixel/analitik) olmadan boş kalır.
- **Yapılacaklar:**
  1. `-` Yeni feature klasörü `packages/core/src/features/reports/`; `packages/db/src/schema/stats.ts` (beş tablo + `stats_applied_events`); migration.
  2. `-` `features/reports/time/channelDay.ts` (saf): olay zamanı + kanal saat dilimi → gün.
  3. `-` `features/reports/apply/{applyOrderPlaced,applyRefundSettled,applyOrderCancelled}.ts`: olay başına delta (saf `deltas/*.ts`) + tek `atomic()` yazma.
  4. `-` `features/reports/jobs/verifyRecentDays.ts` ve `jobs/rebuildAll.ts` (parçalı, imleçli).
  5. `-` `features/reports/queries/{dashboard,topProducts,topCustomers,recentOrders}.ts`: özetten okuma, para birimi başına.
  6. `-` `features/reports/export/{exportCsvJob,vatPeriodReport}.ts`: imleçli, depoya, süreli bağlantı + bildirim.
  7. `-` `apps/api/src/admin/reports/*.ts` + `orders.list?updated_since=` imleçli uç (madde 23 sorgusuyla).
  8. `-` Admin pano bileşenleri `@openmers/ui` ile (aşama 3 admin iskeletine bağlı; burada sözleşme ve sorgular).
- **Testler:**
  - `channelDay.test.ts`: gün sınırı kanal saat diliminde kesilir (UTC+3 23:30 örneği).
  - `integration-tests/core/__tests__/reports/idempotent.test.ts`: aynı olay iki kez → sayaç bir kez.
  - `refundNet.test.ts`: iade sonrası net ciro doğru.
  - `verify.test.ts`: kasıtlı bozulmuş özet gecelik görevle düzeltilir.
- **Bitti sayılır:** belge bölüm 8'in dört testi yeşil; pano sorguları `orders` tablosunu taramıyor (`EXPLAIN QUERY PLAN`, son siparişler hariç indeksli); özet tablolarda ad/e-posta sütunu yok.
- **Açık sorular / riskler:** `reports` feature'ı monorepo belgesinde yok. Huni (`stats_daily_funnel`) için "müşteri olayları" kaynağı çekirdekte tanımlı değil. `customer_stats` (madde 24, yeniden hesaplama) ile `stats_daily_customers` (artımlı) farklı yöntemler; tutarlılık karşılaştırması gerekir. ATLANANLAR: kayıt düzeyi politikasında rapor boyutu eksik raporlar kısıtlı yöneticiye kapalı.

---

### 30. `docs/05-ticaret/17-belgeler.md` — sipariş özeti, paketleme listesi, fiş

- **Kaynak kararlar:**
  - Çekirdek `documents` servisi: sipariş özeti, paketleme listesi (irsaliye değil), teslimat fişi, iade etiketi; resmî fatura e-fatura built-in app'inde ve değişmez.
  - Şablon HTML + yazdırma CSS'i, kanal başına logo/adres/dil; varsayılan yol tarayıcıda yazdır; sunucuda PDF için `DocumentRenderer` portu (Node'da sürücü, Workers'ta HTML ⚠️).
  - Üretimde `documents (order_id, kind, version, content_hash, r2_key)` yazılır; sipariş değişince yeni sürüm, eski durur.
  - Toplu yazdırma tek HTML sayfası; kişiselleştirilmiş siparişler üstte ve işaretli; kişiselleştirme alanları düz metin kaçışıyla, görsel küçük önizleme (imzalı bağlantı) + dosya adı, isteğe bağlı QR.
  - Erişim: müşteri yalnız kendi siparişi, admin `orders:read`; R2 anahtarları özel kovada, imzalı bağlantı. Premium yok; e-postaya ek bildirim sisteminde.
- **Bağımlılık:** 23 (sipariş anlık görüntüleri, kişiselleştirme düzeltmesi olayı), 25 (özel kova, imzalı bağlantı), 28 (e-posta eki), 14 (kanal logosu/dili).
- **Yapılacaklar:**
  1. `-` Yeni feature klasörü `packages/core/src/features/documents/`; `packages/db/src/schema/documents.ts` + migration.
  2. `-` `features/documents/templates/{orderSummary,packingSlip,deliveryNote,returnLabel}.ts` (saf HTML üretimi, düz metin kaçışı `escapeText.ts`), yazdırma CSS'i ayrı dosya.
  3. `-` `features/documents/render/personalizationBlock.ts` (saf): alan etiket: değer, görsel önizleme yeri, QR ayarı.
  4. `-` `features/documents/generate/generateDocument.ts`: içerik özeti aynıysa yeni sürüm yazmaz, farklıysa `version + 1`, R2'ye `private` yazar.
  5. `-` `features/documents/generate/onOrderAmended.ts`: kişiselleştirme düzeltmesi/sipariş düzeltmesi olayında yeni sürüm.
  6. `-` `features/documents/batch/batchPackingSlips.ts`: seçili siparişler tek HTML, kişiselleştirilmişler üstte.
  7. `-` `features/documents/port/documentRenderer.ts`: port tanımı; Node sürücüsü ayrı paket kararı açık.
  8. `-` `apps/api/src/admin/documents/{get,batch}.ts`, `apps/api/src/shop/orders/document.ts`: sahiplik denetimi, imzalı bağlantı.
- **Testler:**
  - `templates/*.test.ts`: HTML enjeksiyonu kaçışlanır; kişiselleştirme alanları basılır.
  - `integration-tests/core/__tests__/documents/versioning.test.ts`: sipariş değişince yeni sürüm, eski `r2_key` durur; aynı içerik yeni sürüm üretmez.
  - `integration-tests/api/__tests__/shop/documentAccess.test.ts`: başka müşterinin belgesi 404; admin `orders:read` olmadan reddedilir.
- **Bitti sayılır:** dört belge türü sipariş verisinden üretilir; sürümleme testi yeşil; toplu paketleme listesinde kişiselleştirilmiş siparişler üstte (test).
- **Açık sorular / riskler:** ATLANANLAR: Workers'ta PDF kitaplığı seçimi doğrulanmadı. `documents` feature'ı monorepo belgesinde yok. İade etiketi taşıyıcı app'inden gelir (madde 20); çekirdek belgenin buradaki rolü yalnız görünüm mü, belirsiz. Çeviri katalogu (i18n) altyapısı bu aşamada tanımlı değil.

---

## Bu gruptan ilk başlanacak 3 alt görev

1. **Madde 14.1 + 14.3-14.5:** `packages/db/src/schema/channels.ts` (varsayılan kanal tohumu) ve `features/channels/resolve/resolveChannel.ts` + `registry/channelRegistry.ts` — her ticaret sorgusu `ctx.channel`'a bağlı; aşama 1'den `Ctx` ve migration düzeni hazır olur olmaz yapılabilir.
2. **Madde 15.1-15.2 + 15.6:** katalog yazma tabloları, `catalog_index`/`product_view` şeması ve saf `buildIndexRows.ts`/`buildProductView.ts` — fiyat, stok ve vitrin bunların üstüne kurulur; saf indeks üreticisi DB olmadan birim testlenebilir.
3. **Madde 16.3 + 18.4:** saf `priceSelection.ts`/`linePrice.ts` ve `tax/calc/splitGrossNet.ts` — I/O gerektirmez, aşama 1 tamamlanmadan paralel yazılabilir ve sepet boru hattının (madde 21) çekirdek hesabıdır.
