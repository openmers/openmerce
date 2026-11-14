# Aşama 5-6: genişletme sistemi, built-in app'ler ve sağlayıcılar (ayrıntılı yapılacaklar)

**Grubun amacı.** Çekirdeği düzenlemeden davranış değiştirmenin üç yolunu (strateji/operasyon/bekçi, built-in app, tak-çalıştır app) koda çevirmek; sonra bu altyapı üstünde resmî built-in app'leri (e-fatura, İYS, favori, yorum, abonelik) ve sağlayıcı modüllerini (ödeme, kargo, e-posta, SMS, arama) yazmak. Global varsayılan: Stripe, Resend, Meilisearch, elle kargo/ödeme; Türkiye (iyzico, PayTR, Yurtiçi/Aras/MNG, Netgsm, Paraşüt, İYS) ek modüldür, çekirdeğe sızmaz.

**Bağımlılık özeti.** Bu grubun tamamı aşama 1'e (Platform + `atomic()`, `packages/db`, yapılandırma, `Ctx` + `packages/contract`, outbox/iş kuyruğu, `secrets`, izin modeli) ve ilgili ticaret özelliklerine (aşama 2: `payments`, `shipping`, `fulfillment`, `orders`, `customers`, `notify`, `catalogIndex`) bağlıdır. Aşama 5 içinde sıra: 43 (kayıt defteri) → 44 (özel alan/metadata) → 45 (`defineBuiltInApp`) → 46 (CLI, test aracı) → 47-48 (tak-çalıştır app) → 49 (karar tablosunun çekirdek işleri). Aşama 6'daki her madde 45'e, sağlayıcılar ayrıca 43'teki portlara bağlıdır. Admin ekranları aşama 3 (31-32) ve yalnız `@openmers/ui` ile.

**Doğrulanan durum (2026-11-13, kod okunarak).** `packages/core/src/extend/`, `events/`, `jobs/`, `platform/`, `ctx/`, `config/` boş klasör; `packages/core/src/features/apps/index.ts` yalnız `export {}`. `packages/app-sdk`, `packages/app-bridge`, `packages/create-openmers-app`, `packages/test-utils` ve `packages/modules/*` (11 paket: `payment-iyzico/paytr/stripe`, `shipping-yurtici/aras/mng`, `invoice-parasut`, `iys`, `email-resend`, `sms-netgsm`, `search-meilisearch`) yalnız `package.json` + `tsconfig.json` + `src/index.ts` (`export {}`). `integration-tests/*` boş (yalnız `package.json`/`README`). `packages/db/migrations` boş. Belgelerde geçen `wishlist`, `reviews`, `subscriptions`, `payment-polar` paketleri depoda **yok**. Bu gruptaki hiçbir madde `+` değildir; yalnız paket iskeleti olanlar `±`.

---

### 43. `docs/04-genisletme/01-stratejiler-ve-operasyonlar.md` — stratejiler, operasyonlar, portlar, süreç bekçileri

- **Kaynak kararlar:**
  - Strateji soru başına bir tanedir, `store.config.ts`'de seçilir; okuma yolundakiler (`priceSelection`, `linePrice`, `taxZone`, `taxLine`) **saf ve senkron**dur, DB/ağ yok. Tabloda 15 strateji var (`stockLocation`, `stockDisplay`, `orderNumber`, `activeCart`, `cartMerge`, `guestCheckout`, `orderPlaced`, `approvalPolicy`, `assetNaming`, `assetStorage`, `passwordPolicy` dahil).
  - Operasyon = `code` + Zod argüman şeması + işlev; seçim `{ code, args }` JSON olarak saklanır; admin formu şemadan üretir. 8 tür: `PromotionCondition`, `PromotionAction`, `ShippingEligibilityChecker`, `ShippingCalculator`, `PaymentEligibilityChecker`, `PaymentHandler`, `FulfillmentHandler`, `CollectionFilter`.
  - Portlar: `EmailProvider`, `SmsProvider`, `InvoiceProvider`, `SearchProvider`, `ImageProcessor`, `StorageProvider`; yalnız işlerde çağrılır.
  - Sepet/checkout yolundaki asenkron operasyonlarda zaman aşımı + yedek değer zorunlu. `PaymentHandler.verifyWebhook` normalize sonuç döner (ödendi, serbest bırak, beklemede, iade senkronu); webhook rotası sağlayıcı adını bilmez.
  - Süreç bekçisi: sipariş/ödeme/teslimat durumları sabit; built-in app geçişe `canTransition` bekçisi ve "sonrası" kancası (outbox satırı) ekler, yeni durum ekleyemez.
  - Kayıt defteri açılışta bir kez kurulur, istek başına `Map` erişimi; aynı `code` iki kez → açılış hatası; kayıtsız saklı `code` → kayıt devre dışı + admin uyarısı, istek çökmez.
- **Bağımlılık:** 5 (Platform), 7 (yapılandırma: `store.config.ts` birleştirme), 8 (`Ctx`), 9 (outbox, bekçi sonrası kancası için).
- **Yapılacaklar:**
  1. `-` `packages/core/src/extend/strategies/types.ts`: 15 strateji arayüzü (tip yalnız); okuma yolu stratejilerinin imzası `Promise` döndüremez (tip düzeyinde senkron).
  2. `-` `packages/core/src/extend/strategies/defaults/*.ts`: her strateji için bir dosya varsayılan (ör. `orderNumber.ts` yıl + sıra, `stockDisplay.ts` `tükendi/az kaldı/stokta`); saf olanlar birim testli.
  3. `-` `packages/core/src/extend/operations/defineOperation.ts`: `defineOperation(kind)` fabrikası + tür başına kısayol (`definePromotionCondition`, `defineShippingCalculator`…); `args` Zod şeması zorunlu.
  4. `-` `packages/core/src/extend/registry/buildRegistry.ts` (saf): strateji ve operasyon listelerinden `Map<kind, Map<code, op>>` kurar; çift `code`'da `DuplicateOperationCode` fırlatır.
  5. `-` `packages/core/src/extend/registry/resolveOperation.ts` (saf): saklı `{ code, args }` → `{ op, args }` ya da `{ disabled: true, reason }`; args'ı Zod ile doğrular, bilinmeyen `code` çökertmez.
  6. `-` `packages/core/src/extend/operations/withTimeout.ts`: asenkron operasyonu zaman aşımı + yedek değerle sarar (kargo/vergi yedeğe düşer, ödeme hata döner); süre `Ctx` saatinden.
  7. `-` `packages/core/src/extend/ports/*.ts`: altı port arayüzü (dosya başına bir) + `PaymentHandler` / `FulfillmentHandler` arayüzleri (`features/payments`, `features/fulfillment` bunları `index.ts` üzerinden tüketir).
  8. `-` `packages/core/src/extend/guards/types.ts` + `runGuards.ts`: `canTransition(ctx, from, to, entity) → { ok } | { ok:false, reason }`; ilk ret kazanır; sonrası kancaları outbox satırı döndürür, doğrudan yan etki yapmaz.
  9. `-` `packages/core/src/extend/operations/argsToFormSchema.ts` (saf): Zod args → admin form tanımı (JSON); admin `@openmers/ui` form üretecine verir.
  10. `-` `packages/core/src/extend/index.ts`: yalnız genel yüzey (`defineOperation`, kısayollar, port ve strateji tipleri, `buildRegistry`).
  11. `-` `apps/admin/src/features/operations/`: devre dışı kayıt uyarısı bileşeni (yalnız `@openmers/ui` `Alert`/`Badge`).
