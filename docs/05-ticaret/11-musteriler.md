# Müşteriler (Customers modülü)

Çekirdek modül: müşteri kaydı, adres defteri, gruplar (elle ve kural tabanlı), etiket/not, izinler, toplam istatistikleri, birleştirme, dışa aktarma ve kişisel veri akışları. Şirket (B2B) ilişkisi bu modülün dışındadır: [../06-b2c-b2b/02-sirket-hesaplari.md](../06-b2c-b2b/02-sirket-hesaplari.md).

> **Kaynak.** Medusa'nın Customers belgeleri (kullanıcı kılavuzu: müşteriler, yönetim, gruplar; Customer modülü ve veri modelleri) 2026-11-12'de okundu ✅. Medusa'nın olay listesi ve diğer modüllerle bağları okunan sayfalarda yoktu. Türkiye'deki ticari ileti izni (İYS) ve KVKK sonuçları **doğrulanmadı** ⚠️.

## 1. Medusa'dan alınan ve alınmayan

| Medusa | OpenMers | Neden |
|---|---|---|
| Müşteri alanları: ad, soyad, e-posta, telefon, şirket adı, `metadata`, `created_by` | Aynı + `locale`, `source`, `state`, `email_verified_at`, `custom_fields`, `private_metadata` | Pazarlama ve operasyon için gerekli; B2B şirket ayrı |
| **Misafir ve üye iki ayrı kayıt**: aynı e-postayla kayıtta ikinci `Customer` satırı, `has_account` yalnızca oluşturmada atanır, siparişleri taşımak için "sahiplik devri" ve müşteri onayı gerekir | **Tek kayıt, e-posta başına**. Hesap = `user_id` dolu olması. Misafir alışveriş sonradan kayıtta aynı satırı kullanır | Mükerrer müşteri, bölünmüş sipariş geçmişi ve istatistik sorunlarını baştan engeller |
| Silme "soft delete"; silinen e-posta yeniden kayıtta çakışır | **Anonimleştirme** (bölüm 8); e-posta serbest kalır | Çakışma yok, KVKK ile uyumlu |
| Adreste `is_default_shipping` / `is_default_billing` bayrakları, birden çok varsayılan engellenmiyor | Varsayılanlar **müşteri satırında** (`default_shipping_address_id`, `default_billing_address_id`) | Yapısal olarak tek varsayılan; tek `atomic()` ile güncellenir |
| Adres sayısı sınırı yok | Müşteri başına en çok 20 adres | Suistimal ve gereksiz büyüme |
| Gruplar yalnızca elle üyelik, yalnızca ad + metadata | Elle **ve** kural tabanlı (akıllı) gruplar | VIP/uykuda/yeni gibi segmentler elle bakım istemesin |
| Listede e-posta, ad, hesap türü; arama/filtre/sıralama var, dışa aktarma ve toplu işlem yok | Sipariş sayısı, harcama, son sipariş, grup, etiket filtreleri; toplu işlemler; kayıtlı görünümler; asenkron dışa aktarma | Günlük operasyon |
| Admin'de oluşturulan müşteri misafirdir, sipariş devredilemez | Admin müşteri oluşturur, "hesap daveti" e-postasıyla müşteri aynı satıra parola belirler | Aynı satır olduğu için devir sorunu yok |
| Silme geri alınamaz, e-posta yazarak onay | Aynı onay; ayrıca anonimleştirme ön koşulları (bölüm 8) | Açık siparişi olan müşteri silinmez |
| Sipariş devri: müşteri bildirimle onaylar | Admin `orders:reassign` ile taşır, denetim kaydı + bildirim | Tek kayıt modelinde devir nadir bir düzeltmedir |

## 2. Tablolar

