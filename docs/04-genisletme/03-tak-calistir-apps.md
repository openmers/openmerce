# Tak-çalıştır app'ler: dışarıda çalışan genişletme

> Bu belgede "uygulama" = tak-çalıştır app. Süreç içi karşılığı: [02-built-in-apps.md](02-built-in-apps.md).


Model Saleor Apps ve Shopify Apps ile aynıdır: **uygulama, mağazanın içine yüklenen kod değil, dışarıda çalışan bir web servisidir.** Mağazayla yalnızca API ve webhook üzerinden konuşur; herhangi bir dilde yazılabilir.

Bu bizim için tercih değil zorunluluktur: Workers çalışma anında kod yükleyemez, dolayısıyla "klasöre at, yeniden başlat" tarzı eklenti iki hedefte birden çalışamaz. Ayrıca mağaza sürecinde yabancı kod çalışmaz; uygulama yalnızca izin verilen kapsamları görür.

## 1. İki genişletme yolu

| | Built-in app ([02-built-in-apps.md](02-built-in-apps.md)) | Uygulama |
|---|---|---|
| Nerede çalışır | Mağaza sürecinin içinde, derlemeye dahil | Dışarıda, kendi sunucusunda / Worker'ında |
| Kim yazar | Çekirdek ekip, mağazanın kendi geliştiricisi | Herkes |
| Kurulum | Deploy ile gelir | Admin panelinden, manifest URL'siyle |
| Erişim | Tam | Manifestte istenen ve onaylanan izinler |
| Örnek | iyzico, PayTR, Resend | Pazaryeri entegrasyonu, sadakat programı, ERP senkronu, özel kargo |

Portlar ([stratejiler](01-stratejiler-ve-operasyonlar.md)) değişmez. Her portun bir de genel `App…Provider` adaptörü vardır; bu adaptör işi kurulu uygulamanın senkron kancasına devreder. Çekirdek, sağlayıcının yerleşik mi uygulama mı olduğunu bilmez.

## 2. Manifest

Uygulama tek bir JSON manifest yayınlar:

```json
{
  "id": "acme.loyalty",
  "name": "Acme Sadakat",
  "version": "1.2.0",
  "registerUrl": "https://loyalty.acme.dev/register",
  "permissions": ["orders:read", "customers:read", "customers:write"],
  "webhooks": [
    { "events": ["order.paid", "refund.created"], "url": "https://loyalty.acme.dev/hooks" }
  ],
  "syncHooks": [
    { "type": "shipping.rates", "url": "https://.../rates" }
  ],
  "extensions": [
    { "mount": "nav.page", "label": "Sadakat", "url": "https://loyalty.acme.dev/admin" },
    { "mount": "order.details.panel", "label": "Puanlar", "url": "https://loyalty.acme.dev/admin/order" }
  ],
  "agentTools": [
    {
      "name": "points_grant",
      "description": "Müşteriye sadakat puanı verir.",
      "risk": "money",
      "inputSchema": { "type": "object", "properties": { "customerId": { "type": "string" }, "points": { "type": "integer", "minimum": 1 } }, "required": ["customerId", "points"], "additionalProperties": false },
      "url": "https://loyalty.acme.dev/agent/points-grant"
    }
  ]
}
```

`agentTools` isteğe bağlıdır; ayrıntı bölüm 12'de.

## 3. Kurulum

1. Admin, manifest URL'sini yapıştırır.
2. Mağaza manifesti indirir, şemaya göre doğrular ve istenen izinleri gösterir.
3. Onaydan sonra mağaza bir uygulama kaydı ve bir erişim token'ı üretir (yalnızca özeti saklanır) ve token'ı mağaza adresiyle birlikte `registerUrl`'e gönderir.
4. Uygulama token'ı kendi deposunda saklar.

Kaldırma token'ı iptal eder, webhook aboneliklerini siler ve uygulamaya `app.uninstalled` olayını gönderir. İzin kümesi sürüm yükseltmede genişlerse yeniden onay istenir.

