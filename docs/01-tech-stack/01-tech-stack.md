# OpenMers — Tech Stack

Açık kaynak, self-host edilebilir e-ticaret altyapısı (Medusa / Shopify / ikas alternatifi).
Tek monorepo: API + admin + storefront + iOS/Android uygulaması.

## Temel ilkeler

- **İki çalışma hedefi, tek kod:** (1) Node/Bun + SQLite dosyası + yerel disk, (2) Cloudflare Workers + D1 + R2.
- **Tek kaynak API sözleşmesi:** Şema bir kez yazılır; web ve mobil aynı TypeScript istemcisini kullanır.
- **Yalnızca Web standartları:** Backend kodunda `node:*` API'si yok (Workers'ta çalışmaz). Fetch, Web Crypto, Streams.

## Backend (`apps/api`)

| Katman | Seçim | Not |
|---|---|---|
| Dil | TypeScript (strict) | |
| HTTP | Hono | Workers, Node ve Bun'da aynı kod |
| API sözleşmesi | oRPC v2 (sözleşme önce: `oc` + `implement`; `/rpc` için RPCHandler, `/api` için OpenAPIHandler) | Uçtan uca tip güvenli RPC; web ve mobil aynı istemciyi kullanır. OpenAPI çıktısı üçüncü taraf entegrasyonlar için |
| ORM | Drizzle ORM 0.45.x (`sqlite-core`) | Aynı şema: `better-sqlite3` (self-host) ve `d1` (Workers) |
| Migration | drizzle-kit | D1 için `wrangler d1 migrations apply` |
| Doğrulama | Zod | oRPC girdi/çıktı şemaları |
| Veritabanı | SQLite / Cloudflare D1 | |
| Dosya depolama | Cloudflare R2 / S3 uyumlu / yerel disk | Tek `Storage` arayüzü, S3 API üzerinden |
| Kimlik doğrulama | Better Auth | Drizzle + D1 adaptörü var; müşteri ve admin oturumları, rol/izin |
| Önbellek (HTTP) | Cloudflare Cache API / self-host'ta `Cache-Control` + öndeki reverse proxy | Storefront sayfaları, ürün ve kategori listeleri |
| Önbellek (veri) | Workers KV (CF) / bellek içi LRU (self-host) | Mağaza ayarları, kur, kargo fiyatı gibi sık okunan veriler; tek `Cache` arayüzü |
| Kuyruk | Cloudflare Queues (CF) / poller (self-host); doğruluk kaynağı iki hedefte de `outbox` tablosu | Sipariş e-postası, webhook, stok senkronu; tek `Queue` arayüzü, yeniden deneme + dead-letter |
| Zamanlanmış işler | Cron Triggers (CF) / süreç içi zamanlayıcı (self-host) | Terk edilmiş sepet, rapor, temizlik |
| E-posta | Resend (HTTP API) | SMTP Workers'ta çalışmaz; sağlayıcı arayüzle değiştirilebilir |
| Arama ve listeleme | `catalog_index` okuma modeli + SQLite FTS5 | D1'de de var; büyük kataloglar için Meilisearch/Typesense built-in app'i |
| Görsel işleme | Cloudflare Images (CF) / `sharp` (self-host, yalnızca Node adaptöründe) | Boyutlar yüklemede üretilir; `sharp` Workers'ta çalışmaz |
| Genişletme (süreç içi) | Stratejiler, yapılandırılabilir operasyonlar, derleme zamanı built-in app'ler | `store.config.ts`; ayrıntı `04-genisletme/` |
| Üçüncü taraf uygulamalar | Manifest + izinli token + imzalı webhook + admin'de iframe | `@openmers/app-sdk`, `@openmers/app-bridge`, `create-openmers-app`; ayrıntı `04-genisletme/` |
| Ajan (LLM) | OpenAI uyumlu istemci → **9router** (özel ağda) → **DeepSeek** (`deepseek-v4-pro` ajan, `deepseek-flash` küçük işler + görsel okuma); 9router kullanılamazsa doğrudan DeepSeek API | Builder kipi; ayrıntı `07-istemciler/05-agentic-builder.md` |
| Görsel üretimi | **Gemini** (`gemini-nano-banana-2.1`; isteğe bağlı `gemini-3-pro-image`), doğrudan Gemini API | Banner, kampanya, ürün fotoğrafı düzenleme |

