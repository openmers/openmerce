# Çok kiracılı barındırma (SaaS)

Bu belge, OpenMers'i birçok mağaza sahibine barındırılan hizmet olarak sunmak içindir. Tek mağaza veya tek şirketin birkaç sitesi için gerekmez; onun aracı kanaldır ([../05-ticaret/01-kanallar.md](../05-ticaret/01-kanallar.md)).

**Kiracı ≠ kanal.** Kiracı = bir müşterinin tüm mağazası (verisi, yöneticileri, ayarları). Kanal = o mağazanın içindeki bir satış yüzeyi.

## 1. Yalıtım modeli: kiracı başına veritabanı

| | Kiracı başına veritabanı (seçilen) | Tek veritabanı + `tenant_id` |
|---|---|---|
| Veri sızıntısı riski | Yapısal olarak yok | Her sorguda filtre unutma riski |
| D1 10 GB sınırı | Kiracı başına | Hepsi için tek sınır |
| Yazma sınırı (tek yazıcı) | Kiracı başına; biri diğerini yavaşlatmaz | Ortak |
| Yedek / geri yükleme / silme | Kiracı bazında basit | Zor |
| Çekirdek kodu | **Değişmez** (tek mağaza gibi çalışır) | Her tabloya sütun |
| Migration | Tüm veritabanlarına yayılmalı | Tek sefer |

Çekirdek kiracıdan habersizdir: `Platform.db` zaten doğru veritabanıdır.

## 2. Yönlendirme

1. İstek gelir; `Host` → kiracı eşlemesi **kontrol düzlemi** önbelleğinden okunur (KV).
2. Kiracının veritabanı, depolama öneki ve kasa anahtarı ile `Platform` kurulur.
3. Sonrası tek mağaza akışıdır (kanal çözümleme dahil).

Cloudflare'de: tek Worker + kiracı başına D1. *Bir Worker'a bağlanabilen D1 sayısı sınırlıdır; çok sayıda kiracı için veritabanına çalışma anında erişim yolu (D1 HTTP API veya Workers for Platforms ile kiracı başına Worker) gerekir. Güncel sınırlar ve önerilen yol Cloudflare belgesinden doğrulanmadı; bu, SaaS tasarımının ilk doğrulanacak maddesidir.*

Özel alan adları: Cloudflare for SaaS (müşteri alan adı + otomatik TLS).

## 3. Kontrol düzlemi

Ayrı, küçük bir uygulama ve kendi veritabanı:

- `tenants`: kimlik, durum (`provisioning · active · suspended · deleted`), plan, bölge, veritabanı kimliği, şema sürümü.
- `tenant_domains`: alan adı → kiracı.
- Abonelik ve fatura, kullanım sayaçları (sipariş, depolama, istek).
- Kiracı açma: veritabanı oluştur → migration uygula → tohum veri → kasa anahtarı üret → alan adı bağla. Her adım idempotent bir iş; yarıda kalırsa kaldığı yerden sürer.
- Askıya alma: vitrin "geçici olarak kapalı" sayfası döner, admin salt okunur.
- Silme: yasal saklama süresi sonunda veritabanı ve depolama öneki silinir.

Kontrol düzlemi kiracı verisine erişmez; destek erişimi kiracının onayıyla, süreli ve denetim kayıtlı bir yönetici hesabıyla olur.

## 4. Migration yayılımı

- Deploy önce kodu çıkarır (kod, bir önceki şema sürümüyle de çalışır; migration'lar eklemelidir).
- Ardından bir iş, kiracıları gruplar hâlinde gezer ve migration uygular; `tenants.schema_version` güncellenir.
- İstek anında kiracının şema sürümü kodun beklediğinden eskiyse ve migration küçükse tembel uygulanır; değilse o kiracı kısa süre bakım yanıtı alır.
- Önce kanarya kiracılar, sonra kalanlar. Başarısız kiracı listelenir, diğerleri devam eder.

## 5. Sırlar

Her kiracının kendi kasa anahtarı (KEK) vardır; kontrol düzleminin ana anahtarıyla sarılı saklanır. Bir kiracının veritabanı sızsa bile diğerinin sırları çözülemez.

## 6. Genişletme

Barındırılan kurulumda kiracı **built-in app ekleyemez** (derleme ortak). Yol uygulamalardır ([../04-genisletme/03-tak-calistir-apps.md](../04-genisletme/03-tak-calistir-apps.md)). Resmî pluginlerin hepsi derlemeye dahildir ve kiracı başına ayarla açılır.

## 7. Adil kullanım

Kiracı başına hız sınırı, iş kuyruğunda kiracı başına eşzamanlılık sınırı, depolama ve giden e-posta kotası. Gürültülü kiracının işleri diğerlerinin önüne geçemez.

## 8. Kapsam

Bu belge yön gösterir; v1'de uygulanmaz. Tek koşul: çekirdek, kiracı başına veritabanı varsayımını bozacak bir şey yapmamalı (süreç genelinde paylaşılan önbellek anahtarları kiracı öneki taşımalı). Bellek içi sıcak yapılandırma anahtarı bu yüzden `(tenant, key)`'dir.