**Özel uygulama (tek mağaza için):** Mağaza sahibi kendi yazdığı betik veya servis için manifest yayınlamak zorunda değildir. Admin panelinden ad verip izinleri seçerek doğrudan bir token üretir; isterse webhook adresi ve admin ekranı da aynı formdan ekler. Sonuç, manifestle kurulan uygulamayla aynı kayıttır. Onay süreci, mağaza veya inceleme yoktur: bir uygulamayı kurmak için gereken tek şey o mağazanın admin yetkisidir.

## 4. İletişim

| Yön | Mekanizma | Ayrıntı |
|---|---|---|
| Uygulama → mağaza | Aynı genel API (oRPC / OpenAPI), `Authorization: Bearer <app token>` | Her prosedür bir izin gerektirir; token yalnızca onaylanan izinleri taşır. Ayrı bir "uygulama API'si" yoktur |
| Mağaza → uygulama, asenkron | Webhook | Outbox satırı olarak yazılır ([outbox](../03-cekirdek/04-olaylar-isler-outbox.md)): yeniden deneme, `dead` durumu ve admin'den tekrar aynen geçerlidir. Gövde HMAC ile imzalanır; olay kimliği idempotency anahtarıdır |
| Mağaza → uygulama, senkron | Senkron kanca | İstek sırasında çağrılır ve yanıtı beklenir: ödeme başlatma, kargo oranları, vergi hesabı. Sıkı zaman aşımı vardır; aşılırsa kargo/vergi yapılandırılmış yedeğe düşer, ödeme hata döner |

Senkron kanca checkout'a ağ gecikmesi ekler. Bu yüzden yalnızca checkout ve sepet yolunda, yalnızca listelenen üç tür için vardır; herkese açık sayfa render yolunda asla çağrılmaz ([önbellek](../03-cekirdek/05-onbellek.md)).

## 5. Admin arayüzü

Uygulama ekranları admin içinde **iframe** olarak açılır; uygulamanın kodu admin'in DOM'una ve oturumuna erişemez.

- **Bağlama noktaları (v1):** `nav.page` (kenar menüde tam sayfa), `order.details.panel`, `product.details.panel`, `customer.details.panel`, `settings.page`.
- **Köprü:** küçük bir `postMessage` kütüphanesi (`@openmers/app-bridge`): kısa ömürlü oturum token'ı alma, bağlam (hangi sipariş/ürün), tema ve dil, admin içinde gezinme, bildirim gösterme.
- **Kimlik:** iframe'e, o admin kullanıcısı ve o uygulama için imzalanmış kısa ömürlü bir JWT verilir; uygulamanın sunucusu bunu mağazanın açık anahtarıyla doğrular. Uzun ömürlü uygulama token'ı tarayıcıya hiç inmez.
- Admin'in CSP `frame-src` listesi yalnızca kurulu uygulamaların kökenlerini içerir.

Çekirdek formların içine alan enjekte etmek yoktur; uygulama kendi panelini ekler. Shopify'ın checkout arayüzü uzantıları ve platform içinde çalışan fonksiyonları (WASM) kapsam dışıdır; senkron kancalar aynı ihtiyacı karşılar.

## 6. Uygulama verisi

- Uygulama kendi verisini kendi veritabanında tutar.
- Mağaza kayıtlarına iliştirilecek küçük veriler için ürün, sipariş ve müşteride `metadata` (vitrine açık) ve `private_metadata` (yalnızca API) anahtar-değer alanları vardır. Anahtarlar uygulama kimliğiyle öneklenir; bir uygulama başkasının anahtarını yazamaz.
- Uygulamanın sırları (kendi API anahtarları) uygulamada durur, mağazanın sır kasasına girmez.

## 7. Güvenlik

- İzinler dar ve eklemelidir: `orders:read`, `orders:write`, `products:*`, `customers:*`, `refunds:write`, `payments:handle`, `shipping:handle`, `taxes:handle`. Varsayılan hiçbir şeydir.
- Müşteri kişisel verisi içeren olaylar yalnızca ilgili okuma izni olan uygulamaya gider.
- Webhook ve kanca adresleri `https` olmak zorundadır. Self-host'ta özel ağ ve loopback adreslerine istek atılmaz (SSRF).
- Uygulama token'ı için ayrı istek sınırı vardır.
- Her uygulama çağrısı ve her webhook teslimatı denetim kaydına yazılır; admin, uygulama başına son teslimatları ve hataları görür.