| Tablo | İçerik |
|---|---|
| `customers` | `public_id`, `email`, `email_normalized` (küçük harf, kırpılmış; **benzersiz**), `email_verified_at`, `first_name`, `last_name`, `company_name` (yalnızca görünen metin; B2B şirketi değil), `phone` (E.164), `locale`, `user_id?` (boşsa hesapsız), `source` (`checkout · register · admin · import · marketplace`), `state` (`active · disabled · anonymized`), `default_shipping_address_id?`, `default_billing_address_id?`, `custom_fields`, `metadata`, `private_metadata`, `created_by?` (yönetici), `version`, zaman damgaları |
| `addresses` | `customer_id`, `label`, ad, firma, `address_line1`, `address_line2`, `city`, `region` (eyalet/il), `district?` (ilçe vb.), posta kodu, ülke, telefon; fatura alanları: `tax_id` (KDV/VAT numarası), `tax_id_type`; ülkeye özgü alanlar (Türkiye: vergi dairesi, TC kimlik, e-fatura mükellefiyeti) çekirdek şemada değil, ilgili built-in app'in `custom_fields` alanındadır ([../09-built-in-apps/01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)) |
| `customer_stats` | Müşteri başına tek satır: `orders_count`, `paid_orders_count`, `first_order_at`, `last_order_at`, `last_seen_at` |
| `customer_spend` | `(customer_id, currency)`: `total_paid`, `total_refunded` (para birimi başına; kur dönüşümü yok) |
| `customer_tags` | `(customer_id, tag)`; yöneticinin serbest etiketleri |
| `customer_notes` | Dahili not: yönetici, metin, sabitlenmiş mi, zaman |
| `customer_groups` | `public_id`, ad, açıklama, `kind` (`manual · smart`), `rule` (JSON), `affects_commerce`, `rule_version`, `last_evaluated_at`, `metadata` |
| `customer_group_members` | `(group_id, customer_id)` anahtar, `source` (`manual · rule`), `added_at`; ek indeks `(customer_id)` |
| `customer_channels` | Müşterinin hangi kanallarda göründüğü |
| `consents` | Salt ekleme: kanal (`email · sms · call · push`), amaç (`marketing · analytics`), `status` (`granted · withdrawn`), `source`, metin sürümü, kaynak IP'nin özeti (ham IP değil), zaman |
| `customer_consent_state` | `(customer_id, channel, purpose)` → güncel durum + zaman; `consents`'e yazımla aynı `atomic()` içinde güncellenir |
| `customer_merges` | Birleştirme denetimi: kaynak, hedef, taşınanlar, yönetici |
| `customer_exports` | Dışa aktarma işi: süzgeç, durum, R2 anahtarı, bitiş, indirme sayısı |
| `customer_search` | FTS5 sanal tablosu: e-posta, ad, telefon (yalnız rakamlar), şirket adı; müşteri yazımıyla aynı `atomic()` içinde güncellenir |

Kimlik doğrulama Better Auth'tadır ve ayrıdır ([../03-cekirdek/08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md)); `customers` ticaret kaydıdır. Özel alan/metadata kuralları: [../04-genisletme/04-ozel-alanlar-ve-metadata.md](../04-genisletme/04-ozel-alanlar-ve-metadata.md).

## 3. Tek kayıt, misafirden üyeye

