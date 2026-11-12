# Katalog ve arama

## 1. Yazma modeli

| Tablo | Not |
|---|---|
| `products` | Vitrin birimi; ad, slug, açıklama çeviride; `personalization?` (JSON, kişiselleştirme tanımı) |
| `product_variants` | Satılan birim: SKU, barkod, ağırlık, ölçüler, vergi kategorisi, `track_inventory`, en az sipariş adedi, paket katı, `fulfillment_type` (`physical` · `digital`, [10-kargo-ve-teslimat.md](10-kargo-ve-teslimat.md) bölüm 7), `lead_time_days?` ([04-stok.md](04-stok.md) bölüm 9), `personalization?` (JSON, ürün tanımını ezer, [05-sepet-ve-checkout.md](05-sepet-ve-checkout.md) bölüm 1.1) |
| `product_options`, `option_values` | Beden, renk; varyant = seçenek değerleri kombinasyonu |
| `facets`, `facet_values` | Filtrelenebilir özellikler (marka, malzeme); ürün veya varyanta bağlanır; `private` olanlar yalnızca admin içindir |
| `collections` | Ağaç yapılı; üyelik elle veya `CollectionFilter` operasyonlarıyla |
| `collection_variants` | **Hesaplanmış** üyelik; işle güncellenir |
| `*_translations` | Dil başına ad, slug, açıklama |
| `*_channels` | Kanal görünürlüğü: `product_channels`, `variant_channels` (ürün atanınca tüm varyantlar varsayılan atanır; [01-kanallar.md](01-kanallar.md) bölüm 2), `collection_channels` … |
| `collections.inherit_filters` | bool, varsayılan açık (aşağıdaki "Koleksiyon ağacı" paragrafı) |
| `product_assets` | Medya kullanımı ([12-medya.md](12-medya.md)) |

Her ürünün en az bir varyantı vardır; fiyat ve stok her zaman varyanttadır. "Kategori" ayrı bir kavram değildir; koleksiyondur.

## 2. Okuma modeli

Vitrin yalnızca bu iki tablodan okur. Vendure'un `SearchIndexItem` tablosunun karşılığıdır.

### `catalog_index`

Satır anahtarı: `(channel_id, lang, variant_id)`.

| Sütun | Kullanım |
|---|---|
| `product_id`, `product_public_id`, `slug`, `name`, `sku` | kart ve bağlantı |
| `thumb` | hazır görsel URL kümesi |
| `collection_ids`, `facet_value_ids` | filtre (aşağıda) |
| `price_min`, `price_max`, `currency` | kanalın varsayılan fiyat listesine göre; sıralama ve aralık filtresi |
| `stock_bucket` | `out · low · in` |
| `sort_name`, `created_at`, `sales_rank` | sıralama anahtarları |
| `group_first` | ürün başına tek kart göstermek için işaret |

Filtre eşleşmeleri iki dar yardımcı tablodadır: `catalog_index_facets(channel_id, facet_value_id, variant_id)` ve `catalog_index_collections(channel_id, collection_id, variant_id)`; ikisi de kaplayan indeks taşır. Koleksiyon sayfası = `catalog_index_collections` üzerinde aralık taraması + `catalog_index`'e birincil anahtarla erişim.

Tam metin: `catalog_fts` (FTS5; ad, SKU, özellik değerleri, açıklama özeti), dil başına. D1'de de vardır. Türkçe için katlama (ı/i, ş/s …) indeksleme ve sorgu anında aynı yardımcıyla yapılır.

**Koleksiyon ağacı ve filtre mirası.** Koleksiyonun kendi filtreleri vardır; `inherit_filters` (varsayılan **açık**) iken alt koleksiyon üstün filtrelerini de uygular (kesişim: alt küme olur). Üyelik indeksleme anında düz çözülür: `catalog_index_collections` yalnızca koleksiyonun **kendi etkin filtresine** (miras dahil) uyan varyantları yazar; çalışma anında ağaç gezilmez. Üst koleksiyonun filtresi değişirse tüm alt dalın üyeliği yeniden hesaplanır (arka plan işi, dal başına). `inherit_filters` kapalıysa yalnızca kendi filtreleri. Üst koleksiyon sayfası alt koleksiyonların ürünlerini kendiliğinden içermez; isteyen "alt koleksiyonları dahil et" seçeneğini açar (sorguda alt kimlikleri `IN` ile birleştirir, derinlik en çok 3).

