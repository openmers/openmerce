# Monorepo ve klasör yapısı

```
openmers/
├── apps/
│   ├── api/                  # Hono + oRPC; giriş noktaları: worker.ts (Cloudflare), server.ts (Node)
│   │   └── src/
│   │       ├── shop/         # Shop API handler'ları (ince)
│   │       ├── admin/        # Admin API handler'ları (ince)
│   │       ├── hooks/        # ödeme webhook'ları, uygulama kayıt uçları
│   │       ├── platform/     # cloudflare.ts · node.ts (Platform kurulumu)
│   │       └── worker/       # iş tüketicisi + zamanlayıcı (aynı kod, ayrı giriş)
│   ├── storefront/           # vitrin kabuğu: Astro SSR, yönlendirme, veri, önbellek, SEO
│   ├── admin/                # SvelteKit (SPA kipi, statik çıktı)
│   └── mobile/               # Expo (React Native)
├── packages/
│   ├── contract/             # oRPC sözleşmesi + Zod şemaları (shop/ · admin/)
│   ├── db/                   # Drizzle şeması + numaralı migration'lar
│   ├── core/
│   │   └── src/
│   │       ├── platform/     # Platform arayüzü (tipler)
│   │       ├── ctx/          # istek bağlamı
│   │       ├── config/       # varsayılanlar + store.config birleştirme
│   │       ├── extend/       # defineBuiltInApp · strateji ve operasyon kayıt defteri · özel alanlar
│   │       ├── events/       # olay tipleri + yayınlama
│   │       ├── jobs/         # outbox/iş tablosu: sahiplen · çalıştır · işaretle
│   │       └── features/     # aşağıda
│   ├── ui/                   # @openmers/ui: admin ve eklentiler için sürümlü bileşen + theme.css + ikonlar ([07-ui-kutuphanesi.md](../07-istemciler/07-ui-kutuphanesi.md))
│   ├── tokens/               # tasarım belirteçleri (JSON)
│   ├── theme-kit/            # tema sözleşmesi: tipler, store'lar, yardımcılar
│   ├── create-openmers-theme/
│   ├── app-sdk/              # uygulama yazanlar için: istemci, imza doğrulama
│   ├── test-utils/           # entegrasyon testi çalıştırıcısı: taze D1/SQLite, tohum veri
│   ├── app-bridge/           # iframe ↔ admin köprüsü
│   ├── create-openmers-app/  # uygulama şablonu
│   ├── modules/                  # süreç içi, derlemeye giren resmî built-in app'ler (modül)
│   │   ├── payment-iyzico/  payment-paytr/  payment-stripe/
│   │   ├── shipping-yurtici/  shipping-aras/  shipping-mng/
│   │   ├── invoice-parasut/  iys/
│   │   ├── email-resend/  sms-netgsm/
│   │   └── search-meilisearch/
│   ├── plugins/                  # dışarıda çalışan, depoda gelen tak-çalıştır app'ler (plugin)
│   │   ├── pixel/
│   │   └── erp/
├── integration-tests/        # api/ · core/ · race/ · contract/ · helpers/ ([03-test.md](../08-isletme/03-test.md))
├── store.config.ts           # bu mağazanın modülleri (built-in app), stratejileri, özel alanları
└── docs/
```

## 1. `features/` (dikey dilimler)

Her klasör kendi sorgularını, tiplerini ve saf mantığını tutar. Bir klasör silindiğinde geri kalan derlenmeye devam etmelidir.

```
features/
  channels/     kanal · kanal↔depo · kanal çözümleme
  catalog/      products · variants · options · facets · collections · translations
  catalogIndex/ okuma modeli: index · product_view · fts · reindex işi
  pricing/      price_lists · prices · resolve · strateji
  stock/        locations · levels · movements · reserve/release/sale
  cart/         carts · lines · hesaplama boru hattı · birleştirme
  checkout/     reservations · settlement · uzlaştırma
  payments/     methods · handler portu · pending_payments · refunds
  orders/       orders · lines · adjustments · durum geçişleri · number · guestAccess
  fulfillment/  fulfillments · handler portu · iadeler (return)
  promotions/   promotions · koşul/eylem operasyonları · kupon kullanımı
  tax/          zones · categories · rates · hesaplama
  shipping/     methods · uygunluk + hesaplayıcı operasyonları
  customers/    customers · addresses · groups
  companies/    companies · members · credit            (B2B)
  quotes/       quotes · approvals · saved lists        (B2B)
  media/        assets · upload · usage
  pages/        içerik sayfaları (Markdown)
  settings/     ayar deposu (genel · kanal · kullanıcı)
  secrets/      şifreli kasa
  notify/       şablonlar · e-posta/SMS gönderimi
  apps/         kurulum · token · webhook aboneliği · senkron kanca
  auth/         oturum · roller · izinler · API anahtarları · rateLimit
  cache/        politika · etiketler · segment · purge
  ids/          publicId · token · leakGate
```

## 2. Kurallar

- **Handler incedir:** girdiyi doğrular, yetkiyi kontrol eder, `core` fonksiyonunu çağırır, DTO döner. İş kuralı handler'da yazılmaz.
- **Bir feature'ın dışa açtığı şey `index.ts`'tir.** Başka feature onun tablosuna yazmaz, iç dosyasını import etmez.
- **`core` fonksiyonları `(ctx, girdi)` alır;** global `env` okumaz.
- **Okuma ve yazma ayrıdır:** `catalog/` yazar, `catalogIndex/` okur. Vitrin handler'ları `catalog/`'u import etmez.
- **Built-in app de aynı kurallara uyar;** kendi tabloları `bia_<ad>_` öneki taşır.

## 3. Araçlar

- pnpm workspaces, tek bağımlılık ağacı (mobil dahil); gerekince Turborepo.
- Sürümleme: Changesets; `@openmers/*` paketleri ve resmî built-in app'ler aynı sürümle çıkar.
- `pnpm verify`: lint, tip, birim + entegrasyon (D1 ve SQLite), derleme.