- Checkout'ta e-posta girilir. `email_normalized` ile müşteri aranır; yoksa **hesapsız** müşteri (`user_id` boş, `source = checkout`) oluşturulur. Varsa sipariş mevcut kayda bağlanır ama **profil bilgileri (ad, telefon, kayıtlı adresler) giriş yapılmadıkça değiştirilmez**; checkout adresi siparişte anlık görüntü olarak durur.
- Kayıt (Better Auth) aynı e-posta için `customers` satırını bulur ve `user_id`'yi bağlar. **Bağlama yalnızca e-posta doğrulandıktan sonra** yapılır: doğrulama yapılmadan kayıt olan biri, başkasının e-postasıyla kayıt olup misafir sipariş geçmişini göremez. Doğrulama öncesi hesap `disabled`-benzeri kısıtlı durumdadır (sipariş geçmişi gösterilmez).
- E-posta değişikliği yeni adresin doğrulanmasıyla olur; eski adres için girilmiş misafir siparişleri müşteri satırına zaten bağlıdır, e-posta alanı değişince arama güncellenir.
- Siparişlerdeki `customer_id` tek müşteri kaydını gösterir; ikinci bir kayıt olmadığı için "misafir siparişlerini hesaba taşı" adımı yoktur.
- Admin müşteri oluşturduğunda kayıt hesapsızdır; "hesap daveti" e-postası (tek kullanımlık bağlantı) parola belirletir ve aynı satıra bağlanır.
- Pazaryeri siparişlerinden gelen maskeli müşteriler `source = marketplace` olarak ayrı satırdır (e-posta maskeli, izin yok); gerçek e-postaya sahip müşteriyle otomatik birleştirilmez ([../10-tak-calistir-apps/03-pazaryeri-entegrasyonu.md](../10-tak-calistir-apps/03-pazaryeri-entegrasyonu.md)).

## 4. Adres defteri

- En çok 20 adres. Ekleme/silme `version` kontrollü; varsayılan adres silinirse varsayılan alan temizlenir (otomatik başkasını seçmez).
- Adres doğrulaması çekirdekte yalnızca biçimdir (zorunlu alanlar, posta kodu deseni, telefon E.164). Ülke bölge listeleri (ör. Türkiye il/ilçe/mahalle) ilgili ülke paketinin tohum verisidir, çekirdek şemaya sütun eklemez; ülke başına adres şeması `Zod` ile tanımlıdır.
- Fatura alanları (vergi no/TC) hassas veridir: yalnızca sahibi, `customers:read_pii` izinli yönetici ve fatura akışı görür; günlüğe ve ajan araçlarına maskeli gider.
- Sipariş adresi her zaman **anlık görüntüdür**; adres defterindeki değişiklik eski siparişi etkilemez.

## 5. Gruplar

Grup üyeliği **segmenti** belirler: fiyat listeleri ([03-fiyat.md](03-fiyat.md)), promosyon koşulları ([08-promosyon.md](08-promosyon.md)), vergi muafiyeti ([09-vergi.md](09-vergi.md)) ve ödeme yöntemi uygunluğu ([06-odeme-ve-iade.md](06-odeme-ve-iade.md)). Kurumsal ilişki grup değil **şirket**tir.

### 5.1 Elle gruplar

Ad, açıklama, metadata. Üyelik grup sayfasından (toplu ekle/çıkar, CSV ile) veya müşteri sayfasından yönetilir. Bir müşteri birden çok gruba üye olabilir. Grubu silmek müşterileri silmez.

### 5.2 Akıllı gruplar (kural tabanlı)

Kural sınırlı, **kapalı** bir şemadır (rastgele SQL/ifade yok):

```ts
type Rule = { all?: Cond[]; any?: Cond[] }   // iç içe en çok 2 düzey
type Cond =
  | { field: 'orders_count' | 'paid_orders_count'; op: '>=' | '<=' | '='; value: number }
  | { field: 'total_paid'; currency: string; op: '>=' | '<='; value: number }
  | { field: 'last_order_at' | 'first_order_at' | 'created_at'; op: 'within_days' | 'older_than_days'; value: number }
  | { field: 'has_account' | 'email_verified'; value: boolean }
  | { field: 'country'; op: 'in'; value: string[] }          // varsayılan teslimat adresi
  | { field: 'tag' | 'group' | 'source'; op: 'in' | 'not_in'; value: string[] }
  | { field: 'consent'; channel: string; purpose: string; value: 'granted' | 'withdrawn' }
```

Örnekler: **VIP** = `total_paid(USD) >= 1000 ve orders_count >= 5`; **Uykuda** = `last_order_at older_than_days 180 ve orders_count >= 1`; **Yeni** = `created_at within_days 30`.

