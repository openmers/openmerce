# Built-in app geliştirme rehberi (ve çekirdek katkısı)

Bu rehber, **süreç içi çalışan built-in app** yazan ve çekirdeğe katkı veren geliştirici içindir. Dışarıda çalışan uygulama yazıyorsanız: [05-tak-calistir-app-gelistirme.md](05-tak-calistir-app-gelistirme.md). Hangisini yazacağınıza karar vermek için: [02-built-in-apps.md](02-built-in-apps.md) bölüm 3.1.

Kaynak: Vendure "Developer Guide" belgelerinin 38 sayfası okundu (yalnızca bu sayfalar; `reference/` sayfalarına bakılmadı). Vendure'un NestJS + TypeORM + GraphQL modeli bizde yoktur; aşağıda her konu için **Vendure'un yaptığı → bizim karşılığımız** yazılıdır. ⚙️ işaretli ad ve biçimler önerilmiştir, henüz başka bir belgede kesinleşmemiştir.

## 0. Vendure → OpenMers eşlemesi

| Vendure sayfası | Bizde | Durum |
|---|---|---|
| Overview | Server + worker + dashboard + storefront → API (Hono/oRPC) + worker girişi + admin (React SPA) + vitrin (Astro); strateji deseni ve eklenti birimi aynı fikir | Var ([01-genel-bakis.md](../02-genel-mimari/01-genel-bakis.md)) |
| The API Layer | Express/Nest ara katman, guard, interceptor, `@Ctx`, `@Allow`, `@Transaction` → Hono ara katmanı, oRPC prosedürü, `ctx`, izin bildirimi, `atomic()` | Var ([02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md)); bölüm 3 |
| The Service Layer | Servis + `TransactionalConnection` → çekirdek fonksiyonları, `db` ve `ctx` parametre | Bölüm 4 |
| CLI | `vendure add/migrate/schema/doctor/dev` | ⚙️ `openmers` CLI, bölüm 9 |
| AI-assisted Development | Proje `AGENTS.md`'si, etkileşimsiz iskele | Bölüm 10 |
| Configuration | Tek `VendureConfig` | Var: `store.config.ts` + ayar deposu ([07-yapilandirma.md](../03-cekirdek/07-yapilandirma.md)) |
| Custom Fields / Has Custom Fields | Özel alan | Var ([04-ozel-alanlar-ve-metadata.md](04-ozel-alanlar-ve-metadata.md)); bölüm 5 |
| Secret Fields | `secret: true` + şifreleme anahtarı + `ReadSecret` | Bölüm 7 (farklı: kasa) |
| Error Handling | `ErrorResult` birleşimleri | Bölüm 6 |
| Events / DB Subscribers | `EventBus`; TypeORM abonesi | Olay = outbox satırı ([04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md)); DB abonesi **yok** |
| Migrations / Updating | `vendure migrate`, `synchronize: false` | Var ([03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md) bölüm 8, [06-surum-yukseltme.md](../08-isletme/06-surum-yukseltme.md)) |
| Plugins | `@VendurePlugin` | `defineBuiltInApp` ([02-built-in-apps.md](02-built-in-apps.md)) |
| Security | Varsayılan kimlik bilgisi, CORS, CSRF, HardenPlugin | Bölüm 11 |
| API Keys | `api-key` token yöntemi, bcrypt, `lookupId:secret` | Var (`oma_`, [02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md) bölüm 4) |
| Strategies & Configurable Operations | Strateji ve operasyon | Var ([01-stratejiler-ve-operasyonlar.md](01-stratejiler-ve-operasyonlar.md)) |
| Custom Strategies in Plugins | Eklenti kendi stratejisini açar | Bölüm 8 |
| Testing | `@vendure/testing`, vitest, sqljs/postgres | Bölüm 12 |
| Worker & Job Queue | Worker + kuyruk + `ctx.serialize` | Var; bölüm 13 |
| Scheduled Tasks | `DefaultSchedulerPlugin` + kilit | Var (Cron/zamanlayıcı + idempotent iş); bölüm 13 |
| Settings Store | `settingsStoreFields`, kapsam, izin | Var (ayar deposu); bölüm 14 |
| REST Endpoint / Extend GraphQL API | Eklenti uçları, çekirdek ucu ezme | `shopApi`/`adminApi` ad alanı `/x/<id>/`; **ezme yok** (02-built-in-apps kuralı) |
| Custom Permissions | `PermissionDefinition`, `CrudPermissionDefinition` | `<varlık>:<eylem>` ([06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)); bölüm 14 |
| Database Entity | `VendureEntity`, `@EntityId` | Drizzle tablosu; bölüm 5 |
| Channel Aware | `ChannelAware` | Var ([03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md) bölüm 4) |
| Translatable / Translations | `Translatable`, `LocaleString` | Var (veri kuralları bölüm 5); bölüm 15 |
| Cache | `CacheService`, etiket geçersiz kılma | Var ([05-onbellek.md](../03-cekirdek/05-onbellek.md)) |
| Dataloaders | N+1 için `DataLoader` | **Gerekmez** (GraphQL alan çözücü yok); toplu okuma kuralı bölüm 4 |
| Importing Data | CSV + `populate` | Var ([08-veri-tasima.md](../08-isletme/08-veri-tasima.md), [07-kurulum-ve-tohum-veri.md](../08-isletme/07-kurulum-ve-tohum-veri.md)) |
| Logging | `Logger`, düzeyler | Bölüm 16 |
| Stand-alone Scripts | `bootstrapWorker` + servis | ⚙️ bölüm 17 |
| Uploading Files | GraphQL multipart | Var (medya: [12-medya.md](../05-ticaret/12-medya.md)); built-in app yükleme ucu bölüm 15 |
| Nest DevTools | NestJS grafiği (ücretli servis) | **Yok** (NestJS yok) |
| Telemetry | Anonim kullanım verisi, kapatılabilir | **Yok; sunucudan veri gitmez** (bölüm 18) |

