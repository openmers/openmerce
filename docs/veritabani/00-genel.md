# Veritabanı: genel dizin

Tasarım belgelerindeki tüm tabloların kataloğu. Kod yazılmadan önce tek kaynak budur; şema bu dosyalardan çıkar, karar değişirse önce burası güncellenir. Durum 2026-11-13: `packages/db` kurulu; yazılan migration'lar `0000`-`0005` (`settings`, `channels`, `channel_domains`, yönetici kimliği/rol/politika, sırlar/anahtarlar/idempotency/denetim, outbox/zamanlanmış görev/`external_refs`: 22 tablo). Kalanlar `-`.

| Dosya | Kapsam | Tablo |
|---|---|---|
| [01-cekirdek-isletme.md](01-cekirdek-isletme.md) | ayarlar, yönetici/rol/izin, kimlik, outbox, denetim, sırlar, idempotency, app kurulumları, kiracılık | 30 |
| [02-ticaret.md](02-ticaret.md) | kanal, katalog, okuma modeli, fiyat, stok, sepet, checkout, ödeme, sipariş, promosyon, vergi, kargo, müşteri, içerik, bildirim, rapor (`currency_rates` dahil, `notification_types` yok) | 88 |
| [03-b2b-istemci-genisletme.md](03-b2b-istemci-genisletme.md) | şirket, kredi, onay, teklif, tema, agentic builder, admin tercihleri, built-in app (`bia_`, `bia_efatura_*` dahil), tak-çalıştır app | 62 |

Her tablo için: sahip feature, şema dosyası, kaynak belge, sütunlar, anahtar/indeks, kurallar, ilişkiler, yapılacaklar, açık sorular. "(öneri)" ve "(çıkarım)" işaretli ad ve türler belgede yoktur, kurala göre konmuştur.

## Ortak kurallar (her tablo)

- SQLite/D1, Drizzle `sqlite-core`. İçeride tamsayı `id`, dışarıda önekli `public_id`. Para tamsayı küçük birim + `currency` (ISO 4217).
- Eşzamanlı yazılan satırda `version`; yazma `UPDATE ... WHERE version = ?` (koşullu). `atomic(stmts)` = `db.batch()`, interaktif transaction yok.
- Sipariş verisi anlık görüntüdür (kopyalanır, join edilmez). Çevrilebilir alanlar `<varlık>_translations`.
- Built-in app tabloları `bia_<id>_` önekli, yalnız kendi modülü yazar. Çekirdek tablolara app yazmaz.
- Çekirdek pazardan bağımsız: vergi kimliği yalnız `tax_id` + `tax_id_type`; adres `address_line1/2`, `city`, `region`, `district?`; ülkeye özgü alanlar modülün `custom_fields`'ı.
- Vitrin sorgusu: sorgu planı testi (tam tarama yok). Koşullu yazma: yarış testi (D1 ve SQLite).
- Şema dosyası tablo grubu başına (`packages/db/src/schema/<grup>.ts`), `schema/index.ts` dışa aktarır. Migration numaralı, eklemeli, tek konulu; uygulanmış migration düzenlenmez.

## Bu dizinde verilen kararlar (2026-11-13)

Alt dosyalardaki açık soruları kapatır; alt dosyayla çelişirse bu bölüm geçerlidir.

1. **Rol modeli:** atama modeli. `roles`, `role_permissions`, `admin_role_assignments(admin_user_id, role_id, channel_id?)`; `role_channels` yok. Bir yönetici kanal başına farklı rol alabilir.
2. **`notification_types`:** tablo değil, kodda sabit liste (`features/notify/types.ts`). Ayar ve şablon tabloları bu kimliklere başvurur.
3. **`external_refs`:** tek tablo, çekirdek (`01` dosyası). `03` dosyasındaki tanım aynı tabloya ek sütun ihtiyacıdır, ikinci tablo açılmaz.
4. **App kayıt tablosu adı:** `app_installations` (`apps` değil); tanımı `01` dosyasında.
5. **Abonelik tabloları:** `bia_subscriptions_*` (belgedeki öneksiz adlar geçersiz).
6. **`invoices`:** çekirdek tablo pazardan bağımsız: `kind` yalnız `invoice · credit_note`. Türkiye'ye özgü tür (e-fatura / e-arşiv), GİB durumu ve sağlayıcı kimliği e-fatura modülünün `bia_efatura_*` tablolarındadır.
7. **`orders.due_at` ikiye ayrılır:** `payment_due_at` (kredi/vadeli ödeme, çekirdek). Fatura kesim son günü çekirdek sütun değil, e-fatura modülü `legal_policy` ayarından hesaplar.
8. **`outbox` büyümesi:** deneme sınırı 10 (sonra `dead`), `sending`'de 5 dakikadan uzun kalan satır geri alınır, `sent` satırlar 7 gün sonra silinir. Değerler `settings` ile değiştirilebilir; ölçümle güncellenir.
9. **Kişisel veri:** çerez/açık rıza `consents` ve `customer_consent_state` (`02`), dışa aktarma `customer_exports`, silme `customer_merges`/anonimleştirme akışı kullanır; ayrı tablo açılmaz.
10. **`currency_rates`:** çekirdek tablo (`02` grubuna, `pricing` sahibi); abonelik modülü okur.

