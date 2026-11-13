# Aşama 3-4: istemciler ve B2B, ayrıntılı yapılacaklar

**Grubun amacı:** ticaret çekirdeğinin (aşama 2) üstüne ilk görünür ürünü kurmak (admin, vitrin, tema, mobil, builder), sonra B2B'yi aynı çekirdeğe dört kavram olarak eklemek (şirket, vadeli ödeme/kredi, onay, teklif). Numaralar `docs/YOL-HARITASI.md` ile aynıdır (31-42).

**Kodun durumu (2026-11-13, dosyalar görülerek):**
- `apps/admin`, `apps/storefront`, `apps/mobile`: yalnız `package.json` (script yok, bağımlılık yok) ve `tsconfig.json`; `src/` boş. `apps/mobile/e2e/.gitkeep` var. `apps/api/src/{shop,admin,hooks,platform,worker}` boş klasör.
- `packages/core/src/features/{companies,quotes,channels,pricing,cart,checkout,orders,...}/index.ts`: hepsi `export {}`.
- `packages/theme-kit`, `apps/storefront/src/themes/default`, `packages/create-openmers-theme`, `packages/app-sdk`, `packages/app-bridge`: `src/index.ts` = `export {}`.
- `packages/ui`: 44 bileşen + `data-table` + `toast` (`Toaster.svelte`, `svelte-sonner` bağımlılığı) gerçekten var ve testli. `packages/tokens`: `tokens.json` + tipli `tokens` dışa aktarımı var; mobil (NativeWind) çıktısı yok.
- `e2e/smoke.e2e.ts` + `e2e.config.ts` var; config `pnpm --filter @openmers/storefront-app dev` çağırıyor ama storefront'ta `dev` script'i yok, test koşmuyor.
- `packages/admin-sdk` **yok** (belge 06 bu paketi varsayıyor; `02-genel-mimari/04-monorepo-klasor-yapisi.md`'de de anılmıyor).
- `integration-tests/{core,api,race,contract}`: yalnız `package.json`/`tsconfig.json`, `__tests__` yok; `integration-tests/helpers/index.ts` var.

**Bağımlılık özeti:** Hiçbir madde aşama 1 (5-12: platform, `db`, yapılandırma, `Ctx` + `contract`, outbox, önbellek, yetki, kimlik doğrulama) bitmeden gerçek veriyle çalışamaz. Admin (31) iskeleti ve `@openmers/ui` kullanımı sahte veriyle önceden başlayabilir. Vitrin (33) ve tema (34) aşama 2'nin `catalogIndex`, `pricing`, `cart`, `checkout` maddelerine (15, 16, 21) bağlı. Mobil (35) vitrin checkout sayfasına (33) bağlı. Builder (36) admin (31), denetim kaydı (11) ve tema (34) üstüne kurulur. B2B (37-42) kanallar (14), fiyat (16), sepet/checkout (21), ödeme (22), sipariş (23), müşteriler (24) ve uygulama sistemi (47) üstüne kurulur.

Yapı kuralları (`.claude/skills/*/openmers-*`): dosya ≤150 satır hedef, 250 sert sınır (`pnpm check:size`); handler ≤40 satır, iş kuralı `packages/core/src/features/<x>/` içinde `(ctx, input)` fonksiyonu; saf mantık ile I/O ayrı dosya; özellikler arası import yalnız `index.ts` üzerinden; çok yazmalı iş kendi fonksiyonunda `atomic()`; sorgular `features/<x>/queries/<ad>.ts`; şema `packages/db/src/schema/<grup>.ts`; sayfa dosyası yalnız birleştirir (≤80 satır); veritabanı testte mock'lanmaz (D1 + SQLite).

---

## Aşama 3: istemciler

### 31. `docs/07-istemciler/02-admin.md` — Admin paneli (klasik kip)

- **Kaynak kararlar:**
  - SvelteKit (Svelte 5) SPA kipi: kök `+layout.ts` içinde `export const ssr = false`, `adapter-static` + `fallback`; `+page.server.ts`, `+server.ts`, form action, sunucu `load` yasak; her `load` istemcide oRPC ile Admin API'yi çağırır.
  - Yapı: `apps/admin/src/{routes,features,lib,extensions}`; rotalar ince kabuk, genişletme rotaları `[...ext]` yakalayıcısında.
  - Tablolar: denetimli Data Table, sunucu taraflı imleçli sayfalama/sıralama/filtre; tüm listeyi istemciye çekmek yok. Formlar Superforms (SPA), Zod şeması `packages/contract`'tan.
  - İzin: menü/düğme `permissions` kümesine göre gizlenir, asıl denetim API'de. Kanal seçici üst çubukta. Kayıt `version` taşır, çakışmada fark gösterilir.
  - Operasyon ekranları (çekirdek): outbox/işler (`dead` dahil, yeniden kuyruğa alma), uygulamalar, stok istisnaları, belirsiz iadeler, uzlaştırma farkları, yedek durumu, denetim kaydı.
  - Performans: admin önbelleklenmez; liste sorguları indeksli ve imleçli, pano sayıları günlük özet tablosundan, ağır dışa aktarma işle.
- **Bağımlılık:** 8 (`Ctx`, Admin API, `packages/contract` oRPC istemcisi), 11 (izin modeli, denetim kaydı), 12 (yönetici oturumu); `@openmers/ui` (+). İskelet ve sahte veriyle liste sayfası 8'den önce başlayabilir.
- **Yapılacaklar:**
  1. `-` `apps/admin/package.json`: `dev`, `build`, `preview`, `check` (`svelte-check`) script'leri; `@sveltejs/kit`, `@sveltejs/adapter-static`, `@openmers/ui`, `@openmers/contract`, `nanostores`, `sveltekit-superforms` bağımlılıkları. `apps/admin/svelte.config.js` (`adapter-static`, `fallback: 'index.html'`), `vite.config.ts`.
  2. `-` `apps/admin/src/routes/+layout.ts` (`ssr = false`, `prerender = false`) ve `+layout.svelte`: `@openmers/ui/theme.css` içe aktarımı, `<Toaster />` bir kez, üst çubuk + yan menü bileşenlerini birleştirir (iş mantığı yok).
  3. `-` `apps/admin/src/lib/api.ts`: oRPC istemcisi; temel adres çalışma zamanında `window.__OPENMERS__`'tan (06 §5), `credentials: 'include'`. Hata dönüşümü ayrı saf dosya: `lib/apiError.ts` (sözleşme hata kodu → `{ field?, message, requestId }`).
  4. `-` `apps/admin/src/lib/session.ts`: `/me` benzeri oturum paketini (yönetici, `permissions`, kanallar, yerleşim) tek istekte yükleyip nanostore'a yazar; `lib/permissions.ts` saf `can(perms, 'orders:write')`.
  5. `-` `apps/admin/src/lib/channel.ts`: etkin kanal nanostore'u; `features/shell/ChannelSwitcher.svelte` üst çubukta, `@openmers/ui` `Select` ile.
  6. `-` `apps/admin/src/lib/table/`: `useCursorTable.ts` (DataTable denetimli durumu ↔ `{ items, nextCursor }` uç noktası; sıralama/filtre değişince imleç sıfırlanır), saf `tableQuery.ts` (durum → sorgu girdisi). DataTable bileşeni `@openmers/ui`'den (+ hazır).
  7. `-` `apps/admin/src/lib/form/`: `useAdminForm.ts` (Superforms SPA sarmalayıcı: `onUpdate` içinde oRPC çağrısı, `setError`/`setMessage` eşleme, `version` gizli alanı, 409 → fark diyaloğu), saf `mapFieldErrors.ts`.
  8. `-` İlk özellik dilimi `apps/admin/src/features/products/`: `columns.ts`, `components/ProductsTable.svelte`, `ProductsToolbar.svelte`, `forms/ProductForm.svelte`, `api.ts`, `index.ts`; rota `routes/products/+page.svelte` + `+page.ts` yalnız birleştirir. Aynı kalıp sonra `orders`, `customers`, `settings` için kopyalanmaz, `lib/` parçaları kullanılır.
  9. `-` Operasyon ekranları `apps/admin/src/features/ops/`: `OutboxTable.svelte` (durum filtresi `pending · failed · dead`, "yeniden kuyruğa al" eylemi), `AuditLogTable.svelte`; her biri kendi `columns.ts`'i ile. Stok istisnası/uzlaştırma/yedek ekranları ilgili çekirdek özellik (17, 22, 55) gelince.
  10. `-` Pano `apps/admin/src/features/dashboard/`: sayılar günlük özet ucundan (29), ham tabloya gitmez.
  11. `-` `@openmers/ui` dışı UI'yı reddeden lint kuralı (`07-ui-kutuphanesi.md` 1.1; YOL-HARITASI madde 4'teki açık iş): `apps/admin` içinde `bits-ui`, ham renk sınıfı ve başka UI paketi içe aktarımını yakalayan Biome kuralı veya `scripts/` altında küçük denetim.
  12. `-` `pnpm verify`'a `svelte-check` (madde 1 ve 2'deki açık tip denetimi işiyle birlikte).
- **Testler:**
  - Birim: `lib/permissions.test.ts`, `lib/apiError.test.ts`, `lib/table/tableQuery.test.ts`, `lib/form/mapFieldErrors.test.ts`.
  - Bileşen: `features/products/components/ProductsTable.test.ts` (imleçle sonraki sayfa, sıralama değişince imleç sıfırlanır; `@openmers/contract` tiplerinden sahte veri).
  - API (gerçek DB): `integration-tests/api/__tests__/admin/products.list.test.ts` (imleçli liste, izin yoksa 403), sorgu planı testi (tam tarama yok).
  - E2E: `e2e/admin-product-create.e2e.ts` (ürün oluştur), `e2e/admin-order-fulfil.e2e.ts` (testing skill §7).