### `product_view`

Satır anahtarı: `(channel_id, lang, slug)`. Değer: ürün sayfasının ihtiyaç duyduğu **hazır sunum modeli** (JSON): varyantlar, seçenekler, görsel `srcset`'leri, özellikler, açık özel alanlar, ekmek kırıntısı, önceden hesaplanmış benzer ürünler. Ürün sayfası tek satır okur.

Fiyat bu JSON'da varsayılan fiyat listesiyle durur. Farklı segment için fiyatlar aynı turda `prices` tablosundan tek `IN` sorgusuyla alınıp üzerine yazılır ([03-fiyat.md](03-fiyat.md)).

## 3. İndeksleme

- Ürün, varyant, çeviri, fiyat, koleksiyon, görsel veya stok **kovası** değişince komut bir `reindex(product_id)` olayı yazar. Aynı ürün için bekleyen iş varsa yenisi eklenmez.
- İş, ürünün tüm `(kanal, dil)` satırlarını tek `atomic()` içinde yeniden yazar ve ilgili önbellek etiketlerini temizler.
- Stok adedi değişip kova değişmediyse indeksleme tetiklenmez.
- Koleksiyon filtresi değişince üyelik parçalı bir işle yeniden hesaplanır, sonra etkilenen ürünler indekslenir.
- Tam yeniden indeksleme admin'den başlatılır; imleçli, parçalı ve kesintiye dayanıklıdır.
- Toplu içe aktarmada indeksleme tamponlanır ve içe aktarma bitince bir kez çalışır (Vendure `bufferUpdates`).
- Sonuç: vitrin **nihai tutarlıdır** (saniyeler). Sepet ve checkout indeksten değil yazma modelinden okur; yanlış fiyat veya stokla sipariş oluşmaz.

## 4. Sorgular

| İstek | Sorgu |
|---|---|
| Koleksiyon listesi | eşleşme tablosunda aralık + imleç |
| Filtreli liste | en seçici filtreden başlayıp diğerlerini `EXISTS` ile |
| Filtre sayıları | eşleşme tablosunda `GROUP BY facet_value_id`; segment başına önbellekli |
| Arama | `catalog_fts MATCH` → `catalog_index` |
| Ürün sayfası | `product_view` tek satır |

Hepsi imleçlidir ve `EXPLAIN QUERY PLAN` testine tabidir.

## 5. Büyük katalog

FTS5 ve bu indeks tek veritabanında on binlerce ürün için tasarlanmıştır; sınır ölçülmedi. Daha büyüğü veya yazım hatası toleransı için `SearchProvider` built-in app'i (Meilisearch/Typesense) aynı `reindex` olaylarını tüketir; liste ve ürün sayfası yine yerel okuma modelinden gelir.

## 6. İçe / dışa aktarma

CSV ve toplu API (`products.upsertMany`) aynı yolu kullanır: parçalı işler, kayıt başına sonuç, içerik özetiyle değişmeyeni atlama. ERP bağlayıcıları da bunu çağırır.

## 7. Varyant görselleri

Görsel üç düzeye bağlanabilir; hepsi aynı `product_assets` tablosundadır (`product_id`, `variant_id?`, `option_value_id?`, `asset_id`, `position`).

| Düzey | Kullanım |
|---|---|
| Ürün | Ortak galeri |
| Seçenek değeri (ör. Renk = Kırmızı) | Kırmızının tüm bedenleri aynı görselleri paylaşır; 5 renk × 6 beden için 30 değil 5 atama |
| Varyant | Tek bir varyanta özel görsel |

Çözümleme sırası: varyantın kendi görselleri → seçili seçenek değerinin görselleri → ürün galerisi. Bu sıra **indeksleme anında** çözülür: `product_view` JSON'u her varyant için hazır görsel listesi (`srcset` dahil) taşır, `catalog_index` satırı varyantın kendi küçük görselini. Vitrin varyant değiştirince galeriyi ek istek atmadan değiştirir.

Admin'de "Seçenek değerine yükle" kısayolu vardır: örnek, Renk = Kahverengi değerine bir kez yüklenen görseller o rengin tüm bedenlerini kapsar (arayüz kısayolu, şema değişmez).

Görsel kullanım kaydı medya kurallarına tabidir ([12-medya.md](12-medya.md)): atamayı kaldırmak dosyayı silmez. Toplu içe aktarma ve ERP senkronu görseli SKU veya seçenek değeriyle eşler.
