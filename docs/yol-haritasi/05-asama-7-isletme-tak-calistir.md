# Aşama 7: işletme ve tak-çalıştır app'ler (madde 55-63)

**Grubun amacı:** OpenMers'i üretimde çalıştırılabilir, yedeklenebilir, izlenebilir ve yükseltilebilir hâle getirmek (self-host, kurulum, gözlemlenebilirlik, sürüm yükseltme, veri taşıma, SaaS yönü) ve uygulama mimarisinin ilk üç gerçek kullanıcısını (Pixel, ERP, pazaryeri) yazmak.

**Bağımlılık özeti:**
- Aşama 1 (platform arayüzü, `atomic()`, `db` + migration, yapılandırma, `Ctx`, `contract`) bu gruptaki her maddenin ön koşuludur.
- Aşama 2-4 ticaret omurgası (stok, checkout/rezervasyon, siparişler, outbox, auth/roller, sır kasası, ayarlar) olmadan 56, 57, 59 ve 61-63 başlayamaz.
- Aşama 5 uygulama mimarisi (`features/apps`, `app-sdk`, `app-bridge`, imzalı webhook, izinli token) 61-63'ün doğrudan ön koşuludur.
- 55 (self-host) yalnız `apps/api` Node girişi (`server.js`) ve derleme script'leri hazır olunca gerçekten denenebilir.

**Repo durumu (2026-11-13, kodla doğrulandı):**
- `deploy/docker/{Dockerfile,entrypoint.sh,litestream.yml,docker-compose.yml}`, `deploy/Caddyfile`, `deploy/systemd/openmers.service`, `.github/workflows/release-docker.yml` var; hiçbiri çalıştırılmadı.
- `apps/api|admin|storefront`: yalnız `package.json` + `tsconfig.json`, `src/` boş, `build` script'i yok. Dockerfile'ın `pnpm --filter ... build` ve `COPY apps/api/dist` adımları bu hâliyle çalışamaz.
- `packages/db`: `src/index.ts` = `export {}`, `migrations/` boş. `packages/core/src/{platform,ctx,config,events,jobs,extend}` boş; `features/*/index.ts` yer tutucu.
- `packages/plugins/pixel` ve `packages/plugins/erp`: yalnız `package.json` (`@openmers/app-pixel`, `@openmers/app-erp`) + `tsconfig.json`. Pazaryeri için paket yok.
- `packages/test-utils/src/index.ts` ve `integration-tests/helpers/index.ts`: yalnız yorum + `export {}`.
- Kök `package.json`'da `backup:verify` script'i yok; `openmers` CLI paketi yok ve `04-monorepo-klasor-yapisi.md`'de yeri tanımlı değil.
- İmaj adı uyuşmuyor: `docker-compose.yml` `ghcr.io/openmers/openmers:latest` çekiyor, `release-docker.yml` ise `ghcr.io/${{ github.repository }}` etiketliyor ve remote `openmers/openmerce`.

---

### 55. `docs/08-isletme/01-self-host.md` — VPS üzerinde Node + Litestream

- **Kaynak kararlar:**
  - Tek süreç: Hono API, Astro storefront (Node adaptörü), admin (Vite/React statik, `/admin` altında Hono'dan), kuyruk tüketicisi ve zamanlayıcı aynı Node sürecinde. Redis, PostgreSQL ve ayrı worker yok. Kopya sayısı bir.
  - Açılışta migration'lar otomatik uygulanır; başarısızsa süreç başlamaz. `PRAGMA journal_mode = WAL` ayarlanır, WAL değilse başlamayı reddeder; uygulama kendi checkpoint'ini zorlamaz.
  - Litestream zorunlu ve varsayılan açık: `litestream replicate -exec "node dist/server.js"`. Yerel DB yoksa ve yedek tanımlıysa önce `litestream restore`. Yedek tanımlı değilse açılışta uyarı ve admin'de kalıcı "Yedekleme yapılandırılmadı" bandı. Bilinçli kapatma `OPENMERS_BACKUP=off`.
  - Saklama 7 gün (`retention: 168h`). Admin'de son başarılı kopya zamanı ve gecikme gösterilir, eşik aşılınca bildirim gider.
  - Litestream'in kapsamadıkları: yüklenen dosyalar (önerilen: S3 uyumlu depo, alternatif `restic`/`rclone`), `SECRETS_KEK` (ortam değişkeninde, yedeğe girmez). `pnpm backup:verify` yedeği boş dizine geri yükleyip sipariş sayısını karşılaştırır.
  - Cloudflare'de Litestream yok, D1 Time Travel var; çekirdek kod iki hedefte aynı.
- **Bağımlılık:** madde 5 (`Platform` arayüzü + Node uygulaması), `packages/db` migration çalıştırıcısı, `apps/api` Node girişi (`apps/api/src/server.ts`), storefront ve admin derlemeleri; admin uyarı bandı için admin iskeleti (31) ve `features/settings`.
- **Yapılacaklar:**
  1. ± `deploy/docker/Dockerfile`, `entrypoint.sh`, `litestream.yml`, `docker-compose.yml`, `deploy/Caddyfile`, `deploy/systemd/openmers.service`: dosyalar var, hiç derlenmedi. `apps/*` için `build` script'leri gelince imajı yerelde derle ve `docker compose up` ile çalıştır; Litestream imajı `litestream/litestream:0.3` sürümünü güncel sürümle karşılaştır.
  2. - İmaj adını tek yerde eşitle: `deploy/docker/docker-compose.yml` ile `.github/workflows/release-docker.yml` aynı `ghcr.io/<org>/<repo>` adını kullansın (şu an `openmers/openmers` ve `openmers/openmerce`).
  3. - `apps/api/src/server.ts`: Node girişi; `apps/api/src/platform/node.ts` ile `Platform` kurar, Hono uygulamasına storefront handler'ını ve `/admin` statik sunumunu bağlar, aynı süreçte `apps/api/src/worker/` tüketicisini ve zamanlayıcıyı başlatır. Yalnız birleştirme yapar, iş kuralı içermez.
  4. - `packages/db/src/migrate/runMigrations.ts` (I/O): numaralı migration'ları sırayla uygular, hata olursa fırlatır; `server.ts` hata alırsa `process.exit(1)` ile kapanır, trafiğe açmaz.
  5. - `apps/api/src/platform/node/sqlite.ts` (I/O): bağlantı açılışında `PRAGMA journal_mode = WAL` ayarlar, dönen değeri `packages/core/src/platform/assertWal.ts` (saf: `(mode) => void`, WAL değilse hata) ile denetler; checkpoint ayarına dokunmaz, uzun okuma transaction'ı açmaz.
  6. - `packages/core/src/features/settings/backupStatus.ts` (saf): ortamdan gelen `{ backup: 'on'|'off', replicaUrl? }` ile `'configured' | 'missing' | 'disabled'` durumunu döner; `server.ts` `missing` iken uyarı loglar. Admin bandı bu durumu `contract` üzerinden okur.
  7. - `packages/core/src/features/settings/backupLag.ts` (saf): son başarılı kopya zamanı + şimdi → gecikme ve eşik aşımı. Litestream'den okuma `apps/api/src/platform/node/litestreamStatus.ts` (I/O; Litestream'in sunduğu durum/metrik kaynağı doğrulanmadı, bkz. açık sorular). Eşik aşımı bildirim olayı outbox'a yazılır.
  8. - `scripts/backup-verify.ts` + kök `package.json` `"backup:verify"`: geçici boş dizine `litestream restore`, iki veritabanında sipariş sayısını karşılaştırır, farkta sıfırdan farklı çıkış kodu.
  9. - Admin "Yedekleme yapılandırılmadı" bandı ve yedek durum kartı: `apps/admin/src/lib/system/BackupBanner.tsx`, yalnız `@openmers/ui` bileşenleriyle.
  10. - Kurulum rehberi (belge işi): Caddyfile kullanımı, `SECRETS_KEK`'in parola yöneticisine kaydı, yüklemeler için S3 önerisi ilk sırada, `restic`/`rclone` alternatifi, `backup:verify`'ın periyodik çalıştırılması, ölü adam anahtarı önerisi (57 ile ortak).
- **Testler:**
  - `packages/core/src/platform/assertWal.test.ts`, `features/settings/backupStatus.test.ts`, `backupLag.test.ts`: birim.
  - `integration-tests/core/__tests__/migrations-on-boot.test.ts`: bozuk bir migration ile açılışın durduğu, trafiğe açılmadığı (gerçek SQLite).
  - CI'da (elle tetik) imaj derleme + `docker compose up` + `/healthz` duman testi; MinIO'ya replikasyon ve `backup:verify` ile geri yükleme.
