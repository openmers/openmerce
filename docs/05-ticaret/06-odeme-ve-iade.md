# Ödeme ve iade

## 1. Ödeme yöntemi

Vendure modeli: **ödeme yöntemi** = admin'de tanımlanan kayıt (`ad`, kanal, sıra) + bir `PaymentEligibilityChecker` + bir `PaymentHandler`, ikisi de argümanlarıyla. Aynı işleyiciden farklı ayarlarla birden çok yöntem olabilir (ör. iyzico tek çekim, iyzico taksit).

| İşleyici | Tür | Kesinleşme |
|---|---|---|
| iyzico, PayTR, Stripe, **Polar** (MoR; ilk test işleyicisi) | barındırılan sayfa | doğrulanmış webhook |
| Havale / EFT | bekleyen | admin onayı veya banka entegrasyonu |
| Kapıda ödeme | bekleyen | sipariş onayı; tahsilat teslimatta |
| Vadeli (B2B) | kredi | kredi kontrolü ([../06-b2c-b2b/05-kredi-ve-odeme-kosullari.md](../06-b2c-b2b/05-kredi-ve-odeme-kosullari.md)) |
| `app` | senkron kanca | uygulamanın yanıtı + webhook'u |

Sağlayıcı anahtarları şifreli kasada durur.

## 2. İşleyici sözleşmesi

```ts
interface PaymentHandler {
  createCheckout(ctx, reservation, args): Promise<{ redirectUrl } | { pending: true }>;
  verifyWebhook(ctx, request, args): Promise<Normalized | null>;   // imza burada doğrulanır
  fetchStatus?(ctx, reference, args): Promise<Normalized>;         // uzlaştırma için
  capture?(ctx, payment, amount, args): Promise<Result>;           // provizyon → tahsilat
  refund?(ctx, payment, amount, args): Promise<Result>;
}
```

`Normalized` dört şeyden biridir: `paid`, `release`, `pending`, `refundSync`. Webhook rotası sağlayıcı adını bilmez.

## 3. Webhook kuralları

- İmza doğrulanmadan hiçbir şey yazılmaz.
- Webhook güvenilmez bir dürtmedir; `fetchStatus` varsa ödeme durumu sağlayıcıdan yeniden sorgulanır.
- İade olayları **kümülatif ve mutlak** tutar taşır (delta değil); çift veya sırasız teslimat etkisizdir. Olay kimliği idempotency sınırıdır.
- Olay kaydedilemediyse 5xx (sağlayıcı tekrar dener); kaydedildiyse 200.

## 4. Kayıtlar