### Resmî built-in app'ler (`modules/`; çekirdekte yalnızca arayüz + bir varsayılan)

- **Ödeme:** iyzico, PayTR, Stripe
- **Kargo:** Yurtiçi, Aras, MNG vb.
- **E-fatura / e-arşiv:** Paraşüt, Logo vb. entegratörler
- **Vergi:** KDV oranları, fiyata dahil/hariç
- **Bildirim:** e-posta, SMS (Netgsm vb.)

## Frontend

Ortak: **Tailwind CSS 4 + nanostores**; tip denetimi `tsc`, lint/format Biome. Vitrin **Astro** (Svelte adaları), admin **React 19 + Vite** (SPA).

| Uygulama | Yapı | Not |
|---|---|---|
| `apps/storefront` | Astro SSR + Svelte adaları | SEO için sunucu render; sepet/ödeme etkileşimli adalar |
| `apps/admin` | Vite + React 19, SPA (statik derleme, tek HTML kabuğu; SSR yok) | Yönetim paneli, SEO gerekmez, sunucu kodu yok (yalnızca Admin API); dosya tabanlı rotalar TanStack Router, sunucu durumu TanStack Query, tablolar TanStack Table, bileşenler shadcn/ui (Radix) tabanlı `@openmers/ui`; iki kip: builder (varsayılan, sohbet + önizleme) ve klasik pano |

