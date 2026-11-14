# Yerleşik uygulama #1: Pixel (reklam ve analitik izleme)

**Tek uygulama, birden çok platform.** Mağaza sahibi tek bir "Pixel" uygulaması kurar; içinde her platform ayrı bir modüldür ve ayrı ayrı açılıp kapatılır. Ortak parçalar (olay toplama, tekilleştirme, onay, eşleştirme verisi, günlük, yeniden deneme) bir kez yazılır; platform modülü yalnızca kendi eşlemesini ve gönderim kodunu taşır.

**Uygulama sırası: Meta (Facebook/Instagram) ilk modüldür.** Diğerleri aynı iskeleti kullanarak sırayla eklenir (bölüm 9). Yani v1 = ortak iskelet + Meta modülü; ama uygulama baştan çok platformlu tasarlanır.

Bağlam: [Uygulamalar](../04-genisletme/03-tak-calistir-apps.md). Pixel o mimarinin ilk sınavıdır: çekirdeğe özel kanca eklenmez, üçüncü tarafın kullanabileceği yollarla çalışır.

> **Doğrulama notu:** Platform API ayrıntıları (Meta Conversions API, GA4 Measurement Protocol, TikTok Events API vb.; alan adları, tekilleştirme kuralları) benim bilgimden yazıldı; bu oturumda platformların güncel belgelerini açmadım. Her modüle başlarken ilgili belgeye karşı doğrulanmalı.
> Referans UniPixel (WooCommerce) deposunda yalnızca README var, kaynak kod yok; özellik listesi alındı, uygulama ayrıntısı alınmadı. Shopify Web Pixels modeli de belgesi açılmadan bilgimden aktarıldı.

## 1. Ne yapar

- Mağaza sahibi platform başına kimliklerini ve sunucu erişim anahtarını girer.
- Alışveriş olayları hem **tarayıcıdan** hem **sunucudan** gider; platform aynı olayı **tek sayar**.
- **Onay (consent)** verilmemişse hiçbir şey gitmez.
- Admin'de olay günlüğü, "bağlantıyı sına" ve sağlık kontrolü vardır.

Kapsam dışı: reklam yönetimi, raporlama panosu, GTM sunucu konteyneri barındırma, ürün kataloğu beslemesi (sonra), mobil uygulama olayları (bölüm 11).

## 2. Platformlar ve sıra

| Sıra | Platform | Sunucu tarafı | Tarayıcı tarafı |
|---|---|---|---|
| 1 | **Meta** (Facebook/Instagram) | Conversions API | Meta Pixel (`fbq`) |
| 2 | **Google** (GA4 + Ads) | GA4 Measurement Protocol; Ads dönüşümleri (bölüm 12, soru 4) | `gtag` |
| 3 | **TikTok** | Events API | TikTok Pixel (`ttq`) |
| 4 | Pinterest | Conversions API | Pinterest Tag |
| 5 | Microsoft Bing | UET Conversions API | UET tag |
| sonra | Snapchat, Yandex Metrica (Türkiye için anlamlı) | — | — |

## 3. Çekirdeğe gereken iki eklenti

Bölüm 17 şu an iki şeyi sağlamıyor. İkisi de Pixel dışındaki uygulamalarda (analitik, sohbet, A/B testi) kullanılacak.

### 3.1 Müşteri olayları (vitrin olay veri yolu)

Vitrin standart olayları şemalı biçimde yayınlar; uygulamalar abone olur.

| Olay | Ne zaman | Taşıdığı veri |
|---|---|---|
| `page_viewed` | Her sayfa | URL, referrer, başlık |
| `product_viewed` | Ürün sayfası | ürün, varyant, fiyat |
| `collection_viewed` | Kategori sayfası | kategori |
| `search_submitted` | Arama | sorgu |
| `cart_viewed` | Sepet | kalemler |
| `product_added_to_cart` | Sepete ekleme | kalem, adet, fiyat |
| `product_removed_from_cart` | Çıkarma | kalem |
| `checkout_started` | Ödeme başlatıldı | sepet, toplam |
| `checkout_contact_info_submitted` | E-posta/telefon girildi | e-posta, telefon |
| `payment_info_submitted` | Ödeme yöntemi seçildi | yöntem |
| `checkout_completed` | Sipariş ödendi | sipariş, kalemler, toplam, vergi, kargo |

Her olayda `event_id` (UUID), zaman, istemci kimliği, URL ve tutarlar (küçük birim, [veri kuralları](../03-cekirdek/03-veri-kurallari.md)) bulunur.

### 3.2 Sandbox'lı piksel uzantısı

Manifeste yeni uzantı türü:

```json
"pixels": [{ "url": "https://pixel.example/pixel.js", "events": ["*"], "consent": ["analytics", "marketing"] }]
```

