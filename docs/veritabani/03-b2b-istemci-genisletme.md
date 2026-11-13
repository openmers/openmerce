# Veritabanı kataloğu 3: B2B, istemciler, genişletme, built-in ve tak-çalıştır app'ler

> **Denetim (2026-11-13).** 62 tablo (önceki sayım 61: `external_refs` kaldırıldı (karar 3), `bia_iys_settings` ayar deposuna, `currency_rates` çekirdeğe (karar 10) taşındı; `bia_efatura_*` 3 tablo ve `bia_subscriptions_cancel_reason_translations` eklendi). Kaynak belgeyle ya da `00-genel.md` kararlarıyla çelişen 25 yer düzeltildi (şema dosyası adları, `invoices` alanları, `payment_due_at`, `product_variants`, `checkout_reservations`, `payment_status`, cycle–sipariş bağı vb.). Tüm "(çıkarım)/(öneri)" işaretleri kapatıldı; 185 "(karar: …)" işareti var. 9 açık kaldı (dosya sonunda). Önek çakışması yok. `00-genel.md`'deki tablo sayısı (61) ve migration tablosundaki şema dosyası adları buna göre güncellenmeli (bu dosyanın dışında).

**Kapsam:** `docs/06-b2c-b2b/*`, `docs/07-istemciler/*`, `docs/04-genisletme/*`, `docs/09-built-in-apps/*`, `docs/10-tak-calistir-apps/*`. Kurallar `docs/03-cekirdek/03-veri-kurallari.md` ve `00-genel.md` "Bu dizinde verilen kararlar" bölümünden alındı; çelişkide `00-genel.md` kararları geçerlidir.

**Özet:** Bu grupta 62 tablo var:

| Grup | Adet | Tablolar | Şema dosyası |
|---|---|---|---|
| B2B şirket ve kredi | 6 | `companies`, `company_members`, `company_addresses`, `company_channels`, `company_credit`, `credit_ledger` | `companies.ts` (0023) |
| B2B onay | 4 | `approval_policies`, `approval_requests`, `approval_steps`, `approval_delegations` | `approvals-quotes.ts` (0024) |
| B2B teklif | 5 | `quotes`, `quote_versions`, `quote_version_lines`, `quote_messages`, `quote_attachments` | `approvals-quotes.ts` (0024) |
| Tema | 4 | `themes`, `theme_builds`, `theme_settings`, `channel_themes` | `themes.ts` (0025) |
| Agentic builder | 7 | `agent_sessions`, `agent_messages`, `agent_tool_calls`, `agent_checkpoints`, `agent_artifacts`, `agent_missions`, `agent_usage` | `agent.ts` (0026) |
| Admin | 2 | `admin_layouts`, `admin_user_prefs` | `admin-prefs.ts` (0027) |
| Çekirdek entegrasyon | 2 | `invoices`, `customer_payment_methods` | `invoices.ts` (0022), `customers.ts` (0011) |
| Built-in: wishlist | 2 | `bia_wishlist_lists`, `bia_wishlist_items` | modül |
| Built-in: reviews | 5 | `bia_reviews_reviews`, `bia_reviews_responses`, `bia_reviews_media`, `bia_reviews_stats`, `bia_reviews_requests` | modül |
| Built-in: İYS | 2 | `bia_iys_sync`, `bia_iys_cursor` | modül |
| Built-in: abonelik | 18 | `bia_subscriptions_*` (karar 5) | modül |
| Built-in: e-fatura | 3 | `bia_efatura_invoices`, `bia_efatura_parties`, `bia_efatura_deadlines` | modül |
| Tak-çalıştır app'in kendi veritabanı (ERP) | 2 | `webhook_inbox`, `conflicts` | app'in kendi DB'si |

`external_refs` çekirdek tablodur ve `01-cekirdek-isletme.md`'de tanımlıdır (karar 3); bu grubun o tabloya ek sütun ihtiyacı bölüm G'de. Başka gruplarda tanımlı tablolara bu belgelerin eklediği sütunlar "Çekirdek tablolara bu gruptan gelen sütunlar" bölümünde.

## Ortak kurallar (bu dosyada her tabloda tekrar yazılmaz)

