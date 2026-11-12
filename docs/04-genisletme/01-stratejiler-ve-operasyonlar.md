# Stratejiler ve yapılandırılabilir operasyonlar

Çekirdek davranışını değiştirmenin yolu Vendure'daki gibidir: çekirdek kodu düzenlenmez, çekirdeğin sorduğu soruya başka bir cevap verilir. Hepsi süreç içi fonksiyon çağrısıdır; ağ turu yoktur.

## 1. İkisinin farkı

| | Strateji | Yapılandırılabilir operasyon |
|---|---|---|
| Kaç tane etkin | Soru başına bir | Aynı türden birçok |
| Nerede seçilir | `store.config.ts` (deploy) | Admin panelinde, argümanlarıyla (deploy yok) |
| Kim yazar | Geliştirici | Geliştirici yazar, mağaza sahibi seçip ayarlar |
| Örnek | Sipariş numarası nasıl üretilir | "Sepet 500 TL üstüyse" koşulu |

## 2. Stratejiler

Her strateji tek bir arayüz ve bir varsayılandır. Okuma yolunda çağrılanlar **saf ve senkron** olmak zorundadır (veritabanı ve ağ yok); gereken veri `ctx` ve parametrelerle verilir.

| Strateji | Soru | Varsayılan | Yol |
|---|---|---|---|
| `priceSelection` | Bu bağlam için hangi fiyat satırı | Öncelik sırasıyla ilk eşleşen fiyat listesi | okuma (saf) |
| `linePrice` | Sepet satırının birim fiyatı | Seçilen fiyat + miktar kademesi | sepet (saf) |
| `taxZone` | Hangi vergi bölgesi | Teslimat adresi, yoksa kanal varsayılanı | sepet (saf) |
| `taxLine` | Satırın vergi satırları | Kategori oranı | sepet (saf) |
| `stockLocation` | Hangi depodan ayrılacak | Kanalın depoları, öncelik sırasıyla | checkout |
| `stockDisplay` | Vitrine hangi kova | `tükendi / az kaldı / stokta` | indeksleme |
| `orderNumber` | Sipariş numarası | Yıl + sıra | settlement |
| `activeCart` | Etkin sepet hangisi | Oturum başına bir sepet | sepet |
| `cartMerge` | Girişte misafir sepeti ne olur | Birleştir | giriş |
| `guestCheckout` | Misafir alışveriş açık mı | Kanal ayarı | checkout |
| `orderPlaced` | Sipariş ne zaman kesinleşir | Ödeme alındığında; B2B'de vade onayıyla | settlement |
| `approvalPolicy` | Bu sipariş onay ister mi | Alıcı limiti (B2B) | checkout |
| `assetNaming`, `assetStorage` | Dosya adı ve yeri | Özet + `Platform.storage` | yükleme |
| `passwordPolicy` | Parola kuralı | En az uzunluk | kayıt |

**Portlar** aynı mekanizmanın dış servise bakan hâlidir: `EmailProvider`, `SmsProvider`, `InvoiceProvider`, `SearchProvider`, `ImageProcessor`, `StorageProvider`. Bunlar pluginle sağlanır ve yalnızca işlerde çağrılır.

## 3. Yapılandırılabilir operasyonlar

Operasyon = `code` + argüman şeması (Zod) + işlev. Admin, argüman şemasından formu kendisi üretir; seçim `{ code, args }` JSON'u olarak saklanır.

```ts
export const minCartTotal = definePromotionCondition({
  code: 'min_cart_total',
  args: z.object({ amount: z.number().int(), taxInclusive: z.boolean() }),
  check: (ctx, cart, args) => cart.subtotal(args.taxInclusive) >= args.amount,
});
```

| Tür | Görev | Yerleşikler |
|---|---|---|
| `PromotionCondition` | Promosyon geçerli mi | en az tutar, ürün/koleksiyon içerir, müşteri grubu, ilk sipariş |
| `PromotionAction` | Ne indirilecek | satır %, sipariş %, sabit tutar, ücretsiz kargo, X al Y öde |
| `ShippingEligibilityChecker` | Yöntem bu sepete sunulur mu | bölge, ağırlık aralığı, en az tutar |
| `ShippingCalculator` | Kargo ücreti | sabit, ağırlık kademesi, desi |
| `PaymentEligibilityChecker` | Yöntem sunulur mu | tutar aralığı, müşteri grubu, şirket vadesi |
| `PaymentHandler` | Ödemeyi başlat, doğrula, iade et | iyzico, PayTR, Stripe, havale, kapıda, vadeli (B2B) |
| `FulfillmentHandler` | Gönderi ve etiket oluştur | elle, Yurtiçi, Aras, MNG |
| `CollectionFilter` | Koleksiyona hangi ürünler girer | özellik değeri, etiket, fiyat aralığı, elle seçim |

`PaymentHandler.verifyWebhook` sağlayıcıya özgü olayı tek bir normalize sonuca çevirir: ödendi, serbest bırak, beklemede, iade senkronu. Webhook rotası sağlayıcı adını bilmez.

Operasyonlar sepet/checkout yolunda çalışır ve asenkron olabilir (ör. kargo firmasından canlı fiyat), ama zaman aşımı ve yedek değer zorunludur.

## 4. Uygulamalarla ilişki

Dışarıda çalışan bir uygulama da kargo oranı, ödeme veya vergi sağlayabilir. Bunun için her ilgili operasyon türünün genel bir `app` uygulaması vardır; işi uygulamanın senkron kancasına devreder ([03-tak-calistir-apps.md](03-tak-calistir-apps.md)). Çekirdek, sağlayıcının built-in app mi uygulama mı olduğunu bilmez.

## 5. Süreç bekçileri (durum geçişleri)

Vendure `OrderProcess`'in sade hâli: sipariş, ödeme ve teslimat durumları sabittir; built-in app bir geçişe **bekçi** (`canTransition` → izin ver / nedenle reddet) ve **sonrası kancası** (outbox satırı ekleme) kaydedebilir. Yeni durum eklenemez. Örnek: "şirket kredisi yetersizse `placed` geçişini reddet".

## 6. Kurallar

- Strateji ve operasyon kayıt defteri açılışta bir kez kurulur; istek başına arama `Map` erişimidir.
- Aynı `code` iki kez kaydedilirse açılış başarısız olur.
- Saklanan bir `code` artık kayıtlı değilse (built-in app kaldırılmış) o kayıt devre dışı sayılır ve admin'de uyarı gösterilir; istek çökmez.
- Her strateji ve operasyon türü için ortak sözleşme testi vardır; built-in app bunu geçmeden yayınlanmaz.
