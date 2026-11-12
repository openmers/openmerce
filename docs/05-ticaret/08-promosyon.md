# Promosyon

Vendure modeli: promosyon = koşullar + eylemler, ikisi de yapılandırılabilir operasyon.

## 1. Tablolar

**`promotions`**: ad, kanal(lar), `starts_at`, `ends_at`, `enabled`, `priority`, `coupon_code?`, `usage_limit?`, `per_customer_limit?`, `conditions` (JSON: `[{code, args}]`), `actions` (JSON), `stackable`.
**`promotion_usage`**: promosyon, müşteri, sipariş; sınırlar için.

Kuponsuz promosyon otomatik uygulanır; kuponlu olan sepete kod girilince aday olur.

## 2. Değerlendirme

Etkin promosyonlar kanal başına **bellekte** durur (derlenmiş koşul/eylem işlevleriyle). Sepet hesaplamasında:

1. Tarihi ve kanalı uyanlar süzülür.
2. Öncelik sırasıyla her birinin koşulları çalışır (hepsi doğruysa geçerli).
3. Eylemler `order_adjustments` üretir: satır indirimi, sipariş indirimi (satırlara oransal dağıtılır), kargo indirimi.
4. `stackable` olmayan bir promosyon uygulandıysa kalanlar atlanır.

Koşullar saf ve senkrondur. "İlk sipariş" gibi veritabanı gerektiren koşullar, gereken veriyi sepet verisi toplanırken tek sorguyla ister (`requires: ['customerOrderCount']`); koşulun içinde sorgu atılmaz.

## 3. Sınırlar

Kullanım sınırı sepette **gösterim için** kontrol edilir, **doğruluk için** rezervasyon `atomic()`'inde koşullu artırılır: `UPDATE promotions SET used = used + 1 WHERE id = ? AND used < usage_limit AND EXISTS (rezervasyon)`. Sınır aşıldıysa rezervasyon oluşmaz ve müşteriye kuponun tükendiği söylenir. Rezervasyon bırakılırsa sayaç geri alınır.

Etkisiz promosyon: kullanım sayacı (`used`, `promotion_usage`) yalnızca promosyon rezervasyon anında hesaplanan sepette **en az bir satıra, siparişe veya kargoya sıfırdan büyük indirim** ürettiyse artar. Koşulları sağlayıp 0 indirim üreten (örn. zaten indirimli satırda üst üste binmeyen) promosyon sınırı tüketmez ve `promotion_usage` satırı yazılmaz. Karar `used + 1` koşullu güncellemesiyle aynı `atomic()` içinde verilir: etkisizse güncelleme çalışmaz.

## 4. B2B

Müşteri grubu ve şirket koşulları yerleşiktir. Sözleşme fiyatı promosyon değil fiyat listesidir; varsayılan olarak `contract` fiyatlı satıra promosyon uygulanmaz (promosyon başına ayar).

## 5. Vitrinde gösterim

"İndirimli" rozetleri fiyat listesinden (`sale` türü, `compare_at_amount`) gelir ve indekslenir. Sepet düzeyindeki promosyonlar (kupon, X al Y öde) önbellekli sayfada hesaplanmaz; yalnızca sepette görünür. Kampanya afişi içeriktir.

## 6. Kapsam dışı (şimdilik)

Hediye kartı, sadakat puanı (built-in app örneği), müşteri başına tek kullanımlık kod üretimi (toplu kod tablosu sonradan).