## Şema dosyaları ve migration sırası

Sıra bağımlılığa göredir (yabancı anahtarın hedefi önce). Numara `packages/db/migrations/NNNN_<ad>.sql`.

| # | Şema dosyası | Tablolar | Kaynak |
|---|---|---|---|
| 0001 | `settings.ts` | `settings` | 01 |
| 0002 | `channels.ts` | `channels`, `channel_domains` | 02 |
| 0003 | `admin-auth.ts`, `roles.ts` (dosya `0003_admin-auth.sql`) | `admin_users`, `admin_sessions`, `admin_accounts`, `admin_verifications`, `admin_two_factors`, `admin_passkeys`, `roles`, `role_permissions`, `admin_role_assignments`, `access_policies` | 01 |
| 0004 | `security.ts` | `secrets`, `api_keys`, `channel_publishable_keys`, `idempotency_keys`, `audit_log`, `audit_anchors` | 01 |
| 0005 | `events.ts` | `outbox`, `scheduled_runs`, `external_refs` | 01 |
| 0006 | `catalog.ts` | `products`, `product_variants`, `product_options`, `option_values`, `facets`, `facet_values`, `collections`, `collection_variants`, `*_translations`, `product_assets`, `product_channels`, `variant_channels`, `collection_channels` | 02 |
| 0007 | `media.ts` | `media`, `digital_assets` | 02 |
| 0008 | `pricing.ts` | `price_lists`, `price_list_targets`, `prices`, `currency_rates` | 02 |
| 0009 | `stock.ts` | `stock_locations`, `channel_stock_locations`, `stock_levels`, `stock_movements` | 02 |
| 0010 | `tax-shipping.ts` | `zones`, `zone_members`, `tax_categories`, `tax_rates`, `shipping_methods` | 02 |
| 0011 | `customers.ts` | `users`, `sessions`, `accounts`, `auth_verifications`, `two_factors`, `passkeys`, `customers`, `customer_channels`, `addresses`, `customer_groups`, `customer_group_members`, `customer_tags`, `customer_notes`, `consents`, `customer_consent_state`, `customer_payment_methods` | 01, 02, 03 |
| 0012 | `promotions.ts` | `promotions`, `promotion_usage` | 02 |
| 0013 | `cart.ts` | `carts`, `cart_lines`, `checkout_reservations` | 02 |
| 0014 | `payments.ts` | `payment_methods`, `payments`, `pending_payments`, `refunds` | 02 |
| 0015 | `orders.ts` | `orders`, `order_lines`, `order_adjustments`, `order_tax_lines`, `order_shipping_lines`, `order_events`, `order_notes`, `order_guest_access` | 01, 02 |
| 0016 | `fulfillment.ts` | `fulfillments`, `fulfillment_lines`, `returns`, `digital_entitlements` | 02 |
| 0017 | `read-model.ts` | `catalog_index`, `catalog_index_facets`, `catalog_index_collections`, `catalog_fts` (FTS5), `product_view`, `customer_search` (FTS5), `customer_stats`, `customer_spend` | 02 |
| 0018 | `content.ts` | `pages`, `page_translations`, `posts`, `post_tags`, `menus`, `menu_items`, `sections`, `redirects` | 02 |
| 0019 | `notify.ts` | `notification_templates`, `notification_settings`, `notification_log` | 02 |
| 0020 | `reports.ts` | `stats_daily_*` (5), `stats_applied_events`, `documents`, `customer_merges`, `customer_exports` | 02 |
| 0021 | `invoices.ts` | `invoices` (pazardan bağımsız) | 03 |
| 0022 | `companies.ts` | `companies`, `company_members`, `company_addresses`, `company_channels`, `company_credit`, `credit_ledger` | 03 |
| 0023 | `approvals-quotes.ts` | `approval_*` (4), `quotes`, `quote_versions`, `quote_version_lines`, `quote_messages`, `quote_attachments` | 03 |
| 0024 | `themes.ts` | `themes`, `theme_builds`, `theme_settings`, `channel_themes` | 03 |
| 0025 | `agent.ts` | `agent_sessions`, `agent_messages`, `agent_tool_calls`, `agent_checkpoints`, `agent_artifacts`, `agent_missions`, `agent_usage` | 03 |
| 0026 | `admin-prefs.ts` | `admin_layouts`, `admin_user_prefs` | 03 |
| 0027 | `apps.ts` | `app_installations` | 01 |
| — | ayrı veritabanı | `tenants`, `tenant_domains` (kontrol düzlemi, SaaS) | 01 |
| — | modül migration'ları | `bia_wishlist_*`, `bia_reviews_*`, `bia_iys_*`, `bia_subscriptions_*`, `bia_efatura_*`; kendi paketlerinde, çekirdekten sonra | 03 |
| — | tak-çalıştır app'in kendi DB'si | ERP `webhook_inbox`, `conflicts` (mağaza DB'sinde değil) | 03 |

## Yapılacaklar (genel)

- `-` `packages/db`: Drizzle + drizzle-kit kurulumu, `schema/index.ts`, migration çalıştırıcı (D1: `wrangler d1 migrations apply`; SQLite: Node çalıştırıcı).
- `-` Yukarıdaki sırayla şema dosyaları; her dosya ≤250 satır, aşarsa grup bölünür.
- `-` `packages/test-utils`: gerçek SQLite (ve D1 `vitest-pool-workers`) üzerinde migration'ları uygulayan test koşucusu; veritabanı mock'lanmaz.
- `-` Şema testi: her tabloda `public_id` öneki benzersiz, para sütunları tamsayı, `bia_` tabloları çekirdek migration'larında yok.
- `-` Sorgu planı testleri (vitrin sorguları) ve yarış testleri (stok, kupon, kredi, sipariş numarası, outbox sahiplenme).
- `-` Tohum veri: varsayılan kanal, vergi seti, ilk depo, `SuperAdmin` (kurulum sihirbazı).
- `-` Alt dosyalardaki "(öneri)" ve "(çıkarım)" işaretli ad/türler ilk şema yazımında gözden geçirilir; kalan çelişkiler her dosyanın sonundaki listededir.
- `-` Aşama 1 uygulama planı (`packages/db`, `test-utils`, `0001 settings`, `0002 channels`): [04-asama-1-db-plani.md](04-asama-1-db-plani.md).

## Denetim sonrası kararlar (2026-11-13)

11. **Tohum veri migration'da değil:** varsayılan kanal kurulum sihirbazında `createDefaultChannel` ile oluşur (EN, USD); migration'lar yalnız şema içerir.
12. **Migration numarası:** boş `0000_baseline.sql` konur; katalog numaraları (`0001_settings`...) korunur.
13. **Better Auth iki örnek:** müşteri (`users`, `sessions`, `accounts`, `auth_verifications`, `two_factors`, `passkeys`) ve yönetici (`admin_*`) ayrı tablo takımları. **Better Auth 1.7.23 doğrulandı (paket kaynağından, 0003):** `integer` kimlik `advanced.database.generateId: "serial"` ile; model/alan adları `modelName`/`fields` ile (eklentilerde `schema` seçeneği); tarih alanları `Date` (Drizzle'da `timestamp_ms`, SQL'de epoch ms). Özetleme: `verification.storeIdentifier: "hashed"` var; `session.token`, `verification.value` için seçenek yok (düz), `twoFactor.backupCodes` yalnız düz/şifreli/özel; özet gerekiyorsa adaptörde yazılır. `twoFactor` tablosu `created_at`/`updated_at` almaz, `verified`/`failed_verification_count`/`locked_until` ister (`01` `admin_two_factors`). **Bağlandı (2026-11-13, yönetici örneği):** `session.token` adaptör sarmalayıcısıyla (`apps/api/src/auth/hashedSessions.ts`) yalnız SHA-256 özeti olarak yazılır ve aranır; `admin_sessions.session_version` oturum açılışında `databaseHooks` ile yöneticinin sürümünden kopyalanır; `permissions` şimdilik `{}` (izinler istek başına çözülür). Şema değişmedi, yeni migration yok.
14. **Yarış testi:** `better-sqlite3` senkron olduğu için gerçek eşzamanlılık testleri D1 (pool-workers) ya da ayrı süreçlerle koşar.
15. **Politika kapsam sütunları:** `orders.assigned_admin_id`, `customers.assigned_admin_id`, `orders.shipping_region` eklendi; şirket ve teklifte `sales_rep_admin_id` kullanılır. `customers.user_id` INTEGER.
