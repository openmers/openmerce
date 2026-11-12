# Stok

Model Vendure'dandır (depo, `on_hand`, ayrılmış, hareket kaydı); ayırma anı farklıdır: Vendure ödemede ayırır, biz checkout başında.

## 1. Tablolar

| Tablo | İçerik |
|---|---|
| `stock_locations` | Depo / mağaza; `public_id`, ad, adres, `active` |
| `channel_stock_locations` | Hangi kanal hangi depolardan satar, öncelik |
| `stock_levels` | `(variant_id, location_id)` → `on_hand`, `reserved`, `safety`, `version` |
| `stock_movements` | Eklemeli kayıt: `adjustment · reservation · release · sale · return · transfer · erp_sync`, miktar, referans |

**Satılabilir = `on_hand − reserved − safety`**, kanalın depoları üzerinden toplanır.

`track_inventory = false` olan varyant stok kontrolünden geçmez. `allow_backorder` açık varyantta satılabilir eksiye düşebilir (alt sınır ayarlı).

## 2. Yaşam döngüsü

| An | Etki | Tek `atomic()` |
|---|---|---|
| Checkout başlar | `reserved += adet` (koşullu) | rezervasyon satırıyla birlikte |
| Vazgeçme / süre dolması / ödeme başarısız | `reserved −= adet` | rezervasyon durumuna koşullu |
| Sipariş kesinleşir | değişmez (`reserved` kalır; artık siparişe ait) | settlement |
| Gönderim oluşur | `on_hand −= adet`, `reserved −= adet` | fulfillment satırıyla birlikte |
| Gönderim öncesi iptal | `reserved −= adet` | |
| İade teslim alındı | `on_hand += adet` (satılabilir durumdaysa) | |

Ayırma ifadesi:

```sql
UPDATE stock_levels SET reserved = reserved + :n
 WHERE variant_id = :v AND location_id = :l
   AND on_hand - reserved - safety >= :n
   AND EXISTS (SELECT 1 FROM checkout_reservations WHERE id = :r AND status = 'active')
```

Rezervasyon satırının kendisi, tüm kalemlerin yeterli olduğu koşuluna bağlı `INSERT ... SELECT ... WHERE` ile oluşur; biri yetmezse satır oluşmaz ve hiçbir ayırma yapılmaz ([05-sepet-ve-checkout.md](05-sepet-ve-checkout.md)).

## 3. Depo seçimi

`stockLocation` stratejisi rezervasyondan **önce** hangi kalemin hangi depodan ayrılacağını belirler (varsayılan: kanalın öncelik sırası, tek depodan karşılanabiliyorsa o). Karar bir okumaya dayanır ama doğruluk koşullu yazmadadır: araya başka alıcı girerse rezervasyon oluşmaz, strateji bir kez daha çalıştırılır, yine olmazsa "stok yetersiz" döner.

## 4. Neden ERP ile yarışmaz

ERP mutlak eldeki miktarı gönderir; bu yalnızca `on_hand`'e yazılır. Mağazanın rezervasyonları `reserved`'da durur ve ERP yazmasından etkilenmez. Eski tek sayılı modeldeki "ERP stoğu rezervasyonu ezdi" sorunu yapısal olarak kalkar. ERP'nin kendi rezervinin mağaza siparişlerini içerip içermediği bağlayıcı sorusudur ([../10-tak-calistir-apps/02-erp.md](../10-tak-calistir-apps/02-erp.md) bölüm 6).

`stock.setMany` ucu `(variant, location, on_hand)` alır, `version` korumalı yazar ve `erp_sync` hareketi düşer.

## 5. Vitrine yansıma

Vitrin kesin adet görmez; `stockDisplay` stratejisi kovayı üretir (`out · low · in`). Kova `catalog_index`'te durur. Stok yazmaları kovayı değiştirmediyse indeks ve önbellek dokunulmaz kalır; yoğun satışta önbellek çalkalanmaz. B2B kanalında strateji kesin adedi veya "50+" gibi kademeyi açabilir; bu veri önbellekli sayfaya değil, giriş yapmış kullanıcıya ayrı uçtan gelir.

## 6. Tutarlılık denetimi