- Vitrin betiği **yalnızca ilgili onay verilmişse** sandbox'lı iframe içinde yükler; mağaza DOM'una, çerezlerine ve ödeme alanlarına erişemez.
- Betik `openmers.subscribe(olay, işleyici)` ile olay verisini alır; platform betiklerini (`fbq`, `gtag`, `ttq`) sandbox içinde çağırır.
- Onay sonradan verilirse o ana kadar toplanan olaylar yeniden oynatılır; geri çekilirse betik kapatılır.
- Çekirdek vitrin minimal bir onay katmanı taşır (`analytics`, `marketing`, `preferences`, `sale_of_data`) ve harici onay yazılımları için adaptör alanı sunar. Onay durumu hem piksel uzantısına hem sunucu olaylarına iletilir.
- Mobil uygulama (Expo) aynı olayları aynı şemayla yayınlar; mobilde sandbox'lı betik yoktur (bölüm 11).

## 4. Akış

```
 Vitrin ──olay (event_id=X)──▶ veri yolu ─┬─▶ sandbox: fbq / gtag / ttq (eventID=X) ─▶ platformlar (tarayıcı)
                                          └─▶ POST /collect (Pixel uygulaması) ──┐
                                                                                 ▼
 Sipariş ödendi (outbox) ─ webhook ─▶ Pixel uygulaması ─▶ platform modülleri ─▶ Meta CAPI / GA4 MP / TikTok Events API
                                                          (aynı event_id)
```

Uygulama dışarıda çalışan küçük bir Hono servisidir; ayarlarını ve günlüğünü kendi veritabanında tutar. Anahtarlar orada şifreli durur, mağazanın sır kasasına girmez.

### 4.1 Platform modülü arayüzü

```ts
interface PixelPlatform {
  id: 'meta' | 'google' | 'tiktok' | 'pinterest' | 'bing';
  configSchema: ZodSchema;                       // kimlik, anahtar, seçenekler
  browser(event: StoreEvent): BrowserCall[];     // sandbox'ta çalışacak çağrılar
  server(event: StoreEvent, match: MatchData): Promise<SendResult>; // API gönderimi
  test(config): Promise<SendResult>;             // "bağlantıyı sına"
}
```

Ortak katman olayı alır, onayı kontrol eder, eşleştirme verisini hazırlar, açık modülleri çağırır, sonucu günlüğe yazar ve yeniden dener. Yeni platform = bir dosya + kayıt satırı.

### 4.2 Sunucu olayı kaynakları
1. **Sipariş olayları (güvenilir kaynak):** `order.paid` webhook'u ([outbox](../03-cekirdek/04-olaylar-isler-outbox.md)). `Purchase` her zaman buradan gider; tarayıcı kapanmış, reklam engelleyici açık, ödeme dönüşü gelmemiş olsa da kaybolmaz.
2. **Tarayıcı kaynaklı olaylar:** piksel uzantısı olayları ayrıca `POST /collect`'e iletir (`ViewContent`, `AddToCart`, `InitiateCheckout`...). Bu uç Pixel uygulamasına aittir, mağazanın API'si değildir.

### 4.3 Tekilleştirme
- Tarayıcı olayları: `event_id` istemcide üretilir; hem platform pikseline hem `/collect`'e aynı değerle gider.
- `Purchase`: `event_id` = siparişin `public_id`'si (`ord_...`); tarayıcıdaki `checkout_completed` ve sunucudaki `order.paid` aynı kimliği taşır.
- Platform kuralları modülde: Meta `event_name` + `event_id`; TikTok `event_id`; GA4 satın almada `transaction_id`. **Google sayfa görüntülemeleri varsayılan yalnızca tarayıcıdan** gider (çift sayımı önlemek için; UniPixel de aynısını yapıyor).