## 8. Geliştirici deneyimi

- `create-openmers-app`: Hono + Workers üzerinde manifest, kayıt ucu, imza doğrulama ve app-bridge hazır gelen şablon. ⚙️ Öneri: `--template app` (varsayılan, tak-çalıştır) · `--template builtin` (`defineBuiltInApp` iskeleti, `bia_<ad>_` tablo klasörü, sözleşme testi); ayrı paket açılmaz. Bayrak adı bizim tasarımımızdır, henüz kod yok.
- `@openmers/app-sdk`: oRPC istemcisi, webhook imza doğrulama, token saklama arayüzü (KV / SQLite / bellek).
- Yerel geliştirme: mağaza `localhost` manifestine izin verir (yalnızca geliştirme kipinde).

## 9. Sıralama

1. Manifest, kurulum, izinli token, asenkron webhook'lar (outbox zaten var).
2. Admin iframe + app-bridge.
3. Senkron kancalar: önce kargo oranları, sonra ödeme, sonra vergi.
3a. Ajan araçları (`agentTools`, bölüm 12), builder'ın onay kartları hazır olduktan sonra.
4. Uygulama dizini (liste / mağaza) — kapsam dışı, ihtiyaç doğarsa.

## 10. Kanal ve B2B

Uygulama kurulumu kanal kapsamı taşır; B2B izinleri, olayları ve bağlama noktaları için: [../06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md](../06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md).

## 11. Teslimat maliyeti

Abonelik eşleşmesi bellekteki `(olay, kanal) → uygulamalar` tablosundan yapılır; abonesi olmayan olay için outbox satırı yazılmaz. Webhook teslimatı worker'dadır ve uygulama başına eşzamanlılık sınırı vardır; yavaş bir uygulama diğerlerinin teslimatını bekletmez. Art arda başarısız olan uygulamanın abonelikleri askıya alınır ve admin'e bildirilir.

## 12. Ajan araçları (`agentTools`)

Uygulama, builder'daki ajana ([../07-istemciler/05-agentic-builder.md](../07-istemciler/05-agentic-builder.md)) kendi aracını verebilir: pazaryeri uygulaması "ürünleri Trendyol'a gönder", kargo uygulaması "etiket oluştur", sadakat uygulaması "puan ver". Böylece mağazaya kurulan her uygulama ajana yeni bir yetenek ekler.

### 12.1 Tanım

| Alan | Kural |
|---|---|
| `name` | `^[a-z][a-z0-9_]{0,47}$`; ajana `app_<uygulama-kısa-adı>__<name>` olarak sunulur, çekirdek araçlarla çakışamaz |
| `description` | En çok 500 karakter; ajanın gördüğü tek açıklama. Kurulum ekranında da gösterilir (kullanıcı ajana ne söylendiğini görür) |
| `risk` | `read · external · money`. `write` yoktur: uygulama aracı mağaza dışında iş yapar, OpenMers checkpoint ile geri alamaz. Bildirilmezse `external` sayılır |
| `inputSchema` | JSON Schema; `additionalProperties: false` ve `required` zorunlu. Kurulumda doğrulanır, her çağrıda girdi bu şemayla denetlenir |
| `url` | `https`; webhook ile aynı SSRF kuralları |

Uygulama başına en çok 20 araç. Araç listesi manifest sürümüyle değişir; yeni araç veya risk yükselmesi, izin genişlemesi gibi **yeniden onay** ister.

### 12.2 Çağrı

```
ajan → app_acme_loyalty__points_grant(girdi)
  → çekirdek: şema doğrulama → risk denetimi → (gerekirse onay kartı)
  → POST url   gövde: { callId, tool, input, context: { channel, locale } }
               başlıklar: X-OpenMers-Signature (HMAC, webhook sırrıyla)
                          Authorization: Bearer <kısa ömürlü JWT: admin kullanıcı + uygulama + callId>
  → uygulama işi yapar (gerekirse mağaza API'sini kendi app token'ıyla çağırır)
  → yanıt: { ok, summary, data?, links? }
  → ajan sonucu "veri" olarak alır
```