- **Durum:** nanostores (admin ve mobilde `@nanostores/react`; vitrinde `@nanostores/persistent` ile sepet)
- **API istemcisi:** oRPC client (tipler `packages/contract`'tan); sunucu durumu admin'de TanStack Query üzerinden
- **Formlar:** Zod şemaları backend ile ortak; admin'de form doğrulaması aynı şemadan (React form katmanı; kütüphane seçimi açık)
- **Adaptör:** vitrin `@astrojs/cloudflare` veya `@astrojs/node` (hedefe göre); admin statik çıktıdır, adaptör hedefe göre değişmez (aşağıdaki Admin notu)
- **i18n:** vitrin: Astro i18n yönlendirme + Paraglide JS; admin: Lingui (React); varsayılan EN, TR desteklenir
- **Tablolar (admin):** `@openmers/ui` DataTable, TanStack Table denetimli model (sunucu taraflı imleçli sayfalama)

## Mobil (`apps/mobile`) — iOS + Android

| Katman | Seçim |
|---|---|
| Çatı | React Native + Expo (TypeScript) |
| Gezinme | Expo Router (dosya tabanlı) |
| API istemcisi | oRPC client — `packages/contract` doğrudan import edilir, kod üretimi yok |
| Durum | nanostores + `@nanostores/react` — sepet/oturum store'ları web ile ortak |
| Arayüz | NativeWind (Tailwind sınıfları) + React Native Reusables (shadcn muadili) |
| Listeler | FlashList (`@shopify/flash-list`) — tüm listeler; `FlatList`/`ScrollView` + `map` kullanılmaz |
| Görsel | expo-image |
| Yerel depolama | expo-secure-store (token), AsyncStorage (sepet) |
| Ödeme / 3D Secure | `react-native-webview` içinde storefront checkout sayfası |
| Bildirim | expo-notifications (FCM + APNs) |
| Derleme / dağıtım | EAS Build + EAS Submit; JS güncellemeleri için EAS Update (OTA) |

**"Otomatik" kısmı:** Mobil uygulama API tiplerini, Zod şemalarını, iş mantığını (`packages/core`) ve nanostores store'larını admin ile aynı paketlerden alır; API değişince tip hatası mobilde de anında çıkar. Mağaza teması (renk, logo, isim) `packages/tokens` içindeki tek JSON'dan hem web'in hem mobilin Tailwind temasına aktarılır. Admin ve mobil aynı React olduğu için `packages/contract`, nanostores store'ları, biçimlendirme yardımcıları, `packages/tokens` ve görsel olmayan veri hook'ları (tipli istemci üzerinden) paylaşılır; ekranlar, bileşenler ve gezinme paylaşılmaz (DOM ve React Native render katmanları ayrıdır, vitrin ayrıca Svelte adaları kullanır).

## Monorepo

Klasör yapısı: [../02-genel-mimari/04-monorepo-klasor-yapisi.md](../02-genel-mimari/04-monorepo-klasor-yapisi.md).

- **Çalışma alanı:** pnpm workspaces, mobil dahil tek bağımlılık ağacı (ihtiyaç olunca Turborepo eklenir)
- **Metro:** Expo'nun monorepo desteği ile `packages/*` doğrudan çözülür
- **Sürümleme:** Changesets

## Araçlar

| İş | Seçim |
|---|---|
| Lint + format | Biome (TS/TSX); tip: `tsc` (admin/ui), vitrin Svelte dosyaları için `svelte-check` |
| Birim/entegrasyon testi | Vitest + `@cloudflare/vitest-pool-workers` (D1/R2 gerçek ortam testi) |
| E2E (web) | `e2e` (agentic runner, `@e2e-dev/web`) |
| Mobil test | `e2e` (`@e2e-dev/mobile`; iOS simülatör + Android emülatör, CI'da EAS Workflows) |
| CI | GitHub Actions |
| Mobil dağıtım | EAS Build + EAS Submit (TestFlight + Play Console) |
| Deploy (CF) | Wrangler |
| Deploy (self-host) | VPS üzerinde Node.js (tek süreç) veya Docker imajı; Caddy/nginx önde |
| Yedekleme (self-host) | **Litestream (zorunlu, varsayılan açık)** → S3 uyumlu depo (R2 / B2 / MinIO / S3); açılışta otomatik geri yükleme; yüklenen dosyalar için doğrudan S3 depolama (önerilen) veya restic/rclone |
| Yedekleme (Cloudflare) | D1 Time Travel |
| Hata izleme | Sentry |
| Lisans | **MIT** (karar verildi: çekirdek, built-in app'ler, SDK/UI/contract paketleri) |

## Bilinen kısıtlar (baştan tasarıma girmeli)

1. **D1'de interaktif transaction yok**, sadece `batch()`. Stok düşme ve sipariş oluşturma tek `batch` içinde, koşullu `UPDATE ... WHERE stock >= ?` ile yazılmalı; "oku → karar ver → yaz" akışı kullanılamaz.
2. **D1 veritabanı başına 10 GB sınırı.** Çok kiracılı (SaaS) kurulumda mağaza başına ayrı D1 gerekir.
3. **Workers CPU süresi ve paket boyutu sınırı.** Ağır işler (toplu içe aktarma, rapor) Queues'a gider.
4. **Para:** Tutarlar tamsayı kuruş + para birimi kodu olarak saklanır; float yok.
5. **Mobil ve web arayüzü ayrı yazılır.** Admin ve mobil aynı React olsa da DOM bileşenleri React Native'de çalışmaz; paylaşılan kısım sözleşme, iş mantığı, store'lar, biçimlendirme yardımcıları, tema belirteçleri ve görsel olmayan veri hook'larıdır.
6. **KVKK / GDPR:** Çerez onayı, veri silme/dışa aktarma, açık rıza kayıtları çekirdekte olmalı.

## İlk sürüm kapsamı dışında

Çoklu satıcı (marketplace), hediye kartı, tema mağazası, GraphQL, çok sunuculu self-host. (Çoklu depo, kanallar, fiyat listeleri ve B2B artık mimarinin parçasıdır: `05-ticaret/`, `06-b2c-b2b/`.)