### 4.4 Eşleştirme verisi ve gizlilik
- **Tıklama kimlikleri** vitrinde yakalanıp oturumda saklanır: Meta `fbc` (`fbclid`'den) ve `fbp`; Google `gclid`/`gbraid`/`wbraid` + GA4 `client_id`/`session_id`; TikTok `ttclid`/`ttp`; Pinterest `epik`; Bing `msclkid`.
- Bunlar checkout başlarken **rezervasyon kaydına** yazılır ([checkout](../05-ticaret/05-sepet-ve-checkout.md)). Böylece ödeme sağlayıcısından webhook geldiğinde tarayıcı olmasa da sunucu olayı doğru atıfla gider.
- E-posta, telefon, ad, soyad, şehir, ülke, posta kodu platformun beklediği biçime normalleştirilip **SHA-256** ile özetlenir (Web Crypto). Tıklama/çerez kimlikleri, IP ve kullanıcı aracısı özetlenmez. Ham kişisel veri platforma gitmez; her platforma yalnızca onun istediği alanlar gider.
- IP ve kullanıcı aracısı checkout sırasında rezervasyona yazılır, yalnızca onay varsa kullanılır.
- Rezervasyona yazılan bu veriler sipariş silindiğinde/anonimleştirildiğinde birlikte silinir (KVKK/GDPR).

### 4.5 Onay kuralı (sunucu dahil)
- Sipariş olayı, rezervasyona kaydedilmiş onay durumuna göre filtrelenir. Platform başına gereken kategori: Meta/TikTok/Pinterest/Bing/Google Ads → `marketing`; GA4 → `analytics`. Kategori yoksa o platforma **hiçbir şey** gönderilmez.
- Onay verisi hiç yoksa (eski sipariş, API ile açılmış) varsayılan göndermemektir. Mağaza sahibi ayarlardan "yasal dayanağım var" diyerek değiştirebilir; seçim denetim kaydına yazılır.
- Onay geri çekilirse sonraki olaylar durur. Geçmişe dönük silme isteği platformlara iletilmez (platformların kendi araçları kullanılır, belgede yazılır).

### 4.6 Hata ve yeniden deneme
- Sipariş webhook'ları outbox'tan geldiği için yeniden deneme ve `dead` durumu mağaza tarafında vardır. Uygulama kapalıyken webhook'lar birikir, mağaza etkilenmez.
- `/collect` olayları için uygulama kendi kuyruğunda sınırlı yeniden deneme yapar; sonunda başarısız olan günlükte `failed` olur, admin'den yeniden gönderilebilir.
- Platform 4xx (geçersiz anahtar, hatalı yük) yeniden denenmez; hata metniyle günlüğe düşer. 5xx ve zaman aşımı üstel beklemeyle denenir.
- Platform başına bağımsızdır: Meta hata verirken TikTok gönderimi etkilenmez. Aynı `event_id` ile yeniden gönderim zararsızdır.

## 5. Olay eşlemesi

| Çekirdek olay | Meta | GA4 | TikTok |
|---|---|---|---|
| `page_viewed` | `PageView` | `page_view` (yalnızca tarayıcı) | `Pageview` |
| `product_viewed` | `ViewContent` | `view_item` | `ViewContent` |
| `search_submitted` | `Search` | `search` | `Search` |
| `product_added_to_cart` | `AddToCart` | `add_to_cart` | `AddToCart` |
| `checkout_started` | `InitiateCheckout` | `begin_checkout` | `InitiateCheckout` |
| `payment_info_submitted` | `AddPaymentInfo` | `add_payment_info` | `AddPaymentInfo` |
| `checkout_completed` | `Purchase` | `purchase` | `CompletePayment` |

Pinterest ve Bing eşlemesi modülle birlikte eklenir. Ortak ayarlar:
- `content_ids` / ürün kimliği: varsayılan **SKU**, yoksa `public_id`; ayarlanabilir. Katalog kullanılacaksa katalogdaki kimlikle birebir aynı olmalı (dinamik reklamlar buna bağlı).
- `value`: ayarlanabilir; varsayılan vergi ve kargo hariç ürün toplamı. Küçük birimden ondalığa dönüşüm yalnızca burada yapılır.
- `Purchase` yalnızca **ödenmiş sipariş** için gider (orders tablosu zaten yalnızca ödenmişleri tutar). Havale/EFT gibi sonradan ödenen siparişte olay ödeme anında çıkar.
- İade (`refund.created`): Meta ve TikTok'ta iade olayı yok, gönderilmez; GA4'te `refund` olayı gönderilebilir (GA4 modülüyle eklenir).

## 6. Admin ekranı (uygulamanın iframe sayfası, `settings.page`)

- **Platform listesi:** her platform için aç/kapa, kimlik (Pixel ID / Measurement ID / Pixel Code), sunucu anahtarı (yazma-yalnızca, geri gösterilmez), test olay kodu.
- Olay başına aç/kapa, ürün kimliği kaynağı, `value` hesabı, para birimi.
- **Olay günlüğü:** son N olay; platform, kaynak (tarayıcı/sunucu), `event_id`, platform yanıtı, hata; filtre; "yeniden gönder".
- **Bağlantıyı sına:** platform başına test olayı gönderir ve cevabı gösterir.
- **Canlı konsol:** yönetici oturumunda `?openmers_pixel_debug=1` ile vitrinde olayları sayfa üstünde gösterir.
- **Sağlık kontrolü:** son 24 saatte tarayıcı ve sunucu olay sayıları yan yana; sunucu `Purchase` sayısı sipariş sayısından belirgin düşükse uyarı.

## 7. Manifest

```json
{
  "id": "openmers.pixel",
  "name": "Pixel",
  "permissions": ["orders:read", "customers:read", "products:read", "storefront:pixel"],
  "webhooks": [{ "events": ["order.paid"], "url": "https://.../hooks" }],
  "pixels": [{ "url": "https://.../pixel.js", "events": ["*"], "consent": ["analytics", "marketing"] }],
  "extensions": [{ "mount": "settings.page", "label": "Pixel", "url": "https://.../admin" }]
}
```

`storefront:pixel` yeni izindir (sandbox'lı betik + müşteri olaylarına abone olma). `customers:read` eşleştirme için gerekir ve kurulum ekranında açıkça gösterilir. Piksel betiği yalnızca **açık olan platformların** betiklerini yükler; kapalı platformun betiği sayfaya hiç inmez.

## 8. Yerleşik olması ne demek

Depoda gelir (`packages/plugins/pixel/`), kurulumda hazır listelenir, tek tıkla açılır; **kodu sıradan bir uygulamadır**, çekirdeğe dokunmaz. Çalışma biçimi (açık karar): ana dağıtımın içinde Hono alt uygulaması olarak (Cloudflare'de aynı Worker, self-host'ta aynı Node süreci). Mağaza ile arasındaki sözleşme (imzalı webhook, izinli token) yine aynıdır; aynı kod ayrı bir sunucu olarak da çalışabilmelidir. Önerim: alt uygulama olarak başla, sözleşmeyi bozan kısayol alma.

Klasör düzeni:

```
packages/plugins/pixel/
  src/core/        olay toplama · tekilleştirme · onay · eşleştirme · günlük · yeniden deneme
  src/platforms/   meta.ts · google.ts · tiktok.ts · pinterest.ts · bing.ts
  src/admin/       ayar ve günlük ekranları (React)
  src/pixel/       sandbox'ta çalışan tarayıcı betiği
  manifest.json
```

## 9. Sıralama

1. Çekirdek: müşteri olayları veri yolu + onay durumu nesnesi.
2. Rezervasyona tıklama kimlikleri, IP/UA ve onay durumunu yazma.
3. Pixel iskeleti: webhook alma, onay filtresi, eşleştirme/hash, günlük, yeniden deneme, platform arayüzü.
4. **Meta modülü, sunucu tarafı:** webhook'tan Conversions API `Purchase` + test olay kodu + bağlantıyı sına (en değerli, en küçük dilim).
5. Sandbox'lı piksel uzantısı + Meta tarayıcı olayları + tekilleştirme + kalan Meta sunucu olayları.
6. Sağlık kontrolü, canlı konsol.
7. Google (GA4, sonra Ads) → TikTok → Pinterest → Bing, her biri aynı iskelet üzerinde.

## 10. Test

- Her platform modülü için, platform uç noktasını taklit eden sahte sunucuya karşı sözleşme testi: yük şeması, özetlenen ve özetlenmeyen alanlar, `event_id`. Aynı test takımı her modüle uygulanır.
- Yarış: aynı sipariş webhook'u iki kez → platformlara birer olay (aynı `event_id`).
- Onay: kategori yokken ne tarayıcıdan ne sunucudan o platforma olay çıkar; başka platform etkilenmez.
- Atıf: tarayıcı kapalı simülasyonunda `Purchase`, rezervasyondaki tıklama kimlikleriyle gider.
- E2E (`e2e`): sepete ekle → ödeme → sipariş; sahte platform uçlarına gelen olaylar ve `event_id` eşleşmesi.
- Sandbox: piksel betiği mağaza DOM'una ve çerezlerine erişemez.
- Gerçek doğrulama: Meta Events Manager, GA4 DebugView, TikTok Events Manager'da test kodlarıyla elle kontrol (otomatikleştirilemez).

## 11. Açık sorular

1. Sandbox iframe mi Web Worker mı? `fbq`/`gtag` DOM bekler; büyük ihtimalle iframe. İlk prototipte denenmeli.
2. Mobil uygulama (Expo): platformların uygulama olayları ayrı veri yapısı ister (örn. Meta'da `action_source=app` + uygulama bilgileri). v1'de kapsam dışı; sonra yalnızca sunucu yoluyla mı, mobil SDK'larla mı?
3. Vitrin çerez penceresini çekirdek mi taşısın, ayrı yerleşik uygulama mı? Önerim: çekirdekte minimal, harici onay yazılımlarına adaptör.
4. Google Ads dönüşümleri GA4 içe aktarma ile mi, doğrudan Ads API ile mi (gclid + gelişmiş dönüşümler)?
5. Meta kataloğu / Google Merchant beslemesi aynı uygulamada mı, ayrı mı?
6. Platform API sürüm numaraları: kodda tek sabit; güncellemede değişir.
