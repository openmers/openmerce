# Platform arayüzü (iki hedef, tek kod)

`core` içindeki her fonksiyon ihtiyacı olanı `ctx` üzerinden alır; global `env` okumaz. `apps/api` açılışta hedefe göre tek bir `Platform` nesnesi kurar.

| Alan | Görev | Cloudflare | Self-host |
|---|---|---|---|
| `db` | Drizzle örneği (yazma + tutarlı okuma) | D1 | better-sqlite3 (tek yazma bağlantısı) |
| `readDb` | Vitrin okumaları | D1 okuma oturumu (kopya) | salt-okunur ikinci bağlantı |
| `atomic(stmts)` | Hepsi ya da hiçbiri yazma | `db.batch()` | senkron transaction |
| `batch(queries)` | Bağımsız okumaları tek turda gönderme | `db.batch()` | sırayla (süreç içi) |
| `storage` | Dosya koy / al / sil | R2 | disk veya S3 |
| `cache` | Veri önbelleği (oturum, sıcak yapılandırma) | KV + istek ömürlü bellek | bellek içi LRU |
| `purge(tags)` | HTTP önbelleği temizleme | Cache purge API | reverse proxy / yok |
| `enqueue(job)` | İş tüketicisini dürtme | Queues veya `waitUntil` | poller'ı uyandırma |
| `rateLimit(key)` | İstek sınırlama | Rate Limiting binding | bellek içi sayaç |
| `secrets.kek` | Kasa anahtarı | Worker secret | ortam değişkeni |
| `images` | Yüklemede boyut üretme | Images binding | `sharp` (yalnızca Node adaptöründe) |

## 1. `atomic()` sözleşmesi

Kural: `atomic(stmts)` hazır ifadeler dizisi alır (`db.batch()`); interaktif `atomic(async (tx) => ...)` biçimi D1'de yoktur ve kullanılmaz. Koşullu yazma `UPDATE ... WHERE` ile ifadenin içinde yapılır.

- İfadeler sırayla ve tek birim olarak uygulanır; biri hata verirse hiçbiri kalmaz.
- İfadeler **koşulludur**: sonraki ifade, öncekinin yazdığı satırın varlığına bağlanır (`WHERE EXISTS (...)`, `WHERE token = ?`). Böylece "oku, karar ver, yaz" gerekmez.
- Dönüş değeri her ifadenin etkilediği satır sayısıdır; çağıran "kazandım mı" sorusunu buradan okur.
- Süreç içi kilit yoktur. Birden çok kopya veya Worker çağrısı aynı anda çalışabilir; tek eşzamanlılık aracı koşullu yazmadır.

Bu sözleşme D1'in `batch()`'ine göre yazılmıştır; self-host aynı ifadeleri bir transaction içinde çalıştırır. Self-host'ta interaktif transaction mümkün olsa da kullanılmaz, çünkü aynı kod D1'de çalışmak zorundadır.

**Karar (`AtomicStatement` biçimi):** ifade, Drizzle sorgusunun `toSQL()` çıktısıdır: `{ sql: string; params: unknown[] }` (`packages/core/src/platform/atomic.ts`). Gerekçe: Drizzle'ın `better-sqlite3` sürücüsünde `batch` yok; bu düz biçimi better-sqlite3 `prepare(sql).run(...params)` ve D1 `prepare(sql).bind(...params)` dönüştürmeden alır, sürücüye ve çalışma zamanına bağlı değildir. Değerler `toSQL()` sırasında sütun eşlemesinden geçtiği için (JSON, zaman) iki hedefte aynıdır. `batch(queries)` aynı biçimi kullanır ve ham satırları (snake_case sütun adları) döner.

## 2. Kural

Bir özellik iki hedefte de çalışmıyorsa `core`'a girmez; isteğe bağlı built-in app olur ve binding yoksa sessizce devre dışı kalır (e-posta, görsel optimizasyonu, vektör arama).

Backend kodunda `node:*` yoktur: Fetch, Web Crypto, Streams. Node'a özgü kod yalnızca `apps/api/src/platform/node.ts` ve Node adaptörlerinde bulunur.

## 3. Süreç kipleri

| Kip | Cloudflare | Self-host |
|---|---|---|
| API | Worker `fetch` | `node dist/server.js` |
| İş tüketicisi | Queue consumer + Cron Trigger (ayrı çağrılar) | varsayılan aynı süreçte; `--worker` ile ayrı süreç |

Vendure'un server/worker ayrımının karşılığıdır: kod aynı, giriş noktası farklı. İşler doğruluk için kuyruğa değil outbox tablosuna dayanır ([04-olaylar-isler-outbox.md](04-olaylar-isler-outbox.md)).
