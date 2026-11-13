# Aşama 0 ve 1: araç zinciri, tasarım sistemi, veri ve çekirdek omurga

**Grubun amacı.** Aşama 0 (madde 1-4) her değişikliği denetleyen araç zincirini ve admin'in tek tasarım sistemini (`@openmers/ui`) bitirir. Aşama 1 (madde 5-13) her ticaret özelliğinin üstüne kurulacağı omurgayı yazar: `Platform` + `atomic()`, `packages/db`, yapılandırma, `Ctx` + `packages/contract`, outbox, önbellek, yetki/denetim/kasa, kimlik doğrulama. Aşama 2'deki hiçbir madde (14-30) bunlar olmadan gerçek veri okuyamaz.

**Durum (2026-11-13, kod görülerek doğrulandı).** Kökte pnpm workspace, Biome, Vitest (`unit` + `ui` projeleri), Changesets (`fixed: [["@openmers/*"]]`), `.nvmrc`, `scripts/check-file-size.sh` (250 satır), `e2e.config.ts`, `e2e.mobile.config.ts`, `e2e/smoke.e2e.ts`, `.mcp.json` var. `packages/tokens` (tokens.json + `build-theme.mjs` + testler) ve `packages/ui` (45 bileşen klasörü, 49 test dosyası, playground) dolu. `packages/core/src` içinde yalnızca `index.ts` ve 25 `features/*/index.ts` yer tutucusu (`export {}`) var; `platform/`, `ctx/`, `config/`, `extend/`, `events/`, `jobs/` klasörleri yok. `packages/db`, `packages/contract`, `packages/test-utils`, `integration-tests/helpers` yalnızca `export {}`. `apps/*/src` boş (`apps/api/src` altındaki `admin/ hooks/ platform/ shop/ worker/` klasörleri boş ve git'te izlenmiyor). Kökte `typescript`, `svelte-check`, `drizzle-orm`, `hono`, `@orpc/*`, `zod`, `better-auth`, `@cloudflare/vitest-pool-workers`, `better-sqlite3` kurulu değil.

**Bağımlılık özeti.**

```
1 (tip denetimi, node:* lint, sürüm sabitleme) ─┬─> 6 (db) ─> 5 (Platform, atomic) ─┬─> 9 (outbox) ─┐
2 (CI) <── 1, 3                                 │                                  ├─> 7 (config) ─┤
3 (test-utils, kapılar) <── 6, 5                │                                  └─> 8 (Ctx, contract) ─> 10 (önbellek) ─> 11 (yetki) ─> 12 (auth)
4 (ui) bağımsız; lint kuralı admin (31) gelmeden hazır olmalı
13 (monorepo yüzeyi) 5-12 boyunca her maddeyle birlikte ilerler
```

Kısaltma: `core` = `packages/core/src`, `api` = `apps/api/src`. Her yeni dosya ≤250 satır (hedef 150), dışa açılan yüzey klasörün `index.ts`'i; saf mantık ile I/O ayrı dosyada; handler ≤40 satır ve iş kuralı içermez (`.claude/skills/backend/openmers-backend-structure`, `database/openmers-db-structure`, `tests/openmers-testing`).

---

## Aşama 0: araç zinciri ve tasarım sistemi

### 1. `docs/01-tech-stack/01-tech-stack.md` — teknoloji yığını ve araçlar

- **Kaynak kararlar:**
  - İki çalışma hedefi, tek kod: Node/Bun + SQLite + yerel disk ve Cloudflare Workers + D1 + R2.
  - Backend kodunda `node:*` yok; yalnızca Fetch, Web Crypto, Streams.
  - Backend: Hono, oRPC v2 (`oc` + `implement`; `/rpc` RPCHandler, `/api` OpenAPIHandler), Drizzle ORM 0.45.x `sqlite-core`, drizzle-kit, Zod, Better Auth.
  - Araçlar: Biome + `svelte-check`, Vitest + `@cloudflare/vitest-pool-workers` (D1/R2 gerçek ortam), `e2e` (web + mobil), GitHub Actions, Changesets, pnpm workspaces (Turborepo yalnızca ihtiyaç olunca).
  - Bilinen kısıtlar: D1'de interaktif transaction yok (yalnız `batch()`, koşullu `UPDATE ... WHERE stock >= ?`); D1 başına 10 GB; Workers CPU/paket sınırı; para tamsayı küçük birim + para birimi kodu.
  - Lisans MIT (çekirdek, built-in app, SDK/UI/contract).
- **Bağımlılık:** yok (temel madde).
- **Yapılacaklar:**
  1. `+` pnpm workspace: `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `packages/modules/*`, `packages/plugins/*`, `integration-tests/*`), `packageManager: pnpm@10.34.9`, `.nvmrc`, `engines.node >=22`.
  2. `+` Biome (`biome.json`, `pnpm lint`) ve `scripts/check-file-size.sh` (`pnpm check:size`, 250 satır).
  3. `+` Vitest kök yapılandırması `vitest.config.ts` (`unit` Node, `ui` jsdom); Changesets (`.changeset/config.json`).
  4. `+` `e2e` araçları: `e2e.config.ts` (web, storefront `dev` komutuna bağlı), `e2e.mobile.config.ts` (Android), `.mcp.json`.
  5. `±` Tip denetimi: kök `devDependencies`'e `typescript`; her pakete `"typecheck": "tsc -p tsconfig.json"`; kökte `"typecheck": "pnpm -r --if-present typecheck"` ve `verify` sırası `lint → check:size → typecheck → test`. (`tsconfig.base.json` hazır: `strict`, `noUncheckedIndexedAccess`, `noEmit`.)
  6. `-` `svelte-check`: `packages/ui/package.json`'a `"check": "svelte-check --tsconfig ./tsconfig.json"`; `apps/admin` ve `apps/storefront` gelince aynısı; kök `typecheck` bunları da çağırır.
  7. `-` `node:*` yasağı: `biome.json` `overrides` ile `packages/core/**`, `packages/db/src/**` (migration çalıştırıcı hariç), `packages/contract/**`, `apps/api/src/**` için `correctness/noNodejsModules` hata; istisna `apps/api/src/platform/node.ts` ve `apps/api/src/platform/node/**` (belge 01-platform §2).
  8. `-` Çekirdek bağımlılıklarını npm'den teyit edip **tam sürümle** sabitleme: `hono`, `@orpc/contract|server|client|openapi` (v2 beta, tam sürüm), `drizzle-orm@0.45.x`, `drizzle-kit`, `zod@4`, `better-auth` → ilgili paketlerin `package.json`'ına (core/db/contract/api); `better-sqlite3` yalnız `apps/api` ve `packages/test-utils`; `wrangler`, `@cloudflare/vitest-pool-workers` kök dev.
     - Kısmen yapıldı (2026-11-13, `npm view` ile teyitli): `packages/db` → `drizzle-orm` 0.45.4, dev `drizzle-kit` 0.31.11; `better-sqlite3` 13.1.1 + `@types/better-sqlite3` 9.6.0 geçici olarak `packages/db` dev (şema testi; `test-utils` gelince taşınır). Kalan: `hono`, oRPC, `zod`, `better-auth`, `wrangler`, pool-workers.
  9. `-` Derleme adımı: yayınlanacak paketlere ve `apps/*`'a `build` script'i; kökte `"build": "pnpm -r --if-present build"` ve `verify` sonuna eklenir (`deploy/docker/Dockerfile` zaten `pnpm --filter ... build` çağırıyor).
  10. `-` `scripts/bundle-size.sh` çıktısını Workers paket sınırına karşı eşikli hale getirme (`apps/api/dist` için üst sınır, aşılırsa çıkış kodu 1); eşik değeri ölçümden sonra.
- **Testler:** `pnpm verify` yeşil. `noNodejsModules` için bir kerelik doğrulama: `packages/core` içine `import "node:fs"` yazılınca `pnpm lint` kırılmalı (CI'da değil, kural eklenirken elle). Tip denetimi için bilinçli bir tip hatası `pnpm typecheck`'i kırmalı.
- **Bitti sayılır:**
  - `pnpm verify` lint, boyut, tip (tsc + svelte-check), birim ve derlemeyi çalıştırır.
  - `packages/core` veya `apps/api/src` (platform/node hariç) içinde `node:` importu lint hatasıdır.
  - Hono, oRPC, Drizzle, Zod, Better Auth sürümleri `package.json`'da tam sabittir ve lockfile'dadır.
- **Açık sorular / riskler:**
  - oRPC v2 hâlâ `beta`; Drizzle v1'in migration klasör düzeninin `wrangler d1 migrations apply` ile uyumu doğrulanmadı (02-api §7).
  - Better Auth eklentilerinin (2FA, passkey, organization, bearer) adları ve D1 uyumu doğrulanmadı (08-kimlik).
  - Varsayılan dil EN olarak kapatıldı (`01-tech-stack.md` güncellendi).
  - "Resmî built-in app'ler" listesi Türkiye ağırlıklı (iyzico, PayTR, Yurtiçi, Paraşüt); global varsayılan Stripe + e-posta olmalı, Türkiye ek modül. Çekirdekte yalnız port + pazardan bağımsız varsayılan kalır.
  - Biome'un `.svelte` dosyalarındaki betik desteği kısmi; Svelte tarafı için `svelte-check` şart.

### 2. `docs/08-isletme/02-ci-cd.md` — GitHub Actions iş akışları

- **Kaynak kararlar:**
  - `verify`: her PR ve `main`; lint (Biome, svelte-check), tip, birim + entegrasyon (D1 **ve** SQLite), derleme.
  - `e2e-web`: PR (etiketli) ve `main`; `e2e-mobile`: `main` ve sürüm etiketi, Android emülatör + EAS apk.
  - `deploy-cloudflare`: `main` → hazırlık, etiket → üretim; önce `wrangler d1 migrations apply`, sonra Worker deploy.
  - `release-docker` (Node + Litestream, GHCR, imaj açılışta migration uygular), `release-mobile` (EAS Build/Submit, JS-only'de EAS Update), `release-packages` (Changesets).
  - Kurallar: üretim deploy'u yalnız etiketten; sırlar GitHub Secrets'ta; `verify` yeşil olmadan birleştirme yok; `backup:verify` haftalık zamanlanmış işte.
- **Bağımlılık:** madde 1 (typecheck, build), madde 3 (entegrasyon koşucusu), madde 6 (migration klasörü), madde 33 (storefront `dev`), madde 35 (mobil).
- **Yapılacaklar:**
  1. `+` `.github/workflows/verify.yml`: PR + `main`, `pnpm install --frozen-lockfile && pnpm verify`.
  2. `±` `.github/workflows/release-docker.yml`: etiket `v*` → GHCR. İş akışı var, ama `deploy/docker/Dockerfile` hiçbir pakette olmayan `build` script'lerini ve `packages/db/migrations` klasörünü bekliyor; etiket atılırsa kırılır (madde 1.9 ve 6 bitince yeşillenir).
  3. `±` `.github/workflows/e2e-web.yml`: yalnız `workflow_dispatch`. Storefront `dev` gelince `pull_request` (etiket `e2e`, `if: contains(github.event.pull_request.labels.*.name, 'e2e')`) ve `push: main` açılır.
  4. `±` `.github/workflows/e2e-mobile.yml`: yalnız `workflow_dispatch`; Android emülatör adımı (örn. `reactivecircus/android-emulator-runner`), EAS ile derlenen `.apk` kurulumu ve `e2e.mobile.config.ts` içindeki gerçek `bundleId` (şu an yer tutucu `com.openmers.app`) eksik; tetikleyici `main` + etiket.
  5. `-` `verify.yml`'ye entegrasyon testleri: madde 3'teki `integration` projesi (SQLite + Miniflare D1) `pnpm verify` içinden koşar; ayrı adım gerekmez, yalnızca süre izlenir.
  6. `-` `.github/workflows/deploy-cloudflare.yml`: `main` → `environment: staging`, etiket → `environment: production`; adımlar `wrangler d1 migrations apply <db> --remote` → `wrangler deploy`; `CLOUDFLARE_API_TOKEN` Secrets'tan.
  7. `-` `.github/workflows/release-packages.yml`: `changesets/action`; önce yayınlanacak paketler (`@openmers/ui`, `contract`, `app-sdk`, `app-bridge`, `create-openmers-app`, `create-openmers-theme`, `theme-kit`) için `private: true` kaldırma kararı (şu an hepsi `private`).
  8. `-` `.github/workflows/release-mobile.yml`: etikette EAS Build + Submit; yalnız JS değiştiyse EAS Update (madde 35 ile).
  9. `-` `.github/workflows/backup-verify.yml`: haftalık `schedule`; `scripts/backup-verify.sh` (Litestream'den geçici dizine geri yükle + `PRAGMA integrity_check` + migration tablosu sürümü). Betik yok, `08-isletme/01-self-host.md` ile birlikte yazılır.
  10. `-` `.github/workflows/perf-nightly.yml`: `main` üzerinde her gece k6 (madde 3.12); p95 eşiği aşılırsa uyarı (performans §8).
  11. `-` Depo ayarı: `main` dal koruması, `verify` zorunlu kontrol (kod değil, GitHub ayarı; raporla yapılır).
- **Testler:** her iş akışı bir dalda gerçekten koşturulur; `release-docker` için önce yerelde `docker build -f deploy/docker/Dockerfile .`; `deploy-cloudflare` ilk kez yalnız staging'e. `backup-verify.sh` boş olmayan bir veritabanıyla geri yüklemede satır sayısını karşılaştırır.
- **Bitti sayılır:**
  - Belgedeki 7 iş akışının hepsi `.github/workflows/` altında ve en az bir kez yeşil koştu.
  - Üretim deploy'u yalnız etiketle tetiklenir (`on.push.tags`), `main` yalnız staging'e gider.
  - Haftalık `backup:verify` son 7 gün içinde yeşil.
- **Açık sorular / riskler:**
  - `e2e` testleri LLM ajanı kullanıyor (`OPENCODE_API_KEY`); her PR'da maliyet ve kararsızlık; bu yüzden etiketli PR kuralı korunmalı.
  - `e2e-mobile` için EAS Workflows mı GitHub emülatörü mü (01-tech-stack "CI'da EAS Workflows" diyor, CI/CD belgesi "Android emülatör" diyor) kararı yok.
  - D1 migration'ı Worker'dan önce uygulanıyor; eklemeli migration kuralı (madde 6) ihlal edilirse eski Worker kırılır, bu kural CI'da denetlenmeli (madde 6.9).

### 3. `docs/08-isletme/03-test.md` — test katmanları ve kapılar

- **Kaynak kararlar:**
  - Katmanlar: birim (saf `core`, `db` ve sırlar parametre), entegrasyon (gerçek D1 Miniflare **ve** gerçek SQLite, aynı test iki hedefte), yarış (tam bir kazanan), sözleşme (sızıntı kapısı, tema, önbellek politikası), e2e web + mobil.
  - Klasör: `integration-tests/{api,core,race,contract,helpers}`, koşucu `packages/test-utils` (taze D1/SQLite, tohum veri).
  - Ek kapılar: sorgu planı (`EXPLAIN QUERY PLAN`, tam tarama yok), tur bütçesi (istek başına sayaç), sözleşme testleri (her strateji/operasyon/port), segment sızıntısı, sahiplik, yük (k6, 10.000 ve 100.000 ürün).
  - Bileşen testleri: Vitest + `@testing-library/svelte` + jsdom; rol ve erişilebilir ada göre sorgu, `userEvent`.
  - Veritabanı mock'lanmaz; zaman ve rastgelelik `Ctx`'ten gelir.
- **Bağımlılık:** madde 6 (migration'lar), madde 5 (Platform; sayaç onu sarar). Yardımcıların saf kısımları önce yazılabilir.
- **Yapılacaklar:**
  1. `+` Vitest `unit` ve `ui` projeleri (`vitest.config.ts`), `packages/ui/src/test/setup.ts`; 49 bileşen testi koşuyor.
  2. `±` E2E: `e2e.config.ts` + `e2e/smoke.e2e.ts` var, ama `@openmers/storefront-app` içinde `dev` script'i yok, duman testi koşamıyor (madde 33'e bağlı).
  3. `±` `packages/test-utils/src/sqlite.ts`: `better-sqlite3` `:memory:` veritabanı, `packages/db/migrations` uygulanır, madde 5'teki Node `Platform` ile sarılır.
  4. `-` `packages/test-utils/src/d1.ts`: Miniflare izole D1 (veya `@cloudflare/vitest-pool-workers`), aynı migration'lar, Cloudflare `Platform`.
  5. `±` `packages/test-utils/src/runner.ts`: `describeOnTargets(name, (getPlatform) => {...})`; aynı test gövdesini `sqlite` ve `d1` için iki kez kaydeder, her testte taze veritabanı. `index.ts` yalnız bunu ve yardımcıları dışa açar.
  6. `-` Kök `vitest.config.ts`'ye üçüncü proje `integration` (`include: ["integration-tests/**/__tests__/**/*.test.ts"]`); D1 için gerekiyorsa ayrı `integration-d1` projesi (pool-workers) — madde 2.5 bunu `verify`'a bağlar.
  7. `-` `packages/test-utils/src/roundTrips.ts`: `Platform`'un `db`/`readDb`/`batch`/`atomic` çağrılarını sayan sarmalayıcı + `expectRoundTrips(fn, n)` (performans §3 bütçesi: liste 1, ürün 1, sepet 2, rezervasyon 1 atomic, settlement 1 atomic).
  8. `+` `packages/test-utils/src/queryPlan/parseQueryPlan.ts` (saf: `EXPLAIN QUERY PLAN` satırlarından `SCAN <tablo>` ama `USING INDEX`/`USING COVERING INDEX` içermeyen düğümleri bulur) + `assertNoFullScan.ts` (I/O: sorguyu `EXPLAIN QUERY PLAN` ile çalıştırır).
  9. `-` `integration-tests/core/__tests__/indexes.test.ts`: `sqlite_master`'dan beklenen indeks listesini doğrular ("indeks varlığı" kapısı, performans §8).
  10. `-` `integration-tests/helpers/race.ts`: `expectExactlyOneWinner(results, loserCode)`; `Promise.all` ile yarışan çağrıların tam birinin `ok` olduğunu ve kaybedenin belgelenen kodu aldığını doğrular.
  11. `-` `integration-tests/helpers/seed/`: `createChannel.ts`, `createAdminUser.ts`, `createCustomer.ts` (madde 6/12 tabloları gelince); testlerde ham SQL yok.
  12. `-` `perf/k6/` (catalog-list, product-page, cart, parallel-checkout) + `perf/seed/` (10.000 / 100.000 ürün): aşama 2 uçları gelince yazılır; ilk betik madde 15 (katalog listesi) ile.
  13. `-` Log'da kişisel veri kapısı (testing skill §8): `packages/test-utils/src/captureLogs.ts` + e-posta deseni taraması; ilk kullanım madde 12 testlerinde.
- **Testler:** `parseQueryPlan.test.ts` (tam tarama/indeksli/kapsayan indeks örnek çıktıları), `roundTrips.test.ts` (sayaç doğru artıyor), runner'ın kendisi için `integration-tests/core/__tests__/runner.test.ts` (iki hedefte `SELECT 1`, testler arası veri sızmıyor).
- **Bitti sayılır:**
  - Aynı entegrasyon test gövdesi SQLite ve Miniflare D1'de koşuyor ve `pnpm verify` içinde.
  - Bilerek indekssiz bir sorgu `assertNoFullScan` ile kırılıyor, indeksli hali geçiyor.
  - Bütçeyi aşan örnek akış `expectRoundTrips` ile kırılıyor.
- **Açık sorular / riskler:**
  - `@cloudflare/vitest-pool-workers`'ın kurulu Vitest 5.1.0 ile uyumu doğrulanmadı; uyumsuzsa D1 yalnız Miniflare API'siyle Node havuzunda koşar.
  - Miniflare D1 `batch()` atomikliğinin gerçek D1'i temsil edip etmediği doğrulanmadı (`ATLANANLAR.md`: "D1 batch atomikliği · Doğrulanmadı").
  - Belge `@testing-library/*` + jsdom seçimini "doğrulanmadı" diyor; pratikte 49 bileşen testi bununla koşuyor, belge güncellenebilir. Görsel (açık/koyu) anlık görüntü jsdom'da yapılamaz (madde 4.11).
  - `@openmers/testing` (built-in app geliştiricileri için) önerildi, yazılmadı (`ATLANANLAR.md` satır 59); `test-utils` ile ilişkisi kararsız.

### 4. `docs/07-istemciler/07-ui-kutuphanesi.md` — `@openmers/ui`

- **Kaynak kararlar:**
  - Bölüm 1.1: klasik admin ve AI ile üretilen admin yalnızca `@openmers/ui` bileşenleri ve `theme.css` jetonlarını kullanır; ham HTML bileşeni, satır içi renk, başka UI kütüphanesi, ayrı CSS yok. Denetim lint ile (kural henüz yok).
  - Paket yapısı: `src/components`, `src/hooks`, `src/utils` (cn, para/tarih/adet biçimleyicileri), `src/theme.css` (üretilir), `src/icons.ts` (Lucide, 20 px).
  - DataTable tamamen denetimli (`state` + `on…Change`); süzgeç türleri `select`, `radio`, `date` + bizim `boolean`, `number-range`; sayfalama imleç esaslı, `rowCount` isteğe bağlı; süzgeç durumu URL'ye yazılır.
  - `usePrompt` → tek `<PromptHost />` + `prompt({ title, description, verificationText? })`; `useToggleState` yazılmaz.
  - Jetonlar: `packages/tokens/src/tokens.json` tek kaynak; Medusa `ui-preset` 2.22.6 değerleri (90 renk, 23 gölge, 35 tipografi), shadcn adları; `theme.css` ve bileşenler birlikte sürümlenir.
  - Test: bileşen başına görsel regresyon (açık/koyu), klavye ve rol, `...rest` geçişi; ağaç sallama bütçesi.
- **Bağımlılık:** madde 1 (svelte-check, lint altyapısı). Admin (31) ve builder (36) bu maddeye bağlı.
- **Yapılacaklar:**
  1. `+` Jetonlar: `packages/tokens/src/tokens.json`, `mapping.md`, `build-theme.mjs` → `packages/ui/src/theme.css`; kök `NOTICE`; testler `build-theme.test.ts`, `index.test.ts`, `packages/ui/src/theme.test.ts`.
  2. `+` Bileşenler: `packages/ui/src/components/` altında 45 klasör (Alert … Tooltip, CommandBar, CurrencyInput, StatusBadge, ProgressTabs/Accordion, Copy, CodeBlock, InlineTip, IconBadge, Prompt + `PromptHost`, Toast); `cn` (`src/utils/cn.ts`).
  3. `+` DataTable: `create-data-table.svelte.ts`, `create-column-helper.ts`, `create-filter-helper.ts`, `create-command-helper.ts`; süzgeç türleri `radio/select/date/multiselect/number-range/boolean`; `rowCount` yoksa yalnız önceki/sonraki (`DataTable.test.ts` doğruluyor).
  4. `±` Galeri (`pnpm --filter @openmers/ui playground`) açık; görsel kontrol elle yapıldı. Belge 5.1'deki "her bileşenin yanında örnek dosyası + paket `README.md`": `fixtures/` var, `packages/ui/README.md` yok.
  5. `-` `packages/ui/src/icons.ts`: Lucide yeniden dışa aktarımı, 20 px varsayılan; `package.json` `exports["./icons"]`. Kod `@lucide/svelte` kullanıyor, belge `lucide-svelte` diyor; belge düzeltilir.
  6. `-` Tarih bileşenlerinde sabit `locale = "tr"` kaldırılır (`date-picker/DatePicker.svelte:50`, `time-input/TimeInput.svelte:22`, fixture'lar): varsayılan üst bağlamdan (`src/utils/locale.ts` + kök sağlayıcı) gelir, yoksa `navigator.language`; global varsayılan.
  7. `-` `src/utils/format/`: `formatMoney.ts` (küçük birim tamsayı + para birimi kodu → `Intl.NumberFormat`, ondalık basamak para biriminden), `formatDate.ts`, `formatQuantity.ts`; her biri ayrı saf dosya + test.
  8. `-` Eksik yönetici bileşenleri: `components/money/Money.svelte` (7'yi kullanır), `components/form-field/FormField.svelte` (Superforms bağlayıcı, hata `aria-invalid`'e bağlanır).
  9. `-` Görsel fark kararı: Medusa'dan çıkarılan sınıflar (`select/variants.ts:51` `bg-ui-border-component`, `switch/variants.ts:3` `after:bg-switch-off-hover-gradient`, `button/variants.ts:4` gradient `after:*` + `shadow-buttons-colored`) için ya jeton `tokens.json`'a eklenir ya da fark belgelenir; karar `mapping.md`'ye yazılır.
  10. `-` DataTable URL durumu: `components/data-table/url-state.ts` saf `serializeTableState` / `parseTableState` (süzgeç, sıralama, arama, imleç); bağlama admin'de yapılır (bileşen veri ve URL'ye dokunmaz).
  11. `-` DataTable sütun sürükle-bırak (YOL-HARITASI maddesi; belgede yok): `components/data-table/column-order.ts` saf yeniden sıralama + bileşen; kütüphane kararı (`@dnd-kit/dom` çerçeveden bağımsız mı, yoksa yerel HTML5 DnD + klavye) önce.
  12. `-` Bölüm 1.1 lint kuralı: `scripts/check-admin-ui.sh` (veya Biome GritQL eklentisi) `apps/admin/src/**` ve builder çıktı klasöründe: `@openmers/ui` / `@openmers/admin-sdk/ui` dışı UI içe aktarımı (`bits-ui`, `@lucide/svelte` doğrudan, başka kütüphaneler), ham renk (`#hex`, `rgb(`, `hsl(`, `oklch(`), keyfi Tailwind değeri (`bg-[...]`, `text-[#...]`), `<style>` bloğu reddedilir; `pnpm verify`'a eklenir.
  13. `-` Görsel regresyon (açık/koyu): araç kararı (Vitest browser modu + Playwright ya da `e2e` galerisi); ilk 5 bileşen için anlık görüntü.
  14. `-` Ağaç sallama bütçesi: `packages/ui/scripts/size-check.mjs` tek bileşen (`Button`) içe aktaran giriş noktasını Vite ile derler, çıktı boyutu eşiği; `pnpm verify`'a.
  15. `-` Paket dağıtımı: `peerDependencies: { svelte }`, `dist/` derlemesi (`@sveltejs/package`) ve `exports` (`.`, `./theme.css`, `./icons`); iframe app'ler `@source ".../@openmers/ui/dist"` kullanır (bölüm 3).
- **Testler:** var olan 49 test korunur; yeni: `utils/format/*.test.ts`, `Money.test.ts`, `FormField.test.ts` (`aria-invalid`), `url-state.test.ts` (gidiş-dönüş), tarih bileşenlerinde yerel değişimi; lint betiği için `scripts/check-admin-ui.test.sh` benzeri örnek ihlal dosyasıyla kırılma; açık/koyu anlık görüntü.
- **Bitti sayılır:**
  - `apps/admin` içine ham renk veya `bits-ui` importu konulunca `pnpm verify` kırılır.
  - Hiçbir bileşen kaynağında sabit `"tr"` yerel değeri yok (`grep -rn 'locale = "tr"' packages/ui/src` boş).
  - `Button` tek başına içe aktarıldığında paket bütçesi içinde; `svelte-check` sıfır hata.
  - Belgedeki yönetici bileşenlerinin hepsi (Money, FormField dahil) pakette ve testli.
- **Açık sorular / riskler:**
  - `FormField` Superforms'a bağlanırsa `@openmers/ui` SvelteKit/Superforms bağımlılığı kazanır; iframe app'ler için ağır olabilir. Alternatif: bağlayıcı `admin-sdk`'da.
  - `formatMoney` hem `@openmers/ui`'de hem `core`'daki `formatPrice()`'ta (madde 6) olursa iki yuvarlama/biçim kaynağı oluşur; tek kaynak kararı gerekli.
  - Medusa API tabloları boş geldi: varyant/prop adları, `StatusBadge` renk listesi okunamadı; Tailwind 4 ile gerçek derleme yalnız galeride denendi.
  - `@openmers/admin-sdk` paketi belgede var, `packages/` altında yok (madde 13.8).

---

## Aşama 1: veri ve çekirdek omurga

### 5. `docs/03-cekirdek/01-platform-arayuzu.md` — `Platform` ve `atomic()`

- **Kaynak kararlar:**
  - `core` ihtiyacını `ctx` üzerinden alır, global `env` okumaz; `apps/api` açılışta hedefe göre tek `Platform` kurar.
  - Alanlar: `db`, `readDb`, `atomic(stmts)`, `batch(queries)`, `storage`, `cache`, `purge(tags)`, `enqueue(job)`, `rateLimit(key)`, `secrets.kek`, `images` (CF ve self-host karşılıkları tabloda).
  - `atomic()`: ifadeler sırayla ve tek birim; biri hata verirse hiçbiri kalmaz; ifadeler koşullu (`WHERE EXISTS`, `WHERE token = ?`); dönüş her ifadenin etkilediği satır sayısı; süreç içi kilit yok. Self-host'ta interaktif transaction kullanılmaz.
  - İki hedefte çalışmayan özellik `core`'a girmez; binding yoksa sessizce devre dışı kalan built-in app olur.
  - `node:*` yalnız `apps/api/src/platform/node.ts` ve Node adaptörlerinde. Kipler: API (Worker `fetch` / `node dist/server.js`), iş tüketicisi (Queue consumer + Cron / aynı süreç, `--worker` ile ayrı).
- **Bağımlılık:** madde 1 (sürümler, `noNodejsModules`), madde 6.1-6.2 (Drizzle kurulumu ve şema tipi).
- **Yapılacaklar:**
  1. `+` `core/platform/types.ts`: `Platform` arayüzü (yalnız tip); `images` isteğe bağlı (`images?:`), `secrets: { kek?: CryptoKey | string }` (yoksa kasa uykuda, madde 11).
  2. `+` `core/platform/ports/`: `storage.ts` (`put/get/delete/head`), `cache.ts` (`get/set/delete`, TTL), `queue.ts` (`enqueue`), `rateLimit.ts` (`limit(key) → { ok, retryAfter }`), `images.ts`, `purge.ts`; her biri yalnız tip; `ports/index.ts`.
  3. `+` `core/platform/atomic.ts`: `AtomicStatement` ve `AtomicResult = number[]` tipleri + saf yardımcılar `allAffected(result)`, `affected(result, i)` ("kazandım mı" okuması).
  4. `+` `core/platform/memory/lru.ts`: saf, çalışma zamanından bağımsız LRU (boyut sınırı + TTL, `now` parametre); self-host `cache` ve istek ömürlü önbellek bunu kullanır.
  5. `+` `core/platform/memory/fixedWindow.ts`: saf bellek içi hız sınırı sayacı (self-host `rateLimit`).
  6. `+` `api/platform/node/sqlite.ts`: `better-sqlite3` yazma bağlantısı + salt-okunur ikinci bağlantı; pragmalar `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout`, `foreign_keys=ON` (performans §7).
  7. `+` `api/platform/node/atomic.ts`: ifadeleri tek senkron transaction'da çalıştırır, satır sayılarını döner; `batch` sırayla.
  8. `-` `api/platform/node/storage-disk.ts` (yerel disk) ve `api/platform/shared/storage-s3.ts` (S3 uyumlu, Web Crypto ile SigV4 imzalı `fetch`; iki hedefte çalışır).
  9. `±` `api/platform/node.ts`: Node `Platform`'u birleştirir (sqlite, LRU cache, `purge` no-op, `enqueue` no-op — poller madde 9, `rateLimit` bellek, `secrets.kek` ortamdan). `apps/api/src/platform/node.ts`; `images` (`sharp`) ve gerçek `enqueue` dürtmesi yok, `storage` açık hata fırlatan yer tutucu.
  10. `-` `api/platform/cloudflare/`: `d1.ts` (Drizzle d1; `readDb` D1 Sessions API okuma oturumu), `atomic.ts` (`db.batch()` → `meta.changes` dizisi), `kv-cache.ts` (KV + istek ömürlü `Map`), `purge.ts` (Cache purge API), `queue.ts` (Queues veya `waitUntil`), `rate-limit.ts` (binding); `api/platform/cloudflare.ts` birleştirir.
  11. `±` Giriş noktaları: `api/server.ts` (Node; `--worker` bayrağıyla yalnız tüketici) ve `api/worker.ts` (`fetch`, `queue`, `scheduled`); ikisi de yalnız `Platform` kurup madde 8'deki uygulamayı ve madde 9'daki tüketiciyi çağırır. Node girişi (`apps/api/src/server.ts`: env → Platform → kanal kaydı → `serve`) var; `--worker`, `worker.ts` ve Cloudflare girişi yok.
- **Testler:**
  - `core/platform/memory/lru.test.ts`, `fixedWindow.test.ts`, `atomic.test.ts` (saf yardımcılar).
  - `integration-tests/contract/__tests__/platform-atomic.test.ts` (iki hedefte): ikinci ifade hata verince ilk ifadenin yazdığı satır yok; koşulu tutmayan ifade `0` döner; dönüş uzunluğu ifade sayısına eşit; iki eşzamanlı koşullu `UPDATE` için tam bir kazanan (`race/`).
  - `integration-tests/contract/__tests__/platform-storage.test.ts`: disk/S3/R2 (Miniflare) için put/get/delete/head aynı sözleşme.
- **Bitti sayılır:**
  - `platform-atomic` sözleşme testi SQLite ve Miniflare D1'de yeşil.
  - `packages/core` içinde `node:` importu yok (lint) ve `env`/`process.env` okuması yok (madde 7.11).
  - `node dist/server.js` ve `wrangler dev` aynı (boş) uygulamayı ayağa kaldırıyor.
- **Açık sorular / riskler:**
  - `.claude/skills/backend/openmers-backend-structure/SKILL.md` örneği `atomic(ctx, async (tx) => {...})` geri çağırımlı; bu, belgenin yasakladığı "oku, karar ver, yaz" interaktif transaction'ı ima eder. Kapatıldı: `atomic(stmts)` esas alındı, skill ve belge düzeltildi.
  - Drizzle'ın `better-sqlite3` sürücüsünde `batch` yok; Node tarafında ifadeleri aynı Drizzle sorgu nesnelerinden çalıştırmak için ortak `AtomicStatement` biçimi (Drizzle `SQL` mi, hazırlanmış sorgu mu) tasarlanmalı.
  - D1 batch atomikliği ve D1 Sessions API sınırları doğrulanmadı (`ATLANANLAR.md`, performans §7).
  - `rateLimit` çökerse istek geçer (06-güvenlik); fail-open davranışı port sözleşmesine yazılmalı.

### 6. `docs/03-cekirdek/03-veri-kurallari.md` — `packages/db`, kimlik ve para kuralları

- **Kaynak kararlar:**
  - İç kimlik tamsayı `id`, API sınırını geçmez; dış kimlik önekli `public_id` (`prod_ var_ col_ ord_ itm_ ref_ cus_ com_ quo_ chn_ pl_`) + 10 karakter Crockford base32 (50 bit); çakışmada benzersiz indeks, 3 yeniden deneme.
  - Kimlik ≠ yetki: misafir erişimi iptal edilebilir `otk_...` token (`order_guest_access`); sızıntı kapısı testi `id`/`*_id` altında tamsayı, yanlış önek veya token görürse kırılır; dış kimlikler `external_refs`.
  - Para tamsayı küçük birim + para birimi kodu, farklı para birimi toplanmaz; oranlar baz puan (%20 = 2000); yuvarlama tek yardımcıda, satır düzeyinde; sipariş toplamı satırların toplamı.
  - Zaman UTC epoch ms; yumuşak silme yalnız katalog ve müşteri; eşzamanlı düzenlenen satırlarda `version` + `WHERE version = ?`.
  - Migration eklemeli, numaralı, uygulanmış dosya düzenlenmez, `DROP` yok; liste/filtre indeksi aynı migration'da; built-in app'lerin kendi numara dizisi ve `bia_<ad>_` tabloları.
  - JSON yalnız birlikte okunup yazılan veri için; filtrelenen şey sütun, gerekirse ifade indeksi.
- **Bağımlılık:** madde 1.8 (Drizzle, drizzle-kit sürümleri).
- **Yapılacaklar:**
  1. `+` `packages/db/drizzle.config.ts` (dialect `sqlite`, şema `src/schema/index.ts`, çıktı `migrations/`) ve `package.json` script'leri `db:generate`; dosya adları `wrangler d1 migrations apply` ile uyumlu `0001_<ad>.sql`.
  2. `+` `packages/db/src/schema/columns.ts`: ortak sütun yardımcıları `id()`, `publicId()` (benzersiz), `createdAt()`/`updatedAt()` (epoch ms tamsayı), `deletedAt()`, `version()`, `amount(name)` + `currency()`, `customFields()`, `metadata()`, `privateMetadata()` (JSON metin).
  3. `±` `packages/db/src/schema/index.ts`: tablo grubu başına dosya yeniden dışa aktarımı (madde 7, 9, 11, 12 kendi dosyalarını buraya ekler); `packages/db/src/index.ts` yalnız `schema` ve tipleri dışa açar.
  4. `-` `packages/db/src/schema/external-refs.ts`: `external_refs(source, connection, entity_type, public_id, external_id, external_code, digest)` + `(source, connection, entity_type, external_id)` benzersiz indeksi.
  5. `-` `core/features/ids/prefixes.ts` (veri dosyası: varlık → önek; token önekleri `otk_`, `omk_`, `oma_`, `omp_` ayrı tabloda) ve `core/features/ids/crockford.ts` (saf base32 kodlayıcı).
  6. `-` `core/features/ids/publicId.ts`: `newPublicId(prefix, random)` (rastgelelik parametre; varsayılan `crypto.getRandomValues`), `isPublicId(value, prefix)`; `insertWithPublicId.ts` (I/O): benzersiz ihlalinde en çok 3 deneme.
  7. `-` `core/features/ids/token.ts`: erişim token'ı üretimi + SHA-256 özet (Web Crypto); yalnız özet saklanır.
  8. `-` `core/features/ids/leakGate.ts`: saf özyinelemeli tarayıcı; `id`/`*_id` altında `number`, beklenen önekle eşleşmeyen dize, herhangi bir token öneki → ihlal listesi döner.
  9. `-` `core/lib/money/`: `roundLine.ts` (tek yuvarlama yardımcısı), `bps.ts` (baz puan uygulama), `sumSameCurrency.ts` (farklı para birimini reddeder), `formatPrice.ts` (yalnız kenar, ondalık para biriminden; `Intl.NumberFormat`).
  10. `-` Migration çalıştırıcı (Node): `apps/api/src/platform/node/migrate.ts` (açılışta uygulanmamış dosyaları sırayla uygular; `deploy/docker/entrypoint.sh` bunu çağırır); D1'de `wrangler d1 migrations apply`.
  11. `-` Eklemeli migration kapısı: `packages/db/src/migrations.test.ts` (her `.sql` dosyasında `DROP TABLE`, `DROP COLUMN`, `RENAME` yok; numaralar ardışık) + CI'da `main`'e göre değiştirilmiş eski migration dosyası varsa kırılan `scripts/check-migrations.sh`.
  12. `-` Built-in app migration dizisi: `packages/modules/<ad>/migrations/` kuralı; çalıştırıcı çekirdek + etkin built-in app dizinlerini ayrı numara tablolarıyla uygular; `bia_<ad>_` önek denetimi testi.
- **Testler:** `crockford.test.ts`, `publicId.test.ts` (uzunluk 10, alfabe, önek), `leakGate.test.ts` (iç içe nesne/dizi, `customer_id: 5` → ihlal, `ord_` beklenen yerde `prod_` → ihlal), `core/lib/money/*.test.ts` (yuvarlama, satır toplamı = sipariş toplamı, farklı para birimi hatası); entegrasyon `integration-tests/core/__tests__/public-id-retry.test.ts` (enjekte üreteçle zorlanan çakışmada yeniden deneme, 3'ten sonra hata); `migrations.test.ts`.
- **Bitti sayılır:**
  - `pnpm --filter @openmers/db db:generate` numaralı, eklemeli SQL üretir ve iki hedefte uygulanır.
  - Sızıntı kapısı saf fonksiyonu testli ve madde 8'in API çıktı testinde kullanılıyor.
  - `DROP` içeren yeni migration `pnpm verify`'da kırılır.
- **Açık sorular / riskler:**
  - Yuvarlama yöntemi (yarım yukarı mı, bankacı mı) belgede yok.
  - `ATLANANLAR.md` satır 84: `03-veri-kurallari.md` migration listesi kod yazılana kadar yok; `variant_channels`, `digital_*`, `lead_time_days` diğer belgelerde.
  - `formatPrice` (core) ile `@openmers/ui` `formatMoney` (madde 4.7) çakışması.
  - KVKK anonimleştirmenin hangi sütunlara dokunduğu (müşteri belgesi, madde 24) burada tanımlı değil.
  - `ids/` önek tablosu ile makine kimlik öneklerinin (`omk_/oma_/omp_`) hangi türe karşılık geldiği belgede açık değil (madde 12).

### 7. `docs/03-cekirdek/07-yapilandirma.md` — yapılandırma katmanları

- **Kaynak kararlar:**
  - İki katman: çalışma zamanı (`settings` tablosu, admin; deploy gerekmez) ve derleme zamanı (`store.config.ts`, varsayılanların üstüne birleşir; deploy gerekir).
  - Varsayılanlar `config.ts` içinde, doğrudan düzenlenmez; etkin değer tek yardımcıdan okunur.
  - `defineStore({ builtInApps, strategies, customFields, images })`; kod gerektiren her şey burada, gerektirmeyen her şey admin'de.
  - `settings(scope, scope_id, key, value)`; kapsamlar `global`, `channel`, `user`, `built-in app`; `getSetting(ctx, key)` kanal → genel → kod varsayılanı; değerler bellekte; sırlar burada değil kasada.
- **Bağımlılık:** madde 6 (şema), madde 5 (`cache`), madde 10.7 (sıcak yapılandırma yükleyicisi); `getSetting` için madde 8.1 (`Ctx` tipi).
- **Yapılacaklar:**
  1. `-` `core/config/defaults.ts`: derleme zamanı varsayılanları (para birimi, görsel genişlikleri, sipariş numarası biçimi); pazardan bağımsız.
  2. `-` `core/config/types.ts` + `core/config/defineStore.ts`: `StoreConfig` tipi ve kimlik fonksiyonu `defineStore`.
  3. `-` `core/config/mergeConfig.ts`: saf; yalnız mağazanın verdiği anahtarlar varsayılanın üstüne yazılır.
  4. `-` `core/config/validateConfig.ts`: Zod şemasıyla doğrulama; geçersizse açılışta anlamlı hata.
  5. `-` Kök `store.config.ts` düz nesneden `defineStore(...)` kullanımına (şu an `builtInApps: []`, `strategies: {}`, `customFields: {}`).
  6. `±` `packages/db/src/schema/settings.ts`: `settings` + benzersiz `(scope, scope_id, key)`; `settings_version` sayacı (tek satır veya kapsam başına).
  7. `+` `core/features/settings/registry.ts` (veri): anahtar → Zod şema + kod varsayılanı + izinli kapsamlar; built-in app'ler kendi anahtarlarını ekler.
  8. `+` `core/features/settings/resolveSetting.ts`: saf düşüş (kanal → genel → varsayılan).
  9. `±` `core/features/settings/queries/loadSettings.ts` (tek sorguda tüm satırlar) + `getSetting.ts` (bellekteki kopyadan okur, ıskada madde 10.7 yükleyicisi).
  10. `±` `core/features/settings/setSetting.ts`: Zod doğrulama → `atomic([upsert, settings_version + 1, audit_log])` (madde 11); kasa anahtarı gibi görünen anahtarlar reddedilir.
  11. `-` `api/platform/env.ts`: ortam değişkenlerini (`OPENMERS_DB`, `OPENMERS_UPLOADS`, `PORT`, KEK) Zod ile yalnız uygulama katmanında okur; `core` ve `db` için Biome `noProcessEnv` (kural adı sürümde teyit edilir).
- **Testler:** `mergeConfig.test.ts`, `validateConfig.test.ts`, `resolveSetting.test.ts` (üç düşüş durumu); entegrasyon `integration-tests/core/__tests__/settings.test.ts` (iki hedefte: `setSetting` sürümü artırır, geçersiz değer reddedilir, denetim satırı aynı `atomic` içinde; önbellek isabetinde `getSetting` 0 tur).
- **Bitti sayılır:**
  - `store.config.ts` tipli ve açılışta doğrulanıyor.
  - `getSetting` önbellek isabetinde sıfır veritabanı turu (tur sayacıyla).
  - `core` içinde `process.env` kullanımı lint hatası.
- **Açık sorular / riskler:**
  - `user` ve `userAndChannel` kapsamlarının gerekliliği açık (`ATLANANLAR.md` satır 59).
  - `legal_policy` şeması ve bu belgeye eklenmesi yapılmadı (`ATLANANLAR.md` satır 94); Türkiye ilke ön ayarı (`policy-tr`) ek modül olarak kalmalı.
  - Dizilerin birleştirme anlamı (değiştir mi, ekle mi) belgede yok.
  - Global varsayılan para birimi ve dil belgede yazmıyor.

### 8. `docs/03-cekirdek/02-api-ve-istek-baglami.md` — `Ctx`, Shop/Admin API, `packages/contract`

- **Kaynak kararlar:**
  - İki yüzey: Shop API (anonim/müşteri/yayınlanabilir anahtar, okuma modeli, izinli uçlar önbellekli) ve Admin API (yönetici/uygulama/API anahtarı, normalize tablolar, her zaman `no-store`); ikisi de yalnız `public_id`.
  - `Ctx` alanları: `platform, api, channel, lang, currency, customer?, company?, priceListIds, segment, actor{type,id?,permissions}, now, requestId`; anonim B2C'de kurulum sıfır veritabanı turu.
  - Handler: Zod doğrulama → izin → tek `core` fonksiyonu; beklenen hata değer (`{ ok: false, code }`); listeler `{ items, nextCursor }`, toplam yalnız `withTotal`; `Idempotency-Key` + aktör, 24 saat; toplu uçlar sabit üst sınır (ör. 500) ve kayıt başına sonuç.
  - Sözleşme eklemeli; kırıcı değişiklik yeni uç adıyla, eskisi en az bir büyük sürüm.
  - oRPC: `/api` OpenAPIHandler (önbelleklenecek GET'ler, Smart Coercion yalnız burada), `/rpc` RPCHandler (yalnız POST, GET kapalı); her prosedür `.output`; hatalar `.errors()` + `errorStatusMap`; `Ctx` ara katmanı yalnız kökte (`ctxLoaded`); SSR'de `createRouterClient`; Hono yalnız kabuk, `hc` kullanılmaz.
- **Bağımlılık:** madde 5, 6, 7; oturum kısmı için madde 10.8 ve 12 (önce anonim yol yazılır).
- **Yapılacaklar:**
  1. `+` `core/ctx/types.ts`: `Ctx` arayüzü belgedeki gibi; `core/ctx/index.ts`.
  2. `+` `core/ctx/segment.ts`: saf; `kanal + dil + para birimi + sıralı fiyat listesi kümesi` → kararlı anahtar.
  3. `+` `core/ctx/resolveChannel.ts`: saf; ana bilgisayar adı veya `x-openmers-channel` → bellekteki kanal tablosu (kanal modelinin ayrıntısı madde 14).
  4. `+` `core/ctx/buildCtx.ts`: kanal (bellek) + oturum (madde 10.8; çerez/bearer yoksa atlanır) + segment; `now` ve `requestId` dışarıdan enjekte edilir (testte sahtelenebilir).
  5. `+` `packages/contract/src/shared/`: `errors.ts` (ortak hata kodları), `pagination.ts` (imleç girdisi, `{ items, nextCursor }`, `withTotal`), `bulk.ts` (`bulkInput(schema, max = 500)` + kayıt başına sonuç şeması).
  6. `+` `packages/contract/src/shop/index.ts`, `admin/index.ts`, `src/index.ts` (`contract = { shop, admin }`); kaynak başına bir dosya (`shop/<kaynak>.ts`); önbelleklenecek her uç `openapi({ method: "GET", path })`, düz ve sıralı sorgu parametresi. İlk uç `shop/health.ts` (`GET /health`); `admin` boş router.
  7. `+` `api/orpc/base.ts`: `implement(contract)`, kök `Ctx` ara katmanı (`ctxLoaded` bayrağı), `errorStatusMap`. `apps/api/src/orpc/base.ts`; işleyiciler `apps/api/src/orpc/handlers.ts`.
  8. `±` `api/app.ts`: Hono kabuğu; güvenlik başlıkları, kanal çözümleme, hız sınırı (madde 11), `/api/*` → OpenAPIHandler (+ Smart Coercion), `/rpc/*` → RPCHandler, `hooks/` webhook rotaları; `/api/openapi.json` (OpenAPI üretici). `apps/api/src/app.ts` var (başlıklar, kanal, iki işleyici, OpenAPI belgesi); hız sınırı ara katmanı ve `hooks/` rotaları yok.
  8b. `±` Güvenlik başlıkları (`docs/03-cekirdek/06-guvenlik-ve-yetki.md`): `core/http/securityHeaders.ts` saf fonksiyon (`surface` → başlık kümesi, nonce üretimi dışarıdan); `api/app.ts`'te en dış ara katman olarak bağlanır; storefront ve admin yanıtlarına aynı fonksiyon uygulanır. `apps/api/src/http/secure.ts` en dış ara katman olarak bağlı; storefront ve admin yanıtları henüz bağlanmadı.
      - `+` Birim test: her yüzey için HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors`, CSP bulunur; 4xx/5xx ve yönlendirme yanıtlarında da bulunur; HTTP'de HSTS yok. `securityHeaders.test.ts` yüzeyleri kapsıyor; 404/500 ve HTTP'de HSTS yokluğu `apps/api/src/app.test.ts`'te.
      - `+` Admin CSP'sinde `frame-src` yalnız kurulu app kökenleridir; kurulu app yokken `'none'`.
      - `±` `Report-Only` ile başlar; ihlal logu temizlenince zorlayıcıya geçiş ayrı iş.
  9. `±` `api/shop/<kaynak>/<uç>.ts` ve `api/admin/<kaynak>/<uç>.ts`: uç başına dosya, klasör `index.ts` router'ı birleştirir; ilk uçlar `shop.health` ve `admin.me` (iskeleti uçtan uca kanıtlar). `apps/api/src/shop/health/get.ts` var (`/api/health` ve `POST /rpc/shop/health`); `admin.me` yok.
  10. `-` Idempotency: `packages/db/src/schema/idempotency.ts` (`key, actor, response, expires_at`, 24 saat) + `api/orpc/idempotency.ts` ara katmanı + temizleme zamanlanmış görevi (madde 9). Belge 04'teki `features/` listesinde yeri yok; `core/features/idempotency/` açılması belge güncellemesi ister.
  11. `±` `api/router.ts`: router ve `createRouterClient` fabrikasını dışa açar (storefront SSR aynı süreçte HTTP'ye çıkmaz). `apps/api/src/router.ts` router'ı dışa açıyor; istemci fabrikası yok.
  12. `-` `packages/contract/src/client/`: `createShopClient` / `createAdminClient` (`RPCLink` + katalog için `OpenAPILink`); web ve mobil aynı fabrikayı kullanır. `app-sdk` küçültülmüş sözleşme JSON'u madde 47'de.
- **Testler:** `segment.test.ts`, `resolveChannel.test.ts`, `bulk.test.ts` (501 kayıt reddi); entegrasyon `integration-tests/api/__tests__/shop/health.test.ts` (anonim istekte 0 tur), `rpc-get-rejected.test.ts` (`GET /rpc/...` reddedilir), `idempotency.test.ts` (aynı anahtar aynı yanıt, farklı aktör farklı), `middleware-once.test.ts` (Ctx ara katmanı istek başına bir kez); sözleşme `integration-tests/contract/__tests__/procedures-have-output.test.ts` ve tüm örnek yanıtlarda `leakGate` (madde 6.8).
- **Bitti sayılır:**
  - `shop.health` ve `admin.me` `/rpc` ve (GET olan) `/api` üzerinden iki hedefte çalışıyor; OpenAPI belgesi üretiliyor.
  - Anonim istekte `buildCtx` sıfır veritabanı turu (sayaçla).
  - Hiçbir yanıtta tamsayı `id` yok (sızıntı kapısı yeşil).
- **Açık sorular / riskler:**
  - oRPC v2 beta: `implement`, Smart Coercion ve `errorStatusMap` adları kod başlarken `orpc.dev`'den teyit edilmeli.
  - `Ctx.customer.id` ve `groupIds: number[]` iç kimlik taşıyor; içeride sorun değil ama DTO'ya geçmemesi sızıntı kapısına bağlı.
  - Idempotency ve denetim (`audit`) için `features/` listesinde klasör yok (madde 13).
  - Hata dönüşü: belge hem "değer olarak döner" hem oRPC `.errors()` diyor; skill "core tipli hata fırlatır, handler eşler" diyor. Tek desen seçilmeli.

### 9. `docs/03-cekirdek/04-olaylar-isler-outbox.md` — outbox, olaylar, işler

- **Kaynak kararlar:**
  - Yan etkiler komutla aynı `atomic()` içinde `outbox` satırı; teslimat: sahiplen (`UPDATE outbox SET status='sending', claimed_at=now WHERE id=? AND status IN ('pending','failed')`) → gönder → `sent` / `failed` + deneme sayısı; en az bir kez.
  - Deneme sınırını aşan satır `dead`, admin'de listelenir, elle yeniden kuyruğa alınır, mağaza sahibine bildirim üretir; tek dead-letter.
  - Ayrı workflow motoru ve ayrı `jobs` tablosu yok; `kind` sütunu: `notify`, `webhook`, `reindex` (bekleyen varsa birleştirme), `collection`, `import`, `invoice`, `fulfillment`, `scheduled`; öncelik `notify`/`webhook` önce, `reindex`/`import` hız sınırlı.
  - Tetikleyiciler: sipariş anında (`waitUntil`/Queues / poller uyandırma), webhook yeniden teslimatı, 5 dk süpürme (Cron / süreç içi); kuyruk yalnız tetikleyici.
  - Olaylar outbox satırı olarak doğar; gövde küçük (kimlikler + değişen alan adları); olay kimliği idempotency anahtarı; aboneler istek içinde çalışmaz.
  - Zamanlanmış görev `scheduled_runs(görev, dönem)` benzersiz eklemeye koşullu, bir kez çalışır.
- **Bağımlılık:** madde 5 (`atomic`, `enqueue`), madde 6 (şema), madde 7 (deneme ayarları).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/outbox.ts`: `outbox(id, kind, topic, payload json, status, attempts, last_error, priority, available_at, claimed_at, dedupe_key, created_at)`; indeks `(status, priority, available_at)`; `reindex` birleştirmesi için `dedupe_key` üzerinde `WHERE status = 'pending'` kısmi benzersiz indeks.
  2. `-` `packages/db/src/schema/scheduled-runs.ts`: `scheduled_runs(task, period)` benzersiz.
  3. `-` `core/events/defineEvent.ts` + `core/events/types.ts`: olay adı ↔ yük tipi; her feature kendi `events.ts`'inde tanımlar (`order.placed`, `product.updated`, `stock.bucket_changed` …).
  4. `-` `core/events/emit.ts`: çalıştırmaz, `atomic()`'e eklenecek `INSERT outbox` ifadesini döner (`outboxStatement(ctx, event)`).
  5. `-` `core/jobs/claim.ts`: koşullu sahiplenme; etkilenen satır 0 ise `false`.
  6. `-` `core/jobs/retryPolicy.ts`: saf; deneme sayısı → sonraki `available_at` ve `dead` kararı.
  7. `-` `core/jobs/mark.ts`: `sent`, `failed` (+ `last_error`), `dead` geçişleri; `dead` olurken aynı `atomic` içinde `outbox.dead` bildirim satırı.
  8. `-` `core/jobs/registry.ts`: yalnız `kind → handler` eşlemesi; her iş türü kendi dosyasında (`jobs/kinds/<kind>.ts` veya ilgili feature'da).
  9. `-` `core/jobs/runBatch.ts`: önceliğe göre aday satırları seç, sahiplen, çalıştır, işaretle; `reindex`/`import` için yazma hızı sınırı.
  10. `-` `core/jobs/scheduler/cron.ts` (saf 5 alanlı cron eşleştirici), `period.ts` (saf: zaman + cron → dönem anahtarı), `defineTask.ts`, `runScheduled.ts` (`INSERT scheduled_runs` başarılıysa çalıştır).
  11. `-` `core/jobs/tasks/sweepOutbox.ts` (5 dk): `pending`/`failed` ve takılı `sending` satırlarını işler. Diğer çekirdek görevler (rezervasyon bırakma, uzlaştırma, terk edilmiş sepet …) kendi feature'larında tanımlanır.
  12. `-` `api/worker/poller.ts` (self-host: aynı süreç veya `--worker`; `platform.enqueue` ile uyanır) ve `api/worker/cloudflare.ts` (Queue consumer + `scheduled`); ikisi de yalnız `runBatch` / `runScheduled` çağırır.
  13. `-` Admin uçları: `packages/contract/src/admin/outbox.ts` (`listDead`, `requeue`) + `api/admin/outbox/*.ts`; izin `outbox:read|write` (madde 11).
- **Testler:** `retryPolicy.test.ts`, `cron.test.ts`, `period.test.ts`; entegrasyon (iki hedef) `integration-tests/core/__tests__/outbox.test.ts` (komut geri alınınca olay satırı yok; deneme sınırında `dead` + bildirim satırı; `reindex` birleştirmesi), `requeue.test.ts`; yarış `integration-tests/race/__tests__/outbox-claim.test.ts` (iki tüketici aynı satır → tam bir kazanan) ve `scheduled-once.test.ts` (aynı dönem iki tetik → bir çalışma).
- **Bitti sayılır:**
  - Örnek bir komut (madde 7.10 `setSetting` veya test komutu) olayını aynı `atomic` içinde yazıyor; geri alınınca satır yok.
  - Çift tüketici ve çift zamanlayıcı yarış testleri iki hedefte yeşil.
  - `dead` satırları Admin API'den listelenip yeniden kuyruğa alınabiliyor.
- **Açık sorular / riskler:**
  - Deneme sınırı ve geri çekilme aralıkları belgede yok.
  - `sending` durumunda takılan satır (süreç çöktü) için `claimed_at` zaman aşımı belgede yok; yoksa satır sonsuza dek takılır.
  - Webhook HMAC şeması `04-genisletme/03` belgesinde; burada yalnız tür.
  - Cloudflare Cron'un 5 dk süpürmeyi garanti edip etmediği ve Queues'un gecikmesi ölçülmedi.

### 10. `docs/03-cekirdek/05-onbellek.md` — önbellek katmanı (`features/cache`)

- **Kaynak kararlar:**
  - İzin listesi, sezgi değil: yalnız listelenen herkese açık rotalar paylaşımlı önbelleğe girer; listede olmayan rota `no-store`; sepet, checkout, hesap, sipariş, admin her zaman `private, no-store`.
  - Etiketli temizleme: `Cache-Tag` (`product:<public_id>`, `category:<...>`, `shell`, `pl:<public_id>`); içerik değişikliğinde etiket → başarısızsa tümü → o da başarısızsa istek hata; stok geçişinde en iyi çaba + kısa TTL.
  - Stok kova olarak (`stokta / az kaldı / tükendi`); kova değişmedikçe temizlik yok; kişiye özel parça önbellekli HTML'e girmez; herkese açık render yolunda dış çağrı yok.
  - Anahtar = URL + `ctx.segment`; giriş zorunlu kanallarda segment çerezi imzalı, geçersizse anonim segment.
  - Sıcak yapılandırma bellekte (TTL 30 sn + `settings_version`), Workers'ta ıskada KV, o da yoksa tek sorgu; oturum önbelleği (KV/LRU, kısa TTL; çıkış, parola, rol değişimi siler).
- **Bağımlılık:** madde 5 (`cache`, `purge`), madde 7 (`settings_version`), madde 8 (segment, `/api` GET rotaları).
- **Yapılacaklar:**
  1. `-` `core/features/cache/policy.ts` (veri): izinli rota → `max-age`/`s-maxage` + etiket üreticisi; varsayılan `private, no-store`.
  2. `-` `core/features/cache/headers.ts`: saf; politika + segment → `Cache-Control` ve `Cache-Tag`.
  3. `-` `core/features/cache/tags.ts`: saf `productTag`, `categoryTag`, `priceListTag`, `SHELL`.
  4. `-` `core/features/cache/purgeContent.ts` (etiket → tümü → hata fırlat) ve `purgeStock.ts` (en iyi çaba, hata loglanır).
  5. `-` `core/features/cache/segmentCookie.ts`: imzalı segment çerezi (Web Crypto HMAC) imzala/doğrula; geçersiz → anonim segment.
  6. `-` `core/features/cache/hotConfig.ts`: genel yükleyici `createHotCache({ key, ttlMs: 30000, version, load })`: bellek → `platform.cache` (KV) → tek sorgu; madde 7.9 ve kanal tablosu bunu kullanır.
  7. `-` `core/features/cache/sessionCache.ts`: oturum anahtarı oku/yaz/sil; sürüm karşılaştırması madde 12'de.
  8. `-` `api/middleware/cacheHeaders.ts`: yalnız `/api` GET izinli rotalara başlık yazar, diğer her yanıta `private, no-store`.
  9. `-` `api/platform/cloudflare/edgeCache.ts`: Cache API ile anahtar = URL + segment; self-host'ta başlıklar reverse proxy'ye bırakılır (`deploy/docker` Caddy/nginx örneği madde 55'te).
- **Testler:** `headers.test.ts` (listede olmayan rota `no-store`), `tags.test.ts`, `segmentCookie.test.ts` (kurcalanmış çerez → anonim); entegrasyon `integration-tests/core/__tests__/purge.test.ts` (purge başarısız → tümü → hata); sözleşme `integration-tests/contract/__tests__/cache-policy.test.ts` (sözleşmedeki her uç ya izin listesinde ya `no-store`; sepet/checkout/admin hiçbir zaman `public`) ve `segment-leak.test.ts` (bir segmentin fiyatı başka segmentin anahtarından dönmez; madde 3 kapısı).
- **Bitti sayılır:**
  - Önbellek politikası sözleşme testi tüm uçlar için yeşil.
  - Sıcak yapılandırma isabetinde istek başına sıfır sorgu.
  - Segment sızıntı testi iki hedefte yeşil.
- **Açık sorular / riskler:**
  - Cloudflare'de `Cache-Tag` ile temizlemenin plan şartı ve Workers Cache API ile etkileşimi doğrulanmadı.
  - Self-host'ta "reverse proxy / yok": Caddy/nginx etiketli temizlemeyi kendiliğinden desteklemez; self-host'ta paylaşımlı önbellek fiilen kısa TTL'ye dayanır.
  - Segment çerezini imzalayan anahtarın kaynağı (KEK'ten türetme mi) belgede yok.
  - Stok kovası eşiği ve kodu madde 17'de (`stock`); bu madde yalnız temizleme kuralını uygular.

### 11. `docs/03-cekirdek/06-guvenlik-ve-yetki.md` — izinler, politika, denetim, kasa

- **Kaynak kararlar:**
  - Admin kapalı başlar; ilk kurulumda yalnız sihirbaz açık, parola belirlenince kapı kilitlenir (arayüz + Admin API).
  - Sır kasası: AES-256-GCM, KEK yalnız platform secret deposunda, değerler arayüze geri gösterilmez, KEK yoksa demo modu. İstek sınırlama (giriş, checkout, arama; anahtar = mağaza + rota + istemci; çökerse geçer). Güvenlik başlıkları (CSP, HSTS, nosniff, çerçeveleme), CSRF `Origin`, Turnstile isteğe bağlı, `renderMarkdown()` `html: false`, yalnız Web Crypto.
  - İzin `<varlık>:<eylem>`; rol = izin kümesi, kanal başına; `SuperAdmin` silinemez; token ve API anahtarları aynı sözlük; izin bildirmeyen handler derlenmez; müşteri yetkisi sahiplik, filtre `core` sorgusunda.
  - `access_policies(role_id|admin_id, resource, condition json, active)`; koşul yalnız indeksli kapsam alanlarına; oturum açılışında tek SQL koşuluna derlenir; sorgu katmanı eklemeden çalıştırmaz; kapsam dışı ayrıntı 404.
  - `audit_log` aynı `atomic()` içinde, sır/kişisel veri maskeli; `audit.retention_days` varsayılan 730; aylık gzip NDJSON arşiv (arşiv başarısızsa silme yok); hash zinciri mühürleme işiyle (`seq` sırası), `audit_anchors(day, last_seq, last_hash, signature)` KEK'ten türetilmiş HMAC; `openmers audit verify`.
- **Bağımlılık:** madde 5 (`secrets.kek`, `rateLimit`, `storage`), madde 6, madde 8 (ara katman, contract), madde 9 (mühür ve arşiv işleri).
- **Yapılacaklar:**
  1. `-` `core/features/auth/permissions/registry.ts` (veri): çekirdek izinler; built-in app'ler ekler; `Permission` tipi bu kayıttan türetilir.
  2. `-` `packages/contract/src/shared/adminProcedure.ts`: `adminProcedure(permission)` — izin meta'sı zorunlu; izinsiz Admin prosedürü tip hatası. `api/orpc/requirePermission.ts` ara katmanı `ctx.actor.permissions` ile denetler.
  3. `-` `packages/db/src/schema/roles.ts`: `roles`, `role_permissions`, `admin_channel_roles`; `SuperAdmin` silme koşullu `DELETE` ile engellenir.
  4. `-` `core/features/auth/permissions/resolvePermissions.ts`: saf; (roller, kanal) → `Set<string>`.
  5. `-` `core/features/secrets/crypto.ts` (AES-256-GCM, Web Crypto), `vault.ts` (`setSecret`, `hasSecret`, yalnız sunucu içi `useSecret`; okuma ucu yok), `demoMode.ts` (KEK yoksa); `packages/db/src/schema/secrets.ts`.
  6. `-` `core/features/auth/accessPolicies/scopeFields.ts` (veri: kaynak → kapsam alanları tablosu), `compilePolicy.ts` (saf: koşul JSON → Drizzle `SQL`), `withScope.ts` (liste/ayrıntı/arama/dışa aktarma sorgularının tek giriş noktası; koşulsuz çalıştırmaz); `packages/db/src/schema/access-policies.ts`.
  7. `-` Denetim: `core/features/audit/` (belge 04 listesinde yok, açılması belge güncellemesi ister): `auditStatement.ts` (`atomic`'e eklenecek ifade), `mask.ts` (saf), `canonical.ts` (saf), `seal.ts` (tek tüketicili mühürleme işi), `anchor.ts` (günlük HMAC çapa), `archive.ts` (aylık gzip NDJSON, `CompressionStream`), `retention.ts` (arşiv başarılıysa sil); `packages/db/src/schema/audit.ts` (`audit_log` + `seq`, `audit_anchors`).
  8. `-` `apps/api/src/cli/auditVerify.ts`: `openmers audit verify [--from --to]` zinciri ve çapaları yeniden hesaplar.
  9. `-` `api/middleware/securityHeaders.ts`, `csrfOrigin.ts`, `rateLimit.ts` (fail-open + log), `turnstile.ts` (isteğe bağlı).
  10. `-` `core/features/auth/setupGate.ts`: kurulum tamamlanmadıysa Admin API'de yalnız kurulum prosedürü; sihirbaz akışı madde 56.
  11. `-` Kişisel veri (çerez onayı, rıza, dışa aktarma, silme) çekirdekte ama `customers` (madde 24) içinde; burada yalnız olayların izinli uygulamaya gitmesi kuralı (`apps`, madde 47) not edilir.
- **Testler:** `crypto.test.ts` (gidiş-dönüş, değiştirilmiş şifreli metin reddedilir), `compilePolicy.test.ts`, `mask.test.ts`, `canonical.test.ts`, `resolvePermissions.test.ts`; tip testi `adminProcedure.test-d.ts` (izinsiz prosedür derlenmez); entegrasyon: `audit-atomic.test.ts` (yazma yoksa denetim yok), `audit-seal.test.ts` (eşzamanlı yazmalardan sonra mühür sırası, değiştirilen/silinen satırı `verify` bulur, çapa imzası, arşiv başarısızsa silme yok, saklama sınırında zincir devamı), `access-policy-leak.test.ts` (liste, sayı, 404, dışa aktarma), `security-headers.test.ts`, `csrf.test.ts`, `rate-limit-fail-open.test.ts`.
- **Bitti sayılır:**
  - İzin bildirmeyen Admin prosedürü `pnpm typecheck`'te kırılıyor.
  - Kasa değerleri veritabanında yalnız şifreli; hiçbir API yanıtı sır döndürmüyor.
  - `openmers audit verify` kurcalanmış bir satırı raporluyor; denetim testleri iki hedefte yeşil.
  - Kısıtlı yöneticinin sızıntı testi örnek bir liste ucunda yeşil.
- **Açık sorular / riskler:**
  - KEK doğrudan mı şifreler, yoksa zarf şifreleme (satır başı DEK) mi belgede açık değil; KEK döndürme tasarlanmadı (`ATLANANLAR.md` satır 59).
  - D1'de mühürleme sırası, R2/S3 nesne kilidi, politikanın büyük listelerde indeks maliyeti, saklama süresinin yasal asgarisi doğrulanmadı (`ATLANANLAR.md` satır 52).
  - `features/audit/` ve `features/idempotency/` belge 04'ün listesinde yok.
  - CSP'nin admin'deki iframe app'lerle (madde 47) uyumu ayrıca tasarlanmalı.

### 12. `docs/03-cekirdek/08-kimlik-dogrulama.md` — müşteri/yönetici oturumu, mobil, makine kimlikleri

- **Kaynak kararlar:**
  - Better Auth (Drizzle, SQLite/D1); müşteri (`users`, `sessions`, `accounts`, çerez `om_s`) ve yönetici (`admin_users`, `admin_sessions`, çerez `om_a`, ayrı alt alan adı) ayrı tablo ve oturum; yönetici kaydı yalnız davet; 2FA SuperAdmin için varsayılan zorunlu.
  - Müşteri: e-posta + parola, e-posta kodu, sosyal giriş (Google, Apple; kanal başına); telefon + SMS Türkiye için isteğe bağlı eklenti. Parola sıfırlama tek kullanımlık, özeti saklanır, yanıt hesap varlığını belli etmez; misafir → hesap aynı `customers` satırı, e-posta doğrulandıktan sonra.
  - Oturum: müşteri, gruplar, etkin şirket/rol, fiyat listesi kümesi, `version`; `session_version` artınca önbellekteki eski oturum reddedilir (müşteri ve yönetici); yönetici rol/izin/kanal/politika değişiminde sayaç aynı `atomic()` içinde artar.
  - Yönetici: TOTP + passkey, kurtarma kodları bir kez gösterilir ve özeti saklanır; hassas işlemler son 10 dakikada yeniden doğrulama ister; her giriş/başarısız deneme/yeniden doğrulama denetime düşer.
  - Mobil bearer `expo-secure-store`'da; sosyal giriş sistem tarayıcısında (PKCE); checkout WebView için 60 sn tek kullanımlık geçiş kodu, token URL'ye konmaz. Makine kimlikleri: yalnız özet, önek `omk_`/`oma_`/`omp_`, son kullanım zamanı, anında iptal.
  - Korumalar: ayrı hız sınırları (IP + hesap), eşikte Turnstile; `HttpOnly`, `Secure`, `SameSite=Lax`; var/yok için aynı yanıt ve süre. Performans: anonimde sıfır maliyet, girişte bir önbellek okuması.
- **Bağımlılık:** madde 5, 6, 8, 10.7 (oturum önbelleği), 11 (izinler, denetim, hız sınırı), 9 (e-postalar outbox'tan). Misafir → hesap bağlama madde 24'e, B2B şirket değişimi madde 38'e bağlı.
- **Yapılacaklar:**
  1. `-` Deneme dalı (birleştirilmez): iki ayrı Better Auth örneğinin aynı veritabanında farklı tablo adlarıyla kurulabildiği, D1 adaptörü ve parola özetinin Workers CPU süresi ölçülür; sonuç belgeye işlenir.
  2. `-` `packages/db/src/schema/auth-customer.ts` (`users`, `sessions`, `accounts`, `session_version`) ve `auth-admin.ts` (`admin_users`, `admin_sessions`, `session_version`, 2FA, passkey, kurtarma kodu özetleri).
  3. `-` `api/auth/customerAuth.ts` ve `api/auth/adminAuth.ts`: Better Auth yapılandırmaları (çerez adları `om_s`/`om_a`, bayraklar, oturum süreleri: müşteri uzun ve kayan, yönetici kısa ve hareketsizlikte biten).
  4. `-` `core/features/auth/session/sessionPayload.ts`: saf; oturum yükü ve segment girdisi (madde 8.2).
  5. `-` `core/features/auth/session/validateSession.ts`: önbellekten oku (madde 10.7), `version` karşılaştır, ıskada tek sorgu.
  6. `-` `core/features/auth/session/bumpSessionVersion.ts`: `atomic`'e eklenecek ifadeler (rol, rol izni, kanal ataması, `access_policies` değişimi → etkilenen yöneticiler; müşteri tarafında parola, çıkış, grup/şirket/fiyat listesi).
  7. `-` `core/features/auth/reauth.ts`: saf; son doğrulama 10 dakika içinde mi.
  8. `-` `core/features/auth/passwordReset.ts`: özetli tek kullanımlık token (koşullu `UPDATE ... WHERE used_at IS NULL`), e-posta outbox satırı, hesap var/yok aynı yanıt.
  9. `-` `core/features/auth/handoff.ts`: mobil checkout geçiş kodu üret (60 sn) ve tek kullanımlık takas (koşullu `UPDATE`); `packages/db/src/schema/auth-handoff.ts`.
  10. `-` `core/features/auth/machine/`: `prefixes.ts` (veri), `issueKey.ts`, `verifyKey.ts` (yalnız özet, `last_used_at`), `revokeKey.ts`; `packages/db/src/schema/api-keys.ts`.
  11. `-` `core/features/auth/invites.ts`: yönetici daveti (yalnız davetle kayıt); şirket daveti (7 gün) madde 38'de bu dosyayı kullanır.
  12. `-` `api/middleware/session.ts`: çerez/bearer yoksa hiçbir şey yapmaz; Shop API yalnız `om_s`/müşteri bearer, Admin API yalnız `om_a`/yönetici; Hono hız sınırları giriş, kayıt, kod gönderme, sıfırlama için ayrı (IP + hesap).
  13. `-` Sosyal giriş (Google, Apple) kanal ayarıyla; SMS kodu çekirdekte değil, `packages/modules/sms-netgsm` üzerinden isteğe bağlı (Türkiye ek modülü).
- **Testler:** `sessionPayload.test.ts`, `reauth.test.ts`, `machine/prefixes.test.ts`; entegrasyon (iki hedef, belge §9): oturum sabitleme, sürüm artınca eski oturum reddi, müşteri çerezinin Admin API'de işe yaramaması, geçiş kodunun ikinci kullanımda reddi, sıfırlama token'ının tek kullanımlık olması, rol değişimi sonrası yöneticinin bir sonraki istekte yeni izinleri alması, anonim istekte sıfır tur; yarış: aynı geçiş kodunun eşzamanlı iki takası → bir kazanan; log kapısı (madde 3.13): giriş akışı loglarında e-posta yok.
- **Bitti sayılır:**
  - Müşteri ve yönetici girişleri ayrı tablolar ve çerezlerle iki hedefte çalışıyor.
  - Belge §9'daki altı test yeşil (başka şirket testi madde 38 ile).
  - Girişli istekte oturum doğrulaması tek önbellek okuması (tur sayacı 0).
- **Açık sorular / riskler:**
  - Better Auth eklenti adları ve D1 uyumu doğrulanmadı; iki ayrı örnek desteklenmiyorsa yönetici tarafı elle yazılmalı.
  - Parola özetinin (scrypt) Workers CPU maliyeti ölçülmedi (`ATLANANLAR.md` satır 46).
  - `omk_`, `oma_`, `omp_` öneklerinin hangisinin API anahtarı/uygulama token'ı/yayınlanabilir anahtar olduğu belgede açık yazmıyor.
  - Yönetici alt alan adı (`admin.…`) self-host'ta tek süreç + tek alan adı kurulumuyla nasıl çalışacak, belirtilmemiş.

### 13. `docs/02-genel-mimari/04-monorepo-klasor-yapisi.md` — paket yüzeyleri ve kurallar

- **Kaynak kararlar:**
  - Ağaç: `apps/{api,storefront,admin,mobile}`, `packages/{contract,db,core,ui,tokens,theme-kit,create-openmers-theme,app-sdk,test-utils,app-bridge,create-openmers-app,modules/*,plugins/*,themes/default}`, `integration-tests/`, kökte `store.config.ts`.
  - `core/src`: `platform/`, `ctx/`, `config/`, `extend/`, `events/`, `jobs/`, `features/` (25 dikey dilim: channels … ids).
  - Kurallar: handler ince; feature'ın dışa açtığı şey `index.ts`, başka feature tablosuna yazmaz/iç dosyasını import etmez; `core` fonksiyonu `(ctx, girdi)`; `catalog/` yazar, `catalogIndex/` okur, vitrin handler'ı `catalog/`'u import etmez; built-in app tabloları `bia_<ad>_`.
  - Bir feature klasörü silinince geri kalan derlenmeye devam etmeli.
  - Changesets: `@openmers/*` ve resmî built-in app'ler aynı sürüm; `pnpm verify`: lint, tip, birim + entegrasyon (D1 ve SQLite), derleme.
- **Bağımlılık:** madde 1 (tip denetimi); içerik madde 5-12 ile dolar.
- **Yapılacaklar:**
  1. `+` Paket klasörleri ve `package.json`/`tsconfig.json` iskeletleri ağaçtaki gibi var; workspace glob'ları hepsini kapsıyor.
  2. `+` `core/features/` altında 25 klasör, her biri `index.ts` (`export {}`); Changesets `fixed: [["@openmers/*"]]`.
  3. `-` `core/{platform,ctx,config,events,jobs}/index.ts` (madde 5, 7, 8, 9 doldurur) ve `core/extend/index.ts` yer tutucusu (madde 43-45); `core/src/index.ts` yalnız bunları ve feature `index.ts`'lerini dışa açar.
  4. `-` Paketler arası bağımlılıkları `package.json`'a `workspace:*` ile yazma (`core` → `db`, `contract`; `api` → `core`, `contract`, `db`; `test-utils` → `db`, `core`); şu an hiçbiri tanımlı değil.
  5. `-` Feature sınırı denetimi: `scripts/check-feature-imports.sh` — `features/<a>/` içinden `features/<b>/<iç dosya>` importu yasak (yalnız `features/<b>` veya `features/<b>/index`); `api/shop/**` içinden `features/catalog` importu yasak; `pnpm verify`'a.
  6. `-` Döngüsel import denetimi: araç kararı (`dependency-cruiser` gibi yeni bağımlılık mı, yoksa 5'teki betiğe basit grafik kontrolü mü).
  7. `-` Silinebilirlik denetimi: `scripts/check-feature-isolation.sh` yaprak feature'ları (başkasının import etmediği) geçici olarak kaldırıp `pnpm typecheck` koşar; yalnız haftalık/elle (pahalı).
  8. `-` `packages/admin-sdk` (UI belgesi 1 ve 3 `@openmers/admin-sdk/ui` diyor, ağaçta yok): ağaca ve workspace'e ekleme kararı madde 32 ile.
  9. `-` Ağaçtaki `apps/api/src/{shop,admin,hooks,platform,worker}` klasörleri yerelde boş ve git'te izlenmiyor; ilk dosyalar madde 5 ve 8 ile gelir.
  10. `-` Yayın yüzeyleri: `contract`, `ui`, `app-sdk`, `app-bridge`, `theme-kit`, `create-*` için `exports` ve (yayınlanacaksa) `private` kararı; `core` ve `db` iç paket kalır (madde 2.7).
- **Testler:** `check-feature-imports.sh` için bilinçli ihlal içeren örnekle kırılma (eklenirken elle); `pnpm typecheck` tüm paketlerde yeşil; `check-feature-isolation.sh` ilk koşuda yeşil.
- **Bitti sayılır:**
  - `core/src` ağaçtaki yedi klasörün hepsine sahip ve her `index.ts` gerçek koda bağlı (yer tutucu yalnız henüz aşaması gelmemiş feature'larda).
  - Feature sınırı ihlali `pnpm verify`'da kırılıyor.
  - Paketler arası bağımlılıklar `package.json`'da tanımlı, `pnpm install --frozen-lockfile` temiz.
- **Açık sorular / riskler:**
  - `features/` listesinde `audit`, `idempotency` yok (madde 8.10, 11.7); `money` için `core/lib/` kullanılıyor (madde 6.9). Belge güncellenmeli.
  - `catalogIndex`'in adı dosya adı kuralıyla (camelCase klasör) diğerlerinden farklı; sorun değil ama tutarlılık kararı.
  - Turborepo "gerekince": `pnpm -r` süresi kabul edilemez olduğunda eşik belirsiz.

---

## Bu gruptan ilk başlanacak 3 alt görev

1. **Madde 1.5 + 1.7 + 1.8:** `typescript` ve tip denetimini `pnpm verify`'a eklemek, `noNodejsModules` kuralı, çekirdek bağımlılıkların (Hono, oRPC v2, Drizzle 0.45.x, Zod 4, Better Auth) sürümlerini npm'den teyit edip sabitlemek. Sonraki her madde bu kapıların arkasında yazılır.
2. **Madde 6.1-6.3 + 6.5-6.8:** `packages/db` Drizzle kurulumu, ortak sütunlar ve `features/ids` (publicId, token, leakGate) — saf ve testli, `Platform` beklemeden başlar.
3. **Madde 5.1-5.3 + 5.6-5.7 ile madde 3.3/3.5:** `Platform` tipi, `atomic()` sözleşmesi, Node (SQLite) uygulaması ve `test-utils` SQLite koşucusu; ardından `platform-atomic` sözleşme testi. D1 tarafı (5.10, 3.4) hemen arkasından.
