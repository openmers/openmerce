# Veritabanı kataloğu 1: çekirdek ve işletme

> **Denetim (2026-11-13):** 30 tablo (mağaza DB 28, kontrol düzlemi 2; önceki sürümde 24 başlık vardı: 2FA/passkey başlığı 4 tabloya bölündü, Better Auth gereği `admin_accounts` ve `admin_verifications`, karar 4 gereği `app_installations` eklendi). yaklaşık 40 düzeltme (belgeyle/kararla çelişen, uydurulmuş ya da eksik; elle sayım), 166 "(karar: …)" işareti (önceki "(çıkarım)"/"(öneri)" işaretlerinin tümü kapatıldı, yeni tablolar da kararla tanımlandı), 15 açık kaldı (dosya sonu). `00-genel.md` tablo sayısı (24) ve 0003/0011/0027 satırları bu dosyaya göre güncellenmeli.

Kapsam: `docs/01-tech-stack/01-tech-stack.md`, `docs/02-genel-mimari/*`, `docs/03-cekirdek/*`, `docs/08-isletme/*`, `docs/04-genisletme/03-tak-calistir-apps.md`, `05-tak-calistir-app-gelistirme.md`, `06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md`. Kurallar: `03-cekirdek/03-veri-kurallari.md`, `.claude/skills/database/openmers-db-structure/SKILL.md`, `ATLANANLAR.md` 2026-11-13 kararları, `00-genel.md` "Bu dizinde verilen kararlar".

## Özet

Bu grup ticaret tablolarını değil, her şeyin altındaki altyapı tablolarını tanımlar: ayar deposu, yönetici ve müşteri kimliği (Better Auth), rol/izin ve kayıt düzeyi politika, makine kimlikleri, tak-çalıştır app kaydı, sır kasası, idempotency, outbox (olay + iş kuyruğu tek tablo), zamanlanmış görev kilidi, hash zincirli denetim kaydı ve çapası, misafir sipariş erişimi, dış sistem kimlik eşlemesi ve (v1 dışı) SaaS kontrol düzlemi.