**Değerlendirme (tek uygulama):** kural, JSON'dan **tek bir SQL koşuluna** derlenir (`customers ⋈ customer_stats ⋈ customer_spend`). Aynı derleyici üç yerde kullanılır: (a) bir müşteri için "üyesi mi" kontrolü (anahtar araması + koşul), (b) grubun üyelerini toplu yeniden hesaplama, (c) admin'de "bu kural kaç kişiyi yakalar" önizlemesi. İkinci bir bellek içi değerlendirici **yoktur** (davranış kayması olmasın).

| Tetikleyici | İş |
|---|---|
| Sipariş/iade/etiket/grup/izin olayı | O müşteri için akıllı grupların hepsi (en çok 20) tek tek kontrol edilir; üyelik farkı yazılır |
| Gecelik zamanlanmış iş | Zamana bağlı kurallar (`older_than_days`, `within_days`) için toplu yeniden hesaplama; 1000'lik parçalar, imleçle |
| Kural değişikliği | `rule_version` artar, toplu yeniden hesaplama işi kuyruğa yazılır; bitene kadar eski üyelik geçerlidir, bitince atomik fark uygulanır |

- Akıllı gruplar elle düzenlenemez (üye ekle/çıkar yok); istisna gerekiyorsa kural `tag`'a dayandırılır.
- En çok 20 akıllı grup ve kural başına en çok 12 koşul (maliyet sınırı).

### 5.3 Oturuma etkisi (performans kuralı)

Vitrin isteğinde müşteriye dair tek veri oturumdaki `{ id, groupIds, companyId, priceListIds }` kümesidir ([../03-cekirdek/08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md)). Bu yüzden:

- Oturuma yalnızca **`affects_commerce = true`** gruplar girer (fiyat listesi, promosyon, vergi veya ödeme yöntemi hedefi olan gruplar). Salt pazarlama/etiket amaçlı gruplar oturuma ve segment anahtarına girmez.
- Ticari bir grubun üyeliği değişince yalnızca o müşterinin oturum `version`'ı artar (sonraki istekte segment yeniden hesaplanır). Toplu yeniden hesaplamada artış parça parça yapılır; ani yük oluşmaz.
- Segment önbelleği fiyat listeleri kümesiyle anahtarlıdır; aynı listeleri gören müşteriler aynı kopyayı paylaşır, grup sayısı önbelleği çoğaltmaz.
- Bir müşterinin ticari grup sayısı üst sınırı 50'dir (oturum boyutu).

## 6. İstatistikler ve admin listesi

**Neden ayrı tablo:** "Kaç sipariş, ne kadar harcadı, son sipariş ne zaman" listede ve kuralda sorulur; sipariş tablosunu taramak yavaştır.

- `customer_stats` ve `customer_spend` olay işiyle güncellenir (`order.placed`, `order.paid`, `refund.settled`, `order.cancelled`). **Artırma değil yeniden hesaplama:** iş o müşterinin siparişlerinden `(customer_id, placed_at)` indeksiyle toplamı yeniden okur ve satırı yazar. Çift veya sırasız teslimat aynı sonucu verir (idempotent). Gecelik uzlaştırma rastgele örneklemde farkı denetler.
- Tarihsel içe aktarılan siparişler ([../08-isletme/08-veri-tasima.md](../08-isletme/08-veri-tasima.md)) istatistiğe ayar açıksa girer; olay üretmedikleri için içe aktarma sonunda toplu yeniden hesaplama çalışır.

**Liste:** sunucu taraflı imleçli. Sütunlar: ad, e-posta, hesap türü (Üye/Hesapsız), sipariş sayısı, harcama, son sipariş, gruplar, etiketler, kaynak, kayıt tarihi.

