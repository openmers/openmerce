# Teklif ve onay

İkisi de sepet ile sipariş arasına giren, kesinleşmemiş durumlardır; `orders` tablosuna girmezler.

## 1. Onay akışı (şirket içi)

Alıcının siparişi şirketin kendi kuralına takılırsa onaylayıcıya gider. Basit kural (tek adım) ve çok kademeli zincir aynı yapıdır: tek adımlı zincir.

### 1.1 Temel davranış

- `approvalPolicy` stratejisi karar verir; yönetici tanımlı politikalar (bölüm 1.2) varsayılan uygulamadır. Varsayılan kural: sepet toplamı üyenin `spend_limit` değerini aşıyorsa veya üye `buyer` olup şirket "tüm siparişler onaylı" ayarındaysa onay gerekir.
- Onay gereken sepette "sipariş ver" yerine "onaya gönder" çalışır: `carts.status = awaiting_approval`, `approval_requests` satırı, `approval.requested` olayı.
- Bu aşamada **stok ayrılmaz**; uzun süre bekleyebilecek bir sepet stoğu kilitlemez.
- Onaylayıcı sepeti görür, onaylar veya nedenle reddeder, ya da **değişiklik ister** (isteyen sepeti düzenler, yeniden gönderir). Zincir bitince normal checkout başlar: fiyat yeniden çözülür, rezervasyon ve settlement aynı yoldur. Fiyat veya stok bu arada değiştiyse onaylayıcı farkı görür.
- İsteyen kendi isteğini onaylayamaz (şirkette tek yönetici bile olsa ikinci bir yetkili ya da `escalate_to` gerekir).
- Onay isteği süresi dolunca zamanlanmış görevle kapanır.

### 1.2 Politika ve zincir

**`approval_policies`**: `company_id?` (boş = kanalın tüm şirketleri), `channel_id`, `name`, `priority`, `active`, `conditions` (JSON), `chain` (JSON).

`conditions` kapalı şemadır (rastgele ifade yok); hepsi AND, `any` ile gruplanır:

| Koşul | Anlam |
|---|---|
| `total >= X` (para birimi) | Sepet toplamı |
| `member_role in [...]`, `member_id in [...]` | İsteyen |
| `spend_period_total >= X` (ay/çeyrek) | Üyenin dönemlik harcaması (`customer_spend` benzeri sayaç) |
| `collection in [...]`, `product in [...]`, `category in [...]` | Sepette bu ürünler varsa |
| `line_discount_pct >= X` | Sözleşme/teklif indirimi büyükse |
| `payment_method in [...]` | Ör. vadeli ödeme |
| `custom` | Kod: `approvalPolicy` stratejisi (built-in app) |

Birden çok politika eşleşirse en yüksek `priority` kazanır; eşit önceliklerde zincirler **birleştirilir** (sıralı ekleme, tekrar eden onaylayıcı bir kez).

`chain` sıralı adımlar dizisidir; her adım:

| Alan | Değerler |
|---|---|
| `approvers` | `member:<id>` · `role:<ad>` · `manager_of_requester` (şirket hiyerarşisindeki üst birim, bkz. [02-sirket-hesaplari.md](02-sirket-hesaplari.md) bölüm 4) · `store_staff:<izin>` (satıcı tarafı onayı) |
| `mode` | `any` (biri yeter) · `all` (hepsi) |
| `type` | `human` · `external` (bölüm 1.4) |
| `timeout_hours` | Boşsa zaman aşımı yok |
| `on_timeout` | `remind` · `escalate` (`escalate_to` adımına/kişiye) · `auto_approve` · `auto_reject` |

### 1.3 Adım takibi ve eşzamanlılık

**`approval_requests`**: `cart_id`, `policy_id`, `status` (`pending · approved · rejected · changes_requested · expired · cancelled`), `current_step`, `requested_by`.
**`approval_steps`**: `request_id`, `step_no`, `approver_ref`, `state` (`waiting · pending · approved · rejected · skipped`), `due_at`, `decided_by`, `decided_at`, `via` (`direct · delegation · escalation · timeout · external`), `note`. İndeks `(state, due_at)`.

Karar koşullu güncellemedir (`WHERE request_id=? AND step_no=current_step AND state='pending'`); aynı adımda iki onaylayıcı aynı anda işlem yaparsa biri kazanır. Adım kapanınca sonraki adım `pending` olur ve `due_at` hesaplanır (tek `atomic()`). `all` modunda adımın kalan onaylayıcı sayısı karar satırlarıyla izlenir.

**Zaman aşımı:** zamanlanmış iş her 5 dakikada `(state='pending' AND due_at <= now)` olan adımları işler (indeksli, parça parça); sonuç `via = timeout` olarak yazılır, aktör `system:timeout`'tur. `auto_approve` yalnızca şirket yöneticisinin açıkça izin verdiği politikalarda seçilebilir.

**Devir (delegation):** `approval_delegations(member_id, delegate_id, from_at, until_at)`: onaylayıcı izindeyken kendi yerine biri karar verir; kayıt "X adına Y" olarak tutulur. Devir alan kişi zincirdeki yetkisini artırmaz (kendi isteğini onaylayamaz kuralı geçerli). Onaylayıcı şirketten çıkarılırsa bekleyen adımları `escalate_to`'ya, o yoksa şirket yöneticisine geçer.

### 1.4 Dış sistem bekleyen adım

