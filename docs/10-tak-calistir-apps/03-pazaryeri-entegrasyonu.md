# Pazaryeri entegrasyonu (Trendyol, Hepsiburada, N11 …)

Bu, OpenMers'i pazaryeri yapmak değildir (o kapsam dışı). Mağazanın ürünlerini **başkasının pazaryerinde** satması ve oradan gelen siparişleri tek panelden yönetmesidir.

> Pazaryeri API'leri (uçlar, hız sınırları, kategori/özellik zorunlulukları, komisyon ve kargo kuralları) bu oturumda doğrulanmadı; her bağlayıcı kendi belgesinden yazılır.

## 1. Biçim

ERP gibi **dışarıda çalışan yerleşik uygulama**; içinde her pazaryeri bir **bağlayıcı** modülüdür ve ortak iskeleti paylaşır ([02-erp.md](02-erp.md) ile aynı desen: yetenek tablosu, eşleme, toplu idempotent uçlar, iş durumları, uzlaştırma, dead-letter).

**Her pazaryeri hesabı bir kanaldır** ([../05-ticaret/01-kanallar.md](../05-ticaret/01-kanallar.md)): hangi ürünlerin gittiği, fiyat listesi, stok kaynağı ve gelen siparişler o kanala bağlıdır. Vitrini olmayan kanaldır (`type = b2c`, alan adı yok).

> **Etkinleştirme.** Bu bir built-in app değil dışarıda çalışan uygulamadır: admin'den tıkla-kur, deploy gerekmez; her pazaryeri bağlayıcısı ayrı kurulur. Kurmayan mağazaya yük bindirmez.

## 2. Akışlar

| Akış | Yön | Sıklık |
|---|---|---|
| Kategori ve özellik sözlüğü | pazaryeri → uygulama | Seyrek (günlük/haftalık) |
| Ürün listeleme | mağaza → pazaryeri | Değişince (olay) + onay durumunu yoklama |
| Fiyat | mağaza → pazaryeri | Değişince, toplu |
| Stok | mağaza → pazaryeri | Değişince, sıkıştırılmış (aşağıda) |
| Sipariş | pazaryeri → mağaza | Webhook varsa anında, yoksa kısa aralıkla yoklama |
| Kargo / durum | iki yön | Gönderim oluşunca; teslimat yoklaması |
| İade / iptal talebi | pazaryeri → mağaza | Yoklama |
| Soru-cevap, değerlendirme | — | v1 dışı |

## 3. Ürün eşleme (en çok emek isteyen kısım)

Pazaryerleri kendi kategori ağacını ve kategori başına **zorunlu özellikleri** dayatır; ürün bunlar olmadan listelenemez.

- **Kategori eşleme:** mağaza koleksiyonu/ürün tipi → pazaryeri kategorisi. Bir kez yapılır, ürünler devralır.
- **Özellik eşleme:** mağaza özellik değeri (facet) → pazaryeri özellik değeri (ör. Renk: "Lacivert" → pazaryerinin renk listesindeki kimlik). Eşlenmeyen değerler "eksikler" listesine düşer.
- **Marka:** pazaryerinin marka kimliğiyle eşlenir.
- **Barkod zorunludur** (çoğu pazaryerinde eşleştirme anahtarı). Barkodsuz varyant listelenmez ve raporlanır.
- **Hazır olma denetimi:** her ürün için "bu pazaryerine gönderilebilir mi" durumu ve eksik alan listesi hesaplanır; admin toplu düzeltir.
- Pazaryerine özel başlık, açıklama ve görsel sırası ürünün o kanaldaki çevirisi/özel alanıdır.
- Listeleme gönderimi asenkrondur: pazaryeri toplu isteği kabul eder, sonucu sonra bildirir. Uygulama istek kimliğini saklar ve sonucu yoklar; ret nedenleri ürün başına gösterilir.

## 4. Fiyat

Pazaryeri kanalının kendi fiyat listesi vardır. İki kip: elle/ERP'den gelen ayrı fiyat, veya mağaza fiyatından **kuralla türetme** (komisyon ve kargo payı için yüzde/sabit ekleme, yuvarlama). Türetme, kaynak fiyat değişince bir işle hedef listeye **yazar**; gönderim anında hesaplanmaz.

## 5. Stok (aşırı satış riski burada)

Aynı stok hem kendi sitende hem pazaryerlerinde satılır; pazaryeri kendi tarafında senin stoğunu anlık göremez.

- Pazaryerine gönderilen miktar = `satılabilir − tampon`, kanala atanmış depolardan. Tampon kanal başına ayarlıdır (düşük stokta pazaryerini erken kapatmak için).
- Stok değişimi olayları **sıkıştırılır**: aynı varyant için bekleyen gönderim varsa yenisi eklenmez; gönderim anında güncel değer okunur. Hız sınırına uymak için toplu ve aralıklı gönderilir.
- Kendi sitende son ürün satılınca pazaryerine sıfır gönderimi önceliklidir.
- Yine de yarış mümkündür (pazaryeri siparişi, stok güncellemesi ulaşmadan gelir). Bu durumda sipariş **reddedilmez**; "stok istisnası" ile içe alınır ve operasyon ekranına düşer (iptal etmek pazaryerinde ceza doğurabilir, karar insana bırakılır).
- Periyodik uzlaştırma: pazaryerindeki stok ile olması gereken karşılaştırılır, farklar düzeltilir.