| Özellik | Gerçekleştirme |
|---|---|
| Arama | `customer_search` (FTS5) üzerinde ön ek; e-posta tam eşleşmesi doğrudan `email_normalized` indeksinden; telefon rakam sonekiyle |
| Süzgeçler | hesap türü, grup, etiket, kanal, ülke, kaynak, kayıt tarih aralığı, sipariş sayısı/harcama aralığı, son sipariş aralığı, pazarlama izni |
| Sıralama | indeksli sütunlar: kayıt tarihi, son sipariş, harcama, sipariş sayısı |
| Kayıtlı görünüm | Süzgeç + sütun + sıralama kümesi; yönetici başına veya paylaşımlı |
| Toplu işlem | Gruba ekle/çıkar, etiket ekle/çıkar, dışa aktar. Seçim ya satır kimlikleri (≤ 500) ya da "süzgeçteki hepsi" (sunucu süzgeci yeniden çalıştırır, iş olarak) |
| Sayım | Toplam sayı tam sayılmaz; süzgeç ağırsa "~" yaklaşık gösterilir ve imleç sürer |

Önceden hazır görünümler: Yeni (30 gün), Tekrar eden, Uykuda, Hiç sipariş vermemiş, İzinli.

## 7. Müşteri ayrıntısı (admin)

Bölümler: özet (hesap türü, doğrulama, kaynak, kanal, istatistik), **zaman çizelgesi** (siparişler, iadeler, notlar, gönderilen e-postalar, izin değişiklikleri, birleştirmeler), adresler, gruplar (elle ekle/çıkar; akıllılar salt okunur), etiketler, dahili notlar, izinler (güncel durum + geçmiş), şirket üyelikleri ([../06-b2c-b2b/02-sirket-hesaplari.md](../06-b2c-b2b/02-sirket-hesaplari.md)), abonelikler ([../09-built-in-apps/02-abonelik.md](../09-built-in-apps/02-abonelik.md)), özel alanlar ve metadata.

Düzenleme alanları: ad, e-posta, telefon, şirket adı, dil, etiketler, özel alanlar. **Parola yönetici tarafından değiştirilemez**; "parola sıfırlama bağlantısı gönder" vardır. Eşzamanlı düzenleme `version` ile korunur. Uygulama panelleri `customer.details.panel` noktasına bağlanır ([../04-genisletme/03-tak-calistir-apps.md](../04-genisletme/03-tak-calistir-apps.md)).

İzinler: `customers:read`, `customers:read_pii` (tam e-posta/telefon/vergi no), `customers:write`, `customers:delete`, `customers:export`, `customers:merge`, `customer_groups:write`, `orders:reassign`. Liste/ayrıntı `read` ile maskeli görülür (`a***@example.com`), `read_pii` ile açılır; açılma denetim kaydına yazılır.

## 8. Birleştirme, silme, kişisel veri

**Birleştirme:** aynı kişi iki kayıtta (iki e-posta, pazaryeri) ise `customers:merge` ile *kaynak → hedef*. Önizleme taşınacakları listeler (sipariş, adres, grup, etiket, not, izin, abonelik, şirket üyeliği). Tek `atomic()` + toplu parçalar: siparişlerin `customer_id`'si hedefe geçer, adresler (20 sınırına kadar) ve etiketler birleşir, izin geçmişi hedefin altına eklenir (güncel durum **daha kısıtlayıcı** olandır), kaynak `anonymized` olur ve `merged_into` işareti alır. İstatistik yeniden hesaplanır. İki tarafta da hesap (`user_id`) varsa birleştirme reddedilir (önce biri hesabı kapatmalı). Geri alınamaz; onay + denetim.