- **Tablo sayısı: 30** (mağaza veritabanında 28, ayrı kontrol düzlemi veritabanında 2).
- **Adı belgede açıkça geçenler (15):** `settings`, `admin_users`, `admin_sessions`, `users`, `sessions`, `accounts`, `access_policies`, `outbox`, `scheduled_runs`, `audit_log`, `audit_anchors`, `order_guest_access`, `external_refs`, `tenants`, `tenant_domains`.
- **Adı `00-genel.md` kararıyla konanlar (6):** `roles`, `role_permissions`, `admin_role_assignments` (karar 1), `app_installations` (karar 4), `auth_verifications`, `idempotency_keys` (0011/0004 listesi).
- **Adı bu denetimde kararla konanlar (9):** `admin_accounts`, `admin_verifications`, `admin_two_factors`, `admin_passkeys`, `two_factors`, `passkeys`, `api_keys`, `channel_publishable_keys`, `secrets`.
- Önbellek, hız sınırı, metrikler ve kurulum anahtarı **tablo değildir** (KV/LRU, binding, bellek, log/secret). Ayrı `jobs` tablosu **yoktur** (outbox'un `kind` sütunu). `notification_types` tablo değildir (karar 2).

Ortak kurallar (her tabloya uygulanır, tekrar yazılmadı): iç `id` `integer` PK, API'ye çıkmaz; dışarıda önekli `public_id text` (önek + 10 karakter Crockford base32, benzersiz indeks, çakışmada 3 yeniden deneme); zamanlar `integer` UTC unix ms; boolean `integer` 0/1; JSON `text` + `{ mode: "json" }`; para `integer` küçük birim + `currency text(3)`; oranlar baz puan; JSON yalnız birlikte okunup yazılan veri için; filtrelenen şey sütundur; yazmalar `atomic(stmts)` = `db.batch()`, interaktif transaction yok, eşzamanlılık koşullu `UPDATE ... WHERE`; migration eklemeli, liste/filtre sorgusunun indeksi aynı migration'da. Şema dosyaları `packages/db/src/schema/<grup>.ts`, 250 satır sınırı; dosya adları `00-genel.md` migration tablosuyla aynıdır.

**Better Auth eşlemesi (bu dosyanın C ve B bölümleri):** Better Auth çekirdek modelleri `user`, `session`, `account`, `verification`; eklentiler `twoFactor` (tablo + `user.twoFactorEnabled`) ve `passkey`. Model ve alan adları `modelName` / `fields` ile bizim snake_case adlarımıza eşlenir; ek alanlar `additionalFields` ile. Müşteri ve yönetici için iki ayrı Better Auth örneği, iki ayrı tablo takımı (`08-kimlik-dogrulama.md` bölüm 1). Kimlik: Better Auth varsayılanı metin kimliktir; bizde `integer` (karar: veri kuralı bölüm 1; Better Auth'un sayısal kimlik seçeneğiyle — açık 1).

**`public_id` önekleri (bu dosya):** `adm_` admin_users, `rol_` roles, `acp_` access_policies, `apk_` api_keys, `cpk_` channel_publishable_keys, `app_` app_installations, `evt_` outbox, `aud_` audit_log, `tnt_` tenants. 2026-11-13 itibarıyla `02`/`03` dosyalarındaki öneklerle (`prod_ var_ col_ ord_ itm_ ref_ cus_ com_ quo_ chn_ pl_ thm_ apr_`) çakışma yok. Token önekleri (`omk_`, `oma_`, `omp_`, `otk_`) `public_id` değildir, ayrı ad alanı.

---

## A. Ayarlar ve kurulum

### `settings`
- **Sahip:** `packages/core/src/features/settings`; şema `packages/db/src/schema/settings.ts` (0001).
- **Kaynak:** `03-cekirdek/07-yapilandirma.md` "Ayar deposu"; `03-cekirdek/05-onbellek.md` "Bellek içi sıcak yapılandırma"; `03-cekirdek/06-guvenlik-ve-yetki.md` "Saklama" (`audit.retention_days`); `08-isletme/07-kurulum-ve-tohum-veri.md` bölüm 2 (`settings.setup_completed_at`); `08-isletme/05-cok-kiracili-saas.md` bölüm 8; `05-ticaret/01-kanallar.md` (`settings_version`).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | iç PK |
| scope | text enum: `global · channel · admin_user · customer · built_in_app` (karar 2026-11-13, `04-asama-1-db-plani.md` §6 madde 10) | hayır | belge: "kapsamlar: global, channel, user, built-in app" |
| scope_id | integer | hayır, varsayılan 0 | (karar: global ve `built_in_app` için 0; NULL benzersizliği bozduğu için NULL yok) kanal → `channels.id`, user → `admin_users.id`; FK kısıtı yok (çok biçimli) |
| key | text | hayır | ayırıcı `.` (ör. `audit.retention_days`, `invoice.deadline_basis`); `built_in_app` kapsamında `<app-id>.` önekli |
| value | text JSON | hayır | (karar: tipli değer, Zod şeması kodda) |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(scope, scope_id, key)` (karar: `getSetting` düşüş zinciri nokta okuma; `scope_id` NOT NULL olduğu için ifade indeksi gerekmez).
- **Kurallar:** okuma `getSetting(ctx, key)`: kanal → global → koddaki varsayılan. Değerler bellekte (TTL 30 sn) + `settings_version` sayacı; Workers'ta ıskada KV, sonra tek sorgu. Bellek anahtarı `(tenant, key)`. **Sırlar burada durmaz** (`secrets`). Satırda `version` yok (karar: yönetici ayar formu son-yazan-kazanır; eşzamanlı yazım yarışı yok, kurulum hariç).
  - `settings_version` (karar): kanal kapsamı için `channels.settings_version` sütunu (`02` dosyası); global kapsam için `settings` satırı `(global, 0, 'settings.version')`. Ayar yazımı ile sayaç artışı aynı `atomic()`.
  - `setup_completed_at` (karar: anahtar-değer tablosu, sütun değil): satır `(global, 0, 'setup.completed_at')`; kurulum adımı 1-4 ile aynı `atomic()` içinde `INSERT ... ON CONFLICT DO NOTHING`; etkilenen satır 0 ise ikinci gönderim reddedilir.
  - `user` kapsamı (karar): yönetici (`admin_users.id`). Müşteri tercihi müşteri tablosundadır; admin arayüz tercihleri `03`'teki `admin_user_prefs`'te.
  - `built_in_app` kapsamı (karar): app kaldırılınca kapsamın satırları toplu silinir; anahtar app kimliğiyle öneklidir.
  - Denetim bütünlük durumu (karar): `(global, 0, 'audit.last_verify')` JSON `{ at, ok, from, to }`.
  - Outbox sınırları (karar 8): `outbox.max_attempts` (10), `outbox.claim_timeout_minutes` (5), `outbox.sent_retention_days` (7).
- **İlişkiler:** `scope_id` → `channels` (`02`), `admin_users`.
- **Yapılacaklar:**
  - `schema/settings.ts`, migration (tablo + benzersiz indeks).
  - `features/settings/queries/getSettings.ts` (tüm kapsamı tek sorguda yükleme), `setSetting.ts` (upsert + sürüm artışı aynı `atomic()`).
  - Test: düşüş zinciri; yazmada sürüm artışı; kurulum ikinci gönderimde tek yönetici (`setup.completed_at` koşullu ekleme, yarış testi).
  - Tohum: yok (varsayılanlar kodda).
- **Açık sorular:** `legal_policy` ayarının şeması yazılmadı (ATLANANLAR; açık 2).

---

## B. Yönetici kimliği, rol, izin, politika

Yönetici tabloları Better Auth'un ikinci örneğidir: `user` → `admin_users`, `session` → `admin_sessions`, `account` → `admin_accounts`, `verification` → `admin_verifications`, `twoFactor` → `admin_two_factors`, `passkey` → `admin_passkeys`. Şema `schema/admin-auth.ts` + `schema/roles.ts` (`roles`, `role_permissions`, `admin_role_assignments`, `access_policies`; 250 satır sınırı), migration `0003_admin-auth.sql`. (Better Auth 1.7.23 doğrulandı: çekirdek ve eklenti modelleri `modelName` / `fields` ile yeniden adlandırılır (eklentilerde `schema` seçeneği); tamsayı kimlik `advanced.database.generateId: "serial"`; tarih alanlarına `Date` yazar, Drizzle'da bu tablolarda zaman sütunları `integer({ mode: "timestamp_ms" })`, SQL'de yine epoch ms.)

### `admin_users`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `03-cekirdek/08-kimlik-dogrulama.md` bölüm 1, 4; `08-isletme/07-kurulum-ve-tohum-veri.md` bölüm 2, 4; `03-cekirdek/06-guvenlik-ve-yetki.md` "Roller ve izinler".
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | iç PK |
| public_id | text | hayır | önek `adm_` (karar) |
| name | text | hayır | (karar: Better Auth `user.name` zorunlu) |
| email | text | hayır | müşteri `users` ile ayrı alan; aynı e-posta iki tarafta olabilir |
| email_verified | integer bool | hayır | (karar: Better Auth `user.emailVerified`; davet kabulünde 1) |
| image | text | evet | (karar: Better Auth `user.image`) |
| two_factor_enabled | integer bool | hayır | (karar: `twoFactor` eklentisinin `user` ek alanı) |
| session_version | integer | hayır, varsayılan 0 | belge açıkça yazar; rol/izin/kanal/politika değişiminde aynı `atomic()` içinde artar (`additionalFields`) |
| status | text enum: `invited · active · suspended` | hayır | (karar: belge "davet", "askıya alma" der; silme satırı siler değil `suspended` + oturum silme, denetim kaydının aktörü kalır) |
| created_at / updated_at | integer | hayır | |

- **Düzeltme:** önceki `password_hash` kaldırıldı (Better Auth parolayı `account` tablosunda tutar → `admin_accounts.password`). `last_reauth_at` kaldırıldı (yeniden doğrulama oturuma bağlı: `admin_sessions.reauth_at`).
- **Anahtar ve indeksler:** benzersiz `email` (karar: giriş ve davet tekil e-postaya dayanır), benzersiz `public_id`.
- **Kurallar:** kayıt yalnızca davetle (davet token'ı `admin_verifications`); ilk hesap kurulum sihirbazında `SuperAdmin`; `openmers admin create` kurtarma yolu (denetim kaydına `actor_type='system'` düşer). SuperAdmin silinemez. Askıya alma tüm oturumları aynı `atomic()` içinde siler ve önbellek anahtarlarını temizler. Her giriş, başarısız deneme, yeniden doğrulama `audit_log`'a. SuperAdmin için 2FA varsayılan zorunlu.
- **İlişkiler:** `admin_sessions`, `admin_accounts`, `admin_two_factors`, `admin_passkeys`, `admin_role_assignments`, `access_policies.admin_id`, `audit_log` aktörü.
- **Yapılacaklar:**
  - `schema/admin-auth.ts`, migration.
  - `features/auth/queries/adminByEmail.ts`, `bumpSessionVersion.ts` (çoklu yönetici için `UPDATE ... WHERE id IN (...)`).
  - Test: müşteri çerezi Admin API'de işe yaramaz; sürüm artınca eski oturum reddi; kurulum iki kez gönderilince tek yönetici (yarış testi).
- **Açık sorular:** iki ayrı örnekle farklı tablo adı: `modelName` ile mümkün (Better Auth 1.7.23 doğrulandı: ); iki örneğin aynı süreçte çalışması kodda doğrulanacak (açık 1).

### `admin_sessions`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1, 4; `05-onbellek.md` "Oturum önbelleği"; `06-guvenlik-ve-yetki.md` "Uygulama (tek yer)".
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| admin_user_id | integer FK → `admin_users` | hayır | Better Auth `session.userId` |
| token | text | hayır | (karar: Better Auth `session.token`; çerez `om_a`. (Better Auth 1.7.23 doğrulandı: özetleme seçeneği yok; 2026-11-13: adaptör sarmalayıcısıyla yalnız SHA-256 özeti saklanır, `apps/api/src/auth/hashedSessions.ts`) |
| expires_at | integer | hayır | kısa ve kayan (karar: hareketsizlik = kayan kısa süre, Better Auth `expiresIn` + `updateAge`; ayrı `last_seen_at` yok) |
| ip_address | text | evet | (karar: Better Auth alanı; kişisel veri, oturumla silinir) |
| user_agent | text | evet | (karar: Better Auth alanı) |
| session_version | integer | hayır | (karar: açılıştaki `admin_users.session_version` kopyası; uyuşmazsa red) |
| permissions | text JSON | hayır | (karar: kanal başına izin kümesi `{ [channelId]: string[] }`, açılışta hesaplanır; menü de buradan) |
| policy_sql | text | evet | (karar: belge "admin oturumunda saklanır" → satırda; önbellek kopyası da taşır. `access_policies`'ten derlenmiş tek SQL koşulu) |
| reauth_at | integer | evet | (karar: son parola/2FA doğrulaması; hassas işlem `now - reauth_at < 10 dk`) |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `token`; `(admin_user_id)` (tüm oturumları sonlandırma), `(expires_at)` (süpürme).
- **Kurallar:** doğrulama önbellekten (KV/LRU, kısa TTL); çıkış, parola, rol değişimi önbellek anahtarını siler. Önbellekteki kopya `session_version` ile reddedilir. Süresi dolanlar zamanlanmış görevle silinir.
- **İlişkiler:** `admin_users`.
- **Yapılacaklar:** şema + migration; `queries/adminSessionByToken.ts`, `revokeAdminSessions.ts`; test: askıya almada anında red; süpürme görevi.
- **Açık sorular:** süre değerleri belgede yok (açık 4).

### `admin_accounts`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1, 4 (yönetici parolayla girer). (karar: Better Auth parolayı `account` modelinde `providerId='credential'` satırında tutar; yönetici örneği için ayrı tablo gerekir.)
- **Sütunlar:** `id` integer; `admin_user_id` integer FK hayır; `provider_id` text hayır (yönetici için yalnız `credential`); `account_id` text hayır (Better Auth `accountId`; credential'da kullanıcı kimliği); `password` text evet (özet; Better Auth 1.7.23 varsayılanı scrypt N=16384/r=16/p=1, Node'da `node:crypto`, diğer ortamda `@noble/hashes` saf JS; Workers CPU'su ölçülmedi); `created_at`, `updated_at` (karar: Better Auth çekirdek alanları; OAuth alanları yönetici tarafında kullanılmaz ama Better Auth şeması için `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope` text/integer evet olarak bulunur).
- **Anahtar ve indeksler:** benzersiz `(provider_id, account_id)`; `(admin_user_id)`.
- **Kurallar:** parola değişimi `admin_users.session_version`'ı artırır.
- **İlişkiler:** `admin_users`.
- **Yapılacaklar:** Better Auth şema üreticisiyle karşılaştır + migration.

### `admin_verifications`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1 ("yalnızca davet"), bölüm 4. (karar: Better Auth `verification` modeli yönetici örneği için; davet ve parola sıfırlama token'ları burada. Önceki "davet tablosu yok" sorusu böyle kapandı.)
- **Sütunlar:** `id` integer; `identifier` text hayır (karar: `<amaç>:<hedef>`, ör. `admin-invite:<email>`, `reset-password:<token-özeti>`; (Better Auth 1.7.23 doğrulandı: `verification.storeIdentifier: "hashed"` ile özet saklanır); `value` text hayır ((Better Auth 1.7.23 doğrulandı: özet seçeneği yok); `expires_at` integer hayır; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** `(identifier)`; `(expires_at)` süpürme.
- **Kurallar:** tek kullanım, kullanılan satır silinir. Davet süresi (karar: şirket davetiyle aynı 7 gün, `08` bölüm 3 örneği).
- **İlişkiler:** yok (identifier metni).
- **Açık sorular:** `value`'nun özet olarak saklanması (açık 3).

### `admin_two_factors`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1, 4 (TOTP, kurtarma kodları özetleri). (karar: Better Auth `twoFactor` eklenti tablosu.)
- **Sütunlar:** `id` integer; `admin_user_id` integer FK hayır; `secret` text hayır (TOTP sırrı, şifreli); `backup_codes` text hayır (kurtarma kodları; belge "özetleri saklanır"); `verified` integer bool hayır, varsayılan 1; `failed_verification_count` integer hayır, varsayılan 0; `locked_until` integer evet. (Better Auth 1.7.23 doğrulandı: eklenti `created_at`/`updated_at` yazmaz, bu yüzden sütun yok; `verified`, `failed_verification_count`, `locked_until` eklentinin alanları. `backupCodes` için `storeBackupCodes: "plain" | "encrypted" | özel`; özet seçeneği yok, özel `encrypt`/`decrypt` ile yazılabilir.)
- **Anahtar ve indeksler:** benzersiz `(admin_user_id)` (karar: kullanıcı başına tek TOTP kaydı).
- **Kurallar:** kurtarma kodları bir kez gösterilir. TOTP sırrının şifrelenmesi (karar: `SECRETS_KEK`'ten türetilen anahtarla AES-GCM, kasa ile aynı `crypto.ts`; KEK yoksa demo kip, 2FA kurulamaz).
- **Açık sorular:** `backup_codes` özet mi şifreli mi: Better Auth yalnız düz/şifreli sunar, belge özet ister (açık 3).

### `admin_passkeys`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 4. (karar: Better Auth `passkey` eklenti tablosu.)
- **Sütunlar:** (Better Auth 1.7.23 doğrulandı: `@better-auth/passkey` alanları birebir; `credentialID` → `credential_id` `fields` eşlemesiyle.) `id` integer; `admin_user_id` integer FK hayır; `name` text evet; `public_key` text hayır; `credential_id` text hayır; `counter` integer hayır; `device_type` text hayır; `backed_up` integer bool hayır; `transports` text evet; `aaguid` text evet; `created_at`.
- **Anahtar ve indeksler:** benzersiz `credential_id`; `(admin_user_id)`.
- **Açık sorular:** eklenti alan listesi ve D1 uyumu sürümde doğrulanmalı (açık 1).

### `roles`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts` (0003).
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Roller ve izinler"; `07-kurulum-ve-tohum-veri.md` bölüm 3; `00-genel.md` karar 1.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| public_id | text | hayır | önek `rol_` (karar) |
| code | text | hayır | (karar: sabit makine adı; `SuperAdmin`) |
| name | text | hayır | (karar: görünen ad; yönetici arayüzü çevrilmez) |
| description | text | evet | (karar) |
| is_system | integer bool | hayır | (karar: SuperAdmin ve tohum rolleri silinemez/yeniden adlandırılamaz) |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `code` (karar).
- **Kurallar:** rol = izin kümesi; kanal başına **atanır** (rol kanala ait değil; karar 1, `role_channels` yok). Rolün izinleri değişince o role sahip tüm yöneticilerin `session_version`'ı aynı `atomic()` içinde artar.
- **İlişkiler:** `role_permissions`, `admin_role_assignments`, `access_policies.role_id`.
- **Yapılacaklar:** şema + migration; tohum (SuperAdmin, migration ile); test: SuperAdmin silme reddi.
- **Açık sorular:** hazır rol listesi (SuperAdmin dışı) belgede yok (açık 5).

### `role_permissions`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Roller ve izinler" (izin = `<varlık>:<eylem>`); `06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md` bölüm 2; `00-genel.md` karar 1.
- **Sütunlar:** `role_id` integer FK hayır; `permission` text hayır (`<varlık>:<eylem>`; sözlük kodda, built-in app'ler ekler); `created_at` integer hayır.
- **Anahtar ve indeksler:** PK `(role_id, permission)` (karar: bağlantı tablosu, iç `id` yok).
- **Kurallar:** ayrı tablo (karar 1; JSON alternatifi kapandı). İzin sözlüğü kodda (tip düzeyinde zorunlu); ayrı `permissions` tablosu yok (karar: sözlük kodda, tohum yalnız rol-izin atamasıdır). SuperAdmin için satır yazılmaz, kod "her şey" sayar (karar).
- **İlişkiler:** `roles`.
- **Yapılacaklar:** şema + migration; tohum; test: bilinmeyen izin adı reddi.

### `admin_role_assignments`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `06-guvenlik-ve-yetki.md` ("Roller kanal başına atanır"); `02-api-ve-istek-baglami.md` bölüm 4; `08-kimlik-dogrulama.md` bölüm 4; `00-genel.md` karar 1.
- **Sütunlar:** `id` integer; `admin_user_id` integer FK hayır; `role_id` integer FK hayır; `channel_id` integer FK → `channels` evet (karar: NULL = tüm kanallar, sonradan açılanlar dahil); `created_at` integer hayır.
- **Anahtar ve indeksler:** benzersiz ifade indeksi `(admin_user_id, role_id, COALESCE(channel_id, 0))` (karar: NULL tekrarını önler); `(role_id)` (rol değişince etkilenen yöneticileri bulup `session_version` artırmak için).
- **Kurallar:** atama değişimi yeniden doğrulama ister ve `session_version` artışı ile aynı `atomic()`. Bir yönetici kanal başına farklı rol alabilir.
- **İlişkiler:** `admin_users`, `roles`, `channels` (`02`).
- **Yapılacaklar:** şema + migration; `queries/permissionsForAdmin.ts` (oturum açılışında tek sorgu); test: B2B kanalında yönetici, B2C'de okuyucu; NULL kanal ataması yeni kanalda geçerli.

### `access_policies`
- **Sahip:** `features/auth`; şema `schema/admin-auth.ts`.
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Kayıt düzeyi erişim politikaları"; `08-kimlik-dogrulama.md` bölüm 4.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| public_id | text | hayır | önek `acp_` (karar: admin'den düzenlenir) |
| name | text | hayır | (karar: listede görünen ad, ör. "Marmara bölge") |
| role_id | integer FK → `roles` | evet | belge: "`role_id` (veya `admin_id`)" |
| admin_id | integer FK → `admin_users` | evet | (karar: CHECK `(role_id IS NULL) <> (admin_id IS NULL)`, tam biri dolu) |
| resource | text enum: `orders · customers · products · companies · quotes` | hayır | |
| condition | text JSON | hayır | kapalı şema, yalnız indeksli kapsam alanları |
| active | integer bool | hayır | |
| created_at / updated_at | integer | hayır | (karar) |

- **Anahtar ve indeksler:** `(role_id)`, `(admin_id)` (oturum açılışında yükleme). Politikanın kullandığı kapsam sütunlarının hedef tablolarda indeksi şart: orders `channel_id, company_id, shipping_country, shipping_province, assigned_to`; customers `channel, group_id, country, assigned_to`; products `channel, collection_id, product_type`, indeksli özel alan; companies `channel_id, assigned_to, tag`; quotes `channel_id, company_id, assigned_to`.
- **Kurallar:** oturum açılışında tek SQL koşuluna derlenir (`admin_sessions.policy_sql`); sorgu katmanı koşulsuz çalışmaz. Kapsam dışı ayrıntı 404. Uygulama token'ları politikaya tabi değil. Değişince etkilenen yöneticilerin `session_version`'ı aynı `atomic()` içinde artar.
- **İlişkiler:** `roles`, `admin_users`; dolaylı: orders, customers, products, companies, quotes.
- **Yapılacaklar:** şema + migration; `features/auth/policy/compile.ts` + `queries/policiesForAdmin.ts`; test: sözleşmeden üretilen sızıntı testi (liste, sayı, 404, dışa aktarma, ajan çıktısı), politikasız rolde eski sonuç.
- **Açık sorular:** hedef tablolarda kapsam sütunları eksik (aşağıda "Diğer dosyalara bildirilenler"); `customers.channel` / `products.channel` kanal bağlantı tablosu üzerinden derlenir (açık 6).

---

## C. Müşteri kimliği (Better Auth)

Müşteri tabloları Better Auth'un birinci örneğidir: `user` → `users`, `session` → `sessions`, `account` → `accounts`, `verification` → `auth_verifications`, `twoFactor` → `two_factors`, `passkey` → `passkeys`. Şema `schema/customers.ts` grubu (0011; 250 satırı aşarsa `customer-auth.ts` olarak ayrılır, migration numarası aynı kalır).

### `users`
- **Sahip:** `features/auth`; şema `schema/customers.ts` (0011).
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1, 2.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | `customers.user_id` bunu gösterir |
| name | text | hayır | (karar: Better Auth `user.name` zorunlu; boşsa e-postanın yerel kısmı) |
| email | text | hayır | |
| email_verified | integer bool | hayır | (karar: Better Auth `user.emailVerified`; doğrulanmamış hesap sipariş verir, hesap sayfasına giremez) |
| image | text | evet | (karar: Better Auth `user.image`) |
| phone_number | text | evet | (karar: Better Auth `phoneNumber` eklentisi ek alanı; SMS girişi isteğe bağlı) |
| phone_number_verified | integer bool | evet | (karar: aynı eklenti) |
| two_factor_enabled | integer bool | hayır, varsayılan 0 | (karar: `twoFactor` eklentisi; müşteri için isteğe bağlı) |
| session_version | integer | hayır, varsayılan 0 | belge: "kullanıcının `session_version` sayacı" (karar: `additionalFields`) |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `email` (karar: Better Auth gereği); kısmi benzersiz `phone_number WHERE phone_number IS NOT NULL` (karar).
- **Kurallar:** kayıt açık/kapalı kanal ayarı. Müşteri profili `customers` tablosundadır (`02`); kayıt aynı `customers` satırına `user_id` bağlar, e-posta doğrulandıktan **sonra**. `session_version` artışı: parola değişimi, çıkış, tüm cihazlardan çık, grup/şirket/fiyat listesi değişimi. Kişisel veri silmede (karar): `users` satırı, oturumları, hesapları, 2FA/passkey satırları silinir; `customers.user_id` NULL yapılıp `customers` anonimleştirilir (sipariş anlık görüntüsü yasal süre kalır).
- **İlişkiler:** `sessions`, `accounts`, `two_factors`, `passkeys`, `customers.user_id`.
- **Yapılacaklar:** şema (Better Auth Drizzle adaptörüne uygun) + migration; test: oturum sabitleme, sürüm artınca red, silmede kimlik satırlarının gitmesi.

### `sessions`
- **Sahip:** `features/auth`; şema `schema/customers.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 2, 3, 5; `02-api-ve-istek-baglami.md` bölüm 2.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| user_id | integer FK → `users` | hayır | |
| token | text | hayır | (karar: Better Auth `session.token`; çerez `om_s` veya mobil bearer. Özet saklama: açık 3) |
| expires_at | integer | hayır | uzun, kayan |
| ip_address / user_agent | text | evet | (karar: Better Auth alanları) |
| customer_id | integer | hayır | (karar: `customers.id`; belge "müşteri kimliği") |
| group_ids | text JSON | hayır | belge "grup kimlikleri" (karar: `number[]`, Ctx `customer.groupIds`) |
| active_company_id | integer | evet | etkin şirket (karar: FK kısıtı yok, `companies` 0022'de, bkz. migration sırası) |
| company_role | text enum `admin · buyer · approver` | evet | Ctx ile aynı |
| price_list_ids | text JSON | hayır | öncelik sırasıyla (karar: `number[]`) |
| session_version | integer | hayır | (karar: açılıştaki `users.session_version` kopyası; uyuşmazsa red) |
| version | integer | hayır, varsayılan 0 | belge `version`: oturum satırının kendi sayacı, segment yeniden yazımında artar |
| created_at / updated_at | integer | hayır | |

- **Düzeltme:** `token_hash` → `token` (Better Auth alanı); `sessions.version` ile `users.session_version` görevi ayrıldı (karar): `users.session_version` kullanıcı başına geçersiz kılma sayacıdır, oturum satırı açılışta kopyasını (`session_version`) taşır; `version` ise satırın iyimser kilit sayacıdır (etkin şirket değişimi `UPDATE ... WHERE id=? AND version=?`).
- **Anahtar ve indeksler:** benzersiz `token`; `(user_id)` (tüm cihazlardan çık), `(expires_at)` (süpürme).
- **Kurallar:** etkin şirket değişimi yeni oturum açmaz, `active_company_id`, `company_role`, `price_list_ids` alanlarını yeniden yazar, `version` artar. Vitrin isteğinde DB'ye gitmez (önbellek). Mobil aynı tablo.
- **İlişkiler:** `users`, `customers`, `companies`, `price_lists` (`02`/`03`).
- **Yapılacaklar:** şema + migration; `queries/sessionByToken.ts`, `switchCompany.ts`; test: başka şirketin verisine erişememe, eşzamanlı şirket değişiminde tek kazanan.

### `accounts`
- **Sahip:** `features/auth`; şema `schema/customers.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1, 2 (e-posta+parola, sosyal giriş Google/Apple); `08-isletme/08-veri-tasima.md` bölüm 3.
- **Sütunlar (karar: Better Auth `account` çekirdek şeması):**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| user_id | integer FK → `users` | hayır | |
| provider_id | text | hayır | `credential · google · apple` |
| account_id | text | hayır | sağlayıcıdaki hesap kimliği |
| password | text | evet | yalnız `credential`; parola özeti |
| access_token / refresh_token / id_token | text | evet | OAuth; sır niteliğinde |
| access_token_expires_at / refresh_token_expires_at | integer | evet | |
| scope | text | evet | |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(provider_id, account_id)` (karar); `(user_id)`.
- **Kurallar:** taşınan müşteriler parolasız içe aktarılır (`credential` satırı yok); ilk girişte tek kullanımlık kodla parola belirlenir.
- **İlişkiler:** `users`.
- **Yapılacaklar:** Better Auth şema üreticisiyle karşılaştır + migration.
- **Açık sorular:** OAuth token'larının şifreli saklanması belgede yok (açık 3).

### `auth_verifications`
- **Sahip:** `features/auth`; şema `schema/customers.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 2 (parola sıfırlama, e-posta tek kullanımlık kod), bölüm 3 (şirket daveti, 7 gün), bölüm 5 (mobil→WebView geçiş kodu, 60 sn).
- **Sütunlar (karar: Better Auth `verification` çekirdek şeması; önceki `purpose`/`token_hash`/`used_at` sütunları Better Auth'ta yok, kaldırıldı):** `id` integer; `identifier` text hayır (`<amaç>:<hedef>`; amaçlar `reset-password · email-otp · sign-in-otp · phone-otp · checkout-handoff · company-invite`); `value` text hayır (token/kod); `expires_at` integer hayır; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** `(identifier)`; `(expires_at)` süpürme.
- **Kurallar:** tek kullanım (karar): kullanım `DELETE ... WHERE identifier=? AND value=? AND expires_at > ?`; etkilenen satır 0 ise red (yarışta tek kazanan). E-posta outbox'tan gider. Yanıt hesap var/yok belli etmez. Şirket daveti (karar): ayrı tablo yok, token burada (`company-invite:<company_members.public_id veya id>`), üyelik durumu `03`'teki `company_members.status`'ta. Geçiş kodu 60 sn, davet 7 gün.
- **İlişkiler:** yok (identifier metni); davet → `company_members` (`03`).
- **Yapılacaklar:** şema + migration; test: geçiş kodu ikinci kullanımda red, sıfırlama token'ı tek kullanımlık (yarış testi).
- **Açık sorular:** belge "yalnızca özeti saklanır" der; Better Auth `value`'yu özet olarak saklama seçeneği doğrulanmalı (açık 3).

### `two_factors`
- **Sahip:** `features/auth`; şema `schema/customers.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1 (müşteri 2FA isteğe bağlı). (karar: Better Auth `twoFactor` eklenti tablosu.)
- **Sütunlar:** `id` integer; `user_id` integer FK hayır; `secret` text hayır (şifreli); `backup_codes` text hayır; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(user_id)`.
- **Kurallar:** `admin_two_factors` ile aynı (şifreleme, bir kez gösterim).

### `passkeys`
- **Sahip:** `features/auth`; şema `schema/customers.ts`.
- **Kaynak:** `08-kimlik-dogrulama.md` bölüm 1. (karar: belge passkey'i yalnız yönetici için sayar, müşteri için eklenti aynı şemayla açılır; kanal ayarıyla kapalı başlar.)
- **Sütunlar:** `admin_passkeys` ile aynı, `admin_user_id` yerine `user_id`.
- **Anahtar ve indeksler:** benzersiz `credential_id`; `(user_id)`.

---

## D. Makine kimlikleri, uygulamalar ve sırlar

Ortak kural (`08-kimlik-dogrulama.md` bölüm 6): yalnızca özeti saklanır, önek türü belli eder, son kullanım zamanı tutulur, iptal anında geçerlidir. Önek eşlemesi (karar: harf türün baş harfi): `omk_` API anahtarı (key), `oma_` uygulama token'ı (app), `omp_` yayınlanabilir kanal anahtarı (publishable). Özet: SHA-256 (Web Crypto), `text` hex.

### `api_keys`
- **Sahip:** `features/auth`; şema `schema/security.ts` (0004).
- **Kaynak:** `02-api-ve-istek-baglami.md` bölüm 4; `08-kimlik-dogrulama.md` bölüm 4, 6.
- **Sütunlar (karar; belge davranış verir):**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| public_id | text | hayır | önek `apk_` |
| name | text | hayır | |
| key_prefix | text | hayır | `omk_` + ilk 6 karakter, listede görüntü için |
| key_hash | text | hayır | yalnızca özet |
| permissions | text JSON | hayır | `string[]`, aynı izin sözlüğü |
| channel_ids | text JSON | evet | `number[]`; NULL = tüm kanallar (bellekte doğrulanır, SQL'de süzülmez) |
| created_by_admin_id | integer FK → `admin_users` | hayır | |
| last_used_at | integer | evet | |
| revoked_at | integer | evet | |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `key_hash` (istek başına doğrulama), benzersiz `public_id`.
- **Kurallar:** üretme yeniden doğrulama ister ve denetlenir; iptal anında geçerli (önbellek anahtarı silinir). `last_used_at` (karar): en çok dakikada bir, `UPDATE ... WHERE id=? AND (last_used_at IS NULL OR last_used_at < now-60000)`, `waitUntil` içinde; istek yolunu bekletmez.
- **İlişkiler:** `admin_users`, `audit_log` aktörü (`apiKey`).
- **Yapılacaklar:** şema + migration; `queries/apiKeyByHash.ts`; test: sızıntı kapısı token görmez, iptal anında red.

### `channel_publishable_keys`
- **Sahip:** `features/channels`; şema `schema/security.ts` (0004; `00-genel.md` listesi).
- **Kaynak:** `02-api-ve-istek-baglami.md` bölüm 4 ("gizli değildir; yalnızca kanalı seçer"); `08-kimlik-dogrulama.md` bölüm 6; `02-vendure-saleor-medusa-kararlar.md` bölüm 4.
- **Sütunlar (karar):** `id` integer; `public_id` text (`cpk_`); `channel_id` integer FK → `channels` hayır; `name` text evet; `key_prefix` text hayır (`omp_` + ilk 6); `key_hash` text hayır (karar: `08` bölüm 6 ortak kuralı; düz metin saklanmaz, kaybolursa yeni anahtar üretilir); `last_used_at` integer evet; `revoked_at` integer evet; `expires_at` integer evet (öneri, 2026-11-13: döndürmede eski anahtarın geçerlilik bitişi, varsayılan yenileme anı + `publishableKey.rotationGraceHours` = 24 saat; NULL = süresiz); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `key_hash`; `(channel_id)`.
- **Kurallar:** ayrı tablo (karar: kanal başına birden çok anahtar, döndürme ve iptal; `channels` sütunu değil). Ctx kurulumunda başlıktaki anahtarın özeti bellekteki `key_hash → channel` tablosundan çözülür (sorgu yok). `last_used_at` `api_keys` ile aynı seyrek yazım. **Döndürme:** yeni satır eklenir, eskinin `expires_at`'i `now + grace` yapılır (aynı `atomic()`); bellekteki tablo `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now)` ile çözer, süre dolan anahtar sorgusuz reddedilir. Sızıntıda anında iptal `revoked_at` ile yapılır (grace beklemez).
- **İlişkiler:** `channels` (`02`).
- **Yapılacaklar:** migration; test: iptal edilen anahtarla Shop API reddi; döndürme sonrası eski anahtar grace içinde geçer, `expires_at` sonrası reddedilir; `revoked_at` grace'i beklemeden reddeder.

### `app_installations`
- **Sahip:** `packages/core/src/features/apps`; şema `schema/apps.ts` (0027).
- **Kaynak:** `04-genisletme/03-tak-calistir-apps.md` bölüm 2, 3, 5, 7, 11, 12; `04-genisletme/05-tak-calistir-app-gelistirme.md` bölüm 3, 4, 11, 13, 14; `06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md` bölüm 1; `00-genel.md` karar 4.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| public_id | text | hayır | önek `app_` (karar) |
| app_key | text | hayır | manifest `id` (ters alan adı, `acme.loyalty`, değişmez); özel app'te (karar) `private.<public_id>`. `metadata` anahtar öneki ve `external_refs.source` buradan |
| kind | text enum `manifest · private` | hayır | belge: manifestli ve özel uygulama "aynı kayıt" |
| name | text | hayır | manifest `name` ya da formdaki ad |
| manifest_url | text | evet | özel app'te NULL |
| app_version | text | evet | manifest `version` (semver); özel app'te NULL |
| manifest | text JSON | hayır | (karar: son **onaylanan** manifest: `registerUrl`, `webhooks`, `syncHooks`, `extensions`, `agentTools`; özel app'te formdan üretilen eşdeğeri. Birlikte okunur; bellekteki `(olay, kanal) → uygulamalar` dizini açılışta buradan kurulur) |
| pending_manifest | text JSON | evet | (karar: arka plan kontrolünde izin/araç/risk genişleyen yeni sürüm; yeniden onay bekler) |
| permissions | text JSON | hayır | onaylanan izin kümesi `string[]`; varsayılan boş |
| channel_ids | text JSON | evet | kanal kapsamı `number[]`; NULL = tüm kanallar (belge: "varsayılan: hepsi") |
| token_prefix | text | hayır | `oma_` + ilk 6 (karar: `08` bölüm 6 önek; `05` belgesindeki `omat_` örneği ⚙️ öneridir) |
| token_hash | text | hayır | yalnızca özet |
| token_last_used_at | integer | evet | `api_keys` ile aynı seyrek yazım |
| status | text enum `installing · active · uninstalled` | hayır | (karar: `installing` = kayıt yazıldı, `registerUrl` yanıtı bekleniyor; başarısızsa satır silinir, kurulum geri alınır) |
| webhooks_suspended_at | integer | evet | (karar: belge "art arda başarısız olan uygulamanın **abonelikleri** askıya alınır"; token çalışmaya devam eder) |
| consecutive_failures | integer | hayır, varsayılan 0 | (karar: teslimat başarısında 0, hatada `+1`; eşik `apps.suspend_after_failures` ayarı) |
| trusted | integer bool | hayır, varsayılan 0 | belge 12.3 madde 4: `read` araçları yalnız güvenilir app'te onaysız |
| agent_tools_enabled | integer bool | hayır, varsayılan 1 | belge 12.3 madde 5: toptan kapatma |
| disabled_agent_tools | text JSON | hayır, varsayılan `[]` | araç bazında kapatma, `name[]` |
| installed_by_admin_id | integer FK → `admin_users` | hayır | kurulum hassas işlem, yeniden doğrulama ister |
| uninstalled_at | integer | evet | |
| version | integer | hayır, varsayılan 0 | (karar: admin düzenlemesi ve yeniden onay koşullu yazılır) |
| created_at / updated_at | integer | hayır | |

- **Ayrı tablo açılmaz (karar):** yol haritasındaki `app_webhook_subscriptions`, `app_extensions`, `app_agent_tools` `manifest` JSON'undadır (filtrelenmez, bellekte dizinlenir; `00-genel.md` 0027 yalnız bu tabloyu listeler). Webhook imza sırrı (`webhookSecret`) burada değil `secrets` tablosunda `scope='app_installation'`, `scope_id = id`, `key='webhook.secret'` (karar: imzalamak için çözülebilir olmalı, kasa ile aynı şifreleme). Iframe/ajan JWT imza anahtarı mağaza geneli `secrets` `(global, 0, 'apps.jwt_signing_key')` (karar).
- **Anahtar ve indeksler:** benzersiz `token_hash`; benzersiz `public_id`; kısmi benzersiz `(app_key) WHERE status <> 'uninstalled'` (karar: aynı app bir kez kurulu; kaldırılıp yeniden kurulabilir); `(status)`.
- **Kurallar:** kurulum: manifest indir (SSRF süzgeci, `https`) → doğrula → izin onayı → `atomic()` (satır `installing` + token özeti + webhook sırrı + denetim) → `registerUrl` → başarıda `active`, başarısızlıkta satır silinir. Kaldırma: `status='uninstalled'`, `token_hash` korunur ama doğrulama `status='active'` ister (karar: satır denetim kaydının aktörü olarak kalır), webhook sırrı silinir, `app.uninstalled` outbox satırı aynı `atomic()`. İzin, kanca, araç veya risk genişlerse `pending_manifest` yazılır, onaya kadar eski `manifest` geçerli. Uygulama token'ı politikaya tabi değil, ayrı hız sınırı. Her çağrı ve teslimat `audit_log`'a. Kişisel veri içeren olay yalnızca ilgili okuma izni olan uygulamaya.
- **İlişkiler:** `admin_users`; `outbox.app_installation_id` (webhook teslimatları, "son teslimatlar"); `secrets`; `audit_log` aktörü/`via`; `metadata` anahtar öneki (`app_key.`).
- **Yapılacaklar:** şema + migration; `features/apps/install/*`, `queries/appByTokenHash.ts`; test: `registerUrl` 500 → satır yok; token yalnız özetle; kaldırılan app'in token'ı red; izin genişlemesinde eski izinler geçerli.
- **Açık sorular:** ücretli app faturalaması ve çok mağazalı app'in kanal ayrımı tasarlanmadı (belge bölüm 16; açık 7).

### `secrets`
- **Sahip:** `features/secrets`; şema `schema/security.ts` (0004).
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Sır kasası"; `01-platform-arayuzu.md` (`secrets.kek`); `08-isletme/01-self-host.md` bölüm 3; `08-isletme/05-cok-kiracili-saas.md` bölüm 5; `07-yapilandirma.md` ("Sırlar burada değil kasadadır").
- **Sütunlar (karar):**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| scope | text enum `global · channel · built_in_app · app_installation` | hayır | ayar deposuna paralel; `app_installation` webhook sırrı için |
| scope_id | integer | hayır, varsayılan 0 | `settings` ile aynı kural; FK kısıtı yok |
| key | text | hayır | ayırıcı `.` (ör. `payment.stripe.secret_key`) |
| ciphertext | blob | hayır | AES-256-GCM |
| iv | blob | hayır | 12 bayt |
| kek_version | integer | hayır | KEK döndürme için hangi KEK ile şifrelendiği |
| updated_by_admin_id | integer FK → `admin_users` | evet | sistem üretiminde (webhook sırrı, JWT anahtarı) NULL |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(scope, scope_id, key)`.
- **Kurallar:** KEK yalnız platform secret deposunda (`SECRETS_KEK`), DB'de değil, yedeğe girmez. Değer arayüze geri gösterilmez. KEK yoksa kasa uyur, demo kip. Ödeme anahtarı değiştirme yeniden doğrulama ister; `audit_log` özetinde maskelenir. SaaS: kiracı başına KEK, kontrol düzlemi ana anahtarıyla sarılı. `public_id` yok (karar: anahtarla adreslenir, satır API'ye çıkmaz).
- **İlişkiler:** `admin_users`; built-in app'ler ve `app_installations` okur.
- **Yapılacaklar:** şema + migration; `features/secrets/crypto.ts` (Web Crypto), `queries/getSecret.ts`, `setSecret.ts` (+ denetim satırı aynı `atomic()`); test: şifreli metin dışında değer yok, KEK yokken demo kip, denetim maskesi.
- **Açık sorular:** KEK döndürme prosedürü belgede yok (açık 8). Ajan sağlayıcı (9router/DeepSeek/Gemini) anahtarlarının kasada mı ortam değişkeninde mi durduğu belgede yok (açık 9).

### `idempotency_keys`
- **Sahip:** `apps/api` ara katmanı + `packages/core/src/features/ids` (karar: anahtar komutun `atomic()`'ine eklenen ifadeyle yazılır, bu yüzden çekirdekte); şema `schema/security.ts` (0004).
- **Kaynak:** `02-api-ve-istek-baglami.md` bölüm 3 ("anahtar + aktör için sonuç 24 saat saklanır").
- **Sütunlar (karar):**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| actor_type | text enum `customer · admin · app · apiKey · anonymous` | hayır | Ctx `actor.type` |
| actor_id | integer | hayır, varsayılan 0 | anonimde 0 |
| key | text | hayır | `Idempotency-Key` başlığı |
| request_hash | text | hayır | gövde + rota özeti; aynı anahtarla farklı gövde `422` |
| status | text enum `in_progress · done` | hayır | |
| response_status | integer | evet | |
| response | text JSON | evet | |
| expires_at | integer | hayır | `created_at + 24 sa` |
| created_at / updated_at | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(actor_type, actor_id, key)`; `(expires_at)` süpürme.
- **Kurallar:** tablo (karar: KV atomik değil; sonuç komutla aynı `atomic()` içinde yazılmalı). İlk istek `INSERT ... ON CONFLICT DO NOTHING` ile `in_progress` sahiplenir; yanıt komutun `atomic()`'ine eklenen `UPDATE ... SET status='done'` ile yazılır. Devam eden anahtara gelen istek (karar) `409 IDEMPOTENCY_IN_PROGRESS` + `Retry-After`. Komut beklenen hatayla dönerse satır silinir (yeniden denenebilir). Uygulamalar ve ERP için zorunlu, vitrin için isteğe bağlı. Yanıt gövdesinde kişisel veri olabilir → süre sonunda silinir. Toplu uçlarda yanıt boyutu (karar): ayrı sınır yok, 500 kayıtlık uç sınırı yanıtı sınırlar.
- **İlişkiler:** aktör tabloları (FK yok).
- **Yapılacaklar:** şema + migration; ara katman; süpürme zamanlanmış görevi; yarış testi: aynı anahtarla eşzamanlı iki istek → tek yan etki.

---

## E. Olaylar, işler, zamanlanmış görevler

### `outbox`
- **Sahip:** `packages/core/src/jobs` + `events`; şema `schema/events.ts` (0005).
- **Kaynak:** `03-cekirdek/04-olaylar-isler-outbox.md` (tamamı); `02-genel-mimari/01-genel-bakis.md` değişmez 3; `03-performans.md` bölüm 4, 6; `08-isletme/04-gozlemlenebilirlik.md` bölüm 1, 2, 6; `08-isletme/08-veri-tasima.md` bölüm 3, 5; `04-genisletme/03-tak-calistir-apps.md` bölüm 4, 11; `05-tak-calistir-app-gelistirme.md` bölüm 6; `00-genel.md` karar 8.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | sağlayıcı idempotency anahtarı = satır kimliği |
| public_id | text | hayır | önek `evt_` (karar: webhook `X-OpenMers-Event-Id: evt_...`; olay kimliği abonede idempotency anahtarı; admin `dead` listesi) |
| kind | text enum: `event · notify · webhook · reindex · collection · import · invoice · fulfillment · scheduled` | hayır | (karar: `event` = süreç içi abonelerin satırı, aşağıda) |
| event | text | evet | olay adı (`order.placed`, `product.updated`, `stock.bucket_changed`, `company.approved` …); `event`/`webhook` satırında dolu |
| payload | text JSON | hayır | küçük: kimlikler + değişen alan adları + `channel`; `import` için imleç |
| app_installation_id | integer | evet | (karar: `webhook` satırının hedef uygulaması; önceki `target text` yerine. FK kısıtı yok, `app_installations` 0027'de) |
| status | text enum: `pending · sending · sent · failed · dead` | hayır | |
| attempts | integer | hayır, varsayılan 0 | "deneme sayısı"; sınır 10 (karar 8) |
| priority | integer | hayır | (karar: küçük önce; `notify`/`webhook` 0, `event`/`invoice`/`fulfillment`/`scheduled` 1, `collection` 2, `reindex`/`import` 3) |
| next_attempt_at | integer | hayır | (karar: eklemede `created_at`; hatada üstel geri çekilme `min(2^attempts × 30 sn, 1 sa)`) |
| claimed_at | integer | evet | sahiplenmede yazılır |
| dedupe_key | text | evet | (karar: `reindex` birleştirme anahtarı, ör. `product:<id>`) |
| last_error | text | evet | `dead` satır son hatasıyla listelenir |
| request_id | text | evet | belge: `requestId` outbox satırına yazılır |
| created_at / updated_at | integer | hayır | |

- **Olay ve iş ayrımı (karar; önceki açık soru):** komut kendi `atomic()`'i içinde (1) süreç içi aboneler (çekirdek işleri, built-in app aboneleri) için tek `kind='event'` satırı, (2) bellekteki `(olay, kanal) → uygulamalar` dizinine göre abone uygulama başına bir `kind='webhook'` satırı yazar; abonesi olmayan olay için webhook satırı yazılmaz. `event` satırını işleyen worker süreç içi aboneleri sırayla çağırır, hepsi `public_id` ile idempotenttir; biri başarısızsa satır `failed` olur ve tümü yeniden denenir. `reindex` gibi işler komutta doğrudan kendi `kind`'ıyla da yazılabilir.
- **Anahtar ve indeksler (karar):** benzersiz `public_id`; `(status, priority, next_attempt_at)` sahiplenme/süpürme; kısmi benzersiz `(kind, dedupe_key) WHERE status = 'pending' AND dedupe_key IS NOT NULL` (birleştirme, `INSERT ... ON CONFLICT DO NOTHING`); `(status, created_at)` "en eski bekleyen satırın yaşı" metriği, admin `dead` listesi ve `sent` silme; `(app_installation_id, created_at)` uygulama başına son teslimatlar.
- **Kurallar:** yan etki satırı komutla aynı `atomic()` içinde. Sahiplen: `UPDATE outbox SET status='sending', claimed_at=now WHERE id=? AND status IN ('pending','failed') AND next_attempt_at <= now`. Başarı `sent`, değilse `failed` + `attempts` + `next_attempt_at`; `attempts` 10'a ulaşınca `dead` → admin'de listelenir, elle yeniden kuyruğa alınır (`status='pending', attempts=0`), mağaza sahibine bildirim. `sending`'de 5 dakikadan uzun kalan satır süpürmede `failed`'a geri alınır; `sent` satırlar 7 gün sonra silinir (karar 8; değerler `settings`'te). Tek dead-letter kuyruğu. Tetikleyiciler: sipariş anı (`waitUntil`/Queues/poller), webhook yeniden teslimatı, 5 dk süpürme. `reindex`/`import` yazma hızı sınırlı. Tarihsel sipariş içe aktarımı outbox satırı üretmez. Webhook uygulama başına eşzamanlılık sınırıyla teslim edilir; art arda hata `app_installations.consecutive_failures`'ı artırır. Kişisel veri: gövde yalnız kimlik taşır; kişisel veri içeren olay yalnız okuma izni olan uygulamaya. Alarm: en eski bekleyen > 15 dk, herhangi `dead`. `version` yok (karar: sahiplenme `status` koşullu yazımdır). Kiracı sütunu yok (kiracı başına DB).
- **İlişkiler:** her feature yazar (kendi komutunda); `scheduled_runs` (`kind='scheduled'`); `app_installations`.
- **Yapılacaklar:**
  - `schema/events.ts`, migration (tablo + 5 indeks).
  - `core/src/jobs/queries/claim.ts`, `mark.ts`, `due.ts` (süpürme + takılı `sending` geri alma + `sent` silme), `requeueDead.ts`, `enqueueReindex.ts` (birleştirmeli).
  - Yarış testi: aynı satırı iki tüketici sahiplenir → tek kazanan; aynı webhook'un eşzamanlı iki teslimatı.
  - Entegrasyon: komut geri alınınca olay yok; `dead` sonrası yeniden kuyruk; 5 dk takılı satır geri alınır; abonesiz olayda webhook satırı yok.

### `scheduled_runs`
- **Sahip:** `core/src/jobs`; şema `schema/events.ts` (0005).
- **Kaynak:** `04-olaylar-isler-outbox.md` "Zamanlanmış görevler"; `04-gozlemlenebilirlik.md` bölüm 5, 6.
- **Sütunlar:** `id` integer; `task` text hayır (görev adı, kodda tanımlı; built-in app görevleri `<app-id>.` önekli); `period` integer hayır (karar: dönemin cron'a göre başlangıcı, unix ms); `status` text enum `running · done · failed` hayır (karar); `started_at` integer hayır (karar); `finished_at` integer evet (karar); `error` text evet (karar); `outbox_id` integer evet (karar: çalışmayı taşıyan `kind='scheduled'` satırı; FK kısıtı yok, satır 7 gün sonra silinir); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(task, period)` (belge açıkça: "benzersiz kısıt"); bu indeks admin "son çalışmalar" sorgusunu da karşılar (`ORDER BY period DESC`).
- **Kurallar:** çalıştırma satır eklemeye koşulludur (`INSERT ... ON CONFLICT DO NOTHING`) → birden çok kopya tetiklese bile bir kez. Çekirdek görevler: süresi dolan rezervasyonlar, outbox süpürme, ödeme uzlaştırma, terk edilmiş sepet, süresi dolan teklifler, vadesi geçen faturalar, yedek doğrulama; bu katalogdan: audit mühürleme/arşiv/doğrulama, idempotency, oturum ve doğrulama token'ı süpürme. Alarm: görev 2 dönem çalışmadı. Saklama (karar): 30 gün sonra silinir (alarm ve admin listesi için yeter). `public_id` yok (karar: yalnız listelenir).
- **İlişkiler:** `outbox` (`kind='scheduled'`).
- **Yapılacaklar:** şema + migration; `queries/claimRun.ts`; yarış testi: aynı dönem iki tetik → tek çalışma.

---

## F. Denetim

### `audit_log`
- **Sahip:** `features/audit` (karar: ayrı feature; `auth` ile karışmaz); şema `schema/security.ts` (0004).
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Denetim kaydı", "Saklama", "Kurcalama kanıtı"; `08-kimlik-dogrulama.md` bölüm 4; `07-kurulum-ve-tohum-veri.md` bölüm 4; `05-cok-kiracili-saas.md` bölüm 3 (destek erişimi); `04-genisletme/03-tak-calistir-apps.md` bölüm 7, 12.3 madde 6; `02-genel-mimari/05-vendure-capabilities.md` 2.1/2.3.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| seq | integer | hayır | iç PK (karar: belgedeki ad korunur, `INTEGER PRIMARY KEY` = rowid; mühürleme sırası) |
| public_id | text | hayır | önek `aud_` (karar: admin ayrıntı görünümü; tamsayı `seq` API'ye çıkmaz) |
| actor_type | text enum `admin · app · apiKey · agent · system` | hayır | (karar: belge admin/app/apiKey; `agent` bölüm 12.3 `actor = agent:<oturum>`; `system` CLI ve zamanlanmış görevler) |
| actor_id | integer | evet | `admin_users` / `app_installations` / `api_keys` / `agent_sessions` (`03`); `system`'de NULL |
| via_app_installation_id | integer | evet | (karar: bölüm 12.3 `via = app:<id>`, ajan uygulama aracı çağrısı) |
| on_behalf_customer_id | integer | evet | (karar: "müşteri adına sipariş" hem temsilci hem müşteri) |
| action | text | hayır | ör. `orders:write`, `auth.login_failed`, `pii.read` |
| entity_type | text | evet | |
| entity_public_id | text | evet | (karar: dış kimlik; arşiv ve dışa aktarmada anlamlı) |
| channel_id | integer | evet | (karar: raporlar kanal bazlı) |
| before / after | text JSON | evet | özet; sır ve kişisel veri maskeli |
| request_id | text | evet | (karar) |
| created_at | integer | hayır | |
| prev_hash | text | evet | mühürleme işi yazar |
| row_hash | text | evet | `SHA-256(prev_hash ‖ kanonik(satır))`; NULL = mühürlenmemiş |

- **Anahtar ve indeksler (karar):** PK `seq`; benzersiz `public_id`; kısmi `(seq) WHERE row_hash IS NULL` (mühürleme işi); `(entity_type, entity_public_id, created_at)`, `(actor_type, actor_id, created_at)`, `(action, created_at)`, `(created_at)` (arama: varlık, aktör, dönem, eylem; saklama silmesi).
- **Kurallar:** değişiklikle aynı `atomic()`; yazma yoksa denetim satırı da yok. Mühürleme tek tüketicili iş, `seq` sırasıyla. Silinmiş satır tespiti (karar): mühürlü bir satır silinince sonraki satırın `prev_hash`'i kopar; `seq` boşluğuna dayanılmaz (AUTOINCREMENT olmayan rowid geri alınan eklemede boşluk bırakmaz, ama dayanak zincirdir). Saklama `audit.retention_days` (varsayılan 730): aylık gzip NDJSON `private` kovaya (`audit/YYYY-MM.ndjson.gz`), arşiv başarısızsa silme yok. Zamanlanmış dışa aktarma (S3/webhook) `audit:export` izni, kendisi denetlenir. Okuma `audit:read`; hassas kayıt açma (`read_pii`) ayrıca kaydedilir. Satırlar değişmez; yalnız `prev_hash/row_hash` bir kez yazılır (`WHERE row_hash IS NULL`), bu yüzden `updated_at` yok (karar). Müşterinin kendi işlemleri (karar): denetlenmez, belge yalnız admin/app/apiKey yazmalarını sayar; müşteri işlemi sipariş olaylarında (`order_events`) izlenir. Bütünlük durumu `settings` `audit.last_verify` (A bölümü).
- **İlişkiler:** `audit_anchors`; aktör tabloları (FK yok, çok biçimli).
- **Yapılacaklar:**
  - `schema/security.ts`, migration.
  - `features/audit/queries/insertEntry.ts` (komutun ifade dizisine eklenen ifade), `sealBatch.ts`, `search.ts`, `expire.ts`.
  - Test (belgedeki liste): eşzamanlı yazma sonrası mühür sırası; değiştirme/silme sonrası `verify` kopukluğu; çapa imzası; arşiv başarısızsa silme yok; saklama sınırında zincir devamı; sır maskesi; atomiklik.
- **Açık sorular:** maskeleme alan listesi belgede yok (açık 10).

### `audit_anchors`
- **Sahip:** `features/audit`; şema `schema/security.ts` (0004).
- **Kaynak:** `06-guvenlik-ve-yetki.md` "Kurcalama kanıtı" (`audit_anchors(day, last_seq, last_hash, signature)`).
- **Sütunlar:** `id` integer; `day` integer hayır (karar: UTC gün başlangıcı, unix ms); `last_seq` integer hayır; `last_hash` text hayır; `signature` text hayır (KEK'ten türetilen anahtarla HMAC); `created_at` integer hayır (karar). `updated_at` yok (karar: değişmez satır).
- **Anahtar ve indeksler:** benzersiz `day`.
- **Kurallar:** günlük; arşiv dosyasına ve (varsa) harici uyum arşivine de gider. `openmers audit verify [--from --to]` zinciri ve çapaları yeniden hesaplar. Saklama (karar): `audit_log` silindikten sonra da kalır, silinmez (zincir devamı; satır başına küçük). KEK yoksa (karar): çapa yazılmaz (demo kip, kasa uykuda); `verify` yalnız zinciri doğrular ve "imzasız" raporlar.
- **İlişkiler:** `audit_log.seq`.
- **Yapılacaklar:** şema + migration; `queries/writeAnchor.ts` (`INSERT ... ON CONFLICT(day) DO NOTHING`); test: imza doğrulama, KEK yokken çapa yok.
- **Açık sorular:** R2/S3 nesne kilidi doğrulanmadı (açık 11).

---

## G. Kimlik eşlemeleri

### `order_guest_access`
- **Sahip:** `features/orders` (belge: `orders/ … guestAccess`); şema `schema/orders.ts` (0015).
- **Kaynak:** `03-veri-kurallari.md` bölüm 1.
- **Sütunlar:** `id` integer; `order_id` integer FK → `orders` hayır; `token_hash` text hayır (karar: token `otk_...`, makine kimlikleri kuralıyla yalnızca SHA-256 özeti); `revoked_at` integer evet (karar: belge "iptal edilebilir"); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `token_hash`; `(order_id)`.
- **Kurallar:** `ord_` bilmek yetmez; token iptal edilebilir. Sızarsa token döndürülür (eskisi `revoked_at`, yenisi eklenir) ve yeni bağlantı aynı `atomic()` içinde outbox'a yazılır. Son kullanma (karar): yok, belge süre vermez; iptal/döndürme ile biter. Sızıntı kapısı testi API çıktısında token görürse kırılır.
- **İlişkiler:** `orders` (`02`), `outbox`.
- **Yapılacaklar:** şema + migration; `features/orders/queries/guestAccessByToken.ts`, `rotateGuestToken.ts`; test: döndürmede eski token reddi.

### `external_refs`
- **Sahip:** `packages/core/src/features/external-refs` (karar: `03` dosyasındaki adla aynı); şema `schema/events.ts` (0005; `00-genel.md` listesi).
- **Kaynak:** `03-veri-kurallari.md` bölüm 1; `08-isletme/08-veri-tasima.md` bölüm 3; `10-tak-calistir-apps/02-erp.md` §4, §5, §7.1 (`03` dosyasının ek sütunları, karar 3).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| id | integer | hayır | |
| source | text | hayır | "kaynak": taşımada `shopify` vb., uygulamada `app_installations.app_key` (`openmers.erp`) |
| connection_id | text | hayır, varsayılan `''` | "bağlantı" (karar: `03` ile aynı ad; NULL benzersizliği bozduğu için boş dize) |
| entity_type | text | hayır | "varlık türü" (ürün, varyant, koleksiyon, müşteri, sipariş, depo) |
| local_public_id | text | hayır | "yerel public_id" |
| external_id | text | hayır | "dış kimlik" |
| external_code | text | evet | "dış kod" (ör. SKU) |
| digest | text | evet | "özet": değişmediyse yazma yok |
| state | text | evet | `03` ek sütunu (ERP) |
| last_matched_at | integer | evet | `03` ek sütunu (ERP) |
| created_at / updated_at | integer | hayır | (karar) |

- **Anahtar ve indeksler (karar):** benzersiz `(source, connection_id, entity_type, external_id)` (taşıma tekrarında çift kayıt yok); `(entity_type, local_public_id)` (yerelden dışa).
- **Kurallar:** taşıma tekrar çalıştırılınca aynı kayıt güncellenir. Bir uygulama başkasının eşlemesini yazamaz (sorguda `source = app_key` süzgeci). `local_public_id` iç `id` yerine (karar: belge böyle; eşleme dış sistemden public_id'ye çözüm içindir, join yolu değil). `public_id` yok (karar: iç tablo).
- **İlişkiler:** `local_public_id` üzerinden her varlık (FK yok).
- **Yapılacaklar:** şema + migration; `queries/upsertRef.ts`, `refByExternal.ts`; test: iki kez taşıma → çift yok; başka uygulamanın kaynağına yazma reddi.
- **Açık sorular:** `state` değerleri ERP belgesinde yok (açık 12).

---

## H. Kontrol düzlemi (ayrı veritabanı, v1'de uygulanmaz)

### `tenants`
- **Sahip:** ayrı kontrol düzlemi uygulaması; şema `packages/db/src/control-plane/tenants.ts` (karar: çekirdek `schema/` dışında, migration'ları ayrı).
- **Kaynak:** `08-isletme/05-cok-kiracili-saas.md` bölüm 3, 4, 5.
- **Sütunlar:** `id` integer; `public_id` text (`tnt_`, karar); `status` text enum `provisioning · active · suspended · deleted`; `plan` text; `region` text; `database_id` text; `schema_version` integer; `wrapped_kek` blob (karar: "kontrol düzleminin ana anahtarıyla sarılı saklanır"); `canary` integer bool (karar: "önce kanarya kiracılar"); `created_at/updated_at`.
- **Düzeltme:** önceki `storage_prefix` kaldırıldı (belgede yok).
- **Anahtar ve indeksler (karar):** `(schema_version)` migration yayılımı, `(status)`.
- **Kurallar:** açma adımları idempotent iş, yarıda kalırsa sürer. Silme yasal saklama süresi sonunda. Kontrol düzlemi kiracı verisine erişmez.
- **İlişkiler:** `tenant_domains`.
- **Yapılacaklar:** v1 dışı; yalnızca çekirdeğin kiracı başına DB varsayımını bozmaması (önbellek anahtarı kiracı öneki) test edilir.
- **Açık sorular:** açma işlerinin kuyruğu, abonelik/fatura ve kullanım sayaçları, destek erişimi kaydı tabloları adlandırılmamış (açık 13).

### `tenant_domains`
- **Sahip:** kontrol düzlemi; şema `control-plane/tenants.ts`.
- **Kaynak:** `05-cok-kiracili-saas.md` bölüm 2, 3.
- **Sütunlar (karar):** `id` integer; `domain` text hayır; `tenant_id` integer FK hayır; `status` text enum `pending · active · failed` (Cloudflare for SaaS özel ad + TLS durumu); `provider_hostname_id` text evet (sağlayıcıdaki özel ad kimliği); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `domain` (Host → kiracı; okuma KV önbelleğinden); `(tenant_id)`.
- **Yapılacaklar:** v1 dışı.

---

## Migration sırası ve yabancı anahtar hedefleri

Hedefi sonra açılan referanslar FK kısıtı olmadan (yalnız mantıksal, indeksli `integer`) tanımlanır (karar: migration eklemeli; SQLite'ta sonradan FK eklemek tablo yeniden kurmak demektir):

- `sessions.active_company_id` → `companies` (0022), `sessions` 0011'de.
- `outbox.app_installation_id` → `app_installations` (0027), `outbox` 0005'te.
- `scheduled_runs.outbox_id` → `outbox` (satır silinir).
- `audit_log.actor_id`, `via_app_installation_id`, `on_behalf_customer_id`; `settings.scope_id`, `secrets.scope_id`; `idempotency_keys.actor_id` (çok biçimli).

FK hedefleri katalogda var: `channels`, `customers`, `orders`, `price_lists` (`02`), `companies`, `company_members`, `agent_sessions` (`03`), bu dosyadaki tüm tablolar. Eksik hedef yok.

## Diğer dosyalara bildirilenler

- `02` `customers.user_id` türü "TEXT ya da INTEGER" yazıyor; bu dosyanın kararı `integer` (→ `users.id`).
- **Kapandı (karar):** `access_policies` kapsam eşlemesi: `assigned_to` → `orders.assigned_admin_id`, `customers.assigned_admin_id`, `companies.sales_rep_admin_id`, `quotes.sales_rep_admin_id`; `shipping_province` → `orders.shipping_region`. `companies.tag` için ayrı tablo yok, `customer_tags` benzeri şirket etiketi açık soru olarak kalır. `customers.user_id` artık `INTEGER` (02 düzeltildi). Eski not:
- `access_policies` kapsam sütunları hedef tablolarda yok: `orders.assigned_to`, `orders.shipping_province` (genel adres kuralına göre `shipping_region` olmalı), `companies.assigned_to`, `quotes.assigned_to`, `customers.assigned_to`; `companies.tag` tek sütun değil, etiket tablosu olabilir (`02`/`03` dosya sahipleri).
- `03` "Uygulama kayıt defteri" maddesi: tanım bu dosyada (`app_installations`); yol haritası `04-asama-5-6` madde 47.2'deki `apps`, `app_webhook_subscriptions`, `app_extensions`, `app_agent_tools` adları geçersiz.
- `00-genel.md`: tablo sayısı 24 → 30; 0003'e `admin_accounts`, `admin_verifications`, `admin_two_factors`, `admin_passkeys`; 0011'e `two_factors`, `passkeys`; 0027 "tanım aşama 5" ifadesi kalkmalı (tanım burada).

## Belgelerde adı geçip tanımı olmayan tablolar

- `channels` ve `<varlık>_channels` bağlantı tabloları — `02`. `role_channels` yok (karar 1).
- `customers`, `customer_search` (FTS5), müşteri grupları — `02`.
- `catalog_index`, `product_view`, ürün/sipariş FTS tabloları — `02`.
- `orders` (`source = import`, kapsam sütunları), `pending_payments`, `carts`, rezervasyon, `stock_levels`, `price_lists` — `02`.
- `redirects` (taşımada 301; isabet sayacı); "karşılıksız yollar / 404 kaydı" tablosu hiçbir yerde tanımlı değil (açık 14).
- Kişisel veri: `consents`, `customer_consent_state`, `customer_exports`, `customer_merges` (karar 9, `02`).
- Arama analitiği günlük sayaçları (`05-vendure-capabilities.md` 2.2, v1.1) ve sayfa/fiyat listesi sürüm tabloları (2.3, v1.1) — v1 dışı.
- Migration kayıt tabloları: drizzle-kit / `wrangler d1 migrations` kendi tablosunu tutar; built-in app'lerin "kendi numara dizisi" için kayıt ve veri doldurma (backfill) ilerlemesinin saklandığı yer belgede yok (açık 15).
- Yedek durumu (Litestream son kopya zamanı/gecikmesi) admin'de görünür: (karar) tablo değil, `settings` `(global, 0, 'backup.last_status')` JSON, yedek doğrulama görevi yazar.
- Demo veri "`demo` işaretiyle yazılır" — hangi tablolarda hangi sütun: katalog/içerik tablolarının sahibi (`02`).
- SaaS abonelik/fatura, kullanım sayaçları — kontrol düzlemi, v1 dışı (açık 13).
- Bildirim türleri kodda (karar 2); şablonlar, ülke/il listesi, para birimleri — `02`.

## Belgeler arası çelişkiler

1. **Ayrı `jobs` tablosu:** `04-olaylar-isler-outbox.md` "Ayrı bir `jobs` tablosu yoktur"; diğer yerlerdeki `jobs` yalnız kod klasörü/poller adı. Şemada `jobs` tablosu açılmaz.
2. **Vergi numarası doğrulaması:** `05-vendure-capabilities.md` 2.2 VKN/TCKN'yi çekirdeğe koyar; 2026-11-13 kararı: çekirdek yalnız `tax_id` + `tax_id_type`, doğrulama modülde. Karar kazanır, doğrulama durumu sütunu çekirdeğe girmez.
3. **Fatura süresi alarmı:** `04-gozlemlenebilirlik.md` bölüm 6 "7 gün" sabit sayı; karar: eşik `legal_policy` ayarından okunur (karar 7).
4. **Rol–kanal ilişkisi:** `03-veri-kurallari.md` bölüm 4 rolü kanala bağlı varlık sayar; `06-guvenlik-ve-yetki.md` kanal başına atama der. **Kapandı (karar 1):** atama modeli, `role_channels` yok. `03-veri-kurallari.md` bölüm 4 listesinden "rol" çıkarılmalı.
5. **Makine kimliği önekleri:** **kapandı (karar):** `omk_` API anahtarı, `oma_` uygulama, `omp_` yayınlanabilir; `05-tak-calistir-app-gelistirme.md`'deki `omat_` ⚙️ örneği `oma_` olmalı. Yayınlanabilir anahtar da yalnız özetle saklanır (`08` bölüm 6 ortak kuralı).
6. **Kapsam alanı adları:** `06-guvenlik-ve-yetki.md` customers/products için `channel` yazar, veri kuralları bağlantı tablosu der (açık 6).
7. **Ayar kapsamları:** `07-yapilandirma.md` dört kapsam, `04-monorepo` üç kapsam. Şema dört kapsamı alır.
8. **Ödeme yöntemi tablosu:** `07-yapilandirma.md` ayar örneği der; `02` katalogunda `payment_methods` tablosu var. Ödeme grubunda netleşir.
9. **Varsayılan built-in app örnekleri:** Türkiye sağlayıcıları önde; karar: varsayılan global. Tablo etkisi yok.
10. **Oturum sürüm sayacı:** **kapandı (karar):** `users.session_version` / `admin_users.session_version` kullanıcı başına geçersiz kılma sayacı; oturum satırı kopyasını taşır; `sessions.version` satırın iyimser kilit sayacı.

## Açık sorular

1. Better Auth: iki örnekle ayrı tablo takımına yazma (`modelName`), `integer` kimlik seçeneği, `twoFactor`/`passkey`/`phoneNumber` eklenti alan adları ve D1 uyumu sürümde doğrulanmadı (belge de söyler).
2. `legal_policy` ayar şeması yazılmadı (ATLANANLAR).
3. Better Auth `session.token`, `verification.value`, `twoFactor.backupCodes` ve OAuth token'larını özet/şifreli saklama seçenekleri doğrulanmadı; belge parola sıfırlama ve kurtarma kodları için "yalnızca özet" ister. Seçenek yoksa özet katmanı adaptörde yazılmalı.
4. Oturum süreleri (müşteri uzun kayan, yönetici kısa) sayı olarak belgede yok.
5. SuperAdmin dışındaki hazır rol listesi belgede yok.
6. `access_policies` customers/products `channel` kapsamının bağlantı tablosu (`customer_channels`, `product_channels`) üzerinden indeksli koşula derlenmesi belirsiz.
7. Ücretli app faturalaması, uygulama dizini ve çok mağazalı app'in kanal ayrımı tasarlanmadı.
8. KEK döndürme prosedürü (`kek_version` ile yeniden şifreleme işi) belgede yok.
9. Ajan sağlayıcı anahtarlarının yeri (kasa mı ortam değişkeni mi) belgede yok.
10. Denetim özetinde maskelenecek alan listesi belgede yok.
11. R2/S3 nesne kilidiyle çapa arşivi doğrulanmadı.
12. `external_refs.state` değerleri belgede yok.
13. Kontrol düzlemi: açma işi kuyruğu, abonelik/fatura, kullanım sayacı, destek erişimi kaydı tabloları adlandırılmamış.
14. 404 / karşılıksız yol kaydı tablosu hiçbir yerde tanımlı değil.
15. Built-in app migration numara dizisinin kaydı ve backfill ilerlemesinin saklandığı yer belgede yok.
