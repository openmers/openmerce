# Genel bakış

OpenMers tek bir çekirdekle B2C ve B2B satışı yapan, Cloudflare Workers (D1/R2) veya tek Node süreci (SQLite) üzerinde çalışan bir ticaret altyapısıdır.

Birincil örnek **Vendure**'dur: kanal, strateji, yapılandırılabilir operasyon, özel alan, arama indeksi ve işçi (worker) kavramları oradan alındı. Saleor'dan dışarıda çalışan uygulama modeli, Medusa'dan fiyat listesi ve adım adım idempotent süreç fikri, minshop'tan D1 üzerindeki atomik yazma desenleri geldi. Hangi karar kimden, neden: [02-vendure-saleor-medusa-kararlar.md](02-vendure-saleor-medusa-kararlar.md).

## 1. Katmanlar

```
 storefront (Astro SSR)   admin (SvelteKit SPA)   mobile (Expo)   uygulamalar (dış servis)
          │                        │                     │                  │
          └──────────── oRPC istemcisi (packages/contract) ─────────────────┘
                                   │
                  apps/api   Shop API  ·  Admin API   (Hono + oRPC, ince handler)
                                   │
                              Ctx (istek bağlamı: kanal, dil, para birimi, müşteri, fiyat listeleri)
                                   │
        packages/core   features/*  (iş mantığı)  ←  stratejiler · operasyonlar · built-in app'ler
                                   │
              ┌────────────────────┼─────────────────────┐
        yazma modeli          okuma modeli           olaylar + işler
     (normalize tablolar)   (catalog_index,        (outbox/jobs tablosu,
                             hazır sunum JSON'u)     worker)
                                   │
                        Platform arayüzü (portlar)
                    ┌──────────────┴──────────────┐
           Cloudflare adaptörleri          Self-host adaptörleri
        D1 · R2 · KV · Queues · Cron     SQLite · disk/S3 · LRU · poller
```

**Bağımlılık yönü tek taraflıdır:** `apps/*` → `packages/core` → `packages/db`, `packages/contract`. `core` hiçbir zaman Hono'yu, Cloudflare binding'lerini veya bir sağlayıcı SDK'sını import etmez.

## 2. Beş kavram

Yeni gelen birinin öğrenmesi gereken her şey:

| Kavram | Ne | Belge |
|---|---|---|
| **Feature** | Bir alanın tabloları, sorguları ve saf mantığı tek klasörde | [04-monorepo-klasor-yapisi.md](04-monorepo-klasor-yapisi.md) |
| **Ctx** | Her çağrıya geçen istek bağlamı (Vendure `RequestContext`) | [../03-cekirdek/02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md) |
| **`atomic()`** | Hepsi ya da hiçbiri, koşullu yazma; tek eşzamanlılık aracı | [../03-cekirdek/01-platform-arayuzu.md](../03-cekirdek/01-platform-arayuzu.md) |
| **Outbox / iş** | İstek dışında, tekrarlanabilir her şey | [../03-cekirdek/04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md) |
| **Strateji / operasyon** | Çekirdek davranışını değiştirmenin tek yolu | [../04-genisletme/01-stratejiler-ve-operasyonlar.md](../04-genisletme/01-stratejiler-ve-operasyonlar.md) |

## 3. Üç genişletme katmanı

| Katman | Nerede çalışır | Kurulum | Ne zaman |
|---|---|---|---|
| **Strateji / operasyon** | Süreç içinde | `store.config.ts` | Çekirdeğin tek bir kararını değiştirmek (fiyat seçimi, depo seçimi, sipariş numarası) |
| **Built-in app** | Süreç içinde, derlemeye dahil | `store.config.ts` + deploy | Yeni tablo, API ucu, iş, admin ekranı; en hızlı yol |
| **Uygulama (App)** | Dışarıda, HTTP ile | Admin panelinden, deploy yok | Üçüncü tarafın yazdığı, mağaza sahibinin tıklayıp kurduğu entegrasyon |

Ayrıntı: [../04-genisletme/](../04-genisletme/).

## 4. B2C ve B2B aynı çekirdek

B2B ayrı bir ürün değil, aynı tabloların üstünde ek kavramlardır: şirket hesabı, fiyat listesi, vade/kredi, teklif, onay. Bir **kanal** B2C, B2B veya karma olabilir. Ayrıntı: [../06-b2c-b2b/](../06-b2c-b2b/).

## 5. Değişmezler (bozulursa hata sayılır)

1. "Oku, karar ver, yaz" yok; her komut tek `atomic()` ve koşullu ifadelerdir.
2. `orders` tablosunda yalnızca **kesinleşmiş** sipariş bulunur (ödenmiş, provizyonu alınmış veya onaylı vadeli). Sepet sipariş değildir.
3. Yan etki (e-posta, webhook, ERP, indeks) istek içinde yapılmaz; aynı `atomic()` içinde outbox'a yazılır.
4. Vitrin okuma yolu normalize tablolara join atmaz; okuma modelinden okur.
5. Paylaşımlı önbelleğe kişiye özel içerik girmez; önbellek anahtarı en fazla **segment** (kanal + dil + para birimi + fiyat listesi) taşır.
6. İç tamsayı kimlik API sınırını geçmez.
7. Tutarlar tamsayı küçük birimdir.
8. Bir feature başka bir feature'ın tablosuna yazmaz.
9. İki hedefte (Workers ve Node) çalışmayan kod `core`'a girmez.