Zamanlanmış görev `reserved` değerini açık rezervasyonlar ve gönderilmemiş sipariş kalemlerinden yeniden hesaplar; fark varsa düzeltmez, admin'e raporlar. `stock_movements` toplamı ile `on_hand` da karşılaştırılır.

## 7. Yazma yükü

Bir checkout, kalem başına bir `stock_levels` satırı günceller; tek yazıcı sınırı burada hissedilir. Önlemler: tek `atomic()`, hareket kaydı aynı batch'te, indeksleme yalnızca kova değişiminde. Kanıtlanmış ihtiyaçta sıcak varyant başına Durable Object kuyruğu ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md) bölüm 6).

## 8. Paketleme birimi dönüşümü (adet / koli / palet)

Koli ve palet ayrı varyanttır ([../06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md](../06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md) bölüm 2) ama **stok tek havuzdan** düşer. İki ayrı stok tutulursa koli açılınca adet stoku ve koli stoku birbirinden kopar.

**Model.** Varyanta iki alan: `base_variant_id?` ve `unit_factor` (tam sayı ≥ 1, varsayılan 1). Taban varyant (adet) kendi `stock_levels` satırlarını taşır; paket varyantının (koli = 12, palet = 480) **`stock_levels` satırı yoktur**. Zincir yoktur: her paket doğrudan tabana bağlanır, çarpan tabana göredir (palet = 480 adet, "10 koli" değil). Taban varyantın kendisi paket olamaz. Aynı ürünün varyantları arasında olmak zorundadır.

| İşlem | Kural |
|---|---|
| Satılabilir (paket) | `floor(taban satılabilir / unit_factor)` |
| Rezervasyon | N paket → `N × unit_factor` taban birimi, taban varyantın `stock_levels.reserved`'ına koşullu artış (`reserved + ? <= on_hand - safety`); hareket kaydı hem paket satırını hem taban miktarını yazar (`stock_movements.units`) |
| Sipariş satırı | `variant_id` pakettir; `stock_units = adet × unit_factor` anlık görüntü olarak saklanır (çarpan sonradan değişse bile eski sipariş doğru iade/iptal edilir) |
| Teslimat, iade, iptal | Taban birimle düşer / geri döner |
| Sayım ve transfer | Yalnızca taban varyantta |
| ERP senkronu | Yalnızca taban varyant SKU'su stok taşır; paket SKU'ları çarpanla eşlenir |
| Kanal / depo | Paket varyantı taban stokunu görür; kanal–depo eşlemesi tabana uygulanır |

**Vitrin.** Taban stok değişince `reindex(product_id)` zaten çalışır; ürünün bütün paket varyantlarının satılabilirliği aynı satırda yeniden hesaplanır (ek sorgu yok). Stok eşiği ("son 3 adet") birimini taban birimle gösterir.

**Sınırlar.** Çarpan değişikliği yalnızca açık rezervasyon/sipariş yokken (yeni paket varyantı eklemek serbest). Kesirli çarpan yok. Koli açma (palet bozma) işlemi gerekmez; tek havuz olduğu için doğal çalışır. Ayrı stok tutmak isteyen mağaza paketi `base_variant_id` boş bırakır (mevcut davranış). Mevcut ayrı stoklu varyantları dönüştürmek için `openmers stock merge-units` komutu: paket stoklarını çarpanla tabana ekler, eski hareketleri bırakır, tek `adjustment` yazar.

**Test.** 1 koli = 12: 25 adetle koli satılabilir 2; iki kişi aynı anda son kolileri almaya çalışır (koşullu yazma, biri reddedilir); iptal/iade doğru çarpanla döner; çarpan değişikliği açık rezervasyonda reddedilir; ERP taban stoku güncellenince paket satılabilirliği indekste değişir; paket varyantına stok sayımı yazılamaz.

## 9. Temin / üretim süresi

`variants.lead_time_days` (tamsayı, boş = yok): stokta olmayan veya kişiselleştirilen varyantın tahmini hazırlık süresi. Vitrinde "X iş günü içinde kargoda" metnine çevrilir, `catalog_index` ve `product_view`'a işlenir. Bu bir **vaat değil tahmindir**: stok rezervasyonunu, `allow_backorder` kararını veya teslimat tarihi hesabını değiştirmez. Kişiselleştirilebilir ürünün tanımında varyant değerini ezen bir `personalization.lead_time_days` olabilir.
