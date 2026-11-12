# Built-in app'ler (süreç içi, derleme zamanı)

> **Terimler.** İki tür app vardır, ikisi de "app"tir; fark kurulum biçimidir:
> - **Built-in app:** bizim yazdığımız, süreç içi çalışan, derlemeye girer. Self-host'ta `store.config.ts` listesiyle, SaaS'ta bayrakla etkinleşir. Bu belge.
> - **Tak-çalıştır app:** dışarıda çalışan web servisi, admin'den kurulur, deploy gerekmez ([03-tak-calistir-apps.md](03-tak-calistir-apps.md)). Bizim yazdığımız (Pixel, ERP, pazaryeri) ve üçüncü taraf olabilir.
>
> Kod adları da bu dili izler: `defineBuiltInApp`, `builtInApps` listesi, `bia_<ad>_` tablo öneki, `@openmers/builtin-<ad>` paketleri, `modules/` dizini. "Plugin" yalnızca Vendure/Medusa'nın kendi terimi olarak geçer.

Vendure plugin modelinin Workers'a uyan hâli. Workers çalışma anında kod yükleyemez ama **derlemeye dahil edilen** kod sorunsuz çalışır. Built-in app bir npm paketidir, `store.config.ts`'e eklenir ve deploy ile gelir.

## 1. Bir built-in app ne ekleyebilir

```ts
export const loyaltyApp = defineBuiltInApp({
  id: 'acme.loyalty',
  compatibility: '^1.0.0',
  schema,                       // Drizzle tabloları (bia_acme_loyalty_*) + migration'lar
  customFields: { customer: { loyaltyTier: z.enum(['silver','gold']).optional() } },
  permissions: ['loyalty:read', 'loyalty:write'],
  strategies: {},               // çekirdek stratejilerini değiştirme
  operations: [pointsDiscountAction],
  shopApi: shopRouter,          // /shop/x/acme.loyalty/...
  adminApi: adminRouter,        // /admin/x/acme.loyalty/...
  subscribers: { 'order.placed': awardPoints },
  jobs: { expirePoints },
  scheduled: [{ name: 'expire', cron: '0 3 * * *', job: 'expirePoints' }],
  guards: { 'order:placed': checkSomething },
  settings: z.object({ pointsPerLira: z.number().default(1) }),
  admin: { nav: [...], panels: [...] },   // Svelte bileşenleri, admin derlemesine girer
  init(ctx) {}, 
});
```

| Yetenek | Vendure karşılığı |
|---|---|
| Tablolar | Custom entities |
| Özel alanlar | Custom fields |
| API uçları | GraphQL extension / REST endpoint |
| Aboneler | EventBus subscriber |
| İşler, zamanlanmış görevler | Job queue, scheduled tasks |
| Strateji ve operasyon | Strategy, ConfigurableOperation |
| İzinler | Custom permissions |
| Admin bileşenleri | Dashboard extensions |
| Ayarlar | Settings store |

## 2. Kurallar

- **Tablo öneki** `bia_<id>_`. Built-in app çekirdek tablolarına **yazmaz**; çekirdek fonksiyonlarını çağırır. Okuma için join serbesttir.
- **API ad alanı** `/x/<id>/`; çekirdek uçlarını ezemez. Her uç izin bildirir.
- **Aboneler worker'da çalışır,** idempotenttir. İstek içi davranış yalnızca strateji, operasyon ve bekçi ile değişir.
- **İki hedefte çalışmalı.** Yalnızca Node'da çalışan built-in app (`sharp`, yerel ikili) `targets: ['node']` bildirir ve Cloudflare derlemesine girmez.
- **Sır** kasadan okunur (`ctx.secrets.get`), ayar deposuna yazılmaz.
- **Okuma yolunu yavaşlatamaz:** vitrin okuma uçlarına built-in app ara katmanı takılamaz; built-in app veriyi okuma modeline indeksleme anında ekler (`indexExtend`).
- Built-in app kaldırılınca tabloları silinmez (eklemeli migration kuralı); ayrı bir `purge` komutu vardır.

## 3. Built-in app mi, tak-çalıştır app mi

| Soru | Built-in app | Uygulama |
|---|---|---|
| Deploy gerekir mi | Evet | Hayır |
| Erişim | Tam (güvenilen kod) | Yalnızca onaylanan izinler |
| İstek yoluna girer mi | Evet (strateji/operasyon) | Yalnızca üç senkron kanca |
| Hız | Fonksiyon çağrısı | Ağ turu |
| Dil | TypeScript | Herhangi |
| Kim için | Mağazanın kendi ekibi, resmî entegrasyonlar | Üçüncü taraflar, SaaS kurulumları |

Barındırılan (SaaS) kurulumda mağaza sahibi built-in app ekleyemez; orada tek yol uygulamadır. Bu yüzden Pixel ve ERP uygulama olarak yazılır: iki dünyada da kurulabilirler ve uygulama modelini sınarlar.

## 3.1 Yeni özellik: çekirdek mi, built-in app mi, tak-çalıştır app mi

Yeni bir yerleşik özellik için biçimi şu sırayla karar veririz (ilk "evet" kazanır):

