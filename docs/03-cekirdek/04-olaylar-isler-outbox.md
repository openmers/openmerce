# Olaylar, işler ve outbox


Yan etkiler siparişle **aynı `atomic()` içinde** `outbox` tablosuna satır olarak yazılır. Sipariş varsa bildirimi de vardır; arada kaybolacak bir şey yoktur.

Teslimat ayrı ve tekrarlanabilir bir adımdır:

1. **Sahiplen:** `UPDATE outbox SET status='sending', claimed_at=now WHERE id=? AND status IN ('pending','failed')` — satır dönmezse başkası almıştır.
2. **Gönder.**
3. **İşaretle:** başarıysa `sent`, değilse `failed` + deneme sayısı.

Teslimat en az bir kez garantilidir; sağlayıcı idempotency anahtarı destekliyorsa satır kimliği kullanılır.

**Ölü satırlar kaybolmaz.** Deneme sınırını aşan satır `dead` olur, son hatasıyla birlikte admin panelinde listelenir ve elle yeniden kuyruğa alınabilir. `dead` satır oluşması mağaza sahibine bildirim üretir. Bu tablo tüm yan etkiler için tek dead-letter kuyruğudur.

**Ayrı bir workflow motoru yoktur.** Çok adımlı süreçler (ödeme → sipariş → e-fatura → ERP → bildirim) şöyle kurulur: veritabanı adımları tek `atomic()`, dış sistem adımlarının her biri kendi outbox satırı. Her adım idempotenttir ve bağımsız yeniden denenir; bir sonraki adımı tetiklemesi gereken adım, başarıyla birlikte yeni outbox satırını yazar. Telafi (compensation) gereken tek yer stoktur ve o da rezervasyon serbest bırakmadır.

Tetikleyiciler (hepsi aynı kodu çağırır, hepsi idempotent):

| Tetikleyici | Cloudflare | Self-host |
|---|---|---|
| Sipariş anında | `waitUntil` veya Queues mesajı | poller'ı uyandırma |
| Webhook yeniden teslimatı | Yarım kalan gönderimleri tamamlar | aynı |
| Zamanlanmış süpürme (5 dk) | Cron Trigger | süreç içi zamanlayıcı |

Cron aynı zamanda süresi dolmuş rezervasyonları serbest bırakır. Minshop'un çıkardığı ders: bu işler yalnızca gelen trafiğe bağlanırsa, mağaza ne kadar sakinse stok o kadar uzun kilitli kalır.

Kuyruk altyapısı (Queues / `jobs` poller) yalnızca tetikleyicidir; doğruluk kaynağı her iki hedefte de `outbox` tablosudur.

## Olaylar (event bus)

Vendure'un `EventBus`'ının karşılığıdır, ama olaylar bellekte değil **satır olarak** doğar.

- Bir komut, kendi `atomic()`'i içinde olay satırını outbox'a yazar (`order.placed`, `product.updated`, `stock.bucket_changed`, `company.approved` …). Komut başarılıysa olay vardır; komut geri alındıysa olay yoktur.
- Aboneler üç türdür ve hepsi aynı satırlardan beslenir:

| Abone | Çalışma yeri | Örnek |
|---|---|---|
| Çekirdek işleri | Worker | yeniden indeksleme, koleksiyon üyeliği, e-posta |
| Built-in app aboneleri | Worker, süreç içi | sadakat puanı yazma, özel rapor tablosu |
| Uygulama webhook'ları | Worker → HTTP | Pixel, ERP, üçüncü taraflar |

- Abone istek içinde çalışmaz. İstek içinde davranış değiştirmek gerekiyorsa o iş olay değil **stratejidir** ([../04-genisletme/01-stratejiler-ve-operasyonlar.md](../04-genisletme/01-stratejiler-ve-operasyonlar.md)).
- Her abone idempotent olmak zorundadır; teslimat en az bir kezdir. Olay kimliği idempotency anahtarıdır.
- Olay gövdesi küçüktür (kimlikler + değişen alan adları); abone güncel veriyi kendisi okur. Böylece sırasız teslimat zararsızdır.

## İş türleri

Outbox tablosu aynı zamanda iç iş kuyruğudur (`kind` sütunu). Ayrı bir `jobs` tablosu yoktur.

| Tür | Örnek | Not |
|---|---|---|
| `notify` | e-posta, SMS | sağlayıcı idempotency anahtarı = satır kimliği |
| `webhook` | uygulama teslimatı | HMAC imzalı |
| `reindex` | `catalog_index` / `product_view` güncelleme | aynı ürün için bekleyen satır varsa yenisi eklenmez (birleştirme) |
| `collection` | koleksiyon üyeliğini yeniden hesaplama | parçalı |
| `import` | toplu içe aktarma parçası | imleç satırda |
| `invoice`, `fulfillment` | e-fatura, kargo etiketi | adım zinciri |
| `scheduled` | zamanlanmış görevin bir çalışması | aşağıda |

Öncelik: `notify` ve `webhook` sipariş akışına aittir ve önce işlenir; `reindex` ve `import` yazma hızı sınırlı çalışır ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md) bölüm 6).

## Zamanlanmış görevler

Görevler kodda tanımlanır (ad, cron ifadesi, işlev); built-in app'ler de ekleyebilir. Birden çok kopya veya çağrı aynı anda tetiklense bile görev bir kez çalışır: çalıştırma, `scheduled_runs(görev, dönem)` satırını eklemeye koşulludur (benzersiz kısıt). Çekirdek görevler: süresi dolan rezervasyonları bırakma, outbox süpürme, ödeme uzlaştırma, terk edilmiş sepet, süresi dolan teklifler, vadesi geçen faturalar, yedek doğrulama.
