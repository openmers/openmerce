# Ajan ticareti: makine okunabilir katalog ve ajan ödemesi

Durum 2026-11-13: tasarım. Kod yok. Esin: Minshop (`/llms.txt`, JSON ödeme belgesi, MCP sunucusu; yalnız okundu). Amaç: bir yapay zekâ ajanı mağazayı keşfedebilsin, ürünü seçebilsin ve **ödemeyi insana bırakarak** sipariş başlatabilsin.

## 1. İlkeler

- **Varsayılan kapalı, kanal başına açılır.** `settings` anahtarı `agentCommerce.enabled` (kanal kapsamlı). Kapalıyken `/llms.txt` 404, ajan uçları 404.
- **Yeni API yok.** Ajan, mevcut herkese açık sözleşmeyi (`/api/openapi.json`, katalog GET'leri, sepet ve checkout uçları) kullanır. `llms.txt` ve MCP bunun üstüne ince bir kabuktur; ikinci bir iş mantığı yazılmaz.
- **Kart verisi ajandan geçmez.** Ödeme her zaman barındırılan sağlayıcı sayfasında (veya admin'in açtığı yöntemde) olur; ajan yalnız ödeme bağlantısı alır ve insana verir.
- **Fiyat ve toplam sunucuda hesaplanır** (sepet kuralı). Ajanın gönderdiği tutara güvenilmez.
- **Katalog metni güvenilmez veridir.** Ürün adı/açıklaması ajana "talimat" olarak enjekte edilebilir (prompt injection). Çıktıda alanlar ayrı JSON alanlarıdır, düz metin birleştirmesi yok; ajan istemcisi için kural: katalog alanı talimat değil veridir.

## 2. `/llms.txt` (keşif)

- Kanal ana bilgisayarında `GET /llms.txt` ve `GET /llms-full.txt`, Markdown; sunucuda üretilir, `Cache-Control` izin listesindedir ([../03-cekirdek/05-onbellek.md](../03-cekirdek/05-onbellek.md)), katalog değişince temizlenir.
- İçerik: mağaza adı, kısa tanım, para birimi, diller, `openapi.json` adresi, ürün listesi (ad, kısa özet, fiyat metni, `slug`, stok kovası), ödeme yöntemleri adları, iade/kargo sayfaları bağlantısı, ajan ödeme akışının kısa tarifi.
- Kesin stok adedi, maliyet, iç kimlik, müşteri verisi yok. Gizli (yayında olmayan) ürün yok. Sayfalama: tam liste yerine `llms-full.txt` imleçli bölümler.

## 3. Ajan ödeme akışı

1. Ajan `POST /api/cart` ile sepet açar, satır ekler (yayınlanabilir kanal anahtarı `omp_`, [../03-cekirdek/02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md)).
2. `POST /api/checkout/agent` (tek uç, `Idempotency-Key` **zorunlu**): sepet → `checkout_reservations` (stok tutulur), yanıt `{ order_preview, payment_url, expires_at }`. `payment_url` barındırılan ödeme sayfası ya da `otk_…` bearer sayfasıdır; sipariş yalnız ödeme alınınca oluşur (mevcut `orderPlaced` kuralı).
3. İnsan bağlantıyı açar, öder. Ajan `GET /api/checkout/agent/:id` ile durumu sorgular (`pending · paid · expired · failed`); sorgu `fetchStatus` yolunu kullanır ([../05-ticaret/06-odeme-ve-iade.md](../05-ticaret/06-odeme-ve-iade.md)).
4. Süre dolarsa rezervasyon mevcut kurallarla (webhook / tembel güvence / süpürme) bırakılır; ajan yeniden dener.

Sınırlar (kanal ayarı, ölçümle güncellenir): sepet başına en çok satır sayısı, tek siparişte tavan tutarı (aşılırsa insan onayı gerekir, ajan akışı reddeder), saatte açık rezervasyon sayısı. Rezervasyon stok tuttuğu için **kötüye kullanım** riski vardır: ajan uçları ayrı `agent` hız bütçesi alır (anahtar = kanal + `omp_` anahtarı + IP) ve açık rezervasyon üst sınırı aşılınca 429 döner.

Ajan uçları kampanya/kupon kodu kabul eder mi, B2B fiyat listesi görür mü: **v1'de hayır**; yalnız anonim (B2C) fiyat. Müşteriye bağlı hesap ajanı kapsam dışı.

## 4. MCP sunucusu

- Paket: `packages/mcp-shop` (salt dış arayüz; çekirdek kodu içe almaz, yalnız herkese açık HTTP sözleşmesini çağırır). Uzak (Streamable HTTP) taşıma, kanal ana bilgisayarında `/mcp`; ayrıca yerel stdio çalıştırma.
- Araçlar (hepsi sözleşmeden türetilir): `search_products`, `get_product`, `get_shipping_options`, `create_cart`, `add_to_cart`, `get_cart`, `start_checkout` (→ `payment_url`), `get_checkout_status`.
- **Admin MCP v1'de yok.** Yazma yetkili yönetim yüzü, admin API izinleri ve denetim izi hazır olmadan ajana açılmaz; ayrı karar, `05-agentic-builder.md` kapsamıdır.
- Araç açıklamaları sabit metindir (katalogdan üretilmez), araç çıktısı yapılandırılmış JSON'dur.

## 5. Güvenlik ve uyum

- `omp_` anahtarıyla gelen ajan isteği `actor = agent` olarak etiketlenir; `audit_log`'a düşer, rezervasyon ve sipariş kaynağı `source = agent` taşır (raporlamada ayrılır).
- Her uç `Idempotency-Key` ister; aynı anahtar aynı yanıtı döner.
- Güvenlik başlıkları ve CSRF kuralları aynen geçerli ([../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)); ajan uçları çerez kullanmadığı için CSRF yüzeyi yoktur, `Origin` kuralından yalnız anahtarlı JSON uçları muaftır.
- Turnstile ajan uçlarında uygulanmaz (bot koruması yerine anahtar + bütçe + tavan).
- Kişisel veri: ajan akışı misafir e-postasını ödeme sayfasında toplar; ajan uçları müşteri verisi döndürmez.

## 6. Yapılacaklar

- `-` `settings`: `agentCommerce.enabled`, `agentCommerce.maxOrderAmount`, `agentCommerce.paymentLinkMinutes` (30 dk–2 saat, varsayılan 30), `agentCommerce.maxOpenReservations`, `agent` hız bütçesi (kanal kapsamlı).
- `-` `features/agentCommerce/llmsTxt.ts` (saf: katalog sunum modeli → Markdown) + rota + birim test (gizli ürün, stok kovası, kanal ayrımı).
- `-` `contract/shop/agentCheckout.ts` + `api/shop/agentCheckout/*`: `start`, `status`; idempotency zorunlu; tavan ve rezervasyon sınırı; entegrasyon testi gerçek SQLite'ta (iki eşzamanlı başlatma, tek rezervasyon).
- `-` `source` sütunu: `checkout_reservations` ve `orders` (katalogda yazıldı); `agent` uçları `source = agent` yazar, raporlama süzgeci.
- `-` `packages/mcp-shop`: araçlar, sözleşme testleri, uzak ve stdio taşıma.
- `-` Ajan akışı uçtan uca (e2e): ajan istemcisi → `payment_url` → sahte sağlayıcı ödemesi → `paid`.
- `-` Prompt injection test fikstürü: kötü niyetli ürün adı/açıklaması, çıktıda yalnız veri olarak kalır.

## Kararlar (2026-11-13, Minshop + Stripe/Shopify/Vendure belgeleri)

| Soru | Karar | Gerekçe |
|---|---|---|
| Ödeme bağlantısı süresi | **Sağlayıcı oturum süresi, varsayılan 30 dk**; yerel rezervasyon = sağlayıcı süresi + 5 dk tolerans. Ayar `agentCommerce.paymentLinkMinutes`, aralık 30 dk–2 saat (Stripe alt sınırı 30 dk). Süre dolunca `payment_url` kapanır (fail-closed). | Minshop: Stripe 30 dk, Lightning 15 dk, OpenNode 10 dk, hepsi +5 dk; `otk_` URL'sinin kendi süresi yok, bekleyen ödemenin `expires_at`'ine bağlı (`provider.ts:4-6`, `pay/[publicId].astro:53-58`). Stripe Checkout: 30 dk–24 saat, varsayılan 24 saat (docs.stripe.com/api/checkout/sessions/create). Varsayılan 24 saat stoğu bir gün kilitler; kısa tutulur. Vendure stoğu ArrangingPayment'ta tutmuyor, Shopify ömrü belgelemiyor: oradan alınacak süre yok. |
| `source` | **Çekirdek sütun**: `checkout_reservations.source` ve `orders.source` (`web · agent · admin · api`, varsayılan `web`), `custom_fields` değil. | Minshop ajan/form ayrımını yalnız kodda yapıyor, hiçbir tabloya yazmıyor; ajan siparişini raporlamak ya da sınırlamak imkânsız. `custom_fields` mağaza sahibinin alanıdır, süzgeç/indeks/rapor ve hız bütçesi için çekirdek sütun gerekir. |
| MCP kimlik doğrulama | **v1: yalnız herkese açık kanal anahtarı (`omp_`), OAuth yok.** Alıcı araçları (arama, sepet, `start_checkout`) anahtarla; ödeme her zaman insanda. Admin/yazma araçları v1'de yok; gelirse OAuth 2.1 (MCP yetkilendirme belirtimi) ve izin kapsamlarıyla, ayrı karar. | Minshop: alıcı kademesi kimliksiz, operatör kademesi tek sabit `Bearer MCP_TOKEN`, OAuth yok (operatör araçları ürün yazar, sipariş fulfill eder: alınmıyor). Shopify UCP: anonim katman yalnız katalog ve sepet, checkout için token/imzalı istek (shopify.dev/docs/agents/profiles/auth-and-rate-limiting); biz checkout'u ajana değil insana bıraktığımız için anahtar yeterli. |

Not: Stripe Shared Payment Token (ajanın doğrudan ödemesi) Türkiye'yi kapsamıyor (US, CA ve ~30 Avrupa ülkesi) ve doğrulanmadı; ajanın doğrudan ödemesi v1 kapsamı dışıdır, ayrı karar. Shopify checkout bağlantı ömrü ve Vendure ajan/ödeme MCP'si belgelerde doğrulanamadı.

## Kapatılan sorular (2026-11-13)

- **Kargo adresi:** ödeme sayfasında alınır (kullanıcı kararı). Ajan adres göndermez; `order_preview` kargo ve vergi hariçtir, `shipping_pending: true` taşır. Adres girilince kargo yöntemi ve vergi sunucuda hesaplanır, toplam ödeme sayfasında kesinleşir. Tavan tutar (`maxOrderAmount`) kesin toplama uygulanır, aşılırsa ödeme sayfası ilerlemez. Dijital/kargosuz sepette adım atlanır, ön izleme baştan kesindir.
- **Sağlayıcı kullanım şartları:** ödeme barındırılan sağlayıcı sayfasında ve insan tarafından yapıldığı için ajan başlatmalı özel şart yok; ajan yalnız bağlantıyı taşır. Ajanın doğrudan ödemesi (Stripe SPT vb.) v1 dışıdır; eklenirse o gün sağlayıcı şartları yeniden okunur. Bu bir varsayımdır, sağlayıcı sözleşmeleri okunmadı.
- **`omp_` anahtarı sızarsa:** anahtar zaten herkese açıktır (vitrin de kullanır); yetki vermez, yalnız kanal kapsamını belirtir. Koruma: hız bütçesi, açık rezervasyon üst sınırı, tavan tutar. Döndürme: admin'de anahtar yenile (`channel_publishable_keys`, eski anahtar bir süre geçerli kalır, sonra kapanır; `expires_at` sütunu, süre ayarı `publishableKey.rotationGraceHours` varsayılan 24 saat; sızıntıda `revoked_at` ile anında iptal). Suistimalde `agentCommerce.enabled` kapatılarak tüm ajan uçları anında 404 olur.

## Açık sorular

- Yok. Uygulama sırasında sağlayıcı sözleşmeleri ve gerçek hız bütçesi değerleri ölçümle güncellenir.