`type = external` adımda mağaza uygulamaya `approval.external_requested` webhook'u gönderir ([../04-genisletme/03-tak-calistir-apps.md](../04-genisletme/03-tak-calistir-apps.md)); uygulama (ör. ERP kredi kontrolü, hukuk onayı) `approvals.decide` ucunu kendi token'ıyla çağırır (`approvals:decide` izni). Zaman aşımı kuralları aynıdır; yanıtsız kalırsa `on_timeout` çalışır. Karar `via = external`, aktör uygulamadır.

### 1.5 Olaylar ve bildirim

`approval.requested`, `approval.step_decided`, `approval.escalated`, `approval.timed_out`, `approval.decided`. Onaylayıcıya e-posta (siparişe özet + tek tıkla onay/ret bağlantısı, imzalı, tek kullanımlık, giriş gerekmez ama onaylayıcı doğrulaması e-posta sahipliği); hatırlatma `remind` adımıyla. Bildirim şablonları [../05-ticaret/15-bildirimler.md](../05-ticaret/15-bildirimler.md).

### 1.6 Test

Tek adım ve üç adımlı zincir; `all` modu; iki onaylayıcının aynı anda kararı; kendini onaylama engeli; zaman aşımında yükseltme ve otomatik karar; devir ve devir sırasında şirketten çıkarma; harici adımın yanıtsız kalması; sepet değişince fark görünmesi; politika öncelik/birleştirme; onay sırasında fiyat değişmesi.

## 2. Teklif (mağaza ile şirket arası)

Teklif sürümlü bir pazarlıktır: her tur değişmez bir **sürümdür**, mevcut sürüm işaretçiyle belirlenir. Kabul edilen, kabul anındaki sürümdür.

**`quotes`**: `public_id` (`quo_`), şirket, isteyen üye, kanal, `status`, `current_version`, satış temsilcisi, `valid_until` (mevcut sürümden), `round_count`, `version` (satır sürümü, eşzamanlı yazma).
**`quote_versions`**: `quote_id`, `no`, `side` (`buyer · seller`), `created_by`, `valid_until`, `payment_terms`, `note`, `total` (anlık görüntü), `created_at`. Değişmez.
**`quote_version_lines`**: `version_id`, varyant, adet, liste fiyatı, **teklif fiyatı** (alıcı sürümünde "hedef fiyat" olabilir), satır notu.
**`quote_messages`**: yazışma. `version_no?` (hangi sürüme ait), `visibility` (`shared · internal`), `author_id`, ek dosyalar (`quote_attachments`: özel depolama `private` kovası, imzalı bağlantı).

**Durumlar:** `requested → offered → countered → offered …` (her tur sürüm artırır) `→ accepted | rejected | expired | cancelled`. İç onay alt durumu: `offered` içinde `pending_internal_approval` (müşteri bunu "inceleniyor" olarak görür).

1. Alıcı sepetini teklife çevirir (`quote.request`): ilk alıcı sürümü (adet, isteğe bağlı hedef fiyat, not). Sepet kilitlenmez.
2. Temsilci (`quotes:offer`) satıcı sürümü oluşturur: satır fiyatları, geçerlilik, ödeme koşulu. Tavan indirim oranı izinle sınırlıdır; aşan sürüm ikinci bir yöneticinin onayına gider (`quotes:approve_discount`), onay gelene kadar müşteriye gösterilmez.
3. Alıcı **kabul eder**, **reddeder** ya da **karşı teklif** verir (adet ve/veya hedef fiyat, not, ek). Karşı teklif yeni alıcı sürümüdür ve temsilciye bildirim gider. Tur sayısı sınırı (varsayılan 10, ayar).
4. Kabul: `WHERE status = 'offered' AND current_version = ? AND valid_until > now AND version = ?`. Kabul edilince teklif bir sepete dönüşür: satır fiyatları **kabul edilen sürümden** gelir, `linePrice` stratejisi bu satırlar için teklif fiyatını döner. Sonrası normal checkout (şirket içi onay dahil).
5. İç notlar yalnızca `quotes:read` izinli satıcı tarafına görünür; sorgu `visibility` süzgecini çekirdekte uygular (handler'a bırakılmaz). Müşteri API'sinden `internal` mesaj dönmez.
6. Tüm sürümler saklanır; arayüz iki sürüm arasında **fark** (satır, adet, fiyat, toplam) gösterir. Müşteri yalnızca `shared` içeriği görür.

Stok teklif süresince ayrılmaz; istenirse temsilci elle stok rezervi koyabilir (`stock_movements: hold`, süreli). Promosyonlar teklif fiyatlı satıra uygulanmaz.

**Test:** üç tur pazarlık, her sürümün değişmezliği, eşzamanlı iki karşı teklif (biri kazanır), iç notun müşteri API'sinde görünmemesi, iç onay bekleyen sürümün müşteriden gizli kalması, kabulde yalnızca kabul edilen sürümün fiyatı, süre dolumu, tur sınırı, ek dosyaya yetkisiz erişim.

## 3. Olaylar

Onay olayları bölüm 1.5'te. Teklif: `quote.requested`, `quote.offered`, `quote.countered`, `quote.internal_approval_requested`, `quote.accepted`, `quote.rejected`, `quote.expired`. Uygulamalar (CRM, ERP) bunları webhook ile alır.

## 4. Performans

Teklif ve onay düşük hacimli, `no-store` yollardır. Tek kural: sıcak yola (katalog, sepet hesaplama) koşul eklemezler. Teklif fiyatı sepette satırın kendi alanıdır; fiyat çözümleme ek sorgu atmaz.