## 1. İskele

⚙️ `openmers add built-in-app <id>` iskele üretir (bölüm 9):

```
packages/modules/acme-loyalty/
  package.json              # @openmers/builtin-acme-loyalty
  src/
    index.ts                # defineBuiltInApp({...})
    schema.ts               # Drizzle tabloları (bia_acme_loyalty_*)
    migrations/0001_*.sql   # eklemeli, numaralı
    services/               # saf mantık: (db, ctx, girdi) → sonuç
    api/                    # shop.ts · admin.ts (oRPC yönlendiricileri)
    subscribers/ · jobs/
    admin/                  # defineAdminExtension ([../07-istemciler/06-admin-genisletme.md])
    i18n/                   # {locale}.json (sunucu iletileri), admin/i18n (Lingui)
  test/
```

`defineBuiltInApp` alanlarının tam listesi [02-built-in-apps.md](02-built-in-apps.md) bölüm 1'dedir; bu rehber onlara **nasıl** yazılacağını ekler.

## 2. Altın kurallar

1. Çekirdek tablolarına **yazma**; çekirdek fonksiyonunu çağır (`bia_` önekli tablolara yaz, çekirdeğe okuma/join serbest).
2. Her yazma `atomic()` içindedir; yan etki (e-posta, webhook, dış çağrı) **outbox satırı** olarak aynı `atomic()` içinde yazılır, yan etki doğrudan yapılmaz.
3. Aboneler idempotenttir (en az bir kez teslim); aynı olay iki kez gelse tek etki.
4. Hiçbir yerde `process.env` / Node'a özel API okunmaz; yapılandırma `settings` ve `ctx.secrets` ile gelir. Yalnızca Node'da çalışan kod `targets: ['node']` bildirir.
5. İki hedefte (D1 ve SQLite) aynı testten geçer.
6. Vitrin okuma yoluna ara katman takılmaz; veri `indexExtend` ile okuma modeline girer.
7. `ctx` işe **ham** konmaz: iş verisine yalnızca yeniden kurmaya yetecek alanlar (`channelId`, `locale`, `actor`, kimlikler) yazılır, çünkü ctx istek nesnesi ve oturum taşır. (Vendure aynı sebeple `ctx.serialize()` ister ve serileştirilmiş ctx'in büyüklüğünün Redis'i doldurabileceğini yazıyor.)

