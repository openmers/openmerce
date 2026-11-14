# Özel alanlar ve metadata

Çekirdek tablolarına veri iliştirmenin iki yolu vardır. İkisi de şema değişikliği gerektirmez.

| | `custom_fields` (Vendure) | `metadata` / `private_metadata` (Saleor) |
|---|---|---|
| Tanım | Kodda, Zod şemasıyla (`store.config.ts` veya built-in app) | Tanımsız anahtar-değer |
| Tip güvenliği | Var; API sözleşmesine ve admin formuna girer | Yok (metin) |
| Kim yazar | Çekirdek ekip, built-in app, mağaza geliştiricisi | Uygulamalar |
| Filtre / sıralama | İstenirse ifade indeksiyle | Hayır |
| Vitrine açık mı | Alan başına `public: true` | `metadata` açık, `private_metadata` yalnızca Admin API |

## 1. Özel alanlar

- Desteklenen varlıklar: ürün, varyant, koleksiyon, müşteri, şirket, adres, sipariş, sipariş satırı, kanal, teklif.
- Saklama: varlık tablosundaki tek `custom_fields` JSON sütunu. Vendure her alan için sütun açar; biz açmıyoruz, çünkü built-in app eklemek D1'de migration zorlamasın.
- Alan `index: true` ise migration üreteci `json_extract` üzerine ifade indeksi ekler; yalnızca bu alanlar filtrelenebilir.
- Alan `public: true` ise okuma modeline (indeksleme anında) kopyalanır; vitrin bunu ek sorgu olmadan alır.
- Çevrilebilir özel alan `translations` tablosundaki JSON sütununda durur.
- Yazma anında Zod ile doğrulanır; tanımı kaldırılan alanın verisi durur ama API'de görünmez.
- Admin formu şemadan üretilir; built-in app isterse kendi React bileşenini verir.
- İlişki tipi (başka varlığa referans) `public_id` olarak saklanır ve API'de çözülmez; isteyen ayrı çağırır. (Çözmek N+1 kapısıdır.)

## 2. Metadata

- Anahtarlar uygulama kimliğiyle öneklenir (`acme.loyalty.points` (ayırıcı her yerde `.`)); bir uygulama başkasının anahtarını yazamaz.
- Boyut sınırı: anahtar başına 2 KB, varlık başına 16 KB.
- Uygulama büyük veya sorgulanacak veriyi kendi veritabanında tutar.

> Not: sepet/sipariş satırı kişiselleştirmesi (gravür, hediye notu, görsel) özel alan değildir; ayrı sütun ve doğrulama yolu vardır ([../05-ticaret/05-sepet-ve-checkout.md](../05-ticaret/05-sepet-ve-checkout.md) bölüm 1.1). Özel alan satır fiyatını veya satır kimliğini değiştirmez.

## 3. Hangisi

Sorgulanacak, formda görünecek veya vitrinde kullanılacak veri → özel alan. Dış sistemin kendi notu → metadata. Dış sistem kimliği → `external_refs` ([../03-cekirdek/03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md)).
