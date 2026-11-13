# Aşama 1 veritabanı planı: `packages/db`, `packages/test-utils`, `0001 settings`, `0002 channels`

Durum 2026-11-13: plan, kod yok. `packages/db` ve `packages/test-utils` yalnız boş `index.ts` + `package.json` taşıyor; kökte `vitest.config.ts` `unit` ve `ui` projeleriyle duruyor, `integration` projesi yok.

Kaynaklar: [00-genel.md](00-genel.md), [01-cekirdek-isletme.md](01-cekirdek-isletme.md) `settings`, [02-ticaret.md](02-ticaret.md) `channels` / `channel_domains`, `03-cekirdek/01-platform-arayuzu.md`, `03-veri-kurallari.md`, `07-yapilandirma.md`, `01-tech-stack/01-tech-stack.md`, `08-isletme/03-test.md`, `06-surum-yukseltme.md`, `07-kurulum-ve-tohum-veri.md`, yol haritası madde 3, 5, 6, `openmers-db-structure` ve `openmers-testing` skill'leri.

İşaretler: **(doğrulanacak)** = sürüm, API ya da davranış npm/resmî belgeden teyit edilmedi. **(öneri)** = belgede yok, bu planda konuldu.

---

## 1. `packages/db` kurulum planı

### 1.1 Bağımlılıklar

| Paket | Nerede | Rol | Not |
|---|---|---|---|
| `drizzle-orm` **0.45.4** | `packages/db` dependencies | `sqlite-core` şema, `drizzle-orm/better-sqlite3` ve `drizzle-orm/d1` sürücüleri | Tech stack 0.45.x diyor; v1 RC (`@rc`) migration klasör biçimini değiştirdi (göç başına klasör), wrangler'ın düz dosya beklentisiyle uyumu belirsiz. 0.45.x kalınır. Teyit 2026-11-13: `npm view drizzle-orm version` = 0.45.4 (`latest`). |
| `drizzle-kit` **0.31.11** | `packages/db` devDependencies | `generate`, `check`, `--custom` boş migration | Teyit 2026-11-13: `latest` = 0.31.11 (0.45.x ORM ile eşleşen kararlı hat; 1.0 RC'ler ayrı etiket). Journal `version: 7`, düz `NNNN_<ad>.sql`. |
| `better-sqlite3` **13.1.1** | `apps/api` (Node adaptörü) ve `packages/test-utils` dependencies; bölüm A'da geçici olarak `packages/db` devDependencies (şema testi, `db:migrate:local`) | self-host sürücüsü, test koşucusu | Seçim gerekçesi 1.2. `packages/db` dependencies'e konmaz: şema paketi sürücüden bağımsız kalır. Teyit 2026-11-13; Node 26'da yerel ikili sorunsuz kuruldu (SQLite 3.54.1). pnpm 10 için `pnpm-workspace.yaml` `onlyBuiltDependencies: [better-sqlite3]`. |
| `@types/better-sqlite3` **9.6.0** | aynı paketlerde devDependencies | tip | Teyit 2026-11-13. |
| D1 sürücüsü | ek paket yok | `drizzle-orm/d1` drizzle-orm içinde gelir | Tip için `@cloudflare/workers-types` (`D1Database`), `apps/api` devDependencies. |
| `wrangler` | `apps/api` devDependencies | `wrangler d1 migrations apply`, yerel D1 | Sürüm (doğrulanacak). |
| `@cloudflare/vitest-pool-workers` | `packages/test-utils` devDependencies | D1 entegrasyon havuzu | Vitest 5.1.0 uyumu doğrulanmadı (bölüm 2.3). |

**Migration uzak-güvenlik testi:** `packages/db/test/migrations-remote-safe.test.ts` her `migrations/*.sql` dosyasını tarar (trigger gövdesinde `END;` vb. `wrangler --remote` kalıpları yasak); `docs/08-isletme/03-test.md` "Ek kapılar".

**Sürüm sabitleme yaklaşımı:** kök `package.json`'daki gibi tam sürüm (aralık işareti yok). `drizzle-orm` ve `drizzle-kit` aynı commit'te birlikte yükseltilir; yükseltme PR'ı `drizzle-kit check` + migration kapısını (1.5) çalıştırır. Tüm sürümler kurulumdan önce `npm view <paket> version` ile teyit edilir; bu belgedeki hiçbir sürüm teyitli değil (doğrulanacak). Yol haritası madde 1.8 ile aynı iştir.

### 1.2 `better-sqlite3` mı `node:sqlite` mı

Seçim: **`better-sqlite3`**.

- `01-platform-arayuzu.md` ve tech stack zaten `better-sqlite3` diyor; yol haritası 5.6 ve 3.3 buna göre yazıldı.
- Senkron API, `atomic(stmts)`'in self-host karşılığı olan "tek senkron transaction" ile birebir örtüşür; `db.transaction(fn)()` ara `await` olmadan çalışır.
- Drizzle 0.45.x'te `drizzle-orm/better-sqlite3` olgun sürücüdür; `serialize()` / `new Database(buffer)` test şablon kopyası için kullanılır (2.2).
- `node:sqlite` Node 22'de bayrak arkasında başladı, kararlılık düzeyi hâlâ deneysel/RC; Drizzle 0.45.x'te `drizzle-orm/node-sqlite` sürücüsünün bulunup bulunmadığı (doğrulanacak; skill sürüm belirtmeden listeliyor).
- Bedel: yerel derleme (node-gyp). Docker imajında ve CI'da önceden derlenmiş ikili gelmezse derleme araçları gerekir (doğrulanacak, `deploy/docker` Dockerfile'ı kontrol edilecek). Bu sorun çıkarsa `node:sqlite` yedek seçenektir; sürücü yalnız `apps/api/src/platform/node/sqlite.ts` ve `test-utils/src/sqlite.ts`'de değiştiği için geçiş iki dosyadır.