## 3. API (oRPC)

- Uç, `/x/<id>/` ad alanındaki oRPC prosedürüdür; Zod girdi/çıktı şeması `contract` benzeri paketten gelir. Her prosedür `permission: '<varlık>:<eylem>'` **bildirir**; bildirimsiz prosedür derleme hatasıdır (Vendure'da `@Allow` unutulunca ne olduğu belgede yok; bizde sessiz açık bırakma yok).
- Handler ince kalır: doğrula → servis çağır → şekillendir. İş mantığı `services/`ta.
- Yazma prosedürü `atomic()` içinde çalıştırılır; `ctx` ilk argümandır.
- Çekirdek ucu **ezilmez**. Vendure bir sorguyu aynı adla geçersiz kılmaya izin verir; bizde davranış değişikliği yalnızca strateji, operasyon ve süreç bekçisiyle olur ([01-stratejiler-ve-operasyonlar.md](01-stratejiler-ve-operasyonlar.md)).
- Ara katman (Hono): yalnızca `/x/<id>/` altına eklenir; genel (global) ara katman built-in app'e açık değildir.

## 4. Servis katmanı ve veri erişimi

- Servis = `(db, ctx, girdi) → sonuç` işlevi; sınıf/DI yok. `db` her zaman parametredir (testte sahte, işlemde `atomic()`'in `tx`'i).
- `ctx` her sorguda kanal ve dil kapsamını taşır; kanal süzgeci **elle yazılmaz**, `inChannel(ctx)` yardımcısından gelir (Vendure'daki `findOneInChannel`).
- Toplu okuma: bir listenin her satırı için ayrı sorgu atmayın; `WHERE id IN (...)` ile tek tur (Vendure'un dataloader çözdüğü N+1 bizde bu kural; oRPC'de alan çözücü olmadığı için ayrı bir kütüphane gerekmiyor). Tur bütçesi testi aşımı yakalar ([03-test.md](../08-isletme/03-test.md)).
- İlişkiler varsayılan **yüklenmez**; Drizzle'da join açıkça yazılır.

## 5. Tablo, özel alan, çeviri, kanal

- Tablo: `bia_<id>_<ad>`, kimlik `public_id` öneki (`loy_`), para tam sayı + para birimi, `created_at/updated_at`, kanal farkındalıklı ise `channel_id` ve indeks ([03-veri-kurallari.md](../03-cekirdek/03-veri-kurallari.md)). Migration eklemelidir, kaldırma yoktur (`purge` ayrı).
- Çekirdek varlığa alan eklemek: `customFields`; **tablo sütunu eklenmez** ([04-ozel-alanlar-ve-metadata.md](04-ozel-alanlar-ve-metadata.md)). Kendi tablonuza özel alan desteği isteniyorsa ⚙️ tabloya `custom` JSON sütunu ve `hasCustomFields: true` bildirimi (Vendure `HasCustomFields`, v2.2+). Şema ve girdi tipi sözleşmeden genişler.
- Çeviri: çevrilebilir alanlar `<tablo>_translations(owner_id, locale, ...)` tablosunda; çekirdeğin `translate()` yardımcısı geçerli dile çözer. Vendure çeviri varlığını yalnızca `translations` ilişkisinin hedefi olduğu için tanıyor, ad kuralına güvenmiyor; bizde de çeviri tablosu açıkça `translations: { table, fields }` ile bildirilir.
- Kanal: kanal farkındalıklı kayıt `channel_id` taşır; "tüm kanallar" ayrıca bildirilir.
- Tip uyarısı (Vendure): hedef ES2022+ iken `useDefineForClassFields` sorunu bizde yok (sınıf varlık yok); Drizzle şema tanımı düz nesnedir.

## 6. Hatalar

- **Beklenen hata** (iş kuralı: kupon süresi dolmuş, stok yok) **değer** olarak döner: `{ ok: false, code, message, details }`; oRPC çıktı şeması bunu ayırt edilebilir birleşim olarak tanımlar. İstemci `code` üzerinde `switch` yapar, kapsamlılık (never) denetimi derleme zamanında.
- **Beklenmeyen hata** (DB, kod hatası) fırlatılır; HTTP 5xx, ayrıntı sızdırmaz, istek kimliği döner. Vendure bunu HTTP 200 + `errors` dizisiyle döner; bizde durum kodu gerçektir.
- Genel bir hata filtresi built-in app'e açık değildir (Vendure'da `APP_FILTER` yerleşik filtreyi ezer ve bunun yerine `ErrorHandlerStrategy` öneriliyor); hata izleme için `errorReporter` stratejisi ([04-gozlemlenebilirlik.md](../08-isletme/04-gozlemlenebilirlik.md)).
- Hata kodları `<app>.<kod>` biçimindedir (çakışmasın), mesaj anahtarı i18n kataloğundan çözülür.

## 7. Sırlar

- Vendure: `secret: true` alan, `encryptionStrategy` ile şifreli saklanır, okuma `ReadSecret` izni ister, yer tutucu geri gelince değer değişmez, anahtar yoksa süreç başlamaz, **anahtar döndürme yok**.
- Bizde: sır **ayar deposuna yazılmaz**; kasadan okunur (`ctx.secrets.get`), admin'de yazma-yalnızca alandır ve yer tutucu gösterilir; yer tutucu geri gelirse değer değişmez, boş gelirse silinir. Okuma izni `secrets:read` (varsayılan yalnız sahip).
- Sırlar olaylara, işlere ve günlüklere **girmez** (Vendure: çözülmüş değer olaylarda ve işlerde görünür, günlüğe koymayın uyarısı var; bizde olay ve iş yükü şemasında sır alanı yasaktır, sözleşme testi bunu kontrol eder).
- ⚙️ Anahtar döndürme (Vendure'da desteklenmiyor): iki anahtarlı okuma (eski+yeni), yeniden şifreleme işi, tamamlanınca eski anahtarı bırakma. Tasarlandı, **ayrıntısı yok** (ATLANANLAR).
- Prod verisini geliştirme makinesine kopyalarken sır sütunları boşaltılır (Vendure aynı uyarıyı veriyor): `openmers db export --scrub-secrets`.

## 8. Eklentinin kendi stratejisi (genişletme noktası açma)

Built-in app'iniz başkalarının değiştirebileceği bir davranış sunacaksa (Vendure: `custom-strategies-in-plugins`):

1. Arayüz tanımlayın (`LoyaltyPointsStrategy`) ve varsayılan uygulamayı yazın.
2. `defineBuiltInApp({ strategyPoints: { loyaltyPoints: defaultImpl } })` ile bildirin; yapılandırmada `store.config.ts` değiştirir.
3. Strateji `init(injector)` ve `destroy()` alabilir; `init` açılışta bir kez çalışır, bağımlılıklar `injector`'dan gelir.
4. Seçenekleri **statik değiştirilebilir alanda** tutmayın (Vendure örneği `static options` global durum kullanıyor); seçenekler uygulama örneğine kurulumda verilir ve `ctx.app.options` ile okunur.
5. Her yeni strateji için **sözleşme testi** yazın ([03-test.md](../08-isletme/03-test.md)); yayın bunu geçmeden olmaz.

## 9. CLI ⚙️

Vendure CLI'sinden (`add`, `migrate`, `schema`, `doctor`, `dev`, `auth`) uyarlandı; **bizde hepsi önerilmiştir**:

| Komut | İş |
|---|---|
| `openmers dev` | API + worker + admin + vitrin yerelde, değişince yeniden yükler |
| `openmers add built-in-app\|entity\|service\|job\|api\|admin <ad>` | İskele; **etkileşimsiz bayraklarla** çalışır (ajan ve CI için) |
| `openmers migrate generate <ad>` · `migrate run` · `migrate revert` | Drizzle migration; ters çevirme yalnızca son migration'ı, ve eklemeli kuralı bozuyorsa reddeder |
| `openmers schema --api admin\|shop` | Sözleşme şemasını (OpenAPI/JSON Schema) yazar (ajan ve IDE için) |
| `openmers doctor [--profile production]` | Yapılandırma, bağımlılık, şema, veritabanı kontrolleri; üretim profilinde güvenlik kontrolleri (bölüm 11); `--format json` |
| `openmers app validate` | Tak-çalıştır manifest doğrulama ([05-tak-calistir-app-gelistirme.md](05-tak-calistir-app-gelistirme.md)) |
| `openmers audit verify` | Denetim hash zinciri ([06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)) |

Vendure CLI'sinde sayfalar birbiriyle çelişiyor (bir sayfada `migrate` konumsal eklenti argümanı alıyor, seçenek tablosunda yok); bizde komut tablosu tek kaynaktır, bu rehber örnekleri ondan üretilir.

## 10. Ajanla geliştirme

Vendure yeni projeye `AGENTS.md` koyuyor. Bizde:

- İskele her projeye `AGENTS.md` yazar: bölüm 2'deki altın kurallar, `openmers` komutları, "etkileşimsiz iskele kullan", "ctx'i işe ham koyma", "`process.env` okuma", "çekirdek tabloya yazma".
- Ajanın önce `openmers schema` ve `openmers doctor` çalıştırması istenir; tip kontrolü ve `pnpm verify` yeşil olmadan bitmiş sayılmaz.
- Bu repodaki `AGENTS.md` (graphify kuralları) ayrıdır ve bu tasarımın parçası değildir.

## 11. Güvenlik kontrol listesi (Vendure'un uyardıkları → bizde)

| Vendure'da uyarı/varsayılan | Bizde |
|---|---|
| Varsayılan süper yönetici `superadmin:superadmin` | Kurulum sihirbazı ilk hesabı **kullanıcıya açtırır**; sabit varsayılan kimlik bilgisi yok ([08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md) bölüm 4) |
| CORS varsayılanı `origin: true, credentials: true` | Açık köken listesi; `*` + kimlik bilgisi birlikte derleme/başlatma hatası (⚠️ mevcut belgede CORS ayrıntısı yok, yazılmalı: ATLANANLAR) |
| CSRF önleme varsayılan kapalı | Durum değiştiren isteklerde `Origin` kontrolü + `SameSite=Lax` zaten zorunlu ([08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md) bölüm 7) |
| `HardenPlugin` (sorgu karmaşıklığı, introspection kapatma) | GraphQL yok; oRPC'de girdi şeması sınırları, sayfa boyutu üst sınırı ve hız sınırı; şema yayını yalnızca yetkili |
| `AssetServerPlugin` dönüşüm ön ayarları | Medya dönüşümü yalnızca ön ayar adıyla ([12-medya.md](../05-ticaret/12-medya.md)) (⚠️ bu belgede ön ayar kuralı yoksa eklenmeli) |
| bcrypt 12 tur | Parola özeti: scrypt (Workers CPU maliyeti ölçülecek) |
| Deneme başarısızlığı olayı (`AttemptedLoginEvent`) | Giriş denemesi denetim kaydında + hız sınırı + Turnstile |
| Admin API'yi herkese açma | Admin ayrı alt alan, isteğe bağlı Cloudflare Access ([08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md) bölüm 4) |
| Topluluk eklentilerini gözden geçir | Built-in app **bizim** kodumuzdur ve derlemeye girer; üçüncü taraf kod yalnızca tak-çalıştır app olarak, yalıtılmış çalışır |

`openmers doctor --profile production` bu tablonun makinece kontrol edilebilen satırlarını denetler.

## 12. Test

- **Birim:** servis işlevleri (`db` parametre); Vitest.
- **Entegrasyon:** aynı test **hem D1 (Miniflare) hem SQLite** üzerinde ([03-test.md](../08-isletme/03-test.md)). Vendure `sqljs` önbelleğiyle ilk doldurmayı atlıyor; bizde ⚙️ tohumlanmış bir SQLite dosyası anlık görüntü olarak kopyalanır.
- ⚙️ `@openmers/testing`: `createTestStore({ builtInApps: [...], seed })` → `{ api, admin, shop, db, runJobs() }`; testte worker elle ilerletilir (`runJobs()`), zamanlayıcı sahte saatle.
- **Paralellik:** Vendure paralel suit'lerde port çakışması yaşıyor (3050); bizde `createTestStore` bellekte çalışır, port açmaz (süreç içi çağrı).
- **Sözleşme testleri:** strateji/operasyon/port için ortak; built-in app bunları geçmeden yayınlanmaz.
- **Yarış testleri:** eşzamanlı iki yazma, aynı olayın iki kez gelmesi, tek kazanan.
- Gerekli her test: `compatibility` aralığı dışındaki çekirdekte açılışın **reddedildiği**.

## 13. İşler ve zamanlanmış görevler

- İş = outbox türünde `job` satırı: ad, JSON-serileştirilebilir yük, deneme sayısı, `idempotency_key`. Yük sır ve ham `ctx` içermez (bölüm 2).
- İş işleyicisi idempotenttir; iptal **işbirlikçidir** (uzun işte `job.cancelled` kontrol edilir, Vendure aynı).
- Zamanlanmış görev: `scheduled: [{ name, cron, job }]`. Cloudflare'de Cron Trigger, self-host'ta süreç içi zamanlayıcı; **tek çalışma** garantisi için görev satırında kilit (`locked_until`), çünkü Cloudflare cron'u ve çok kopyalı kurulum aynı görevi iki kez tetikleyebilir. Vendure'un yaptığı da bu (kilit tablosu); Nest `@Cron()`'unun her kopyada çalışması uyarısı bizde: görev kodu doğrudan `setInterval` kullanmaz.
- Süre: iş Workers CPU/duvar sınırına sığmalı; uzun iş parçalanır (imleç + yeniden kuyruğa alma).
- Oturum/kayıt temizliği gibi bakım görevleri çekirdeğin zamanlanmış görevleridir (kullanıcı kapatamaz).

## 14. Ayarlar ve izinler

- **Ayarlar:** `settings` Zod şeması; kapsam: `global · channel · user · userAndChannel` (Vendure `SettingsStoreScopes`'ın aynısı; kullanım ihtiyacı varsa). Anahtar `<app-id>.<ad>`. Her alana `readPermission` / `writePermission` (Vendure: `requiresPermission` `{ read, write }`) ve doğrulama işlevi (`validate(value, ctx)` hata iletisi döner). Değerler JSON'dur, **büyük veri için tablo kullanın** (Vendure aynı uyarıyı yapıyor). Kaldırılan alanın yetim kayıtları otomatik temizlenmez, `openmers settings prune` ile; veri kaybı sürprizi olmasın diye (eklemeli kuralı).
- **İzinler:** `permissions: ['loyalty:read','loyalty:write']`; CRUD kısayolu `crudPermissions('loyalty_rule')` → `loyalty_rule:create/read/update/delete`. Özel alan izni: alan `requiresPermission` ile gizlenir; Shop API'de yetkisizlere `null` döner, `public: true` Shop API'de bu denetimi atlar ama admin'de geçerlidir (Vendure davranışı; **bizim karar:** `public` alan yetkisiz müşteri için de dönebilir, ama `requiresPermission` varsa `public` yok sayılır ve derleme uyarısı verir — bunu kasıtlı farklı yaptık, ATLANANLAR).
- İzinler admin'de rol düzenleyicide başlatmada görünür.

## 15. Dosya yükleme ve çeviri iletileri

- Yükleme: built-in app yükleme ucu **çekirdeğin medya servisini çağırır** (`media.create(ctx, { file, tags, namespace })`); kendi depolama kodu yazmaz. Özel (private) ve genel kova ayrımı çekirdekte ([12-medya.md](../05-ticaret/12-medya.md)). İstek gövdesi oRPC'de çok parçalı değil: önce imzalı yükleme URL'si, sonra dosya doğrudan depoya, sonra kayıt ucu (Workers gövde sınırı nedeniyle; ⚠️ sınır değeri doğrulanmadı).
- Sunucu iletileri: `i18n/{locale}.json`, anahtar `<app>.<kod>`; dil çözümü: `Accept-Language` → kanal varsayılanı → `en`. Eksik anahtar sessiz kalmaz: test ortamında eksik anahtar hata, üretimde ikinci dile düşüp günlüğe uyarı. (Vendure'da hatalı yazılmış anahtar sessiz başarısız oluyor; `getTranslationKeys()` yardımcı oluyor. Bizde `openmers i18n check` eksik/fazla anahtarı bulur.)
- Operasyon etiketleri (`description`, `args.<ad>.label`) katalog anahtarıyla gelir; katalog satır içi metni ezer (Vendure'la aynı).

## 16. Günlük

- `ctx.log.debug/info/warn/error(msg, bağlam)`; düzeyler Vendure'unkiyle aynı sıra (debug < verbose < info < warn < error), üretimde varsayılan `info`.
- Günlük satırı **yapılandırılmış JSON**: `app`, `requestId`, `channelId`, `actor`; sır ve kişisel veri (e-posta, telefon, TCKN, adres) **yazılmaz**, maskeleme yardımcısı vardır.
- SQL sorgu günlüğü yalnızca yerel/test (`debug`); üretimde yok. `debug` çok gürültülüdür, üretimde kapalı kalır (Vendure da uyarıyor).
- Ayrıntı: [04-gozlemlenebilirlik.md](../08-isletme/04-gozlemlenebilirlik.md).

## 17. Bağımsız betikler ⚙️

Toplu iş, veri düzeltme, tek seferlik içe aktarma için `openmers script <dosya>` (Vendure `bootstrapWorker` + `app.get(Service)` karşılığı):

- Betik, API katmanı çalıştırmadan **Platform'u kurar** ve `{ db, ctx, services }` alır.
- `ctx` varsayılan olarak **yetkisiz anonim**tir (Vendure'da da öyle ve superadmin'e bürünmek ek iş istiyor). Bizde `--as <admin-kimliği>` ile açıkça seçilir ve **denetim kaydına** "betik" aktörüyle yazılır; "kimliksiz tam yetki" yoktur.
- Betikler **dry-run varsayılan**, `--apply` ile yazar; her çalıştırma denetlenir.
- Toplu içe aktarma servisleri (Vendure `FastImporterService` kontrolleri atlıyor ve olay yayınlamıyor) bizde `bulk` kipi: doğrulama atlanmaz; olay yerine tek `bulk.imported` olayı ve ardından yeniden indeksleme.

## 18. Telemetri

**Varsayılan olarak hiçbir kullanım verisi dışarı gönderilmez.** Vendure v3.6'dan itibaren varsayılan açık anonim telemetri gönderiyor (kurulum kimliği, sürümler, çalışma ortamı, eklenti adları, kayıt sayısı aralıkları) ve `VENDURE_DISABLE_TELEMETRY` ile kapatılıyor; CI'da otomatik kapanıyor. OpenMers açık kaynak ve self-host: KVKK/gizlilik, "veri bizde kalır" vaadi ve ağ çıkış denetimi nedeniyle **telemetri yoktur, kapalıdır** (karar verildi). İsteğe bağlı açma seçeneği de v1'de eklenmez; ileride istenirse ayrı karar gerekir.

## 19. Yayın ve uyumluluk

- `compatibility: '^1.0.0'` aralığı çekirdek sürümünü karşılamazsa açılış başarısız ([02-built-in-apps.md](02-built-in-apps.md) bölüm 5).
- Çekirdek yükseltmesi: Vendure'daki gibi SemVer; minor yalnızca eklemeli migration, major şema değiştirebilir; her yükseltmede önce yedek, migration'ı gözden geçir, yeşil `pnpm verify` ([06-surum-yukseltme.md](../08-isletme/06-surum-yukseltme.md)). Vendure sayfasındaki sürüm örneği eski; bizde ilk sürüm olmadığından örnek yazılmadı.
- **Topluluk built-in app'i yayını** (Vendure `publish-plugin` uyarlaması, sayfa tam okundu): çekirdek derlemeye girdiğinden yayın biçimi npm paketidir. Ad `@kapsam/openmers-builtin-<ad>`; iskelet `create-openmers-app --template builtin` ([03-tak-calistir-apps.md](03-tak-calistir-apps.md) bölüm 8, ⚙️ öneri). `package.json` `files`: `dist`, `README.md`, `CHANGELOG.md`; `@openmers/*` paketleri `peerDependencies`'te (çift kopya olmasın), uyumluluk `compatibility` aralığıyla bildirilir, paket sürüm aralığıyla değil. README: kurulum, `builtInApps: [...]` kaydı, ayarlar, kullanım, izinler. `CHANGELOG.md` zorunlu (`## <sürüm> (<tarih>)`). Genel API (servis, strateji, olay) TSDoc ile belgelenir; belge sitesi bunu okur. Uçtan uca test paketi beklenir. Lisans yazarın seçimidir (çekirdek lisansı bekliyor, bkz. ATLANANLAR). Dizin/ listeleme v1'de yok: depodaki `COMMUNITY.md` listesine PR ile eklenir.
- Çekirdeğe katkı (PR): `pnpm verify` yeşil, sözleşme testleri, tur bütçesi ve sorgu planı kapıları, belge güncellemesi.

## 20. Kontrol listesi

- [ ] Her prosedürün izni bildirili; ad alanı `/x/<id>/`.
- [ ] Tablolar `bia_<id>_`, migration eklemeli, `purge` yolu var.
- [ ] Yazmalar `atomic()`, yan etkiler outbox'ta.
- [ ] Aboneler ve işler idempotent, yükte sır ve ham `ctx` yok.
- [ ] Sırlar kasada; günlükte kişisel veri yok.
- [ ] D1 ve SQLite'ta aynı testler yeşil.
- [ ] Sözleşme, tur bütçesi, sorgu planı kapıları yeşil.
- [ ] `i18n check` temiz; hata kodları `<app>.<kod>`.
- [ ] `openmers doctor --profile production` temiz.

## 21. Doğrulanmamış / tasarlanmamış

- Vendure'dan okunanlar yalnızca 38 sayfa; `cli` ve `custom-fields` sayfaları okuma sırasında **kısaltılmıştı** (sonları özetten), diğerleri tam.
- `openmers` CLI komutları, `@openmers/testing`, `ctx.log`, `ctx.app.options`, `crudPermissions`, `openmers i18n check`, `openmers script`, `settings prune`, `db export --scrub-secrets` **önerilmiştir**, hiçbiri yazılmadı.
- Anahtar döndürme (sırlar) tasarlanmadı.
- Yükleme gövde sınırı, medya ön ayar kuralı, CORS ayrıntısı mevcut belgelerde eksik/doğrulanmadı.
- `useDefineForClassFields`, Nest, GraphQL, TypeORM'a özgü her şey Vendure'a özgü olduğundan bu rehberde yer almaz.