- **Bitti sayılır:**
  - `docker build -f deploy/docker/Dockerfile .` başarılı, kapsayıcı açılıp `/healthz` 200 döner.
  - MinIO hedefiyle: kapsayıcı silinir, boş volume ile yeniden başlatılır, sipariş sayısı aynı (`pnpm backup:verify` 0 çıkış kodu).
  - WAL dışı veritabanı ve başarısız migration'da süreç başlamaz (test yeşil).
  - Yedek yokken admin'de uyarı bandı görünür, `OPENMERS_BACKUP=off` ile kaybolur.
- **Açık sorular / riskler:**
  - Litestream'den "son başarılı kopya zamanı" nasıl okunacak (metrik ucu, log, replika üzerinde `litestream snapshots`)? Belgede yok.
  - `litestream.yml` içindeki `${OPENMERS_DB}` / `${LITESTREAM_REPLICA_URL}` genişletmesinin seçilen Litestream sürümünde çalıştığı denenmedi.
  - Admin statik dosyalarının Hono'dan mı Caddy'den mi sunulacağı: belge Hono diyor, Caddyfile yalnız `reverse_proxy` yapıyor; statik önbellek Caddy tarafında tanımlı değil.
  - `ATLANANLAR.md`: yatay ölçekleme v1 dışı; tek kopya kararı Redis/PostgreSQL gerektirmeden kalır.

### 56. `docs/08-isletme/07-kurulum-ve-tohum-veri.md` — kurulum sihirbazı ve tohum veri