### 1.3 Klasör ve dosya ağacı

```
packages/db/
  package.json
  drizzle.config.ts            dialect sqlite, schema ./src/schema/index.ts, out ./migrations
  migrations/
    0000_baseline.sql          (öneri, açık soru 1) boş/no-op; 0001'in katalogla eşleşmesi için
    0001_settings.sql
    0002_channels.sql
    meta/_journal.json         drizzle-kit üretir, yalnız ekleme alır
    meta/NNNN_snapshot.json    drizzle-kit üretir
  src/
    index.ts                   yalnız schema ve tipleri dışa açar (madde 6.3)
    schema/
      index.ts                 tablo grubu dosyalarını yeniden dışa aktarır
      columns.ts               ortak sütun yardımcıları (madde 6.2)
      settings.ts
      channels.ts              channels + channel_domains
    migrator/
      plan.ts                  saf: dosya listesi + uygulanmışlar → bekleyenler, numara boşluğu hatası
      plan.test.ts
    migrations.test.ts         eklemeli kapı (1.5)
```

Migration çalıştırıcı iki hedefte:

| Hedef | Çalıştırıcı | Kayıt tablosu |
|---|---|---|
| Cloudflare | `wrangler d1 migrations apply <db>`; `wrangler` yapılandırmasında `migrations_dir = "packages/db/migrations"` | `d1_migrations` (wrangler yönetir) |
| Self-host | `apps/api/src/platform/node/migrate.ts` (madde 6.10): `node:fs` ile `migrations/*.sql` okur, `packages/db/src/migrator/plan.ts` ile bekleyenleri bulur, her dosyayı tek transaction'da `exec` eder ve kaydını aynı transaction'da yazar | `d1_migrations` ile aynı biçim (öneri; sütunlar `id, name, applied_at` varsayımı, doğrulanacak) |
| Test (SQLite) | `test-utils/src/sqlite.ts`, aynı `plan.ts` | aynı |
| Test (D1) | pool-workers `readD1Migrations` / `applyD1Migrations` (doğrulanacak) ya da Miniflare D1 üstünde aynı `plan.ts` | `d1_migrations` |

- Drizzle'ın kendi `migrate()`'i (`__drizzle_migrations`, özet tabanlı) **kullanılmaz** (öneri): iki hedefte iki ayrı "uygulandı" kaydı olur ve `openmers upgrade --check` (06-surum-yukseltme §2) iki farklı listeyi okur. Tek kayıt biçimi = tek bekleyen listesi.
- `node:fs` `packages/db`'ye girmez; dosya okuma Node adaptöründe ve test-utils'te.
- Yerleşik app migration dizileri (madde 6.12) aynı `plan.ts`'yi ayrı klasör ve ayrı kayıt adı önekiyle kullanır; bu plana dahil değil.

### 1.4 `package.json` script'leri (`packages/db`)

| Script | Ne yapar |
|---|---|
| `db:generate` | `drizzle-kit generate --name <ad>`: şemadaki farktan bir sonraki numaralı SQL'i üretir. |
| `db:custom` | `drizzle-kit generate --custom --name <ad>`: DSL'in ifade edemediği SQL için boş migration (FTS5, ifade indeksi, kısmi indeks gerekirse). |
| `db:check` | `drizzle-kit check`: journal/snapshot tutarlılığı. |
| `db:migrate:local` | Node çalıştırıcıyı yerel SQLite dosyasına uygular (geliştirme). |
| `test` | `plan.test.ts` ve `migrations.test.ts`; kök `pnpm test` zaten `packages/**/*.test.ts` topluyor, ayrı script gerekmeyebilir. |

D1'e uygulama script'i `apps/api`'de durur (`wrangler` orada): `db:migrate:d1:local` (`--local`) ve `db:migrate:d1:remote`. Kökte `scripts/check-migrations.sh` `pnpm verify`'a eklenir.

### 1.5 Adlandırma ve "uygulanmış migration düzenlenmez" denetimi

- Ad: `NNNN_<konu>.sql`, dört hane, sıfır dolgulu, konu kebab-case (`0002_channels.sql`). drizzle-kit'in varsayılan `index` öneki bu biçimi verir ve wrangler'ın beklediği `<sayı>_<ad>.sql` ile uyumludur (doğrulanacak). `--name` her zaman verilir; drizzle-kit'in rastgele adı (`0003_happy_hulk`) kabul edilmez.
- Tek konu: bir migration = katalogdaki bir şema dosyası satırı (00-genel "Şema dosyaları ve migration sırası").
- `migrations.test.ts` (birim, `pnpm test`):
  - numaralar `0000`'dan ardışık, boşluk ve tekrar yok;
  - her `.sql` dosyası `meta/_journal.json`'da var ve tersi;
  - içerikte `DROP TABLE`, `DROP COLUMN`, `RENAME`, `__new_` yok. drizzle-kit SQLite'ta tür/varsayılan/kısıt değişikliğinde tabloyu yeniden kurar (yeni tablo, kopyala, eskiyi düşür, yeniden adlandır); bu kapı tam olarak bunu yakalar.