**Silme (anonimleştirme):**
- Müşteri kendi hesabını silmek ister (hesap ayarları) veya yönetici siler (`customers:delete`, kayıt e-postasını yazarak onay).
- **Ön koşullar:** açık (tamamlanmamış) sipariş, aktif abonelik, iade bekleyen tutar yoksa. Varsa neden listelenir; yönetici zorlayamaz.
- **Etki:** e-posta `anon+<id>@invalid`, ad/telefon/şirket adı boşalır, adresler silinir, `user_id` ve oturumlar iptal edilir, etiket ve notlardaki kişisel metin silinir, özel alanların kişisel işaretli olanları silinir, `state = anonymized`. Böylece e-posta yeniden kayıt için serbesttir. `consents` kayıtları kişisel veri içermeyecek biçimde (yalnızca `customer_id`) kanıt olarak saklanır.
- **Sipariş ve fatura anlık görüntüleri** yasal saklama süresi boyunca kalır; süre dolunca zamanlanmış görev onları da anonimleştirir. Süre ayardır ⚠️ (mevzuat doğrulanmadı).
- Uygulamalara `customer.anonymized` olayı gider; uygulamalar kendi verilerini silmekle yükümlüdür (olay gövdesinde kişisel veri yoktur).

**Dışa aktarma (kişi için):** hesap ayarlarında "verilerimi indir" bir iştir; sonuç süreli bağlantıyla verilir (JSON: profil, adresler, siparişler, izinler).

## 9. İzinler (rıza)

- Her izin değişikliği `consents`'e **eklenir** (silinmez/güncellenmez), aynı `atomic()` içinde `customer_consent_state` güncellenir. Kaynak: checkout kutusu, hesap ayarları, yönetici girişi (gerekçe zorunlu), içe aktarma, e-postadaki abonelikten çık bağlantısı.
- Metin sürümü kaydedilir (müşteri neye onay verdi). Varsayılan hiçbir şey **işaretli gelmez** (önceden işaretli kutu yok).
- Pazarlama izni olmayan müşteriye pazarlama bildirimi ve reklam platformu olayı gitmez ([15-bildirimler.md](15-bildirimler.md), [../10-tak-calistir-apps/01-pixel.md](../10-tak-calistir-apps/01-pixel.md)). Taşımada izin kaydı yoksa müşteri **izinsiz** sayılır; pazaryeri müşterileri izinsizdir.
- Abonelikten çık bağlantısı imzalı, tek tıkla çalışır, giriş istemez.
- Türkiye'de ticari elektronik ileti için İYS (İleti Yönetim Sistemi) kaydı gerekir; senkron **v1'de** `ConsentRegistry` portunu uygulayan built-in app'tir: [../09-built-in-apps/05-iys.md](../09-built-in-apps/05-iys.md) (API ayrıntıları doğrulanmadı).

## 10. Dışa aktarma (yönetici)

`customers:export` izni gerekir. Süzgeç veya seçili kimlikler üzerinden **iş** olarak çalışır; CSV parça parça R2'ye yazılır, tamamlanınca süreli indirme bağlantısı (varsayılan 24 saat, indirme sayısı sınırlı) ve bildirim gelir. Hangi alanların dışa aktarılacağı seçilir (kişisel veri alanları ayrı onay kutusudur). Her dışa aktarma `customer_exports`'a ve denetim kaydına yazılır. Zaman aşımı yoktur çünkü arayüz yalnızca iş durumunu izler.

## 11. Olaylar

`customer.created` · `customer.updated` · `customer.registered` (hesap bağlandı) · `customer.merged` · `customer.anonymized` · `customer.group_changed` · `consent.changed` · `address.changed` (yalnızca varsayılan adres değişince). Kişisel veri yalnızca `customers:read` izinli aboneliğe gider; abonesi olmayan olay için outbox satırı yazılmaz ([../03-cekirdek/04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md)).

## 12. Müşteri hesabı (vitrin ve mobil)

Siparişler, adres defteri, abonelikler, iade talebi, izin yönetimi, veri indirme ve hesap silme. Hepsi `no-store`; sahiplik filtresi çekirdek sorgudadır (başka müşterinin kaydı 404). Profil güncellemesi ve adres değişikliği hız sınırlıdır. Hesap sayfaları tema şablonlarıdır ([../07-istemciler/04-tema-sistemi.md](../07-istemciler/04-tema-sistemi.md)).