## 6. Sipariş içe alma

Pazaryeri siparişi **gerçek sipariştir** (tarihsel içe aktarma değil): stok ayrılır, fatura kesilir, kargo çıkar.

- `orders.importExternal(order, idempotencyKey = pazaryeri sipariş no)`: sepet/rezervasyon aşamasını atlar, tek `atomic()` içinde siparişi yazar ve stoğu koşullu ayırır. Aynı sipariş iki kez gelirse ikincisi etkisizdir.
- Fiyatlar pazaryerinin bildirdiği tutarlardır (mağaza fiyatı yeniden hesaplanmaz); promosyon uygulanmaz.
- **Ödeme:** tahsilatı pazaryeri yapar. Sipariş `paid` olarak, `external` ödeme yöntemiyle kaydedilir; para iadesi mağazadan başlatılmaz. Pazaryeri komisyonu ve hakediş mutabakatı v1 dışıdır (alan olarak saklanır).
- **Müşteri:** pazaryerleri çoğunlukla maskeli e-posta/telefon verir. Müşteri kaydı o kanala özel oluşturulur; pazarlama izni **yoktur** ve bu müşterilere mağaza bildirimi/Pixel olayı gitmez.
- **Fatura:** e-fatura built-in app'i normal akışla keser ([01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)); fatura bilgisi pazaryerine yüklenir (bağlayıcı yeteneği).
- **Kargo:** çoğu pazaryeri kendi anlaşmalı kargo kodunu/etiketini verir. Bağlayıcı bunu `FulfillmentHandler` olarak sağlar; mağazanın kendi kargo built-in app'i bu siparişlerde kullanılmaz.
- **Süre:** pazaryerleri kargoya verme süresi dayatır; son tarih siparişte saklanır ve yaklaşınca uyarı üretir.

## 7. İptal ve iade

Pazaryerinden gelen iptal/iade talebi mağazada iade (return) kaydı açar; onay/ret mağazadan yapılıp pazaryerine iletilir. Stok iadesi normal akıştır. Para iadesini pazaryeri yapar.

## 8. Çekirdeğe gereken eklentiler

1. `orders.importExternal` ucu (yukarıda) ve `external` ödeme yöntemi.
2. Vitrinsiz kanal desteği (alan adı zorunlu değil).
3. Varyantta barkod alanı (var) ve "kanala hazır" durumunu uygulamanın yazabileceği metadata.
4. Olaylar: `stock.available_changed` (kova değil **adet** değişimi; yalnızca abonesi varsa üretilir), `price.changed`, `product.published_to_channel`.
5. İzinler: `orders:import`, `stock:read`, `fulfillments:write`.

Dördüncü madde önemlidir: vitrin için stok olayı yalnızca kova değişince üretiliyordu; pazaryeri adedi ister. Adet olayı yalnızca en az bir abone varsa yazılır, böylece pazaryeri kullanmayan mağazada ek yazma maliyeti olmaz.

## 9. Bağlayıcı arayüzü

```ts
interface MarketplaceConnector {
  id: string;
  capabilities: { webhooks: boolean; invoiceUpload: boolean; ownCargo: boolean; returns: boolean; qa: boolean };
  configSchema: ZodSchema;
  test(): Promise<Result>;
  pullCategories(cursor): Promise<Page<MpCategory>>;
  pullAttributes(categoryId): Promise<MpAttribute[]>;
  pushProducts(batch): Promise<{ requestId: string }>;
  pollRequest(requestId): Promise<BatchResult>;
  pushPrices(batch): Promise<BatchResult>;
  pushStock(batch): Promise<BatchResult>;
  pullOrders(cursor): Promise<Page<MpOrder>>;
  verifyWebhook?(request): Promise<MpEvent | null>;
  shipOrder(order, shipment): Promise<Result>;
  uploadInvoice?(order, pdfUrl): Promise<Result>;
  pullClaims?(cursor): Promise<Page<MpClaim>>;
  decideClaim?(claim, decision): Promise<Result>;
}
```

## 10. Admin ekranı

Bağlantılar; kategori/özellik/marka eşleme; ürün hazır olma listesi ve toplu gönderim; fiyat kuralı; stok tamponu; sipariş akışı ve son tarih uyarıları; hatalı işler ve yeniden deneme; stok uzlaştırma raporu.

## 11. Sıralama

1. Ortak iskelet + çekirdek eklentileri + sahte bağlayıcı; stok yarışı ve çift sipariş testleri.
2. İlk gerçek bağlayıcı: Trendyol (aday; en yaygın).
3. Hepsiburada, N11.
4. Amazon, Çiçeksepeti, Pazarama vb. aynı sözleşmeyle.

## 12. Test

Aynı pazaryeri siparişinin iki kez gelmesinde tek sipariş; stok yetersizken siparişin istisnayla içe alınması; sıkıştırılmış stok gönderiminin son değeri göndermesi; maskeli müşteriye bildirim ve Pixel olayı gitmemesi; hız sınırı altında toplu gönderimin sürmesi; eşlenmemiş zorunlu özelliği olan ürünün gönderilmemesi.

## 13. Açık sorular

1. İlk pazaryeri hangisi?
2. Komisyon ve hakediş mutabakatı kapsamda mı?
3. Pazaryeri müşterileri raporlarda ayrı mı gösterilsin?
4. Stok tamponu sabit adet mi, yüzde mi?
