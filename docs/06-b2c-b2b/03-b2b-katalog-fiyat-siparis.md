# B2B katalog, fiyat ve sipariş girişi

## 1. Fiyat

Veri modeli ortaktır ([../05-ticaret/03-fiyat.md](../05-ticaret/03-fiyat.md)). B2B kullanımı:

- **Liste fiyatı:** "Bayi", "Toptan" gibi listeler müşteri grubuna veya doğrudan şirketlere hedeflenir.
- **Sözleşme fiyatı:** `contract` türünde, tek şirkete hedefli, geçerlilik tarihli liste; yalnızca anlaşılan varyantları içerir, kalanı alttaki listeden gelir.
- **Miktar kademesi:** `min_qty` satırları. Vitrin kademe tablosunu gösterir; sepet adede uyan kademeyi uygular.
- **Vergi hariç gösterim:** kanal ayarı; sepet net + KDV + toplam gösterir.
- **Fiyatı gizleme:** `b2b` kanalında anonim ziyaretçiye fiyat yerine "giriş yapın". Bu ayrı bir segmenttir (fiyatsız), aynı önbelleği kullanır.

ERP'den fiyat senkronu bu tablolara yazar ([../10-tak-calistir-apps/02-erp.md](../10-tak-calistir-apps/02-erp.md)).

## 2. Katalog görünürlüğü

- Kanal düzeyi: B2B kanalına atanmamış ürün orada yoktur.
- Şirkete özel alt küme: şirket bir veya birkaç **katalog koleksiyonuna** bağlanır; okuma sorgusu `catalog_index_collections` üzerinden süzer. Görünürlük kümesi segmentin parçasıdır (fiyat listesi gibi az sayıda küme beklenir).
- Yalnızca B2B'de satılan varyant (koli, palet) ayrı varyanttır; paket katı ve en az adet varyant alanıdır. Stok tek havuzdan düşer: paket varyantı `base_variant_id` + `unit_factor` taşır ([../05-ticaret/04-stok.md](../05-ticaret/04-stok.md) bölüm 8).

## 3. Sipariş kuralları

| Kural | Nerede | Denetim |
|---|---|---|
| En az sipariş tutarı | kanal veya şirket | sepet hesaplaması (uyarı) + rezervasyon (ret) |
| En az adet, paket katı | varyant | satır eklemede + rezervasyonda |
| En fazla adet | varyant veya şirket | aynı |

Kurallar saf doğrulayıcılardır; sepette ve rezervasyonda aynı fonksiyon çalışır.

## 4. Hızlı sipariş

- **SKU + adet girişi** ve **CSV yükleme:** tek uç (`cart.addMany`), SKU'lar tek `IN` sorgusuyla çözülür, kayıt başına sonuç döner (bulunamadı, kanalda yok, kat hatası).
- **Yeniden sipariş:** eski siparişin satırları güncel fiyat ve stokla yeni sepete kopyalanır.
- **Kayıtlı listeler:** adlandırılmış ürün listeleri (şirket içinde paylaşılabilir); listeden sepete tek tık.
- **Adlandırılmış sepetler:** bir alıcının birden çok açık sepeti (proje veya şube başına).

Büyük sepette satır ekleme tek satırlık koşullu yazmadır; her eklemede bütün sepet yeniden yazılmaz.

## 5. Sipariş alanları

`po_number` (müşterinin satın alma sipariş numarası; şirket başına benzersizliği ayarla), `requested_delivery_date`, sipariş notu, teslimat şubesi (şirket adres defterinden). Bunlar çekirdek alanlardır; daha fazlası özel alanla eklenir.

## 6. Stok gösterimi

`stockDisplay` stratejisi B2B kanalında kesin adet, "50+" veya depo bazlı dağılım dönebilir. Bu veri önbellekli katalogda değil, giriş yapmış kullanıcının `stock.availability(variantIds[])` ucundadır (tek sorgu, `no-store`, hız sınırlı). Tedarik süresi ve ön sipariş (`allow_backorder`) varyant alanıdır.

## 7. Belgeler

Sipariş onayı, proforma, irsaliye ve fatura PDF'leri e-fatura / belge built-in app'inden gelir ve sipariş zaman çizelgesine eklenir. Cari ekstre kredi belgesinde.