## 13. Ajan araçları

([../07-istemciler/05-agentic-builder.md](../07-istemciler/05-agentic-builder.md)) `customers.search/get/stats` (`read`, varsayılan maskeli), `customer_groups.create/update` ve etiket işlemleri (`write`), `customers.addToGroup` (`write`), `customers.merge`, `customers.anonymize` (`destructive`, onay kartı), `customers.export` (`external`, onay kartı). Müşteri kişisel verisi ajana gitmesin ayarı kapalıysa `read_pii` hiç çalışmaz.

## 14. Performans özeti

- Vitrinde müşteri sorgusu yok; yalnızca oturum kümesi. Kişisel sayfalar `no-store` ve `(customer_id, placed_at)` indeksli.
- Admin listesi `customer_stats`'tan; sipariş tablosu taranmaz. Arama FTS5 + `email_normalized` indeksi.
- Akıllı grup: kural bir kez SQL'e derlenir; olay başına en çok 20 küçük anahtar sorgusu; toplu iş parçalı.
- Ticari olmayan gruplar oturumu ve önbellek anahtarını büyütmez.
- Dışa aktarma ve birleştirme iş olarak, parçalı.

## 15. Sıralama

1. `customers`, `addresses`, tek kayıt/misafir→üye akışı, oturum kümesi, `customer_search`.
2. `customer_stats`/`customer_spend` ve olay işi, admin listesi (arama, süzgeç, imleç), ayrıntı sayfası, etiket/not.
3. Elle gruplar ve oturuma etkisi (`affects_commerce`).
4. İzinler (`consents` + durum), hesap silme/anonimleştirme, veri indirme.
5. Akıllı gruplar (derleyici + üç kullanım).
6. Toplu işlemler, kayıtlı görünümler, dışa aktarma işi.
7. Birleştirme.

## 16. Test

- Aynı e-postayla misafir sipariş, sonra kayıt: tek müşteri satırı, geçmiş sipariş doğrulama sonrası görünür; doğrulanmamış kayıt başkasının misafir siparişlerini göremez.
- E-posta büyük/küçük harf ve boşluk farkı aynı müşteriyi bulur; benzersiz indeks ikinci kaydı reddeder.
- Giriş yapılmadan yapılan checkout, mevcut müşterinin adres defterini ve profilini değiştirmez.
- Adres sınırı 20; varsayılan adres silinince varsayılan alan temizlenir; sipariş anlık görüntüsü adres değişiminden etkilenmez.
- Akıllı grup: kural sonucu, hazır bir veri kümesinde elle hesaplanan üyelerle eşleşir; (a) tek müşteri kontrolü, (b) toplu hesap, (c) önizleme **aynı** kümeyi verir.
- Sipariş olayı iki kez teslim edilir: `customer_stats` aynı kalır; sırasız iade/sipariş de doğru toplam verir.
- `affects_commerce` olmayan grup üyeliği oturum `version`'ını artırmaz ve segment anahtarını değiştirmez.
- Ticari grup üyeliği değişince yalnızca ilgili müşterinin oturumu yenilenir ve fiyat listesi kümesi güncellenir.
- Anonimleştirme: açık siparişi olan müşteri silinemez; silinince e-posta serbesttir, yeniden kayıt çakışmaz, izin kaydı kişisel veri içermeden kalır.
- Birleştirme: sipariş/adres/izin taşınır, güncel izin daha kısıtlayıcıdır, iki hesaplı birleştirme reddedilir, istatistik doğru.
- Dışa aktarma: izinsiz yönetici reddedilir, bağlantı süresi dolunca 404, kişisel alanlar seçilmedikçe dosyada yoktur.
- İzin geçmişi güncellenmez/silinmez (yalnızca ekleme); izinsiz müşteriye pazarlama olayı gitmez.
- Maskeli/açık e-posta: `read_pii` yoksa liste ve API tam e-posta döndürmez; açılma denetim kaydına düşer.