1. **Çekirdek:** Her mağazanın her siparişinde gerekiyor ve kapalı hâli anlamsız mı (katalog, sepet, sipariş, ödeme, müşteriler)?
2. **Built-in app:** Sipariş/stok/ödeme gibi çekirdek servisleri süreç içinde çağırıyor veya istek yoluna (strateji, operasyon, bekçi) girmesi gerekiyor mu, ya da zamanlı işlerle aynı işlemde çalışmak zorunda mı (abonelik, e-fatura)?
3. **Uygulama:** Dışarıdaki bir sisteme veri yolluyor/çekiyor, gecikmeye dayanıklı, ağ sınırı sorun değil mi (Pixel, ERP, pazaryeri)?

Varsayılan etkinleştirme: çekirdek hep açık; built-in app ve uygulama **seçmeli** (bölüm 4). Her yeni özellik belgesi bu kararı ve gerekçesini ilk bölümde yazar; belirsizse en küçük yetkili biçim (uygulama) seçilir ve gerekçesiyle `ATLANANLAR.md`'ye not düşülür.

## 4. Resmî built-in app'ler ve etkinleştirme

Resmî built-in app'ler `modules/` altında, çekirdekle aynı sürümde **ayrı paketlerdir** (`@openmers/builtin-<ad>`): ödeme (iyzico, PayTR, Stripe, Polar), kargo (Yurtiçi, Aras, MNG), e-fatura (Paraşüt), e-posta (Resend), SMS (Netgsm), arama (Meilisearch), abonelik, pazaryeri entegrasyonu. Her biri ilgili sözleşme testini geçer.

**Çekirdek hep yüklüdür** (katalog, fiyat, stok, sepet/checkout, ödeme, sipariş, müşteriler, promosyon, vergi, kargo, bildirim); kapatılamaz. Medusa'da commerce modülleri de hepsi hazır gelir; Vendure'da ise çekirdek dışı her şey `plugins` dizisine eklenen opt-in pakettir. OpenMers ikisini birleştirir: çekirdek sabit, geri kalan Vendure gibi seçmelidir. Karşılaştırma belgelerde doğrulanmış olanla sınırlıdır: Vendure plugin kaldırılınca tabloların ne olduğunu belgelemiyor, biz aşağıda kendimiz tanımlıyoruz.

### 4.1 İki kip

| | Self-host / kendi deploy'un | SaaS ve tek tık Cloudflare |
|---|---|---|
| Kim seçer | Mağaza sahibi, `store.config.ts` içindeki `builtInApps` listesi (kurulum sihirbazı "Hangi özellikler?" diye sorar ve listeyi yazar) | Platform: resmî pluginlerin hepsi derlemededir |
| Listede olmayan built-in app | Derlemeye girmez: kod, tablo, iş, Worker boyutu **sıfır** | Derlemede ama mağaza için kapalı |
| Açma / kapatma | Listeye ekle + `migrate` + deploy | Ayarlardan bayrak (`settings.<ad>_enabled`), deploy yok |
| Kapalıyken | Yok | Admin menüsünde, vitrinde, API'de (404) ve işlerde görünmez; zamanlı iş çalışmaz |
| Üçüncü taraf | Built-in app yazabilir | Yalnızca uygulama ([03-tak-calistir-apps.md](03-tak-calistir-apps.md)) |

Bayrak kapalı mağazada built-in app'in kayıtlı aboneleri çalışmaz ve vitrin okuma modeline hiçbir şey eklemez (`indexExtend` atlanır), yani kullanmayan mağaza yük taşımaz.

### 4.2 Yaşam döngüsü

| Eylem | Sonuç |
|---|---|
| Listeye ekle (self-host) | `migrate` built-in app tablolarını (`bia_<id>_`) oluşturur; ilk açılışta `init` çalışır, ayarlar varsayılanla gelir |
| Listeden çıkar | Tablolar ve veri **silinmez** (eklemeli migration kuralı); built-in app'e bağlı ekranlar ve uçlar kaybolur. Çekirdek verisinde built-in app'e ait özel alanlar okunamaz ama silinmez |
| Yeniden ekle | Eski veri olduğu gibi geri gelir; sürüm uyumsuzsa ilgili migration çalışır |
| `purge <id>` | Açık onayla tabloları ve built-in app'e ait ayarları siler; geri alınamaz, önce yedek uyarısı verir |
| SaaS'ta bayrak kapat | Veri durur; açık işler (ör. abonelik yenilemesi) kapanmadan **önce** kontrol edilir: bekleyen iş varsa kapatma reddedilir ve neden listelenir |
| Built-in app başka built-in app'e bağlı | `requires: ['<id>']` bildirilir; bağımlılık yoksa açılış başarısız olur, SaaS'ta bayrak açılmaz |

Bir built-in app çekirdek davranışını yalnızca strateji, operasyon ve bekçi ile değiştirdiğinden (bölüm 1), listeden çıkınca çekirdek varsayılan stratejisine döner; boş bir yuva kalmaz.

## 5. Sürüm uyumu

`compatibility` aralığı çekirdek sürümünü karşılamıyorsa açılış başarısız olur. Çekirdeğin built-in app'e açtığı yüzey (`defineBuiltInApp` alanları, strateji arayüzleri, olay adları) API sözleşmesi gibi eklemeli tutulur.