- **Zaman aşımı 20 sn.** Uzun işler `{ ok: true, pending: true, jobId }` döner; uygulama bitince `agent.toolResult(callId, …)` ucunu çağırır, sonuç sohbete eklenir.
- **Idempotency:** `callId` her çağrıda aynıdır (yeniden denemede de); uygulama bunu idempotency anahtarı olarak kullanmak zorundadır. Belirsiz sonuçta (zaman aşımı) çekirdek **yeniden denemez**, ajana "sonuç bilinmiyor" döner.
- **Kimlik:** JWT, işi hangi admin kullanıcının istediğini söyler (iframe JWT'siyle aynı anahtar ve doğrulama). Uygulama isterse kendi tarafında da yetki denetler.
- **Yanıt sınırı:** 32 KB; `summary` en çok 1000 karakter. Fazlası kesilir.

### 12.3 Güvenlik

Uygulama aracı iki risk taşır: uygulamanın kendi izinleriyle iş yapması ve döndürdüğü metnin ajanın bağlamına girmesi.

1. **Etki uygulamanın izinleriyle sınırlıdır.** Uygulama mağazaya yalnızca kurulumda onaylanan izinlerle dokunabilir; ajan aracı bu izinleri genişletmez. Kullanıcının bir izni yoksa (ör. `refunds:write`) o kullanıcı `money` riskli uygulama aracını **onaylayamaz**.
2. **Onay kartı:** `external` ve `money` araçların her çağrısı onay ister. Kartta uygulamanın adı ve simgesi açıkça yazar ("Acme Sadakat bu işi yapacak").
3. **Sonuç veri sayılır.** Uygulama yanıtı ajana açık bir "uygulama çıktısı" çerçevesiyle verilir; içindeki talimat izlenmez. Uygulama yanıtı sonrası ajanın yaptığı her yazma yine kendi risk kuralına tabidir (yanıt "ürünleri sil" dese bile silme onay kartı ister).
4. **`read` araçları** onaysız çalışır ama yalnızca uygulama mağaza sahibince **güvenilir** olarak işaretlenmişse; işaretli değilse `read` de onay ister. Varsayılan: işaretsiz.
5. **Kapatma:** mağaza sahibi bir uygulamanın ajan araçlarını tek tek veya toptan kapatabilir; uygulama kaldırılınca araçlar aynı anda kaybolur.
6. Her çağrı denetim kaydına `actor = agent:<oturum>`, `via = app:<id>` ile yazılır; uygulama ekranındaki "son teslimatlar" listesinde ajan çağrıları ayrı görünür.

### 12.4 Önbellek ve araç listesi

Ajan oturumunun araç listesi oturum başında sabitlenir (LLM istem önbelleği için; [../07-istemciler/05-agentic-builder.md](../07-istemciler/05-agentic-builder.md) bölüm 8.2). Oturum sırasında kurulan veya kaldırılan uygulamanın araçları **yeni oturumda** görünür; kaldırılan uygulamanın aracı açık oturumda çağrılırsa "uygulama kaldırıldı" hatası döner. Araçlar ad sırasına göre dizilir.

Çok sayıda uygulama kuruluysa (toplam uygulama aracı 15'i aşarsa) araçlar listeye tek tek konmaz; ajana iki sabit çekirdek aracı verilir: `apps.searchTools(sorgu)` (uygulama araçlarının ad, açıklama ve şemasını döner) ve `apps.callTool(ad, girdi)` (yukarıdaki çağrı akışının aynısı: şema doğrulama, risk, onay kartı). Böylece araç listesi oturum boyunca değişmez ve önek önbelleği korunur.

### 12.5 SDK

`@openmers/app-sdk` içinde `defineAgentTool({ name, description, risk, input: zodSchema, handler })`: Zod şemasından `inputSchema` üretir, imza ve JWT doğrular, `callId` ile idempotency saklar, uzun işler için `toolResult` gönderir. `create-openmers-app` şablonunda örnek bir okuma aracı gelir.
