# Kredi ve ödeme koşulları

## 1. Vadeli ödeme yöntemi

`terms` yerleşik bir `PaymentHandler`'dır. Admin bir ödeme yöntemi olarak tanımlar ("30 gün vadeli"); uygunluk denetleyicisi yalnızca onaylı ve vadesi tanımlı şirketlere sunar. Kart ve havale B2B'de de aynen kullanılabilir.

## 2. Kredi

**`company_credit`**: `company_id`, `currency`, `credit_limit`, `used`, `erp_used?` (yalnız ERP kipinde, ERP yazar), `version`. Her sütunun tek yazıcısı vardır: `used` mağaza, `erp_used` ERP.
**`credit_ledger`**: eklemeli kayıt: `order · payment · refund · adjustment`, tutar, referans.

Kullanılabilir = `credit_limit − COALESCE(erp_used, 0) − used`.

Vadeli siparişte settlement `atomic()`'ine bir koşullu ifade eklenir:

```sql
UPDATE company_credit SET used = used + :total
 WHERE company_id = :c AND currency = :cur
   AND COALESCE(erp_used, 0) + used + :total <= credit_limit
   AND EXISTS (SELECT 1 FROM orders WHERE id = :o AND settlement_token = :t)
```

Sipariş ekleme ifadesi de kredinin yeterli olduğu koşuluna bağlıdır; kredi yetmezse sipariş oluşmaz, rezervasyon bırakılır ve alıcıya başka ödeme yöntemi sunulur. Aynı şirketten iki eşzamanlı sipariş limiti birlikte aşamaz (stokla aynı desen).

`orderPlaced` stratejisi vadeli siparişi ödeme beklemeden kesinleştirir; siparişin ödeme durumu `awaiting` kalır.

## 3. Tahsilat

- Ödeme geldiğinde (havale eşleştirme, admin kaydı, ERP'den gelen tahsilat) `payments` satırı + `credit_ledger` + `used −` tek `atomic()`.
- İade ve iptal kullanılan krediyi geri verir.
- **Vade:** sipariş `due_at` taşır. Zamanlanmış görev vadesi geçenleri işaretler, hatırlatma olayı üretir; ayarlanan gecikmede şirket yeni vadeli sipariş veremez (uygunluk denetleyicisi), kartla verebilir.

## 4. ERP ile ilişki

Çoğu B2B kurulumunda cari hesabın sahibi ERP'dir. İki kip:

| Kip | Limit ve bakiye | Not |
|---|---|---|
| Mağaza sahibi | Mağazada yönetilir | ERP'si olmayan veya basit kurulum |
| ERP sahibi | ERP uygulaması `company_credit.credit_limit` ve `erp_used` değerlerini senkronla yazar | Mağaza yalnız `used`'a kendi açık (ERP'nin henüz görmediği) siparişlerini yazar; ERP onayladıkça `used`'dan düşer (stoktaki çift düşme sorununun aynısı, aynı çözüm) |

Checkout'ta ERP'ye canlı kredi sorgusu **atılmaz**; senkron değer + mağazanın kendi taahhütleri kullanılır.

## 5. Müşteriye gösterim

Hesap sayfasında limit, kullanılan, vadesi yaklaşan siparişler ve ekstre (`credit_ledger`). `no-store`, yalnızca şirket `admin` rolüne ve ayarla alıcılara.

## 6. Kapsam dışı (şimdilik)

Çek/senet, erken ödeme iskontosu, vade farkı faizi, ana şirket ortak limiti, çoklu para biriminde tek limit.
