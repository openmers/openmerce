# Şirket hesapları

## 1. Tablolar

| Tablo | İçerik |
|---|---|
| `companies` | `public_id` (`com_`), unvan, `tax_id`, `tax_id_type` (ülkeye özgü alanlar `custom_fields`'ta), `status` (`pending · approved · suspended`), `parent_id?`, satış temsilcisi, `payment_terms_days`, `custom_fields`, `version` |
| `company_members` | `company_id`, `customer_id`, `role`, `spend_limit?`, `status` |
| `company_addresses` | teslimat ve fatura adres defteri (şube, depo) |
| `company_channels` | şirket hangi kanallarda satın alabilir |
| `company_credit` | [05-kredi-ve-odeme-kosullari.md](05-kredi-ve-odeme-kosullari.md) |

Bir müşteri birden çok şirketin üyesi olabilir; oturumda **etkin şirket** seçilidir ve `ctx.company` odur. Etkin şirket değişince segment yeniden hesaplanır.

## 2. Roller

| Rol | Yapabildiği |
|---|---|
| `admin` | Üye davet etme/çıkarma, limit belirleme, adres defteri, tüm siparişler |
| `approver` | Onay bekleyen sepetleri onaylama/reddetme |
| `buyer` | Sipariş verme (limitine kadar), kendi siparişleri; ayarla şirketin tüm siparişleri |
| `viewer` | Katalog ve fiyat görme, sepet hazırlama; sipariş veremez |

Bunlar müşteri tarafı rollerdir; yönetici rolleriyle (admin paneli) ilgisi yoktur. Yetki kontrolü `core` içindedir: her sorgu `company_id = ctx.company.id` filtresi taşır.

## 3. Başvuru ve onay

1. Başvuru formu: şirket bilgileri + ilk kullanıcı. Şirket `pending` oluşur.
2. Mağaza yöneticisi (`companies:approve` izni) inceler; onayda fiyat listesi, vade, kredi limiti ve satış temsilcisi atanır.
3. `company.approved` olayı: hoş geldin e-postası, ERP'de cari açma (ERP uygulaması bu olayı dinler).

Vergi numarası doğrulaması bir built-in app kancasıdır (bekçi); çekirdek yalnızca biçim denetler.

## 4. Hiyerarşi

`parent_id` ile ana şirket / şube. v1'de yalnızca raporlama ve ortak fiyat listesi içindir; kredi limiti şirket başınadır. Ortak kredi havuzu sonradan.

## 5. Satış temsilcisi

Temsilci bir yöneticidir. `orders:create_on_behalf` izniyle admin panelinden şirketi ve üyeyi seçip onun bağlamında (`ctx.company`, fiyat listeleri) sepet oluşturur; aynı hesaplama boru hattı çalışır. Sipariş `placed_by` ile temsilciyi, `customer_id` ile müşteriyi kaydeder. Temsilci elle satır indirimi verebilir (izin ve tavan oranıyla); bu bir `order_adjustments` satırıdır.

## 6. Askıya alma

`suspended` şirketin üyeleri giriş yapabilir, geçmişi görebilir, sipariş veremez. Kontrol rezervasyon `atomic()`'inde koşuldur (`AND EXISTS (şirket 'approved')`); askıya alma ile eşzamanlı checkout yarışı kaybeder.

## 7. Performans

Şirket, üyelik, rol ve limit oturumda taşınır. Üyelik veya şirket durumu değişince etkilenen oturumların sürümü artırılır; sonraki istekte bir kez yeniden yüklenir.