- **Bitti sayılır:**
  - `pnpm --filter @openmers/admin-app build` tek HTML kabuğu üretir, sunucu dosyası (`+page.server.ts`, `+server.ts`) yok (denetim betiği bunu doğrular).
  - Ürün listesi imleçle gezilir, istemciye tüm liste çekilmez (ağ isteği sayfa başına bir).
  - İzinsiz kullanıcıda düğme gizli ve API 403.
  - `version` çakışmasında kayıt ezilmez, fark diyaloğu açılır (bileşen testi + API testi).
- **Açık sorular / riskler:**
  - SvelteKit SPA kipi (`ssr=false` + `adapter-static` + `fallback`) ve Workers static assets'te SPA geri dönüşü doğrulanmadı (ATLANANLAR).
  - Superforms: `zod4Client` adı, Svelte 5 sürüm şartı, çalışma zamanında üretilen Zod şemasıyla operasyon formları doğrulanmadı (ATLANANLAR).
  - "Operasyon formları şemadan üretilir" kuralının üretici bileşeni nerede (admin `lib/` mi, `@openmers/ui` mu) belgede yok.
  - Admin rol değişiminin açık oturumlara yansıması (`session_version`) ATLANANLAR'da çözüldü işaretli; uygulamada 12 ile birlikte doğrulanmalı.

### 32. `docs/07-istemciler/06-admin-genisletme.md` — Admin genişletme modeli

- **Kaynak kararlar:**
  - Built-in app `admin/index.ts` içinde `defineAdminExtension({...})` çağırır; yol `defineBuiltInApp({ admin: './admin/index.ts' })`. Admin derlemesi `builtInApps` listesinden `virtual:openmers-admin-extensions` sanal modülü üretir; listede olmayan app'in kodu pakete girmez.
  - Hedef kimlikleri (`PageId`, `BlockId`...) `@openmers/admin-sdk`'dan sabit birleşim tipi; yanlış kimlik derleme hatası. Dev Mode kimlikleri rozet olarak gösterir.
  - Anahtarlar: `routes`, `navSections`, `pageBlocks`, `actionBarItems`, `toolbarItems`, `dataTables` (sorgu genişletme yok), `detailForms`, `customFormComponents`, `alerts`, `insights.*`, `historyEntries`, `login`, `customProviders`. App rotaları `src/routes/[...ext]/+page.svelte` yakalayıcısında çözülür.
  - Uyarı yoklayıcısı tek merkezli, en az 30 sn, sekme gizliyken durur, rastgele sapma. Widget veri günlük özet tablosundan; `admin_user_prefs`.
  - Yerleşim düzenleyici: `admin_layouts(scope store·user, admin_user_id?, page_id, config JSON, version)`; çözümleme kişisel → mağaza → kod; kilitli blok gizlenemez; klavyeyle taşıma zorunlu; gizli blok istek yapmaz; mağaza varsayılanı `admin_layout:manage` izni ve `audit_log`.
  - Kod bölme (her anahtar dinamik içe aktarma), `settings.<app>_enabled` ile süzme, her bileşen hata sınırında, iki app aynı bloğu `replace` ederse derleme hatası; dış uygulama yalnız manifest yuvaları (iframe).
- **Bağımlılık:** 31 (admin iskeleti); 45 (`defineBuiltInApp`) sanal modül için; 47 (`app-bridge`) dış uygulama iframe'i için; 6 (`admin_layouts`, `admin_user_prefs` tabloları).
- **Yapılacaklar:**
  1. `-` Yeni paket `packages/admin-sdk` (`@openmers/admin-sdk`): `index.ts` yalnız yüzey; `@openmers/ui`'yi ve `toast`'u yeniden dışa aktarır, `api`, `usePermissions`, `useChannel`. Paket monorepo belgesine de eklenmeli (bkz. açık sorular).
  2. `-` `packages/admin-sdk/src/ids.ts`: `PageId`, `BlockId`, `NavSectionId` birleşim tipleri; kaynağı çekirdek sayfaların kayıt dosyası (veri), elle iki kez yazılmaz.
  3. `-` `packages/admin-sdk/src/defineAdminExtension.ts`: tip güvenli kimlik fonksiyonu; anahtar başına tip dosyası `types/{routes,pageBlocks,alerts,...}.ts` (her biri küçük).
  4. `-` `apps/admin/vite/extensionsPlugin.ts`: `virtual:openmers-admin-extensions` üretir (yalnız `builtInApps` listesindekiler, dinamik `import()`); saf `mergeExtensions.ts`: sıralama (`order`, sonra app kimliği), iki `replace` → derleme hatası.
  5. `-` `apps/admin/src/extensions/registry.ts`: çalışma zamanı kayıt defteri; `settings.<app>_enabled` süzgeci saf `filterEnabled.ts`. `routes/[...ext]/+page.svelte` + `+page.ts` yoldan bileşeni çözer, yoksa 404.
  6. `-` `packages/admin-sdk/src/page/`: `Page`, `PageLayout`, `PageBlock`, `ListPage` (`{ items, nextCursor }`), `DetailPage` + `useDetailPage` (`new` kimliği, `version`, `taintedMessage`); her biri ayrı dosya, `@openmers/ui` üstünde. `PageBlock` her bloğu `<svelte:boundary>` ile sarar, hata kartı + telemetri.
  7. `-` `packages/admin-sdk/src/form/`: `FormField`, `RelationSelect`, `MoneyInput` (ui `CurrencyInput` üstünde), `customFormComponents` sözleşmesi (`bind:value`, `name`, `errors`, `disabled`).
  8. `-` `packages/admin-sdk/src/alerts/poller.ts`: tek yoklayıcı; saf `schedule.ts` (≥30 sn, jitter, `visibilitychange` ile duraklama).
  9. `-` `packages/admin-sdk/src/motion/`: `useMotion()` (`prefers-reduced-motion` → anında bitir) ve `animate` sarmalayıcı (`motion/mini` varsayılan, tam `motion` dinamik içe aktarma).
  10. `-` Yerleşim: `packages/db/src/schema/admin-layouts.ts` (`admin_layouts`, `admin_user_prefs`); `packages/core/src/features/settings/layouts/resolveLayout.ts` (saf: kişisel → mağaza → kod, kaldırılmış blok yok sayılır, yeni blok varsayılan konumda, kilitli blok sabit), `queries/getLayouts.ts`, `saveLayout.ts` (`version` koşullu güncelleme, mağaza kapsamında `audit_log`). Admin tarafı `features/layout-composer/` (klavyeyle taşıma zorunlu).
  11. `-` Dil: Lingui Svelte topluluk paketi denemesi (`apps/admin/src/lib/i18n.ts`); başarısızsa `@lingui/core` + kendi `t()`; kataloglar `admin/i18n/{tr,en}`.
  12. `-` Dış uygulama yuvaları: `apps/admin/src/extensions/AppFrame.svelte` (iframe + `@openmers/app-bridge`), manifest yuvaları (`nav.page`, `*.panel`) dışında kayıt reddi.
- **Testler:**
  - Tip testi: `packages/admin-sdk/src/ids.test-d.ts` (yanlış `pageId` derleme hatası, `expectTypeOf`/`@ts-expect-error`).
  - Birim: `mergeExtensions.test.ts` (aynı bloğa iki `replace` hata, sıra), `filterEnabled.test.ts` (kapalı app hiçbir yuvada yok), `schedule.test.ts` (sekme gizliyken durur, ≥30 sn), `resolveLayout.test.ts`.
  - Bileşen: `PageBlock.test.ts` (bozuk blok sayfayı düşürmez), `Toaster` tek kez (kök düzen testi), `useMotion` azaltılmış harekette anında bitiş, klavyeyle yeniden sıralama.
  - Entegrasyon (gerçek DB): `integration-tests/core/__tests__/admin-layouts.test.ts` (kişisel/mağaza çözümlemesi); yarış: `integration-tests/race/__tests__/admin-layout-save.test.ts` (iki eşzamanlı kaydetmeden biri çakışma).
- **Bitti sayılır:**
  - Örnek bir built-in app (`packages/modules/*` içinden biri) `pageBlocks` + `routes` kaydeder, admin derlemesinde görünür; `builtInApps` listesinden çıkarılınca paket boyutunda kodu yok (bundle-size betiği).
  - 06 §6'daki test listesinin tamamı yeşil.
  - Gizli blok için ağ isteği atılmaz (bileşen testinde istek sayacı 0).
- **Açık sorular / riskler:**
  - `@openmers/admin-sdk` paketi monorepo belgesinde ve `packages/` altında yok; açılması belge güncellemesi ister.
  - `<svelte:boundary>` sürümü, svelte-sonner Svelte 5 uyumu ve aria-live, Svelte ≥5.29 attachment (kökte `svelte ^5.57.3` var, büyük olasılıkla uygun), Lingui Svelte paketi doğrulanmadı (ATLANANLAR).
  - Yerleşim sürükle-bırak kütüphanesi seçilmedi; YOL-HARITASI madde 4'te DataTable için `@dnd-kit` geçiyor, `@dnd-kit` React kütüphanesi; Svelte karşılığı kararı gerek.
  - Dış uygulama `actionBarItems`/`alerts`/`widgets` yuvaları yalnız öneri (⚙️), `05-tak-calistir-app-gelistirme.md`'de yok.

### 33. `docs/07-istemciler/01-storefront.md` — Vitrin kabuğu ve tema sözleşmesi

- **Kaynak kararlar:**
  - Tema veritabanı satırı görmez; yalnız çözülmüş sunum modeli alır (hazır `src`/`srcset`, biçimli fiyat metni, hazır URL, stok boolean/kova). Tema URL üretmez, para hesaplamaz, API yolu kurmaz.
  - Vitrin SSR, JavaScript'siz çalışır; Svelte adaları yalnız sepet çekmecesi, galeri, ödeme durumu yoklaması.
  - Sepete ekle gerçek `<form method="post">`; JS varsa ada yakalar. Rozet adedi `@nanostores/persistent` ile yerel depodan; sayfa başına sepet isteği yok. Sepetin tamamı yalnız çekmece/sepet sayfasında.
  - Checkout düz form + sağlayıcının barındırdığı ödeme sayfası.
  - B2B portalı ayrı uygulama değil; `b2b`/`hybrid` kanalda ek sayfalar, hepsi `no-store`. Katalog SSR + kenar önbelleği, anahtar segment; sayfa verisi okuma modelinden tek turda.
  - Vitrin API'den ayrı dağıtılır, yalnız Shop API istemcisi (Cloudflare'de servis bağlaması).
