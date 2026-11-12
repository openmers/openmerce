# Tak-çalıştır app geliştirme rehberi

Dışarıdan bir geliştiricinin sıfırdan bir app yazıp bir mağazaya kurması için uçtan uca adımlar. Model ve kurallar: [03-tak-calistir-apps.md](03-tak-calistir-apps.md). Bu belge onun uygulama sırasıdır.

> **Durum.** Henüz kod yok. `create-openmers-app`, `@openmers/app-sdk`, `@openmers/app-bridge` ve aşağıdaki `⚙️` ile işaretli ayrıntılar (başlık adları, gövde şeması, JWKS adresi, hız sınırları) bu belgede **önerilen** biçimlerdir; üretim sözleşmesi ilk sürümde oRPC şemasından üretilir. Ayrıntılar `ATLANANLAR.md`'de izlenir.

## 0. Önce karar: app mi, başka bir şey mi?

| Durum | Doğru yol |
|---|---|
| Kendi mağazam için küçük betik / servis | **Özel app** (manifest yok, admin'den token) — bölüm 11 |
| Başkalarına dağıtacağım entegrasyon | **Manifestli app** |
| Her sipariş yolunda çalışmalı, ağ gecikmesi kabul edilemez | App değil; **built-in app** ([02-built-in-apps.md](02-built-in-apps.md)), yani mağaza deploy'u gerekir |
| Çekirdek formu değiştirmek istiyorum | Mümkün değil; app kendi paneli ekler |

## 1. Neye ihtiyacım var

- Bir HTTPS adresi (Workers, VPS, herhangi bir dil). Yerel geliştirmede `localhost` manifestine yalnızca geliştirme kipindeki mağaza izin verir.
- Test mağazası: `openmers dev` ile yerel mağaza (SQLite + tohum veri, [../08-isletme/07-kurulum-ve-tohum-veri.md](../08-isletme/07-kurulum-ve-tohum-veri.md)) ya da hesap açtığınız test mağazası.
- Hangi API'lere, hangi olaylara ihtiyacım var listesi (izinler buradan çıkar).

## 2. İskelet

```
npm create openmers-app@latest acme-loyalty
```

Şablon Hono + Workers kurar: `manifest` ucu, `register` ucu, imza doğrulama ara katmanı, app-bridge örneği, token deposu (KV / SQLite / bellek). Başka bir dil seçerseniz aynı sözleşmeyi OpenAPI şemasından ([../03-cekirdek/02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md)) üretilen istemciyle uygulayın; SDK zorunlu değil.

## 3. Manifest yaz

`GET /manifest.json` ucunda yayınlanır. Alan listesi [03-tak-calistir-apps.md](03-tak-calistir-apps.md) bölüm 2'dedir. Kurallar:

- `id`: ters alan adı biçimi (`acme.loyalty`), değişmez.
- `permissions`: yalnızca gerçekten çağırdıklarınız. İstek fazlaysa kurulum ekranında reddedilme riski artar; sonradan genişletmek **yeniden onay** ister.
- `webhooks`: yalnızca ihtiyaç duyduğunuz olaylar; abonesi olmayan olay için hiçbir şey yazılmaz.
- `syncHooks`: yalnızca checkout/sepet yolunda üç tür (kargo oranı, ödeme, vergi). Gerekmiyorsa eklemeyin; her biri checkout'a ağ gecikmesi katar.
- `extensions`: admin içi paneller (iframe).
- `agentTools`: ajana verilecek araçlar (bölüm 9).
- `version`: semver. İzin, kanca, araç veya risk değişince minor yükseltin ve kullanıcıya ne değiştiğini yazın.

Şemayı kurulumdan önce doğrulayın:

```
npx openmers-app validate ./manifest.json
```

## 4. Kayıt (kurulum) ucu

Mağaza onaydan sonra `registerUrl`'e (`POST`) bir token ve mağaza bilgisi yollar ⚙️:

```json
{ "storeUrl": "https://shop.example.com", "appToken": "omat_...", "webhookSecret": "whsec_...", "channels": ["default"], "jwksUrl": "https://shop.example.com/.well-known/jwks.json" }
```

Uygulamanızın yapacakları:
1. İsteğin geldiği adresin manifestte beyan ettiğiniz `registerUrl` olduğunu doğrulayın.
2. `appToken`, `webhookSecret` ve `storeUrl`'i **mağaza başına** saklayın (tek app çok mağazada kurulu olabilir). Token düz metin olarak yalnızca bu istekte gelir; mağazada yalnızca özeti vardır, kaybederseniz yeniden kurulum gerekir.
3. `200` dönün. Başarısız dönerseniz mağaza kurulumu geri alır ve admin'e nedenini gösterir.
4. Gerekirse ilk senkronu başlatın (ör. ürünleri çekmek için API çağrısı).

`app.uninstalled` olayı geldiğinde token'ı ve mağaza verisini silin.

## 5. Mağaza API'sini çağır

Aynı genel API: `Authorization: Bearer <appToken>`. Her prosedür bir izin ister; izin yoksa `403`. Sayfalama imleçlidir, listelerde `limit` ≤ 100. Yazan çağrılarda `Idempotency-Key` başlığı gönderin. Hız sınırı app token'ı başına ayrıdır ⚙️; `429`'da `Retry-After`'a uyun. Çok sayıda kayıt için toplu uçları ve imleci kullanın, tek tek döngü yazmayın.

## 6. Webhook al

Mağaza olayı outbox'a yazar, worker teslim eder ([../03-cekirdek/04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md)).

```
POST https://loyalty.acme.dev/hooks
X-OpenMers-Event: order.paid
X-OpenMers-Event-Id: evt_...        # idempotency anahtarı
X-OpenMers-Signature: t=...,v1=...  # HMAC-SHA256(webhookSecret, t + "." + gövde) ⚙️
{ "id": "evt_...", "type": "order.paid", "channel": "default", "createdAt": "...", "data": { ... } }
```

Zorunlu davranışlar:
1. **İmzayı doğrulayın** (sabit zamanlı karşılaştırma, zaman damgası ±5 dk). SDK: `verifyWebhook(req, secret)`.
2. **Hızlı `2xx` dönün,** işi kuyruğa alın. Mağaza zaman aşımına uğrarsa yeniden dener.
3. **Idempotent olun:** `Event-Id`'yi saklayın, aynısı ikinci kez gelirse yok sayın. Sıra garantisi yoktur; durum için gerekirse API'den güncel kaydı okuyun.
4. Art arda başarısız olursanız abonelikleriniz askıya alınır ve admin'e bildirilir; `dead` olaylar admin'den yeniden gönderilebilir.
5. Kişisel veri yalnızca ilgili okuma izniniz varsa gelir; olmayan alanları beklemeyin.

## 7. Senkron kanca (gerekiyorsa)

Kargo oranı, ödeme başlatma, vergi: mağaza istek sırasında çağırır ve yanıtı bekler. Sıkı zaman aşımı vardır (kargo/vergi yedeğe düşer, ödeme hata döner); bu yüzden yanıtınız hızlı olmalı, harici çağrı yapıyorsanız önbelleğe alın. Aynı imza ve idempotency kuralları geçerlidir. Yanıt şemaları ilgili port sözleşmesindedir ([01-stratejiler-ve-operasyonlar.md](01-stratejiler-ve-operasyonlar.md)).

## 8. Admin paneli (iframe)

1. `extensions` içinde bağlama noktası seçin (`nav.page`, `order.details.panel`, `product.details.panel`, `customer.details.panel`, `settings.page`).
2. Sayfanız iframe içinde açılır; `@openmers/app-bridge` ile kısa ömürlü JWT alın (`bridge.getSessionToken()`), bağlamı (`orderId`, tema, dil) okuyun.
3. **Sunucunuzda** JWT'yi mağazanın açık anahtarıyla (JWKS) doğrulayın: kim (admin kullanıcı), hangi app, hangi mağaza, ne zamana kadar. Tarayıcıdan gelen hiçbir isteği JWT'siz kabul etmeyin.
4. Mağazaya yazarken uzun ömürlü app token'ınızı **sunucunuzdan** kullanın; tarayıcıya vermeyin.
5. Tasarım: admin'in temasını bridge'den alın; boş durum, yükleniyor ve hata ekranlarını yapın. Admin'in DOM'una ve çerezlerine erişemezsiniz.
6. CSP: sitenize `frame-ancestors <mağaza admin kökeni>` koyun.

## 9. Ajan aracı (isteğe bağlı)

`agentTools` ile builder ajanına yetenek verin ([03-tak-calistir-apps.md](03-tak-calistir-apps.md) bölüm 12). SDK:

```ts
defineAgentTool({
  name: 'points_grant',
  description: 'Müşteriye sadakat puanı verir.',
  risk: 'money',
  input: z.object({ customerId: z.string(), points: z.number().int().min(1) }),
  handler: async ({ input, callId, user, store }) => { /* callId ile idempotent */ },
});
```

Kurallar: 20 sn içinde yanıt (uzun iş: `pending` + sonra `toolResult`), `callId` idempotency anahtarı, yanıt ≤ 32 KB, açıklamayı dürüst yazın (kullanıcı kurulumda görür), riski doğru bildirin (para hareketi veya geri alınamaz dış etki → `money`/`external`). Yanıt metni ajana **veri** olarak gider; içine talimat yazmayın.

## 10. Veri

- Kendi verinizi kendi veritabanınızda tutun, mağaza ve kanal anahtarıyla bölün.
- Mağaza kayıtlarına küçük veri iliştirmek için `metadata`/`private_metadata`: anahtarlar `acme.loyalty.` ile öneklenir, başkasınınkini yazamazsınız.
- Kişisel veri: müşteri `customer.anonymized` olayı gelince ilgili verilerinizi silmekle yükümlüsünüz. Veriyi yalnızca amaç için tutun, günlüğe yazmayın.
- Sırlarınız (üçüncü taraf API anahtarları) sizde kalır; mağaza kasasına girmez.

## 11. Özel app (tek mağaza, manifestsiz)

Admin → Uygulamalar → Özel app: ad ver, izinleri seç, token üret. İsterseniz webhook adresi ve admin paneli de aynı formdan eklenir. Dağıtım, inceleme yoktur; mağaza sahibi tek yetkilidir. Sonradan başkalarına dağıtacaksanız manifeste çevirin.

## 12. Test

| Ne | Nasıl |
|---|---|
| Manifest şeması | `openmers-app validate` (CI'a koyun) |
| Kayıt ucu | SDK test aracı sahte mağaza isteği yollar |
| Webhook imzası | Yanlış imza, eski zaman damgası, tekrar teslimat: üçü de testte |
| İdempotency | Aynı `Event-Id` iki kez: tek yan etki |
| Yeniden onay | Manifest sürümü izin ekleyince kurulu mağazada uyarı çıkar (yerel mağazada dene) |
| İzin eksikliği | İznin olmadığı API'ye çağrı `403`; uygulama bunu düzgün karşılar |
| Askıya alma | Sürekli `500` dönen test ucu: abonelik askıya alınıyor mu |
| Ajan aracı | Şema dışı girdi, zaman aşımı, tekrar `callId` |

## 13. Yayın ve dağıtım

Resmî bir app mağazası/dizini v1'de yoktur ([03-tak-calistir-apps.md](03-tak-calistir-apps.md) bölüm 9, adım 4). Dağıtım: manifest URL'sini paylaşın; müşteri admin'e yapıştırıp kurar. Sürüm yükseltme: manifestteki `version` artar, mağaza arka planda manifesti kontrol eder; izin genişlediyse yeniden onay ister, aksi hâlde sessiz geçer. Eski sürümü kullanan mağazalar için en az bir sürüm geriye uyumlu kalın.

## 14. İzleme ve destek

Admin, uygulama başına son teslimatları ve hataları görür. Siz de kendi tarafınızda `Event-Id` ve `callId` ile günlük tutun. Kaldırma: token iptal, webhook'lar silinir, `app.uninstalled` gelir.

## 15. Kontrol listesi

- [ ] Yalnızca gereken izinler, yalnızca gereken olaylar
- [ ] Kayıt ucu mağaza başına token saklıyor, kaldırmada siliyor
- [ ] Webhook imzası + zaman damgası + `Event-Id` tekrarı
- [ ] İş kuyruğa alınıyor, yanıt hızlı
- [ ] JWT sunucuda doğrulanıyor; uzun ömürlü token tarayıcıya inmiyor
- [ ] Mağaza API çağrılarında `Idempotency-Key`, `429` için geri çekilme
- [ ] Kişisel veri silme akışı (`customer.anonymized`)
- [ ] Ajan araçlarında doğru risk, dürüst açıklama, `callId` idempotency
- [ ] Manifest doğrulaması CI'da

## 16. Tasarlanmamış / doğrulanmamış

⚙️ işaretli ayrıntılar (başlık adları, gövde ve kayıt isteği şemaları, JWKS adresi, hız sınırları, `openmers dev`) kod yazılmadan önce oRPC sözleşmesinden kesinleşir. Ayrıca: uygulama dizini, ücretli app faturalaması ve çok mağazalı app'in kanal bazlı ayrımı bu belgede yoktur.
