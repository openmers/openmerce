# Yerleşik uygulama #2: ERP entegrasyonu

Mağaza ile muhasebe/ERP sistemi arasında ürün, stok, fiyat, sipariş ve müşteri verisini senkronize eder. Pixel gibi **sıradan bir uygulamadır** ([Uygulamalar](../04-genisletme/03-tak-calistir-apps.md)): çekirdeğe özel kanca eklenmez. Uygulama içinde her ERP ayrı bir **bağlayıcı (connector)** modülüdür; ortak iskelet bir kez yazılır.

> **Kaynaklar ve eksikler**
> - Medusa'nın ERP tarifi (`docs.medusajs.com/resources/recipes/erp` + Odoo rehberi) okundu. Tarif bir **iskelet**: kod parçalarında TODO'lar var, yeniden deneme, idempotency, webhook doğrulaması ve ID eşleme dışında hata yönetimi anlatılmıyor (aşağıda "Medusa'dan dersler").
> - **Reddit'i ben okuyamadım.** Arama aracı reddit.com'u engelliyor, sayfa çekme `old.reddit.com`'u reddetti, Chrome eklentisi bağlı değildi. Reddit'e dayanan noktalar, kullanıcının getirdiği harici inceleme dosyasından (`erp-integration-architecture.md`) alındı; o dosyadaki Reddit bağlantılarını ve özetlerini **doğrulamadım**. Bu belgedeki kararlar, o dosyadan bağımsız olarak Medusa tarifinden ve kendi akıl yürütmemden çıkan sonuçlarla örtüşenlerdir; örtüşmeyenler "harici inceleme" olarak işaretlendi (bölüm 1a).
> - ERP API ayrıntıları (Logo, Netsis, Mikro, Paraşüt, Odoo, ERPNext vb.) kontrol edilmedi; yalnızca arayüz tasarlandı.

## 1. Medusa'dan dersler

| Medusa tarifi | Gözlem | OpenMers kararı |
|---|---|---|
| ERP'yi saran bir modül + iş akışları + abone + zamanlanmış iş | Doğru ayrım | Aynı: bağlayıcı arayüzü + ortak çalıştırıcı |
| Ürünler günlük zamanlanmış işle çekilir; sayfalama 10'luk; mevcut ürün `external_id` ile bulunur | Yeniden çalıştırılabilirliği yalnızca `external_id` araması sağlıyor | Eşleme tablosu + içerik özeti (hash) ile değişiklik algılama (bölüm 5) |
| **Fiyat** ERP'den sepete ekleme anında canlı çekilir | Her sepete eklemede ERP gecikmesi ve ERP kapalıyken satış yok | Fiyatlar senkronla tabloya yazılır; canlı fiyat yalnızca müşteriye özel B2B için ve sonraki aşamada |
| **Stok** senkronize edilmez; sepete eklemede `getQty` ile bakılır | Aynı gecikme ve çökme sorunu | Stok senkronize edilir (bölüm 6) |
| Sipariş `order.placed` abonesiyle ERP'ye `createOrder` ile gider, dönen kimlik sipariş `metadata`'sına yazılır | Yeniden deneme ve idempotency anahtarı yok; ERP'de çift sipariş riski | Outbox + sipariş `public_id`'si ERP'ye referans olarak gider (bölüm 7) |
| Hata olursa telafi fonksiyonu ERP siparişini siler | Silmenin kendisi başarısız olabilir | Telafi yok; durum makinesi + uzlaştırma (bölüm 9) |
| ERP→mağaza sipariş güncellemesi bir webhook rotası | İmza doğrulaması anlatılmıyor, gövde TODO | İmzalı, tekrarlanabilir olay girişi (bölüm 8) |
| Sipariş durumu ve müşteri senkronu eksik | — | Müşteri eşleme ve durum akışı bölüm 7–8'de |
| Kimlikler `external_id` ve `metadata` içinde | Yapılandırılmamış | Birinci sınıf `external_refs` (bölüm 4) |