- **Bağımlılık:** 8 (Shop API + `contract`), 10 (önbellek/segment), 15 (`catalogIndex`), 16 (fiyat), 21 (sepet/checkout), 22 (ödeme sağlayıcı sayfası); tema paketi (34) ile birlikte ilerler.
- **Yapılacaklar:**
  1. `±` E2E duman: `e2e/smoke.e2e.ts` ve `e2e.config.ts` (port 4321) var; `apps/storefront/package.json`'a `dev`, `build`, `preview`, `check` script'leri ve `astro`, `@astrojs/svelte`, `@astrojs/node`, `@astrojs/cloudflare`, `nanostores`, `@nanostores/persistent` bağımlılıkları eklenip duman testi koşar hale gelir.
  2. `-` `apps/storefront/astro.config.ts`: SSR, adaptör çalışma zamanı seçimi (Node / Cloudflare), Svelte entegrasyonu, Tailwind 4 Vite eklentisi.
  3. `-` `apps/storefront/src/lib/shopApi.ts`: tek Shop API istemcisi (Cloudflare'de servis bağlaması, self-host'ta yerel HTTP); veritabanı veya `core` importu yok.
  4. `-` `apps/storefront/src/presenters/`: satır → sunum modeli saf dönüştürücüler, dosya başına bir: `presentProduct.ts`, `presentPrice.ts` (biçimli metin; para hesabı API'de), `presentImage.ts` (`srcset`), `presentStock.ts` (kova). Tipler `@openmers/theme-kit`'ten.
  5. `-` `apps/storefront/src/pages/`: kabuk rotaları (`index`, `products/[slug]`, `collections/[slug]`, `search`, `cart`, `account/*`, `checkout/*`, `404`) ince; veri yükler, sunum modelini temanın sabit şablonuna `props` olarak verir.
  6. `-` `apps/storefront/src/lib/cache.ts`: önbellek başlıkları ve etiketleri; saf `cachePolicy.ts` (katalog: segment anahtarlı; hesap/sepet/B2B: `no-store`).
  7. `-` `apps/storefront/src/lib/cartForm.ts` + POST ucu: JS'siz sepete ekle (POST + yönlendirme); ada için `theme-kit` `cart` store'u ile aynı ucu kullanır.
  8. `-` B2B sayfaları (`account/company-apply`, `account/company-switch`, `quick-order`, `lists`, `approvals`, `quotes`, `credit`): kanal türü `b2b`/`hybrid` değilse 404; hepsi `no-store`. İçerik 38-41 gelince.
  9. `-` Anonim `b2b` kanalında yalnız giriş/başvuru sayfası (veya ayarla fiyatsız katalog; 39).
  10. `-` Kabuk SEO yuvaları `<ShellHead/>`/`<ShellBody/>` içeriği (27 SEO ile).
- **Testler:**
  - Birim: `presenters/*.test.ts` (fiyat metni biçimi, `srcset` merdiveni, stok kovası), `cachePolicy.test.ts` (hesap sayfası her zaman `no-store`).
  - Sözleşme: `integration-tests/contract/__tests__/segment-leak.test.ts` (bir segmentin fiyatı başka segment anahtarından sunulmaz).
  - Tur bütçesi: ürün sayfası tek okuma turu (`integration-tests/api/__tests__/shop/product-page.budget.test.ts`).
  - E2E: `e2e/smoke.e2e.ts` (var), `e2e/browse-cart.e2e.ts` (JS kapalıyken sepete ekle çalışır), `e2e/checkout.e2e.ts` (sağlayıcı test kartı).
- **Bitti sayılır:**
  - `pnpm test:e2e` duman testi yeşil.
  - JS kapalı tarayıcıda sepete ekle → sepet sayfası çalışır.
  - Katalog sayfası yanıtında segment anahtarlı önbellek başlığı, hesap/B2B sayfalarında `no-store` (test).
  - Tema kodunda veritabanı/`core` importu yok (34'teki statik denetim).
- **Açık sorular / riskler:**
  - Tema konumu kapatıldı: `apps/storefront/src/themes/<tema>/` (belgeler ve skill güncellendi).
  - 04 §2'deki "yerleşik varsayılan temada aynı süreçte doğrudan `core` çağrısı" kısayolu 01'de geçmiyor; 01 "yalnızca Shop API" diyor. Kısayolun alınıp alınmayacağı karar ister.
  - E2E config'teki ajan modeli (`opencodeConsole`) dış servise bağlı; CI anahtarı gerekir.

### 34. `docs/07-istemciler/04-tema-sistemi.md` — Tema sistemi

- **Kaynak kararlar:**
  - Tema = Astro + TS + Tailwind 4 + Svelte 5 + shadcn-svelte + nanostores; içe aktarmanın tek yolu GitHub deposu (zip yok). Akış: kaynağı al → derle → önizle → yayınla.
  - Kabuk (`@openmers/storefront`) rota, veri, önbellek, SEO, sepet/checkout, Pixel sahibidir; tema rota tanımlamaz, veri çekmez, önbellek yazmaz. Tema `src/pages`, `src/middleware` içeremez.
  - `theme.json` (`id`, `engine` aralığı, `supports.b2b`, `settings`); `supports.b2b:false` tema `b2b`/`hybrid` kanalda yayınlanamaz.
  - Tablolar: `themes`, `theme_builds` (`state: queued · building · ready · failed`), `theme_settings(channel_id, theme_id)`, `channel_themes` (yayındaki + bir önceki). Yayınla = işaretçi değişimi; geri al = önceki derleme.
  - Derleme 7 adım (özet, statik denetim, `--ignore-scripts`, tip denetimi, Astro build, duman testi, yükle); yalıtılmış ortam. Ayar değişikliği CSS değişkeni, yeniden derleme yok, yalnız `shell` etiketi temizlenir.
  - GitHub App izinleri: Contents read, Metadata read, Commit statuses write; webhook `X-Hub-Signature-256` sabit zamanlı karşılaştırma, geçersizse 401; yalnız bağlı dalın push'u derleme tetikler. Kurulum token'ı 1 saat, saklanmaz.
- **Bağımlılık:** 33 (kabuk), 26 (bölümler ve sayfa düzeni), 11 (`secrets` kasası, `themes:write`, denetim kaydı), 9 (derleme işi kuyruğu), 10 (`shell` önbellek etiketi). Belge §14 sırası izlenir.
- **Yapılacaklar:**
  1. `-` `packages/theme-kit/src/types/`: şablon başına `props` tipi (`ProductPageProps`, `CollectionPageProps`, ...) ve sunum modelleri, dosya başına bir sayfa; `index.ts` yalnız yüzey. Zorunlu şablon listesi veri dosyası `requiredTemplates.ts`.
  2. `-` `packages/theme-kit/src/stores/`: `cart.ts`, `session.ts`, `segment.ts` (nanostores; mobille paylaşılan kısım çerçeveden bağımsız).
  3. `-` `packages/theme-kit/src/components/`: `Image.astro`, `Section.astro`/`Sections.astro`, `CartForm.astro` (JS'siz), `ShellHead.astro`, `ShellBody.astro`; yardımcılar `formatPrice.ts`, `t.ts`.
  4. `-` `apps/storefront/src/themes/default/`: `theme.json`, `src/templates/*` (B2C + B2B tam küme), `src/sections/<ad>/{Section.astro,schema.ts}`, `src/styles/theme.css` (`@theme`, değerler `packages/tokens`'tan). Şablonlar ≤80 satır, yalnız bölüm yerleştirir.
  5. `-` Tema ayarı CSS değişkenleri: `packages/core/src/features/settings/theme/` (ya da `pages`; sahiplik kararı) `themeSettingsToCss.ts` saf; kabuk `<head>`'e `<style>` basar.
  6. `-` `packages/db/src/schema/themes.ts`: `themes`, `theme_builds`, `theme_settings`, `channel_themes`.
  7. `-` `packages/core/src/features/themes/` (yeni özellik): `publish/publishBuild.ts` (`channel_themes` tek koşullu güncelleme + `shell` temizliği), `rollback.ts`, `buildState.ts` (saf durum geçiş tablosu), `queries/listThemes.ts`.
  8. `-` Statik denetim `packages/theme-kit/src/check/`: `forbiddenPatterns.ts` (veri: `fetch`, `process`, `env`, `eval`, dinamik `import()`), `checkTheme.ts` (saf, dosya ağacı + içerik alır), `checkManifest.ts` (`engine` aralığı, `supports.b2b`), `checkDependencies.ts` (izin listesi).
  9. `-` GitHub: `packages/core/src/features/themes/github/verifySignature.ts` (saf, sabit zamanlı HMAC), `parsePush.ts` (saf: `ref`, `after`, `repository`, `installation`), `installationToken.ts` (I/O, `repository_ids` + `permissions` daraltma); handler `apps/api/src/hooks/github/push.ts` ince.
  10. `-` Self-host derleyici: `apps/api/src/worker/jobs/themeBuild.ts` (yetkisiz alt süreç, tarball indir, adımlar, çıktı `apps/storefront/src/themes/<build>/`); önizleme imzalı `?theme_preview=<token>` → çerez, `no-store` + `noindex`.
  11. `-` Cloudflare yolu: `create-openmers-theme` şablonuna GitHub Actions iş akışı (`wrangler versions upload` + sürüm kimliğini API'ye bildirme); yayınla = Cloudflare API ile %100 dağıtım.
  12. `-` `packages/create-openmers-theme/src/`: varsayılan temadan iskelet; `openmers theme check` (8. alt görevi CLI'dan çalıştırır), `openmers theme dev`.
- **Testler:**
  - Birim: `checkTheme.test.ts` (yasak `fetch` içeren tema reddi, `src/pages` reddi), `checkManifest.test.ts`, `verifySignature.test.ts` (geçersiz imza reddi), `parsePush.test.ts` (bağlı olmayan dal yok sayılır), `buildState.test.ts`, `themeSettingsToCss.test.ts`.
  - Tip: sözleşmeye uymayan şablon `props` derleme hatası (`apps/storefront/src/themes/default` tip denetimi CI'da).
  - Entegrasyon (gerçek DB): `integration-tests/core/__tests__/theme-publish.test.ts` (yayınla/geri al işaretçi, kabuk yükseltmesinde derleme başarısızsa eski derleme yayında).
  - API: `integration-tests/api/__tests__/hooks/github-push.test.ts` (401, hiçbir satır yazılmaz).
  - E2E: önizlemenin yayındaki önbelleği kirletmemesi; ayar değişikliğinin yeniden derleme olmadan yansıması.
- **Bitti sayılır:**
  - Varsayılan tema `theme-kit` tiplerine karşı derlenir ve 33'teki duman testini geçer.
  - Yasak desenli örnek tema derlemede reddedilir (test).
  - Self-host'ta yayınla/geri al tek koşullu güncelleme ile ve kesintisiz çalışır.
  - Renk ayarı değişince yeni derleme oluşmaz, yalnız `shell` etiketi temizlenir.
- **Açık sorular / riskler:**
  - Belge §16'daki beş soru açık (otomatik yayın varsayılanı, bağımlılık izin listesi, depo sırlarının otomatik yazılması, önizleme gizliliği: Access mi imzalı token mı, görsel düzenleyici).
  - Kabuk paket adı belgede `@openmers/storefront`, depoda `@openmers/storefront-app`; hangisi sözleşme adı karar ister.
  - `themes` tablolarının sahibi olan özellik (`features/themes`) çekirdek özellik listesinde yok; açılması monorepo belgesi güncellemesi ister.
  - Git Data API uçları, Workers Builds sınırları, GitHub "manifestten App oluştur" akışı doğrulanmadı (ATLANANLAR).

### 35. `docs/07-istemciler/03-mobil.md` — Mobil uygulama (Expo)

- **Kaynak kararlar:**
  - React Native + Expo, Expo Router, NativeWind + React Native Reusables, FlashList, nanostores.
  - Paylaşılan: `packages/contract` (tipli oRPC istemcisi), sepet/oturum store'ları, `packages/tokens`, para/tarih biçimleyicileri. Ekranlar, gezinme ve bileşen kütüphanesi paylaşılmaz.
  - Yalnız Shop API; kanal yayınlanabilir anahtarla seçilir. Tüm listeler FlashList, `nextCursor` ile. Görseller `expo-image` + API genişlik merdiveni.
  - Checkout storefront'un ödeme sayfası, WebView içinde; oturum kısa ömürlü tek kullanımlık bağlantıyla aktarılır. Token `expo-secure-store`'da, sepet anahtarı AsyncStorage'da.
  - B2B aynı uygulamada ek sekmeler; bildirim `expo-notifications`, cihaz token'ı müşteriye bağlı, gönderim outbox'tan.
  - Açılışta en düşük desteklenen sürüm sorulur; altındaysa güncelleme ekranı. Açılışta tek istek: kanal yapılandırması + ana sayfa bölümleri.
- **Bağımlılık:** 8 (Shop API + contract), 12 (mobil belirteç), 33 (checkout sayfası), 34 (`theme-kit` store'larının çerçeveden bağımsız kısmı), 28 (`notify` push kanalı).
- **Yapılacaklar:**
  1. `-` `apps/mobile/package.json`: Expo, Expo Router, NativeWind, FlashList, `expo-image`, `expo-secure-store`, `expo-notifications`, `react-native-webview`; `app.json`/`app.config.ts`, gerçek `bundleId` (YOL-HARITASI madde 2'deki açık iş).
  2. `-` `apps/mobile/app/`: ince rotalar (`(tabs)/index.tsx`, `product/[id].tsx`, `cart.tsx`, `checkout.tsx`, `account/*`), her biri `src/screens/<x>` dışa aktarır (≤30 satır).
  3. `-` `apps/mobile/src/lib/`: `api.ts` (contract istemcisi + yayınlanabilir anahtar), `secureStore.ts`, `notifications.ts`, `storage.ts` (AsyncStorage) sarmalayıcıları.
  4. `-` Ortak biçimleyiciler/store'lar için paket kararı ve taşıma: para/tarih biçimleyicileri ve sepet/oturum store'ları web ile tek yerde (`packages/theme-kit` içinde çerçevesiz alt yol veya yeni paket); mobil kopyalamaz.
  5. `-` `packages/tokens`'tan NativeWind teması üreten betik (`packages/tokens/build-native.ts` ya da `apps/mobile/src/theme/`); bugün yalnız `theme.css` çıktısı var.
  6. `-` `src/screens/home/`: `useBootstrap.ts` (tek açılış isteği), `HomeScreen.tsx`, bölüm bileşenleri; `src/lib/minVersion.ts` saf karşılaştırma + `UpdateRequiredScreen`.
  7. `-` `src/screens/catalog/`: FlashList listesi, `ProductRow.tsx` memo; `src/components/ProductImage.tsx` saf `pickWidth.ts` (yoğunluğa göre merdivenden genişlik).
  8. `-` `src/screens/cart/` ve `checkout`: rozet yerel store'dan; checkout WebView + tek kullanımlık oturum aktarım bağlantısı (Shop API ucu 12/21 ile).
  9. `-` Push: cihaz token'ını müşteriye kaydeden Shop API ucu + `notify` push kanalı (28).
  10. `-` B2B sekmeleri `src/screens/b2b/` (şirket seçimi, hızlı sipariş, onaylar, teklifler); 38-40 gelince.
  11. `-` Müşteri olayları (Pixel) aynı şemayla API'ye; mobilde betik yok.
  12. `-` EAS Build/Submit ve EAS Update yapılandırması (`eas.json`).
- **Testler:**
  - Birim (Vitest, paylaşılan paketlerde bir kez): biçimleyiciler, store'lar; `minVersion.test.ts`, `pickWidth.test.ts`.
  - Bileşen: ekran klasörü başına bir test (`@testing-library/react-native`, olmazsa jest-expo); yerel modüller yalnız sarmalayıcı sınırında mock.
  - Checkout aktarımı: tek kullanımlık bağlantının ikinci kullanımda reddi (`integration-tests/api/__tests__/shop/session-handoff.test.ts`).
  - E2E mobil `apps/mobile/e2e/`: gezinme, sepete ekle, checkout aktarımı, giriş, B2B hızlı sipariş (`pnpm test:e2e:mobile`, Android emülatör).
- **Bitti sayılır:**
  - Android emülatörde e2e gezinme + sepete ekle + checkout aktarımı yeşil.
  - Açılışta tek ağ isteği (ölçüm testi).
  - Desteklenen sürümün altındaki derleme güncelleme ekranını gösterir.
  - API'de sözleşme değişince mobil tip denetimi kırılır (CI'da `tsc`).
- **Açık sorular / riskler:**
  - Belge 03 §5 iOS simülatör + Android diyor; YOL-HARITASI yalnız Android e2e anıyor; iOS CI kapsamı karar ister.
  - 05 §2 "mobil uygulama v1'de klasik ekranları ve ajana sor sohbetini içerir" diyor; 03 mobil yalnız Shop API kullanır diyor. Yönetici mobili ayrı mı, aynı uygulamada mı belirsiz.
  - nanostores'un React Native'de kullanımı (`@nanostores/react`) ve sepet store'unun Astro ile ortak paketi henüz tasarlanmadı.

### 36. `docs/07-istemciler/05-agentic-builder.md` — Agentic builder

- **Kaynak kararlar:**
  - Ajanın araçları = Admin API prosedürleri; araç çağrısı kullanıcının `Ctx`'iyle çalışır. Sözleşmede `agent` meta alanı olmayan prosedür ajana kapalı (izin listesi).
  - Risk sınıfları: `read`, `write` (doğrudan, checkpoint'e girer), `destructive`/`money`/`external` (onay kartı; `money` her çağrıda ayrı onay). Onayı araç tanımı belirler, model değil.
  - Taslak önce; her değişiklik `actor = agent:<oturum>`, `on_behalf_of` ile denetim kaydına; checkpoint = `audit_from_id..audit_to_id` + commit SHA, ters işlem `version` denetimli.
  - Döngü sunucuda, SSE ile izlenir; adım kalıcı, oturumda tek döngü (koşullu kilit); LLM çağrısı asla `atomic()` içinde değil. `reasoning_content` geri gönderilir, `agent_messages` yalnız eklenir.
  - Sağlayıcı portu `LlmProvider` (OpenAI uyumlu, 9router varsayılan / doğrudan DeepSeek), `ImageProvider` (Gemini). Strict araç şemasından `minLength/maxLength`, `minItems/maxItems` ayıklanır; asıl doğrulama Zod.
  - Tablolar: `agent_sessions`, `agent_messages`, `agent_tool_calls`, `agent_checkpoints`, `agent_artifacts`, `agent_missions`, `agent_usage`. Arayüz yalnız `@openmers/ui`.
- **Bağımlılık:** 31 (admin), 8 (contract `meta`), 11 (izinler + denetim kaydı + `secrets`), 9 (iş kuyruğu, kalıcı adım), 34 (tema dalı, önizleme), 25 (medya, görsel üretimi). Belge §13 sırası izlenir.
- **Yapılacaklar:**
  1. `-` Kabul testi önce: `integration-tests/contract/__tests__/llm-provider.acceptance.test.ts` (9router üzerinden akışlı araç çağrısı, `reasoning_content` geri gönderimi, `prompt_cache_hit_tokens`, strict araç); haftalık elle/zamanlı.
  2. `-` `packages/contract`: prosedür `meta({ agent: { risk, summary, draftOnly } })` tipi; `packages/contract/src/agent/riskLevels.ts` veri.
  3. `-` `packages/db/src/schema/agent.ts` (yedi tablo; `agent_messages` büyükse ayrı `agent-messages.ts`).
  4. `-` Saf parçalar `packages/core/src/features/agent/` (yeni özellik): `tools/toolsFromContract.ts` (sözleşmeden araç listesi, deterministik sıralı), `tools/stripForStrict.ts` (Zod → JSON şema, desteklenmeyen kısıtları ayıklar), `approvals/needsApproval.ts` (risk → davranış tablosu), `pii/maskCustomer.ts`, `secrets/redactSecrets.ts`.
  5. `-` Sağlayıcılar (I/O) `apps/api/src/features/agent/providers/openai-compatible.ts`, `gemini-image.ts`; temel adres ve anahtar yapılandırmadan/kasadan, `env` yalnız uygulama katmanında.
  6. `-` Döngü `apps/api/src/features/agent/loop.ts`: adım kalıcılığı, oturum kilidi (`lock_token` koşullu güncelleme), araç çağrısı kimliğiyle idempotent çalıştırma; bütçe sayacı (`agent_usage`).
  7. `-` `approvals.ts` (onay kartı bekletme, kullanıcı izni + 2FA eşiği), `checkpoints.ts` (denetim kaydından ters işlem, başkası değiştirdiyse atla ve raporla).
  8. `-` SSE ucu `apps/api/src/admin/agent/stream.ts` (ince handler).
  9. `-` Admin arayüzü `apps/admin/src/features/builder/`: `Chat.svelte`, `ToolCard.svelte`, `ApprovalCard.svelte`, `Workspace.svelte`, `Preview.svelte`, `Artifacts.svelte`, `Missions.svelte`, `CodeView.svelte` (salt okunur + fark); rota `routes/builder/[session]/+page.svelte`; kip tercihi `admin_users.ui_mode`.
  10. `-` Bileşik araçlar `apps/api/src/features/agent/tools/`: `theme.files.*` (yalnız `openmers/agent/*` dalı; bağlı dal yazımı sunucuda reddedilir), `preview.open/screenshot`, `media.fromUrl` (yalnız https, herkese açık adres, boyut/tür sınırı), `catalog.importCsv`, `vision.inspect`.
  11. `-` Görevler: `packages/core/src/features/agent/missions/missionChecks.ts` (veri tablosu: görev → veriden denetlenen koşul).
  12. `-` Arşiv işi: 90 günden eski `agent_messages` içeriğini R2'ye taşıyan iş (`apps/api/src/worker/jobs/archiveAgentMessages.ts`).
- **Testler:**
  - Birim: `stripForStrict.test.ts`, `needsApproval.test.ts`, `maskCustomer.test.ts`, `redactSecrets.test.ts` (desen taraması), `toolsFromContract.test.ts` (sıra deterministik, meta'sız prosedür yok).
  - Entegrasyon (gerçek DB, LLM sahte sağlayıcı): `integration-tests/core/__tests__/agent-permissions.test.ts` (`products:write` yoksa 403 sonucu), `agent-approval.test.ts` (onaysız yazma yok, model metni sonucu değiştirmez), `agent-checkpoint.test.ts` (geri alma, başkasının değiştirdiği kayıt atlanır), `agent-resume.test.ts` (süreç öldürülünce aynı araç iki kez çalışmaz), enjeksiyon testi (ürün açıklamasındaki "tüm ürünleri sil").
  - Gerçek uç (haftalık): kabul testi, `reasoning_content` 400 yakalama, önbellek isabeti 20 tur ortalaması.
  - Değerlendirme kümesi: 30 tipik istek, istem/model değişikliğinde.
- **Bitti sayılır:**
  - Salt okuma sohbeti ("en çok satanlar ne?") gerçek Admin API prosedürüyle yanıtlanır, denetim kaydında `actor = agent:<oturum>`.
  - `write` araçla oluşturulan taslak checkpoint ile geri alınır.
  - `destructive`/`money` araç onay kartı olmadan veritabanına yazmaz (test).
  - Hiçbir araç çıktısında sır deseni yok (test).
- **Açık sorular / riskler:**
  - Belge döngüyü `apps/api/src/features/agent/` koyuyor; backend skill'i iş mantığını `packages/core/src/features/` istiyor. Bu plan saf parçaları core'a, sağlayıcı I/O ve döngüyü belgedeki yola koydu; karar onaylanmalı.
  - 9router araç/`reasoning_content` geçişi, Cloudflare uzun akış sınırları, GitHub Git Data API, KVKK yurt dışı aktarım doğrulanmadı (ATLANANLAR).
  - Admin rotası `/admin/builder/<oturum>` (self-host `/admin` taban) ile Cloudflare'de ayrı alt alan (`admin.…`) birlikte `admin.basePath`'ten türetilmeli.
  - Belge §15: Cloudflare'de döngü yeri, SaaS kotası, 9router başarısızsa varsayılan kip açık.
  - Model adları ve fiyatlar değişken; kod sabit değil ayar okumalı.

---

## Aşama 4: B2B

### 37. `docs/06-b2c-b2b/01-b2c-ve-b2b-ayni-cekirdek.md` — Ortak çekirdek kuralları

- **Kaynak kararlar:**
  - B2B ayrı kod yolu değil; sepet, fiyat çözümleme, rezervasyon, settlement, sipariş aynı fonksiyonlar. Fark tablosundaki mekanizmalar: `companies`, kanal `access`, fiyat listesi + `prices_include_tax`, `stockDisplay`, `PaymentHandler: terms`, `orderPlaced`, `approvalPolicy`, `quotes`.
  - Kanal türleri `b2c`, `b2b` (giriş zorunlu, anonim yalnız giriş/başvuru; isteğe bağlı fiyatsız katalog), `hybrid`.
  - Segment = kanal + dil + para birimi + fiyat listesi kümesi; şirket kimliği anahtara girmez.
  - Şirkete özgü her şey `no-store` uçta, istemci adasında; şirket ve üyelik oturumda, istek başına sorgulanmaz.
  - Büyük B2B sepeti iki tur: satırlar + `IN` listeli tek fiyat sorgusu. Sıra: fiyat listeleri → şirket + `b2b` erişim → hızlı sipariş → vadeli + kredi → onay → teklif.
- **Bağımlılık:** 14 (kanal türü ve `access`), 16 (fiyat listeleri, müşteri grupları), 10 (segment önbellek anahtarı), 21 (sepet hesaplama), 43 (strateji noktaları: `stockDisplay`, `orderPlaced`, `approvalPolicy`).
- **Yapılacaklar:**
  1. `-` `packages/core/src/features/channels/`: kanal türü `b2c · b2b · hybrid` ve `access` alanı; saf `channelAccess.ts` (anonim isteğin hangi sayfaları görebildiği, fiyatsız katalog ayarı).
  2. `-` `packages/core/src/features/pricing/segment.ts` (saf): segment anahtarı = kanal + dil + para birimi + sıralı fiyat listesi kümesi (+ 39'daki görünürlük kümesi); şirket kimliği yok.
  3. `-` `ctx.company` taşıyan oturum alanları (12 ile): etkin şirket, rol, `spend_limit`, fiyat listeleri; değişince segment yeniden hesaplanır.
  4. `-` Strateji arayüzleri `packages/core/src/features/<x>/strategies/`: `stockDisplay` (stock), `orderPlaced` (checkout), `approvalPolicy` (cart veya yeni `approvals`), varsayılan uygulamalarıyla; B2C varsayılanı davranış değiştirmez.
  5. `-` `prices_include_tax` kanal ayarı ve sepet özetinde net + vergi + toplam gösterimi (`features/tax` + `features/cart/summary/buildSummary.ts` saf).
  6. `-` Büyük sepet tur bütçesi: sepet hesaplamasının satırlar + tek `IN` fiyat sorgusu yaptığını ölçen sayaç kullanımı.
  7. `-` Satış temsilcisi bağlamı: yönetici `Ctx`'inden müşteri/şirket bağlamına geçiş fonksiyonu `features/auth/actOnBehalf.ts` (izin + denetim kaydı); 38 §5 ile.
- **Testler:**
  - Birim: `segment.test.ts` (aynı fiyat listesi kümesindeki iki şirket aynı anahtarı alır; şirket kimliği anahtarda yok), `channelAccess.test.ts`.
  - Sözleşme: `integration-tests/contract/__tests__/segment-leak.test.ts` (B2B fiyatı B2C anahtarından sunulmaz), strateji varsayılan uygulamaları için ortak süit.
  - Tur bütçesi: `integration-tests/api/__tests__/shop/b2b-cart.budget.test.ts` (300 satırlı sepet ≤ 2 tur).
  - Sahiplik: `integration-tests/contract/__tests__/ownership.test.ts` (şirket üyesi başka şirketin sipariş/teklif/kredisini okuyamaz).
- **Bitti sayılır:**
  - 500 şirket 4 fiyat listesini paylaşırken önbellekte 4 segment kopyası (test sayımı).
  - `b2c` kanalda B2B kodu devreye girmeden mevcut B2C testleri değişmeden yeşil.
  - 300 satırlık sepet hesabı 2 veritabanı turunda.
- **Açık sorular / riskler:**
  - Strateji noktalarının sahibi (43) aşama 5'te; aşama 4 bunlara bağlı. Ya 43'ün çekirdek kısmı öne çekilir ya B2B varsayılanları sabit kodla başlar.
  - `approvalPolicy` için ayrı `features/approvals` özelliği çekirdek listesinde yok (bkz. 40).

### 38. `docs/06-b2c-b2b/02-sirket-hesaplari.md` — Şirket hesapları (`companies`)

- **Kaynak kararlar:**
  - Tablolar: `companies` (`com_` public id, unvan, `tax_id`, `tax_id_type` (ülkeye özgü alanlar `custom_fields`'ta), `status pending · approved · suspended`, `parent_id?`, satış temsilcisi, `payment_terms_days`, `custom_fields`, `version`), `company_members` (`role`, `spend_limit?`, `status`), `company_addresses`, `company_channels`, `company_credit`.
  - Bir müşteri birden çok şirketin üyesi; oturumda etkin şirket = `ctx.company`. Roller `admin`, `approver`, `buyer`, `viewer` (müşteri tarafı). Her sorgu `company_id = ctx.company.id` filtresi taşır, kontrol core'da.
  - Başvuru → `pending`; `companies:approve` ile onayda fiyat listesi, vade, kredi limiti, temsilci atanır; `company.approved` olayı. Vergi no doğrulaması built-in app bekçisi, çekirdek yalnız biçim.
  - Hiyerarşi `parent_id`: v1'de yalnız raporlama ve ortak fiyat listesi; kredi şirket başına.
  - Temsilci `orders:create_on_behalf` ile şirket bağlamında sepet; sipariş `placed_by` + `customer_id`; elle satır indirimi `order_adjustments` satırı (izin ve tavan oran).
  - Askıya alma: rezervasyon `atomic()`'inde `AND EXISTS (şirket 'approved')`. Üyelik/şirket durumu değişince oturum sürümü artar.
- **Bağımlılık:** 37, 24 (`customers`), 12 (oturum + `session_version`), 9 (olaylar), 17/21 (rezervasyon `atomic()`), 23 (`placed_by`, `order_adjustments`).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/companies.ts` (`companies`, `company_channels`), `company-members.ts`, `company-addresses.ts`; numaralı migration; `com_` kimlik öneki `features/ids`'e.
  2. `-` `packages/core/src/features/companies/types.ts`, `roles.ts` (rol → yetenek tablosu, veri), `can.ts` (saf rol denetimi).
  3. `-` `features/companies/apply/applyCompany.ts`: şirket `pending` + ilk üye `admin` tek `atomic()`; `validateTaxIdFormat.ts` saf (yalnız biçim; ülkeye göre kural tablosu); bekçi kancası noktası.
  4. `-` `features/companies/approve/approveCompany.ts`: `version` koşullu durum geçişi + fiyat listesi/vade/temsilci ataması + `company.approved` outbox satırı; `transitions.ts` durum tablosu (veri).
  5. `-` `features/companies/members/`: `inviteMember.ts`, `removeMember.ts`, `setSpendLimit.ts`; her değişiklik etkilenen oturumların `session_version`'ını artırır.
  6. `-` `features/companies/queries/`: `getCompany.ts`, `listCompanies.ts` (imleçli), `listMemberships.ts`; sorgular `company_id = ctx.company.id` süzgecini core'da uygular.
  7. `-` `features/companies/suspend/suspendCompany.ts` + rezervasyon koşulu: `stock`/`checkout` rezervasyon ifadesine `EXISTS (companies.status='approved')` eki (stock/checkout'un `index.ts`'inden açılan koşul parçası).
  8. `-` Etkin şirket seçimi: Shop API `account/setActiveCompany` (ince handler) + oturum güncelleme; vitrin `company-switch` sayfası (33) ve mobil sekme (35).
  9. `-` Temsilci: Admin API `orders/createOnBehalf` + `features/companies/onBehalf/applyRepDiscount.ts` (saf tavan oran denetimi) → `order_adjustments`.
  10. `-` Admin ekranları `apps/admin/src/features/companies/` (liste, ayrıntı, onay formu, üyeler) `@openmers/ui` ile.
  11. `-` Olaylar `features/companies/events.ts`: `company.created`, `company.approved`, `company.suspended`, `company.member_added`.
- **Testler:**
  - Birim: `roles.test.ts`/`can.test.ts` (viewer sipariş veremez), `validateTaxIdFormat.test.ts`, `transitions.test.ts`, `applyRepDiscount.test.ts`.
  - Entegrasyon (gerçek DB): `integration-tests/core/__tests__/companies-apply-approve.test.ts` (onay olay satırı yazar), `companies-session-version.test.ts`.
  - Yarış: `integration-tests/race/__tests__/company-suspend-vs-checkout.test.ts` (askıya alma ile eşzamanlı checkout; askı kazanırsa sipariş yok).
  - Sözleşme: sahiplik (başka şirketin verisi okunamaz).
  - API: `integration-tests/api/__tests__/admin/companies.approve.test.ts` (`companies:approve` yoksa 403).
- **Bitti sayılır:**
  - Başvuru → onay → üye girişi → etkin şirket seçimi uçtan uca API testinde çalışır.
  - Askıdaki şirketin üyesi sipariş veremez, geçmişi görür (test).
  - Şirket sorgularının hepsinde `company_id` süzgeci (sahiplik sözleşme testi yeşil).
- **Açık sorular / riskler:**
  - Kapatıldı: çekirdek yalnız `tax_id` + `tax_id_type` taşır; Türkiye alanları e-fatura modülünün özel alanıdır.
  - Vergi no doğrulama, VKN/TCKN algoritması doğrulanmadı (ATLANANLAR).
  - Temsilci elle indirim tavan oranının ayar yeri belgede yok.
  - Ortak kredi havuzu (hiyerarşi) bilerek sonraya.

### 39. `docs/06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md` — B2B katalog, fiyat ve sipariş girişi

- **Kaynak kararlar:**
  - Fiyat: liste fiyatı (gruba/şirkete hedefli), `contract` türü sözleşme listesi (tek şirket, geçerlilik tarihli, yalnız anlaşılan varyantlar, kalanı alttaki listeden), `min_qty` kademeleri, vergi hariç gösterim, `b2b` anonime fiyat yerine "giriş yapın" (ayrı fiyatsız segment).
  - Görünürlük: B2B kanalına atanmamış ürün yok; şirkete özel katalog koleksiyonu, okuma `catalog_index_collections` üzerinden; görünürlük kümesi segmentin parçası. Paket varyantı `base_variant_id` + `unit_factor`.
  - Sipariş kuralları (en az tutar, en az adet/paket katı, en fazla adet) saf doğrulayıcı; sepette ve rezervasyonda aynı fonksiyon.
  - Hızlı sipariş: `cart.addMany` tek uç, SKU'lar tek `IN` sorgusu, kayıt başına sonuç; yeniden sipariş; kayıtlı listeler; adlandırılmış sepetler; satır ekleme tek satırlık koşullu yazma.
  - Sipariş alanları `po_number` (ayarla şirket başına benzersiz), `requested_delivery_date`, not, teslimat şubesi.
  - Stok gösterimi `stock.availability(variantIds[])` `no-store`, tek sorgu, hız sınırlı.
- **Bağımlılık:** 37, 38, 15 (`catalog_index_collections`), 16 (fiyat listeleri, `min_qty`), 17 (paket varyantı stok), 21 (sepet), 23 (sipariş alanları).
- **Yapılacaklar:**
  1. `-` `packages/core/src/features/pricing/`: `contract` liste türü ve geçerlilik; saf `resolvePrice.ts` genişlemesi (sözleşme → alttaki liste geri düşüşü, `min_qty` kademe seçimi); `tierTable.ts` vitrin için kademe tablosu sunum modeli.
  2. `-` Görünürlük: `packages/db/src/schema/company-catalogs.ts` (şirket → katalog koleksiyonu); `features/catalogIndex/queries/` okuma sorgusuna görünürlük kümesi süzgeci; segment anahtarına kümenin eklenmesi (37/2).
  3. `-` `packages/core/src/features/cart/rules/`: `minOrderTotal.ts`, `qtyRules.ts` (en az, kat, en fazla), `rulesTable.ts`; hepsi saf, sepet hesabı (uyarı) ve rezervasyon (ret) aynı fonksiyonu çağırır.
  4. `-` `features/cart/addMany/`: `resolveSkus.ts` (tek `IN` sorgusu, `queries/` altında), `buildAddManyResult.ts` (saf, kayıt başına `not_found · not_in_channel · multiple_error`), `addMany.ts` (koşullu satır yazımı); CSV ayrıştırma saf `parseQuickOrderCsv.ts`.
  5. `-` `features/cart/reorder/reorder.ts`: eski sipariş satırları güncel fiyat/stokla yeni sepete.
  6. `-` Adlandırılmış sepetler: `carts` tablosuna ad + alıcı başına çoklu açık sepet; kayıtlı listeler `packages/db/src/schema/saved-lists.ts` + `features/cart/lists/` (şirket içinde paylaşım).
  7. `-` Sipariş alanları: `orders` şemasına `po_number`, `requested_delivery_date`, `note`, teslimat şubesi; `po_number` benzersizlik ayarı (kısmi benzersiz indeks veya ayara bağlı denetim).
  8. `-` `features/stock/availability/availability.ts` + `stockDisplay` varsayılan B2B uygulaması (kesin adet, "50+", depo dağılımı); Shop API ucu hız sınırlı, `no-store`.
  9. `-` Vitrin: `quick-order`, `lists` sayfaları ve kademe tablosu bileşeni (varsayılan tema), fiyatsız anonim segment ("giriş yapın").
  10. `-` Admin: fiyat listesi düzenleme (`apps/admin/src/features/price-lists/`), şirket katalog ataması.
- **Testler:**
  - Birim: `resolvePrice.test.ts` (sözleşme yoksa alttaki liste; kademe sınırı), `qtyRules.test.ts`, `minOrderTotal.test.ts`, `buildAddManyResult.test.ts`, `parseQuickOrderCsv.test.ts`.
  - Sorgu planı: `resolveSkus` ve görünürlük süzgeçli katalog sorgusu tam tarama yapmaz (`EXPLAIN QUERY PLAN`).
  - Entegrasyon: `integration-tests/core/__tests__/cart-addmany.test.ts` (500 SKU tek `IN` sorgusu), `reorder.test.ts`, `po-number-unique.test.ts`.
  - Tur bütçesi: `stock.availability` tek sorgu.
- **Bitti sayılır:**
  - 500 SKU'luk CSV tek istekte, kayıt başına sonuçla işlenir; fiyat sorgusu tek `IN`.
  - Kat hatalı satır sepette uyarı, rezervasyonda ret alır (aynı fonksiyon, iki test).
  - Görünürlük dışı ürün şirket üyesine katalogda görünmez, B2C segmentini etkilemez.
- **Açık sorular / riskler:**
  - Kanal–varyant atama kuralı ve kanallar arası fiyat senkronu (ATLANANLAR, Core Concepts 4) doğrulanmadı.
  - Teklif/sözleşme fiyatıyla `linePrice` stratejisi ve kişiselleştirme ek ücretinin etkileşimi (ATLANANLAR).
  - `po_number` benzersizliği "ayarla"; ayar kapalıyken indeks yapısı belirsiz.
  - Belgeler (proforma, irsaliye) e-fatura built-in app'ine bağlı; TR'ye özgü belge türleri çekirdeğe girmemeli.

### 40. `docs/06-b2c-b2b/04-teklif-ve-onay.md` — Teklif ve onay (`quotes`, onay akışı)

- **Kaynak kararlar:**
  - Onay: `approvalPolicy` stratejisi; varsayılan kural `spend_limit` aşımı veya "tüm siparişler onaylı" ayarı. Onaya gönderilen sepet `carts.status = awaiting_approval`, stok ayrılmaz; isteyen kendi isteğini onaylayamaz.
  - `approval_policies` (`conditions` kapalı şema, `chain` JSON; en yüksek `priority` kazanır, eşitler birleştirilir), `approval_requests` (`pending · approved · rejected · changes_requested · expired · cancelled`), `approval_steps` (`waiting · pending · approved · rejected · skipped`, `via`, indeks `(state, due_at)`), `approval_delegations`.
  - Karar koşullu güncelleme (`WHERE request_id=? AND step_no=current_step AND state='pending'`); adım kapanışı + sonraki adım tek `atomic()`. Zaman aşımı işi 5 dakikada bir, `system:timeout`; `auto_approve` yalnız açıkça izinli politikada. `external` adım `approval.external_requested` webhook + `approvals.decide` ucu.
  - Teklif: `quotes` (`quo_`, `current_version`, `round_count`, `version`), değişmez `quote_versions` ve `quote_version_lines`, `quote_messages` (`shared · internal`), `quote_attachments` (`private` kova). Durumlar `requested → offered → countered → … → accepted | rejected | expired | cancelled`; `offered` içinde `pending_internal_approval`.
  - Kabul: `WHERE status='offered' AND current_version=? AND valid_until>now AND version=?`; satır fiyatı kabul edilen sürümden, `linePrice` stratejisi; promosyon teklif satırına uygulanmaz. Tur sınırı varsayılan 10. İç not süzgeci çekirdekte.
  - Teklif/onay sıcak yola koşul eklemez; teklif fiyatı sepet satırının kendi alanı.
- **Bağımlılık:** 38 (roller, `spend_limit`), 39 (sepet), 21 (checkout), 9 (olaylar + zamanlanmış iş), 25 (özel `private` kova, imzalı bağlantı), 28 (bildirim + imzalı tek kullanımlık e-posta bağlantısı), 47 (webhook ve uygulama token'ı, `external` adım), 17 (`stock_movements: hold`).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/approvals.ts` (`approval_policies`, `approval_requests`, `approval_steps`, `approval_delegations`, indeks `(state, due_at)`); `quotes.ts` (`quotes`, `quote_versions`, `quote_version_lines`), `quote-messages.ts` (`quote_messages`, `quote_attachments`).
  2. `-` Onay özelliği `packages/core/src/features/approvals/` (yeni; ya da `cart` altında, bkz. açık sorular): `policy/conditionsSchema.ts` (Zod kapalı şema), `policy/matchPolicies.ts` (saf: eşleşme, öncelik, eşit öncelikte zincir birleştirme, tekrar eden onaylayıcı bir kez), `policy/evaluateConditions.ts` (saf).
  3. `-` `features/approvals/submit/submitForApproval.ts`: sepet `awaiting_approval` + istek + ilk adım `pending` + `approval.requested` tek `atomic()`; stok ayırmaz.
  4. `-` `features/approvals/decide/decideStep.ts`: koşullu karar, `all` modu sayımı, sonraki adımı açma, `due_at` hesabı (saf `computeDueAt.ts`), kendini onaylama ve devir kuralı (saf `canDecide.ts`).
  5. `-` `features/approvals/timeout/processTimeouts.ts` + iş `apps/api/src/worker/jobs/approvalTimeouts.ts` (5 dakikada bir, indeksli parça parça); `on_timeout` tablosu (veri).
  6. `-` `features/approvals/delegation/` ve üye çıkarılınca bekleyen adımı `escalate_to`'ya / şirket yöneticisine geçirme (38 `removeMember` olayından).
  7. `-` `external` adım: `approval.external_requested` olayı; Admin/App API `approvals/decide` ince handler (`approvals:decide` izni, aktör uygulama).
  8. `-` Teklif `packages/core/src/features/quotes/`: `transitions.ts` (durum tablosu, veri), `request/requestQuote.ts` (sepetten ilk alıcı sürümü), `offer/createOffer.ts` (tavan indirim → `pending_internal_approval`, `quotes:approve_discount`), `counter/counterOffer.ts` (tur sınırı), `accept/acceptQuote.ts` (koşullu kabul → sepete dönüş, satır teklif fiyatı), `expire/expireQuotes.ts` (iş).
  9. `-` `features/quotes/diff/diffVersions.ts` (saf: satır, adet, fiyat, toplam farkı); `queries/listMessages.ts` `visibility` süzgecini core'da uygular (Shop tarafında `internal` asla dönmez).
  10. `-` `linePrice` stratejisinin teklif satırı uygulaması (`features/pricing/strategies/quoteLinePrice.ts`); promosyon motorunda teklif satırı hariç tutma (`features/promotions`).
  11. `-` Olaylar `features/approvals/events.ts`, `features/quotes/events.ts` (belge §1.5 ve §3 adları).
  12. `-` Arayüz: vitrin `approvals`, `quotes` sayfaları (33), admin `apps/admin/src/features/quotes/` (sürüm farkı görünümü, iç not), mobil sekmeler (35).
- **Testler:**
  - Birim: `matchPolicies.test.ts` (öncelik + birleştirme), `evaluateConditions.test.ts`, `canDecide.test.ts` (kendini onaylama engeli, devirde de), `computeDueAt.test.ts`, `diffVersions.test.ts`, quotes `transitions.test.ts`.
  - Entegrasyon (gerçek DB): tek adım ve üç adımlı zincir, `all` modu, zaman aşımında yükseltme/otomatik karar, devir sırasında şirketten çıkarma, harici adım yanıtsız, onay sırasında fiyat değişince fark; teklif üç tur, sürüm değişmezliği, iç onay bekleyen sürümün müşteriden gizli kalması, süre dolumu, tur sınırı.
  - Yarış: `integration-tests/race/__tests__/approval-two-approvers.test.ts`, `quote-double-accept.test.ts`, `quote-concurrent-counter.test.ts` (biri kazanır).
  - Sözleşme/API: iç notun Shop API'de görünmemesi; ek dosyaya yetkisiz erişim 403.
- **Bitti sayılır:**
  - Belge §1.6 ve §2 "Test" listelerinin tamamı yeşil.
  - Onaya gönderilen sepet stok ayırmaz (stok sayacı değişmez).
  - Aynı teklif iki kez kabul edilemez (yarış testi tek kazanan).
  - Zaman aşımı işi `EXPLAIN QUERY PLAN` ile `(state, due_at)` indeksini kullanır.
- **Açık sorular / riskler:**
  - Onay tabloları için çekirdekte özellik klasörü yok (`features/approvals` yok, yalnız `quotes`); yeni özellik açılması monorepo belgesi güncellemesi ister.
  - `manager_of_requester` "şirket hiyerarşisindeki üst birim" diyor; hiyerarşi şirketler arası (`parent_id`), üye düzeyinde yönetici ilişkisi yok. Anlamı netleşmeli.
  - Onay e-postasındaki tek tıkla karar bağlantısının güvenlik modeli doğrulanmadı (ATLANANLAR).
  - İzin adları belgeler arası tutarsız: 04 `quotes:offer`, `quotes:approve_discount`, `approvals:decide`; 06 §2 yalnız `quotes:read|write` sayıyor.
  - Teklif fiyatı ile kişiselleştirme ek ücreti/sözleşme fiyatı etkileşimi (ATLANANLAR).

### 41. `docs/06-b2c-b2b/05-kredi-ve-odeme-kosullari.md` — Kredi ve vadeli ödeme

- **Kaynak kararlar:**
  - `terms` yerleşik `PaymentHandler`; uygunluk denetleyicisi yalnız onaylı ve vadesi tanımlı şirkete sunar.
  - `company_credit(company_id, currency, credit_limit, used, version)`, `credit_ledger` (eklemeli: `order · payment · refund · adjustment`). Kullanılabilir = `credit_limit − used`.
  - Settlement `atomic()`'inde koşullu `UPDATE ... used + :total <= credit_limit AND EXISTS (orders ... settlement_token)`; kredi yetmezse sipariş oluşmaz, rezervasyon bırakılır. `orderPlaced` vadeli siparişi ödeme beklemeden kesinleştirir, ödeme durumu `awaiting`.
  - Tahsilat: `payments` + `credit_ledger` + `used −` tek `atomic()`; iade/iptal krediyi geri verir. Sipariş `due_at`; zamanlanmış görev vadesi geçenleri işaretler, gecikmede vadeli sipariş kapanır (kart açık).
  - ERP kipi: ERP `credit_limit` ve `used` yazar, mağaza açık siparişlerini ekler; checkout'ta canlı ERP sorgusu yok.
  - Müşteriye gösterim `no-store`, yalnız şirket `admin` (ayarla alıcılar). Kapsam dışı: çek/senet, iskonto, vade farkı, ortak limit, çoklu para birimi tek limit.
- **Bağımlılık:** 38 (`companies`, `payment_terms_days`), 22 (`PaymentHandler`, `payments`, iade), 23 (sipariş, `settlement_token`, `due_at`), 21 (settlement `atomic()`), 9 (zamanlanmış iş, olaylar), 43 (`orderPlaced` stratejisi).
- **Yapılacaklar:**
  1. `-` `packages/db/src/schema/company-credit.ts` (`company_credit`, `credit_ledger`); `orders` şemasına `due_at`.
  2. `-` `packages/core/src/features/payments/handlers/terms/`: `eligibility.ts` (saf: onaylı + vade tanımlı + gecikme yok), `termsHandler.ts` (`PaymentHandler` uygulaması).
  3. `-` `packages/core/src/features/companies/credit/` (ya da ayrı `features/credit`): `reserveCredit.ts` (koşullu `UPDATE`, settlement `atomic()`'ine `checkout`'un `index.ts`'inden eklenen adım), `releaseCredit.ts` (iade/iptal), `recordPayment.ts` (`payments` + ledger + `used −` tek `atomic()`), `available.ts` (saf).
  4. `-` `orderPlaced` stratejisinin vadeli uygulaması: siparişi kesinleştir, ödeme `awaiting`, `due_at = placed_at + payment_terms_days` (saf `computeDueAt`).
  5. `-` İş `apps/api/src/worker/jobs/creditOverdue.ts`: vadesi geçenleri işaretle, `order.due_soon` / `order.overdue` olayları; gecikme ayarı uygunluk denetleyicisine girer.
  6. `-` ERP kipi: `credit.set` toplu uç (Admin/App API, `credit:write`), `credit_limit`/`used` senkron yazımı + mağazanın açık taahhütlerinin eklenmesi; kip ayarı `settings`.
  7. `-` Shop API `account/credit` (`no-store`, rol denetimi) + ekstre sorgusu `queries/listLedger.ts` (imleçli); vitrin `credit` sayfası (33).
  8. `-` Admin: şirket ayrıntısında kredi paneli, elle `adjustment` (denetim kaydı), `apps/admin/src/features/companies/credit/`.
  9. `-` Olay `credit.changed`.
- **Testler:**
  - Birim: `eligibility.test.ts` (gecikmedeki şirkete vadeli kapalı, kart açık), `available.test.ts`, `computeDueAt.test.ts`.
  - Entegrasyon (gerçek DB): `integration-tests/core/__tests__/credit-settlement.test.ts` (yetersiz kredide sipariş yok, rezervasyon bırakılır), `credit-refund.test.ts`, `credit-payment.test.ts`, ERP kipi senkron.
  - Yarış: `integration-tests/race/__tests__/credit-limit.test.ts` (aynı şirketten iki eşzamanlı sipariş limiti birlikte aşamaz; `used <= credit_limit` her zaman).
  - Sahiplik: başka şirketin kredi/ekstresi okunamaz.
- **Bitti sayılır:**
  - Kredi yarış testi D1 ve SQLite'ta tek kazanan, `used` asla `credit_limit`'i aşmaz.
  - Vadeli sipariş ödemesiz kesinleşir, ödeme `awaiting`, `due_at` dolu.
  - Tahsilat sonrası `used` ve ledger toplamı tutarlı (ledger toplamı = `used`).
- **Açık sorular / riskler:**
  - Kapatıldı: sütun adı `credit_limit` (belge güncellendi).
  - D1 batch atomikliği doğrulanmadı (ATLANANLAR); koşullu `UPDATE` ile sipariş ekleme sırası buna dayanıyor.
  - Kredi kodunun sahibi (`companies` mi ayrı `credit` mi) belgede yok.
  - ERP kipinde "ERP onayladıkça düşer" mutabakatının ayrıntısı stok belgesine gönderme yapıyor; ERP belgesiyle (62) birlikte netleşmeli.

### 42. `docs/06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md` — Uygulama sistemi ve B2B

- **Kaynak kararlar:**
  - Uygulama kurulurken çalışacağı kanallar seçilir (varsayılan hepsi); token yalnız o kanalların verisini görür, webhook yalnız o kanalların olaylarını taşır; her olay `channel` taşır; admin iframe uzantıları yalnız kapsamdaki kanal seçiliyken.
  - Yeni izinler: `companies:read|write`, `companies:approve`, `credit:read|write`, `quotes:read|write`, `price_lists:read|write`, `stock:write`; kurulum ekranında vurgulu.
  - B2B olayları: `company.*`, `credit.changed`, `quote.*`, `approval.*`, `price_list.updated`, `order.placed` (şirket + PO), `order.due_soon`, `order.overdue`.
  - Admin yuvaları: `company.details.panel`, `quote.details.panel`, `price_list.details.panel`; vitrine uygulama arayüzü gömülmez.
  - Senkron kanca türleri değişmez (kargo oranı, ödeme, vergi); kanca isteği şirket `public_id`'si, müşteri grubu, fiyat listeleri taşır. Canlı fiyat ve canlı kredi kancası yok; yol `prices.setMany`, `credit.set`.
  - Abonelik eşleşmesi bellekteki `(olay, kanal) → uygulamalar` tablosundan; abonesi olmayan olay için outbox satırı yazılmaz.
- **Bağımlılık:** 47 (`features/apps`, `app-sdk`, `app-bridge`), 9 (outbox), 11 (izin sözlüğü), 32 (admin iframe yuvaları), 38-41 (olayların kaynakları).
- **Yapılacaklar:**
  1. `-` `packages/core/src/features/apps/scope/`: kurulumda kanal kapsamı (`app_installations` kanal listesi), saf `inScope.ts`; uygulama token'ıyla yapılan her sorguya kanal süzgeci.
  2. `-` `packages/core/src/features/apps/subscriptions/subscriptionTable.ts`: bellekte `(olay, kanal) → uygulamalar`; `shouldWriteOutbox.ts` saf (abonesi yoksa satır yok). Kurulum/kaldırmada tablo yenilenir.
  3. `-` İzin sözlüğüne B2B izinleri (`features/auth/permissions.ts` veri dosyası); kurulum ekranında "ticari sır" vurgusu (admin `features/apps/InstallConsent.svelte`).
  4. `-` Olay yüklerine `channel` alanı (tüm `events.ts` dosyaları); `order.placed` yüküne şirket `public_id` ve `po_number`.
  5. `-` Senkron kanca bağlamı: kargo/ödeme/vergi kanca isteğine B2B bağlamını ekleyen saf `buildHookContext.ts` (`features/apps/hooks/`).
  6. `-` Toplu uçlar: `prices.setMany` (`price_lists:write`), `credit.set` (`credit:write`); `price_list.updated` olayı.
  7. `-` Admin yuvaları `company.details.panel`, `quote.details.panel`, `price_list.details.panel` (32'deki yuva kayıt defterine ve manifest doğrulamasına).
  8. `-` Admin iframe uzantılarının kanal seçicisine göre görünürlüğü (`apps/admin/src/extensions/` süzgeci).
- **Testler:**
  - Birim: `inScope.test.ts`, `shouldWriteOutbox.test.ts` (abonesi olmayan olay için false), `buildHookContext.test.ts`.
  - Entegrasyon (gerçek DB): `integration-tests/core/__tests__/app-channel-scope.test.ts` (B2C kanalına kurulu uygulama B2B şirket verisini okuyamaz; webhook yalnız kapsamdaki kanalın olayı), abonesiz olayda outbox satırı yok.
  - Sözleşme: senkron kanca sözleşme süiti B2B bağlamıyla (kargo uygulaması bayiye farklı oran dönebilir).
  - Tur bütçesi: abonelik eşleşmesi için sorgu atılmaz (tur sayacı).
- **Bitti sayılır:**
  - Kanal kapsamı dışındaki veri uygulama token'ıyla 403/boş döner (test).
  - Abonesi olmayan olay sonrası outbox satır sayısı değişmez.
  - B2B izinleri sözlükte ve kurulum ekranında görünür.
- **Açık sorular / riskler:**
  - İzin sözlüğü 40'taki `quotes:offer`, `quotes:approve_discount`, `approvals:decide` ile tutarsız (bkz. 40).
  - Bellekteki abonelik tablosunun çok kopyada/Workers izolatlarında bayatlığı (ATLANANLAR yatay ölçekleme maddesi).
  - Webhook başlık/gövde şeması ve çok mağazalı app'in kanal ayrımı tasarlanmadı (ATLANANLAR).

---

## Bu gruptan ilk başlanacak 3 alt görev

1. **31/1-2:** `apps/admin` SvelteKit SPA iskeleti (`svelte.config.js` + `adapter-static` + `fallback`, kök `+layout.ts` `ssr = false`, `@openmers/ui` `theme.css` ve tek `<Toaster />`). Aşama 1'i beklemez, `@openmers/ui` hazır, SPA kipinin doğrulanmamış varsayımlarını erkenden sınar.
2. **33/1:** `apps/storefront`'a `dev`/`build` script'i ve en küçük Astro SSR sayfası; böylece mevcut `e2e/smoke.e2e.ts` gerçekten koşar (bugün config var, script yok).
3. **31/6:** `apps/admin/src/lib/table/useCursorTable.ts` + saf `tableQuery.ts` ve testi; `@openmers/ui` DataTable'ını `{ items, nextCursor }` sözleşmesine sahte veriyle bağlar, tüm admin listelerinin ortak çekirdeğidir.