**`payments`**: sipariş, yöntem, tutar, `state` (`authorized · settled · declined · cancelled`), sağlayıcı referansı. Bir siparişin birden çok ödemesi olabilir (kısmi, B2B'de parçalı tahsilat).
**`pending_payments`**: havale ve kapıda gibi sonradan gelen ödemeler için bekleyen kayıt; rezervasyona bağlıdır.
**`refunds`**: ödeme, tutar, neden, `state` (`pending · settled · failed · unknown`), satır dökümü.

Siparişin ödeme durumu bu kayıtlardan **türetilir** ([07-siparis.md](07-siparis.md)); ayrıca saklanan bir sayaç yoktur.

## 5. İadeler (refund)

Üç yol, tek kayıt modeli:

- **Admin'den:** `refund` çağrılır, başarıysa kaydedilir. İşleyici desteklemiyorsa düğme gösterilmez.
- **Sağlayıcı panelinden:** webhook ile kümülatif tutar olarak senkronize edilir, kısmi iadeler dahil.
- **Elle kayıt:** havale ile geri ödeme gibi durumlarda sağlayıcıya dokunmadan işaretlenir.

**Sonucu belirsiz iade yeniden denenmez.** Sağlayıcı çağrısı zaman aşımına uğrarsa iade `unknown` kalır; körlemesine tekrar çift iade riskidir. Uzlaştırma görevi gerçek durumu sorgular, çözemezse admin'e düşer.

İade tutarı, vergi satırlarına oransal dağıtılır ve e-fatura iadesi için outbox adımı yazar.

## 6. Performans

Ödeme yolu doğası gereği dış çağrı içerir; hedef, o çağrının çevresindeki yerel işi tek `atomic()`'e indirmektir. Ödeme yöntemleri ve uygunluk argümanları bellektedir; checkout'ta yöntem listesi sorgu atmaz.

## 7. Site başına ekstre adı (statement descriptor)

Müşterinin kart ekstresinde hangi sitenin adı görüneceği iki yoldan ayarlanır; ödeme yöntemi kanala bağlı olduğu için ikisi de mevcut modelle çalışır.

| Yol | Nasıl | Ne zaman |
|---|---|---|
| **Kanal başına ayrı üye işyeri hesabı** | Her kanal için ayrı ödeme yöntemi kaydı, kendi anahtarlarıyla (kasada ayrı sır) | Siteler ayrı marka veya ayrı tüzel kişilikse; her sağlayıcıda çalışır, mutabakat ve iade de ayrışır |
| **Tek hesap, dinamik ekstre adı** | `PaymentHandler` argümanı `statementDescriptor`; varsayılanı kanalın alan adı / kısa adı. İşleyici bunu sağlayıcıya ödeme oluştururken gönderir | Tek tüzel kişilik, birçok site; yalnızca sağlayıcı destekliyorsa |

- Kanal `statement_name` alanı taşır (kısa, ASCII; sağlayıcı uzunluk sınırına göre işleyici kırpar ve doğrular).
- İşleyici dinamik adı desteklemiyorsa admin'de alan gösterilmez ve "ayrı hesap gerekir" notu çıkar; sessizce yok sayılmaz.
- Ekstre adı ödeme kaydına anlık görüntü olarak yazılır (itiraz ve destek için).
- İade ve uzlaştırma, ödemenin yapıldığı yöntem kaydının anahtarlarıyla çalışır; kanal sonradan başka hesaba geçse de eski ödemeler eski hesaptan iade edilir.

*Doğrulanmadı:* Stripe'ın ödeme başına ekstre adı son ekini desteklediğini biliyorum, güncel alan adları ve sınırlar belgeden kontrol edilmedi. iyzico ve PayTR'de ödeme başına ekstre adı olup olmadığını bilmiyorum; yoksa bu sağlayıcılarda tek yol ayrı (alt) üye işyeridir.

## 8. Kayıtlı yöntem ve yinelenen tahsilat

İşleyici sözleşmesi, abonelik için isteğe bağlı yetenekler alır; iki kip vardır: `billing = self` (biz zamanlarız: `createSetup`, `chargeSaved`, `fetchChargeByKey`) ve `billing = provider` (sağlayıcı zamanlar: `syncPlan`, `createSubscriptionCheckout`, `manageSubscription`, `portalUrl`). Ret nedenleri `soft · hard · fraud · needs_auth` sınıflarına eşlenir. Kart verisi bizde tutulmaz, yalnızca sağlayıcı belirteci (`customer_payment_methods`). Merchant of Record işleyicileri (Polar) `merchantOfRecord: true` bildirir; bu siparişlerde vergi ve fatura sağlayıcıdadır. Ayrıntı: [../09-built-in-apps/02-abonelik.md](../09-built-in-apps/02-abonelik.md) bölüm 2. Sağlayıcıların bu yeteneklerini doğrulanma durumu o belgede.

## 9. Elle ödeme işleyicileri

Havale/EFT ve kapıda ödeme `pending_payments` ile tanımlıdır (bölüm 4). Çekirdekte `manual` işleyiciler: 
- **Havale/EFT** (kanal başına IBAN bilgisi, sipariş "ödeme bekliyor", admin onayı veya banka entegrasyonu, süre dolunca otomatik iptal ve stok bırakma)
- **Kapıda ödeme** (isteğe bağlı hizmet bedeli, teslimatta tahsilat işareti). İkisi de her kurulumda bulunur ve kapatılabilir, ayrı pakete ihtiyaç yok.