## 1a. Harici inceleme (`erp-integration-architecture.md`)

Kullanıcının getirdiği dosya aynı tarifi inceliyor ve bağımsız bir "Integration Engine" öneriyor. Büyük kısmı bu belgeyle örtüşüyor (adaptör + yetenek tablosu, veri sahipliği, outbox, idempotency, dead-letter, uzlaştırma, eşleme tablosu, admin ekranları). Ondan alınan ve bu belgeye eklenenler:

| Harici inceleme | Bu belgede |
|---|---|
| Gelen webhook'lar kalıcı **inbox**'a yazılıp sağlayıcı olay kimliği benzersiz kısıtıyla tekilleştirilmeli | Bölüm 8 |
| Başlangıç / artımlı / webhook senkronu ayrımı; webhook olsa bile periyodik uzlaştırma | Bölüm 8 |
| Büyük kataloglarda belleği ve hız sınırını aşmamak için bölünmüş çalıştırma | Bölüm 8 (Workers sınırları dahil) |
| İş yaşam döngüsü: `pending / processing / success / retrying / failed / dead_letter` | Bölüm 9 |
| Her kayıt bağımsız; bozuk bir sipariş toplu aktarımı durdurmaz | Bölüm 9 |
| Depo bazlı stok bileşenleri (eldeki, ayrılmış, bloke, güvenlik) ve B2B stoğunun B2C'ye açılmaması | Bölüm 6 |
| Fiyat listeleri, müşteri grubu, geçerlilik tarihi, vergi dahil/hariç; sunucuda doğrulama | Bölüm 5a |
| Alan eşleme ve uyuşmazlık (`conflicts`) kayıtları; birden çok bağlantı | Bölüm 4, 5 |
| İlk uçtan uca sağlayıcı olarak Odoo | Bölüm 13 |