## 17. Kararlar ve kalan sorular

Verilen kararlar:
1. **Akıllı grup güncelleme:** olay anında (ilgili müşteri için) **ve** gecelik toplu iş (zamana bağlı kurallar için). Bölüm 5.2'deki tablo bunu zaten uygular.
2. **İYS:** çekirdekte değil, `ConsentRegistry` portunu uygulayan **built-in app**. Çekirdek yalnızca `consent.changed` olayını ve portu sağlar ([../04-genisletme/02-built-in-apps.md](../04-genisletme/02-built-in-apps.md)). **v1 kapsamında**, belge: [../09-built-in-apps/05-iys.md](../09-built-in-apps/05-iys.md); ⚠️ İYS API'si doğrulanmadı.
3. **Harcama:** Shopify'ın "Amount spent" mantığı izlenir: müşterinin ödenen sipariş toplamı (vergi ve kargo dahil), iadeler düşülmüş **net** tutar, para birimi başına. Tabloda `total_paid` ve `total_refunded` ayrı saklanır, arayüz ve `total_paid` kuralı net değeri (`paid - refunded`) kullanır. ⚠️ Shopify'ın tam hesabı (kargo/vergi/iade dahil mi) bu oturumda doğrulanmadı; farklıysa yalnızca gösterim formülü değişir, şema değişmez.
4. **Etiketler:** serbest metin + otomatik tamamlama. Kaydedilirken kırpılır ve küçük harfe normalize edilir (yazım farkı çoğalmasın); yönetici etiketi yeniden adlandırabilir veya başka etiketle birleştirebilir (toplu iş). Önceden tanımlı kapalı liste yoktur, çünkü günlük kullanımı yavaşlatır.

### 17.1 Saklama ve anonimleştirme sonrası kalan alanlar

Shopify yaklaşımı (kaynak: Shopify yardım merkezi ve geliştirici değişiklik günlüğü): silme talebinde yalnızca kişisel veri (ad, adres vb.) silinir; ne satıldığı, satış zamanı ve sipariş tutarı gibi kişisel olmayan veri kalır. Önceki 180 günlük bekletme 23 Mart 2026'dan itibaren kalktı; talep 10 gün sonra işlenir, bu sürede iptal edilebilir. ikas'ın kendi silme/saklama davranışını bulamadım ⚠️.

OpenMers kuralı:
- **Silinir:** e-posta, ad, telefon, müşteri adresleri, etiket/not kişisel metni, kişisel özel alanlar.
- **Kalır (kişisel olmayan):** sipariş kalemleri, tutarlar, vergi, tarihler, durum, kanal, ülke/il düzeyi.
- **Kalır (yasal saklama):** fatura/e-arşiv belgesi ve faturadaki alıcı bilgisi, saklama süresi dolana kadar, erişimi yalnızca muhasebe iznine bağlı; süre dolunca zamanlanmış işle anonimleştirilir. Süre ayardır (`retention.invoice_years`, varsayılan 10 ⚠️). Kaynaklar VUK için 5, TTK için 10 yıl diyor; çelişki var, hukukçuyla netleştirilmeli.
- Silme talebi 10 gün bekler ve iptal edilebilir (Shopify gibi); dava/denetim varsa mağaza "yasal tutma" işareti koyabilir, anonimleştirme durur.
- Her imha `customer_merges` benzeri bir imha kaydına yazılır, kayıt en az 3 yıl saklanır (KVKK imha yönetmeliği, ikincil kaynak ⚠️).

Doğrulanmayan: VUK/TTK süreleri, mesafeli satış kayıtları için süre, KVKK imha tutanağı süresi (resmi metinlerden kontrol edilmeli).