- **Kimlik:** iç `id integer` PK, API'ye çıkmaz. API'den adreslenen tabloda `public_id text` benzersiz (önek + 10 karakter Crockford base32). Belgedeki önekler `com_`, `quo_`; bu dosyada konan önekler (karar: iç `id` API'ye çıkmaz kuralı, her biri benzersiz): `cmb_` üye, `cad_` şirket adresi, `apl_` onay politikası, `apr_` onay isteği, `apd_` devir, `qat_` teklif eki, `thm_` tema, `thb_` tema derlemesi, `ags_` ajan oturumu, `inv_` fatura, `cpm_` kayıtlı ödeme yöntemi, `rev_` yorum, `spl_` abonelik planı, `sub_` abonelik, `cyc_` cycle, `dun_` dunning kaydı, `sdl_` teslimat, `rto_` elde tutma teklifi. `01`/`02`'deki öneklerle (`prod_ var_ col_ ord_ itm_ ref_ cus_ chn_ pl_ adm_ omk_ oma_ omp_ otk_`) çakışma yok.
- **Bileşik anahtar:** bağlantı, sayaç ve tek satırlık tablolarda doğal bileşik PK kullanılır, ayrı `id` yok (karar: başka tablo bu satırlara başvurmuyor).
- **Zaman:** `integer` UTC unix ms. Değişebilen satırda `created_at` + `updated_at`; yalnız ekleme yapılan satırda yalnız `created_at` (karar: güncellenmeyen satırda `updated_at` anlamsız).
- **Boolean:** `integer` 0/1. **JSON:** `text` + `{ mode: "json" }`; yalnız birlikte okunup yazılan veri; filtrelenen alan sütundur.
- **Para:** `integer` küçük birim + `currency text(3)` (ISO 4217). Oranlar baz puan `integer`.
- **Yazma:** `atomic(stmts)` = `db.batch()`; interaktif transaction yok, yarışlar koşullu `UPDATE ... WHERE`. Eşzamanlı yazılan satırda `version integer`, `WHERE version = ?`.
- **Built-in app tabloları** `bia_<id>_`; şema `packages/modules/<x>/src/schema/`, çekirdek tablolara yazmaz (okur/join eder).
- **Özel alan:** `custom_fields` JSON desteklenen varlıklarda (ürün, varyant, koleksiyon, müşteri, şirket, adres, sipariş, sipariş satırı, kanal, teklif). `metadata`/`private_metadata` JSON (ürün, sipariş, müşteri); anahtar ayırıcı `.`, anahtar başına 2 KB, varlık başına 16 KB (`04-genisletme/04-ozel-alanlar-ve-metadata.md`).
- **Adres:** çekirdek genel adres sütunları `address_line1`, `address_line2`, `city`, `region`, `district?`, `postal_code`, `country`; ülkeye özgü alan modülün `custom_fields`'ı.

---

# A. B2B: şirket ve kredi

### `companies`
- **Sahip:** `packages/core/src/features/companies`; şema `packages/db/src/schema/companies.ts`.
- **Kaynak:** `06-b2c-b2b/02-sirket-hesaplari.md` §1, §3, §4, §6; `06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md` §3; `04-teklif-ve-onay.md` §1.1.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `com_` |
| `name` | text | hayır | unvan (karar: genel ad) |
| `tax_id` | text | evet | (karar: başvuruda zorunlu değil; çekirdek yalnız biçim denetler) |
| `tax_id_type` | text | evet | (karar: `tax_id` ile birlikte dolu; ülke doğrulaması modülde) |
| `status` | text | hayır | `pending · approved · suspended` |
| `parent_id` | integer FK → companies.id | evet | ana şirket / şube |
| `sales_rep_admin_id` | integer FK → admin_users.id | evet | (karar: belge temsilciyi tekil anıyor; tek temsilci) |
| `payment_terms_days` | integer | evet | vade günü |
| `all_orders_need_approval` | integer 0/1 | hayır | (karar: §1.1 "şirket tüm siparişler onaylı ayarı"; ayar deposunda şirket kapsamı yok, varsayılan 0) |
| `order_rules` | text JSON | evet | en az tutar, en fazla adet (karar: yalnız checkout doğrulamasında birlikte okunur, filtrelenmez; boşsa kanal ayarı) |
| `custom_fields` | text JSON | evet | genel özel alanlar; Türkiye'ye özgü vergi dairesi ve mükellefiyet `bia_efatura_parties`'te (karar 6) |
| `version` | integer | hayır | iyimser kilit |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(status, created_at)` başvuru kuyruğu; `(parent_id)`; `(sales_rep_admin_id)`; `(tax_id)` ERP cari eşlemesi için, benzersiz değil (karar: şubeler aynı vergi numarasını paylaşabilir).
- **Kurallar:** durum makinesi `pending → approved → suspended → approved`; onay `companies:approve`. Askıya alma ile checkout yarışı: rezervasyon `atomic()`'inde `AND EXISTS (SELECT 1 FROM companies WHERE id=? AND status='approved')`. Durum değişince etkilenen oturumların `session_version`'ı aynı `atomic()`'te artar. Onayla birlikte `company.approved` outbox satırı aynı batch'te. `tax_id` kişisel veri olabilir (şahıs şirketi); günlük ve ajan çıktısında maskelenir (karar: müşteri `tax_id` kuralıyla aynı).
- **İlişkiler:** `company_members`, `company_addresses`, `company_channels`, `company_credit`, `credit_ledger`, `approval_policies`, `quotes`, `carts.company_id`, `orders.company_id`, `price_list_targets`, `bia_efatura_parties`.
- **Yapılacaklar:**
  - şema `companies.ts`; migration tablo + indeksler aynı dosyada
  - sorgular: `features/companies/queries/getCompany.ts`, `listCompanies.ts` (imleçli, status süzgeçli), `approveCompany.ts` (koşullu `WHERE status='pending'`), `suspendCompany.ts`
  - testler: askıya alma ile eşzamanlı checkout yarışı; `company.approved` outbox satırının aynı batch'te yazılması
  - tohum: bir `approved` ve bir `pending` şirket

### `company_members`
- **Sahip:** `features/companies`; şema `companies.ts`.
- **Kaynak:** `02-sirket-hesaplari.md` §1, §2; `04-teklif-ve-onay.md` §1.1.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | onay zincirinde `member:<id>` başvurusu |
| `public_id` | text | hayır | `cmb_` (karar: şirket yöneticisi üye çıkarma/limit uçlarında adresler) |
| `company_id` | integer FK → companies.id | hayır | |
| `customer_id` | integer FK → customers.id | hayır | |
| `role` | text | hayır | `admin · approver · buyer · viewer` |
| `spend_limit` | integer | evet | sipariş başı limit, küçük birim |
| `spend_limit_currency` | text(3) | evet | (karar: limit tek para biriminde; farklı para birimli sepette limit karşılaştırılamaz, onay gerekir — güvenli taraf) |
| `can_view_all_orders` | integer 0/1 | hayır | (karar: `buyer` için "ayarla şirketin tüm siparişleri" üye başına; varsayılan 0) |
| `status` | text | hayır | `invited · active · removed` (karar: davet akışı §2 `admin` yetkisi; çıkarılan üye geçmiş siparişlerde başvuru olarak kalır) |
| `version` | integer | hayır | (karar: şirket yöneticisi ile mağaza yöneticisi aynı anda limit/rol değiştirebilir) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz `(company_id, customer_id)`; `(customer_id)` girişte üyelikleri yüklemek için.
- **Kurallar:** her sorgu `company_id = ctx.company.id` süzgeci taşır. Üyelik değişince etkilenen oturumların sürümü artar. Onaylayıcı çıkarılınca bekleyen onay adımları `escalate_to`'ya, yoksa şirket yöneticisine geçer (aynı `atomic()`).
- **İlişkiler:** `companies`, `customers`, `approval_steps.approver_ref`, `approval_delegations`, `approval_requests.requested_by`, `quotes.requested_by`.
- **Yapılacaklar:**
  - sorgular: `features/companies/members/queries/listMembers.ts`, `inviteMember.ts`, `removeMember.ts`, `setSpendLimit.ts`
  - test: üye çıkarılınca bekleyen adımların devri; `session_version` artışı

### `company_addresses`
- **Sahip:** `features/companies`; şema `companies.ts`.
- **Kaynak:** `02-sirket-hesaplari.md` §1; `03-b2b-katalog-fiyat-siparis.md` §5 (teslimat şubesi).
- **Sütunlar:** (karar: ayrı tablo; çekirdek `addresses` müşteriye bağlı ve müşteri başına 20 sınırlı, şirket adres defteri tüm üyelerce paylaşılır)

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `cad_` (karar: checkout'ta teslimat şubesi seçimi) |
| `company_id` | integer FK → companies.id | hayır | |
| `kind` | text | hayır | `shipping · billing · both` (karar: §1 "teslimat ve fatura adres defteri") |
| `label` | text | evet | şube / depo adı |
| `contact_name` | text | evet | |
| `phone` | text | evet | E.164 |
| `address_line1` | text | hayır | |
| `address_line2` | text | evet | |
| `city` | text | hayır | |
| `region` | text | evet | |
| `district` | text | evet | |
| `postal_code` | text | evet | |
| `country` | text(2) | hayır | ISO 3166-1 alpha-2 |
| `is_default` | integer 0/1 | hayır | (karar: tür başına bir varsayılan, uygulama kuralı) |
| `custom_fields` | text JSON | evet | adres özel alan destekli varlık |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(company_id, kind)`.
- **Kurallar:** yalnız şirket `admin` rolü yazar. Sipariş adresi anlık görüntü olarak kopyalanır; adres değişimi siparişi etkilemez. Adres kişisel veri sayılabilir.
- **İlişkiler:** `companies`; `orders` (teslimat şubesi anlık görüntüsü).
- **Yapılacaklar:** sorgular `features/companies/addresses/queries/*`; test: `admin` rolü dışındakinin yazamaması.

### `company_channels`
- **Sahip:** `features/companies`; şema `companies.ts`.
- **Kaynak:** `02-sirket-hesaplari.md` §1.
- **Sütunlar:** `company_id integer FK → companies.id` (boş değil), `channel_id integer FK → channels.id` (boş değil), `created_at integer` (karar: bağlantı tablosu, yalnız ekleme/silme).
- **Anahtar ve indeksler:** PK `(company_id, channel_id)`; `(channel_id)`.
- **Kurallar:** şirket yalnız bağlı olduğu kanalda satın alır; denetim rezervasyon `atomic()`'inde `AND EXISTS (company_channels …)` (karar: askıya alma denetimiyle aynı yer).
- **İlişkiler:** `companies`, `channels`.
- **Yapılacaklar:** migration; test: bağlı olmadığı kanalda checkout reddi.

### `company_credit`
- **Sahip:** `packages/core/src/features/credit`; şema `companies.ts` (karar: `00-genel.md` migration 0023 kredi tablolarını şirket dosyasında topluyor).
- **Kaynak:** `06-b2c-b2b/05-kredi-ve-odeme-kosullari.md` §2, §3, §4; `credit_limit` adı karar.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `company_id` | integer FK → companies.id | hayır | |
| `currency` | text(3) | hayır | |
| `credit_limit` | integer | hayır | küçük birim |
| `used` | integer | hayır | mağazanın yazdığı taahhüt; mağaza kipinde tüm kullanım |
| `erp_used` | integer | evet | (karar: ERP kipinde ERP'nin bildirdiği bakiye ayrı sütunda; "her sütunun tek yazıcısı" ile çelişki 5 kapanır; mağaza kipinde boş) |
| `erp_synced_at` | integer | evet | (karar: bayat kredi uyarısı için, stok senkronundaki `erp_qty_at` deseni) |
| `version` | integer | hayır | admin/ERP düzenlemesi |
| `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** PK `(company_id, currency)`.
- **Kurallar:** kullanılabilir = `credit_limit − COALESCE(erp_used, 0) − used`. Vadeli settlement'ta koşullu ifade:
  `UPDATE company_credit SET used = used + :total WHERE company_id=:c AND currency=:cur AND COALESCE(erp_used,0) + used + :total <= credit_limit AND EXISTS (SELECT 1 FROM orders WHERE id=:o AND settlement_token=:t)`; sipariş ekleme de bu koşula bağlı, aynı batch. Tahsilat: `payments` + `credit_ledger` + `used −` tek `atomic()` (mağaza kipi). İade/iptal krediyi geri verir. ERP kipinde ERP senkronu (`credit.set`) yalnız `credit_limit`, `erp_used`, `erp_synced_at` yazar; ERP siparişi onaylayınca o siparişin tutarı `used`'dan düşülür (stoktaki taahhüt deseni). Ticari sır: `credit:read|write` izni. Checkout'ta ERP'ye canlı sorgu yok.
- **İlişkiler:** `companies`, `credit_ledger`, `orders`, `payments`.
- **Yapılacaklar:**
  - sorgular: `features/credit/queries/reserveCredit.ts` (koşullu), `releaseCredit.ts`, `setCredit.ts` (ERP senkron, `WHERE version=?`), `getCredit.ts`
  - yarış testi: aynı şirketten iki eşzamanlı vadeli sipariş limiti birlikte aşamaz; askıya alma + sipariş; ERP senkronu + sipariş
  - test: kredi yetmezse sipariş satırı oluşmaz, rezervasyon bırakılır

### `credit_ledger`
- **Sahip:** `features/credit`; şema `companies.ts`.
- **Kaynak:** `05-kredi-ve-odeme-kosullari.md` §2, §3, §5.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `company_id` | integer FK → companies.id | hayır | (karar: ekstre şirket başına) |
| `currency` | text(3) | hayır | (karar: kredi para birimi başına) |
| `kind` | text | hayır | `order · payment · refund · adjustment` |
| `amount` | integer | hayır | işaretli küçük birim: borcu artıran `+` (sipariş), azaltan `−` (tahsilat, iade); düzeltme iki yönlü (karar: ekstre toplamı = bakiye) |
| `reference` | text | evet | ilgili `ord_`/`ref_`/ödeme `public_id` (karar: çok biçimli, FK yok) |
| `actor` | text | evet | `admin:<public_id>` · `app:<id>` · `system` (karar: aktör dizesi biçimi onay adımlarıyla aynı) |
| `note` | text | evet | düzeltme nedeni (karar: `adjustment` için zorunlu, uygulama kuralı) |
| `created_at` | integer | hayır | |

- **Anahtar ve indeksler:** `(company_id, currency, created_at)` ekstre sayfası; kısmi benzersiz `(kind, reference) WHERE reference IS NOT NULL` (karar: aynı olay iki kez yazılmaz; referanssız düzeltmeye izin).
- **Kurallar:** yalnız ekleme (UPDATE/DELETE yok). Satırda bakiye anlık görüntüsü tutulmaz (karar: eşzamanlı eklemede sıralı bakiye koşullu yazma ister; bakiye `company_credit`'ten okunur). Müşteriye ekstre `no-store`, yalnız şirket `admin` rolüne ve ayarla alıcılara.
- **İlişkiler:** `company_credit`, `orders`, `payments`, `refunds` (referansla).
- **Yapılacaklar:** sorgu `features/credit/queries/listLedger.ts` (imleçli); test: tahsilatta ledger + used aynı batch.

---

# B. B2B: onay akışı

### `approval_policies`
- **Sahip:** `packages/core/src/features/approvals`; şema `packages/db/src/schema/approvals-quotes.ts`.
- **Kaynak:** `06-b2c-b2b/04-teklif-ve-onay.md` §1.2.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `apl_` (karar: admin ve şirket yöneticisi düzenler) |
| `channel_id` | integer FK → channels.id | hayır | |
| `company_id` | integer FK → companies.id | evet | boş = kanalın tüm şirketleri |
| `name` | text | hayır | |
| `priority` | integer | hayır | yüksek kazanır; eşitse zincirler birleşir |
| `active` | integer 0/1 | hayır | |
| `conditions` | text JSON | hayır | kapalı şema: `total`, `member_role`, `member_id`, `spend_period_total`, `collection/product/category in`, `line_discount_pct`, `payment_method`, `custom`; AND + `any` |
| `chain` | text JSON | hayır | adımlar: `approvers`, `mode` (`any · all`), `type` (`human · external`), `timeout_hours`, `on_timeout` (`remind · escalate · auto_approve · auto_reject`), `escalate_to` |
| `allow_auto_approve` | integer 0/1 | hayır | (karar: §1.3 "`auto_approve` yalnız şirket yöneticisi açıkça izin verirse"; yazımda `chain` bunu içeriyorsa 1 olmalı) |
| `version` | integer | hayır | (karar: mağaza ve şirket yöneticisi aynı politikayı düzenleyebilir) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(channel_id, company_id, active, priority)`.
- **Kurallar:** sıcak yola (katalog, sepet hesabı) koşul eklenmez; politika yalnız "onaya gönder" anında okunur.
- **İlişkiler:** `companies`, `channels`, `approval_requests.policy_ids`.
- **Yapılacaklar:** sorgu `features/approvals/queries/matchPolicies.ts`; test: öncelik/birleştirme, tekrar eden onaylayıcı bir kez.

### `approval_requests`
- **Sahip:** `features/approvals`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §1.1, §1.3.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `apr_` (karar: e-posta bağlantısı ve müşteri API'si) |
| `cart_id` | integer FK → carts.id | hayır | |
| `policy_ids` | text JSON | hayır | eşleşen politika kimlikleri (karar: belgedeki tek `policy_id` birleşmiş zincirde yetmez; yalnız denetim için okunur, filtrelenmez) |
| `status` | text | hayır | `pending · approved · rejected · changes_requested · expired · cancelled` |
| `current_step` | integer | hayır | |
| `requested_by` | integer FK → company_members.id | hayır | |
| `chain_snapshot` | text JSON | hayır | birleşmiş zincirin istek anındaki kopyası (karar: politika sonradan değişirse bekleyen istek etkilenmez) |
| `cart_total_snapshot` | integer | hayır | (karar: §1.1 "fark görünür"; gönderim anındaki toplam) |
| `currency` | text(3) | hayır | (karar: tutar sütunu para birimi ister) |
| `expires_at` | integer | evet | (karar: §1.1 "süresi dolunca zamanlanmış görevle kapanır"; boşsa süresiz) |
| `version` | integer | hayır | (karar: iptal, değişiklik isteği ve son adım kararı yarışır) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; kısmi benzersiz `(cart_id) WHERE status='pending'` (karar: sepet başına tek açık istek); `(status, expires_at)` süre dolumu işi; `(requested_by, created_at)` isteyenin listesi.
- **Kurallar:** "onaya gönder" = `carts.status='awaiting_approval'` + istek satırı + adım satırları + `approval.requested` outbox tek `atomic()`. Stok ayrılmaz. İsteyen kendi isteğini onaylayamaz (devirle de). Süre dolumu `expired`.
- **İlişkiler:** `carts`, `approval_policies`, `approval_steps`, `company_members`.
- **Yapılacaklar:** sorgular `features/approvals/queries/submitForApproval.ts`, `listPending.ts`, `cancelRequest.ts`; test listesi belgede §1.6.

### `approval_steps`
- **Sahip:** `features/approvals`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §1.3, §1.4, §1.5.
- **Satır modeli:** (karar: §1.3 "karar satırları") adım × onaylayıcı başına bir satır. `any` kipinde ilk karar aynı adımın kalan `pending` satırlarını aynı `atomic()`'te `skipped` yapar; `all` kipinde adım, o `step_no`'da `pending` satır kalmayınca kapanır. Böylece iki onaylayıcının yarışı satır düzeyinde koşullu güncellemeyle çözülür.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `request_id` | integer FK → approval_requests.id | hayır | |
| `step_no` | integer | hayır | |
| `mode` | text | hayır | `any · all` (karar: zincirden kopya, kapanış koşulu sorguda okunur) |
| `approver_ref` | text | hayır | `member:<id>` · `role:<ad>` · `manager_of_requester` · `store_staff:<izin>` · `app:<id>` |
| `state` | text | hayır | `waiting · pending · approved · rejected · skipped` |
| `due_at` | integer | evet | `timeout_hours` boşsa boş |
| `decided_by` | text | evet | aktör dizesi `member:<id>` · `admin:<public_id>` · `system:timeout` · `app:<id>` (karar: üç farklı aktör türü tek FK'ye sığmaz) |
| `decided_at` | integer | evet | |
| `via` | text | evet | `direct · delegation · escalation · timeout · external` |
| `on_behalf_of_member_id` | integer FK → company_members.id | evet | devirde "X adına Y" (karar: devreden her zaman üyedir) |
| `note` | text | evet | ret/değişiklik nedeni |
| `link_token_hash` | text | evet | e-postadaki tek tıkla onay bağlantısının özeti (karar: §1.5 tek kullanımlık; jeton yalnız özetle saklanır, kullanılınca boşaltılır) |
| `link_expires_at` | integer | evet | (karar: bağlantı süresi `due_at` ya da varsayılan 7 gün, ayar) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** `(state, due_at)` (belgede) zaman aşımı işi; benzersiz `(request_id, step_no, approver_ref)`; benzersiz `(link_token_hash)` bağlantı çözümü.
- **Kurallar:** karar koşullu: `WHERE id=? AND state='pending' AND step_no=(SELECT current_step FROM approval_requests WHERE id=request_id)`. Adım kapanınca sonraki adımın satırları `pending` + `due_at`, `current_step` artışı aynı `atomic()`. Zaman aşımı işi 5 dakikada bir `state='pending' AND due_at<=now` parça parça, `via='timeout'`, aktör `system:timeout`.
- **İlişkiler:** `approval_requests`, `company_members`, `approval_delegations`.
- **Yapılacaklar:** sorgu `features/approvals/queries/decideStep.ts` (koşullu), `dueSteps.ts` (sorgu planı testi: indeksli); yarış testi: aynı adımda iki eşzamanlı karar; `all` kipinde son onayın adımı kapatması.

### `approval_delegations`
- **Sahip:** `features/approvals`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §1.3.
- **Sütunlar:** `id integer PK`; `public_id text` `apd_` (karar: üye kendi devrini iptal eder); `member_id integer FK → company_members.id`; `delegate_id integer FK → company_members.id`; `from_at integer`; `until_at integer`; `created_at integer`; `revoked_at integer?` (karar: silmek yerine iptal, denetim izi kalır). Hepsi `revoked_at` dışında boş değil.
- **Anahtar ve indeksler:** `(member_id, from_at, until_at)`.
- **Kurallar:** devir yetkiyi artırmaz; kendi isteğini onaylayamaz kuralı geçerli. Üst üste binen etkin devir engellenir: ekleme koşullu `INSERT ... SELECT ... WHERE NOT EXISTS (aynı member_id, revoked_at IS NULL, aralık kesişiyor)` (karar: karar anında tek devir bulunur, belirsizlik yok). `member_id <> delegate_id`.
- **İlişkiler:** `company_members`, `approval_steps.via='delegation'`.
- **Yapılacaklar:** test: devir sırasında şirketten çıkarma; çakışan devir reddi.

---

# C. B2B: teklif

### `quotes`
- **Sahip:** `packages/core/src/features/quotes`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §2.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `quo_` |
| `channel_id` | integer FK → channels.id | hayır | |
| `company_id` | integer FK → companies.id | hayır | |
| `requested_by` | integer FK → company_members.id | hayır | isteyen üye |
| `status` | text | hayır | `requested · offered · countered · accepted · rejected · expired · cancelled` |
| `current_version` | integer | hayır | mevcut sürüm no |
| `sales_rep_admin_id` | integer FK → admin_users.id | evet | |
| `valid_until` | integer | evet | mevcut sürümden kopya |
| `round_count` | integer | hayır | tur sınırı varsayılan 10 (ayar) |
| `currency` | text(3) | hayır | (karar: teklif tek para biriminde, kabulde aynı para birimli sepete döner) |
| `accepted_cart_id` | integer FK → carts.id | evet | (karar: kabul sonrası oluşan sepet; çift kabulde ikinci sepet açılmaz) |
| `custom_fields` | text JSON | evet | teklif özel alan destekli varlık |
| `version` | integer | hayır | satır sürümü |
| `created_at`, `updated_at` | integer | hayır | |

- **İç onay alt durumu:** ayrı sütun yok (karar: alt durum sürüme aittir; `quote_versions.approval_state='pending'` olan mevcut sürüm müşteriye "inceleniyor" diye gösterilir, `status` `offered` kalır).
- **Anahtar ve indeksler:** benzersiz `public_id`; `(company_id, status)`; `(status, valid_until)` süre dolumu işi; `(sales_rep_admin_id, status)`.
- **Kurallar:** kabul `WHERE status='offered' AND current_version=? AND valid_until>now AND version=?` ve mevcut sürümün `approval_state` boş ya da `approved`. Her tur sürüm artırır. Tavan indirimi aşan sürüm `quotes:approve_discount` onayına kadar müşteriye gösterilmez. Kabulde sepet oluşur, fiyat kabul edilen sürümden (sepet satırının kendi alanı). Promosyon teklif fiyatlı satıra uygulanmaz. Stok ayrılmaz (istenirse `stock_movements: hold`, süreli).
- **İlişkiler:** `companies`, `company_members`, `channels`, `admin_users`, `quote_versions`, `quote_messages`, `carts`.
- **Yapılacaklar:**
  - sorgular: `features/quotes/queries/requestQuote.ts`, `offerVersion.ts`, `counterVersion.ts`, `acceptQuote.ts` (koşullu), `expireQuotes.ts`
  - yarış testi: eşzamanlı iki karşı teklif, biri kazanır
  - test listesi belgede §2 "Test"

### `quote_versions`
- **Sahip:** `features/quotes`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §2.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | (karar: satırlar `version_id` ile başvurur) |
| `quote_id` | integer FK → quotes.id | hayır | |
| `no` | integer | hayır | |
| `side` | text | hayır | `buyer · seller` |
| `created_by_id` | integer | hayır | `side='buyer'` → `company_members.id`, `side='seller'` → `admin_users.id` (karar: tür `side`'dan bellidir, FK uygulama kuralı) |
| `valid_until` | integer | evet | |
| `payment_terms` | text | evet | (karar: serbest metin; kabulde `orders.payment_terms`'e kopyalanır, aynı tür) |
| `note` | text | evet | |
| `total` | integer | hayır | anlık görüntü |
| `currency` | text(3) | hayır | (karar: tutar sütunu para birimi ister) |
| `approval_state` | text | evet | `pending · approved · rejected`; boş = iç onay gerekmez (karar: §2 madde 2) |
| `approved_by_admin_id` | integer FK → admin_users.id | evet | (karar: ikinci yöneticinin kim olduğu denetim için) |
| `created_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(quote_id, no)`.
- **Kurallar:** içerik değişmez; yalnız `approval_state`/`approved_by_admin_id` bir kez `pending → approved|rejected` koşullu güncellenir (karar: iç onay sürümün içeriğini değiştirmez). Arayüz iki sürüm arasında fark gösterir.
- **İlişkiler:** `quotes`, `quote_version_lines`.
- **Yapılacaklar:** test: sürüm değişmezliği; iç onay bekleyen sürümün müşteriden gizli kalması.

### `quote_version_lines`
- **Sahip:** `features/quotes`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §2.
- **Sütunlar:** `id integer PK` (karar: satır sırası ve fark görünümü için kimlik); `version_id integer FK → quote_versions.id`; `variant_id integer FK → product_variants.id`; `sku text`; `product_name text` (karar: sürüm değişmez, ürün sonradan değişse/silinse de fark görünümü doğru kalır; sipariş anlık görüntü kuralı); `quantity integer`; `list_price integer`; `offer_price integer?` (alıcı sürümünde hedef fiyat, boş olabilir); `note text?`. Para birimi sürümdedir.
- **Anahtar ve indeksler:** `(version_id)`.
- **Kurallar:** değişmez (yalnız INSERT).
- **İlişkiler:** `quote_versions`, `product_variants`.
- **Yapılacaklar:** test: kabulde yalnız kabul edilen sürümün fiyatı.

### `quote_messages`
- **Sahip:** `features/quotes`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §2 (madde 5, 6).
- **Sütunlar:** `id integer PK`; `quote_id integer FK → quotes.id` (karar: yazışma teklife aittir; görünürlük süzgeci indeksi bunu ister); `version_no integer?`; `visibility text` (`shared · internal`); `author_kind text` (`member · admin`); `author_id integer` (karar: `member` → `company_members.id`, `admin` → `admin_users.id`; mesajın tarafı sürüm gibi `side`'dan çıkmadığı için tür sütunu gerekli); `body text` (karar: düz metin, HTML temizlenir); `created_at integer`.
- **Anahtar ve indeksler:** `(quote_id, visibility, created_at)`.
- **Kurallar:** `visibility` süzgeci çekirdek sorguda; müşteri API'sinden `internal` asla dönmez. `author_kind='member'` iken `visibility='internal'` yazılamaz (karar: iç not yalnız satıcı tarafı). Yalnız ekleme.
- **İlişkiler:** `quotes`, `quote_attachments`.
- **Yapılacaklar:** sorgu `features/quotes/queries/listMessages.ts` (görünürlük parametresi zorunlu); test: iç notun müşteri API'sinde görünmemesi.

### `quote_attachments`
- **Sahip:** `features/quotes`; şema `approvals-quotes.ts`.
- **Kaynak:** `04-teklif-ve-onay.md` §2 ("`quote_attachments`: özel depolama `private` kovası, imzalı bağlantı"), §2 Test ("ek dosyaya yetkisiz erişim"); `02-ticaret.md` `media`.
- **Sütunlar:** (karar: dosya çekirdek `media` satırıdır, `bucket='private'`; bu tablo yalnız mesaja bağlar ve indirme adını tutar)

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `qat_` (karar: imzalı indirme bağlantısı bu kimlikle üretilir) |
| `quote_id` | integer FK → quotes.id | hayır | (karar: yetki denetimi tek join'le teklif → şirket) |
| `message_id` | integer FK → quote_messages.id | hayır | görünürlük mesajdan gelir |
| `media_id` | integer FK → media.id | hayır | `bucket='private'` olmalı |
| `filename` | text | hayır | kullanıcının yüklediği ad (indirmede `Content-Disposition`) |
| `created_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(message_id)`; `(media_id)` medya silme `NOT EXISTS` denetimi için.
- **Kurallar:** boyut ve tür `media` sınırlarından (varsayılan 10 MB); mesaj başına en çok 10 ek (karar: koşullu `INSERT ... WHERE (SELECT count(*) …) < 10`, ayarla değişir). İndirme: `quotes:read` (satıcı) ya da teklifin şirketinin üyesi; `internal` mesajın eki müşteriye gösterilmez. İmzalı bağlantı kısa süreli, `no-store`. Yalnız ekleme.
- **İlişkiler:** `quotes`, `quote_messages`, `media`.
- **Yapılacaklar:** test: başka şirketin ekine ve `internal` eke yetkisiz erişim reddi; `media` kullanım listesine `quote_attachments` eklenmeli.

---

# D. Tema

### `themes`
- **Sahip:** `packages/core/src/features/themes`; şema `packages/db/src/schema/themes.ts`.
- **Kaynak:** `07-istemciler/04-tema-sistemi.md` §7, §8, §10.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `thm_` |
| `name` | text | hayır | |
| `source` | text | hayır | `builtin · github` |
| `repo` | text | evet | `owner/name` |
| `branch` | text | evet | |
| `github_installation_id` | integer | evet | |
| `status` | text | hayır | `active · archived` (karar: yayında/taslak ayrımı `channel_themes`'ten çıkar; temanın kendi durumu yalnız kütüphanede görünürlük) |
| `auto_publish` | integer 0/1 | hayır | yayındaki dala push'ta otomatik yayın, varsayılan 0 (karar: §7) |
| `source_digest` | text | evet | resmî olmayan tema bağlanırken kaydedilen kaynak özeti (karar: §10) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(github_installation_id, repo, branch)` push webhook'unda bağlı dalı bulmak için.
- **Kurallar:** bağlama/yayın `themes:write` + yeniden kimlik doğrulama, denetim kaydı. Kurulum token'ı saklanmaz; kasada yalnız App özel anahtarı ve webhook sırrı.
- **İlişkiler:** `theme_builds`, `theme_settings`.
- **Yapılacaklar:** sorgu `features/themes/queries/findByRepoBranch.ts`; test: bağlı olmayan dalın push'u yok sayılır; imzası geçersiz webhook 401 ve hiçbir satır yazılmaz; tohum: `default` builtin tema.

### `theme_builds`
- **Sahip:** `features/themes`; şema `themes.ts`.
- **Kaynak:** `04-tema-sistemi.md` §7, §9, §11, §13.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `thb_` (karar: kütüphanede "bu derlemeyi yayınla/geri al" uçları) |
| `theme_id` | integer FK → themes.id | hayır | |
| `commit_sha` | text | hayır | |
| `integrity_digest` | text | evet | commit bütünlük özeti |
| `state` | text | hayır | `queued · building · ready · failed` |
| `log_ref` | text | evet | derleme günlüğünün R2/yerel dosya anahtarı (karar: günlük büyük, satıra konmaz) |
| `output_ref` | text | evet | Worker sürüm kimliği veya yerel dizin |
| `shell_version` | text | hayır | |
| `size_report` | text JSON | evet | sayfa başı JS/CSS bayt ve görsel ipucu denetimi (karar: §11 sayfa başına ölçüm, birlikte okunur) |
| `expired_at` | integer | evet | Cloudflare son 100 sürüm dışına düştü (karar: "süresi doldu" durum değeri değil işaret; `state` makinesi belgedeki gibi kalır) |
| `created_by_admin_id` | integer FK → admin_users.id | evet | (karar: elle tetiklenen derleme; push'ta boş) |
| `created_at` | integer | hayır | |
| `finished_at` | integer | evet | (karar: derleme süresi kütüphanede gösterilir) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(theme_id, created_at)`; `(state)` kuyruk.
- **Kurallar:** `queued → building → ready | failed`. `expired_at` dolu derleme yeniden derlenmeden yayınlanamaz. SaaS'ta tema başına son 20, self-host'ta son 50 derleme tutulur, eskiler (yayında ve `previous_build_id` olanlar hariç) silinir (karar: sayılar ayar, Cloudflare 100 sınırının altında). Kabuk yükseltmesinde yeniden derleme; başarısızsa eski derleme yayında kalır.
- **İlişkiler:** `themes`, `channel_themes`.
- **Yapılacaklar:** sorgu `markBuildReady.ts` (koşullu `WHERE state='building'`); test: kabuk yükseltmesinde başarısız derleme eski derlemeyi bozmaz.

### `theme_settings`
- **Sahip:** `features/themes`; şema `themes.ts`.
- **Kaynak:** `04-tema-sistemi.md` §5, §7.
- **Sütunlar:** `channel_id integer FK → channels.id`; `theme_id integer FK → themes.id`; `settings text JSON` (yayında); `draft text JSON?`; `version integer` (karar: taslağı iki yönetici aynı anda düzenleyebilir); `updated_at integer`.
- **Anahtar ve indeksler:** PK `(channel_id, theme_id)`.
- **Kurallar:** değer Zod şemasıyla (tema `settings.ts`) doğrulanır. Değişiklik derleme gerektirmez; yalnız `shell` önbellek etiketi temizlenir. Taslak → önizleme → yayın. Sayfa düzeni/bölümler bu JSON'da değil, çekirdek `sections` tablosunda (karar: `02-ticaret.md` `sections`).
- **İlişkiler:** `channels`, `themes`.
- **Yapılacaklar:** test: ayar değişikliği yeniden derlemesiz yansır.

### `channel_themes`
- **Sahip:** `features/themes`; şema `themes.ts`.
- **Kaynak:** `04-tema-sistemi.md` §7, §9.1.
- **Sütunlar:** `channel_id integer FK → channels.id` (PK); `theme_build_id integer FK → theme_builds.id`; `previous_build_id integer FK → theme_builds.id?`; `published_at integer`; `published_by_admin_id integer FK → admin_users.id?` (karar: yayın denetim kaydı; otomatik yayında boş); `updated_at integer`.
- **Anahtar ve indeksler:** PK `channel_id`.
- **Kurallar:** yayınla = tek koşullu güncelleme (`WHERE theme_build_id = ?` eski değer) + `shell` önbellek temizliği; geri al = `previous_build_id`'ye dön. `supports.b2b=false` tema `b2b`/`hybrid` kanalda yayınlanamaz (uygulama kuralı). Koşullu güncelleme `version` yerine `theme_build_id` eşitliğiyle yapılır (karar: işaretçinin kendisi sürümdür).
- **İlişkiler:** `channels`, `theme_builds`.
- **Yapılacaklar:** yarış testi: eşzamanlı iki yayın; test: yayın/geri al kesintisizliği.

---

# E. Agentic builder

Sahip: `apps/api/src/features/agent/` (belge §11); şema `packages/db/src/schema/agent.ts`. Kaynak: `07-istemciler/05-agentic-builder.md` §3, §4.1, §5, §7, §8, §10. Mağaza boyutu: veritabanı = mağaza (tek kiracılı D1; SaaS'ta kiracı başına ayrı veritabanı, `01` `tenants`), bu yüzden hiçbir tabloda `store_id` yok (karar: §7, §10 "mağaza başına" bununla karşılanır).

### `agent_sessions`
- **Sütunlar:** `id integer PK`; `public_id text` `ags_`; `admin_user_id integer FK → admin_users.id`; `channel_id integer FK → channels.id`; `title text`; `status text` (`idle · running · awaiting_approval · error`); `model text`; `branch text?` (`openmers/agent/<oturum>`); `lock_token text?`; `locked_until integer?` (karar: süreç ölürse kilit 5 dakikada geri alınır, outbox `sending` deseni); `tool_list_hash text` (karar: araç listesi oturum başında sabitlenir); `total_tokens integer`; `total_cost_micros integer` (karar: sağlayıcı fiyatı USD; token başı maliyet sentin altında olduğundan milyonda bir USD tamsayı, para birimi sabit `USD`); `archived_at integer?` (karar: 90 gün arşiv işi işaretler); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `public_id`; `(admin_user_id, updated_at)`.
- **Kurallar:** oturumda tek döngü: `UPDATE ... SET lock_token=?, locked_until=? WHERE id=? AND (lock_token IS NULL OR locked_until < now)`. Kullanıcı başına eşzamanlı 1 döngü. Silinen yöneticinin oturumları denetim için saklanır. Başkası yalnız `agent:read_all` ile görür.
- **İlişkiler:** `admin_users`, `channels`, diğer `agent_*`.
- **Yapılacaklar:** sorgu `features/agent/queries/acquireLock.ts`; test: süreç ölünce kilidin süre sonunda alınması ve aynı adımdan sürme.

### `agent_messages`
- **Sütunlar:** `session_id integer FK → agent_sessions.id`; `seq integer`; `role text`; `content text JSON?` (sağlayıcı yanıtı değiştirilmeden, `reasoning_content` dahil; arşivden sonra boş); `usage text JSON?`; `summary text?` (karar: arşivden sonra satırda kalan özet); `archive_key text?` (karar: R2 nesne anahtarı); `created_at integer`.
- **Anahtar ve indeksler:** PK `(session_id, seq)`.
- **Kurallar:** yalnız ekleme; tek istisna arşiv işinin `content`'i boşaltıp `summary` + `archive_key` yazmasıdır (karar: §10 "satırda özet kalır"). Arşivlenmiş oturum sürdürülmek istenirse içerik R2'den geri yüklenir (DeepSeek `reasoning_content` zorunluluğu). Müşteri araçları varsayılan maskeli döner.
- **Yapılacaklar:** arşiv işi; test: bir turun `reasoning_content`'i silinirse 400 yakalanır.

### `agent_tool_calls`
- **Sütunlar:** `id integer PK`; `session_id integer FK → agent_sessions.id`; `message_seq integer`; `call_id text` (karar: sağlayıcının araç çağrısı kimliği, çift çalıştırmayı engeller); `tool_name text`; `input text JSON`; `risk text` (`read · write · destructive · money · external`); `status text` (`pending_approval · approved · rejected · running · pending · done · failed`; karar: `running` çalışırken, `pending` uygulama aracı işi geri çağrı beklerken); `job_id text?` (karar: uygulama aracının `pending` dönüşündeki `jobId`; `toolResult` geri çağrısı bu satırı bulur); `result_summary text?`; `audit_ids text JSON?`; `approved_by_admin_id integer FK → admin_users.id?`; `approved_at integer?`; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(session_id, call_id)`; `(session_id, status)`; kısmi benzersiz `(job_id) WHERE job_id IS NOT NULL`.
- **Kurallar:** onay kartı kararı koşullu (`WHERE status='pending_approval'`). Sırlar girdi/çıktıda yer almaz (desen taraması testi). Uygulama araçlarında belirsiz sonuç yeniden denenmez.
- **Yapılacaklar:** yarış testi: onay düğmesine çift tıklama tek çalıştırma; uygulama geri çağrısı iki kez gelirse tek sonuç.

### `agent_checkpoints`
- **Sütunlar:** `session_id integer FK → agent_sessions.id`; `seq integer`; `audit_from_id integer`; `audit_to_id integer`; `commit_sha text?`; `created_at integer`.
- **Anahtar ve indeksler:** PK `(session_id, seq)`.
- **Kurallar:** geri alma `audit_log` aralığından ters işlem, `version` denetimli; değişmiş kayıt atlanır ve raporlanır. Yalnız `write` riskli değişiklikler geri alınır.
- **Yapılacaklar:** test: checkpoint'e dönüşte taslak silinir, değişmiş kayıt atlanır.

### `agent_artifacts`
- **Sütunlar:** `id integer PK`; `session_id integer FK → agent_sessions.id`; `kind text` (`product_draft · promotion · page · image · report · csv`; karar: belgedeki türlerin kodları); `record_ref text?` (public_id); `r2_key text?`; `generated_by text?` (`gemini:<model>`; karar: §4.1 "kayıtta saklanır" ajan çıktısına aittir, genel `media` tablosu ajan bilmez); `created_at integer`.
- **Anahtar ve indeksler:** `(session_id, created_at)`.
- **Yapılacaklar:** sorgu `listArtifacts.ts`.

### `agent_missions`
- **Kaynak:** §7 ("görev durumu `agent_missions` tablosundadır ve mağaza başınadır").
- **Sütunlar:** `mission_key text` PK (karar: görevler kodda sabit liste, `notification_types` deseni); `status text` (`todo · done · dismissed`; karar: "sonra" seçeneği `dismissed`); `completed_at integer?`; `checked_at integer?` (son veri denetimi); `updated_at integer`.
- **Anahtar ve indeksler:** PK `mission_key`.
- **Kurallar:** tamamlanma verinin kendisinden denetlenir; modelin "bitti" demesi sayılmaz. Klasik panodaki "kurulumu tamamla" ile aynı veri.

### `agent_usage`
- **Sütunlar:** `day integer` (UTC gün başı unix ms); `model text`; `prompt_tokens integer`; `cache_hit_tokens integer`; `cache_miss_tokens integer`; `completion_tokens integer`; `images integer`; `cost_micros integer` (karar: `agent_sessions.total_cost_micros` ile aynı birim); `updated_at integer`.
- **Anahtar ve indeksler:** PK `(day, model)`.
- **Kurallar:** günlük kota sunucuda sayılır; aşımda builder salt okunur. Sayaç `INSERT ... ON CONFLICT DO UPDATE`. Kullanıcı başına sınır tablo değil, hız sınırı binding'idir (karar: `01` "hız sınırı tablo değildir").

---

# F. Admin

### `admin_layouts`
- **Sahip:** `packages/core/src/features/admin-prefs` (karar: `00-genel.md` 0027 `admin-prefs.ts`); şema `packages/db/src/schema/admin-prefs.ts`.
- **Kaynak:** `07-istemciler/06-admin-genisletme.md` §2.7.
- **Sütunlar:** `id integer PK` (karar: iki kısmi benzersiz indeks bileşik PK'ye izin vermez); `scope text` (`store · user`); `admin_user_id integer FK → admin_users.id?` (`scope='user'` iken dolu); `page_id text` (menü ve üst çubuk sırası için özel değer `_shell`; karar: tek çözümleme yolu); `config text JSON`; `version integer`; `updated_at integer`.
- **Anahtar ve indeksler:** kısmi benzersiz `(page_id) WHERE scope='store'` ve `(admin_user_id, page_id) WHERE scope='user'`; `(admin_user_id)`.
- **Kurallar:** eşzamanlı yazma `version` ile. Mağaza varsayılanı `admin_layout:manage` ister ve `audit_log`'a düşer; kişisel değişiklik düşmez. Çözümleme: kişisel → mağaza → kod varsayılanı.
- **İlişkiler:** `admin_users`.
- **Yapılacaklar:** sorgular `getLayoutsForUser.ts`, `saveLayout.ts` (koşullu); yarış testi: eşzamanlı iki kaydetme.

### `admin_user_prefs`
- **Sahip:** `features/admin-prefs`; şema `admin-prefs.ts`.
- **Kaynak:** `06-admin-genisletme.md` §2.3 (`useWidgetConfig()`); `07-ui-kutuphanesi.md` §2.1 (DataTable kayıtlı görünümleri).
- **Sütunlar:** `admin_user_id integer FK → admin_users.id`; `key text` (`widget:<id>` · `table:<id>`; karar: DataTable kayıtlı görünümleri de burada, ayrı tablo açılmaz); `value text JSON` (anahtar başına 16 KB üst sınır; karar: metadata sınırıyla aynı); `updated_at integer`.
- **Anahtar ve indeksler:** PK `(admin_user_id, key)`.
- **Kurallar:** `admin_users.ui_mode` yerinde kalır (karar: oturum paketinde her istekte okunan tek alan; tercih tablosu yalnız ilgili sayfada yüklenir).

---

# G. Çekirdek entegrasyon tabloları

### `external_refs` (tanım `01-cekirdek-isletme.md`'de; buradaki ek sütun ihtiyacı)
Karar 3: tek tablo, çekirdek; bu dosyada ikinci tablo tanımlanmaz. `10-tak-calistir-apps/02-erp.md` §4 madde 1, §5, §7.1 ve `04-genisletme/04-ozel-alanlar-ve-metadata.md` §3'ün `01`'deki tabloya ek ihtiyacı:

| ihtiyaç | öneri (01 sahibine) | kaynak |
|---|---|---|
| bağlantı sütunu ERP'de zorunlu | `connection text not null default ''` (karar: `01`'deki NULL benzersizlik sorununu da kapatır; ad `01`'deki `connection` kalır) | ERP §4 "`bağlantı_id`" |
| eşleme durumu | `state text not null` `matched · unmatched · inactive` (karar: ERP §11 "eşleşenler, eşleşmeyenler, pasifleşenler") | ERP §4, §5 |
| son eşleşme zamanı | `last_matched_at integer` | ERP §4 |
| kaynak uygulama kimliğiyle önekli | `source` değeri app kimliği (`openmers.erp`); yazma sorgusu `source = <çağıran app>` süzgeci taşır | ERP §4 |
| varlık türleri | ürün, varyant, kategori/koleksiyon, müşteri, sipariş, depo/konum | ERP §4 |

Test (01'e): başka uygulamanın kaynağına yazma reddi; `metadata` bunun yerine kullanılmaz.

### `invoices`
- **Sahip:** çekirdek `packages/core/src/features/invoices`; şema `packages/db/src/schema/invoices.ts` (0022). Türkiye'ye özgü kısım `packages/modules/e-fatura` (`bia_efatura_*`, bölüm L).
- **Kaynak:** `09-built-in-apps/01-e-fatura.md` §1, §3, §4, §5, §8; `00-genel.md` karar 6, 7.
- **Sütunlar:** (karar 6: pazardan bağımsız; port `issue()` dönüşündeki genel alanlar çekirdekte)

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `inv_`; sağlayıcı idempotency anahtarı (§4) |
| `order_id` | integer FK → orders.id | hayır | |
| `refund_id` | integer FK → refunds.id | evet | iade belgesini doğuran iade (karar: §5 "çekirdek `type = return` kaydını ve ilişkiyi tutar") |
| `kind` | text | hayır | `invoice · credit_note` (karar 6; belgedeki `type` `sale · return` bu sütuna birleşti, `e_invoice · e_archive` modüle gitti) |
| `state` | text | hayır | `pending · issuing · issued · failed · unknown · cancelled` |
| `number` | text | evet | sağlayıcıdan gelir; mağaza üretmez |
| `provider` | text | hayır | `InvoiceProvider.id` (port kimliği: built-in app ya da ERP app; karar: genel port alanı, entegratör kimliği modülde) |
| `external_id` | text | evet | sağlayıcının belge kimliği |
| `currency` | text(3) | hayır | |
| `subtotal_net` | integer | hayır | (karar: `orders` sütun adlarıyla aynı; kuruş eşitliği sözleşme testi) |
| `tax_total` | integer | hayır | |
| `total_gross` | integer | hayır | |
| `related_invoice_id` | integer FK → invoices.id | evet | `credit_note` için asıl fatura |
| `snapshot` | text JSON | hayır | alıcı, satırlar, vergi dökümü |
| `pdf_url` | text | evet | (karar: port dönüşü `pdfUrl?`) |
| `last_error` | text | evet | (karar: §4 "kalıcı hata `failed`, admin'e düşer"; neden gösterilir) |
| `issued_at` | integer | evet | |
| `created_at`, `updated_at` | integer | hayır | |

- **Fatura kesim son günü** çekirdek sütun değildir (karar 7): e-fatura modülü `legal_policy` `invoice.*` ayarından hesaplar ve `bia_efatura_deadlines`'ta tutar. Belgedeki `invoices.due_at` buraya taşındı.
- **Anahtar ve indeksler:** benzersiz `public_id`; `(order_id)`; `(state, created_at)` "fatura bekleyenler / hatalılar / belirsizler" listeleri; kısmi benzersiz `(provider, external_id) WHERE external_id IS NOT NULL`.
- **Kurallar:** `pending` satırı tetikleyen olayla aynı `atomic()`. Durum geçişleri koşullu (`WHERE state=?`), ayrı `version` yok (karar: tek yazıcı durum makinesi). Belirsiz sonuç (`unknown`) körlemesine tekrar denenmez, önce `findByReference`. Kesilmiş resmî fatura değişmez. Toplamlar siparişle kuruşu kuruşuna eşit (aynı yuvarlama yardımcısı). Snapshot kişisel veri taşır; yasal saklama süresince tutulur, anonimleştirmede silinmez. Kanal süzgeci sipariş üzerinden join'le (karar: fatura sipariş başına, kanal sütunu tekrar olur).
- **İlişkiler:** `orders`, `refunds`, kendi kendine (`related_invoice_id`), `bia_efatura_invoices`.
- **Yapılacaklar:** sorgular `features/invoices/queries/createPending.ts`, `markIssued.ts` (koşullu `WHERE state='issuing'`), `listByState.ts`; yarış testi: zaman aşımı sonrası tek fatura; test: çok oranlı/indirimli/kargolu sepette kuruş eşitliği.

### `customer_payment_methods`
- **Sahip:** çekirdek ödeme (`packages/core/src/features/payments`); şema `packages/db/src/schema/customers.ts` (karar: `00-genel.md` 0011 bu tabloyu müşteri dosyasına koyuyor).
- **Kaynak:** `09-built-in-apps/02-abonelik.md` §2.2, §11; `05-ticaret/06-odeme-ve-iade.md` §8.
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `cpm_` (karar: müşteri hesabında yöntem seçme/silme) |
| `customer_id` | integer FK → customers.id | hayır | |
| `handler` | text | hayır | `PaymentHandler` kodu (karar: belirteç işleyiciye özgü) |
| `provider_token` | text | hayır | sağlayıcı belirteci; kart numarası değil |
| `brand` | text | evet | |
| `last4` | text | evet | |
| `exp_month`, `exp_year` | integer | evet | |
| `is_default` | integer 0/1 | hayır | (karar: abonelikte yeni yöntem seçimi; müşteri başına bir, uygulama kuralı) |
| `created_at`, `updated_at` | integer | hayır | |
| `deleted_at` | integer | evet | (karar: yumuşak silme; aboneliğin `method_id` başvurusu kırılmaz, belirteç silmede boşaltılır) |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(customer_id)`; `(exp_year, exp_month)` süresi dolacak kart uyarısı işi (karar: §6 "son kullanma ayı uyarısı").
- **Kurallar:** kart numarası saklanmaz (PCI). Belirteç yalnız sahibine ve `payments:handle`/`subscriptions:*` izinliye; günlüklere ve ajan araçlarına girmez. Müşteri anonimleştirilince satır silinir ya da `provider_token` boşaltılıp `deleted_at` yazılır (karar: sağlayıcıdaki belirteç de iptal edilir).
- **İlişkiler:** `customers`, `bia_subscriptions_subscriptions.method_id`.
- **Yapılacaklar:** sızıntı testi: belirteç hiçbir API/ajan çıktısında yok. `02-ticaret.md` bu tabloyu yalnız adla anıyor; tanım burada.

---

# H. Built-in: favori listesi (`@openmers/builtin-wishlist`)

Sahip: `packages/modules/wishlist`; şema `packages/modules/wishlist/src/schema/lists.ts`. Kaynak: `09-built-in-apps/03-favori-listesi.md` §1, §2, §4.

### `bia_wishlist_lists`
- **Sütunlar:** `id integer PK`; `customer_id integer FK → customers.id` (benzersiz; v1 müşteri başına tek liste); `share_token_hash text?`; `share_expires_at integer?`; `last_price_alert_at integer?` (karar: "günde en çok 1 e-posta/müşteri" sayacı; liste müşteri başına tek olduğundan burada); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(customer_id)`; benzersiz `(share_token_hash)` (karar: paylaşım bağlantısı tek sorguda çözülür).
- **Kurallar:** liste ilk eklemede oluşur. Jeton 32 bayt, yalnız özeti saklanır, varsayılan 30 gün, iptal özeti siler. Fiyat bildirimi `UPDATE ... SET last_price_alert_at=now WHERE id=? AND (last_price_alert_at IS NULL OR last_price_alert_at < now-86400000)` koşullu. Müşteri anonimleştirilince silinir; veri indirmeye girer.
- **Yapılacaklar:** test: jeton iptali ve süre dolumu; app listeden çıkınca tabloların durması; günde tek bildirim.

### `bia_wishlist_items`
- **Sütunlar:** `list_id integer FK → bia_wishlist_lists.id`; `product_id integer FK → products.id`; `variant_id integer FK → product_variants.id?`; `quantity integer` (1–99); `price_at_add integer?`; `currency text(3)?` (`price_at_add` ile birlikte dolu); `added_at integer`; `updated_at integer` (karar: adet değişir).
- **Anahtar ve indeksler:** iki kısmi benzersiz indeks `(list_id, product_id) WHERE variant_id IS NULL` ve `(list_id, product_id, variant_id) WHERE variant_id IS NOT NULL` (karar: SQLite NULL'ları ayrı sayar; sentinel 0 FK'yi bozar). PK yok, `rowid` (karar: satır her zaman bu anahtarla adreslenir). `(product_id)` "kaç listede" sayacı ve fiyat düşüşü işi.
- **Kurallar:** 200 öğe sınırı: `INSERT ... SELECT ... WHERE (SELECT count(*) FROM bia_wishlist_items WHERE list_id=?) < 200` (karar: sayım ve ekleme tek ifade). Misafir birleşiminde büyük adet kalır. Fiyat düşüşü bildirimi pazarlama izni gerektirir.
- **Yapılacaklar:** sorgu `listItems.ts` (`catalog_index` ile tek join); test: misafir birleşimi, sınır, bildirim sıklığı.

---

# I. Built-in: ürün yorumları (`@openmers/builtin-reviews`)

Sahip: `packages/modules/reviews`; şema `packages/modules/reviews/src/schema/*.ts`. Kaynak: `09-built-in-apps/04-urun-yorumlari.md`.

### `bia_reviews_reviews`
- **Sütunlar:** `id integer PK`; `public_id text` `rev_` (karar: vitrin API'si ve moderasyon uçları); `product_id integer FK → products.id`; `variant_id integer FK?`; `customer_id integer FK → customers.id?`; `order_line_id integer FK → order_lines.id?`; `rating integer` (1–5); `title text?`; `body text` (≤ 5000); `display_name text`; `status text` (`pending · approved · flagged · rejected`); `verified_purchase integer 0/1`; `locale text`; `source text` (`storefront · import · invite`); `helpful_count integer`; `created_at integer`; `edited_at integer?`; `updated_at integer` (karar: moderasyon durumu değişir).
- **Anahtar ve indeksler:** benzersiz `public_id`; kısmi benzersiz `(customer_id, product_id) WHERE customer_id IS NOT NULL`; `(product_id, status, created_at)`, `(product_id, status, rating)`, `(product_id, status, helpful_count)` vitrin sıralamaları; `(status, created_at)` moderasyon kuyruğu. Vitrin sorgusu: sorgu planı testi zorunlu.
- **Kurallar:** varsayılan `pending`; düzenleme yeniden onaya girer (ayar). HTML temizlenir. Hız sınırı IP + oturum. Anonimleştirmede yorum kalır, `display_name`="Anonim", `customer_id` NULL.
- **İlişkiler:** `products`, `product_variants`, `customers`, `order_lines`, `bia_reviews_responses`, `bia_reviews_media`.
- **Yapılacaklar:** sorgular `listApproved.ts`, `createReview.ts`, `moderate.ts`; test: tek yorum, doğrulanmış satın alma, spam sınırı, anonimleştirme.

### `bia_reviews_responses`
- **Sütunlar:** `review_id integer FK → bia_reviews_reviews.id` (PK); `body text`; `author_id integer FK → admin_users.id`; `created_at`, `updated_at` (karar: yanıt düzenlenebilir).
- **Kurallar:** tek yanıt, düzenlenebilir. Ajan `reviews.reply` `external` riski (onay kartı).

### `bia_reviews_media`
- **Sütunlar:** `review_id integer FK → bia_reviews_reviews.id`; `asset_id integer FK → media.id`; `position integer` (0–4).
- **Anahtar ve indeksler:** PK `(review_id, position)` (karar: en çok 5 görsel sırası anahtarla sınırlı).
- **Kurallar:** en çok 5 görsel; boyut/tür çekirdek `media` sınırları (karar: varsayılan 10 MB, SVG yok).

### `bia_reviews_stats`
- **Sütunlar:** `product_id integer FK → products.id` (PK); `count integer`; `sum integer`; `histogram text JSON` (1..5); `updated_at integer`.
- **Kurallar:** onay/ret/silmede yeniden hesaplanır (artırma değil, idempotent) ve `reindex(product_id)` yazılır; `indexExtend` ile `catalog_index`/`product_view`'a girer.
- **Yapılacaklar:** test: çift olayda istatistik doğru.

### `bia_reviews_requests`
- **Sütunlar:** `id integer PK`; `order_id integer FK → orders.id`; `product_id integer FK → products.id` (karar: ürün başına tek istek kuralı); `token_hash text` (karar: imzalı tek kullanımlık bağlantı, yalnız özet); `send_at integer` (teslim + N gün); `sent_at integer?`; `state text` (`scheduled · sent · used · expired · cancelled`; karar: zamanlanmış gönderim, kullanım ve iptal (izin geri çekildi)); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(order_id, product_id)`; benzersiz `(token_hash)`; `(state, send_at)` gönderim işi.
- **Kurallar:** teslimden N gün sonra, pazarlama/izin ayarına bağlı. Bağlantı kullanılınca `used` (koşullu).

---

# J. Built-in: İYS (`@openmers/builtin-iys`)

Sahip: `packages/modules/iys`; şema `packages/modules/iys/src/schema/*.ts`. Kaynak: `09-built-in-apps/05-iys.md` §2, §3, §4. Resmî İYS belgesi okunmadı; alan adları kesin değil.

### `bia_iys_settings` → tablo değil
`iys_code`, `brand_code`, `recipient_default` (`BIREYSEL`), kanal eşlemesi built-in app ayar deposunda (`settings`, `scope='built_in_app'`) Zod şemasıyla tutulur (karar: `04-genisletme/07-built-in-app-gelistirme.md` §14 genel kuralı; tablo aynı veriyi ikinci kez tutardı). Kimlik bilgileri kasada.

### `bia_iys_sync`
- **Sütunlar:** `id integer PK`; `consent_id integer FK → consents.id`; `direction text` (`push · pull`); `state text` (`pending · sent · confirmed · failed · conflict`); `attempts integer`; `last_error text?`; `external_ref text?`; `next_attempt_at integer?` (karar: §3 "artan beklemeyle yeniden dener"); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(consent_id, direction)`; `(state, next_attempt_at)`.
- **Kurallar:** `pending` satırı `consents` yazımıyla aynı `atomic()`. İdempotency anahtarı `consents.id`. İYS'deki ret her zaman kazanır. Telefon/e-posta günlükte maskelenir.
- **Yapılacaklar:** test listesi belgede §6.

### `bia_iys_cursor`
- **Sütunlar:** `id integer PK` (tek satır, `CHECK (id = 1)`; karar: tek satırlık durum); `last_pulled_at integer?`; `page_cursor text?`; `updated_at integer`.
- **Kurallar:** çekme işi varsayılan 15 dakika. Ayar deposunda değil (karar: her çekmede yazılır; ayar yazımı `settings_version`'ı artırıp önbelleği boşaltırdı).

---

# K. Built-in: abonelik (`@openmers/builtin-subscriptions`)

Sahip: `packages/modules/subscriptions`; şema `packages/modules/subscriptions/src/schema/`. Kaynak: `09-built-in-apps/02-abonelik.md` §3–§11.

**Ad kuralı:** belge tabloları öneksiz yazıyor; karar 5 gereği `bia_subscriptions_*`. Başlık "belgedeki ad → katalog adı". `customer_payment_methods` çekirdekte (bölüm G). `currency_rates` çekirdek tablodur (karar 10; `02` grubu, `pricing` sahibi); modül yalnız okur, burada tanımlanmaz.

### `subscription_plans` → `bia_subscriptions_plans`
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `spl_` (karar: ürün sayfası plan seçici ve admin uçları) |
| `channel_id` | integer FK → channels.id | hayır | |
| `name` | text | hayır | |
| `status` | text | hayır | `draft · active · archived` (karar: ajan taslak oluşturur, yayın elle) |
| `interval` | text | hayır | `day · week · month · year` |
| `every` | integer | hayır | |
| `trial_days` | integer | evet | |
| `discount_kind` | text | evet | `percent · fixed` |
| `discount_value` | integer | evet | yüzde baz puan, sabit küçük birim (karar: oran kuralı) |
| `discount_currency` | text(3) | evet | `fixed` için |
| `discount_cycles` | integer | evet | boş = süresiz |
| `price_list_id` | integer FK → price_lists.id | evet | |
| `price_policy` | text | hayır | `lock · follow_catalog`; varsayılan `lock` |
| `approval_mode` | text | hayır | `auto · manual` (karar: §4 "elle onay kipi"; `manual` cycle'ı `awaiting_approval`'a alır) |
| `delivery_every` | integer | evet | boşsa faturalamayla aynı |
| `delivery_rules` | text JSON | evet | `cutoff`, teslimat aralığı (karar: kargo belgesindeki ortak kuralların plan parametreleri, birlikte okunur) |
| `customer_rules` | text JSON | evet | vazgeçme/duraklatma kuralları (en az dönem, en uzun duraklatma) |
| `dunning_schedule` | text JSON | evet | gün listesi + saat + en çok deneme; boşsa kanal ayarı |
| `dunning_discount` | text JSON | evet | yüzde + tavan; boşsa kapalı (karar: §6.1 "plan ayarıyla açılır") |
| `version` | integer | hayır | (karar: admin ve ajan aynı planı düzenleyebilir) |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(channel_id, status)`.
- **Kurallar:** `provider` kipinde işleyici desteklemiyorsa `follow_catalog` seçilemez.

### `plan_targets` → `bia_subscriptions_plan_targets`
- **Sütunlar:** `id integer PK` (karar: ürün ya da varyant hedefi, NULL'lı bileşik anahtar benzersiz olmaz); `plan_id integer FK → bia_subscriptions_plans.id`; `product_id integer FK → products.id?`; `variant_id integer FK → product_variants.id?` (ikisinden biri dolu, `CHECK`); `price integer?`; `currency text(3)?` (`price` ile birlikte).
- **Anahtar ve indeksler:** `(product_id)` ürün sayfasında `product.subscriptionPlans` (okuma modeline `indexExtend`; vitrin sorgusuysa sorgu planı testi); kısmi benzersiz `(plan_id, product_id) WHERE variant_id IS NULL`, `(plan_id, variant_id) WHERE variant_id IS NOT NULL`.

### `subscriptions` → `bia_subscriptions_subscriptions`
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `sub_` |
| `channel_id` | integer FK → channels.id | hayır | |
| `customer_id` | integer FK → customers.id | hayır | |
| `plan_id` | integer FK → bia_subscriptions_plans.id | hayır | |
| `state` | text | hayır | `trialing · active · paused · past_due · cancelled · expired` |
| `billing` | text | hayır | `provider · self` |
| `handler` | text | hayır | |
| `method_id` | integer FK → customer_payment_methods.id | evet | `provider` kipinde boş olabilir (karar: yöntem sağlayıcıda) |
| `currency` | text(3) | hayır | (karar: abonelik tek para biriminde; cycle tutarı buna göre) |
| `shipping_address` | text JSON | evet | anlık görüntü; dijitalde boş |
| `next_cycle_at` | integer | evet | `cancelled`/`expired`'da boş |
| `paused_until` | integer | evet | |
| `cancel_reason` | text | evet | `bia_subscriptions_cancel_reasons.code` (karar: kod saklanır, rapor neden koduna göre gruplar) |
| `cancel_note` | text | evet | müşterinin serbest açıklaması (karar: "Diğer" nedeni) |
| `cancel_at_period_end` | integer 0/1 | hayır | (karar: Polar `cancel_at_period_end` ve dönem sonu vazgeçme) |
| `terms_version` | text | evet | otomatik yenileme onay metni sürümü (karar: §7 tüketici hakları kanıtı) |
| `dunning_discount_used` | integer 0/1 | hayır | (karar: §6.1 "yaşam boyu en çok bir kez") |
| `version` | integer | hayır | |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `public_id`; `(customer_id)`; `(state, next_cycle_at)`.
- **Kurallar:** admin/müşteri değişiklikleri `WHERE version=?`. Müşteri uçları sahiplik denetler (başkasının aboneliği 404). Built-in app kapalıyken `subscriptions.*` 404; bekleyen yenileme varken kapatma reddi.

### `subscription_items` → `bia_subscriptions_items`
- **Sütunlar:** `id integer PK` (karar: swap ve adet değişikliği satırı adresler); `subscription_id integer FK`; `variant_id integer FK → product_variants.id`; anlık görüntü `name text`, `sku text`, `unit_price integer`, `tax_class text` (karar: `tax_categories` kodunun kopyası); `quantity integer`; `bundle_group_id integer FK → bia_subscriptions_bundle_groups.id?`; `created_at`, `updated_at`. Para birimi aboneliktedir.
- **Anahtar ve indeksler:** `(subscription_id)`.

### `subscription_cycles` → `bia_subscriptions_cycles`
- **Sütunlar:** `id integer PK`; `public_id text` `cyc_` (tahsilat idempotency anahtarı); `subscription_id integer FK`; `n integer`; `due_at integer`; `state text` (`scheduled · claimed · charging · charged · ordered · fulfilled · awaiting_approval · skipped · needs_customer · retry_scheduled · failed_final · unknown_charge`); `amount integer?` (adım 3'te hesaplanır); `currency text(3)` (karar: abonelikten kopya); `attempt_count integer`; `claim_token text?`; `claimed_at integer?` (karar: `charging`/`claimed`'de takılı cycle'ı kurtarma işi bulur); `created_at`, `updated_at`.
- **Sipariş bağı:** belgedeki `order_id?` sütunu yok; tek kaynak `bia_subscriptions_cycle_orders` (karar: §5.1 "bire-bir varsayım yok"; iki yerde tutmak tutarsızlık doğurur, çelişki 8 kapandı).
- **Anahtar ve indeksler:** benzersiz `public_id`; benzersiz `(subscription_id, n)`; `(state, due_at)` (belgede).
- **Kurallar:** claim `UPDATE ... SET state='claimed', claim_token=?, claimed_at=? WHERE id=? AND state='scheduled'`; tahsilattan önce `charging` yazılır; sipariş + köprü satırı + sonraki cycle aynı `atomic()`. Belirsiz tahsilat yeniden denenmez (`fetchChargeByKey`). Cron dakikalık, `LIMIT N`.
- **Yapılacaklar:** yarış testi: aynı cycle iki kez → tek sipariş, tek tahsilat; test: tahsilat sonrası süreç ölümü.

### `dunning_cases` → `bia_subscriptions_dunning_cases`
- **Sütunlar:** `id integer PK`; `public_id text` `dun_` (karar: admin "elle kurtar / kurtarılamadı" uçları); `subscription_id integer FK`; `cycle_id integer FK → bia_subscriptions_cycles.id`; `state text` (`open · retry_scheduled · retrying · awaiting_manual_resolution · recovered · unrecovered`; karar: belgede geçen `recovered`/`unrecovered` ile uyumlu Reorder kümesi); `decline_class text` (`soft · hard · fraud · needs_auth`); `attempts integer`; `next_attempt_at integer?`; `discount_applied integer 0/1` (karar: §6.1 kaç kez kullanıldığı raporlanır); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `public_id`; kısmi benzersiz `(subscription_id) WHERE state NOT IN ('recovered','unrecovered')` (belgede); `(state, next_attempt_at)`.
- **Yapılacaklar:** test: aynı aboneliğe iki açık kayıt açılamaz.

### `subscription_events` → `bia_subscriptions_events`
- **Sütunlar:** `id integer PK`; `subscription_id integer FK`; `actor_kind text` (`operator · customer · system`); `actor_id text?` (`admin:<public_id>` · `cus_…`; karar: aktör dizesi); `action text` (`created · paused · resumed · skipped · cancelled · renewal_notice_sent · retention_offer_accepted …`); `reason text?`; `data text JSON?`; `created_at integer` (karar: belgedeki "kim/ne/neden" alanları).
- **Anahtar ve indeksler:** `(subscription_id, created_at)`.
- **Kurallar:** salt ekleme; yenileme öncesi bildirim ve kabul edilen elde tutma teklifi buraya yazılır.

### `retention_offers` → `bia_subscriptions_retention_offers`
- **Kaynak:** §3 ("vazgeçme akışının teklifleri"), §7 ("neden seç → elde tutma teklifi (indirim, duraklat, sıklık düşür) → onay"), §8 (admin yönetir), §2.3 (Polar `discount_id`).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `public_id` | text | hayır | `rto_` (müşteri akışında seçilen teklif) |
| `channel_id` | integer FK → channels.id | hayır | |
| `plan_id` | integer FK → bia_subscriptions_plans.id | evet | boş = kanalın tüm planları |
| `kind` | text | hayır | `discount · pause · reduce_frequency` (§7) |
| `discount_kind` | text | evet | `percent · fixed` (`kind='discount'`) |
| `discount_value` | integer | evet | yüzde baz puan, sabit küçük birim |
| `discount_currency` | text(3) | evet | `fixed` için |
| `discount_cycles` | integer | evet | kaç dönem |
| `pause_max_cycles` | integer | evet | `kind='pause'` en uzun süre |
| `frequency_every` | integer | evet | `kind='reduce_frequency'` önerilen yeni `every` |
| `reason_codes` | text JSON | evet | hangi nedenlerde gösterilir; boş = hepsi |
| `position` | integer | hayır | gösterim sırası |
| `active` | integer 0/1 | hayır | |
| `created_at`, `updated_at` | integer | hayır | |

- (karar: tüm sütunlar §7'deki üç teklif türünün parametrelerinden; müşteriye gösterilen metin tür ve değerden tema i18n'i ile üretilir, serbest metin yok, bu yüzden çeviri tablosu yok)
- **Anahtar ve indeksler:** benzersiz `public_id`; `(channel_id, active, position)`.
- **Kurallar:** `provider` kipinde `discount` yalnız işleyici destekliyorsa (Polar `discount_id`) sunulur. İndirim promosyon motorunda aboneliğe bağlı tek kullanımlık kayıt olarak uygulanır (dunning indirimiyle aynı yol). Teklif abonelik başına bir kez kabul edilir (karar: kötüye kullanım, `bia_subscriptions_events`'te `retention_offer_accepted` denetlenir).

### `cancel_reasons` → `bia_subscriptions_cancel_reasons`
- **Kaynak:** §3 ("neden listesi"), §7, §8, §9 (gönüllü churn ayrımı); Polar `customer_cancellation_reason`.
- **Sütunlar:** `id integer PK`; `channel_id integer FK → channels.id`; `code text` (kanal içinde benzersiz, `subscriptions.cancel_reason`'a yazılır); `requires_note integer 0/1` ("Diğer" gibi açıklama isteyen neden); `position integer`; `active integer 0/1`; `created_at`, `updated_at`. (karar: müşteri yalnız kod seçer; etiket çeviri tablosunda, ortak kural `<varlık>_translations`)
- **Anahtar ve indeksler:** benzersiz `(channel_id, code)`; `(channel_id, active, position)`.
- **Kurallar:** kod silinmez, `active=0` yapılır (karar: geçmiş aboneliklerin raporu kodu çözmeye devam eder).

### `bia_subscriptions_cancel_reason_translations`
- **Kaynak:** ortak kural "çevrilebilir alanlar `<varlık>_translations`".
- **Sütunlar:** `reason_id integer FK → bia_subscriptions_cancel_reasons.id`; `locale text`; `label text`; `updated_at integer`.
- **Anahtar ve indeksler:** PK `(reason_id, locale)`.

### `subscription_daily_stats` → `bia_subscriptions_daily_stats`
- **Sütunlar:** `day integer` (UTC gün başı); `channel_id integer FK`; `plan_id integer FK`; `currency text(3)`; `active_count`, `new_count`, `cancelled_count` `integer` (karar: belgedeki "aktif, yeni, vazgeçen"; sayaç olduğu ad ile belli); `mrr integer`; `mrr_reporting integer?` (raporlama para biriminde, özet anındaki kurla; kur yoksa boş); `failed_charges integer`; `recovered integer`; `updated_at integer`.
- **Anahtar ve indeksler:** PK `(day, channel_id, plan_id, currency)` (karar: planın abonelikleri farklı para biriminde olabilir).
- **Kurallar:** sipariş tablosunu taramaz; geçmiş satır sonraki kur değişiminden etkilenmez. Kur çekirdek `currency_rates`'ten okunur.

### `plan_provider_refs` → `bia_subscriptions_plan_provider_refs`
- **Sütunlar:** `id integer PK` (karar: NULL'lı bileşik anahtar); `plan_id integer FK`; `handler text`; `variant_id integer FK?` (karar: Polar'da plan × varyant = ürün); `provider_product_ref text`; `provider_price_ref text?`; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** kısmi benzersiz `(plan_id, handler) WHERE variant_id IS NULL`, `(plan_id, handler, variant_id) WHERE variant_id IS NOT NULL`.

### `subscription_provider_refs` → `bia_subscriptions_provider_refs`
- **Sütunlar:** `subscription_id integer FK` (PK, karar: abonelik başına tek sağlayıcı aboneliği); `handler text`; `provider_subscription_ref text`; `last_webhook_seq integer?`; `updated_at integer`.
- **Anahtar ve indeksler:** benzersiz `(handler, provider_subscription_ref)`.
- **Kurallar:** webhook idempotency anahtarı (`webhook-id` + sağlayıcı sipariş kimliği) çekirdek `idempotency_keys` tablosunda `subscriptions.webhook` kapsamıyla tutulur (karar: ayrı tablo açılmaz, `01`'deki genel mekanizma). Durum her zaman `fetch` ile teyit edilir; `last_webhook_seq`'ten eski olay yok sayılır.

### `subscription_deliveries` → `bia_subscriptions_deliveries`
- **Sütunlar:** `id integer PK`; `public_id text` `sdl_` (karar: müşteri teslimatı atlar/erteler); `subscription_id integer FK`; `cycle_id integer FK`; `ship_on integer`; `slot text?`; `order_id integer FK → orders.id?`; `state text` (`scheduled · ordered · skipped · postponed · cancelled`; karar: §5.1 üretim, sipariş oluşturma, atlama, erteleme); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `public_id`; `(state, ship_on)` teslimat siparişi oluşturma işi (`ship_on - lead_time`).
- **Kurallar:** sipariş oluşturma koşullu `WHERE state='scheduled'`; stok bu anda koşullu ayrılır; sonraki teslimat siparişleri 0 tutarlı, "ön ödemeli". Atlama/erteleme cutoff'a kadar.

### `subscription_cycle_orders` → `bia_subscriptions_cycle_orders`
- **Kaynak:** §5.1.
- **Sütunlar:** `cycle_id integer FK → bia_subscriptions_cycles.id`; `order_id integer FK → orders.id`; `is_charge_order integer 0/1` (karar: ücret cycle'ın ilk siparişine bağlı, gelir bir kez sayılır); `created_at integer`.
- **Anahtar ve indeksler:** PK `(cycle_id, order_id)`; benzersiz `(order_id)` (karar: bir sipariş tek cycle'a ait); kısmi benzersiz `(cycle_id) WHERE is_charge_order=1`.

### `bundle_groups` → `bia_subscriptions_bundle_groups`
- **Sütunlar:** `id integer PK`; `plan_id integer FK`; `name text`; `pick_count integer` (seçilecek adet); `max_same integer?` (aynı üründen en çok); `allowed text JSON` (izinli ürün/varyant kimlikleri; karar: yalnız seçim doğrulamasında birlikte okunur); `box_price integer`; `currency text(3)`; `selection_closes_days integer` (karar: §5.2 "pencere N gün önce kapanır"); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** `(plan_id)`.

### `bundle_selections` → `bia_subscriptions_bundle_selections`
- **Sütunlar:** `id integer PK`; `subscription_id integer FK`; `bundle_group_id integer FK`; `for_date integer` (dönem/teslimat tarihi, UTC gün başı; karar: seçim penceresinde teslimat satırı henüz üretilmemiş olabilir, bu yüzden `delivery_id` değil tarih); `selected text JSON` (varyant + adet listesi); `locked_at integer?` (pencere kapanınca); `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(subscription_id, bundle_group_id, for_date)`.
- **Kurallar:** `locked_at` doluyken değişiklik reddi (koşullu `WHERE locked_at IS NULL`). Seçilmezse son seçim kopyalanır.

### `subscription_imports` → `bia_subscriptions_imports`
- **Sütunlar:** `id integer PK`; `source text` (`stripe`); `source_id text`; `subscription_id integer FK?`; `state text` (`pending · imported · skipped · failed`; karar: §5.3 kuru çalıştırma ve hata raporu); `report text JSON?`; `created_at`, `updated_at`.
- **Anahtar ve indeksler:** benzersiz `(source, source_id)`.

**Abonelik ortak yapılacaklar:**
- şema dosyaları grup başına; migration'lar app'in kendi numara dizisinde
- sorgular `packages/modules/subscriptions/src/services/*` + `queries/`
- yarış testleri: cycle claim, dunning tek açık kayıt, webhook çift gelişi, teslimat siparişi tekilliği
- tohum: bir aylık plan + bir aktif abonelik (sahte işleyici) + varsayılan vazgeçme nedenleri

---

# L. Built-in: e-fatura (`@openmers/builtin-e-fatura`)

Sahip: `packages/modules/e-fatura`; şema `packages/modules/e-fatura/src/schema/*.ts`. Kaynak: `09-built-in-apps/01-e-fatura.md` §1, §2, §3, §4, §6, §7; `10-tak-calistir-apps/02-erp.md` §7.2; `00-genel.md` karar 6, 7. Çekirdek `invoices` satırını yalnız çekirdek yazar; modül `InvoiceProvider` portunu doldurur ve Türkiye'ye özgü veriyi kendi tablolarına yazar.

### `bia_efatura_invoices`
- **Kaynak:** §1 (`issue()` dönüşündeki `kind`), §2 (belge türü), §3 (alıcı yanıtı), §4 (belirsiz sonuç).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `invoice_id` | integer FK → invoices.id | hayır | PK, çekirdek faturayla 1:1 |
| `doc_type` | text | hayır | `e_invoice · e_archive` (karar 6; çekirdek `invoices.kind`'den taşındı) |
| `scenario` | text | evet | `basic · commercial` (karar: §3 "ticari senaryoda alıcı yanıtı"; yalnız `e_invoice`) |
| `gib_status` | text | evet | sağlayıcının `fetchStatus` ile döndürdüğü GİB durum kodu, ham (karar: değer kümesi entegratöre göre değişir, çekirdek durumu `invoices.state`) |
| `recipient_response` | text | evet | `accepted · rejected` |
| `integrator` | text | hayır | entegratör kimliği (`parasut` …; karar 6 "sağlayıcı kimliği") |
| `ettn` | text | evet | GİB belge UUID'si |
| `receiver_alias` | text | evet | alıcının e-fatura posta kutusu etiketi (`lookupTaxpayer` `alias`) |
| `status_checked_at` | integer | evet | son `fetchStatus` zamanı |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** PK `invoice_id`; benzersiz `(ettn)` (kısmi, `WHERE ettn IS NOT NULL`); `(doc_type, gib_status)` operasyon listesi.
- **Kurallar:** satır, çekirdek `invoices` satırı `issuing`'e geçerken modül tarafından yazılır; `doc_type` kesimden hemen önce yenilenen mükellefiyete göre seçilir (§2). Kesilmiş belgenin `doc_type`'ı değişmez.

### `bia_efatura_parties`
- **Kaynak:** §2 ("sonuç müşteri/şirket kaydında önbelleklenir"; "vergi dairesi ve mükellefiyet gibi Türkiye'ye özgü alanları bu app kendi alanları olarak ekler"); ERP §7.2 (TC kimlik, vergi dairesi, mükellefiyet).
- **Sütunlar:** (karar 6: çekirdek yalnız `tax_id` + `tax_id_type` taşır; app çekirdek tablolara yazmadığı için önbellek ve Türkiye alanları burada)

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `party_kind` | text | hayır | `customer · company` |
| `party_id` | integer | hayır | `customers.id` ya da `companies.id` (çok biçimli, FK uygulama kuralı) |
| `tax_office` | text | evet | vergi dairesi |
| `national_id` | text | evet | TC kimlik no (bireysel); kişisel veri, maskeli |
| `is_einvoice_taxpayer` | integer 0/1 | evet | `lookupTaxpayer` sonucu; boş = sorgulanmadı |
| `alias` | text | evet | e-fatura posta kutusu etiketi |
| `checked_at` | integer | evet | son mükellefiyet sorgusu |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** benzersiz `(party_kind, party_id)`.
- **Kurallar:** checkout'ta kurumsal fatura seçilince app alanları doğrular ve yazar; çekirdek `tax_id` biçim denetimi dışında bilmez. Kesimden önce `checked_at` eskiyse yeniden sorgu (§2). Müşteri anonimleştirmesinde satır silinir; kesilmiş faturanın `snapshot`'ı yasal saklama gereği kalır.

### `bia_efatura_deadlines`
- **Kaynak:** §4 (7 gün kuralı, `invoice.deadline_basis`, `force_by_deadline`, `warn_before_days`, "süresi geçmiş" listesi ve alarm); karar 7.
- **Sütunlar:** (karar 7: fatura kesim son günü çekirdek sütun değil; tetik "gönderimde" olduğunda çekirdek `invoices` satırı henüz yoktur, bu yüzden sipariş başına)

| ad | tür | boş | açıklama |
|---|---|---|---|
| `order_id` | integer FK → orders.id | hayır | PK |
| `basis` | text | hayır | `order_and_payment · delivery` (hesap anındaki ayar) |
| `basis_at` | integer | evet | başlangıç olayının zamanı; `delivery`'de teslime kadar boş |
| `due_at` | integer | evet | `basis_at + deadline_days` (hesap anındaki `legal_policy` değeri) |
| `warned_at` | integer | evet | uyarı gönderildi |
| `invoice_id` | integer FK → invoices.id | evet | kesilen fatura; dolunca takip biter |
| `created_at`, `updated_at` | integer | hayır | |

- **Anahtar ve indeksler:** PK `order_id`; kısmi `(due_at) WHERE invoice_id IS NULL` uyarı/alarm/zorla kesim işi ve "süresi geçmiş" listesi.
- **Kurallar:** satır sipariş kesinleşince (`order.placed`/ödeme `settled` olayı) yazılır; `force_by_deadline` açıksa iş son günde faturayı tetikler. `unknown` durumdaki fatura çözülene kadar süre dolmuş sayılmaz ama alarm düşer. İade faturası bu kurala tabi değil.

---

# M. Tak-çalıştır app'lerin kendi veritabanı (mağaza D1'i değil)

`03-tak-calistir-apps.md` §6: "uygulama kendi verisini kendi veritabanında tutar". Pixel ve ERP depoda gelir (`packages/plugins/<x>`); aynı süreçte çalışsa da tabloları mağaza şemasında değildir, migration'ları app paketindedir ve mağaza migration sırasına girmez. Ayrı veritabanında olduğu için tablo öneki gerekmez (karar: ad çakışması mümkün değil). İş yaşam döngüsü adları app'in kendisinindir (ERP §9); mağaza outbox'ı `sent`/`dead` adlarını korur (karar: iki ayrı sistem, çelişki 13 kapandı). Sütun türleri ve zaman kuralı mağazayla aynıdır.

### `webhook_inbox` (ERP uygulaması)
- **Sahip:** `packages/plugins/erp`; şema app'in kendi veritabanında.
- **Kaynak:** `10-tak-calistir-apps/02-erp.md` §1a ("kalıcı inbox, sağlayıcı olay kimliği benzersiz kısıtı"), §8 ("imza doğrulanınca yazılır, sonra 200, işleme kuyruktan; HMAC + zaman damgası penceresi"), §9 (iş yaşam döngüsü, üstel bekleme + jitter, dead-letter).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `connection_id` | text | hayır | ERP bağlantısı (aynı olay kimliği iki bağlantıda çakışabilir) |
| `provider_event_id` | text | hayır | sağlayıcının olay kimliği |
| `event_type` | text | hayır | ör. stok, sipariş durumu |
| `payload` | text JSON | hayır | doğrulanmış gövde |
| `signed_at` | integer | hayır | imzadaki zaman damgası (tekrar penceresi denetimi) |
| `state` | text | hayır | `pending · processing · success · retrying · failed · dead_letter` |
| `attempts` | integer | hayır | |
| `next_attempt_at` | integer | evet | `retrying`'de |
| `last_error` | text | evet | |
| `received_at` | integer | hayır | |
| `processed_at` | integer | evet | |

- (karar: tüm sütunlar §8–§9 davranışından türetildi)
- **Anahtar ve indeksler:** benzersiz `(connection_id, provider_event_id)`; `(state, next_attempt_at)` işleme kuyruğu.
- **Kurallar:** HMAC + zaman damgası doğrulanmadan yazılmaz (geçersizse 401, satır yok). Aynı olay ikinci kez gelirse `INSERT ... ON CONFLICT DO NOTHING`, yine 200. Sahiplenme koşullu `UPDATE ... SET state='processing' WHERE id=? AND state IN ('pending','retrying')`. Kalıcı hata `failed`, denemeler tükenince `dead_letter`; "Başarısızlar" ekranında görünür. `success` satırlar 7 gün sonra silinir (karar: outbox saklama süresiyle aynı, karar 8).

### `conflicts` (ERP uygulaması)
- **Kaynak:** `02-erp.md` §1a ("alan eşleme ve uyuşmazlık (`conflicts`) kayıtları; birden çok bağlantı"), §2 (alan başına sahiplik), §4 madde 1 ("iki tarafın da değiştirdiği alan"), §5 (belirsiz kayıt tahminle yazılmaz), §11 (admin ekranı).
- **Sütunlar:**

| ad | tür | boş | açıklama |
|---|---|---|---|
| `id` | integer PK | hayır | |
| `connection_id` | text | hayır | |
| `entity_type` | text | hayır | `external_refs.entity_type` ile aynı küme |
| `local_public_id` | text | hayır | mağaza kaydı |
| `external_id` | text | hayır | ERP kaydı |
| `field` | text | hayır | çakışan alan (sahiplik ayarı alan başına) |
| `local_value` | text JSON | evet | mağazadaki değer |
| `external_value` | text JSON | evet | ERP'deki değer |
| `base_digest` | text | evet | son senkronlanan değerin özeti (iki tarafın da değiştiğinin kanıtı) |
| `state` | text | hayır | `open · resolved · ignored` |
| `resolution` | text | evet | `keep_local · take_external · manual` |
| `resolved_by` | text | evet | mağaza yöneticisi `admin:<public_id>` |
| `detected_at` | integer | hayır | |
| `resolved_at` | integer | evet | |
| `updated_at` | integer | hayır | |

- (karar: tüm sütunlar §1a/§2/§4 davranışından türetildi)
- **Anahtar ve indeksler:** kısmi benzersiz `(connection_id, entity_type, local_public_id, field) WHERE state='open'` (aynı alan için tek açık uyuşmazlık; yeniden algılamada değerler güncellenir); `(state, detected_at)` admin listesi.
- **Kurallar:** sahiplik ayarı alanı tek tarafa veriyorsa uyuşmazlık açılmaz, sahip yazar; yalnız "iki taraf da değiştirdi ve sahiplik belirsiz" durumunda açılır. Açık uyuşmazlıktaki alan otomatik yazılmaz. Çözüm toplu uçlardan normal yazma yoluyla uygulanır.

---

# Çekirdek tablolara bu gruptan gelen sütunlar

Başka gruplarda tanımlı tablolar; bu belgeler sütun ekliyor ya da varlığını şart koşuyor. Sahip dosya güncellenmeli.

| Tablo | Sütun | Kaynak | Not |
|---|---|---|---|
| `carts` | `status` (`awaiting_approval` dahil) | `04-teklif-ve-onay.md` §1.1 | diğer değerler `02` |
| `carts` | `name` (adlandırılmış sepet), alıcı başına çoklu açık sepet | `03-b2b-katalog-fiyat-siparis.md` §4 | `activeCart` stratejisi |
| `cart_lines` | `quote_id integer FK → quotes.id?`, `quoted_unit_price integer?` (karar: teklif fiyatı satırın kendi alanı) | `04-teklif-ve-onay.md` §2, §4 | fiyat çözümleme ek sorgu atmaz |
| `orders` | `placed_by_admin_id integer FK → admin_users.id?` (karar: temsilci bir yöneticidir) | `02-sirket-hesaplari.md` §5 | `02`'deki `placed_by_customer_id` temsilciyi tutamaz (çelişki 4) |
| `orders` | `po_number`, `requested_delivery_date`, sipariş notu, teslimat şubesi anlık görüntüsü | `03-b2b-katalog-fiyat-siparis.md` §5 | `po_number` şirket başına benzersizliği ayarla açılır; indeks `(company_id, po_number)` benzersiz değil, ayar açıkken sipariş ekleme koşullu `... WHERE NOT EXISTS (aynı company_id, po_number)` (karar: indeks ayara göre değişemez, benzersizlik settlement `atomic()`'indeki koşulla) |
| `orders` | `payment_due_at integer?` (karar 7) | `05-kredi-ve-odeme-kosullari.md` §3 | vadesi geçenleri işaretleyen iş: kısmi indeks `(payment_due_at) WHERE payment_status='awaiting'` (karar: `02`'deki sütun adı `payment_status`) |
| `orders` | `source text` (`subscription` …); `mor_provider text?` (karar: Merchant of Record işleyicisi; doluysa vergi/fatura sağlayıcıda, e-fatura tetiklenmez) | `02-abonelik.md` §2.2, §2.3 | çelişki 12 kapandı |
| `orders` | kargoya verme son tarihi, pazaryeri komisyon alanı | `03-pazaryeri-entegrasyonu.md` §6 | adlar belgede yok (açık 7) |
| `order_adjustments` | temsilci elle satır indirimi | `02-sirket-hesaplari.md` §5 | tavan oranı izinle |
| `product_variants` | `base_variant_id`, `unit_factor`, en az adet, paket katı, en fazla adet, tedarik süresi, `allow_backorder`, barkod | `03-b2b-katalog-fiyat-siparis.md` §2, §3, §6; `03-pazaryeri-entegrasyonu.md` §8 | |
| `admin_users` | `ui_mode` (`builder · classic`) | `05-agentic-builder.md` §3 | |
| `checkout_reservations` | tıklama kimlikleri (`fbc`, `fbp`, `gclid` …), IP, kullanıcı aracısı, onay durumu | `10-tak-calistir-apps/01-pixel.md` §4.4, §4.5 | sipariş silinince/anonimleşince birlikte silinir |
| `stock_movements` | `hold` türü, süreli (teklif için elle rezerv) | `04-teklif-ve-onay.md` §2 | |
| `promotions` | `source = dunning · retention`, aboneliğe bağlı tek kullanım | `02-abonelik.md` §6.1, §7 | |
| `media` | kullanım listesine `quote_attachments`, `bia_reviews_media` | bu dosya | `NOT EXISTS` silme denetimi |
| `external_refs` | bkz. bölüm G | karar 3 | |
| `settings` | `<app>_enabled`, `brand_voice`, `reporting_currency`, `invoice.*` (`legal_policy`), İYS ayarları | çeşitli | ayar deposu, tablo değil |

---

# Belgelerde adı geçip tanımı olmayan tablolar

1. **Şirket → katalog koleksiyonu bağı** (`03-b2b-katalog-fiyat-siparis.md` §2): tablo adı belgede yok (açık 1).
2. **Kayıtlı listeler** (`03-b2b-katalog-fiyat-siparis.md` §4): tablo adı ve sütunları yok (açık 1).
3. ~~Tema sayfa düzeni~~ → çekirdek `sections` (`02`).
4. ~~Uygulama kayıt defteri~~ → `app_installations` (karar 4, tanım aşama 5'te `01`'e); webhook abonelikleri, uzantılar, ajan araçları aynı aşamada.
5. ~~Onay e-postası bağlantısı~~ → `approval_steps.link_token_hash`; ~~yorum isteği jetonu~~ → `bia_reviews_requests.token_hash`.
6. ~~Zamanlanmış görev kilidi~~ → `01` `scheduled_runs`.
7. ~~DataTable kayıtlı görünümleri~~ → `admin_user_prefs` (`table:<id>`).
8. **Uygulama uyarıları** (`admin.alerts.push`, `06-admin-genisletme.md` §4): saklama yeri yok (açık 2).
9. **Mobil cihaz push token'ları** (`03-mobil.md` §2): müşteri başına çok cihaz; `02` sahibine (açık 3).
10. **Yorum yararlı oyları ve şikâyetleri** (`04-urun-yorumlari.md` §2, §5): yalnız `helpful_count` var (açık 4).
11. ~~Wishlist bildirim sayacı~~ → `bia_wishlist_lists.last_price_alert_at`.
12. **E-İrsaliye kayıtları** (`01-e-fatura.md` §6, v1 isteğe bağlı): (açık 5).
13. **Pixel, ERP (alan eşlemeleri, sahiplik ayarları, çalıştırma kayıtları, eşleşmeyenler, ajan kiralamaları), pazaryeri** app'lerinin kendi veritabanı tabloları: app'in kendi kataloğunda tanımlanır, mağaza kataloğuna girmez (karar: `03-tak-calistir-apps.md` §6; ERP'nin adı geçen iki tablosu bölüm M'de).
14. Başka grupta tanımlı, burada başvurulan: `customers`, `carts`, `cart_lines`, `checkout_reservations`, `orders`, `order_lines`, `order_adjustments`, `payments`, `refunds`, `stock_movements`, `catalog_index`, `product_view`, `price_lists`, `price_list_targets`, `products`, `product_variants`, `channels`, `consents`, `media`, `sections`, `audit_log`, `admin_users`, `scheduled_runs`, `idempotency_keys`, `external_refs`, `currency_rates`, `settings`. Katalogda tanımsız başvuru: `currency_rates` (karar 10'a göre `02`'ye eklenmeli, `02`'de henüz yok), `app_installations` (aşama 5).

# Belgeler arası çelişkiler

1. **Abonelik tablo öneki:** karar 5 → `bia_subscriptions_*`. Kapandı.
2. **`invoices` sahibi ve `kind`:** karar 6 → çekirdek `invoices` pazardan bağımsız (`kind` `invoice · credit_note`), Türkiye ayrıntısı `bia_efatura_invoices`/`bia_efatura_parties`. Kapandı.
3. **`orders.due_at` iki anlam:** karar 7 → `orders.payment_due_at`; fatura kesim son günü `bia_efatura_deadlines.due_at`. Kapandı.
4. **Temsilci alanı:** `orders.placed_by_admin_id` (bu dosyanın kararı); `02`'deki `placed_by_customer_id` ile birlikte mi, yerine mi `02` sahibi karar verir (açık 6).
5. **Tek yazıcı ve `company_credit.used`:** `erp_used` ayrı sütun; her sütunun tek yazıcısı var. Kapandı.
6. **ERP stok sütunları:** `02-erp.md` §6 `erp_qty`/`blocked`; çekirdek `on_hand · reserved · safety`. ERP depo bileşenlerini kendinde toplar, mağazaya yalnız `on_hand` yazar (belgedeki güncelleme notu). Çekirdeğe sütun eklenmez. Kapandı.
7. **İYS ayarları:** ayar deposu, tablo değil. Kapandı.
8. **Cycle ↔ sipariş:** yalnız köprü tablo. Kapandı.
9. **Built-in app kimliği ve tablo öneki:** `builtin.wishlist` → `bia_wishlist_`, `acme.loyalty` → `bia_acme_loyalty_`: kural "`builtin.` öneki düşer, kalan noktalar `_` olur" (karar: iki örneği birden karşılayan tek kural). Kapandı; `02-built-in-apps.md`'ye yazılmalı.
10. **Agent mağaza boyutu:** veritabanı = mağaza. Kapandı.
11. **Onay zinciri `manager_of_requester`:** üye düzeyinde yönetici ilişkisi yok; şirket hiyerarşisi şirketler arası (açık 8).
12. **Polar ve e-fatura:** `orders.mor_provider`. Kapandı.
13. **İş yaşam döngüsü adları:** app ve outbox ayrı sistemler. Kapandı.

# Açık sorular (kalan 9)

1. **Şirket katalog bağı ve kayıtlı listeler:** tablo adı ve sütunları belgede yok; `03-b2b-katalog-fiyat-siparis.md` §2, §4 netleşmeden türetilemez (paylaşım ve yetki kuralları yazılı değil).
2. **Uygulama uyarıları** (`admin.alerts.push`): kalıcı mı, oturumluk mu belgede yok.
3. **Mobil push token'ları:** `02` (müşteri) sahibinin kararı; cihaz başına satır gerektiği açık, ad ve kanal kapsamı değil.
4. **Yorum yararlı oyu ve şikâyet tabloları:** belge tekilleştirmeyi istiyor mu belirsiz; misafir oyu (IP/oturum) kişisel veri sorusu doğurur.
5. **E-İrsaliye tabloları:** v1 isteğe bağlı; belge sütun vermiyor.
6. **`orders.placed_by_*`:** `02` ile birlikte karar.
7. **Pazaryeri sipariş alanları** (kargoya verme son tarihi, komisyon): `03-pazaryeri-entegrasyonu.md` ad vermiyor; pazaryeri app'i kendi DB'sinde mi, çekirdek siparişte mi belirsiz.
8. **`manager_of_requester`:** üye hiyerarşisi (ör. `company_members.manager_member_id`) eklenmeli mi, yoksa değer kaldırılmalı mı; ürün kararı.
9. **`spend_period_total` sayacı:** `customer_spend` (`02`) müşteri başına; şirket üyeliği bazında dönemlik harcama için ayrı sayaç mı, `customer_spend`'e `company_id` mi eklenecek `02` ile birlikte karar.
