# Sipariş

## 1. Tablolar

| Tablo | İçerik |
|---|---|
| `orders` | `public_id`, `number`, `channel_id`, `customer_id`, `company_id?`, `placed_by_customer_id?`, para birimi, toplamlar (net, vergi, brüt, indirim, kargo), adres anlık görüntüleri, `state`, `po_number?`, `payment_terms?`, `custom_fields`, `settlement_token` |
| `order_lines` | varyant referansı + **anlık görüntü** (ad, SKU, birim fiyat net/brüt, adet), depo, `personalization` (doğrulanmış JSON anlık görüntüsü), `base_unit_price`, `surcharge` ([05-sepet-ve-checkout.md](05-sepet-ve-checkout.md) bölüm 1.1) |
| `order_adjustments` | indirim satırları (promosyon, kupon, elle), satıra veya siparişe bağlı |
| `order_tax_lines` | satır başına oran ve tutar |
| `order_shipping_lines` | yöntem, ağırlık, ücret anlık görüntüsü |
| `order_events` | zaman çizelgesi: durum geçişleri, notlar, aktör |

İndeksler: `(channel_id, placed_at)`, `(customer_id, placed_at)`, `(company_id, placed_at)`, `number`, `state` kısmi indeksleri (açık siparişler).

## 2. Üç eksen

Vendure tek durum makinesi kullanır; biz ayırıyoruz, çünkü kısmi iade ve kısmi gönderim tek eksende birbirine karışır.

| Eksen | Değerler | Kaynak |
|---|---|---|
| Sipariş `state` | `placed → completed`, `cancelled` | saklanır |
| Ödeme durumu | `awaiting · authorized · paid · partially_refunded · refunded` | `payments` ve `refunds`'tan türetilir |
| Teslimat durumu | `unfulfilled · partially_fulfilled · fulfilled · delivered · returned` | `fulfillments`'tan türetilir |

Türetilen durumlar liste sorguları için `orders` üzerinde iki küçük sütunda **önbelleklenir** ve ilgili yazmayla aynı `atomic()` içinde güncellenir.

`placed` öncesi durum yoktur: sepet ve rezervasyon ayrı tablolardır. B2B onay bekleyen sipariş de `orders`'ta değildir; onay kuyruğundaki sepettir.

## 3. Geçişler ve bekçiler

Geçiş = koşullu güncelleme (`WHERE state = :beklenen`) + `order_events` satırı + outbox olayı, tek `atomic()`. Built-in app'ler geçişe bekçi ve sonrası kancası ekleyebilir; yeni durum ekleyemez ([../04-genisletme/01-stratejiler-ve-operasyonlar.md](../04-genisletme/01-stratejiler-ve-operasyonlar.md) bölüm 5).

## 4. Sipariş sonrası değişiklik

Siparişin satırları yerinde düzenlenmez. Değişiklik (kalem ekleme/çıkarma, adet, adres) bir **düzeltme kaydıdır**: fark satırları + fiyat farkı; ek tahsilat veya kısmi iade doğurur. Stok farkı aynı `atomic()` içinde ayrılır veya bırakılır. v1'de yalnızca gönderilmemiş kalemler için ve admin tarafından.

## 5. İptal

Gönderilmemiş kalemlerin `reserved` stoğu bırakılır, ödeme varsa iade başlatılır (iade sonucu belirsizse sipariş `cancelled`, iade `unknown` kalır ve uzlaştırmaya düşer), B2B kredi kullanımı geri alınır.

## 6. Sipariş numarası

`orderNumber` stratejisi; varsayılan yıl + kanal başına artan sıra. Sıra, settlement `atomic()`'i içinde sayaç satırının koşullu artırılmasıyla alınır; boşluksuzdur.

## 7. Misafir erişimi

`ord_...` bilmek yetmez; iptal edilebilir `otk_...` token'ı gerekir ([../03-cekirdek/03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md)).

## 8. Çok adımlı süreçler

Sipariş → e-fatura → kargo etiketi → ERP → bildirim bir **adım zinciridir**: her adım kendi outbox satırı, idempotent, bağımsız yeniden denenir; başarılı adım bir sonrakinin satırını yazar. Workflow motoru ve telafi yoktur; yarım kalan süreç admin'de hangi adımda kaldığıyla görünür.

## 9. Raporlama

Ciro ve adet raporları `orders` ve `refunds`'tan okunur; tablo yalnızca kesinleşmiş sipariş içerdiği için filtre gerekmez. Ağır raporlar işle hesaplanıp günlük özet tablosuna yazılır; admin panosu özetten okur.

## 10. Sipariş notları

Sipariş zaman çizelgesinin parçasıdır (çekirdek). Karar gerekçesi: [../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md).

Medusa eklentisi: yönetici sipariş sayfasında yorum yazar, geçmiş en yeniden eskiye, yazar bilgisi (ad, e-posta) kopyalanır, yalnızca ekleme, en çok 5000 karakter, depolama kişisel veri içerir.

| Alan | Kural |
|---|---|
| Tablo `order_notes` | `order_id`, `body` (≤ 5000), `visibility` (`internal · customer`), `pinned`, `author_id`, `author_name` (anlık görüntü), `created_at`, `edited_at?`, `deleted_at?` |
| Yazma | `orders:note` izni; müşteri notu yalnızca `customer` görünürlüğündedir ve bildirim gönderir (e-posta, siparişteki dile göre) |
| Düzenleme | 15 dakika içinde yazarı düzeltir; sonrası yalnız ekleme. Silme yumuşaktır (`deleted_at`), yönetici yetkisiyle; denetim kaydı |
| Geçmiş | Zaman çizelgesinde sipariş olaylarıyla birleşik; sabitlenen not üstte |
| Kişisel veri | `author_name` anlık görüntüsü; müşteri anonimleştirilince `customer` notları sipariş gövdesi gibi yasal saklamaya tabidir ([../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md) bölüm 17.1) |
| Ajan | `orders.addNote` (`write`), `orders.listNotes` (`read`) |

Medusa'dan fark: dahili/müşteri ayrımı, sabitleme, kısa düzeltme penceresi. Dışa aktarma ve API'de notlar `orders:read` ile görünür.