- **Testler:**
  - `packages/core/src/extend/registry/buildRegistry.test.ts`: çift `code` açılışı durdurur; bilinmeyen `code` `disabled` döner.
  - `packages/core/src/extend/operations/withTimeout.test.ts`: sahte saatle zaman aşımında yedek değer.
  - `integration-tests/contract/__tests__/strategies/*.contract.ts`: her strateji türü için ortak paket (saf strateji DB'ye/ağa dokunmaz: `Platform` vermeden çağrılır).
  - `integration-tests/contract/__tests__/operations/*.contract.ts`: tür başına ortak paket (args şeması, deterministik sonuç, zaman aşımı davranışı).
  - `integration-tests/core/__tests__/guards.test.ts` (D1 + SQLite): bekçi `placed` geçişini reddeder, durum değişmez, outbox satırı yazılmaz.
- **Bitti sayılır:**
  - 15 strateji ve 8 operasyon türünün arayüzü + varsayılanı derleniyor, `extend/index.ts`'den dışa açık.
  - Çift `code` ve kayıtsız `code` testleri yeşil; istek başına kayıt defteri kurulmuyor (açılışta bir kez, testle).
  - Her tür için sözleşme paketi `integration-tests/contract` altında var ve varsayılanlar geçiyor.
- **Açık sorular / riskler:**
  - Strateji `init(injector)`/`destroy()` (46'daki bölüm 8) ile bu belgedeki "saf ve senkron" kuralı birlikte nasıl tiplenecek belirtilmemiş.
  - `ImageProcessor` portunun Workers karşılığı (yalnız Node `sharp` → `targets: ['node']`) bu belgede yok.
  - Bekçi sonrası kancasının hangi `atomic()` içinde çalıştığı (geçişle aynı işlem mi) açıkça yazılmamış; varsayım: aynı işlem.

### 44. `docs/04-genisletme/04-ozel-alanlar-ve-metadata.md` — özel alanlar ve metadata

- **Kaynak kararlar:**
  - Desteklenen varlıklar: ürün, varyant, koleksiyon, müşteri, şirket, adres, sipariş, sipariş satırı, kanal, teklif. Saklama: varlık tablosunda tek `custom_fields` JSON sütunu (alan başına sütun yok).
  - `index: true` → migration üreteci `json_extract` ifade indeksi ekler; yalnız bu alanlar filtrelenebilir. `public: true` → indeksleme anında okuma modeline kopyalanır.
  - Çevrilebilir özel alan `translations` tablosunun JSON sütununda; yazma anında Zod doğrulaması; tanımı kalkan alanın verisi durur ama API'de görünmez. İlişki tipi `public_id` olarak saklanır, API'de çözülmez (N+1 kapısı).
  - Metadata: anahtar uygulama kimliğiyle önekli (`acme.loyalty.points`); başkasının anahtarı yazılamaz; sınır anahtar başına 2 KB, varlık başına 16 KB. `metadata` vitrine açık, `private_metadata` yalnız Admin API.
  - Kişiselleştirme (gravür vb.) özel alan değildir; satır fiyatını/kimliğini değiştirmez.
- **Bağımlılık:** 6 (`packages/db` şema; `custom_fields`, `metadata`, `private_metadata` sütunları), 8 (`contract`), 15 (`catalogIndex` için `public` kopyalama), 43 (kayıt defteri, alan tanımları açılışta toplanır).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/*.ts`: 10 varlık tablosuna `custom_fields` JSON; ürün/sipariş/müşteriye `metadata` ve `private_metadata` JSON (numaralı eklemeli migration, varlık grubu başına bir).
  2. `-` `packages/core/src/extend/customFields/defineCustomFields.ts`: `{ <varlık>: { <alan>: zod } }` + alan seçenekleri (`index`, `public`, `translatable`, `requiresPermission`).
  3. `-` `packages/core/src/extend/customFields/mergeDefinitions.ts` (saf): `store.config.ts` + built-in app tanımlarını birleştirir; aynı varlıkta aynı alan adı çakışırsa açılış hatası.
  4. `-` `packages/core/src/extend/customFields/validateCustomFields.ts` (saf): yazma girdisini Zod ile doğrular; tanımsız anahtarı reddeder, tanımı kalkmış saklı anahtarı çıktıdan süzer (`stripUnknown.ts`).
  5. `-` `packages/core/src/extend/customFields/indexMigrations.ts` (saf): `index: true` alanlar için `CREATE INDEX ... ON <t>(json_extract(custom_fields,'$.<alan>'))` SQL üretir; migration üretecine (46) girdi.
  6. `-` `packages/core/src/extend/customFields/contractExtend.ts`: alan tanımlarından `contract` giriş/çıkış Zod şemalarını genişletir (Shop'ta yalnız `public` alanlar).
  7. `-` `packages/core/src/features/catalogIndex/` indeksleme adımı: `public` alanları okuma modeline kopyalar (ek sorgu yok).
  8. `-` `packages/core/src/features/apps/metadata/validateMetadataWrite.ts` (saf): önek sahipliği (`<appId>:` ya da 05'teki `<appId>.` biçimi, bkz. açık soru), 2 KB / 16 KB sınırı.
  9. `-` `packages/core/src/features/apps/metadata/writeMetadata.ts`: `atomic()` içinde JSON birleştirme yazımı.
  10. `-` `apps/admin/src/features/custom-fields/`: şemadan form üretimi (`@openmers/ui` alanları); built-in app kendi React bileşenini verirse onu kullanır.
- **Testler:**
  - `validateCustomFields.test.ts`, `validateMetadataWrite.test.ts`, `indexMigrations.test.ts` (birim).
  - `integration-tests/core/__tests__/custom-fields.test.ts` (D1 + SQLite): `index: true` alanla filtrelemede `EXPLAIN QUERY PLAN` ifade indeksini kullanır (tam tarama yok).
  - `integration-tests/api/__tests__/shop/custom-fields.test.ts`: `public` olmayan alan Shop API'de dönmez; tanımı kaldırılan alan verisi DB'de durur, API'de görünmez.
  - `integration-tests/api/__tests__/admin/metadata.test.ts`: başka uygulamanın önekiyle yazma `403`; 16 KB üstü reddedilir.
- **Bitti sayılır:**
  - 10 varlıkta özel alan yazılıp okunabiliyor; Zod hatası `{ ok:false, code }` döner.
  - İndeksli alan filtresinin sorgu planı testi yeşil.
  - Metadata önek ve boyut sınırı Admin API ve app token ile test edildi.
- **Açık sorular / riskler:**
  - Metadata önek ayırıcısı kapatıldı: her yerde `.` (`acme.loyalty.points`).
  - Bu belge metadata'yı "ürün, sipariş, müşteri" ile sınırlıyor (03 bölüm 6 ile aynı); şirket/teklif için metadata yok mu, B2B uygulamaları (42) için netleşmeli.
  - `requiresPermission` varken `public` yok sayılır kararı (07 bölüm 14) ATLANANLAR'da açık.
  - Özel alan ilişki tipinin çözülmemesi istemci tarafında ek çağrı demek; tur bütçesine etkisi ölçülmedi.

### 45. `docs/04-genisletme/02-built-in-apps.md` — `defineBuiltInApp`, etkinleştirme, yaşam döngüsü

- **Kaynak kararlar:**
  - `defineBuiltInApp` alanları: `id`, `compatibility`, `schema`, `customFields`, `permissions`, `strategies`, `operations`, `shopApi`, `adminApi`, `subscribers`, `jobs`, `scheduled`, `guards`, `settings`, `admin`, `init`, ayrıca `requires`, `targets`.
  - Tablo öneki `bia_<id>_`; çekirdek tablolarına yazmaz (join serbest). API ad alanı `/x/<id>/`, çekirdek ucunu ezemez, her uç izin bildirir. Aboneler worker'da, idempotent. Sır kasadan (`ctx.secrets.get`). Vitrin okuma yoluna ara katman yok; veri `indexExtend` ile.
  - İki kip: self-host'ta `builtInApps` listesi (listede olmayan derlemeye girmez: kod/tablo/iş sıfır); SaaS'ta hepsi derlemede, `settings.<ad>_enabled` bayrağı; kapalıyken menü, vitrin, API (404) ve işlerde görünmez, `indexExtend` atlanır.
  - Yaşam döngüsü: listeden çıkarınca tablo silinmez; `purge <id>` açık onayla siler; SaaS'ta bekleyen iş varken kapatma reddedilir; `requires` eksikse açılış başarısız.
  - `compatibility` çekirdek sürümünü karşılamazsa açılış başarısız; built-in app'e açılan yüzey eklemeli tutulur.
  - Karar sırası (3.1): çekirdek → built-in app → tak-çalıştır app; belirsizse en küçük yetkili biçim (app) + ATLANANLAR notu.
- **Bağımlılık:** 43, 44, 6 (migration çalıştırıcı), 7 (`store.config.ts`), 8 (oRPC yönlendirici birleştirme), 9 (abone/iş/zamanlayıcı), 11 (izin modeli, `secrets`, ayar deposu).
- **Yapılacaklar:**
  1. `-` `packages/core/src/extend/builtInApp/types.ts`: `BuiltInAppDefinition` tipi (yukarıdaki alanların tümü; `targets?: ('node'|'cloudflare')[]`, `requires?: string[]`).
  2. `-` `packages/core/src/extend/builtInApp/defineBuiltInApp.ts`: kimlik fonksiyonu + derleme zamanı denetimi (izinsiz prosedür tip hatası).
  3. `-` `packages/core/src/extend/builtInApp/validateApps.ts` (saf): `id` biçimi, tablo adları `bia_<id>_` önekli mi, `requires` var mı, `compatibility` semver aralığı çekirdek sürümünü karşılıyor mu; hata listesi döner.
  4. `-` `packages/core/src/extend/builtInApp/composeApps.ts` (saf): uygulamaları strateji/operasyon/bekçi/abone/iş/izin/ayar listelerine açar ve 43'ün `buildRegistry`'sine verir; `targets` dışı hedefte uygulamayı atar.
  5. `-` `packages/core/src/extend/builtInApp/isEnabled.ts`: kip + `settings.<ad>_enabled` → etkin mi (SaaS bayrağı ayar deposundan, istek başına önbellekli).
  6. `-` `apps/api/src/x/mountBuiltInApps.ts`: `/shop/x/<id>/`, `/admin/x/<id>/` altına yönlendirici bağlar; kapalı uygulamada 404; genel ara katman açmaz.
  7. `-` `packages/core/src/jobs/` ve `events/` entegrasyonu: abone kaydı uygulama etkin değilse atlanır; `scheduled` cron girdisi kapalıysa çalışmaz.
  8. `-` `packages/core/src/features/catalogIndex/indexExtend.ts`: uygulama katkılarını indeksleme anında toplar; kapalı uygulamayı atlar.
  9. `-` `packages/core/src/extend/builtInApp/lifecycle/`: `runInit.ts` (ilk açılışta bir kez, ayar varsayılanları), `canDisable.ts` (bekleyen iş sorgusu → ret nedenleri), `purge.ts` (yalnız `bia_<id>_*` tabloları ve `<id>.` ayarları; yedek uyarısı).
  10. `-` `packages/db`: migration çalıştırıcısı modül migration'larını (`packages/modules/<ad>/src/migrations/`) çekirdek migration'larından sonra, uygulama başına sıralı uygular.
  11. `±` `packages/modules/*/package.json`: 11 paket `@openmers/builtin-<ad>` adıyla var, `src/index.ts` boş. Her biri `defineBuiltInApp` dışa aktaracak ve `@openmers/core`'u `peerDependencies`'e alacak.
  12. `-` `apps/admin/src/features/built-in-apps/`: etkin built-in app listesi, SaaS bayrak anahtarı, kapatma reddi nedenleri (`@openmers/ui` `Switch`, `Prompt`).
- **Testler:**
  - `validateApps.test.ts`: önek dışı tablo, eksik `requires`, uyumsuz `compatibility` → açılış hatası.
  - `integration-tests/api/__tests__/admin/built-in-app-flag.test.ts`: bayrak kapalı → `/x/<id>/` 404, abone çalışmaz, `indexExtend` atlanır.
  - `integration-tests/core/__tests__/built-in-app-lifecycle.test.ts` (D1 + SQLite): listeden çıkar + yeniden ekle → veri geri gelir; `purge` yalnız `bia_<id>_` tablolarını siler.
  - `integration-tests/core/__tests__/disable-with-pending-jobs.test.ts`: bekleyen iş varken kapatma reddedilir.
  - Derleme denetimi: listede olmayan modülün Worker paketine girmediği (`scripts/bundle-size` ya da paket analizi).
- **Bitti sayılır:**
  - Sahte bir `bia_demo_` uygulaması tablo, uç, abone, iş, ayar ve bekçiyle uçtan uca D1 ve SQLite'ta çalışıyor.
  - Kapalı bayrakta 404 + iş/abone yok testi yeşil.
  - `compatibility`/`requires` ret testleri yeşil; listede olmayan modül Worker boyutuna 0 bayt ekliyor (ölçüm).
- **Açık sorular / riskler:**
  - ATLANANLAR: `requires` bağımlılık çözümü, bayrak kapatma reddi ayrıntısı, `purge` komutu tasarlanmadı.
  - API ad alanı tutarsız: bu belge `/x/<id>/` ve id örneği `acme.loyalty`; tablo öneki `bia_<id>_` noktalı id ile nasıl üretilir (nokta → alt çizgi?) yazmıyor. Favori belgesi `/x/builtin.wishlist/` ama tablo `bia_wishlist_` kullanıyor.
  - Paket adı tutarsız: e-fatura belgesi `@openmers/builtin-e-fatura`, depo `@openmers/builtin-invoice-parasut`. Port tek, sağlayıcı ayrı paket mi olacak karar gerekli.
  - Ödeme listesinde Polar var ama `packages/modules/payment-polar` yok.

### 46. `docs/04-genisletme/07-built-in-app-gelistirme.md` — built-in app geliştirici rehberinin araçları

- **Kaynak kararlar:**
  - İskelet: `packages/modules/<ad>/src/{index.ts, schema.ts, migrations/0001_*.sql, services/, api/shop.ts|admin.ts, subscribers/, jobs/, admin/, i18n/}` + `test/`.
  - Altın kurallar: çekirdek tablosuna yazma yok; her yazma `atomic()`, yan etki outbox satırı; aboneler idempotent; `process.env` yok; D1 ve SQLite'ta aynı test; iş yüküne ham `ctx` ve sır konmaz.
  - Her prosedür `permission` bildirir (bildirimsiz derleme hatası); beklenen hata değer olarak `{ ok:false, code, message, details }`, kod biçimi `<app>.<kod>`; beklenmeyen hata 5xx + istek kimliği.
  - Zamanlanmış görev tek çalışma için `locked_until` kilidi; görev kodu `setInterval` kullanmaz; uzun iş imleçle parçalanır.
  - Ayar kapsamları `global · channel · user · userAndChannel`, anahtar `<app-id>.<ad>`; `crudPermissions('x')` kısayolu. Telemetri yok (karar).
  - Önerilen (⚙️, hiçbiri yazılmadı): `openmers dev/add/migrate/schema/doctor/app validate/audit verify/script/i18n check/settings prune/db export --scrub-secrets`, `@openmers/testing` `createTestStore`.
- **Bağımlılık:** 45 (`defineBuiltInApp`), 9 (iş kuyruğu, kilit), 11 (`secrets`, denetim kaydı), 3 (test altyapısı, `@openmers/test-utils`).
- **Yapılacaklar:**
  1. `-` `packages/core/src/extend/errors/resultTypes.ts`: `Ok<T> | Err<code>` birleşimi ve `appError('<app>.<kod>')` yardımcısı; oRPC çıktı şemasına bağlanır.
  2. `-` `packages/core/src/extend/permissions/crudPermissions.ts` (saf) + test.
  3. `-` `packages/core/src/extend/settings/defineSettings.ts`: Zod şema, kapsam, `readPermission`/`writePermission`, `validate(value, ctx)`; anahtar `<app-id>.<ad>`.
  4. `-` `packages/core/src/jobs/scheduler/claimScheduledTask.ts`: `UPDATE ... SET locked_until=? WHERE name=? AND locked_until<now` ile tek çalışma; Cloudflare cron ve Node zamanlayıcısı aynı fonksiyonu çağırır.
  5. `-` `packages/core/src/jobs/payloadGuard.ts` (saf): iş/olay yük şemasında sır alanı ve ham `ctx` yasağı (Zod ile, sözleşme testine bağlı).
  6. `-` `packages/core/src/ctx/log.ts`: `ctx.log.*` yapılandırılmış JSON (`app`, `requestId`, `channelId`, `actor`) + `maskPii.ts` (e-posta, telefon, TCKN, adres).
  7. `-` `packages/core/src/extend/i18n/resolveMessage.ts` (saf): `Accept-Language` → kanal varsayılanı → `en`; testte eksik anahtar hata.
  8. `-` `packages/test-utils/src/createTestStore.ts` (⚙️ `@openmers/testing` adı yerine mevcut `@openmers/test-utils` paketi önerilir): `{ api, admin, shop, db, runJobs() }`, port açmaz, sahte saat, D1 + SQLite.
  9. `-` `packages/create-openmers-app/templates/builtin/`: iskelet dosyaları (yukarıdaki ağaç) + sözleşme testi + `AGENTS.md` (altın kurallar); `--template builtin` bayrağı.
  10. `-` `packages/cli/` (yeni paket, ⚙️): ilk kapsam `openmers migrate generate|run`, `openmers add built-in-app <id> --non-interactive`, `openmers doctor`; geri kalan komutlar sonra.
  11. `-` `integration-tests/contract/__tests__/built-in-app/`: her resmî modülün geçmesi gereken genel paket (önek, izin bildirimi, yükte sır yok, `compatibility` dışı ret, kapalıyken 404).
- **Testler:**
  - `crudPermissions.test.ts`, `payloadGuard.test.ts`, `resolveMessage.test.ts`, `maskPii.test.ts` (birim).
  - `integration-tests/race/__tests__/scheduled-lock.test.ts`: aynı görevi iki eşzamanlı tetikleme → tek çalışma.
  - `integration-tests/contract/__tests__/built-in-app/*.contract.ts`: yukarıdaki genel paket.
  - Günlük testi: `ctx.log` çıktısında e-posta deseni yok.
- **Bitti sayılır:**
  - `createTestStore` ile sahte bir built-in app D1 ve SQLite'ta port açmadan test ediliyor.
  - Zamanlanmış görev yarış testi tek kazanan veriyor.
  - `create-openmers-app --template builtin` çıktısı `pnpm verify`'dan geçiyor.
- **Açık sorular / riskler:**
  - Rehberdeki CLI ve araçların tamamı öneri (⚙️, ATLANANLAR satır 59); hangi komutların v1'e gireceği karar ister. `packages/cli` repoda yok, yeni paket açmak monorepo belgesini (13) değiştirir.
  - `@openmers/testing` ile mevcut `@openmers/test-utils` aynı şey mi? Tek paket olmalı.
  - Sır anahtarı döndürme tasarlanmadı; CORS ayrıntısı, yükleme gövde sınırı, medya ön ayar kuralı eksik.
  - Ayar kapsamlarından `user`/`userAndChannel` gerekip gerekmediği açık.

### 47. `docs/04-genisletme/03-tak-calistir-apps.md` — tak-çalıştır app altyapısı (`features/apps`, `app-sdk`, `app-bridge`)

- **Kaynak kararlar:**
  - Uygulama dışarıda çalışan web servisidir; mağazayla yalnız genel API (`Authorization: Bearer <app token>`) ve webhook üzerinden konuşur. Ayrı "uygulama API'si" yok.
  - Manifest: `id`, `name`, `version`, `registerUrl`, `permissions`, `webhooks`, `syncHooks`, `extensions`, `agentTools`. Kurulum: indir → doğrula → izin onayı → kayıt + token (yalnız özeti saklanır) → `registerUrl`'e gönder. Kaldırma: token iptal, abonelik silme, `app.uninstalled`. İzin genişlerse yeniden onay. Özel uygulama (manifestsiz) aynı kaydı üretir.
  - Webhook = outbox satırı, HMAC imzalı, olay kimliği idempotency anahtarı. Senkron kanca yalnız üç tür (kargo oranları, ödeme, vergi), sıkı zaman aşımı; kargo/vergi yedeğe düşer, ödeme hata döner; render yolunda asla.
  - Admin iframe; bağlama noktaları `nav.page`, `order.details.panel`, `product.details.panel`, `customer.details.panel`, `settings.page`; kısa ömürlü JWT; CSP `frame-src` yalnız kurulu kökenler.
  - Güvenlik: varsayılan izin yok; `https` zorunlu, self-host'ta özel ağ/loopback yok (SSRF); app token için ayrı hız sınırı; her çağrı ve teslimat denetim kaydında. Teslimat: bellekte `(olay, kanal) → uygulamalar`, abonesiz olaya satır yazılmaz, uygulama başına eşzamanlılık, art arda başarısızlıkta askıya alma.
  - `agentTools`: ad `^[a-z][a-z0-9_]{0,47}$`, ajana `app_<kısa-ad>__<name>`; açıklama ≤500; risk `read · external · money` (varsayılan `external`); en çok 20 araç; 20 sn zaman aşımı; yanıt ≤32 KB, `summary` ≤1000; belirsiz sonuçta yeniden deneme yok; toplam uygulama aracı >15 ise `apps.searchTools` + `apps.callTool`.
- **Bağımlılık:** 8 (genel API, oRPC), 9 (outbox), 11 (izin modeli, denetim kaydı), 12 (JWT imza anahtarı), 44 (metadata), 31 (admin iskeleti), 36 (ajan araçları için builder ve onay kartları), 42 (kanal kapsamı ve B2B).
- **Yapılacaklar:**
  1. `-` `packages/contract/src/apps/manifest.ts`: manifest Zod şeması (agentTools kuralları dahil); `app-sdk` ve `openmers-app validate` aynı şemayı kullanır.
  2. `-` `packages/db/src/schema/apps.ts`: `apps` (kayıt, `token_hash`, izinler, kanal kapsamı, `trusted`, `suspended_at`), `app_webhook_subscriptions`, `app_extensions`, `app_agent_tools`; eklemeli migration.
  3. `-` `packages/core/src/features/apps/install/`: `fetchManifest.ts` (I/O, SSRF süzgeci üzerinden), `diffPermissions.ts` (saf: yeniden onay gerekiyor mu), `installApp.ts` (`atomic()`: kayıt + token özeti), `callRegister.ts` (başarısızsa kurulumu geri al), `uninstallApp.ts`.
  4. `-` `packages/core/src/features/apps/net/assertPublicHttps.ts` (saf + DNS çözümü I/O ayrı): `https`, özel ağ/loopback reddi; geliştirme kipinde `localhost` istisnası.
  5. `-` `packages/core/src/features/apps/webhooks/`: `subscriptionIndex.ts` (bellekte `(olay, kanal) → uygulamalar`), `enqueueWebhook.ts` (abonesizse yazma yok; kişisel veri izni süzgeci), `signPayload.ts` (saf HMAC), `deliverWebhook.ts` (worker işi, uygulama başına eşzamanlılık), `suspendOnFailures.ts`.
  6. `-` `packages/core/src/features/apps/syncHooks/callSyncHook.ts`: üç tür için zaman aşımlı çağrı; 43'teki `withTimeout` ile; `AppShippingCalculator`, `AppPaymentHandler`, `AppTaxProvider` genel adaptörleri.
  7. `-` `apps/api/src/admin/apps/*`: kur, kaldır, özel uygulama oluştur, teslimat geçmişi, `dead` yeniden gönder (dosya başına bir uç, ince).
  8. `-` `packages/core/src/features/apps/session/issueAppSessionJwt.ts` + `apps/api/src/hooks/jwks.ts` (`/.well-known/jwks.json`).
  9. `-` `apps/admin/src/features/apps/`: kurulum/izin onay ekranı, iframe kabuğu (`AppFrame.tsx`), son teslimatlar tablosu, ajan aracı aç/kapat; yalnız `@openmers/ui`. CSP `frame-src` üretimi.
  10. `±` `packages/app-bridge/src/index.ts` (iskelet var, boş): `postMessage` istemcisi (`getSessionToken`, bağlam, tema/dil, gezinme, bildirim) + admin tarafı dinleyici; köken denetimi.
  11. `±` `packages/app-sdk/src/index.ts` (iskelet var, boş): oRPC istemcisi, `verifyWebhook(req, secret)`, `TokenStore` arayüzü (KV/SQLite/bellek), `defineAgentTool`.
  12. `-` `packages/core/src/features/apps/agentTools/`: `toolName.ts` (saf ad üretimi/çakışma), `validateToolInput.ts` (JSON Schema), `invokeAppTool.ts` (risk → onay kartı, 20 sn, 32 KB kesme, belirsiz sonuçta yeniden deneme yok), `searchTools.ts`/`callTool.ts` (15 eşiği). Builder (36) bitmeden açılmaz (sıralama 3a).
- **Testler:**
  - Birim: `manifest.test.ts` (araç adı, 20 araç sınırı, `additionalProperties:false` zorunluluğu), `diffPermissions.test.ts`, `signPayload.test.ts`, `assertPublicHttps.test.ts` (10.x, 127.0.0.1, ::1, IPv4-mapped IPv6).
  - `integration-tests/api/__tests__/admin/apps-install.test.ts`: `registerUrl` 500 → kurulum geri alınır; token yalnız özetle saklanır.
  - `integration-tests/api/__tests__/app-token-permissions.test.ts`: izin dışı prosedür `403`; app token hız sınırı ayrı.
  - `integration-tests/core/__tests__/webhook-delivery.test.ts`: abonesiz olayda outbox satırı yok; art arda hata → askıya alma; kişisel veri izni olmayan uygulamaya müşteri olayı gitmez.
  - `integration-tests/race/__tests__/webhook-concurrency.test.ts`: yavaş uygulama diğerinin teslimatını bekletmez.
  - `integration-tests/core/__tests__/sync-hook-timeout.test.ts`: kargo kancası zaman aşımında yedek oran; ödeme kancası hata.
- **Bitti sayılır:**
  - Örnek uygulama (48'in şablonu) manifestle kurulur, `order.paid` webhook'unu imzalı alır, kaldırılınca `app.uninstalled` gelir.
  - SSRF ve izin testleri yeşil; admin iframe JWT ile panel açıyor.
  - Sıralama 1-2 (manifest/kurulum/webhook, iframe) tamam; senkron kanca ve ajan araçları ayrı kilometre taşı.
- **Açık sorular / riskler:**
  - ⚙️ başlık adları, kayıt gövdesi, JWKS adresi, hız sınırı değerleri öneri (ATLANANLAR satır 41).
  - Uygulama dizini, ücretli app faturalaması, çok mağazalı app'in kanal ayrımı tasarlanmadı (satır 42).
  - Senkron kanca zaman aşımı sayısı belgede yok ("sıkı").
  - DNS rebinding: çözümleme ile bağlantı arasında adres değişirse SSRF süzgeci atlatılabilir; Workers `fetch`'inde IP sabitleme mümkün mü doğrulanmadı.

### 48. `docs/04-genisletme/05-tak-calistir-app-gelistirme.md` — `create-openmers-app` ve geliştirici akışı

- **Kaynak kararlar:**
  - `npm create openmers-app@latest <ad>`: Hono + Workers; `manifest` ucu, `register` ucu, imza doğrulama ara katmanı, app-bridge örneği, token deposu (KV/SQLite/bellek). Başka dil için OpenAPI'den üretilen istemci.
  - Kayıt isteği (⚙️): `{ storeUrl, appToken: "omat_...", webhookSecret: "whsec_...", channels, jwksUrl }`; uygulama mağaza başına saklar, `200` dönmezse mağaza kurulumu geri alır.
  - Webhook başlıkları (⚙️): `X-OpenMers-Event`, `X-OpenMers-Event-Id`, `X-OpenMers-Signature: t=...,v1=...` (HMAC-SHA256(secret, t + "." + gövde)); sabit zamanlı karşılaştırma, ±5 dk; sıra garantisi yok.
  - API: liste `limit` ≤ 100, imleçli; yazmada `Idempotency-Key`; `429` + `Retry-After`.
  - `customer.anonymized` gelince uygulama kişisel veriyi siler; özel uygulama (manifestsiz) admin formundan token.
  - Test tablosu: manifest şeması, kayıt ucu, imza (yanlış/eski/tekrar), idempotency, yeniden onay, izin eksikliği, askıya alma, ajan aracı. Dağıtım: manifest URL'si; dizin v1'de yok.
- **Bağımlılık:** 47 (manifest şeması, kurulum, webhook imzası), 8 (OpenAPI üretimi), 56 (`openmers dev` için tohum veri; ⚙️).
- **Yapılacaklar:**
  1. `±` `packages/create-openmers-app/src/index.ts` (iskelet var, boş): CLI girişi; `--template app` (varsayılan) ve `--template builtin` (46), etkileşimsiz bayraklar.
  2. `-` `packages/create-openmers-app/templates/app/`: Hono + Workers; `src/routes/manifest.ts`, `register.ts`, `hooks.ts`, `admin/`; `wrangler.toml`; örnek `defineAgentTool` (okuma aracı).
  3. `-` `packages/app-sdk/src/webhook/verifyWebhook.ts` (saf, Web Crypto): imza + zaman damgası ±5 dk + sabit zamanlı karşılaştırma.
  4. `-` `packages/app-sdk/src/register/handleRegister.ts`: kayıt gövdesini doğrular, `TokenStore`'a mağaza başına yazar; `handleUninstalled.ts` siler.
  5. `-` `packages/app-sdk/src/store/{memory,kv,sqlite}.ts`: `TokenStore` uygulamaları (her biri ayrı dosya).
  6. `-` `packages/app-sdk/src/client/createStoreClient.ts`: oRPC istemcisi; `Idempotency-Key` otomatik, `429`'da `Retry-After` geri çekilme.
  7. `-` `packages/app-sdk/src/bin/validate.ts`: `openmers-app validate ./manifest.json` (47'deki `contract` şemasıyla).
  8. `-` `packages/app-sdk/src/testing/fakeStore.ts`: sahte mağaza kayıt isteği ve imzalı webhook üretir (geliştiricinin testleri için).
  9. `-` Mağaza tarafı: arka planda manifest sürüm kontrolü işi (`packages/core/src/features/apps/jobs/checkManifestUpdates.ts`), izin genişlemesinde yeniden onay bildirimi.
  10. `-` `apps/admin/src/features/apps/custom-app/`: özel uygulama formu (ad, izinler, webhook, panel; token bir kez gösterilir).
- **Testler:**
  - `packages/app-sdk/src/webhook/verifyWebhook.test.ts`: yanlış imza, eski zaman damgası, kurcalanmış gövde.
  - `packages/app-sdk/src/register/handleRegister.test.ts`: iki mağaza ayrı saklanır; uninstall siler.
  - `packages/create-openmers-app` duman testi: şablonu geçici dizine üret, `tsc` + şablon testlerini koş.
  - `integration-tests/api/__tests__/apps-e2e.test.ts`: şablondan üretilen uygulama (süreç içi Hono) yerel mağazaya kurulur, aynı `Event-Id` iki kez → tek yan etki.
- **Bitti sayılır:**
  - `create-openmers-app` çıktısı kurulup bir webhook ve bir iframe panelini çalıştırıyor.
  - `openmers-app validate` CI'da hatalı manifesti reddediyor.
  - Rehberdeki 8 test satırının her biri için en az bir otomatik test var.
- **Açık sorular / riskler:**
  - Tüm ⚙️ biçimler oRPC sözleşmesinden kesinleşecek; belge kesinleşince güncellenmeli.
  - `openmers-app validate` (bu belge) ile `openmers app validate` (07 bölüm 9) iki farklı komut adı.
  - `openmers dev` CLI'ı yok (46'ya bağlı); şablon testleri o gelene kadar `createTestStore` ile.

### 49. `docs/04-genisletme/06-medusa-eklentileri-karar-tablosu.md` — karar tablosunun uygulanması

- **Kaynak kararlar:**
  - 13 kaynağın biçimi: varyant görselleri, belgeler, sipariş notları, depolama, kimlik doğrulama, elle teslimat/ödeme **çekirdek**; `wishlist`, `reviews` **built-in app**; Odoo ERP **tak-çalıştır app**; çok satıcılı pazar yeri **kapsam dışı**.
  - Yorum ve favori dışarıda çalışan app olamaz: tak-çalıştır app müşteri kimliği taşımaz.
  - Varyant görseli için yalnız admin kısayolu "Seçenek değerine yükle" eklenir (şema değişmez; sıra `product_assets.position`).
  - Belgeler: resmî fatura e-fatura built-in app'te; sipariş özeti/paketleme listesi çekirdek `documents` servisinde, `DocumentRenderer` portu.
  - Parola karması Better Auth scrypt (Workers maliyeti ölçülecek); passkey müşteri girişinde sonraya.
  - Çekirdek ek işleri: `documents`, `order_notes`, storage `public/private`, `manual` işleyiciler.
- **Bağımlılık:** 25 (medya), 30 (belgeler), 23 (sipariş notları), 22 ve 20 (elle ödeme/teslimat), 12 (Better Auth), 45 (built-in app altyapısı, 52-53 için).
- **Yapılacaklar:** (bu belgenin işleri çoğunlukla başka maddelerde yaşar; burada yalnız iz sürme ve bu belgeye özgü küçük işler)
  1. `-` `apps/admin/src/features/products/media/UploadToOptionValue.tsx`: "Seçenek değerine yükle" kısayolu (`@openmers/ui`), çekirdek medya ucunu çağırır.
  2. `-` `packages/core/src/features/payments/handlers/manual.ts` (havale/EFT, kapıda) ve `packages/core/src/features/fulfillment/handlers/manual.ts`: çekirdek varsayılan işleyiciler (22 ve 20'nin parçası; 43'teki sözleşme paketini geçer).
  3. `-` `packages/core/src/features/documents/`: `DocumentRenderer` portu ve sürümlü sipariş özeti/paketleme listesi (30'un parçası; burada yalnız bağımlılık işareti).
  4. `-` `packages/core/src/features/media/storage/{r2,s3,local}.ts`: `StorageProvider` sürücüleri, `public/private` ad alanı (25'in parçası).
  5. `-` `packages/core/src/features/orders/notes/`: `order_notes` (23'ün parçası).
  6. `-` 52 ve 53'e bağla: wishlist ve reviews built-in app paketlerinin açılması (`packages/modules/wishlist`, `packages/modules/reviews`; bkz. ilgili maddeler).
  7. `-` Workers'ta scrypt maliyet ölçümü: `integration-tests/core/__tests__/password-hash-cost.bench.ts` (12'ye girdi).
- **Testler:**
  - `manual` işleyiciler `integration-tests/contract/__tests__/operations/payment-handler.contract.ts` ve `fulfillment-handler.contract.ts` paketlerini geçer.
  - Seçenek değerine yükleme: `integration-tests/api/__tests__/admin/media-option-value.test.ts` (aynı rengin tüm varyantları görseli paylaşır, indekste `thumbnail` çözülür).
- **Bitti sayılır:**
  - Karar tablosundaki 9 çekirdek/built-in app satırının her biri bir yol haritası maddesinde kodla karşılanmış (iz tablosu güncel).
  - `manual` ödeme ve teslimat işleyicileri sözleşme testinden geçiyor.
  - Workers scrypt ölçümü yapılmış ve parametreler belgeye yazılmış.
- **Açık sorular / riskler:**
  - Medusa sayfalarının bir kısmı boş geldi (Marketplace, Better Auth, file-local, manual): o satırlar yalnız bizim tasarımımız.
  - Workers'ta PDF üretimi, scrypt maliyeti, S3 uyumlu sürücü testi doğrulanmadı (ATLANANLAR satır 46).
  - Bu madde kendi kodu az, diğer maddelerin iz tablosudur; ayrı sprint açmaya gerek yok.

---

### 50. `docs/09-built-in-apps/01-e-fatura.md` — e-fatura / e-arşiv (`InvoiceProvider`, Paraşüt)

- **Kaynak kararlar:**
  - Biçim: süreç içi built-in app, `InvoiceProvider` portunu doldurur; aynı anda tek sağlayıcı etkin; ERP uygulaması da aynı portu doldurabilir. Türkiye dışında "fatura" basit PDF built-in app'i olabilir; çekirdekte yalnız `invoices` tablosu, port ve akış.
  - `invoices`: `public_id`, `order_id`, `due_at`, `kind` (`e_invoice · e_archive`), `type` (`sale · return`), `state`, `number`, `external_id`, `provider`, toplamlar, `issued_at`, `related_invoice_id?`, `snapshot`. Durumlar `pending → issuing → issued`, `failed`, `unknown`, `cancelled`; e-fatura için `accepted · rejected`.
  - Tetik ayarı: kesinleşince (varsayılan) / gönderimde / elle. Süre: `deadline_days=7`, `deadline_basis` (`order_and_payment` varsayılan · `delivery`), `force_by_deadline` açık, `warn_before_days=2`; hepsi `legal_policy` içinde `invoice.*`.
  - `idempotencyKey` = fatura `public_id`; zaman aşımında `unknown`, önce `findByReference`; körlemesine yeniden deneme yok. Kalıcı hata `failed`. Numara entegratörden gelir.
  - Vergi tutarları sepetle **aynı yuvarlama yardımcısıyla**; sipariş-fatura kuruş eşitliği sözleşme testidir.
  - İade: `type = return` + `related_invoice_id`; kısmi iade kısmi belge; iptal yalnız sağlayıcı ve süre izin verirse. e-İrsaliye (`eDespatch`) v1'de isteğe bağlı.
- **Bağımlılık:** 45, 43 (`InvoiceProvider` portu), 18 (vergi yuvarlama yardımcısı), 22 (`settled` olayı), 23 (sipariş anlık görüntüsü, outbox adımı), 9 (iş kuyruğu), 7 (`legal_policy` ayarı), 28 (müşteriye bildirim), 57 (alarm).
- **Yapılacaklar:**
  1. `-` `packages/core/src/extend/ports/invoiceProvider.ts`: belgedeki arayüz ve `capabilities`.
  2. `-` `packages/db/src/schema/invoices.ts`: `invoices` tablosu (çekirdek, `bia_` değil: belge "çekirdekte `invoices` tablosu" diyor) + `(state, due_at)` indeksi.
  3. `-` `packages/core/src/features/invoices/` (yeni feature): `transitions.ts` (durum tablosu, veri), `buildInvoiceDraft.ts` (saf: sipariş anlık görüntüsü → satırlar + vergi dökümü, aynı yuvarlama), `chooseKind.ts` (saf: mükellef → `e_invoice`, değilse `e_archive`), `computeDueAt.ts` (saf: `deadline_basis` + gün).
  4. `-` `features/invoices/enqueueInvoice.ts`: tetik olayıyla aynı `atomic()` içinde `pending` satır + outbox işi; tetik ayarına göre `order.settled` / `fulfillment.created` abonesi.
  5. `-` `features/invoices/jobs/issueInvoice.ts`: `issuing` yaz → `provider.issue` → `issued`; zaman aşımında `unknown`; kalıcı hatada `failed`. `jobs/resolveUnknown.ts`: `findByReference`.
  6. `-` `features/invoices/jobs/deadlineSweep.ts` (zamanlanmış): `force_by_deadline` ile son gün kesimi; 5. gün uyarısı; `due_at` geçmişse alarm.
  7. `-` `features/invoices/returns/createReturnInvoice.ts`: iade/kısmi iade için `type=return`, ilgili kalemler.
  8. `-` `packages/modules/invoice-fake/` ya da `packages/test-utils/src/fakes/fakeInvoiceProvider.ts`: sahte sağlayıcı (sıralama 1: uçtan uca test önce).
  9. `±` `packages/modules/invoice-parasut/` (iskelet var, boş): `port.ts`, `client.ts`, `mapping.ts`, `settings.ts`, `index.ts`. **Bekletiliyor** (kullanıcı kararı; API okunmadı); yalnız iskelet + sahte sağlayıcıyla sözleşme testi.
  10. `-` `apps/admin/src/features/invoices/`: sipariş ayrıntısı paneli (durum, numara, PDF, yeniden dene, iptal), "bekleyen / hatalı / belirsiz / süresi geçmiş" listeleri; `@openmers/ui` DataTable.
  11. `-` Checkout'ta kurumsal fatura alanları (çekirdek yalnız `tax_id`; vergi dairesi ve mükellefiyet e-fatura modülünün alanları; biçim doğrulaması çekirdekte yalnız boş olmama ve uzunluk sınırı; Türkiye'ye özgü biçim ve denetim hanesi doğrulaması `packages/modules/invoice-parasut/src/taxId/validateTrTaxId.ts` içinde, saf). Karar: ülkeye özgü doğrulama modülde.
  12. `-` `packages/core/src/features/invoices/pdfLink.ts`: müşteri hesabında süreli bağlantı (PDF ek değil).
- **Testler:**
  - `integration-tests/contract/__tests__/ports/invoice-provider.contract.ts`: sipariş toplamı = fatura toplamı kuruşu kuruşuna (çok oranlı, indirimli, kargolu sepet).
  - `integration-tests/core/__tests__/invoice-unknown.test.ts`: zaman aşımı → `unknown` → `findByReference` → tek fatura; ikinci `issue` çağrısı yok.
  - `chooseKind.test.ts`, `computeDueAt.test.ts` (birim; `delivery` ve `order_and_payment` için).
  - `integration-tests/core/__tests__/invoice-partial.test.ts`: kısmi gönderim ayarında kısmi fatura; kısmi iadede doğru tutarlı iade belgesi.
  - `integration-tests/race/__tests__/invoice-double-trigger.test.ts`: aynı tetik iki kez → tek `invoices` satırı.
- **Bitti sayılır:**
  - Sahte sağlayıcıyla sipariş kesinleşince fatura `issued` oluyor, PDF bağlantısı müşteriye gidiyor.
  - Kuruş eşitliği sözleşme testi ve `unknown` testi yeşil.
  - Süresi geçen fatura alarmı ve admin listesi çalışıyor.
- **Açık sorular / riskler:**
  - Paraşüt API'si okunmadı, entegratör bekletiliyor; gerçek sağlayıcı bu aşamada yazılamaz.
  - Mevzuat (7 gün başlangıcı, iade faturası süresi, e-arşiv eşiği, 1 Ocak 2026 ifadesi) doğrulanmadı (ATLANANLAR 86, 88, 92).
  - TC kimlik eşiği (açık soru 3), ihracat/mikro ihracat (açık soru 4).
  - Paket adı: belge `@openmers/builtin-e-fatura`, depo `invoice-parasut`. Öneri: akış çekirdekte (`features/invoices`), sağlayıcı paketi `invoice-parasut`; belge güncellenmeli.
  - Global hedef: Türkiye dışı için "basit PDF faturası" sağlayıcısı belgede var ama paket yok; global varsayılan olarak eklenmesi gerekebilir.

### 51. `docs/09-built-in-apps/05-iys.md` — İYS senkronu (`modules/iys`)

- **Kaynak kararlar:**
  - Built-in app, v1'de; çekirdek yalnız `consent.changed` olayı ve `ConsentRegistry` portu (`push`, `query`, `pull`).
  - Tablolar: `bia_iys_settings` (kodlar, `recipient_default=BIREYSEL`, kanal eşlemesi; sırlar kasada), `bia_iys_sync` (`direction push · pull`, `state pending · sent · confirmed · failed · conflict`, `attempts`, `last_error`, `external_ref?`), `bia_iys_cursor`.
  - Eşleme: `sms→MESAJ`, `call→ARAMA`, `email→EPOSTA` (`push` kapsam dışı); `granted→ONAY`, `withdrawn→RET`; alıcı E.164 telefon veya e-posta.
  - İtme: aynı `atomic()` içinde `pending`; `idempotencyKey = consents.id`; onay İYS doğrulanana kadar pazarlamaya hazır değil (`pending_registry`); ret yerelde hemen geçerli.
  - Çekme: varsayılan 15 dk; İYS'deki ret her zaman kazanır; onay çakışmasında yeni zaman damgası. Gönderim öncesi yerel durum 24 saatten eskiyse `query`; İYS'ye ulaşılamazsa pazarlama gitmez, işlemsel gider.
  - Anonimleştirmede İYS kaydı silinmez, `RET` işlenir; telefon/e-posta günlükte maskelenir.
- **Bağımlılık:** 45, 24 (`consents` tablosu, `consent.changed`, `ConsentRegistry` portu; 11-musteriler bölüm 17), 28 (işlemsel/ticari bildirim ayrımı), 9, 11 (`secrets`).
- **Yapılacaklar:**
  1. `-` `packages/core/src/extend/ports/consentRegistry.ts`: port arayüzü (çekirdek, ülkeden bağımsız).
  2. `-` `packages/core/src/features/notify/gate/marketingGate.ts`: pazarlama gönderiminden önce kayıt defteri tazeliği denetimi (port yoksa yerel durum); işlemsel bildirimi etkilemez.
  3. `±` `packages/modules/iys/` (iskelet var, boş): `src/schema.ts` (`bia_iys_*` üç tablo), `src/migrations/0001_iys.sql`.
  4. `-` `packages/modules/iys/src/mapping.ts` (saf): kanal/durum eşlemesi, E.164 normalleştirme.
  5. `-` `packages/modules/iys/src/subscribers/onConsentChanged.ts`: `bia_iys_sync` `pending` satırı (aynı `atomic()`, idempotent).
  6. `-` `packages/modules/iys/src/jobs/pushBatch.ts`: toplu gönderim (boyut ayardan, küçük başlar), artan bekleme, kalıcı hatada `failed` + alarm.
  7. `-` `packages/modules/iys/src/jobs/pullChanges.ts` + `resolveConflict.ts` (saf: ret kazanır, onayda yeni olan).
  8. `-` `packages/modules/iys/src/port.ts` + `client.ts`: gerçek İYS istemcisi **resmî belge alınana kadar yazılmaz**; önce `packages/modules/iys/src/fakeRegistry.ts`.
  9. `-` `packages/modules/iys/src/jobs/initialImport.ts`: yönetici onaylı, kanıtsız kayıt gönderilmez (ayar).
  10. `-` `packages/modules/iys/src/admin/`: ayar sayfası (bağlantı testi), eşitleme panosu, müşteri sayfası "İYS durumu" paneli; `@openmers/ui`.
- **Testler:**
  - `mapping.test.ts`, `resolveConflict.test.ts` (birim).
  - `integration-tests/core/__tests__/iys-push.test.ts`: aynı `consent.changed` iki kez → tek istek; toplu sınır aşımında bölme.
  - `integration-tests/core/__tests__/iys-pull.test.ts`: İYS'deki ret yerelde `withdrawn` (kaynak `iys`).
  - `integration-tests/core/__tests__/marketing-gate.test.ts`: sahte kayıt erişilemez → pazarlama gitmez, sipariş e-postası gider.
  - Anonimleştirme → `RET` itmesi; günlükte telefon/e-posta deseni yok.
- **Bitti sayılır:**
  - Sahte kayıt defteriyle itme + çekme + çakışma uçtan uca D1 ve SQLite'ta yeşil (sıralama adım 1).
  - Pazarlama kapısı testi yeşil; ret anında yerel iletişim duruyor.
  - Gerçek istemci için resmî belge erişimi alınmış (adım 2) ya da madde orada bloklu olarak işaretli.
- **Açık sorular / riskler:**
  - Resmî İYS API belgesi okunmadı: uç yolları, kimlik doğrulama, toplu sınır, çekme ucunun varlığı, entegratör zorunluluğu, TACIR kuralı doğrulanmadı (ATLANANLAR 86). Gerçek istemci bu yüzden bloklu.
  - Çekirdek `ConsentRegistry` imzası `ctx` almıyor (diğer portlar alıyor); tutarlılık için `ctx` eklenmeli.

### 52. `docs/09-built-in-apps/03-favori-listesi.md` — favori listesi (`builtin-wishlist`)

- **Kaynak kararlar:**
  - Built-in app `@openmers/builtin-wishlist`, varsayılan kapalı.
  - `bia_wishlist_lists` (`customer_id` benzersiz, `share_token_hash?`, `share_expires_at?`); `bia_wishlist_items` (`quantity` 1–99, `price_at_add?`, anahtar `(list_id, product_id, variant_id)`). Sınır 200 öğe.
  - Misafir listesi `localStorage`'da; girişte birleşir, aynı ürün+varyantta büyük adet kalır; sunucuda misafir listesi yok.
  - Okuma `catalog_index`'ten, öğe başına sorgu yok; silinen/yayından kalkan ürün "artık satışta değil".
  - Paylaşım: 32 bayt rastgele jeton, yalnız özeti; ömür 30 gün; iptal özeti siler; görünüm `noindex`, `no-store`, sahip bilgisi yok.
  - Fiyat düşüşü/stok bildirimi isteğe bağlı (kapalı), pazarlama izni, günde en çok 1 e-posta/müşteri; "kaç listede" sayacı `indexExtend` ile.
- **Bağımlılık:** 45, 15 (`catalogIndex`), 21 (sepet ucu), 24 (müşteri oturumu, pazarlama izni, anonimleştirme), 28 (bildirim), 61 (Pixel `AddToWishlist`, isteğe bağlı), 33/34 (vitrin/tema).
- **Yapılacaklar:**
  1. `-` `packages/modules/wishlist/` paketi aç (`@openmers/builtin-wishlist`; depoda yok), `src/index.ts` `defineBuiltInApp`.
  2. `-` `src/schema.ts` + `src/migrations/0001_wishlist.sql`: iki tablo, anahtar ve `customer_id` benzersiz indeksi.
  3. `-` `src/services/mergeGuestList.ts` (saf): misafir + sunucu listesi birleşimi, 200 sınırı, adet 1–99.
  4. `-` `src/services/{addItem,removeItem,setQuantity}.ts`: liste ilk eklemede oluşur; `atomic()`.
  5. `-` `src/services/readList.ts`: tek sorgu + `catalog_index` join (`WHERE id IN`), satışta olmayanı işaretler.
  6. `-` `src/services/share/{createShareToken,revokeShare,readShared}.ts`: Web Crypto rastgele 32 bayt, SHA-256 özeti, süre denetimi.
  7. `-` `src/api/shop/*.ts`: ekle/çıkar/adet/oku/birleştir/paylaş/iptal; oturum zorunlu, `no-store`; paylaşılan görünüm herkese açık, `noindex`.
  8. `-` `src/subscribers/onPriceOrStock.ts`: `product.price_changed`, `stock.restocked`; izinli müşteri, günlük 1 sınırı (ayar kapalıysa çalışmaz).
  9. `-` `src/indexExtend.ts`: ürün başına "kaç listede" sayacı (admin için).
  10. `-` `src/subscribers/onCustomerAnonymized.ts`: listeyi siler; veri indirme dışa aktarımına katkı.
  11. `-` `src/admin/`: müşteri ayrıntısında salt okunur "Favoriler" paneli, ayar sayfası; `@openmers/ui`. Ajan aracı `wishlist.stats` (`read`).
  12. `-` Tema: `apps/storefront/src/themes/default` favori adası (istemci tarafı, `localStorage` + API); vitrin sayfası listeyi okumaz.
- **Testler:**
  - `mergeGuestList.test.ts` (büyük adet kalır, 200 sınırı).
  - `integration-tests/api/__tests__/shop/wishlist.test.ts`: paylaşım jetonu iptali ve süre dolumu → 404; silinmiş ürün işaretli.
  - `integration-tests/core/__tests__/wishlist-notify.test.ts`: günde en çok 1 e-posta; izinsiz müşteriye gitmez.
  - `integration-tests/core/__tests__/wishlist-removed.test.ts`: uygulama listeden çıkarılınca tablolar duruyor, uçlar 404.
  - Sorgu planı: liste okuma tam tarama yapmaz.
- **Bitti sayılır:**
  - Giriş yapan müşteri ekler/okur/paylaşır; misafir birleşimi çalışıyor.
  - Paylaşım jetonu yalnız özetle saklanıyor (DB'de düz jeton yok, testle).
  - Belgedeki 6 test başlığının hepsi yeşil.
- **Açık sorular / riskler:**
  - Ad alanı `/x/builtin.wishlist/` (id `builtin.wishlist`) ile tablo öneki `bia_wishlist_` uyuşmuyor; 45'teki id→önek kuralı netleşmeli.
  - Fiyat düşüşü bildiriminin hukuki yönü doğrulanmadı (ATLANANLAR 46).
  - Çoklu liste, hediye listesi, "hepsini sepete ekle" kapsam dışı.

### 53. `docs/09-built-in-apps/04-urun-yorumlari.md` — ürün yorumları (`builtin-reviews`)

- **Kaynak kararlar:**
  - Built-in app `@openmers/builtin-reviews`, varsayılan kapalı.
  - Tablolar: `bia_reviews_reviews` (`rating` 1–5, `body` ≤ 5000, `status pending · approved · flagged · rejected`, `verified_purchase`, `source storefront · import · invite`, `helpful_count`), `bia_reviews_responses` (`review_id` benzersiz), `bia_reviews_media` (en çok 5 görsel), `bia_reviews_stats` (`count`, `sum`, `histogram`), `bia_reviews_requests`.
  - Bir müşteri bir ürüne tek yorum; varsayılan durum `pending`; güvenilir müşteri otomatik `approved` ayarı; doğrulanmış satın alma = teslim edilmiş sipariş satırına bağlı.
  - Spam: IP + oturum başına saatlik sınır, bal küpü, bağlantı sayısı kuralı → `flagged`; CAPTCHA yok; düz metin (HTML temizlenir).
  - İstatistik onay/ret/silmede **yeniden hesaplanır** (artırma değil) ve `reindex(product_id)`; `indexExtend` ile `catalog_index`/`product_view`'a. Yorum listesi imleçli, ayrı önbellekli API (kanal+dil anahtarlı, kısa TTL); JSON-LD yalnız yeterli onaylı yorumda.
  - Yorum isteği: teslimden N gün sonra, izne bağlı, imzalı tek kullanımlık bağlantı (`source = invite`), ürün başına tek istek. Anonimleştirmede yorum kalır, `display_name` "Anonim".
- **Bağımlılık:** 45, 15 (`catalogIndex`, `reindex`), 23 (teslim edilmiş sipariş satırı), 24 (oturum, izin, anonimleştirme), 25 (medya, görseller), 27 (SEO JSON-LD), 28 (yorum isteği e-postası), 10 (önbellek).
- **Yapılacaklar:**
  1. `-` `packages/modules/reviews/` paketi aç (`@openmers/builtin-reviews`; depoda yok).
  2. `-` `src/schema.ts` + `src/migrations/0001_reviews.sql`: beş tablo; `(product_id, customer_id)` benzersiz; `(product_id, status, created_at)` indeksi.
  3. `-` `src/services/transitions.ts` (veri) + `applyStatus.ts`: durum geçişleri.
  4. `-` `src/services/recomputeStats.ts`: ürünün onaylı yorumlarından tam yeniden hesap (idempotent) + `reindex` outbox satırı.
  5. `-` `src/services/spam/{sanitizeBody,flagRules,rateLimit}.ts`: saf temizleme ve kurallar; hız sınırı çekirdek `rateLimit` portuyla.
  6. `-` `src/services/createReview.ts`: doğrulanmış satın alma denetimi (çekirdek sipariş okuma, join), güvenilir müşteri kuralı.
  7. `-` `src/api/shop/*.ts`: liste (imleç, sıralama: en yeni/en yüksek/en yararlı), oluştur/düzenle, istatistik, yararlı oyu, şikâyet.
  8. `-` `src/api/admin/*.ts`: durum değiştir, yanıt CRUD, toplu onay.
  9. `-` `src/indexExtend.ts` (yıldız/sayı) ve `src/seo/jsonLd.ts` (saf, eşik ayarlı).
  10. `-` `src/jobs/sendReviewRequests.ts` + `src/services/inviteToken.ts` (imzalı, tek kullanımlık).
  11. `-` `src/subscribers/onCustomerAnonymized.ts`: `display_name` "Anonim", `customer_id` kopar; silme seçeneği.
  12. `-` `src/admin/`: ürün detayı "Yorumlar" paneli, "Yorum kuyruğu" sayfası (DataTable, toplu işlem); `@openmers/ui`. Ajan: `reviews.list` (`read`), `reviews.moderate` (`write`), `reviews.reply` (`external`).
- **Testler:**
  - `sanitizeBody.test.ts`, `flagRules.test.ts`, `jsonLd.test.ts` (birim).
  - `integration-tests/race/__tests__/reviews-one-per-customer.test.ts`: aynı müşteri iki eşzamanlı yorum → biri reddedilir.
  - `integration-tests/core/__tests__/reviews-stats.test.ts`: çift onay olayı istatistiği bozmaz; puan `catalog_index`'te.
  - `integration-tests/core/__tests__/review-requests.test.ts`: aynı sipariş-ürün için ikinci istek yok.
  - Anonimleştirmede yorum kalıyor; kaldırılan uygulamada tablolar duruyor; sorgu planı (liste) tam tarama yok.
- **Bitti sayılır:**
  - Ürün sayfasında yıldız/sayı ek sorgu olmadan geliyor (tur bütçesi testi).
  - Moderasyon akışı ve tek yorum yarış testi yeşil.
  - Belgedeki 9 test başlığının hepsi otomatik.
- **Açık sorular / riskler:**
  - Fotoğraflı yorum depolama sınırları, çeviri, satıcı yanıtı bildirimi, Soru-Cevap açık.
  - Arama motoru yorum/`aggregateRating` kurallarına uyum doğrulanmadı (ATLANANLAR 46); JSON-LD "yeterli sayı" eşiği belirtilmemiş.
  - Yorum isteğinin izin türü (hizmet mi pazarlama mı) belirsiz; varsayılan izne bağlı.

### 54. `docs/09-built-in-apps/02-abonelik.md` — abonelik (`builtin-subscriptions`)

- **Kaynak kararlar:**
  - Built-in app `@openmers/builtin-subscriptions`, varsayılan kapalı; kapalıyken `subscriptions.*` 404; bekleyen yenileme/aktif abonelik varken kapatma reddedilir.
  - İki faturalama kipi: `provider` (sağlayıcı zamanlar, ör. Polar) ve `self` (OpenMers kayıtlı kartı çeker); kip işleyicinin `capabilities.billing` değerinden. `PaymentHandler` eklentileri: `createSetup`, `chargeSaved`, `fetchChargeByKey`, `syncPlan`, `createSubscriptionCheckout`, `manageSubscription`, `portalUrl`; `Charge` = `paid | declined(soft|hard|fraud|needs_auth) | unknown`.
  - Çekirdek: `customer_payment_methods` (yalnız sağlayıcı belirteci + marka/son 4/son kullanma), `orders.createRecurring` (tek `atomic()`, koşullu stok, aynı anahtar etkisiz), sipariş `source = subscription`.
  - Cycle durumları: `scheduled → claimed → charging → charged → ordered → fulfilled`; yan dallar `awaiting_approval`, `skipped`, `needs_customer`, `retry_scheduled`, `failed_final`, `unknown_charge`. Claim: `UPDATE ... WHERE state='scheduled'`; `idempotencyKey = cycle.public_id`; belirsiz sonuç yeniden denenmez.
  - Dunning: abonelik başına tek açık kayıt (kısmi benzersiz indeks `WHERE state NOT IN ('recovered','unrecovered')`); `soft` takvim, `needs_auth` bağlantı, `hard/fraud` deneme yok; dunning indirimi yalnız `self`, yaşam boyu en çok bir kez.
  - Fiyat politikası varsayılan `lock`; teslimat ritmi ≠ faturalama (`subscription_deliveries`, `subscription_cycle_orders` köprü); Build-a-Box kutu sabit fiyat; MRR/churn/LTV günlük özet sipariş tablosunu taramaz; ilk işleyici Polar sandbox, Türkiye için iyzico sandbox.
- **Bağımlılık:** 45, 22 (`PaymentHandler` + yetenekler, `customer_payment_methods`), 23 (`orders.createRecurring`), 17 (koşullu stok), 18 (aynı yuvarlama), 19 (dunning indirimi `source = dunning`), 20 (teslimat aralığı, kesim saati), 28, 29 (dışa aktarım), 50 (fatura; MoR'da tetiklenmez), 59 (Stripe geçişi ortak ara biçim), sağlayıcılar bölümündeki Polar/Stripe/iyzico işleyicileri.
- **Yapılacaklar:**
  1. `-` Çekirdek (sıralama 1): `packages/db/src/schema/customer-payment-methods.ts`; `packages/core/src/features/payments/` `PaymentHandler.capabilities` + `Charge` tipi; `packages/core/src/features/orders/create/createRecurring.ts` (idempotent anahtar, koşullu stok, `importExternal` deseni).
  2. `-` `packages/test-utils/src/fakes/fakeBillingHandler.ts`: `self` ve `provider` iki kipte sahte işleyici (ret sınıfları, `unknown`, sıra dışı webhook).
  3. `-` `packages/modules/subscriptions/` paketi aç (depoda yok); `src/schema/` tablo grubu başına dosya (`plans.ts`, `subscriptions.ts`, `cycles.ts`, `dunning.ts`, `deliveries.ts`, `bundles.ts`, `stats.ts`, `provider-refs.ts`, `imports.ts`, `events.ts`); `bia_subscriptions_` öneki; `(state, due_at)` ve dunning kısmi benzersiz indeksi.
  4. `-` `src/services/cycle/transitions.ts` (veri) + `claimCycle.ts` (koşullu UPDATE) + `processCycle.ts` (orkestrasyon: doğrula → tutar → `charging` yaz → `chargeSaved` → `createRecurring` + sonraki cycle aynı `atomic()`).
  5. `-` `src/services/pricing/computeRenewalAmount.ts` (saf): `lock`/`follow_catalog`, vergi, kargo, aynı yuvarlama.
  6. `-` `src/jobs/{dueCycles,processCycle,recoverCharging}.ts`: dakikalık cron sınırlı N cycle; `charging`'de takılanı `fetchChargeByKey` ile kurtarma.
  7. `-` `src/services/dunning/{classifyDecline,nextAttemptAt,openOrAppendCase}.ts`: saf takvim (kanal saat dilimi, yaz saati), tek açık kayıt, dunning indirimi kuralı.
  8. `-` `src/webhooks/providerEvents.ts`: `provider` kipinde `order.paid (subscription_cycle)` → cycle `charged` → 5. adım; `webhook-id` + sağlayıcı sipariş kimliği idempotency; durumu `fetch` ile teyit.
  9. `-` `src/services/deliveries/{planDeliveries,createDeliveryOrder}.ts`: teslimat ritmi, `ship_on - lead_time`, ön ödemeli 0 tutarlı siparişler; `src/services/bundles/*` Build-a-Box seçim penceresi ve ikame.
  10. `-` `src/api/shop/*.ts`: duraklat, devam, atla, sıklık, swap, adres, yöntem, vazgeç (neden + elde tutma teklifi); sahiplik denetimi (başkasının aboneliği 404); otomatik yenileme onay metni sürümü anlık görüntü.
  11. `-` `src/api/admin/*.ts` + `src/admin/`: abonelikler, planlar, yenileme kuyruğu (onay/ret/zorla çalıştır), dunning kuyruğu, vazgeçme nedenleri, etkinlik günlüğü, analitik, ayarlar; `@openmers/ui` DataTable (imleçli). Ajan araçları belgedeki risklerle.
  12. `-` `src/jobs/dailyStats.ts` + `src/services/stats/{mrr,churn,ltv}.ts` (saf) + `currency_rates` / `RateProvider` stratejisi; `src/cli/importStripe.ts` (dry-run önce, `subscription_imports` idempotent).
- **Testler:**
  - `integration-tests/race/__tests__/subscription-cycle-twice.test.ts`: aynı cycle (veya aynı `order.paid`) iki kez → tek sipariş, `self`'te tek tahsilat.
  - `integration-tests/core/__tests__/subscription-crash-recovery.test.ts`: `charging` sonrası süreç ölümü → kurtarma siparişi tamamlar, ikinci çekim yok; zaman aşımında `fetchChargeByKey`.
  - `integration-tests/core/__tests__/subscription-dunning.test.ts`: `hard` tek deneme, `soft` takvimde, `needs_auth` bağlantı; iki açık dunning kaydı açılamaz; indirim en çok bir kez.
  - `integration-tests/core/__tests__/subscription-delivery-cadence.test.ts`: aylık ücret + haftalık teslimat → bir ücret, dört sipariş, gelir bir kez; ay sonu/yaz saati.
  - Birim: `computeRenewalAmount.test.ts`, `nextAttemptAt.test.ts`, `mrr.test.ts` (karışık aralıklarda elle hesapla eşleşir), kur yoksa dönüştürülmüş sütun boş.
  - Sıra dışı webhook (`updated` önce `created`'dan) durumu bozmaz; stok yok + tahsilat var → iade işi tamamlanır; kapalıyken 404 ve cron çalışmaz; Stripe içe aktarma iki kez → çift abonelik yok.
  - Polar sandbox kabul testi (haftalık, CI dışı elle tetik): belgedeki (a)–(f).
- **Bitti sayılır:**
  - Sıralama 1-3 (çekirdek yetenekler, sahte işleyici, plan + abonelik + `provider` kipi yansıtma + müşteri duraklat/atla/vazgeç) D1 ve SQLite'ta yeşil.
  - Çift işlem ve süreç ölümü yarış testleri tek tahsilat/tek sipariş veriyor.
  - Belgedeki 13 test maddesinin her biri bir otomatik teste (ya da Polar kabul betiğine) bağlı.
- **Açık sorular / riskler:**
  - Polar MoR ile Türk satıcının KDV/e-fatura sonucu (açık soru 1), Polar keyfi tutar ve fiyat değişimi (2), `self` kipi erişimi (3), otomatik yenileme mevzuatı (4), sağlayıcılar arası kart taşıma (5); ATLANANLAR 11, 12, 17, 18, 69.
  - Belge içinde çelişki: bölüm 14 "iyzico şimdilik düşünülmüyor", bölüm 12 "iyzico sandbox Türkiye varsayılanı, karar verildi"; ATLANANLAR satır 29 ikincisini doğruluyor. Belge düzeltilmeli.
  - Belgedeki tablo adları (`subscription_plans`, `dunning_cases` …) `bia_` önekli değil; built-in app kuralına (45) göre `bia_subscriptions_*` olmalı, `customer_payment_methods` ise çekirdekte.
  - Kapsam çok büyük (16 tablo); tek kilometre taşı değil, belgenin 7 adımlı sıralamasına göre bölünmeli.

---

## Sağlayıcılar (ödeme, kargo, e-posta, SMS, arama)

Durum: `packages/modules/` altında 11 paket yalnız iskelet (`package.json`, `tsconfig.json`, `src/index.ts` = `export {}`); `payment-polar` paketi yok. Her sağlayıcı backend kuralına göre `port.ts` (çekirdek portu uygular), `client.ts` (HTTP, yalnız `fetch`), `mapping.ts` (saf), `webhook.ts` (gerekiyorsa), `settings.ts` (Zod), `index.ts` (`defineBuiltInApp`) dosyalarına bölünür; sırlar `ctx.secrets.get`, `process.env` yok; Workers ve Node iki hedefte. Her biri 43'teki ilgili sözleşme paketini geçmeden yayınlanmaz. Gerçek sağlayıcı API'leri bu belgelerde doğrulanmadı; her paket önce sandbox/test hesabıyla kabul testi ister.

| Paket | Port | Pazar | Durum | Bağımlılık |
|---|---|---|---|---|
| `payment-stripe` | `PaymentHandler` | Global varsayılan | ± iskelet | 22, 45 |
| `payment-polar` (yok) | `PaymentHandler` (`billing: provider`, MoR) | Global, isteğe bağlı; abonelik ilk işleyicisi | - paket açılacak | 22, 54 |
| `payment-iyzico` | `PaymentHandler` | Türkiye (abonelik için TR varsayılanı) | ± iskelet | 22, 45 |
| `payment-paytr` | `PaymentHandler` | Türkiye | ± iskelet | 22, 45 |
| `shipping-yurtici`, `shipping-aras`, `shipping-mng` | `FulfillmentHandler` (+ isteğe bağlı `ShippingCalculator`) | Türkiye | ± iskelet | 20, 45 |
| `email-resend` | `EmailProvider` | Global varsayılan (SMTP Workers'ta yok) | ± iskelet | 28, 45 |
| `sms-netgsm` | `SmsProvider` | Türkiye | ± iskelet | 28, 45 |
| `search-meilisearch` | `SearchProvider` | Global, büyük katalog için isteğe bağlı (varsayılan FTS5) | ± iskelet | 15, 45 |

- **Kaynak kararlar:**
  - `PaymentHandler`: `createCheckout`, `verifyWebhook` (imza burada; normalize sonuç), `fetchStatus?`, `capture?`, `refund?` (05-ticaret/06); abonelik eklentileri 54'te. Barındırılan ödeme sayfası rezervasyonu yalnız doğrulanmış webhook'la bırakır.
  - `FulfillmentHandler`: gönderi + etiket; çekirdek varsayılanı `manual` (49). Canlı kargo fiyatı asenkron operasyon, zaman aşımı + yedek zorunlu (43).
  - Portlar (`EmailProvider`, `SmsProvider`, `SearchProvider`) yalnız işlerde çağrılır, istek yolunda değil.
  - `SearchProvider` aynı `reindex` olaylarını tüketir; varsayılan arama çekirdekte `catalog_index` + FTS5.
  - Global varsayılan: Stripe, Resend, Meilisearch (isteğe bağlı); Türkiye modülleri çekirdeğe sızmaz.
- **Bağımlılık:** 43 (port/operasyon arayüzleri ve sözleşme paketleri), 45 (`defineBuiltInApp`), 11 (`secrets`), 20/22/28/15 (ilgili çekirdek özellikler).
- **Yapılacaklar:**
  1. `-` `integration-tests/contract/__tests__/ports/{payment-handler,fulfillment-handler,email-provider,sms-provider,search-provider}.contract.ts`: her sağlayıcının geçeceği ortak paketler (webhook normalize, idempotency, zaman aşımı, sırların yükte olmaması).
  2. `-` `packages/test-utils/src/fakes/`: her port için sahte uygulama (çekirdek testleri gerçek sağlayıcıya bağlı kalmasın).
  3. `±` `packages/modules/payment-stripe/src/`: `port.ts`, `client.ts`, `webhook.ts` (imza), `mapping.ts` (durum → normalize), `settings.ts`; global ilk gerçek ödeme sağlayıcısı.
  4. `±` `packages/modules/email-resend/src/`: `port.ts` + `client.ts` (HTTP API); bildirim işinden çağrılır.
  5. `±` `packages/modules/search-meilisearch/src/`: `port.ts`, `subscribers/onReindex.ts` (indeks belgesi yazma), `query.ts`; `catalogIndex` okuma modelinden beslenir.
  6. `-` `packages/modules/payment-polar/` aç: `provider` kipi, Standard Webhooks imzası, `syncPlan`, `createSubscriptionCheckout`, `manageSubscription`, `portalUrl`; sandbox kabul betiği (54'e bağlı).
  7. `±` `packages/modules/payment-iyzico/src/`: genel ödeme + webhook; abonelik/kayıtlı kart yetenekleri sandbox'ta doğrulanana kadar `capabilities.billing` bildirilmez.
  8. `±` `packages/modules/payment-paytr/src/`: genel ödeme + bildirim doğrulaması.
  9. `±` `packages/modules/shipping-{yurtici,aras,mng}/src/`: gönderi oluşturma, etiket (medya `private` ad alanına), takip; ortak eşleme kalıbı her pakette ayrı (`mapping.ts`), paketler birbirini import etmez.
  10. `±` `packages/modules/sms-netgsm/src/`: `port.ts` + `client.ts`; pazarlama SMS'i 51'deki kapıdan geçer.
  11. `-` Kurulum sihirbazı/`store.config.ts` hazır ayarları: `global` (stripe, resend) ve `tr` (iyzico, paytr, aras/mng/yurtici, netgsm, parasut, iys) listeleri (56'ya girdi).
- **Testler:** her paket kendi `test/` altında sözleşme paketini sahte HTTP sunucusuna (yerel Hono) karşı koşar; webhook imzası için yanlış imza/eski zaman damgası/tekrar teslimat; Stripe/Polar/iyzico sandbox kabul testleri elle tetiklenen CI işinde (aşama 0'daki `e2e-*` gibi), PR kapısı değil.
- **Bitti sayılır:**
  - Global yol: Stripe + Resend ile sahte olmayan bir sandbox siparişi ödeme webhook'u ve e-posta bildirimiyle tamamlanıyor.
  - Türkiye yolu: iyzico sandbox ödeme + bir kargo sağlayıcısında etiket oluşturma kabul testi geçiyor.
  - 11 (+Polar) paketin her biri ilgili sözleşme paketini geçiyor; hiçbiri `process.env` okumuyor (lint/grep kapısı).
- **Açık sorular / riskler:**
  - iyzico/PayTR/Stripe off-session tahsilat ve 3DS kuralları doğrulanmadı (ATLANANLAR 11); Stripe ekstre adı son eki, iyzico/PayTR ekstre adı bilinmiyor (06-odeme bölüm 76).
  - Yurtiçi/Aras/MNG API'leri hiçbir belgede okunmamış; kargo canlı fiyatı mı yalnız etiket mi sunulacağı belirsiz.
  - Netgsm ve Meilisearch API'leri okunmadı; Meilisearch'ün Cloudflare hedefinde (dış servis) gecikme etkisi ölçülmedi.
  - Polar paketi ve "basit PDF fatura" global sağlayıcısı monorepo belgesinde yok; eklenirse 13 (monorepo) güncellenmeli.

---

## 54b. `docs/07-istemciler/08-ajan-ticareti.md` — ajan ticareti (`llms.txt`, ajan ödemesi, MCP)

- **Bağımlılık:** ödeme/checkout (aşama 2), herkese açık OpenAPI, idempotency (aşama 1 madde 10), güvenlik başlıkları (8b).
- **Alt görevler:** belgenin bölüm 6 listesi (ayar anahtarları, `llmsTxt.ts`, `agentCheckout` sözleşmesi ve uçları, `source` kararı, `packages/mcp-shop`, e2e, prompt injection fikstürü).
- **Açık sorular:** belgenin "Açık sorular" bölümü. Varsayılan kapalı; admin MCP kapsam dışı.

---

## Bu gruptan ilk başlanacak 3 alt görev

1. **43.4-43.5** `packages/core/src/extend/registry/buildRegistry.ts` + `resolveOperation.ts` (saf, birim testli): aşama 1 bitmeden yazılabilir, her şey bunun üstüne kurulur.
2. **45.1-45.4** `packages/core/src/extend/builtInApp/{types,defineBuiltInApp,validateApps,composeApps}.ts`: saf doğrulama ve birleştirme; `bia_` öneki, `requires`, `compatibility` testleriyle. Önce 45'teki id → tablo öneki kuralı (açık soru) karara bağlanmalı.
3. **Sağlayıcılar 1-2** port sözleşme paketleri (`integration-tests/contract/__tests__/ports/*`) ve `packages/test-utils/src/fakes/*`: 50, 51, 54 ve tüm sağlayıcı paketleri sahte uygulamayla uçtan uca test edilebilsin diye gerçek API'lerden önce.
