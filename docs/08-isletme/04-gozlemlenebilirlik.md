# Gözlemlenebilirlik

Amaç: üretimde "ne oldu" sorusunu veriden cevaplamak ve performans hedeflerini ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md)) sürekli ölçmek. Ek servis zorunlu değildir; her şeyin tek süreçte çalışan bir varsayılanı vardır.

## 1. Loglar

- **Yapılandırılmış JSON**, satır başına bir olay, `stdout`'a. Alanlar: `ts`, `level`, `msg`, `requestId`, `channel`, `actor` (tür + public_id), `route`, `status`, `durMs`, `dbQueries`, `dbMs`.
- `requestId` kenarda üretilir (veya gelen `cf-ray` / `x-request-id` kullanılır), `Ctx`'te taşınır, yanıt başlığında döner, outbox satırına ve giden webhook'a yazılır. Böylece bir sipariş, isteğinden e-postasına kadar tek kimlikle izlenir.
- **Kişisel veri loglanmaz:** e-posta, telefon, adres, token, kart verisi yok. Kimlikler `public_id` olarak yazılır. Bu kural bir test ile denetlenir (log çıktısında e-posta deseni aranır).
- Hata logu yığın izini içerir; beklenen iş hataları (`INSUFFICIENT_STOCK`) `info` düzeyindedir, hata değildir.
- Hedefler: Cloudflare'de Workers Logs / Logpush; self-host'ta `stdout` → journald veya Docker log sürücüsü.

## 2. Metrikler

Dört altın sinyal + ticaret sayaçları. Arayüz tek: `metrics.count(name, tags)`, `metrics.time(name, ms, tags)`.

| Grup | Metrikler |
|---|---|
| İstek | sayı, hata oranı, süre (p50/p95/p99), rota ve kanal etiketiyle |
| Veritabanı | istek başına tur sayısı, sorgu süresi, yavaş sorgu sayısı, yazma kuyruğu bekleme süresi |
| Önbellek | isabet oranı (kenar ve veri), temizleme sayısı ve hatası |
| Outbox | bekleyen, en eski satırın yaşı, başarısız, `dead`; türe göre |
| Ticaret | rezervasyon oluşan/reddedilen/süresi dolan, settlement, uzlaştırmanın yakaladığı sipariş, belirsiz iade, stok istisnası |
| Uygulamalar | webhook teslimat süresi ve hatası, senkron kanca süresi ve zaman aşımı; uygulama başına |
| Yedek (self-host) | Litestream gecikmesi |

Hedefler: Cloudflare'de Workers Analytics Engine; self-host'ta `/metrics` (Prometheus biçimi, yalnızca yerel ağ veya token ile). Hiçbiri yapılandırılmamışsa metrikler bellekte tutulur ve admin'in sağlık sayfasında son bir saat gösterilir.

## 3. İzleme (tracing)

İsteğe bağlı OpenTelemetry. Açıkken her istek bir iz, her `atomic()` / sorgu / dış çağrı bir yay olur. oRPC'nin OpenTelemetry bütünleştirmesi kullanılır. Varsayılan kapalıdır; örnekleme oranı ayarlıdır. **Bu, mağaza sahibinin kendi arka ucuna giden izlemedir; OpenMers'e hiçbir veri göndermez** (kullanım telemetrisi yoktur, [../04-genisletme/07-built-in-app-gelistirme.md](../04-genisletme/07-built-in-app-gelistirme.md) bölüm 18).

Vendure'un OpenTelemetry rehberinden (`how-to/telemetry`, v3.3+ `@vendure/telemetry-plugin`; sayfa tam okundu) alınan kararlar:

- **İzler ve loglar OTLP ile** mağaza sahibinin seçtiği arka uca gider (Vendure rehberi Jaeger + Loki + Grafana kullanıyor; Prometheus, Zipkin, Sentry, Dynatrace'in de olabileceğini söylüyor ama yapılandırma vermiyor). Yapılandırma standart OTel ortam değişkenleriyle (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_LOGS_EXPORTER`); özel ayar anahtarı icat edilmez. Yayıcılar **toplu (batch)** çalışır, istek yolunu beklemez.
- **Sunucu ve worker ayrı servis adıyla** ayırt edilir (`service.name=openmers-api` / `openmers-worker`); aynı iş (outbox satırı) iz kimliğiyle API'den worker'a bağlanır (`requestId` ↔ `trace_id`).
- **Kararlı anlamsal adlandırma baştan:** span öznitelikleri güncel kararlı adlarla yazılır (`http.request.method`, `http.response.status_code`, `db.query.text`). Vendure sonradan eski adları değiştirmek zorunda kalmış ve eski adı kullanan panolar boşalmış. `db.user` ve bağlantı dizesi yay'a **yazılmaz**.
- **Hassas sorgu parametreleri maskelenir:** gelen istek yaylarında `url.query` içinde imza ve token parametreleri `REDACTED` olur (`sig`, `Signature`, `X-Amz-Signature`, tek kullanımlık giriş/geçiş kodu, onay e-postasındaki karar bağlantısı jetonu, davet jetonu, paylaşım jetonu). Liste ayarlanır, varsayılan liste güvenlidir. "Kişisel veri loglanmaz" kuralı ([bölüm 1](#1-loglar)) **izlere de** uygulanır; yay özniteliğinde e-posta, telefon, adres, kart verisi yok, ve test log gibi izde de e-posta desenini arar.
- **Dış çağrı yayları** (ödeme sağlayıcı, e-fatura, ERP, uygulama webhook'u) hedef ana makine adını taşır, gövdeyi değil.
- **Elle yay (`@Instrument()` karşılığı):** servis işlevlerine `traced(name, fn)` sarmalayıcısı; handler (oRPC prosedürü) sarılmaz, çünkü oRPC bütünleştirmesi zaten yay açar (Vendure aynı sebeple resolver/controller üzerinde kullanmayı uyarıyor).
- **Özel enstrümantasyon listesi varsayılanı ezer, birleştirmez** (Vendure'da böyle); bizde yapılandırma varsayılan listeye **ekler**, ezmez.
- **Sürüm sabitleme:** OTel paketleri birbirine bağlı sürümlerle çalışır; Vendure rehberi hepsini sabit sürümle yazıyor. Bizde OTel bağımlılıkları tek yerden sabitlenir ve birlikte yükseltilir.
- **Cloudflare Workers yolu (Cloudflare belgeleri okundu, 2026-11-12; kullanıcı da çalıştığını bildirdi):** Node SDK'sı gerekmez, Workers'ın **yerleşik OTLP dışa aktarımı** kullanılır. Yapılandırma `wrangler` dosyasında `observability.traces` ve `observability.logs` (`enabled`, `destinations`, `head_sampling_rate`, `persist`); hedefler (OTLP uç noktası + özel başlıklar) hesap düzeyinde panelden (Observability > Destinations) tanımlanır, kodda sır yok. Otomatik yaylar: handler, `fetch`, KV/R2/Durable Object, RPC, **D1** (`db.query.text`, okunan/yazılan satır sayısı). Özel yay: `cloudflare:workers` içindeki `tracing.enterSpan(ad, fn)` / `ctx.tracing`; `traced(name, fn)` sarmalayıcımız Workers'ta bunu, Node'da OTel API'yi çağırır (platform portunun parçası). `console.log` aktif yaya bağlanır. Başlıca kısıtlar: **traces open beta** (yay ve öznitelik adları değişebilir, bu yüzden yukarıdaki "kararlı ad" kuralı Workers'ta Cloudflare'in adlarına uyar, adlandırma bizim elimizde değil); **metrik dışa aktarılmaz** (metriklerimiz zaten Analytics Engine'e gider, bölüm 2); OTLP **ikili (protobuf) biçim desteklenmez**; Cloudflare dışı servislere `traceparent` **otomatik taşınmaz** (bu yüzden `requestId` ↔ `trace_id` eşlemesi yalnızca Cloudflare içi çağrılarda ve kendi `requestId` alanımızla kurulur; dış servis için bağlantı elle, `requestId` ile); örnekleme **head tabanlı**, kodda görünmez; span başına ~64 KB öznitelik sınırı, ad 64 bayt. Maliyet: kalıcı log/iz kullanımı **1 Aralık 2026'dan itibaren** Observability kotasına sayılır (Free 0,5 GB/gün; Paid 50 GB dahil, sonrası 0,25 $/GB); `persist: false` ile yalnızca dış hedefe gönderilir, bunun faturalamaya etkisi sayfalarda açık değil. Node (self-host) yolu yukarıdaki `OTEL_*` ortam değişkenleridir.

## 4. Yavaş sorgu kaydı

Veritabanı sarmalayıcısı her sorgunun süresini ölçer. Eşiği (varsayılan 50 ms) aşan sorgu, SQL metni (parametresiz) ve rota ile loglanır. İstek başına tur bütçesi aşılırsa da uyarı düşer. Geliştirme kipinde bütçe aşımı hata fırlatır.

## 5. Sağlık uçları

- `GET /healthz`: süreç ayakta (bağımlılık kontrolü yok).
- `GET /readyz`: veritabanına yazılabilir, migration sürümü güncel, kasa anahtarı var.
- Admin "Sistem" sayfası: sürüm, migration durumu, outbox özeti, son zamanlanmış görev çalışmaları, yedek durumu, kurulu built-in app ve uygulamalar.

## 6. Alarmlar

Belirtiye göre, nedene göre değil. Varsayılan kurallar (eşikler ayarlanır):

| Belirti | Eşik |
|---|---|
| Checkout hata oranı | 5 dakikada > %2 |
| Outbox'ta en eski bekleyen satır | > 15 dakika |
| `dead` satır oluştu | herhangi |
| Uzlaştırma, webhook'un kaçırdığı sipariş buldu | herhangi (bilgi) |
| Belirsiz iade veya stok istisnası | herhangi |
| Zamanlanmış görev çalışmadı | 2 dönem |
| Fatura süresi (`legal_policy` ayarı) geçen sipariş | herhangi |
| Litestream gecikmesi | > 5 dakika |
| p95 katalog API süresi | hedefin 2 katı, 10 dakika |

Teslimat: mağaza sahibine e-posta (outbox'tan) ve isteğe bağlı webhook (Slack, PagerDuty). Alarm teslimatının kendisi outbox'a bağlı olduğundan, outbox'ın tamamen durması harici bir "ölü adam anahtarı" ile yakalanır: süreç belirli aralıkla dış bir adrese işaret gönderir (isteğe bağlı, self-host belgesinde önerilir).

## 7. Hata izleme

Sentry (isteğe bağlı). Beklenmeyen istisnalar `requestId`, rota, kanal ve sürüm etiketiyle gönderilir; kişisel veri temizlenir. Storefront ve mobil için istemci tarafı hata toplama ayrı DSN ile.

## 8. Maliyet

Log ve metrik yazımı istek yolunu yavaşlatmaz: Workers'ta `waitUntil`, Node'da tamponlu yazma. Sorgu ölçümü birkaç mikrosaniyedir ve her zaman açıktır.