Ayrıldığımız noktalar: (1) Motor çekirdeğin içinde değil, **dışarıda çalışan uygulamadır** ([Uygulamalar](../04-genisletme/03-tak-calistir-apps.md); Workers'ta çalışma anında kod yüklenemez). (2) Harici incelemenin `getInventory(sku, warehouse)` gibi kayıt başına arayüzü toplu çalışmaya uymaz; bağlayıcı **sayfalı toplu çekme** sunar. (3) Medusa tarifinin tek seferde tüm kataloğu çekip OOM yaptığı iddiası kontrol ettiğim kadarıyla tam doğru değil: Odoo örneği `offset/limit` ile sayfalıyor; asıl risk, naif uyarlamaların sayfalamayı ve imleci kaydetmemesi.

## 2. Hangi sistem neyin sahibi

Çakışmayı baştan kuralla çözeriz; her varlık için tek yazıcı vardır. Varsayılanlar ve mağaza sahibinin değiştirebildiği seçenekler:

| Veri | Varsayılan sahip | Yön | Not |
|---|---|---|---|
| Ürün kataloğu (ad, SKU, barkod, KDV, ağırlık) | **ERP** | ERP → mağaza | Alan başına "ERP'den ez / mağazada kalsın" seçilebilir. Açıklama, görsel, SEO metni her zaman mağazada kalır |
| Fiyat | ERP | ERP → mağaza | Fiyat listesi başına |
| Stok | ERP (depo gerçeği) | ERP → mağaza | Mutlak miktar; mağaza rezervasyonları ayrı tutulur (bölüm 6) |
| Sipariş | Mağaza | mağaza → ERP | ERP'de sipariş/irsaliye/fatura oluşur |
| Sipariş durumu, kargo, takip no | ERP **veya** mağaza | ERP → mağaza | Depo ERP'deyse ERP sahibi; yoksa mağaza |
| Müşteri | Mağaza | mağaza → ERP | ERP'de cari hesap eşlenir/oluşturulur (vergi no / e-posta) |
| Fatura | ERP | ERP → mağaza | ERP e-faturayı kesiyorsa bağlayıcı `InvoiceProvider` portunu doldurur (bölüm 10) |
| İade | Mağaza | mağaza → ERP | İade olayı ERP'ye iade/iptal belgesi olarak gider |

Alan başına sahiplik ayarı ERP uygulamasının admin ekranında tutulur. "Ürünleri mağazada yönetiyorum, ERP'ye yalnızca sipariş gitsin" kullanım şekli (yalnızca mağaza → ERP) açık bir kipdir.

## 3. Mimari

```
          ┌────────────── ERP uygulaması (packages/plugins/erp) ──────────────┐
 ERP ◀──▶ │  bağlayıcı (Logo / Netsis / Odoo / CSV ...)                    │
          │  ortak çalıştırıcı: imleç · toplu iş · hız sınırı · hash       │
          │  eşleme tablosu · eşleşmeyenler · çalıştırma günlüğü           │
          └───────▲───────────────────────────────┬────────────────────────┘
        okuma/yazma│ (izinli token, toplu uçlar)    │ webhook (order.paid, order.updated, refund.created)
                  │                                 ▼
               Mağaza API  ◀──────────  outbox (yeniden deneme, dead)
```

- **Dışarıda çalışan uygulama** ([Uygulamalar](../04-genisletme/03-tak-calistir-apps.md)), yerleşik olarak depoda gelir. ERP anahtarları uygulamanın kendi şifreli deposunda durur, mağazanın sır kasasına girmez.
- **Mağaza → ERP** akışı hep outbox'tandır ([outbox](../03-cekirdek/04-olaylar-isler-outbox.md)): sipariş varsa ERP bildirimi de vardır, yeniden deneme ve `dead` durumu hazırdır.
- **ERP → mağaza** akışı hep mağazanın herkese açık, toplu ve idempotent uçlarından geçer; uygulama veritabanına doğrudan yazmaz.

### 3.1 Erişim kipleri

Birçok ERP (özellikle yerel kurulu masaüstü/sunucu ERP'leri) internetten erişilebilir değildir ve mağaza bulutundan çağrılamaz. Bu bir varsayım; bağlayıcı başına doğrulanmalı. İki kip desteklenir:

| Kip | Nasıl | Ne zaman |
|---|---|---|
| **Doğrudan** | Uygulama ERP'nin API'sini çağırır | ERP internetten erişilebilir veya bulut ERP |
| **Ajan** | Müşterinin ağında çalışan küçük bir `openmers-erp-agent` (Node) yalnızca **dışarıya** bağlanır: mağazadan bekleyen outbox kayıtlarını çeker (kirala → işle → onayla) ve yerel ERP'ye yazar; ERP'den okuduğu değişiklikleri toplu uçlara iter | ERP güvenlik duvarının arkasında |

Ajan kipinde "kirala/onayla" mantığı outbox'ın sahiplenme adımıyla aynıdır; ajan çökerse kiralama süresi dolar ve kayıt başkasına/tekrar verilir.

### 3.2 Genel (bağlayıcısız) yollar

- **Dosya:** zamanlanmış CSV/XML/JSON içe ve dışa aktarma (SFTP veya URL). Bağlayıcısı olmayan her ERP için ilk adım budur.
- **Webhook + API:** ERP tarafı kendi yazan özel entegratör için mağazanın toplu uçlarını doğrudan kullanır; ERP uygulaması gerekmez.
- **Özel uygulama:** [Uygulamalar](../04-genisletme/03-tak-calistir-apps.md) belgesindeki özel uygulama yolu ile tek mağazaya özel bir bağlayıcı yazılabilir.

## 4. Çekirdeğe gereken eklentiler

Bu uygulama için çekirdekte şunlar şart (diğer uygulamalar da kullanır):

1. **`external_refs`** tablosu: `(kaynak, bağlantı_id, varlık_türü, yerel_public_id, dış_id, dış_kod (örn. SKU), dış_sürüm/özet, durum, son_eşleşme_zamanı)`. `bağlantı_id` sayesinde aynı kayıt birden çok ERP bağlantısında farklı kimliklerle durabilir. Uygulamanın kendi tarafında ayrıca alan eşlemeleri, çalıştırma/iş kayıtları, `webhook_inbox` ve `conflicts` (iki tarafın da değiştirdiği alan) tabloları bulunur. Ürün, varyant, kategori, müşteri, sipariş, depo/konum için. Kaynak uygulama kimliğiyle öneklenir; bir uygulama başkasının eşlemesini yazamaz. `metadata` alanı bunun yerine kullanılmaz.
2. **Toplu uçlar:** `products.upsertMany`, `stock.setMany`, `prices.setMany`, `customers.upsertMany`. Her biri: en çok N kayıt, kayıt başına sonuç (oluşturuldu/güncellendi/değişmedi/hata), kısmi başarıya izin, **`Idempotency-Key` başlığı** (aynı anahtarla tekrar = aynı sonuç).
3. **`Idempotency-Key` desteği** tüm yazma uçlarında (uygulama API'si genelinde).
4. **İmleçli listeleme:** `orders.list?updated_since=&cursor=` (ajan ve uzlaştırma için).
5. **Olaylar:** `order.paid`, `order.updated`, `order.cancelled`, `refund.created`, `customer.created`, `stock.low` outbox'tan webhook olarak.
6. **İzinler:** `products:write`, `stock:write`, `prices:write`, `customers:write`, `orders:read`, `fulfillments:write`, `invoices:write`.

## 5. Eşleme ve değişiklik algılama

- Eşleşme anahtarı sırası: önce eşleme tablosu, yoksa **SKU**, yoksa barkod. Otomatik eşleşme yalnızca tek ve belirsizliksiz sonuçta yapılır; çoklu/boş sonuç **eşleşmeyenler** listesine düşer ve admin'den elle eşlenir veya atlanır. Belirsiz kayıt asla tahminle yazılmaz.
- Her çekilen kaydın içerik özeti (hash) eşleme tablosunda saklanır; özet değişmediyse mağazaya yazılmaz (gereksiz yazma yok, D1 yazma yükünü korur).
- Silinen/pasifleşen ERP ürünü mağazada silinmez, **pasife alınır** (siparişlerde geçmişi korumak için).
- ERP'de varyant yapısı mağazadan farklıysa (ör. ERP'de her renk-beden ayrı stok kartı) bağlayıcı bunu mağaza ürün/varyant modeline çevirir; eşleme kuralı bağlayıcı yapılandırmasında durur.

## 5a. Fiyat

- Fiyatlar senkronla tabloya yazılır (canlı ERP çağrısı yok). Desteklenen boyutlar: **fiyat listesi** (B2C/B2B), **müşteri grubu**, para birimi, miktar kademesi, ürün/varyant bazı, **geçerlilik başlangıç/bitiş tarihi**, vergi dahil/hariç.
- Sepet ve sipariş aşamasında fiyat **her zaman sunucuda** yeniden hesaplanır; istemciden gelen fiyat güvenilmez.
- Müşteriye özel sözleşme fiyatı v1 dışıdır (soru 4).

## 6. Stok senkronu (en zor kısım)

> **Güncelleme:** Çekirdek stok modeli artık depo başına `on_hand` / `reserved` / `safety` tutuyor ([../05-ticaret/04-stok.md](../05-ticaret/04-stok.md)). ERP mutlak miktarı yalnızca `on_hand`'e yazar; checkout rezervasyonları `reserved`'da durur ve ERP yazmasıyla ezilmez. Aşağıdaki "taahhüt" hesabı bu yüzden yalnızca **ERP'ye henüz ulaşmamış siparişler** için geçerlidir.

Sorun: mağazada stok iki yerden değişir. ERP'den gelen mutlak miktar, mağazanın checkout rezervasyonlarıyla ([checkout](../05-ticaret/05-sepet-ve-checkout.md)) ve ERP'ye henüz ulaşmamış siparişlerle yarışır. Naif "stok = ERP miktarı" yazmak, rezerve edilmiş veya ödenmiş ama ERP'ye henüz işlenmemiş ürünleri geri verir ve **aşırı satışa** yol açar.

Çözüm:

- ERP stoğu mağazada ayrı bir değer olarak tutulur: `erp_qty` + `erp_qty_at` (ERP'nin ölçtüğü an).
- Satılabilir stok = `erp_qty` − **ERP'nin henüz görmediği taahhütler**. Taahhüt = açık rezervasyonlar (`active`/`payment_pending`) + ödenmiş ama ERP tarafından **onaylanmamış** siparişlerin (outbox'ta `pending`/`failed`/`sent` ama ERP onayı yok) adetleri.
- Yazma, mevcut stok sürümüne koşulludur (`UPDATE ... WHERE stock_version = ?`); rezervasyonla yarışan yazma kaybeden tarafta yeniden hesaplanır. Tek `atomic()` içinde: taahhütleri topla, stok değerini yaz.
- ERP siparişi onayladığında (ERP'nin stoğu kendisi düşürdüğü varsayımıyla) o siparişin adedi taahhütten çıkar ve ERP'nin yeni miktarı zaten düşmüş olarak gelir.
- **Depo bazlı bileşenler.** Tek bir `quantity` tutulmaz; depo başına `onHand`, `reserved` (ERP'nin ayırdığı), `blocked` (kalite/transfer), `safetyStock` saklanır. Mağazaya yansıyan: `ERP satılabilir = onHand − reserved − blocked − safetyStock`, yalnızca bağlayıcıda **seçili depoların** toplamı üzerinden. B2B için ayrılmış depo/stok seçilmediği sürece mağazaya açılmaz.
- **Çift düşme riski:** ERP'nin `reserved` değeri mağazadan gönderilmiş siparişleri zaten içeriyorsa, aynı siparişi hem ERP rezervi hem "onaylanmamış taahhüt" olarak düşmek stoğu iki kez azaltır. Bağlayıcı, ERP'nin siparişi **ne zaman** rezerv ettiğini belgeler; siparişin ERP onayı geldiği anda taahhütten çıkarılır, geri kalan bölüm ERP'nin gördüğü rezerve bırakılır.
- **Güvenlik payı** (örn. her üründen 2 adet gösterilmez) ve **depo seçimi** bağlayıcı ayarıdır.
- Veri bayatsa güvenli taraf: son başarılı stok senkronundan N dakikadan fazla geçtiyse admin'de uyarı çıkar; satış durdurulmaz (ayarlanabilir: "bayat stokta satışı durdur").

Bu bölümün doğruluğu **yarış testiyle** kanıtlanmalıdır (bölüm 12). Varsayımlar (ERP'nin siparişi alınca stoğu düşürdüğü, onayın ne zaman geldiği) ERP'ye göre değişir ve bağlayıcı başına belgelenir.

## 7. Mağaza → ERP

### 7.1 Sipariş
1. `order.paid` outbox satırı oluşur (siparişle aynı `atomic()`'te).
2. Uygulama (veya ajan) satırı sahiplenir, siparişi ERP'nin biçimine çevirir ve gönderir.
3. **Idempotency:** ERP'ye sipariş **harici referans** olarak `public_id` (`ord_...`) ile gider. Bağlayıcı, gönderimden önce ERP'de bu referansı arar (varsa yeniden oluşturmaz, mevcut kaydı eşler). ERP referans aramayı desteklemiyorsa bağlayıcı yetenek tablosunda "çift sipariş riski" işaretlenir ve admin'e uyarı çıkar.
4. ERP'nin döndürdüğü kimlik `external_refs`'e yazılır ve outbox satırı `sent` olur.
5. Başarısızlıkta üstel beklemeyle yeniden dener; 4xx (veri hatası, eşleşmeyen SKU) yeniden denenmez, kayıt `dead` olur, nedeniyle birlikte admin'de görünür, düzeltilince elle yeniden gönderilir.

Gönderim sırası: önce müşteri (cari) eşlenir/oluşturulur, sonra sipariş. Cari eşleşmesi vergi numarası, yoksa e-posta ile; belirsizse sipariş yine gider ama "misafir cari"ye bağlanır ve admin'e bildirilir.

### 7.2 Müşteri
Yeni müşteri veya fatura bilgisi güncellemesinde, ayardaki kurala göre cari oluşturulur. Türkiye için vergi dairesi, vergi no / TC kimlik, e-fatura mükellefiyeti alanları müşteri şemasında zaten gerekli (bölüm 13 e-fatura).

### 7.3 İade ve iptal
`refund.created` ve `order.cancelled` ERP'ye iade/iptal belgesi olarak gider; aynı idempotency kuralı (`ref_...` referansı).

## 8. ERP → mağaza

- **Zamanlanmış çekme:** ürün/fiyat/stok için imleçli, sayfalı, hız sınırlı (ERP'nin sınırına saygılı) çalıştırma. Her çalıştırma bir **çalıştırma kaydı** üretir (kaç kayıt okundu/yazıldı/değişmedi/hata).
- **ERP'den itme (webhook):** bağlayıcı destekliyorsa `POST /erp/events`; **HMAC imzalı**, zaman damgası ile tekrar saldırısına karşı pencere. İmza geçersizse 401 ve hiçbir şey yazılmaz.
- **Inbox:** imzası doğrulanan olay önce uygulamanın `webhook_inbox` tablosuna yazılır (sağlayıcı olay kimliği için **benzersiz kısıt**), sonra 200 dönülür ve işleme kuyruktan yapılır. Aynı olay ikinci kez gelirse kısıt yüzünden yeniden işlenmez. Webhook olsa bile periyodik uzlaştırma çalışır, çünkü webhook kaçırılmış olabilir.
- **Bölünmüş çalıştırma:** büyük kataloglar (10.000+ SKU) tek çağrıda işlenmez. Çalıştırıcı imleci kalıcı saklar, işi sabit boyutlu sayfalara böler ve her sayfayı ayrı iş olarak kuyruğa koyar; Workers'ın CPU/süre sınırları ve ERP hız sınırı bu şekilde aşılmaz. Bir sayfa çökerse imleçten devam eder. Bellekte tüm katalog tutulmaz.
- **Sipariş durumu:** ERP'de sevk/irsaliye/fatura oluştuğunda mağaza siparişinin gönderim durumu ve takip numarası güncellenir; müşteriye bildirim mağazanın kendi outbox'ından çıkar.
- Tam senkron (ilk kurulum) ve artımlı senkron ayrıdır; tam senkron "kuru çalıştırma" ile önce neyin değişeceğini listeler.

## 9. Hata, yeniden deneme, uzlaştırma

- **Telafi yok; durum makinesi var.** İş yaşam döngüsü: `pending → processing → success`, geçici hatada `retrying` (üstel bekleme + jitter), kalıcı hatada `failed`, denemeler tükenince `dead_letter`. Yarım kalan bir şey silinerek geri alınmaz; kalan adım tekrarlanır. ERP'de oluşmuş bir sipariş sonraki adım başarısız oldu diye otomatik silinmez; iptal/void akışı veya elle uzlaştırma kullanılır.
- **Her kayıt bağımsız.** Toplu aktarımda bozuk bir sipariş (eşleşmeyen SKU, eksik alan) yalnızca kendini `failed` yapar; diğerleri akar.
- **Belirsiz sonuç:** zaman aşımı "ERP'de oluşmadı" demek değildir. Yeniden göndermeden önce `findOrderByReference` çağrılır (bölüm 7.1).
- **Dead-letter:** outbox'taki `dead` satırı ERP uygulamasının "Başarısızlar" ekranında; nedeni, ERP'nin cevabı, "düzelt ve yeniden gönder".
- **Uzlaştırma işi (günlük + isteğe bağlı):** (a) mağazada ödenmiş ama ERP onayı olmayan siparişler, (b) ERP'de olup mağazaya yansımamış sipariş durumları, (c) stok farkları (mağaza hesabı ile ERP) raporlanır. Fark eşiği aşılırsa mağaza sahibine bildirim. Uzlaştırma yeni bir kod yolu değildir; normal gönderim/çekme fonksiyonlarını çağırır.
- **ERP erişilemezken:** mağaza çalışmaya devam eder; webhook'lar birikir, stok son bilinen değerde kalır (bayatlık uyarısıyla).
- **Hız sınırı ve geri çekilme:** ERP 429/yavaş cevap verirse çalıştırıcı kendini yavaşlatır; mağaza API'sine aşırı yazma da uygulama başına istek sınırı ile sınırlıdır.

## 10. Bağlayıcı arayüzü

```ts
interface ErpConnector {
  id: string;
  capabilities: {
    products?: boolean; stock?: boolean; prices?: boolean;
    ordersOut?: boolean; orderStatusIn?: boolean; customers?: boolean;
    invoices?: boolean; findOrderByReference?: boolean;  // idempotency için kritik
  };
  configSchema: ZodSchema;                                 // adres, kimlik, depo seçimi...
  test(): Promise<Result>;
  pullProducts?(cursor): Promise<Page<ErpProduct>>;
  pullStock?(cursor): Promise<Page<ErpStock>>;
  pullPrices?(cursor): Promise<Page<ErpPrice>>;
  pushOrder?(order, reference): Promise<{ erpId: string }>;
  findOrderByReference?(reference): Promise<{ erpId: string } | null>;
  pullOrderUpdates?(cursor): Promise<Page<ErpOrderUpdate>>;
  upsertCustomer?(customer): Promise<{ erpId: string }>;
  pushRefund?(refund, reference): Promise<{ erpId: string }>;
}
```

Yetenek tablosu sayesinde bağlayıcı yapamadığını yapmaz ve admin ekranı yalnızca desteklenen akışları gösterir. Faturayı ERP kesiyorsa `invoices` yeteneği, `InvoiceProvider` portunun ([stratejiler](../04-genisletme/01-stratejiler-ve-operasyonlar.md)) o ERP için uygulaması olur.

Bağlayıcı sırası (tahmin; hangi ERP'lerin gerçekten gerekli olduğu kullanıcıya bağlı):
1. **Dosya (CSV/XML) bağlayıcısı** — her ERP için ilk adım, API gerektirmez.
2. **Genel webhook/API** — özel entegratörler için.
3. Türkiye'de yaygın ERP/muhasebe yazılımları (Logo, Netsis, Mikro, Paraşüt vb.) — API ve erişim kipi (doğrudan/ajan) her biri için ayrı incelenir.
4. Odoo, ERPNext, SAP Business One gibi uluslararası ERP'ler.

## 11. Admin ekranı (`settings.page` + `nav.page`)

- **Bağlantı:** bağlayıcı seçimi, yapılandırma, "bağlantıyı sına", erişim kipi (doğrudan/ajan) ve ajan durumu.
- **Sahiplik ayarları:** bölüm 2 tablosu, alan başına.
- **Eşlemeler:** eşleşenler, **eşleşmeyenler** (elle eşle/atla), pasifleşenler.
- **Çalıştırmalar:** son senkronlar, sayılar, süre, hata; "şimdi çalıştır", "kuru çalıştırma".
- **Başarısızlar:** `dead` kayıtları, nedenleri, yeniden gönder.
- **Uzlaştırma raporu:** farklar ve eşik uyarıları.
- **Stok:** ürün başına ERP miktarı, taahhütler, satılabilir stok ve son senkron zamanı.

## 12. Test

- **Sahte ERP sunucusu:** her bağlayıcı için aynı sözleşme test takımı (yetenek tablosuna göre).
- **Stok yarışı:** ERP stok senkronu ile eşzamanlı checkout rezervasyonu → satılabilir stok hiçbir koşulda gerçek stoktan fazla çıkmamalı; ödenmiş ama ERP onayı olmayan sipariş stoğu geri vermemeli.
- **Çift sipariş:** aynı `order.paid` iki kez, ERP cevap vermeden zaman aşımı sonrası yeniden deneme → ERP'de tek sipariş (referans araması veya idempotency).
- **Belirsiz eşleşme:** aynı SKU'lu iki ERP kartı → yazılmaz, eşleşmeyenlere düşer.
- **İmza:** imzasız/eski zaman damgalı ERP olayı reddedilir.
- **Ajan:** çökme sırasında kiralama süresinin dolması ve kaydın yeniden verilmesi; çift işleme yok.
- **Ölçek:** 10.000+ ürünlük tam senkronun D1 yazma sınırlarını ([performans](../02-genel-mimari/03-performans.md)) aşmadan, hash ile yalnızca değişenleri yazarak tamamlanması.
- Gerçek ERP ile elle doğrulama (otomatikleştirilemez).

## 13. Sıralama

1. Çekirdek: `external_refs`, `Idempotency-Key`, toplu uçlar (`stock.setMany` önce), `order.paid` webhook'u (outbox hazır).
2. ERP iskeleti: çalıştırıcı, eşleme/hash, çalıştırma günlüğü, başarısızlar ekranı.
3. **Dosya bağlayıcısı:** ürün+stok+fiyat içe aktarma (CSV), sipariş dışa aktarma. Stok senkronu (bölüm 6) ve yarış testi burada kanıtlanır.
4. Sipariş → ERP akışı idempotency ile; sipariş durumu geri akışı.
5. **Odoo bağlayıcısı: ilk uçtan uca gerçek ERP.** Gerekçe (harici incelemeden): Odoo'yu yerelde Docker ile ayağa kaldırıp otomatik testlerde gerçek ERP'ye karşı koşmak mümkün (doğrulanmadı, Odoo'nun çalışma biçimine bağlı); Medusa'nın tarifi de Odoo ile örnekleniyor. Üretim kalitesinde olana kadar başka bağlayıcıya geçilmez.
6. Ajan kipi; uzlaştırma raporu.
7. Logo, Mikro, Netsis, SAP B1 vb. aynı sözleşmeyle.

## 14. Açık sorular

1. Hedef ERP'ler hangileri? (Bağlayıcı sırası ve erişim kipi buna göre.)
2. Stok sahipliği: depo ERP'de mi? Mağaza tek başına stok tutan müşteriler için "ERP'den bağımsız" kip yeterli mi?
3. Varyant modeli: ERP'deki stok kartı ↔ mağaza varyantı eşlemesi hangi kurallarla?
4. Müşteriye özel / B2B fiyatı: v1 dışı; canlı fiyat için [Uygulamalar](../04-genisletme/03-tak-calistir-apps.md) belgesine bir `pricing.quote` senkron kancası eklenecek mi?
5. ERP e-faturayı kesiyorsa fatura PDF'i/numarası siparişe nasıl bağlanacak (`InvoiceProvider` yeteneği yeterli mi)?
6. Ajan dağıtımı: ayrı binary mi, Docker mı? Güncelleme nasıl?
