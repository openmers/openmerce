# Abonelik (yinelenen sipariş ve faturalama)

Referans: [Reorder](https://www.reorderjs.com/) — Medusa v2 için MIT lisanslı açık kaynak abonelik eklentisi. Bu belge önce Reorder'ın ne yaptığını ve nerede zayıf kaldığını inceler, sonra OpenMers'e uyarlanmış tasarımı verir.

> **Doğrulama durumu.** Reorder bilgileri sitesi ve belgelerinden, **Polar** bilgileri (MoR, abonelik, webhook, sandbox, kayıtlı kartla çekim) belgelerinden okundu (2026-11-12) ✅. iyzico / PayTR / Stripe'ın yinelenen tahsilat uçları ve Türkiye'de kart sahibi yokken çekim / 3D Secure kuralları **doğrulanmadı** ⚠️ (iyzico şimdilik düşünülmüyor). Mesafeli satış / otomatik yenileme mevzuatı ve Polar'ın (MoR) Türkiye'deki vergi/fatura sonuçları da doğrulanmadı ⚠️.

## 1. Reorder incelemesi

Reorder'ın modeli: `Subscription`, `RenewalCycle` (`scheduled · processing · succeeded · failed`, onay `pending · approved · rejected`), `DunningCase` (abonelik başına tek açık kayıt; `open · retry_scheduled · retrying · awaiting_manual_resolution · recovered · unrecovered`). Yenileme, mevcut Medusa iş akışlarıyla sipariş + ödeme oturumu üretir; ödeme sağlayıcısını kendisi yazmaz. Zamanlanmış işler 5 dakikada bir çalışır.

**Yeniden kullanılacak iyi fikirler**

| Fikir | Neden |
|---|---|
| Yenileme = ayrı kayıt (`cycle`), abonelik değil | Her dönem bağımsız durum, sipariş ve denetim izi taşır; idempotency doğal gelir |
| Abonelikte ürün **anlık görüntüsü** | Katalog değişse de abonelik ne satın alındığını bilir |
| Abonelik başına tek açık dunning kaydı | Çift deneme ve çakışan kurtarma akışlarını önler |
| Elle onay / ret / zorla çalıştır | Operasyonun otomasyonu durdurabilmesi şart |
| Vazgeçme akışında neden + elde tutma teklifi + duraklat alternatifi | Churn'ün en ucuz azaltıcısı |
| Etkinlik günlüğü (salt ekleme) | Para akışında "ne oldu" sorusunun tek cevabı |
| Günlük özet tablosu (MRR, churn, LTV) | Rapor sorgusu sipariş tablosunu taramaz |

**Reorder'ın kendi belgesinde kabul edilen zayıflıklar — bizde baştan çözülür**

| Zayıflık (Reorder) | OpenMers'te |
|---|---|
| Sipariş oluşmadan önce başarısız olan yenileme dunning'e girmez, elle müdahale ister | Dunning **döneme (cycle)** bağlıdır, siparişe değil; her başarısızlık nedeni (stok yok, ödeme yok, adres geçersiz) bir duruma ve bir sonraki adıma sahiptir |
| Zamanlama sabit kodlu, 5 dk yoklama, iş durumu ekranı yok | Cron yalnızca "vadesi gelenleri" bulup **döneme özel iş** kuyruğa yazar (outbox); iş durumu admin'de görünür ([../03-cekirdek/04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md)) |
| Webhook yok | Abonelik olayları normal outbox olayları ve uygulama webhook'larıdır (`subscription.renewed`, `subscription.past_due` …) |
| Kayıtlı kartla çekim belgelenmemiş | Çekirdeğe açık bir yetenek olarak eklenir (bölüm 2) |
| Yeniden deneme yalnızca sabit aralık | Gün/saat kuralı + kalıcı hata kesme (bölüm 6) |

**Roadmap maddelerinin değerlendirmesi** (Reorder'ın "Now / Next / Later" listesi). Karar: faydalı olanların **hepsi v1**; atlananlar gerekçeyle.

| Madde | Karar | Not |
|---|---|---|
| Abonelik başına ödeme sağlayıcısı | **v1** | Abonelik bir ödeme yöntemine, yöntem bir işleyiciye bağlıdır |
| Teslimat ritmi ≠ faturalama ritmi | **v1** | Bölüm 5 |
| Özel yeniden deneme zamanı (cuma sabahı) | **v1** | Yalnızca `billing = self` kipinde (bölüm 2, 6) |
| Akıllı ret yönetimi | **v1** | `self` kipinde tam; `provider` kipinde sağlayıcının kuralı geçerli |
| Özel paket (Build-a-Box) | **v1** | Bölüm 5.2 |
| Gıda/fırın: kesim saati, teslimat aralığı, tatil duraklatma | **v1, teslimat belgesinde** | Tek seferlik siparişte de gerekir; abonelik onu kullanır ([../05-ticaret/10-kargo-ve-teslimat.md](../05-ticaret/10-kargo-ve-teslimat.md)) |
| Dunning indirimi | **v1** (`self` kipi) | Bölüm 6.1 |
| Stripe geçiş aracı | **v1** | Bölüm 5.3 |
| Asenkron analitik dışa aktarım | **v1** | Genel dışa aktarım işi ([../05-ticaret/16-raporlama.md](../05-ticaret/16-raporlama.md)) |
| Çok para birimli analitik | **v1** | Bölüm 9 |
| Demo mağaza + "agentic blueprint" | **Atla** | Builder zaten bunu yapar ([../07-istemciler/05-agentic-builder.md](../07-istemciler/05-agentic-builder.md)) |
| Faturalama A/B testi | **Atla** | Çoğu mağazada istatistik için hacim yok; takvim zaten ayardır |
| Ödeme orkestrasyonu (Primer, Payrails, Gr4vy) | **Atla** | `PaymentHandler` arayüzü bunu yapar; orkestratör built-in app olarak yazılabilir |
| İtiraz önleme (Ethoca/Verifi) | **Atla** | Satıcı–ağ sözleşmesi gerektirir |

## 2. Biçim: built-in app + iki faturalama kipi

**Built-in app (süreç içi), uygulama değil.** Pixel ve ERP dışarıda çalışan uygulamalardır; abonelik değildir: yenileme sipariş yaratır, stok ayırır, ödeme sağlayıcısıyla konuşur. Bunları bir ağ sınırının ardına bölmek belirsiz durumları çoğaltır. E-fatura gibi süreç içi built-in app ([01-e-fatura.md](01-e-fatura.md)): kendi tabloları, işleri ve admin ekranları vardır, sipariş oluşturma ve stok ayırma çekirdek servislerindedir.

**Varsayılan: kapalı / dahil değil.** Abonelik ayrı pakettir (`@openmers/builtin-subscriptions`), herkese gerekmez; etkinleştirme [02-built-in-apps.md](../04-genisletme/02-built-in-apps.md) bölüm 4'e göredir. Self-host'ta `store.config.ts` listesine eklenmedikçe derlemeye girmez (tablo, iş, kod yok); SaaS/tek tık kurulumda derlemededir ama `settings.subscriptions_enabled = false` iken admin menüsünde, vitrinde, API'de (Shop/Admin `subscriptions.*` 404) ve işlerde görünmez, zamanlı iş çalışmaz. Kurulum sihirbazının özellikler adımından ya da ayarlardan açılır. Bekleyen yenileme veya aktif abonelik varken kapatma reddedilir.

### 2.1 Faturalama kipi: kim zamanlıyor?

Ödeme sağlayıcıları iki farklı şekilde yinelenen tahsilat sunar. İşleyici hangisini desteklediğini bildirir; abonelik planı bir kipe bağlanır:

| Kip | Yenilemeyi kim zamanlar | Dunning | Örnek |
|---|---|---|---|
| `provider` | **Sağlayıcı** (kendi abonelik ürünü). OpenMers webhook'lardan durumu yansıtır, teslimat siparişini üretir | Sağlayıcının takvimi (ayarlanamaz olabilir) | Polar |
| `self` | **OpenMers** (kayıtlı kartı çeker) | Bizim motorumuz: gün/saat takvimi, akıllı ret, dunning indirimi | Kayıtlı karttan çekimi destekleyen işleyiciler |

Plan kipini kendisi seçmez; işleyicinin yeteneğinden gelir (`capabilities.billing`). Bir mağaza aynı anda farklı planlar için farklı işleyici kullanabilir.

### 2.2 İşleyici sözleşmesi

```ts
interface PaymentHandler {
  // mevcut: createCheckout · verifyWebhook · fetchStatus · capture · refund
  capabilities: { savedMethods: boolean; billing?: 'provider' | 'self' | 'both' };

  // billing = 'self' için
  createSetup?(ctx, customer, args): Promise<{ redirectUrl }>;
  chargeSaved?(ctx, method: SavedMethod, amount, idempotencyKey, args): Promise<Charge>;
  fetchChargeByKey?(ctx, idempotencyKey, args): Promise<Charge | null>;

  // billing = 'provider' için
  syncPlan?(ctx, plan, args): Promise<{ providerRef }>;                       // plan → sağlayıcı ürünü
  createSubscriptionCheckout?(ctx, subscriptionDraft, args): Promise<{ redirectUrl }>;
  manageSubscription?(ctx, ref, op: 'pause' | 'resume' | 'cancel' | 'skip' | 'changePlan' | 'applyDiscount', args): Promise<Result>;
  portalUrl?(ctx, customer, args): Promise<string>;                            // kart güncelleme sayfası
}
type Charge =
  | { kind: 'paid'; ref: string }
  | { kind: 'declined'; class: 'soft' | 'hard' | 'fraud' | 'needs_auth'; code: string }
  | { kind: 'unknown' };                                                      // zaman aşımı
```

- Kart numarası **bizde saklanmaz**; `customer_payment_methods` yalnızca sağlayıcı belirtecini ve gösterim alanlarını (marka, son 4, son kullanma) tutar. PCI kapsamı büyümez.
- Ret sınıfları sağlayıcı kodlarından işleyicideki tabloyla eşlenir; çekirdek sağlayıcı kodu bilmez. `needs_auth` "başarısız" değil, "müşteri eylemi gerekli"dir (3D Secure).
- Çekirdek `orders.createRecurring(cycleId | providerChargeRef, …)` ucunu alır: sepet/rezervasyon aşamasını atlar, tek `atomic()` içinde sipariş yazar ve stoğu **koşullu** ayırır, aynı anahtar ikinci kez gelirse etkisizdir ([../05-ticaret/05-sepet-ve-checkout.md](../05-ticaret/05-sepet-ve-checkout.md); `orders.importExternal` ile aynı desen). `provider` kipinde tutarlar sağlayıcının bildirdiği tutarlardır (yeniden hesaplanmaz).
- Sipariş `source = subscription`; fatura, ERP, kargo, bildirim normal akıştadır.

### 2.3 İlk işleyici: Polar (sandbox)

Polar bir **Merchant of Record**'dur (uluslararası satış vergisini üstlenir, müşteri Polar'a öder; ödeme kabulü ABD ambargolu ülkeler dışında küresel, **Türkiye satıcı ödeme ülkeleri listesinde**; ödemeler Stripe Connect Express ile yapılır) ✅. İlk işleyici Polar'dır; **test için** sandbox kullanılır (`https://sandbox.polar.sh`, API `https://sandbox-api.polar.sh/v1`, test kartı `4242 4242 4242 4242`, sınır 100 istek/dk) ✅.

| OpenMers | Polar karşılığı | Durum |
|---|---|---|
| Plan | Yinelenen ürün (`day · week · month · year` + aralık sayısı); `syncPlan` ürünü plan kaydedilince oluşturur/günceller, kimliği `plan_provider_refs`'e yazar | ✅ ürün var; fiyat değişiminin nasıl yapıldığı ⚠️ |
| Abonelik başlatma | `POST /v1/checkouts/` → `url` (hosted checkout); `metadata` (50 anahtar) ile `subscription_draft_id` taşınır, siparişe/aboneliğe kopyalanır | ✅ |
| Yenileme | Polar kendisi çeker; `order.paid` (`billing_reason = subscription_cycle`) → `orders.createRecurring` | ✅ |
| Duraklat / devam | `PATCH /v1/subscriptions/{id}` `pause_at_period_end` (+ `resumes_at`) / `resume: true` (devam anında çeker) | ✅ |
| Vazgeç | `cancel_at_period_end: true` + `customer_cancellation_reason`; hemen iptal: `DELETE` (iade yok) | ✅ |
| Plan değiştir | `product_id` + `proration_behavior` (`invoice · prorate · next_period · auto`); özel fiyatlı ürün hedef olamaz | ✅ |
| Elde tutma indirimi | `discount_id` (kaldırmak için `null`) | ✅ |
| Deneme | `trial_end` | ✅ |
| Atla (bir dönem) | `current_billing_period_end` ile vade ileri alınır; ayrı "atla" ucu yok | ⚠️ sandbox'ta denenecek |
| Kart güncelleme | Müşteri portalı (ödeme yöntemi güncelleme her zaman var); yöntem güncellenince Polar hemen yeniden dener | ✅ API ile yeni kart ekleme ⚠️ yok sayılır |
| Durumlar | Webhook: `subscription.created · active · updated · canceled · uncanceled · cycled · revoked · past_due · paused · resumed`, `order.created · paid · updated · refunded` | ✅ |
| Webhook imzası | Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`); eski sırlar Polar HMAC; 10 sn zaman aşımı, 10 deneme, art arda 10 hatada uç kapatılır | ✅ |
| Dunning | **Sağlayıcının**: `past_due`, 2/5/7/7 gün arayla (toplam 21 gün) yeniden dener, sonra iptal eder; `lost_card` reddinde erken durur; ayarlanamaz (yalnızca fayda iptali için bekleme süresi) | ✅ |
| Kayıtlı karttan çekim (`self` kipi) | `POST /v1/orders/` (taslak, tek seferlik ürün, özel `amount` mümkün) + `/finalize`; **yalnızca ücretli plan ve önizleme özelliği**; 402 = ret/3DS | ✅ var, erişim şartlı |

**Sonuçlar**
- **Polar ile varsayılan kip `provider`'dır.** Özel yeniden deneme zamanı, akıllı ret ve dunning indirimi bu kipte çalışmaz (Polar'ın kuralı geçerlidir); admin ekranı bunu açıkça gösterir. `self` kipi Polar'da ücretli plan + önizleme erişimi varsa denenir, yoksa sahte işleyici ve testlerle geliştirilir.
- **Sabit fiyat:** Polar'da yenileme tutarı ürün fiyatıdır. Bu yüzden Polar ile fiyat politikası fiilen `lock`'tır; her plan×varyant kombinasyonu bir Polar ürünüdür. Build-a-Box'ta kutu **sabit fiyatlıdır** (seçim değişir, fiyat değişmez); sepete göre değişen yenileme tutarı `provider` kipinde yoktur.
- **Teslimat ritmi** Polar için doğaldır: ücret Polar'dadır, teslimat siparişlerini biz üretiriz (bölüm 5).
- **MoR sonuçları ⚠️ (doğrulanmadı):** satıcı Polar olduğundan vergi ve fatura Polar'dandır. OpenMers'in KDV hesabı ve Türkiye e-fatura akışı ([01-e-fatura.md](01-e-fatura.md)) bu ödemelerde uygulanmayabilir; işleyici `merchantOfRecord: true` bildirir ve siparişte vergi/fatura alanları "sağlayıcı" olarak işaretlenir, e-fatura tetiklenmez. Üretimde Türkiye mağazası için doğru model ayrı karar gerektirir (açık soru 1).
- **Genel ödeme için de Polar:** normal (tek seferlik) sipariş için `createCheckout`, keyfi tutarlı ad-hoc fiyat (`amount_type: custom`) ile hosted checkout oluşturur; `order.paid` webhook'u `paid` olur ✅ (belge); keyfi tutarın hangi ürün tipiyle yapılacağı ⚠️ sandbox kabul testinde doğrulanır.
- Polar ücretleri (ücretsiz katmanda %5 + 50¢, ücretli planlarda daha düşük, ABD dışı kartlarda +%1,5, itiraz başına $15) ✅ ürün kararında maliyet olarak değerlendirilir.

⚠️ **`self` kipi için en büyük belirsizlik:** iyzico, PayTR, Stripe gibi işleyicilerin kart sahibi yokken çekime izin verip vermediği ve 3D Secure kuralları. Doğrulanana kadar `self` kipi yalnızca doğrulanmış işleyicide açılır; aksi hâlde abonelik "her yenilemede müşteri onayı" akışına (`needs_auth`) düşer.

## 3. Veri modeli

| Tablo | İçerik |
|---|---|
| `subscription_plans` | Kanal, ad, aralık (`interval` `day · week · month · year` + `every`), deneme günü, indirim (yüzde/sabit, kaç dönem), fiyat listesi referansı, vazgeçme/duraklatma kuralları, `price_policy` (`lock · follow_catalog`; varsayılan **`lock`**), `delivery_every` (faturalamadan bağımsız teslimat sıklığı, boşsa faturalamayla aynı), `cutoff` / teslimat aralığı kuralı |
| `plan_targets` | Plan hangi ürün/varyantlarda sunulur; varyant başına plan fiyatı (opsiyonel) |
| `subscriptions` | `public_id`, müşteri, kanal, plan, `state` (`trialing · active · paused · past_due · cancelled · expired`), `method_id` (kayıtlı yöntem), `billing` (`provider · self`), `handler`, teslimat adresi (anlık görüntü), `next_cycle_at`, `version`, `cancel_reason?`, `paused_until?` |
| `subscription_items` | Abonelik, varyant (referans) + **anlık görüntü** (ad, SKU, birim fiyat, vergi sınıfı), adet; paketlerde `bundle_group_id` |
| `subscription_cycles` | Abonelik, `n`, `due_at`, `state` (aşağıda), `order_id?`, `amount`, `attempt_count`, `claim_token?` |
| `dunning_cases` | Abonelik başına tek açık kayıt (kısmi benzersiz indeks), `cycle_id`, `state`, `next_attempt_at`, ret sınıfı, deneme sayısı |
| `subscription_events` | Salt ekleme etkinlik günlüğü (kim/ne/neden; operatör, müşteri, sistem) |
| `retention_offers`, `cancel_reasons` | Vazgeçme akışının teklifleri ve neden listesi |
| `subscription_daily_stats` | Gün × kanal × plan: aktif, yeni, vazgeçen, MRR, başarısız tahsilat, kurtarılan |
| `customer_payment_methods` | Çekirdek tablo (bölüm 2) |
| `plan_provider_refs` | Plan × işleyici → sağlayıcı ürün/fiyat kimliği |
| `subscription_provider_refs` | Abonelik → sağlayıcı abonelik kimliği, son webhook sırası |
| `subscription_deliveries` | Teslimat: abonelik, `cycle_id`, `ship_on`, `slot`, `order_id?`, `state` |
| `bundle_groups`, `bundle_selections` | Build-a-Box: plan kalemi = N seçimlik grup; her dönem/teslimat için seçim |
| `currency_rates` | Gün × para birimi çifti → kur (analitik) |
| `subscription_imports` | Stripe geçişi: kaynak kimlik ↔ yerel abonelik, durum |

Paranın tamsayı kuruş, kimliklerin `public_id` olması ve `version` ile iyimser kilit kuralları [../03-cekirdek/03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md)'daki gibidir. Abonelik kaydı **ürün anlık görüntüsünü** taşır; fiyat politikası `lock` ise yenileme anlık görüntü fiyatını, `follow_catalog` ise güncel fiyat listesini kullanır (varsayılan **`lock`**: abonelik ilk fiyatı korur. Mağaza toplu "fiyat güncelle" işlemiyle seçili aboneliklere yeni fiyat uygular; bu işlem müşteriye önceden bildirim gönderir ve bildirim süresi dolmadan uygulanmaz. `follow_catalog` seçilebilir; `provider` kipinde işleyici desteklemiyorsa seçilemez).

**Cycle durumları:** `scheduled → claimed → charging → charged → ordered → fulfilled`; yan dallar: `awaiting_approval` (elle onay kipi), `skipped`, `needs_customer` (`needs_auth`, ödeme yöntemi yok/süresi dolmuş), `retry_scheduled`, `failed_final`, `unknown_charge`.

## 4. Yenileme akışı (idempotent, D1'de interaktif işlem yok)

> Bu bölüm `billing = self` içindir. `provider` kipinde yenileme sağlayıcıdadır: `order.paid` (`subscription_cycle`) webhook'u cycle'ı `charged` yapar ve 5. adımdan (sipariş) devam eder; claim ve tahsilat adımları yoktur. Webhook sırasız/çift gelebilir: `webhook-id` + sağlayıcı sipariş kimliği idempotency anahtarıdır, durum her zaman `fetch` ile teyit edilir.

```
cron (dakikalık) → SELECT cycle WHERE state='scheduled' AND due_at<=now ORDER BY due_at LIMIT N
                 → her biri için outbox işi "cycle.process(cycleId)"
cycle.process:
  1. claim:  UPDATE cycles SET state='claimed', claim_token=? WHERE id=? AND state='scheduled'   (etkilenen satır 0 → başkası aldı, çık)
  2. doğrula: abonelik hâlâ active, yöntem geçerli, adres geçerli, plan hâlâ yürürlükte; kalemlerin stoğu/satışta oluşu
  3. tutarı hesapla: fiyat politikası + vergi + kargo (aynı yuvarlama yardımcısı)
  4. tahsil et: handler.chargeSaved(..., idempotencyKey = cycle.public_id)
        paid       → 5
        declined   → dunning (bölüm 6)
        unknown    → 'unknown_charge': YENİDEN DENEME; önce fetchChargeByKey ile sorgula
  5. orders.createRecurring(cycleId): sipariş yaz + stok koşullu ayır (tek atomic)
        stok yoksa: plan kuralı → ikame / atla ve bildir / tahsilatı iade et ve ertele (para alınmış, sipariş yok = en kötü durum, iade işi garantili)
  6. sonraki cycle'ı yaz (n+1, due_at) — aynı atomic içinde 5 ile
  7. bildirim + olay (subscription.renewed)
```

- **Önce tahsilat, sonra sipariş** sırası belirsizlik açısından tehlikelidir (para alındı, süreç öldü). Bu yüzden 4'ten önce `charging` durumu yazılır; süreç ölürse kurtarma işi `charging`'de takılı cycle'ı `fetchChargeByKey` ile sorgular ve 5'ten devam eder. Hiçbir yolda iki kez tahsil edilmez (aynı `idempotencyKey`).
- **Belirsiz sonuç yeniden denenmez** (e-fatura ve iade ile aynı kural).
- **Yenileme öncesi bildirim:** vadeden `N` gün önce "X tarihinde Y TL çekilecek" e-postası (N kanal ayarı). Hem churn hem tüketici hakları açısından önemlidir ⚠️ (mevzuat doğrulanmadı); gönderilmişliği `subscription_events`'e yazılır.
- **Elle kontrol:** cycle `awaiting_approval` kipine alınabilir (aboneliğe veya plana göre); admin onay/ret/zorla çalıştır yapar. Zorla çalıştır, claim adımını atlamaz.
- **Saat dilimi:** `due_at` UTC'dir; "cuma sabahı" gibi kurallar kanalın saat diliminde hesaplanıp UTC'ye çevrilir. Yaz saati geçişinde aynı yerel saate düşer.

## 5. Teslimat ritmi, paketler, geçiş

### 5.1 Teslimat ritmi ≠ faturalama ritmi

Cycle **ücret**tir (charge); teslimat ayrı bir kayıttır. "Aylık öde, haftalık teslim":

- Ödeme (cycle) başarılı olunca o dönemin teslimatları `subscription_deliveries` olarak üretilir (`ship_on`, `slot`).
- Her teslimat kendi **siparişi**dir (`source = subscription`); stok **teslimat siparişi oluşurken** koşullu ayrılır, ücret anında aylık stok kilitlenmez. Ücret cycle'ın ilk siparişine bağlıdır; sonraki teslimat siparişleri tutarsız (0) ve "ön ödemeden" işaretlidir. Raporlarda gelir bir kez sayılır.
- Teslimat siparişi oluşturma zamanı `ship_on - lead_time` (kanal ayarı; hazırlık süresi).
- Kesim saati, teslimat aralığı, tatil/kapalı gün ve duraklatma kuralları kargo ve teslimat belgesindeki ortak kurallardan gelir; abonelik yalnızca "bir sonraki uygun tarih"i ister.
- Müşteri teslimatı atlayabilir/erteleyebilir (cutoff'a kadar); erteleme ücret döngüsünü değiştirmez.
- `delivery_every` boşsa teslimat = faturalama (bir cycle = bir teslimat), yani basit kurulum hiçbir ek şey görmez.
- `subscription_cycles` ile `orders` arasında bire-bir varsayım yoktur; `subscription_cycle_orders` köprü tablosu kullanılır.

### 5.2 Özel paket (Build-a-Box)

- Plan kalemi = **seçim grubu** (`bundle_groups`: "6 ürün seç", "en çok 2 aynı ürün", izinli ürün/varyant listesi, kutu fiyatı).
- **Kutu sabit fiyatlıdır** (seçimle değişmez); bu hem `provider` kipinde zorunlu (Polar fiyatı sabittir) hem müşteri açısından anlaşılırdır. Seçime göre değişen toplam yalnızca `self` kipinde ve açık plan ayarıyla.
- Seçim penceresi: dönem/teslimattan `N` gün önce kapanır. Seçilmezse son seçim (yoksa varsayılan) kullanılır. Seçimden önce "kutunuzu seçin" bildirimi gider.
- Seçilen ürünlerin stoğu teslimat siparişi oluşurken ayrılır; yetmeyen ürün plan kuralına göre ikame edilir/çıkarılır ve müşteriye bildirilir.
- Ürün değiştirme (swap) dönemler arasında serbesttir; aynı kutu içi.

### 5.3 Stripe geçiş aracı

`openmers subscriptions import stripe` (CLI + admin ekranı; [../08-isletme/08-veri-tasima.md](../08-isletme/08-veri-tasima.md)'daki ortak ara biçim ve toplu uç desenini kullanır):

1. **Okuma:** Stripe Billing'den ürün/fiyatlar, müşteriler, aktif abonelikler (dönem sonu, durum, indirim, adet), ödeme yöntemlerinin gösterim alanları. Salt okunur anahtar kullanılır; anahtar aracın yapılandırmasında kalır.
2. **Eşleme:** Stripe fiyatı → OpenMers planı; müşteri e-postasıyla mevcut müşteriye; eşlenmeyen kayıtlar rapora düşer. Deneme çalışması (hiçbir şey yazılmaz) önce yapılır.
3. **Yükleme:** abonelikler `subscription_imports` ile idempotent yazılır; `next_cycle_at` Stripe'ın dönem sonundan alınır (çift veya atlanan çekim olmasın diye geçiş günü planlanır, Stripe tarafı iptal edilene kadar çift tahsilat riski anlatılır).
4. **Kartlar:** hedef işleyici **Stripe ise** aynı Stripe hesabındaki müşteri/yöntem kimlikleri doğrudan kullanılır (veri taşınmaz). Hedef başka işleyiciyse (Polar dahil) kart verisi araçla **taşınamaz**; sağlayıcılar arası kart taşıma sağlayıcıların PCI süreciyle yapılır ⚠️. Taşınmayan kartlı aboneliklere `needs_customer` durumu verilir ve toplu "ödeme yöntemini güncelle" bağlantısı gönderilir (kademeli, hız sınırlı).
5. **Rapor:** kaç abonelik canlı, kaçı müşteri eylemi bekliyor, tahmini gelir etkisi.

## 6. Dunning (başarısız tahsilat)

```
declined.class
  soft        → retry takvimi (aşağıda); son denemeden önce indirim (bölüm 6.1)
  needs_auth  → müşteriye "ödemeyi doğrula" bağlantısı (hosted sayfa, tek kullanımlık, süreli); bekleme süresi dolarsa past_due
  hard / fraud→ yeniden deneme YOK; abonelik past_due, müşteriye "yeni kart ekle" bağlantısı; süre sonunda cancelled
```

- **Takvim** plan/kanal ayarıdır: gün sayıları (ör. +1, +3, +5, +7) ve **saat** (kanal saat diliminde); maksimum deneme sayısı. Varsayılan Türkiye ayarı bir öneridir, mevcut verinin ölçümüne göre değiştirilir; ayrıca "hafta sonu/ay sonu maaş günleri" gibi kural gün listesi olarak tanımlanabilir.
- **Tek açık kayıt:** `dunning_cases` üzerinde `(subscription_id) WHERE state NOT IN ('recovered','unrecovered')` kısmi benzersiz indeks. İkinci başarısızlık aynı kayda deneme ekler.
- **Kurtarma:** başarılı çekim, müşterinin yeni kart eklemesi veya admin "kurtarıldı" demesi `recovered` yapar; abonelik `active`'e döner ve atlanan cycle'ın siparişi oluşturulur (müşteri o dönemin ürününü alır).
- **Bitiş:** denemeler bitince `unrecovered` → plan kuralına göre `cancelled` veya `paused`. Her adım müşteriye bildirimle (kısa, tek amaçlı, bağlantılı) gider.
- **Ödeme yöntemi süresi dolacaksa** (son kullanma ayı) vadeden önce kullanıcıya uyarı gider; ret oranını yenileme anından önce düşürür.

### 6.1 Kip farkları ve dunning indirimi

| Özellik | `self` | `provider` (Polar) |
|---|---|---|
| Gün/saat takvimi | Plan/kanal ayarı | Sağlayıcı: 2/5/7/7 gün, ayarlanamaz |
| Akıllı ret (kalıcı retle hemen dur) | Tam | Sağlayıcı yalnızca `lost_card`'da durur; diğer kalıcı retlerde bize `past_due` gelir, müşteriye "kart güncelle" bildirimini biz erken göndeririz |
| Dunning indirimi | Son denemeden önce tek kullanımlık indirim (promosyon motorunda `source = dunning`, aboneliğe bağlı, tek kullanım, süreli) | **Yok** (deneme zamanı bizim değil) |
| Müşteriye iletişim | Bizim şablonlar | Bizim şablonlar (sağlayıcı e-postalarına ek) |

Dunning indirimi kötüye kullanım riski taşır (müşteri indirimi beklemeye alışır): abonelik başına yaşam boyu en çok bir kez, plan ayarıyla açılır, yüzde ve tavan tutarı vardır, kaç kez kullanıldığı raporlanır.

## 7. Müşteri tarafı (vitrin + mobil)

Hesapta: abonelik listesi/ayrıntısı; **duraklat, devam, atla (bir sonraki cycle), sıklık değiştir, ürün değiştir (swap), adres, ödeme yöntemi, vazgeç**. Vazgeçme akışı: neden seç → elde tutma teklifi (indirim, duraklat, sıklık düşür) → onay. Hepsi `Shop API` uçlarıdır (`subscriptions.*`); aynı iş kuralları sunucudadır, istemci yalnızca çağırır. Temaya ([../07-istemciler/04-tema-sistemi.md](../07-istemciler/04-tema-sistemi.md)) `account/subscriptions` şablonu eklenir. Ürün sayfasında plan seçici bir tema bileşeni ve `product.subscriptionPlans` verisidir.

Kayıt anında müşteri otomatik yenileme koşullarını **açıkça onaylar** (checkbox, onaylanan metnin sürümü sipariş ve aboneliğe anlık görüntü olarak yazılır; [../05-ticaret/13-icerik-ve-gezinme.md](../05-ticaret/13-icerik-ve-gezinme.md) yasal sayfa rolleri) ⚠️ (gereken metin mevzuata göre teyit edilmeli).

## 8. Admin

Abonelikler (liste/ayrıntı/duraklat/devam/vazgeç/adres/yöntem), planlar, yenilemeler (vade kuyruğu, elle onay/ret, zorla çalıştır, takılı olanlar), dunning kuyruğu (kayıt, sonraki deneme, ret sınıfı, elle kurtar/kurtarılamadı), vazgeçme nedenleri ve elde tutma teklifleri, etkinlik günlüğü, analitik (MRR, churn, LTV, kurtarma oranı) ve ayarlar. Tablolar sunucu taraflı imleçli ([../07-istemciler/02-admin.md](../07-istemciler/02-admin.md)).

**Ajan araçları** ([../07-istemciler/05-agentic-builder.md](../07-istemciler/05-agentic-builder.md)): `subscriptions.list/get/stats` (`read`), plan oluşturma (`write`, taslak), `subscriptions.pause/resume/skip` (`external` — müşteriyi etkiler), `subscriptions.cancel` ve `cycles.forceRun` (`money`, onay kartı).

## 9. Analitik

Günlük özet işi (`subscription_daily_stats`) sipariş tablosunu taramaz; olaylardan beslenen sayaçlardan ve aktif abonelik anlık kesitinden hesaplanır.

- **MRR** = aktif (ve `past_due`) aboneliklerin tutarının aya normalize edilmiş toplamı (haftalık ×52/12, yıllık ÷12), indirimler sonrası, vergisiz. Deneme (`trialing`) dahil değildir.
- **Churn** = dönem içinde vazgeçen / dönem başı aktif (adet ve MRR bazlı iki ayrı sayı). Ödeme nedeniyle (`unrecovered`) ve gönüllü ayrı gösterilir.
- **LTV** = tahmindir: ARPU ÷ aylık churn; yeterli veri yoksa gösterilmez. Etiketi "tahmini" olarak yazar.
- **Kurtarma oranı** = dunning'e giren cycle'ların kurtarılan payı.
- **Çok para birimi:** her satır kanalın para biriminde tutulur; raporlama para birimi ayarı (`reporting_currency`) varsa tutarlar `currency_rates` ile **günlük özet anındaki kurla** çevrilip ayrıca saklanır (geçmiş raporlar sonradan kur değişince oynamaz). Kur kaynağı bir `RateProvider` stratejisidir (elle girilen / harici kaynak); kur yoksa dönüştürülmüş sütun boş kalır ve rapor "kur yok" der, tahmin edilmez.
- Büyük dışa aktarımlar iş olarak çalışır ve R2'ye yazılır (CSV, parça parça); arayüz iş durumunu gösterir, zaman aşımı olmaz.

## 10. Diğer entegrasyonlar

- **Pixel:** yenileme siparişleri müşteri yokken oluşur; sunucu taraflı Purchase olayı gönderilmesi ve izin ([01-pixel.md](../10-tak-calistir-apps/01-pixel.md)) kuralı açık sorudur. Varsayılan: yenileme siparişi için dönüşüm olayı **gönderilmez**, yalnızca ilk abonelik siparişi gider.
- **ERP:** yenileme siparişi normal sipariştir ([02-erp.md](../10-tak-calistir-apps/02-erp.md)); `source = subscription` alanı taşınır.
- **E-fatura:** normal akış ([01-e-fatura.md](01-e-fatura.md)); fatura zamanı ayarı yenilemeyi de kapsar.
- **B2B:** v1'de yok. Şirket hesabının kredi/vadeli aboneliği ayrı tasarım ister.
- **Pazaryeri:** pazaryeri siparişleri abonelik oluşturmaz.

## 11. Performans ve güvenlik

- Vade sorgusu `(state, due_at)` indeksinden; sayfalı ve sınırlıdır. Bir çalıştırma en çok N cycle alır, kalanı sonraki dakikaya kalır.
- Her cycle işi bağımsızdır; biri takılırsa diğerlerini bekletmez. Sağlayıcı hız sınırına karşı eşzamanlılık sınırı vardır.
- Kayıtlı yöntem belirteçleri müşteri verisidir: yalnızca sahibine ve `payments:handle`/`subscriptions:*` izinli kullanıcıya görünür; günlüklere ve ajan araçlarına belirteç girmez.
- Müşteri uçları sahiplik denetler (başka müşterinin aboneliği 404); toplu işlem hız sınırlıdır.
- **Tek tek vs toplu:** bir mağazada on binlerce abonelik aynı güne denk gelebilir (ay başı). İşler dağıtılır: `due_at` plan tanımında "ayın günü" yerine abonelik başlangıç anına bağlıdır (yük doğal olarak dağılır).

## 12. Sıralama

1. Çekirdek: `customer_payment_methods`, işleyici yetenekleri, `orders.createRecurring`; sahte işleyici (`self` + `provider` iki kipte).
2. **Polar sandbox işleyicisi** (uluslararası/dijital satış için isteğe bağlı) ve **iyzico sandbox işleyicisi (Türkiye varsayılanı, karar verildi)**: genel ödeme, webhook doğrulama, kabul testi (bölüm 13). iyzico'nun abonelik ve kayıtlı kartla çekim yetenekleri sandbox'ta test edilerek doğrulanır; doğrulanana kadar iyzico için `self` kipi sınırlıdır (bölüm 2.3 sonundaki `self` belirsizliği).
3. Plan + abonelik + cycle + `provider` kipi yenileme yansıtma + müşteri duraklat/atla/vazgeç.
4. Teslimat ritmi ve teslimat siparişleri; Build-a-Box.
5. `self` kipi: yenileme işi, dunning, akıllı ret, dunning indirimi (sahte işleyici + Polar önizleme erişimi varsa).
6. Admin ekranları, etkinlik günlüğü, günlük özet, çok para birimi, dışa aktarım.
7. Stripe geçiş aracı.

## 13. Test

- Aynı cycle'ın (veya aynı `order.paid` webhook'unun) iki kez işlenmesinde tek sipariş; `self`'te tek tahsilat.
- Sıra dışı/çift webhook: `subscription.updated` önce `created`'dan gelirse durum bozulmaz (sağlayıcıdan yeniden okunur).
- Tahsilat sonrası süreç ölümü (`self`): kurtarma işi aynı cycle'ı siparişe tamamlar; ikinci tahsilat yok. Zaman aşımı → `fetchChargeByKey`, körlemesine yeniden deneme yok.
- `hard` ret: tek deneme; `soft` ret: takvimdeki gün/saatte; `needs_auth`: müşteri bağlantısı üretilir.
- Tahsilat var, stok yok: iade işi oluşur ve tamamlanır.
- Aylık ücret + haftalık teslimat: bir ücret, dört teslimat siparişi, stok teslimatta ayrılır, gelir bir kez sayılır, ay sonu/yaz saati sınırında tarih doğru.
- Build-a-Box: seçim penceresi kapanınca seçim sabitlenir; seçilmezse son seçim kullanılır; yetmeyen ürün ikame edilir.
- Dunning indirimi aboneliğe en çok bir kez uygulanır.
- İçe aktarma iki kez çalıştırılınca çift abonelik oluşmaz; kartı taşınamayan abonelik `needs_customer` olur.
- Çok para birimli raporda geçmiş günün tutarı sonraki kur değişiminden etkilenmez; kur yoksa dönüştürülmüş sütun boş.
- MRR hesabı haftalık/yıllık/aylık karışık planlarda elle hesapla eşleşir.
- Aynı aboneliğe iki dunning kaydı açılamaz; müşteri başkasının aboneliğine erişemez.
- Built-in app kapalıyken `subscriptions.*` 404, zamanlı iş çalışmaz.
- **Polar sandbox kabul testi (haftalık):** (a) ad-hoc keyfi tutarlı tek seferlik checkout → `order.paid`; (b) yinelenen ürün checkout'u → `subscription.created/active` + ilk `order.paid`; (c) `PATCH` ile duraklat/devam/vazgeç/atla (`current_billing_period_end`)/plan değiştir/indirim; (d) test kartıyla `past_due` ve kart güncelleyince yeniden deneme; (e) imza doğrulama (geçersiz imza 401); (f) taslak sipariş + `finalize` (erişim varsa).

## 14. Kararlar ve açık sorular

**Karara bağlananlar**
- İlk işleyici: **Polar** (sandbox, test amaçlı; iyzico şimdilik düşünülmüyor).
- Fiyat politikası varsayılanı: **`lock`** (ilk fiyat sabit; toplu fiyat güncelleme bildirimli). Gerekçe: Polar fiyatı sabittir, tüketici beklentisi ve bildirim yükümlülükleri açısından en güvenli seçim; `follow_catalog` isteğe bağlı.
- Yenileme siparişinde Pixel dönüşüm olayı: **gönderilmez** (yalnızca ilk abonelik siparişi). Gerekçe: yenileme müşteri etkileşimsiz oluşur, reklam platformuna sahte "satın alma" göndermek optimizasyonu bozar ve izin/atıf bağlamı yoktur.
- Varsayılan: **kapalı** (derlemede var, ayardan açılır).
- Önceki "v2" maddelerinin tümü v1'e alındı (bölüm 1).

**Açık sorular**
1. Polar bir MoR olduğundan Türkiye'deki bir satıcı için vergi (KDV), e-fatura ve satıcı sıfatı sonuçları ne? Üretimde Polar mı, Türkiye'de kendi faturasını kesebilen bir işleyici mi? ⚠️
2. Polar'da keyfi tutarlı tek seferlik ödeme hangi ürün tipiyle (ad-hoc `custom` fiyat) yapılıyor ve fiyat değişiminde ürün güncellemesi nasıl? ⚠️ (sandbox kabul testi)
3. Polar kayıtlı karttan çekim (`self` kipi) erişimi ücretli plan ve önizleme şartlı; kullanılacak mı?
4. Türkiye'de otomatik yenileme için zorunlu bildirim, ayrılma hakkı ve onay metni gereklilikleri? ⚠️
5. Stripe'tan başka işleyiciye kart taşıma yolu (sağlayıcılar arası PCI taşıma) kullanılacak mı?
