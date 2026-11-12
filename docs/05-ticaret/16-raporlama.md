# Raporlama

Hedef: mağaza sahibinin günlük sorularını (ne sattım, kime, hangi üründen, ne kadar iade) admin'den hızlıca cevaplamak. Bir iş zekâsı aracı değildir; derin analiz için veri dışa aktarılır.

## 1. İlke: işlem tablolarını raporla taramayız

`orders` yalnızca kesinleşmiş sipariş içerdiği için sorgular basittir, ama geniş tarih aralığında tam tarama yine pahalıdır ve yazma yoluyla aynı veritabanını paylaşır. Bu yüzden raporlar **özet tablolardan** okunur.

## 2. Özet tablolar

| Tablo | Anahtar | Ölçüler |
|---|---|---|
| `stats_daily_sales` | gün, kanal, para birimi | sipariş sayısı, brüt, indirim, net, vergi, kargo, iade tutarı, iade sayısı |
| `stats_daily_products` | gün, kanal, varyant | adet, net tutar, iade adedi |
| `stats_daily_customers` | gün, kanal | yeni müşteri, tekrar eden müşteri, misafir siparişi |
| `stats_daily_b2b` | gün, şirket | sipariş sayısı, net tutar, açık bakiye |
| `stats_daily_funnel` | gün, kanal | oturum, sepete ekleme, checkout başlatma, sipariş (müşteri olaylarından) |

- "Gün" kanalın saat dilimine göredir.
- Farklı para birimleri toplanmaz; rapor para birimi başına gösterir. Tek para biriminde toplam isteniyorsa siparişteki anlık kur kullanılır ve bu, "yaklaşık" olarak işaretlenir.

## 3. Güncelleme

- Artımlı: `order.placed`, `refund.settled`, `order.cancelled` olaylarının abonesi ilgili günün satırlarını `ON CONFLICT DO UPDATE` ile artırır. Abone idempotenttir: işlenen olay kimliği `stats_applied_events`'e yazılır, aynı `atomic()` içinde.
- Doğrulama: gecelik görev son N günü işlem tablolarından yeniden hesaplar ve özetle karşılaştırır; fark varsa düzeltir ve loglar.
- Yeniden kurma: admin'den başlatılan parçalı iş tüm özeti sıfırdan üretir (yeni ölçü eklendiğinde).
- Özet güncellemesi sipariş `atomic()`'inin içinde **değildir**; checkout'u yavaşlatmaz. Raporlar saniyeler-dakikalar gecikmeli olabilir.

## 4. Admin panosu

Bugün / dün / son 7-30 gün / özel aralık; önceki dönemle karşılaştırma. Kartlar: ciro, sipariş, ortalama sepet, iade oranı, dönüşüm. Listeler: en çok satan ürünler, en çok satın alan müşteriler/şirketler, düşük stok. Kanal seçiciye uyar.

"Bugün"ün canlı sayısı özetten gelir; ek olarak son siparişler listesi işlem tablosundan indeksli tek sorgudur.

## 5. Dışa aktarma

- CSV dışa aktarma (siparişler, kalemler, müşteriler, stok) bir iştir: imleçli okur, depolamaya yazar, süreli indirme bağlantısı e-postayla gelir. İstek içinde büyük dosya üretilmez.
- Muhasebe için dönem raporu: KDV oranına göre dökümlü satış ve iade.
- Ham veriyi düzenli çekmek isteyen için imleçli Admin API uçları (`orders.list?updated_since=`); veri ambarı bağlantıları uygulamadır.

## 6. Yetki ve gizlilik

`reports:read` izni; kanal başına rolle süzülür. Özet tablolar kişisel veri içermez (müşteri ve şirket kimlikleri iç kimliktir, ad içermez). Müşteri silme talebi özetleri etkilemez.

## 7. Kapsam dışı

Kohort analizi, yaşam boyu değer tahmini, ilişkilendirme (attribution) modelleri, özel rapor oluşturucu. Bunlar için dışa aktarma veya uygulama.

## 8. Test

Aynı olayın iki kez işlenmesinde sayacın bir kez artması; iade sonrası net cironun doğruluğu; gün sınırının kanal saat dilimine göre kesilmesi; gecelik doğrulamanın kasıtlı bozulmuş özeti düzeltmesi.
