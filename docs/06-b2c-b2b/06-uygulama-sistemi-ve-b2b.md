# Uygulama sistemi B2C ve B2B'de

Uygulama modeli tektir ([../04-genisletme/03-tak-calistir-apps.md](../04-genisletme/03-tak-calistir-apps.md)); bu belge onun kanal ve B2B kavramlarıyla nasıl birleştiğini tanımlar.

## 1. Kanal kapsamı

- Uygulama kurulurken **hangi kanallarda** çalışacağı seçilir (varsayılan: hepsi). Token yalnızca o kanalların verisini görür; webhook'lar yalnızca o kanalların olaylarını taşır.
- Her olay gövdesi `channel` taşır. Örnek: Pixel yalnızca B2C kanalında, ERP hepsinde, bir bayi portalı uygulaması yalnızca B2B kanalında.
- Admin uzantıları (iframe) yalnızca kapsamdaki kanal seçiliyken görünür.

## 2. B2B izinleri

Mevcut sözlüğe eklenenler: `companies:read|write`, `companies:approve`, `credit:read|write`, `quotes:read|write`, `price_lists:read|write`, `stock:write`. Şirket ve kredi verisi ticari sırdır; bu izinler kurulum ekranında ayrıca vurgulanır.

## 3. B2B olayları

`company.created`, `company.approved`, `company.suspended`, `company.member_added`, `credit.changed`, `quote.*`, `approval.*`, `price_list.updated`, `order.placed` (şirket ve PO numarasıyla), `order.due_soon`, `order.overdue`.

## 4. B2B bağlama noktaları (admin)

Mevcutlara ek: `company.details.panel`, `quote.details.panel`, `price_list.details.panel`. Müşteri portalına (vitrin) uygulama arayüzü gömülmez; uygulama veriyi API ile yazar, tema gösterir.

## 5. Senkron kancalar

Tür sayısı değişmez (kargo oranı, ödeme, vergi). Kanca isteği B2B bağlamını taşır: şirket `public_id`'si, müşteri grubu, fiyat listeleri. Böylece bir kargo uygulaması bayiye farklı oran dönebilir.

Canlı fiyat ve canlı kredi için senkron kanca **yoktur** ve eklenmeyecektir: ikisi de okuma yolunu veya her sepet hesabını dış servise bağlar. Yol senkrondur (ERP → `prices.setMany`, `credit.set`); istisna gerekiyorsa süreç içi `linePrice` stratejisi yazılır.

## 6. Tipik uygulamalar

| Uygulama | B2C | B2B | Kullandığı |
|---|---|---|---|
| Pixel | ✔ | — | müşteri olayları, `order.placed` |
| ERP | ✔ | ✔ | toplu uçlar, şirket/kredi/fiyat listesi senkronu |
| Pazaryeri | ✔ | — | kanal = besleme, sipariş içe aktarma |
| CRM | — | ✔ | şirket, teklif olayları |
| Kargo | ✔ | ✔ | senkron oran, fulfillment |
| E-fatura | built-in app | built-in app | süreç içi (belge üretimi sipariş zincirinin adımı) |
| Sadakat | ✔ | — | sipariş olayları, metadata |

## 7. Performans

Uygulamalar sıcak yola yalnızca üç senkron kancayla dokunur ve onlar sepet/checkout'tadır. Kanal kapsamı, bir olay için kaç webhook satırı yazılacağını azaltır: abonelik eşleşmesi bellekteki `(olay, kanal) → uygulamalar` tablosundan yapılır, sorgu atılmaz. Abonesi olmayan olay için outbox satırı yazılmaz.