- **Kaynak kararlar:**
  - Boş veritabanında kurulum kipi: yalnız `/setup` ve sağlık uçları yanıt verir, vitrin "yakında", admin API kapalı. `/setup` için ilk açılışta üretilen kurulum anahtarı gerekir (yalnız loglara veya `wrangler` secret'ına yazılır).
  - Sihirbaz 9 adım; 1-4 (Yönetici + 2FA → `SuperAdmin`, Mağaza → varsayılan kanal, Vergi, Depo) zorunlu ve tek `atomic()` ile yazılır, `settings.setup_completed_at` kalıcı olarak kipi kapatır, anahtar geçersizleşir, `/setup` 404 olur. 5-9 atlanabilir ve panoda "kurulumu tamamla" listesi olur.
  - Ödeme yapılandırılmadan checkout "şu an sipariş alınamıyor" der; sahte ödeme ile sipariş alınmaz.
  - Tohum kümeleri: Sistem (migration ile; roller/izinler, ülke/il, para birimleri, bildirim türleri, şablonlar), Bölgesel (ülkeye göre vergi, adres biçimi, yasal sayfa taslağı), Demo (~30 ürün, `demo` işaretli, tek tıkla kaldırılır), Test (belirlenimci 10.000 / 100.000 ürün). Tohum betikleri `core` fonksiyonlarını çağırır, ham SQL yazmaz.
  - CLI: `openmers setup`, `openmers seed demo|test`, `openmers admin create`, `openmers doctor`; `admin create` denetim kaydına düşer.
  - Geliştirme: `pnpm i && pnpm dev` yerel SQLite, test tohumu, konsola yazan sahte e-posta, yalnız geliştirmede sahte ödeme (üretim derlemesine girmez).
- **Bağımlılık:** 55 (açılış ve migration); `features/auth` (SuperAdmin, 2FA, roller), `features/channels`, `features/tax`, `features/stock` (konum), `features/settings`, `features/pages`, `features/catalog`, `features/media`; denetim kaydı.
- **Yapılacaklar:**
  1. - `packages/core/src/features/settings/setup/setupMode.ts` (saf): `setup_completed_at` değerine göre `'setup' | 'live'`; `apps/api/src/middleware/setupGate.ts` (ince): kurulum kipinde yalnız `/setup`, `/healthz`, `/readyz` geçer, vitrin "yakında", admin API 503/404.
  2. - `features/settings/setup/setupKey.ts`: anahtar üretimi `ctx.random`'dan (saf), sabit zamanlı karşılaştırma; saklama/loglama `apps/api/src/platform/node.ts` ve Cloudflare girişinde. Anahtar asla HTTP yanıtına yazılmaz.
  3. - `features/settings/setup/setupInputSchema.ts`: adım 1-4 Zod şeması `packages/contract/src/setup/` altında; handler `apps/api/src/setup/submitSetup.ts` ≤40 satır.
  4. - `features/settings/setup/completeSetup.ts` (orkestrasyon): tek `atomic()` içinde SuperAdmin, varsayılan kanal, vergi seti, ilk depo ve `setup_completed_at`; `setup_completed_at` zaten doluysa `SETUP_ALREADY_DONE` hatası (çift gönderimde tek yönetici).
  5. - `features/tax/presets/` (veri dosyaları): ülke başına hazır oran setleri; global varsayılan + `tr.ts` (KDV %1/%10/%20) ayrı dosya, çekirdek koda Türkiye'ye özel dal yok.
  6. - `features/settings/setup/pendingSteps.ts` (saf): atlanan 5-9 adımlarından "kurulumu tamamla" listesi; admin panosunda `@openmers/ui` ile gösterilir.
  7. - `packages/db/migrations/NNNN_seed_system.sql` veya `packages/db/src/seed/system/*`: roller/izinler, ülke/il, para birimleri, bildirim türleri, varsayılan şablonlar (migration ile, her kurulumda).
  8. - `packages/core/src/seed/demo/seedDemo.ts` + `removeDemo.ts`: `catalog`/`media`/`pages`/`companies`/`pricing` `index.ts` fonksiyonlarını çağırır, kayıtlara `demo` işareti koyar; kaldırma işareti taşıyan kayıtları ve görselleri siler. Ürün verisi ayrı veri dosyasında.
  9. - `packages/test-utils/src/seed/seedTest.ts`: belirlenimci (sabit tohumlu RNG) 10.000 / 100.000 ürün kümeleri; `integration-tests/helpers` buradan kullanır.
  10. - `features/payments/fake/fakePaymentProvider.ts`: yalnız `NODE_ENV=development` derlemesine girer (koşullu import/derleme bayrağı); checkout ödeme yöntemi yoksa `NO_PAYMENT_METHOD` döner.
  11. - CLI paketi (yeri belirsiz, öneri `packages/cli/src/commands/{setup,seed,adminCreate,doctor}.ts`): her komut bir dosya, `core` fonksiyonlarını çağırır; `setup` aynı `completeSetup`'ı kullanır; `admin create` denetim kaydı yazar; `doctor` 57'deki `/readyz` denetimlerini ve yedek durumunu yeniden kullanır.
  12. - Yasal sayfa taslakları (`features/pages/legalDrafts/*.md`): "hukuki metin değildir, kendi metninizle değiştirin" notuyla.
- **Testler:**
  - `integration-tests/api/__tests__/setup/setup-key.test.ts`: anahtarsız `/setup` reddi; kurulum sonrası `/setup` 404.
  - `integration-tests/race/__tests__/setup-double-submit.test.ts`: sihirbaz iki kez eşzamanlı gönderilir, tek SuperAdmin.
  - `integration-tests/core/__tests__/seed-demo-remove.test.ts`: demo kaldırılınca ilgili tüm kayıtlar ve görseller gider, gerçek kayıtlar kalır.
  - `integration-tests/core/__tests__/setup-cli-parity.test.ts`: etkileşimsiz kurulum ile sihirbaz aynı veritabanı durumunu üretir.
  - Birim: `setupMode`, `pendingSteps`, `tax/presets` biçimi; sahte ödemenin üretim derlemesinde olmadığını doğrulayan derleme testi.
- **Bitti sayılır:**
  - Boş SQLite ile açılan süreçte yalnız `/setup` ve sağlık uçları yanıt verir; anahtarla kurulum tamamlanınca vitrin açılır, `/setup` 404.
  - Yukarıdaki dört integration/race testi D1 ve SQLite'ta yeşil.
  - `openmers seed test` 10.000 ürünü iki çalıştırmada aynı içerikle üretir.
  - Üretim derlemesinde sahte ödeme sağlayıcısı yok (bundle içinde aranır).
- **Açık sorular / riskler:**
  - `openmers` CLI paketinin yeri ve dağıtımı (`04-monorepo-klasor-yapisi.md`'de yok; `ATLANANLAR.md`: `openmers` CLI komutları önerildi, yazılmadı).
  - Cloudflare'de kurulum anahtarının nasıl üretileceği (Worker ilk istekte mi üretir, `wrangler secret` ile önceden mi verilir?) belgede net değil.
  - 2FA kurulumunun kurtarma kodu akışı ve `admin create`'in 2FA'yı nasıl kurduğu belirtilmemiş.
  - Demo görselleri depoda mı gelir, dış kaynaktan mı indirilir (lisans)?

### 57. `docs/08-isletme/04-gozlemlenebilirlik.md` — log, metrik, iz, sağlık, alarm

- **Kaynak kararlar:**
  - Yapılandırılmış JSON log, satır başına bir olay, `stdout`; alanlar `ts, level, msg, requestId, channel, actor, route, status, durMs, dbQueries, dbMs`. `requestId` kenarda üretilir (veya `cf-ray`/`x-request-id`), `Ctx`'te taşınır, yanıt başlığında, outbox satırında ve giden webhook'ta yer alır. Kişisel veri loglanmaz; beklenen iş hataları `info`.
  - Metrik arayüzü tek: `metrics.count(name, tags)`, `metrics.time(name, ms, tags)`; hedef Cloudflare'de Analytics Engine, self-host'ta `/metrics` (Prometheus, yerel ağ veya token), ikisi de yoksa bellekte son 1 saat.
  - OpenTelemetry isteğe bağlı, varsayılan kapalı; standart `OTEL_*` değişkenleri, batch yayıcı, `service.name=openmers-api|openmers-worker`, kararlı anlamsal adlar, `url.query` içinde imza/token parametreleri `REDACTED`, `traced(name, fn)` servis işlevlerine (handler'a değil); Workers'ta yerleşik OTLP (`tracing.enterSpan`).
  - Yavaş sorgu eşiği 50 ms (SQL parametresiz + rota loglanır); tur bütçesi aşımı uyarı, geliştirmede hata.
  - `GET /healthz` (bağımlılık yok), `GET /readyz` (DB yazılabilir, migration güncel, kasa anahtarı var); admin "Sistem" sayfası.
  - Alarm tablosu: checkout hata oranı 5 dk'da >%2, outbox en eski bekleyen >15 dk, `dead` satır, Litestream gecikmesi >5 dk, p95 katalog hedefin 2 katı 10 dk, vb.; teslimat outbox'tan e-posta + isteğe bağlı webhook; ölü adam anahtarı isteğe bağlı. Log/metrik yazımı istek yolunu bekletmez (`waitUntil` / tamponlu yazma).
- **Bağımlılık:** madde 5 (`Platform`), 8 (`Ctx`), `db` sarmalayıcısı (sorgu sayacı), `jobs`/outbox, `features/notify` (alarm e-postası), admin iskeleti (Sistem sayfası). 55 (yedek gecikmesi).
- **Yapılacaklar:**
  1. - `packages/core/src/platform/logger.ts` (arayüz) + `packages/core/src/observability/log/formatLogLine.ts` (saf): alan listesine göre JSON satırı; `redactPersonal.ts` (saf) e-posta/telefon desenlerini ve bilinen hassas anahtarları temizler. Node yazıcısı `apps/api/src/platform/node/stdoutLogger.ts` tamponlu.
  2. - `packages/core/src/observability/requestId.ts` (saf): gelen `cf-ray`/`x-request-id` varsa onu, yoksa `ctx.random` ile yeni kimlik; `apps/api/src/middleware/requestId.ts` başlığa yazar ve `Ctx`'e koyar. Outbox satırına ve webhook başlığına yazım `core/src/jobs` içinde.
  3. - `packages/core/src/platform/metrics.ts` (port: `count`, `time`) + `observability/metrics/memoryMetrics.ts` (bellek içi 1 saatlik halka tampon) + `observability/metrics/prometheusFormat.ts` (saf). Node ucu `apps/api/src/system/metrics.ts` (yalnız yerel ağ veya token). Cloudflare uygulaması Analytics Engine'e yazar.
  4. - `packages/db/src/instrument/withQueryTiming.ts`: her sorgu süresini ölçer, istek başına `dbQueries`/`dbMs` sayar, 50 ms eşiğini (ayar) aşanı parametresiz SQL + rota ile loglar; tur bütçesi aşımında uyarı, `dev` kipinde hata.
  5. - `packages/core/src/observability/trace/traced.ts`: `traced(name, fn)` platform portunu çağırır; Node uygulaması `@opentelemetry/api`, Workers uygulaması `tracing.enterSpan`. `redactUrlQuery.ts` (saf) varsayılan liste (`sig`, `Signature`, `X-Amz-Signature`, giriş/geçiş kodu, karar/davet/paylaşım jetonu) + yapılandırmadan ekleme (ezmez).
  6. - OTel bağımlılıkları kök `package.json`/katalogda tek yerden sabit sürümle (bağımlılık ekleme kararı yöneticide); oRPC OTel bütünleştirmesi `apps/api` içinde bağlanır.
  7. - `apps/api/src/system/healthz.ts` ve `readyz.ts` (ince): `readyz` denetimleri `packages/core/src/observability/health/readiness.ts` içinde (DB yazma denemesi, migration sürümü, kasa anahtarı); `openmers doctor` (56) aynı fonksiyonu kullanır.
  8. - `packages/core/src/observability/alerts/rules.ts` (veri: tablo 6'daki kurallar ve varsayılan eşikler) + `evaluateAlerts.ts` (saf: metrik anlık görüntüsü → tetiklenen alarmlar) + `alerts/runAlertJob.ts` (zamanlanmış iş, alarmı outbox'a yazar). Teslimat `features/notify` üzerinden.
  9. - `observability/deadManSwitch.ts`: ayarlanmışsa belirli aralıkla dış adrese ping (zamanlayıcı işi).
  10. - Admin "Sistem" sayfası `apps/admin/src/routes/system.tsx`: sürüm, migration durumu, outbox özeti, son zamanlanmış görevler, yedek durumu, kurulu built-in app'ler; yalnız `@openmers/ui`. Veri `contract/admin/system`.
  11. - Sentry (isteğe bağlı) adaptörü `apps/api/src/platform/sentry.ts`: `requestId`, rota, kanal, sürüm etiketi, `redactPersonal` sonrası gönderim.
- **Testler:**
  - Birim: `formatLogLine`, `redactPersonal`, `redactUrlQuery`, `evaluateAlerts` (her eşik için sınırın iki yanı), `prometheusFormat`.
  - `integration-tests/api/__tests__/observability/no-pii-in-logs.test.ts`: müşteri kaydı + checkout akışı sırasında log ve iz çıktısında e-posta deseni yok (`openmers-testing` 8. bölüm).
  - `integration-tests/api/__tests__/observability/request-id.test.ts`: aynı `requestId` yanıt başlığında, outbox satırında ve giden webhook başlığında.
  - `integration-tests/api/__tests__/observability/readyz.test.ts`: kasa anahtarı yokken veya bekleyen migration varken 503.
  - `integration-tests/core/__tests__/round-trip-budget.test.ts`: dev kipinde bütçe aşımı hata fırlatır.
- **Bitti sayılır:**
  - Her istek tek JSON satırı üretir, tanımlı alanların hepsi var; PII testi yeşil.
  - `/healthz`, `/readyz`, `/metrics` (token ile) yanıt verir; OTel kapalıyken ek bağımlılık yüklenmez.
  - Alarm kuralları birim testlerle doğrulanmış, en az `dead` satır alarmı uçtan uca e-posta outbox satırı üretir.
  - Admin Sistem sayfası gerçek veriyle açılır.
- **Açık sorular / riskler:**
  - `observability/` klasörü `04-monorepo-klasor-yapisi.md`'de yok; yeri (core altı mı, ayrı paket mi) karar ister.
  - `ATLANANLAR.md` (Workers OTel): traces open beta, `@opentelemetry/api`'nin Workers'ta desteklenip desteklenmediği, oRPC OTel bütünleştirmesinin adı ve uyumu, Workers otomatik `fetch` yaylarında URL maskelemenin uygulanamayabilmesi, D1 `db.query.text` içinde PII riski, `persist:false` faturalama etkisi.
  - Litestream gecikmesinin ölçüm kaynağı (55 ile aynı soru).
  - "p95 katalog API hedefi"nin sayısı `03-performans.md`'den alınacak; burada tanımlı değil.

### 58. `docs/08-isletme/06-surum-yukseltme.md` — sürümleme, açılış denetimi, migration türleri

- **Kaynak kararlar:**
  - Semantik sürüm; `@openmers/*` ve resmî built-in app'ler aynı numara. Kırıcı listesi (alan/uç/webhook alanı kaldırma, `defineBuiltInApp`/strateji imzası/olay adı uyumsuzluğu, yapılandırma anahtarı kaldırma, en düşük Node) yalnız büyük sürümde; kaldırılacak şey en az bir küçük sürüm "kullanımdan kalkıyor" uyarısı verir.
  - Açılış sırası: (a) uyumluluk denetimi (built-in app `compatibility`, Node sürümü, yapılandırma şeması) → başarısızsa migration'a başlamadan durur; (b) migration; (c) trafik. `openmers upgrade --check` a adımını ve bekleyen migration'ları değiştirmeden gösterir.
  - Migration türleri: şema (eklemeli, açılışta), backfill (açılıştan sonra parçalı iş, ilerleme admin'de), temizlik (sonraki büyük sürümde). Genişlet → taşı → daralt. Büyük tabloya indeks "bakım penceresi gerektirir" diye işaretlenir.
  - Geri alma migration'ı yok; kod bir önceki küçük sürüme dönebilir; veri geri alma = Litestream ile ana dönüş.
  - Built-in app migration'ları çekirdekten sonra, kendi numara dizisiyle. Kaldırılacak uçlar `Deprecation` başlığı taşır, hangi uygulamanın çağırdığı admin'de listelenir. Mobil: API desteklenen en düşük uygulama sürümünü bildirir.
  - CI yükseltme testi: önceki sürüm şeması + tohum → yeni sürüm açılışı + duman; yeni şema üzerinde eski kodun dumanı.
- **Bağımlılık:** 55 (açılış akışı, migration çalıştırıcı), `core/src/extend` (`defineBuiltInApp`, `compatibility`), `core/src/config` (yapılandırma şeması), `jobs` (backfill işi), 56 (CLI ve tohum), Changesets (aşama 0, var).
- **Yapılacaklar:**
  1. - `packages/core/src/extend/compat/checkCompatibility.ts` (saf): çekirdek sürümü, Node sürümü, built-in app `compatibility` aralıkları ve yapılandırma şeması doğrulama sonucu → `{ ok, problems[] }`. Semver aralık karşılaştırması mevcut bir bağımlılıkla (eklenecekse raporla).
  2. - `apps/api/src/boot/boot.ts`: sırayı sabitler: `checkCompatibility` → `runMigrations` (çekirdek, sonra built-in app dizileri) → dinlemeye başla; her adım ayrı dosyada, hatada neden loglanıp çıkılır.
  3. - `packages/db/src/migrate/` : `listPending.ts` (salt okuma), `runMigrations.ts` (55 ile ortak), built-in app dizileri için `bia_<ad>_` önekli ayrı migration tablosu/izleme.
  4. - `packages/db/migrations/` için lint/denetim betiği `scripts/check-migrations.ts`: `DROP`/`RENAME`/sütun kaldırma içeren dosyayı küçük sürümde reddeder; `CREATE INDEX` büyük tabloda ise "bakım penceresi" işareti ister.
  5. - `packages/core/src/jobs/backfill/defineBackfill.ts` + `runBackfillChunk.ts`: parçalı, imleçli, kaldığı yerden süren backfill işi; ilerleme tablosu; admin Sistem sayfasında ilerleme.
  6. - `packages/core/src/extend/deprecation/` : `deprecations.ts` (veri: kaldırılacak uç/alan listesi), `markDeprecated` ara katmanı `Deprecation` başlığını ekler ve çağıran uygulamayı sayar; admin'de liste.
  7. - CLI `upgrade --check` (56'daki CLI paketinde `commands/upgradeCheck.ts`): `checkCompatibility` + `listPending` çıktısı, hiçbir şey yazmaz.
  8. - Mobil en düşük sürüm: `packages/contract/src/shop/meta.ts` `minAppVersion` alanı; `apps/mobile` altındaki sürüm denetimi güncelleme ekranı gösterir.
  9. - `.github/workflows/upgrade-test.yml`: önceki etiketin şeması + tohum verisi ile DB kur, yeni sürümü başlat, duman testi; ters yön (eski kod + yeni şema) duman testi.
  10. - Sürüm notu şablonu (`.changeset` ile birlikte): kırıcı değişiklik, elle adım, bakım penceresi, daraltma sonrası geri dönülemez uyarısı.
- **Testler:**
  - Birim: `checkCompatibility` (uyumsuz built-in app, düşük Node, geçersiz yapılandırma), `check-migrations` kural tablosu.
  - `integration-tests/core/__tests__/boot-order.test.ts`: uyumluluk başarısızken hiçbir migration uygulanmaz (migration tablosu değişmez).
  - `integration-tests/core/__tests__/backfill-resume.test.ts`: yarıda kesilen backfill kaldığı yerden sürer, satır iki kez işlenmez.
  - CI yükseltme testi (iki yön).
- **Bitti sayılır:**
  - Uyumsuz bir built-in app ile açılış migration'a başlamadan durur ve nedeni loglanır.
  - `openmers upgrade --check` bekleyen migration listesini verir, DB değişmez.
  - `upgrade-test` iş akışı en az bir gerçek sürüm çifti üzerinde yeşil.
- **Açık sorular / riskler:**
  - İlk sürüm etiketi yokken yükseltme testi neye karşı koşacak? İlk etiket sonrası etkinleşir.
  - Çok kiracılı (60) "tembel migration" bu açılış sırasıyla nasıl birleşir, belge ayrı anlatıyor.
  - Cloudflare `wrangler d1 migrations apply` ile built-in app migration dizilerinin birlikte nasıl uygulanacağı belirtilmemiş.
  - `ATLANANLAR.md`: app geliştirme rehberindeki sürüm yükseltme akışı "öneri, sözleşme değil".

### 59. `docs/08-isletme/08-veri-tasima.md` — Shopify, WooCommerce, ikas içe aktarma

- **Kaynak kararlar:**
  - Komut satırı aracı + admin ekranı; çekirdeğe özel kod yok, yalnız toplu Admin API uçları: `products.upsertMany`, `customers.upsertMany`, `prices.setMany`, `stock.setMany`, `redirects.importMany`, `orders.importHistorical`.
  - Boru hattı: platforma özel okuyucu → ortak ara biçim (JSONL dosyaları) → doğrulayıcı (rapor) → yükleyici (parçalı, sürdürülebilir). CSV → JSONL dönüştürücü dahil.
  - Parolalar taşınmaz (ilk girişte tek kullanımlık kodla belirleme). Tarihsel sipariş `source = import`: stok düşmez, ödeme sağlayıcıya bağlanmaz, outbox olayı yok; raporlara dahil edilmesi ayar.
  - Kaynak kimlikleri `external_refs`'e (`kaynak = shopify`); tekrar çalıştırma günceller, çift üretmez. İzin kaydı yoksa müşteri izinsiz. Her eski adres için 301; doğrulayıcı site haritasındaki her adresi denetler. Sipariş sayacı içe aktarılan en büyük numaradan sonra başlar veya önek alır.
  - Yükleyici toplu uç sınırına (ör. 500) uyar, imleçten sürer; indeksleme sonda bir kez; görsel indirme ayrı kuyruk, eşzamanlılık sınırlı, yalnız `https` ve herkese açık adres (SSRF).
  - Bağlayıcı sırası: ortak ara biçim + CSV + doğrulayıcı + yükleyici → Shopify → WooCommerce → ikas ve yerli altyapılar.
- **Bağımlılık:** toplu uçlar ve `Idempotency-Key` (62 ile ortak çekirdek eklentisi), `external_refs` tablosu (62), `features/catalog`, `customers`, `pricing`, `stock`, `orders` (yeni `importHistorical`), `media` (boyut merdiveni işi), `redirects` (yer: `features/pages` veya yeni feature; belirsiz), `catalogIndex` yeniden indeksleme işi.
- **Yapılacaklar:**
  1. - Ara biçim şeması: `packages/migrate/src/format/` (paket adı öneri; yeri belirsiz) her varlık için ayrı Zod dosyası (`product.ts`, `customer.ts`, `order.ts`, `redirect.ts`, `page.ts`, `discount.ts`), JSONL satır okuyucu/yazıcı.
  2. - `packages/migrate/src/csv/csvToJsonl.ts` (saf eşleme) + dosya okuma ayrı.
  3. - `packages/migrate/src/validate/` : `validateCatalog.ts` (SKU benzersiz, eksikse üret + raporla), `validateRedirects.ts` (site haritasındaki her adresin karşılığı), `buildReport.ts` (saf). Deneme kipi hiçbir şey yazmaz.
  4. - `packages/migrate/src/load/loader.ts`: 500'lük parçalar, `Idempotency-Key`, imleci yerel durum dosyasına yazar, hız sınırında geri çekilir, kesilirse devam; yalnız `@openmers/app-sdk` / contract istemcisini kullanır. İçerik özeti ile yalnız değişenleri gönderir (artımlı kip).
  5. - Çekirdek: `packages/core/src/features/orders/import/importHistorical.ts`: `source = import`, stok/ödeme/outbox yok; ayar `reports.includeImported`. Sayaç: `features/orders/number/` en büyük içe aktarılan numaradan sonra başlar veya önek.
  6. - Çekirdek: `redirects.importMany` ve 404 kaydı (karşılıksız yollar raporu); yeri karar ister (`features/pages/redirects/` öneri).
  7. - Çekirdek: toplu uçlar `products.upsertMany`, `customers.upsertMany` (parolasız; ilk girişte kod), `prices.setMany` (`compare_at`), `stock.setMany`; kayıt başına sonuç ve kısmi başarı. Handler'lar `apps/api/src/admin/<resource>/` altında tek dosya.
  8. - `packages/migrate/src/images/imageFetchJob.ts`: `https` + herkese açık adres denetimi `isPublicHttpsUrl.ts` (saf, özel IP aralıkları reddedilir), eşzamanlılık sınırı, medyaya yükleme.
  9. - `packages/migrate/src/content/htmlToMarkdown.ts`: dönüştürülemeyen blokları raporlar (dönüştürücü bağımlılığı karar ister).
  10. - `packages/migrate/src/readers/shopify/` → sonra `woocommerce/` → `ikas/`; her okuyucu yalnız kaynaktan ara biçime çevirir, API ayrıntıları yazılırken kaynak belgeden doğrulanır.
  11. - Admin ekranı `apps/admin/src/routes/migrate/`: rapor görüntüleme, örneklem karşılaştırması (ürün sayısı, rastgele 50 ürün fiyat/stok/görsel), 404 raporu; `@openmers/ui` ile.
- **Testler:**
  - `integration-tests/api/__tests__/admin/migrate-idempotent.test.ts`: aynı taşıma iki kez → çift kayıt yok (`external_refs` ile).
  - `integration-tests/core/__tests__/import-historical.test.ts`: tarihsel sipariş stok, outbox ve (ayar kapalı) raporu etkilemez.
  - `integration-tests/api/__tests__/admin/redirects-import.test.ts`: her kaynak adres 301 ile 200 dönen hedefe gider.
  - `packages/migrate/src/load/loader.test.ts` + integration: yarıda kesilen yükleme imleçten sürer, tekrar yazmaz.
  - Birim: `csvToJsonl`, `validateRedirects`, `isPublicHttpsUrl` (özel IP, `http`, IPv6 yerel), ara biçim şemaları.
- **Bitti sayılır:**
  - Örnek bir Shopify CSV dışa aktarımı deneme → rapor → yükleme → artımlı yeniden çalıştırma ile çift kayıtsız tamamlanır.
  - Dört test grubu (idempotent, tarihsel sipariş, 301, sürdürme) yeşil.
  - Yeni siparişin numarası içe aktarılan en büyükle çakışmaz.
- **Açık sorular / riskler:**
  - Kaynak platformların API/dışa aktarma biçimleri doğrulanmadı (belgedeki not).
  - `packages/migrate` (veya `tools/`) paketi monorepo yapısında yok; `redirects` için feature tanımlı değil.
  - Parola belirleme e-postasının toplu gönderiminde gönderim kotası/hız sınırı tanımsız.
  - HTML → Markdown için bağımlılık seçimi yapılmadı.

### 60. `docs/08-isletme/05-cok-kiracili-saas.md` — çok kiracılı barındırma (v1'de uygulanmaz)

- **Kaynak kararlar:**
  - Kiracı ≠ kanal. Yalıtım: kiracı başına veritabanı; çekirdek kiracıdan habersiz, `Platform.db` zaten doğru veritabanı.
  - Yönlendirme: `Host` → kiracı eşlemesi kontrol düzlemi önbelleğinden (KV) → kiracının DB, depolama öneki ve kasa anahtarıyla `Platform` → tek mağaza akışı.
  - Kontrol düzlemi ayrı uygulama: `tenants` (durum `provisioning · active · suspended · deleted`, plan, bölge, DB kimliği, şema sürümü), `tenant_domains`, abonelik/kullanım sayaçları. Kiracı açma adımları idempotent ve sürdürülebilir; kontrol düzlemi kiracı verisine erişmez.
  - Migration yayılımı: önce kod, sonra gruplar hâlinde kiracılar; kanarya önce; başarısız kiracı listelenir; küçükse tembel uygulama, değilse kısa bakım yanıtı.
  - Kiracı başına KEK, kontrol düzlemi ana anahtarıyla sarılı. Barındırılan kurulumda kiracı built-in app ekleyemez. Adil kullanım: kiracı başına hız sınırı, kuyruk eşzamanlılığı, depolama ve e-posta kotası.
  - Kapsam: v1'de uygulanmaz. Tek koşul: süreç genelinde paylaşılan önbellek anahtarları kiracı öneki taşır; bellek içi sıcak yapılandırma anahtarı `(tenant, key)`.
- **Bağımlılık:** madde 5 (`Platform`), `features/cache`, `features/settings` (sıcak yapılandırma), `features/secrets`, 58 (migration çalıştırıcı), `features/auth` (`rateLimit`).
- **Yapılacaklar:** (v1'de yalnız 1-4 korunur; 5-9 v1 sonrası)
  1. - `packages/core/src/platform/` arayüzüne `tenantId` (tek mağazada sabit `'default'`) alanı; `Ctx` üzerinden erişilir.
  2. - `packages/core/src/features/cache/keys/cacheKey.ts` (saf): süreç genelindeki her önbellek anahtarına kiracı öneki ekler; tüm önbellek yazımları bu fonksiyondan geçer.
  3. - `packages/core/src/features/settings/hotConfig.ts`: bellek içi sıcak yapılandırma `Map<\`${tenant}:${key}\`, …>`; tek kiracıda da aynı anahtar biçimi.
  4. - `scripts/check-tenant-safety.ts` veya Biome kuralı: modül düzeyinde (süreç genelinde) değişebilir önbellek/`Map` tanımını raporlar (çekirdeğin varsayımı bozmaması için koruma).
  5. - (v1 sonrası) Kontrol düzlemi uygulaması `apps/control-plane/` + kendi DB şeması (`tenants`, `tenant_domains`, kullanım sayaçları).
  6. - (v1 sonrası) `apps/api/src/platform/tenantResolver.ts`: `Host` → kiracı, KV önbelleği, `Platform` kurulumu; askıya alınmış kiracıda vitrin "geçici olarak kapalı", admin salt okunur.
  7. - (v1 sonrası) Kiracı açma işleri: DB oluştur → migration → tohum (56) → KEK üret/sar → alan adı bağla; her adım ayrı idempotent iş dosyası.
  8. - (v1 sonrası) Migration yayılım işi: kanarya grubu, grup boyutu, başarısız listesi, `tenants.schema_version`.
  9. - (v1 sonrası) Adil kullanım: kiracı başına hız sınırı ve kuyruk eşzamanlılık sınırı `features/auth/rateLimit` ve `jobs` içinde kiracı etiketiyle.
- **Testler:**
  - Birim: `cacheKey` (iki kiracıda aynı mantıksal anahtar farklı fiziksel anahtar), `hotConfig`.
  - `integration-tests/contract/__tests__/tenant-isolation.test.ts`: aynı süreçte iki `Platform` (iki SQLite dosyası) ile bir kiracıya yazılan ayar/önbellek diğerinden okunamaz.
  - (v1 sonrası) Migration yayılımında başarısız kiracının diğerlerini durdurmaması.
- **Bitti sayılır (v1 için):**
  - Çekirdekte süreç genelinde kiracı öneksiz önbellek anahtarı kalmaz (denetim betiği yeşil).
  - İki `Platform` örneğiyle yalıtım testi D1 ve SQLite'ta yeşil.
  - Sıcak yapılandırma anahtarı `(tenant, key)` biçiminde.
- **Açık sorular / riskler:**
  - Bir Worker'a bağlanabilen D1 sayısı ve çalışma anında D1 erişimi (D1 HTTP API, Workers for Platforms) doğrulanmadı; belge bunu "SaaS'in ilk doğrulanacak maddesi" diyor.
  - Cloudflare for SaaS (özel alan adı + TLS) maliyeti ve sınırları okunmadı.
  - Kiracı silmede "yasal saklama süresi"nin değeri tanımsız.
  - Self-host tek kopya kararıyla (`ATLANANLAR.md` yatay ölçekleme) çakışma yok, ama Node'da çok kiracı modeli belgede tarif edilmemiş.

### 61. `docs/10-tak-calistir-apps/01-pixel.md` — Pixel (Meta önce)

- **Kaynak kararlar:**
  - Tek uygulama, platform başına modül; v1 = ortak iskelet + Meta modülü. Platform sırası: Meta → Google (GA4 + Ads) → TikTok → Pinterest → Bing; sonra Snapchat, Yandex.
  - Çekirdeğe iki eklenti: (1) vitrin müşteri olay veri yolu (11 olay: `page_viewed` … `checkout_completed`; her olayda `event_id` UUID, zaman, istemci kimliği, URL, küçük birimde tutarlar); (2) manifestte `pixels` uzantı türü, sandbox'lı iframe, onay kategorileri `analytics, marketing, preferences, sale_of_data`, yeni izin `storefront:pixel`.
  - Tekilleştirme: tarayıcı olayında `event_id` istemcide; `Purchase` için `event_id` = sipariş `public_id` (`ord_...`). Google sayfa görüntüleme yalnız tarayıcıdan. `Purchase` her zaman `order.paid` webhook'undan.
  - Eşleştirme: tıklama kimlikleri (`fbc`, `fbp`, `gclid`/`gbraid`/`wbraid`, `ttclid`/`ttp`, `epik`, `msclkid`), IP/UA ve onay durumu checkout başında rezervasyona yazılır; e-posta/telefon/ad/soyad/şehir/ülke/posta kodu normalleştirilip SHA-256 (Web Crypto); sipariş silinince/anonimleşince birlikte silinir.
  - Onay: Meta/TikTok/Pinterest/Bing/Google Ads → `marketing`, GA4 → `analytics`; kategori yoksa o platforma hiçbir şey; onay verisi yoksa varsayılan göndermemek ("yasal dayanağım var" ayarı denetim kaydına).
  - Hata: platform başına bağımsız; 4xx yeniden denenmez, 5xx/zaman aşımı üstel bekleme; `/collect` olayları uygulamanın kendi kuyruğunda, sonunda `failed`, admin'den yeniden gönderim. Yerleşim `packages/plugins/pixel/` (`src/core`, `src/platforms`, `src/admin`, `src/pixel`, `manifest.json`); öneri: ana dağıtımda Hono alt uygulaması, sözleşme (imzalı webhook, izinli token) aynı.
- **Bağımlılık:** aşama 5 madde 47 (`features/apps`, `app-sdk`, `app-bridge`, manifest, webhook imzası), outbox + `order.paid` olayı, checkout rezervasyon tablosu (tıklama kimlikleri/onay alanları), storefront olay yayını, `@openmers/ui` (admin ekranı).
- **Yapılacaklar:**
  1. ± `packages/plugins/pixel/`: yalnız `package.json` + `tsconfig.json` var; `manifest.json` (belgedeki izinler, `order.paid` webhook'u, `pixels`, `settings.page`) ve `src/index.ts` (Hono alt uygulaması) eklenecek.
  2. - Çekirdek (sıra 1): `packages/contract/src/storefront/customerEvents.ts` 11 olayın Zod şeması; `apps/storefront/src/lib/events/bus.ts` yayın; `packages/core/src/features/apps/consent/consentState.ts` (saf, 4 kategori) + vitrin minimal onay katmanı ve harici onay yazılımı adaptör alanı.
  3. - Çekirdek (sıra 2): `features/checkout/reservations/` şemasına tıklama kimlikleri, IP, UA, onay durumu sütunları (yeni eklemeli migration); `captureAttribution.ts` (saf: URL/çerezden kimlik çıkarımı); anonimleştirme akışına bu sütunlar eklenir.
  4. - Çekirdek: `features/apps/manifest/` `pixels` uzantı türü ve `storefront:pixel` izni; vitrin betiği yalnız onay varsa sandbox'lı iframe yükler, onay sonradan gelirse olayları yeniden oynatır, geri çekilirse kapatır.
  5. - `packages/plugins/pixel/src/core/`: `receiveWebhook.ts` (imza doğrulama `app-sdk` ile), `consentFilter.ts` (saf, platform→kategori tablosu veri dosyasında), `matchData.ts` (saf normalleştirme) + `hashSha256.ts` (Web Crypto), `eventLog.ts` (kendi DB'si; yeri/şeması belirsiz), `retry.ts` (saf karar: 4xx durdur, 5xx üstel bekleme), `dispatch.ts` (açık modülleri bağımsız çağırır).
  6. - `src/platforms/platform.ts`: `PixelPlatform` arayüzü (`id`, `configSchema`, `browser`, `server`, `test`) + `registry.ts`.
  7. - `src/platforms/meta/` (sıra 4): `mapEvent.ts` (saf, bölüm 5 tablosu), `capiClient.ts` (I/O), `test.ts` (test olay kodu); `value` = vergi ve kargo hariç ürün toplamı, `content_ids` varsayılan SKU, küçük birim → ondalık dönüşümü yalnız burada. API sürüm numarası tek sabit dosyada.
  8. - `src/collect/collectRoute.ts`: `POST /collect` (uygulamaya ait), kendi kuyruğu, sınırlı yeniden deneme.
  9. - `src/pixel/pixel.ts` (sandbox betiği): `openmers.subscribe`, yalnız açık platform betiklerini yükler, `eventID` = `event_id`.
  10. - `src/admin/` (React, yalnız `@openmers/ui`, `app-bridge` ile iframe): platform listesi (sunucu anahtarı yazma-yalnız), olay başına aç/kapa, olay günlüğü + yeniden gönder, bağlantıyı sına, sağlık kontrolü (24 saat tarayıcı/sunucu sayıları, sunucu `Purchase` sipariş sayısından düşükse uyarı), canlı konsol `?openmers_pixel_debug=1`.
  11. - Sonraki modüller: `src/platforms/google/` (GA4 MP, `transaction_id`, `refund`), `tiktok/`, `pinterest/`, `bing/` aynı arayüzle.
- **Testler:**
  - `integration-tests/contract/__tests__/pixel-platform.contract.ts`: sahte platform sunucusuna karşı ortak takım (yük şeması, özetlenen/özetlenmeyen alanlar, `event_id`); her modül içe aktarır.
  - `integration-tests/race/__tests__/pixel-double-webhook.test.ts`: aynı `order.paid` iki kez → platforma aynı `event_id` ile birer olay.
  - Birim: `consentFilter` (kategori yokken o platforma hiçbir şey, diğer platform etkilenmez), `matchData` + hash, `retry`, Meta `mapEvent`.
  - Atıf testi: tarayıcı yokken `Purchase` rezervasyondaki tıklama kimlikleriyle gider.
  - E2E web (`e2e/pixel.spec`): sepete ekle → ödeme → sipariş; sahte platform uçlarında `event_id` eşleşmesi. Sandbox testi: betik mağaza DOM'una/çerezlerine erişemez.
  - Elle: Meta Events Manager test koduyla.
- **Bitti sayılır:**
  - Meta CAPI `Purchase` webhook'tan, onay ve hash kurallarıyla sahte sunucuya doğru yükle gider; sözleşme testi yeşil.
  - Çift webhook yarış testi ve onay testleri yeşil.
  - Admin ekranından "bağlantıyı sına" test olayı gönderir; olay günlüğü ve yeniden gönderim çalışır.
- **Açık sorular / riskler:**
  - Belgenin 11. bölümü: iframe mi Web Worker mı; mobil olaylar v1 dışı; çerez penceresi çekirdekte mi; Google Ads yolu; katalog beslemesi; API sürüm sabitleri.
  - Platform API ayrıntıları ve Shopify Web Pixels modeli doğrulanmadı (belgedeki not); her modüle başlarken doğrulanmalı.
  - Uygulamanın kendi veritabanı (alt uygulama olarak çalışırken ana SQLite/D1 içinde ayrı tablo mu, ayrı DB mi) belirsiz; `bia_` öneki built-in app'ler için, plugin tablo öneki tanımlı değil.

### 62. `docs/10-tak-calistir-apps/02-erp.md` — ERP entegrasyonu

- **Kaynak kararlar:**
  - Sıradan (dışarıda çalışan) uygulama, `packages/plugins/erp`; ERP başına bağlayıcı, ortak çalıştırıcı (imleç, toplu iş, hız sınırı, hash). Mağaza → ERP hep outbox'tan; ERP → mağaza hep toplu idempotent uçlardan; uygulama DB'ye doğrudan yazmaz.
  - Sahiplik tablosu: katalog/fiyat/stok ERP'nin; sipariş, müşteri, iade mağazanın; sipariş durumu ERP veya mağaza; alan başına "ERP'den ez / mağazada kalsın". "Yalnız mağaza → ERP" kipi açık.
  - Çekirdek eklentileri: `external_refs` (kaynak, bağlantı_id, varlık_türü, yerel_public_id, dış_id, dış_kod, dış_sürüm/özet, durum, son_eşleşme_zamanı; kaynak uygulama önekli), toplu uçlar (`products.upsertMany`, `stock.setMany`, `prices.setMany`, `customers.upsertMany`; kayıt başına sonuç, kısmi başarı), tüm yazma uçlarında `Idempotency-Key`, `orders.list?updated_since=&cursor=`, olaylar (`order.paid`, `order.updated`, `order.cancelled`, `refund.created`, `customer.created`, `stock.low`), izinler.
  - Eşleme sırası: tablo → SKU → barkod; belirsiz kayıt asla yazılmaz, "eşleşmeyenler"e düşer; hash değişmediyse yazılmaz; silinen ERP ürünü pasife alınır.
  - Stok: ERP mutlak miktarı yalnız `on_hand`'e yazar; satılabilir = `erp_qty` − ERP'nin henüz görmediği taahhütler; yazma `stock_version` koşullu, tek `atomic()`; depo başına `onHand/reserved/blocked/safetyStock`, seçili depolar; bayat stokta uyarı (isteğe bağlı satış durdurma).
  - İş durumu `pending → processing → success`, `retrying`, `failed`, `dead_letter`; telafi yok; zaman aşımında yeniden göndermeden önce `findOrderByReference`; ERP olayları HMAC + zaman penceresi + `webhook_inbox` benzersiz kısıtı; büyük katalog sayfalı ayrı işler. Erişim kipi doğrudan veya `openmers-erp-agent` (kirala → işle → onayla).
- **Bağımlılık:** 61 ile aynı uygulama altyapısı (47); outbox ve olaylar; `features/stock` çok depolu model (`on_hand/reserved/safety`); `features/pricing` fiyat listeleri; `features/orders` imleçli liste; `Idempotency-Key` ara katmanı; 59 ile paylaşılan `external_refs` ve toplu uçlar.
- **Yapılacaklar:**
  1. ± `packages/plugins/erp/`: yalnız `package.json` + `tsconfig.json`; `manifest.json` (izinler `products:write, stock:write, prices:write, customers:write, orders:read, fulfillments:write, invoices:write`, webhook'lar) ve `src/index.ts` eklenecek.
  2. - Çekirdek: `packages/db/src/schema/external-refs.ts` + `features/apps/externalRefs/` (yaz/oku; başka uygulamanın önekine yazmayı reddeder).
  3. - Çekirdek: `apps/api/src/middleware/idempotencyKey.ts` (ince) + `features/apps/idempotency/` (anahtar → saklanan sonuç tablosu; aynı anahtar = aynı yanıt).
  4. - Çekirdek: toplu uçlar (önce `stock.setMany`): `features/stock/bulk/setMany.ts` kayıt başına sonuç, en çok N kayıt; `products.upsertMany`, `prices.setMany`, `customers.upsertMany` sırayla (59 ile ortak). `orders.list` imleç + `updated_since`.
  5. - Çekirdek: `features/stock/erp/` `erp_qty`, `erp_qty_at` alanları ve `computeSellable.ts` (saf: `erp_qty` − açık rezervasyonlar − ERP onayı olmayan ödenmiş siparişler; depo bileşenleri ve seçili depolar) + `applyErpStock.ts` (tek `atomic()`, `stock_version` koşullu, yarışta yeniden hesap).
  6. - `packages/plugins/erp/src/connector/connector.ts`: `ErpConnector` arayüzü ve yetenek tablosu; `registry.ts`.
  7. - `src/runner/`: `runPull.ts` (imleçli, sayfa başına ayrı iş, kalıcı imleç), `contentHash.ts` (saf), `match.ts` (saf: tablo → SKU → barkod, belirsizse `unmatched`), `jobState.ts` (saf durum makinesi tablosu), `backoff.ts` (saf, jitter), `runLog.ts` (okunan/yazılan/değişmeyen/hata sayıları).
  8. - `src/push/pushOrder.ts`: önce müşteri (vergi no → e-posta → "misafir cari"), sonra sipariş; referans `public_id`; gönderimden önce `findOrderByReference`; yetenek yoksa "çift sipariş riski" uyarısı. `pushRefund.ts` aynı kural (`ref_...`).
  9. - `src/inbound/`: `verifyHmac.ts` (saf, zaman penceresi), `erpEventsRoute.ts` (`POST /erp/events`, geçersizse 401), `inbox.ts` (benzersiz sağlayıcı olay kimliği), işleme kuyruktan.
  10. - `src/reconcile/reconcile.ts`: (a) ödenmiş ama ERP onayı olmayan, (b) yansımamış durumlar, (c) stok farkları; normal gönderim/çekme fonksiyonlarını çağırır, eşik aşımında bildirim.
  11. - `src/connectors/file/`: CSV/XML/JSON içe (ürün+stok+fiyat) ve sipariş dışa aktarma (SFTP/URL) — ilk bağlayıcı; ardından `odoo/` (ilk uçtan uca gerçek ERP).
  12. - `src/admin/` (`@openmers/ui`, `settings.page` + `nav.page`): bağlantı + erişim kipi, sahiplik ayarları, eşlemeler/eşleşmeyenler, çalıştırmalar (şimdi çalıştır, kuru çalıştırma), başarısızlar, uzlaştırma raporu, stok görünümü. Ajan kipi (`openmers-erp-agent`) sonra.
- **Testler:**
  - `integration-tests/contract/__tests__/erp-connector.contract.ts`: sahte ERP sunucusuna karşı, yetenek tablosuna göre ortak takım.
  - `integration-tests/race/__tests__/erp-stock-vs-checkout.test.ts`: ERP stok yazımı ile eşzamanlı rezervasyon → satılabilir stok gerçek stoğu aşmaz; ERP onayı olmayan ödenmiş sipariş stoğu geri vermez.
  - `integration-tests/race/__tests__/erp-double-order.test.ts`: aynı `order.paid` iki kez + zaman aşımı sonrası yeniden deneme → ERP'de tek sipariş.
  - Birim: `match` (aynı SKU'lu iki ERP kartı yazılmaz), `verifyHmac` (imzasız/eski zaman damgası red), `computeSellable`, `jobState`, `contentHash`.
  - Ajan: kiralama süresi dolunca kayıt yeniden verilir, çift işleme yok (ajan kipiyle birlikte).
  - Ölçek: 10.000+ ürün tam senkronu yalnız değişenleri yazar (`03-performans.md` D1 yazma sınırları).
- **Bitti sayılır:**
  - Dosya bağlayıcısıyla CSV'den ürün+stok+fiyat içe alınır, ikinci çalıştırmada değişmeyen kayıt yazılmaz (hash).
  - Stok yarışı ve çift sipariş testleri D1 ve SQLite'ta yeşil.
  - `order.paid` sahte ERP'ye `public_id` referansıyla gider, `external_refs`'e yazılır, 4xx `dead` olup admin'de görünür.
- **Açık sorular / riskler:**
  - Belgenin 14. bölümü: hedef ERP'ler, stok sahipliği, varyant eşleme kuralları, B2B/canlı fiyat (`pricing.quote`), ERP e-faturası bağlantısı, ajan dağıtımı.
  - `ATLANANLAR.md`: Reddit iddiaları doğrulanmadı; ERP API ayrıntıları (Logo, Netsis, Mikro, Paraşüt, Odoo) kontrol edilmedi; Odoo'nun Docker ile CI'da koşturulabilmesi doğrulanmadı.
  - Çift düşme riski (ERP `reserved` siparişi zaten içeriyorsa) bağlayıcı başına belgelenmeli.
  - Türkiye ERP'leri ek bağlayıcıdır; çekirdek ve iskelet global kalmalı.

### 63. `docs/10-tak-calistir-apps/03-pazaryeri-entegrasyonu.md` — pazaryeri (Trendyol aday)

- **Kaynak kararlar:**
  - ERP ile aynı desen: dışarıda çalışan uygulama, pazaryeri başına bağlayıcı (yetenek tablosu, eşleme, toplu idempotent uçlar, iş durumları, uzlaştırma, dead-letter). Admin'den tıkla-kur, deploy gerekmez.
  - Her pazaryeri hesabı bir kanaldır (`type = b2c`, alan adı yok); ürün seti, fiyat listesi, stok kaynağı ve siparişler o kanala bağlı.
  - Ürün eşleme: kategori, özellik (facet değeri → pazaryeri değer kimliği), marka; barkod zorunlu (barkodsuz varyant listelenmez); ürün başına "hazır olma" durumu ve eksik alan listesi; gönderim asenkron (istek kimliği saklanır, sonuç yoklanır).
  - Fiyat: ayrı liste veya mağaza fiyatından kuralla türetme (yüzde/sabit + yuvarlama), kaynak değişince işle yazılır. Stok: gönderilen = `satılabilir − tampon` (kanal başına), olaylar sıkıştırılır, sıfır gönderimi öncelikli; yarışta sipariş reddedilmez, "stok istisnası" ile alınır.
  - Sipariş: `orders.importExternal(order, idempotencyKey = pazaryeri sipariş no)` tek `atomic()`, stok koşullu ayrılır, fiyat yeniden hesaplanmaz, promosyon yok, `paid` + `external` ödeme yöntemi; maskeli müşteri kanala özel, pazarlama izni yok, bildirim/Pixel olayı gitmez; kargo bağlayıcının `FulfillmentHandler`'ı; kargoya verme son tarihi saklanır.
  - Çekirdek eklentileri: `orders.importExternal` + `external` ödeme yöntemi, vitrinsiz kanal, barkod (var) + "kanala hazır" metadata, olaylar `stock.available_changed` (adet; yalnız abone varsa üretilir), `price.changed`, `product.published_to_channel`, izinler `orders:import`, `stock:read`, `fulfillments:write`.
- **Bağımlılık:** 62 (ortak iskelet deseni, `external_refs`, `Idempotency-Key`, toplu uçlar, iş durum makinesi); `features/channels` (vitrinsiz kanal), `features/stock` (kanal–depo ataması, rezervasyon), `features/orders`, `features/payments`, `features/fulfillment` (`FulfillmentHandler` portu), `features/notify` + 61 (bildirim/Pixel bastırma), e-fatura (50).
- **Yapılacaklar:**
  1. - Paket yok: `packages/plugins/marketplace/` (`package.json`, `manifest.json`, `src/index.ts`) açılır; `04-monorepo-klasor-yapisi.md`'de `plugins/` altında yalnız `pixel` ve `erp` var, belgeye eklenmesi gerekir.
  2. - Çekirdek: `features/channels/` vitrinsiz kanal (alan adı zorunlu değil) + doğrulama.
  3. - Çekirdek: `features/orders/import/importExternal.ts` (tek `atomic()`, idempotency anahtarı = pazaryeri sipariş no, stok koşullu ayrılır; yetmezse `stock_exception` işaretiyle yine yazılır) + `features/payments/` `external` ödeme yöntemi (iade mağazadan başlatılamaz).
  4. - Çekirdek: olaylar `events.ts` dosyalarında: `stock.available_changed` (abone sayısı > 0 ise üretilir; `shouldEmit.ts` saf), `price.changed`, `product.published_to_channel`; izinler `orders:import`, `stock:read`, `fulfillments:write`.
  5. - Çekirdek: kanala özel müşteri ve "pazarlama izni yok" + bildirim/Pixel bastırma kuralı (`features/customers` ve `features/notify` içinde kaynak kanal kontrolü).
  6. - `src/connector/connector.ts`: `MarketplaceConnector` arayüzü (yetenekler `webhooks, invoiceUpload, ownCargo, returns, qa`) + `registry.ts`; sahte bağlayıcı `src/connectors/fake/`.
  7. - `src/mapping/`: `categoryMap.ts`, `attributeMap.ts`, `brandMap.ts` (saf eşleme + eksikler listesi), `readiness.ts` (saf: barkod, zorunlu özellikler → hazır/eksik alanlar).
  8. - `src/listing/pushListings.ts` + `pollListingRequest.ts`: asenkron gönderim, istek kimliği saklama, ürün başına ret nedeni.
  9. - `src/pricing/derivePrice.ts` (saf: yüzde/sabit + yuvarlama, küçük birim tamsayı) + kaynak fiyat değişince hedef listeye yazan iş.
  10. - `src/stock/`: `coalesce.ts` (saf: aynı varyant için bekleyen gönderim varsa ekleme), `buildStockPush.ts` (satılabilir − tampon, gönderim anında güncel değer, sıfır önceliği), hız sınırlı toplu gönderim işi, periyodik uzlaştırma.
  11. - `src/orders/pullOrders.ts` (webhook varsa `verifyWebhook`, yoksa kısa aralıkla yoklama) → `importExternal`; kargoya verme son tarihi uyarı işi; `src/claims/` iptal/iade talepleri → mağaza iade kaydı, karar pazaryerine.
  12. - `src/admin/` (`@openmers/ui`): bağlantılar, kategori/özellik/marka eşleme, hazır olma listesi + toplu gönderim, fiyat kuralı, stok tamponu, son tarih uyarıları, hatalı işler, stok uzlaştırma raporu. İlk gerçek bağlayıcı `src/connectors/trendyol/` (kullanıcı onayından sonra).
- **Testler:**
  - `integration-tests/race/__tests__/marketplace-double-order.test.ts`: aynı pazaryeri siparişi iki kez (eşzamanlı) → tek sipariş.
  - `integration-tests/core/__tests__/import-external-stock-exception.test.ts`: stok yetersizken sipariş reddedilmez, istisnayla içe alınır.
  - Birim: `coalesce` (sıkıştırılmış gönderim son değeri gönderir), `readiness` (eşlenmemiş zorunlu özellik → gönderilmez), `derivePrice`.
  - `integration-tests/core/__tests__/marketplace-customer-suppression.test.ts`: maskeli müşteriye bildirim ve Pixel olayı (outbox satırı) üretilmez.
  - `integration-tests/contract/__tests__/marketplace-connector.contract.ts`: sahte bağlayıcı üzerinde ortak takım; hız sınırı (429) altında toplu gönderimin sürmesi.
  - `stock.available_changed` abonesiz mağazada hiç yazılmaz (outbox satır sayısı).
- **Bitti sayılır:**
  - Sahte bağlayıcıyla uçtan uca: ürün hazır olma → listeleme → sipariş içe alma → kargo bildirimi.
  - Çift sipariş ve stok istisnası testleri D1 ve SQLite'ta yeşil.
  - Pazaryeri kullanmayan mağazada ek olay/yazma yok (test ile ölçülür).
- **Açık sorular / riskler:**
  - Belgenin 13. bölümü: ilk pazaryeri (Trendyol aday, `ATLANANLAR.md`'ye göre hâlâ kullanıcı onayı bekliyor), komisyon/hakediş kapsamı, pazaryeri müşterilerinin raporlarda ayrımı, tampon adet mi yüzde mi.
  - Pazaryeri API'leri (uçlar, hız sınırları, kategori zorunlulukları) doğrulanmadı.
  - Pazaryerleri Türkiye'ye özgü ek modül niteliğinde; çekirdek eklentileri (vitrinsiz kanal, `importExternal`, `external` ödeme) global kalmalı, Trendyol'a özel alan çekirdeğe girmemeli.

---

## Bu gruptan ilk başlanacak 3 alt görev

1. **55.2 + 55.1:** imaj adını eşitle ve `apps/*` derleme script'leri gelir gelmez Dockerfile'ı yerelde derleyip `/healthz` duman testiyle çalıştır (en ucuz, mevcut iskeleti doğrular; aşama 1'in Node girişine bağlı).
2. **57.1 + 57.2:** `formatLogLine` / `redactPersonal` / `requestId` (saf, aşama 1'deki `Ctx` ile birlikte yazılabilir; sonraki her feature'ın logu buna oturur, PII testi erken kurulur).
3. **62.2 + 62.3:** `external_refs` tablosu ve `Idempotency-Key` ara katmanı (59, 62 ve 63'ün ortak çekirdek ön koşulu; tek seferde yazılınca üç madde birden açılır).