- `scripts/check-migrations.sh` (CI, `main`'e karşı): `git diff --name-status origin/main -- packages/db/migrations` içinde `M`, `D` ya da `R` durumlu `.sql` varsa kırılır. `meta/_journal.json` için yalnız ekleme satırlarına izin verilir (silinen satır varsa kırılır). Snapshot dosyaları yalnız yeni dosya olarak gelebilir.
- Yerel geliştirmede henüz `main`'e girmemiş migration düzenlenebilir; kural "`main`'e girmiş olan" içindir.

---

## 2. `packages/test-utils` planı

Kural (testing skill §2): veritabanı mock'lanmaz, aynı test gövdesi gerçek SQLite ve gerçek D1'de koşar, her test taze veritabanı alır.

### 2.1 Dosyalar

```
packages/test-utils/src/
  index.ts              yalnız describeOnTargets ve yardımcıları dışa açar
  migrations.ts         migrations/*.sql okuma (node:fs) → { name, sql }[]; db/migrator/plan.ts'yi çağırır
  sqlite.ts             better-sqlite3 :memory:, foreign_keys=ON, migration'lar uygulanmış şablon + kopya
  d1.ts                 Miniflare izole D1 ya da pool-workers binding'i, aynı migration'lar
  runner.ts             describeOnTargets(name, (getDb) => { ... })
  queryPlan/
    parseQueryPlan.ts   saf
    parseQueryPlan.test.ts
    assertNoFullScan.ts I/O
  race.ts               expectExactlyOneWinner
```

`Platform` (madde 5) gelince `getDb` yerine `getPlatform` döner; bu planın kapsamı yalnız `db` (Drizzle örneği) + ham sürücü erişimidir. Yol haritası 3.10'da `race.ts` `integration-tests/helpers/` altında; ikisinden biri seçilmeli (açık soru 6). Bu plan `test-utils`'i öneriyor çünkü yerleşik app paketleri de kullanacak.

### 2.2 SQLite koşucusu ve izolasyon

- Dosya başına bir kez: `:memory:` veritabanı açılır, `PRAGMA foreign_keys = ON`, bütün migration'lar `plan.ts` sırasıyla uygulanır, sonuç `serialize()` ile şablon tamponuna alınır.
- Test başına: `new Database(şablon)` ile kopya (öneri; better-sqlite3'ün tampondan açma desteği ve hızı doğrulanacak). Kopya tutulmazsa yedek: her testte migration'ları baştan uygulamak (şimdilik iki migration, ucuz).
- Testler arası paylaşılan bağlantı yok; `afterEach` bağlantıyı kapatır. Tablo boşaltma (`DELETE FROM`) yöntemi kullanılmaz: FK sırası ve `sqlite_sequence` sızıntısı riski taşır.
- Pragmalar test ve üretimde aynı (`foreign_keys=ON`); WAL `:memory:`'de geçersizdir, sorun değil.

### 2.3 D1 hedefi

- Birinci yol: `@cloudflare/vitest-pool-workers`. Testler Worker çalışma ortamında koşar; D1 binding'i `cloudflare:test` `env`'inden gelir, migration'lar `readD1Migrations` (yapılandırmada) + `applyD1Migrations` (kurulum dosyasında) ile uygulanır; test başına izole depolama (doğrulanacak: API adları ve izolasyon seçeneğinin güncel sürümdeki adı). **Kurulu Vitest 5.1.0 ile uyumu doğrulanmadı.**
- İkinci yol (uyumsuzsa): Node havuzunda Miniflare API'si, `new Miniflare({ d1Databases: ["DB"], ... })`, `getD1Database("DB")`; test başına yeni Miniflare örneği ya da yeni veritabanı adı. Migration'lar `migrations.ts` + `plan.ts` ile `exec`/`batch` üzerinden.
- Kök `vitest.config.ts`'ye `integration` projesi (`integration-tests/**/__tests__/**/*.test.ts`), pool-workers seçilirse ayrı `integration-d1` projesi (madde 3.6). Bu belge yapılandırmayı yazmaz.
- `describeOnTargets` her `it`'i `[sqlite]` ve `[d1]` önekiyle iki kez kaydeder. Bir hedef ortamda yoksa (örn. pool-workers kurulamadı) test atlanmaz, kırılır: sessiz atlama tek hedefli testi gizler.
- `PRAGMA foreign_keys`: D1 FK'leri varsayılan zorlar (skill ⚠️, doğrulanacak); iki hedefte aynı davranış `runner.test.ts` ile denetlenir.

### 2.4 Sorgu planı yardımcısı

- `parseQueryPlan(rows)` saf: `EXPLAIN QUERY PLAN` satırları (`id, parent, notused, detail`) alır, ihlal listesi döner. İhlal: `detail` `SCAN <tablo>` ile başlıyor ve `USING INDEX` / `USING COVERING INDEX` / `USING INTEGER PRIMARY KEY` / `VIRTUAL TABLE INDEX` içermiyor. `SCAN CONSTANT ROW` ve `USE TEMP B-TREE` ihlal değil, ama `USE TEMP B-TREE FOR ORDER BY` isteğe bağlı uyarı olarak raporlanır (öneri).
- `assertNoFullScan(db, query, { allow?: string[] })` I/O: sorguyu `EXPLAIN QUERY PLAN` önekiyle aynı parametrelerle çalıştırır; ihlal varsa sorgu metni ve plan satırlarıyla kırılır. `allow` küçük, bellekte tutulan tablolar için açık istisna listesi (her istisna testte gerekçe yorumu taşır).
- Yalnız SQLite hedefinde koşar: D1'in `EXPLAIN QUERY PLAN`'ı kabul edip etmediği doğrulanmadı ve motor aynı SQLite. D1'de kabul edilirse iki hedefe genişletilir.
- Drizzle sorgusundan SQL: `query.toSQL()` → `{ sql, params }`.

### 2.5 Yarış testi yardımcısı

- `expectExactlyOneWinner(results, loserCode)`: `Promise.allSettled` sonuçlarında tam bir `fulfilled`/`ok`, kalanların belgelenen hata koduyla döndüğünü doğrular; son DB durumu kontrolü testin kendisindedir.
- Uyarı: `better-sqlite3` senkron olduğu için tek süreçte iki çağrı gerçekten iç içe geçmez; iç içe geçme yalnız çağrıların `await` noktalarında olur. Bu, "oku, `await`, yaz" hatasını yakalar (asıl hedef) ama motor düzeyi eşzamanlılığı kanıtlamaz. Gerçek eşzamanlılık D1 hedefinde (Miniflare istekleri) ya da iki ayrı bağlantıyla dosya veritabanında denenir (öneri, açık soru 7).

---

## 3. Şema şartnamesi

Ortak: zaman UTC epoch ms `integer`; boolean `integer({ mode: "boolean" })` 0/1; JSON `text({ mode: "json" }).$type<...>()`; enum `text({ enum: [...] })` yalnız tip düzeyidir, zorlama için `check()` eklenir (skill engine-sqlite).

### 3.1 `0001_settings` (`schema/settings.ts`)

| Sütun | SQLite türü | Boş | Varsayılan | Drizzle karşılığı | Not |
|---|---|---|---|---|---|
| `id` | INTEGER PK | hayır | rowid | `integer("id").primaryKey()` | iç kimlik; `public_id` yok (dışa varlık olarak açılmaz) |
| `scope` | TEXT | hayır | — | `text("scope", { enum: ["global","channel","admin_user","customer","built_in_app"] })` | `check`: değer listesi |
| `scope_id` | INTEGER | hayır | `0` | `integer("scope_id").notNull().default(0)` | global = 0 (öneri). NULL benzersizliği bozduğu için NULL kullanılmaz; FK yok (çok biçimli hedef) |
| `key` | TEXT | hayır | — | `text("key").notNull()` | `.` ayırıcılı, `check(length(key) > 0)` |
| `value` | TEXT (JSON) | hayır | — | `text("value", { mode: "json" }).notNull()` | şema kodda (Zod), DB doğrulamaz |
| `created_at` | INTEGER | hayır | — | `columns.ts` `createdAt()` | katalog 01 (§6 madde 14) |
| `updated_at` | INTEGER | hayır | — | `integer("updated_at").notNull()` | değer `Ctx` saatinden, DB varsayılanı yok |

- **Benzersiz:** `settings_scope_key_uq` `(scope, scope_id, key)` (`uniqueIndex`). `getSettings` hem nokta okumayı hem kapsam taramasını bu indeksin solundan yapar; ek indeks yok.
- **Check:** `settings_scope_ck` `scope IN (...)`; `settings_scope_id_ck` `(scope IN ('global', 'built_in_app')) = (scope_id = 0)` (katalog 01).
- **Özel satırlar (öneri, açık soru 2-3):** `('global', 0, 'settings.version')` sayaç; `('global', 0, 'setup.completed_at')` kurulum bitiş zamanı. İkisi de sütun değil satırdır (tablo anahtar-değer).
- **Tohum:** yok. Varsayılanlar kodda (`features/settings/defaults.ts`); `settings.version` satırı ilk yazımda upsert ile oluşur.

### 3.2 `0002_channels` (`schema/channels.ts`)

`channels`:

| Sütun | SQLite türü | Boş | Varsayılan | Drizzle karşılığı | Not |
|---|---|---|---|---|---|
| `id` | INTEGER PK | hayır | rowid | `integer("id").primaryKey()` | |
| `public_id` | TEXT | hayır | — | `columns.ts` `publicId()` | `chn_` + 10 Crockford; benzersiz |
| `code` | TEXT | hayır | — | `text("code").notNull()` | benzersiz; `check(code = lower(code))` (öneri) |
| `type` | TEXT | hayır | `'b2c'` | `text("type", { enum: ["b2c","b2b","hybrid"] }).notNull().default("b2c")` | `check` |
| `default_currency` | TEXT | hayır | — | `text("default_currency").notNull()` | ISO 4217, `check(length = 3)` |
| `currencies` | TEXT (JSON dizi) | hayır | — | `text("currencies", { mode: "json" }).$type<string[]>().notNull()` | `default_currency` içermeli: kodda doğrulanır |
| `default_lang` | TEXT | hayır | `'en'` | `text("default_lang").notNull().default("en")` | BCP 47 |
| `langs` | TEXT (JSON dizi) | hayır | — | `text("langs", { mode: "json" }).$type<string[]>().notNull()` | |
| `prices_include_tax` | INTEGER | hayır | `0` | `integer(..., { mode: "boolean" }).notNull().default(false)` | kurulum sihirbazı 3. adım yazar |
| `access` | TEXT | hayır | `'public'` | `text("access", { enum: ["public","login_required","approved_companies_only"] })` | `check` |
| `guest_checkout` | INTEGER | hayır | `1` | boolean, `default(true)` | |
| `min_order_amounts` | TEXT (JSON nesne) | evet | NULL | `text("min_order_amounts", { mode: "json" }).$type<Record<string, number>>()` | para birimi başına küçük birim `{ "USD": 5000 }`; `check(json_type = 'object')` (§6 madde 14) |
| `sync_prices` | INTEGER | hayır | `0` | boolean, `default(false)` | |
| `statement_name` | TEXT | evet | NULL | `text("statement_name")` | ASCII denetimi kodda |
| `timezone` | TEXT | hayır | `'UTC'` | `text("timezone").notNull().default("UTC")` | IANA adı; belgede yok (02 açık sorusu) |
| `is_default` | INTEGER | hayır | `0` | boolean, `default(false)` | |
| `settings` | TEXT (JSON nesne) | hayır | `'{}'` | `text("settings", { mode: "json" }).$type<Record<string, unknown>>()` | görünüm/iletişim ayarları, şema kodda; `check(json_type = 'object')` (katalog 02) |
| `settings_version` | INTEGER | hayır | `0` | `integer("settings_version").notNull().default(0)` | |
| `created_at` | INTEGER | hayır | — | `columns.ts` `createdAt()` | |
| `updated_at` | INTEGER | hayır | — | `columns.ts` `updatedAt()` | |

- **Benzersiz:** `channels_public_id_uq` `(public_id)`; `channels_code_uq` `(code)`; `channels_default_uq` `(is_default) WHERE is_default = 1` (kısmi; `uniqueIndex().on(t.isDefault).where(sql\`...\`)`, drizzle-kit'in SQLite için `WHERE`'i SQL'e yazdığı doğrulanacak, yazmıyorsa `db:custom` ile elle).
- **Ertelenen sütunlar:** `default_tax_zone_id`, `default_shipping_zone_id` (`zones`, 0010) ve `default_price_list_id` (`price_lists`, 0008) bu migration'da **yok**. SQLite sonradan FK kısıtı eklemeye izin vermez, ama `ALTER TABLE ... ADD COLUMN x INTEGER REFERENCES zones(id)` (varsayılan NULL) izinlidir; sütunlar hedef tablonun migration'ında eklemeli olarak gelir (öneri). Kanal başına görünüm/iletişim ayarları (logo, e-posta göndereni, SEO, IBAN) katalog 02'ye göre `channels.settings` JSON sütunundadır; tema `channel_themes` (§6 madde 14).
- **İndeks:** başka yok. Tablo bellekte tutulur, istek yolunda sorgulanmaz.

`channel_domains`:

| Sütun | SQLite türü | Boş | Varsayılan | Drizzle karşılığı | Not |
|---|---|---|---|---|---|
| `id` | INTEGER PK | hayır | rowid | `integer("id").primaryKey()` | |
| `channel_id` | INTEGER FK | hayır | — | `integer("channel_id").notNull().references(() => channels.id)` | `ON DELETE` yok: kanal silinmez, yumuşak silme de yok (açık soru 4) |
| `domain` | TEXT | hayır | — | `text("domain").notNull()` | küçük harf, port yok, sonda nokta yok; `check(domain = lower(domain))` |
| `default_lang` | TEXT | evet | NULL | `text("default_lang")` | NULL = kanalın dili |
| `is_primary` | INTEGER | hayır | `0` | boolean, `default(false)` | |
| `secondary_mode` | TEXT | evet | NULL | `text("secondary_mode", { enum: ["redirect","serve"] })` | yalnız ikincilde: `redirect` (birincile 301) · `serve`; `check` değer listesi |
| `created_at` | INTEGER | hayır | — | `createdAt()` | |
| `updated_at` | INTEGER | hayır | — | `updatedAt()` | katalog 02 (§6 madde 14) |

- **Benzersiz:** `channel_domains_domain_uq` `(domain)`; `channel_domains_primary_uq` `(channel_id) WHERE is_primary = 1` (kısmi).
- **Check:** `channel_domains_primary_mode_ck` `(is_primary = 1) = (secondary_mode IS NULL)` (katalog 02).
- **İndeks:** `channel_domains_channel_idx` `(channel_id)`: FK join'i ve kanal silme denetimi için (kısmi indeks yalnız birincil satırları kapsar).
- `public_id` yok: alan adı API'de değeriyle tanınır (öneri).

### 3.3 Tohum veri

`07-kurulum-ve-tohum-veri.md`: varsayılan kanal kurulum sihirbazının 2. adımında kullanıcı girdisiyle oluşur ve tohum betikleri ham SQL değil `core` fonksiyonu çağırır. Bu yüzden migration'a `INSERT` konmaz (öneri, açık soru 8).

- `features/channels/createDefaultChannel.ts` (`core`): girdi `{ code = "default", currency = "USD", lang = "en", timezone = "UTC", domain? }`; `public_id` `newPublicId("chn_")` ile. Tek `atomic()`: kanal satırı + (varsa) birincil alan adı.
- Global varsayılanlar `EN` ve `USD` kodda (`features/settings/defaults.ts`) durur, `settings` satırı olarak tohumlanmaz.
- Test tohumu: `integration-tests/helpers/seed/createChannel.ts` aynı `core` fonksiyonunu çağırır (madde 3.11).

### 3.4 Sorgular ve testler

Dosya adları yol haritasıyla aynı camelCase (01 kataloğundaki `get-settings.ts` biçimi değil; açık soru 9). Her sorgu kendi dosyasında; handler'da SQL yok.

| Dosya | Ne yapar | Testler (`describeOnTargets`, iki hedef) |
|---|---|---|
| `features/settings/queries/getSettings.ts` | Verilen `(scope, scope_id)` çiftlerinin tüm satırlarını tek sorguda döner (global + bir kanal = tek `WHERE (scope, scope_id) IN (...)` ya da `OR`) | iki kapsamın satırlarını tek turda döner; başka kanalın satırını döndürmez; `assertNoFullScan` (SQLite) |
| `features/settings/resolveSetting.ts` (saf, sorgu değil) | düşüş zinciri: kanal → global → kod varsayılanı | birim: kanal değeri genel değeri ezer; kanal yoksa genel; ikisi de yoksa varsayılan; `user` kapsamı kanal zincirine karışmaz |
| `features/settings/queries/setSetting.ts` | `atomic([upsert ON CONFLICT(scope, scope_id, key) DO UPDATE, settings.version + 1])` | ilk yazım ekler, ikinci yazım günceller (satır sayısı 1 kalır); her yazımda sürüm tam 1 artar; geçersiz `scope`/`scope_id` çifti `check` ile reddedilir; iki eşzamanlı yazımdan sonra sürüm 2 artmış |
| `features/settings/queries/getSettingsVersion.ts` | `settings.version` nokta okuma | satır yokken 0 döner |
| `features/settings/queries/markSetupCompleted.ts` | `INSERT ... ('global',0,'setup.completed_at') ON CONFLICT DO NOTHING`; dönüş etkilenen satır | yarış: iki eşzamanlı çağrıdan tam biri 1 alır (`expectExactlyOneWinner`), değer ilk yazanınki kalır |
| `features/channels/queries/loadChannels.ts` | tüm kanallar + alan adları, `batch` ile iki sorgu tek tur | boş DB'de boş liste; alan adları kanallarına doğru bağlanır; tur sayısı 1 (sayaç madde 3.7 gelince) |
| `features/channels/queries/insertChannel.ts` | `createDefaultChannel` ve admin oluşturma için ekleme | `code` tekrarı benzersiz ihlali; ikinci `is_default = 1` kısmi indeksle reddedilir; `public_id` çakışmasında yeniden deneme (madde 6.6) |
| `features/channels/queries/updateChannel.ts` | alan güncelleme + `settings_version = settings_version + 1` aynı ifadede | her güncellemede `settings_version` 1 artar; `updated_at` değişir |
| `features/channels/queries/deleteChannel.ts` | `DELETE ... WHERE id = ? AND is_default = 0` (alan adları aynı `atomic()`'te önce) | varsayılan kanal silinmez (etkilenen 0); alan adı olan varsayılan olmayan kanal alan adlarıyla birlikte silinir; FK açıkken alan adı kalırsa silme reddedilir |
| `features/channels/queries/insertChannelDomain.ts` | alan adı ekleme (küçük harfe çevirme kodda) | aynı alan adı iki kanala eklenemez; kanal başına ikinci birincil reddedilir; büyük harfli girdi `check`'e takılır |
| `features/channels/resolveChannel.ts` (saf, bellek üstünde) | `Host` → kanal + dil | bilinmeyen alan adı `null` (varsayılana düşmez, 404); `default_lang` NULL ise kanalın dili; ikincil alan `secondary_mode = 'redirect'` ise yönlendirme, `serve` ise kendi diliyle sunum |

Şema testleri (`integration-tests/core/__tests__/`): `schema-settings.test.ts` / `schema-channels.test.ts` `sqlite_master`'dan beklenen indeks adlarını doğrular (madde 3.9); `runner.test.ts` iki hedefte `SELECT 1` ve testler arası veri sızmadığını doğrular.

---

## 4. Sıralı iş listesi

- Bağımlılık sürümlerini npm'den teyit et (`drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `wrangler`, `@cloudflare/vitest-pool-workers`). Bitti sayılır: sürümler bu belgeye ve yol haritası 1.8'e yazıldı, pool-workers'ın Vitest 5.1.0 ile uyumu evet/hayır olarak kaydedildi.
- `packages/db` bağımlılıkları, `drizzle.config.ts`, script'ler (1.4). Bitti sayılır: boş şemayla `db:check` hatasız; `pnpm lint` yeşil.
- `migrator/plan.ts` + `plan.test.ts`. Bitti sayılır: bekleyen listesi, boşluk ve tekrar hatası birim testleri yeşil.
- `migrations.test.ts` + `scripts/check-migrations.sh`, `pnpm verify`'a bağlı. Bitti sayılır: `DROP TABLE` içeren örnek dosya testi kırıyor; `main`'deki bir migration'ı değiştiren dal CI'da kırılıyor.
- `test-utils` `migrations.ts`, `sqlite.ts`, `runner.ts` (yalnız SQLite) ve kök `integration` projesi. Bitti sayılır: `runner.test.ts` SQLite'ta yeşil, iki test arasında veri sızmıyor.
- `parseQueryPlan.ts` + `assertNoFullScan.ts`. Bitti sayılır: örnek plan satırlarıyla birim testi; bilerek indekssiz sorgu kırılıyor, indeksli hali geçiyor.
- `race.ts`. Bitti sayılır: iki kazananlı ve sıfır kazananlı sahte sonuçlarda kırılıyor.
- `columns.ts` + `0000_baseline` kararı (açık soru 1). Bitti sayılır: karar bu belgeye yazıldı, ilk dosya üretildi.
- `schema/settings.ts` + `0001_settings.sql`. Bitti sayılır: SQL elle gözden geçirildi (`check`, benzersiz indeks var), iki hedefte uygulanıyor, şema testi yeşil.
- `features/settings` sorguları ve testleri (3.4). Bitti sayılır: tablodaki tüm testler SQLite'ta yeşil; yarış testi tam bir kazanan veriyor.
- `schema/channels.ts` + `0002_channels.sql`. Bitti sayılır: iki kısmi benzersiz indeks SQL'de `WHERE` ile var (`sqlite_master` testi), ertelenen FK sütunları yok, iki hedefte uygulanıyor.
- `features/channels` sorguları, `resolveChannel.ts`, `createDefaultChannel.ts` ve testleri. Bitti sayılır: tablodaki tüm testler SQLite'ta yeşil; varsayılan kanal silinemiyor.
- `test-utils/src/d1.ts` + D1 hedefi `runner.ts`'ye. Bitti sayılır: yukarıdaki entegrasyon testlerinin hepsi D1'de de yeşil ve `pnpm verify` içinde.
- `apps/api/src/platform/node/migrate.ts` ve `wrangler` `migrations_dir`. Bitti sayılır: aynı klasör `wrangler d1 migrations apply --local` ve Node çalıştırıcıyla uygulanıyor, ikisinde `d1_migrations` aynı adları içeriyor.
- 00-genel ve 01/02 katalog satırlarını `-` → `+` güncelle. Bitti sayılır: durum işaretleri kodla eşleşiyor.

---

## 5. Açık sorular

1. **Numara başlangıcı:** drizzle-kit ilk dosyayı `0000` ile üretir, katalog `0001_settings` diyor. Öneri: `db:custom --name baseline` ile no-op `0000_baseline.sql`. Yorum satırından ibaret dosyayı wrangler'ın kabul edip etmediği doğrulanmadı; gerekirse içine `SELECT 1;`. Alternatif: katalogu bir aşağı kaydırmak.
2. **`settings_version` yeri:** öneri global `settings.version` satırı. `channels.settings_version` ayrıca var; kanal kapsamlı ayar yazımı ikisini de mi artırır, yoksa önbellek yalnız birini mi izler? Tek sayaç yeterli olabilir.
3. **`setup_completed_at`:** satır (öneri) mi sütun mu; kurulum adım 1-4'ün `atomic()`'i bu satırı koşul olarak kullanır (`WHERE NOT EXISTS`).
4. **Kanal silme:** belgede yumuşak silme yalnız katalog ve müşteri için. Siparişi olan kanal silinebilir mi? Öneri: siparişi/sepeti olan kanal silinmez, `archived_at` gerekirse sonraki migration.
5. **`min_order_amount`** çok para birimli kanalda: öneri `default_currency` cinsinden tek değer; kur dönüşümü istek anında yapılmadığı için (03-veri-kurallari §2) para birimi başına tablo gerekebilir.
6. **`race.ts` yeri:** `packages/test-utils` (öneri) mi, `integration-tests/helpers/` (yol haritası 3.10) mi.
7. **Yarış testinin gerçekliği:** SQLite'ta senkron sürücü motor düzeyi eşzamanlılık üretmez. İki bağlantılı dosya veritabanı modu eklenecek mi, yoksa D1 hedefi yeterli mi?
8. **Tohum veri:** brif varsayılan kanalı migration tohumu olarak istiyor; `07-kurulum-ve-tohum-veri.md` kanalı sihirbaza ve `core` fonksiyonuna veriyor. Öneri ikincisi. "Sistem" tohumları (para birimleri, roller) migration'la gelir ama bunlar 0003 ve sonrası.
9. **Dosya adı biçimi:** `getSettings.ts` (yol haritası, backend skill) ile `get-settings.ts` (01 kataloğu) çelişiyor; öneri camelCase, 01 düzeltilir.
10. **`user` kapsamı** yönetici mi müşteri mi (01 açık sorusu); `scope_id` FK'siz olduğu için şemayı etkilemez, `resolveSetting` zincirini etkiler.
11. **D1 doğrulamaları:** `batch()` atomikliği (ATLANANLAR), FK varsayılan zorlaması, `EXPLAIN QUERY PLAN` desteği, `d1_migrations` tablo biçimi, pool-workers `applyD1Migrations` API'si.
12. **`better-sqlite3` Docker derlemesi:** imajda önceden derlenmiş ikili yoksa derleme araçları imaj boyutunu artırır; `node:sqlite` geçişi bu sonuca bağlı.

---

## 6. Kararlar (2026-11-13, plan denetimi)

Açık soruları kapatır; çelişirse bu bölüm geçerlidir. Sürüm ve D1 davranışı maddeleri (11, 12 ve bağımlılık sürümleri) kod başında teyit edilir, karar değildir.

1. **Baseline:** `0000_baseline.sql` içeriği `SELECT 1;` (yorum satırından ibaret dosyayı wrangler'ın kabul edip etmediği doğrulanmadı; `SELECT 1;` her iki ucu güvenceye alır). Katalog numaraları kalır.
2. **Ayar sürümü:** iki sayaç kalır, katalogdaki karar geçerlidir (`01-cekirdek-isletme.md` `settings`): kanal kapsamı `channels.settings_version`, global kapsam `settings.version` satırı. Önbellek ikisini de izler; tek sayaç tüm kanalların belleğini her yazımda boşaltırdı.
3. **`setup.completed_at`:** satır (anahtar-değer), sütun değil; kurulum `atomic()`'i `WHERE NOT EXISTS` ile koşullar.
4. **Kanal silme:** siparişi, sepeti ya da alan adı olan kanal silinmez; `archived_at` gerektiğinde ayrı migration. Aşama 1'de yalnız siparişsiz, varsayılan olmayan kanal silinir.
5. **`min_order_amount`** (madde 14 ile geçersiz): `default_currency` cinsinden tek değer; çok para birimli kanalda para birimi başına tablo ihtiyacı ölçümle çıkarsa ayrı migration (aşama 2).
6. **`race.ts`:** `packages/test-utils` (yerleşik app paketleri de kullanır); yol haritası 3.10 buna göre düzeltilir.
7. **Yarış testi:** iki katman. SQLite'ta `await` noktalarında iç içe geçme (oku-bekle-yaz hatasını yakalar); gerçek eşzamanlılık D1 hedefinde ve dosya veritabanında iki ayrı bağlantıyla (ikinci mod `test-utils/src/sqlite.ts`'e `file: true` seçeneği olarak eklenir). D1 hedefi kurulana kadar iki bağlantılı mod yeterli kabul edilir.
8. **Tohum veri:** migration'a `INSERT` konmaz (00-genel karar 11); varsayılan kanal `createDefaultChannel` ile.
9. **Dosya adı:** sorgu dosyaları camelCase (`getSettings.ts`); şema dosyaları kebab-case (`order-lines.ts`). Kataloglardaki `queries/` altındaki kebab adlar camelCase'e çevrildi.
10. **`user` kapsamı:** müşteri ve yönetici ayrı kimlik takımları olduğu için `scope = 'admin_user'` ve `'customer'` ayrı değerler olarak ayrılır (ilk sürümde yalnız `admin_user` kullanılır); `settings_scope_ck` listesi buna göre `global · channel · admin_user · customer · built_in_app`. Ctx kuruluşunda zincir: kanal → global → varsayılan, kullanıcı kapsamı zincire karışmaz.
11. **D1 doğrulamaları** (batch atomikliği, FK, `EXPLAIN QUERY PLAN`, `d1_migrations` biçimi, pool-workers API'si) ve **12. Docker derlemesi** sorunu kod başında ölçülür; sonuç bu belgeye yazılır. `better-sqlite3` kalır, `node:sqlite` yedektir.
13. **`currency_rates` (karar: kullanıcı "devam et" dedi, öneri geçerli):** `rate_e9` tamsayı (kur × 10⁹), `(base, quote, as_of_date)` benzersiz, günlük geçmiş tutulur, güncel kur en son `as_of_date`'tir; tablo 0008 migration'ındadır, aşama 1 kapsamı dışı.
14. **Şema katalogla hizalandı:** kanonik kaynak katalogdur (`01-cekirdek-isletme.md` `settings`, `02-ticaret.md` `channels`/`channel_domains`). `settings.created_at`; `channels.settings` JSON (`{}`); `channel_domains.secondary_mode` + `updated_at`, `redirect_to_primary` çıktı. Açık soru 5 `min_order_amounts` JSON (para birimi başına küçük birim) ile kapandı; madde 5'in yerine geçer. Ertelenen FK sütunları (`default_tax_zone_id`, `default_shipping_zone_id`, `default_price_list_id`) hedef tablolarla gelir.
