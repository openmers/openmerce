# Admin genişletme (React)

Kaynak: Vendure'un yeni React Admin Dashboard belgeleri (29 sayfanın 29'u okundu; sayfaların bağlandığı `reference/dashboard/...` sayfaları ve `how-to` sayfaları okunmadı). Vendure bu panelde React 19 + Vite + Tailwind 4 + shadcn/ui + TanStack kullanıyor. Biz **Vite + React 19 (SPA) + shadcn/ui (Radix) tabanlı `@openmers/ui` + TanStack Router/Query/Table + Tailwind 4 + nanostores** kullanıyoruz (admin Astro değil, Vite SPA; vitrin Astro kalır) ([02-admin.md](02-admin.md)); Vendure'dan **modeli** alıyoruz, kodunu değil. Mevcut genişletme tablosu ([02-admin.md](02-admin.md) bölüm 3) bu belgeyle genişler.

## 1. Vendure'un yaptığı, bizim kararımız

| Vendure | Bizde | Neden |
|---|---|---|
| Eklenti, `@VendurePlugin({ dashboard: './dashboard/index.tsx' })` ile giriş dosyasını bildirir; `defineDashboardExtension({...})` çağrılır | **Alındı.** Built-in app, `admin/index.ts` dosyasında `defineAdminExtension({...})` çağırır; dosya yolu `defineBuiltInApp({ admin: './admin/index.ts' })` ile bildirilir | Tek kayıt noktası, anahtar başına bir genişletme türü |
| Vite eklentisi, config'teki eklentileri tarayıp giriş dosyalarını toplar | **Alındı.** Admin derlemesi `builtInApps` listesinden sanal modül (`virtual:openmers-admin-extensions`) üretir; listede olmayan app'in admin kodu pakete girmez | Self-host'ta kullanılmayan app'in kodu yüklenmez ([02-built-in-apps.md](../04-genisletme/02-built-in-apps.md)) |
| Hedef, serbest dize `pageId` / `blockId` / `itemId`; kimlikleri Dev Mode gösterir | **Alındı, tip güvenli.** Kimlikler `@openmers/admin-sdk`'dan sabit birleşim tipi olarak çıkar (`PageId`, `BlockId`...); yanlış kimlik derleme hatasıdır. Dev Mode da var (kullanıcı menüsünde, kimlikleri rozet olarak gösterir) | Vendure'da yanlış yazılan kimlik sessizce işe yaramaz |
| GraphQL (`extendListDocument`, `extendDetailDocument`, gql.tada) | **Alınmadı.** API oRPC ve `packages/contract` Zod şemaları; GraphQL belgesi birleştirme yok. Ek veri için app kendi uç noktasını çağırır (`useQuery`), bağlamda `context.entity` hazır gelir | Bizde GraphQL yok; liste sorgusunu dışarıdan değiştirmek sorgu planını ve indeks garantisini bozar |
| TanStack Router dosya yönlendirmesi, Vendure'un tek `routes` dizisinden farklı | Çekirdek sayfalar dosya rotası, app sayfaları `$` yakalayıcısı (aşağıda) | Derleme zamanı rota çıkarımı ile çalışma zamanı kayıt defteri birleşmeli |
| Aynı süreçte çalışan React kodu (yalıtım yok) | Built-in app için aynı (güvenilen kod). Dış uygulama için **iframe**; aşağıda bölüm 4 | Mevcut karar |
| Vendure kendi `Angular Admin UI`'sini terk edip yeniden yazdı (geçiş sayfası) | İlgisiz: bizde eski panel yok, taşıma rehberi gerekmez | |

TanStack Router rotaları derleme zamanında dosyalardan çıkar, ama built-in app'lerin `routes` kayıtları sanal modülden gelir. Bu yüzden app rotaları `src/routes/$.tsx` yakalayıcısında kayıt defterinden çözülür (yol eşleşmezse 404 sayfası); çekirdek sayfalar normal dosya rotalarıdır. Sonuç: app rotası eklemek admin'i yeniden derlemeyi gerektirir (derleme zamanı kayıt, zaten böyle), ama çekirdek yönlendirme app sayısından bağımsızdır.

## 2. Genişletme anahtarları

`defineAdminExtension` bir nesne alır; her anahtar bir genişletme türüdür. Hepsi isteğe bağlıdır.

| Anahtar | Ne yapar | Kural |
|---|---|---|
| `routes` | Yeni sayfa: `path`, `component`, `navMenuItem?`, `authenticated?` | Yeni iş akışı veya tam sayfa için; mevcut sayfayı kopyalamak yerine aşağıdakiler tercih edilir |
| `navSections` | Menüye bölüm ve öğe; `placement: 'top' | 'bottom'`, `order`; başkasının menüsünü değiştirmek için fonksiyon biçimi | Görünürlük yalnızca sunumdur; yetki API'de ([02-admin.md](02-admin.md) bölüm 2) |
| `pageBlocks` | Bir sayfaya blok ekle, değiştir (`replace`) veya gizle: `location: { pageId, column: main \| side \| full, position: { blockId, order: before \| after \| replace } }`, `shouldRender(context)?` | Bileşen `context` alır: `entity`, `form`, `route` |
| `actionBarItems` | Sayfa üst çubuğuna düğme; `type: 'dropdown'` üç nokta menüsüne; `position`; `requiresPermission` | |
| `toolbarItems` | Genel üst çubuğa öğe (`id`, `component`, `position`, `requiresPermission`) | Bileşen `null` dönerek kendini gizleyebilir |
| `dataTables` | Liste tablosunda sütun hücresi değiştirme (`displayComponents`) ve toplu eylem (`bulkActions`) | Sorgu genişletme **yok** (bölüm 1) |
| `detailForms` | Ayrıntı formunda yerel alan girdisini değiştirme (`inputs: [{ blockId, field, component }]`) | Girdi, orijinalin işlediği tüm veri türlerini işlemek zorunda |
| `customFormComponents` | Global kayıtlı girdi bileşeni; özel alan veya operasyon argümanı `ui: { component: 'kimlik' }` ile seçer | Özel alanlar şemadan üretilen bölümde ([04-ozel-alanlar-ve-metadata.md](../04-genisletme/04-ozel-alanlar-ve-metadata.md)) |
| `alerts` | Pano uyarıları (bölüm 3.3) | |
| `insights.widgets` / `insights.filters` / `insights.excludeWidgets` | Pano widget'ı, genel filtre, başka app'in widget'ını gizleme | Widget kendi isteğini yapar, sayfayı bekletmez |
| `historyEntries` | Sipariş ve müşteri zaman çizelgesinde, `type` eşleşen kayıt için görünüm | Arka uç yazımı: servis `type` önekini `<app>.` ile yazar |
| `login` | Giriş sayfasında `logo`, `beforeForm`, `afterForm` yuvaları | Yalnızca built-in app; dış uygulama yok |
| `customProviders` | Uygulamayı (`app`) veya kimlikli düzeni (`layout`) saran bağlam/hata sınırı/telemetri sağlayıcıları, `order` ile | React'te context sağlayıcı + `children` |

Bileşenler React'tir; `context` prop'u ile bağlam alır. Ortak bileşenler `@openmers/ui` paketindendir ([07-ui-kutuphanesi.md](07-ui-kutuphanesi.md)). Sayfa iskeleti için çekirdek parçalar `@openmers/admin-sdk`'da: `Page`, `PageLayout`, `PageBlock`, `ListPage`, `DetailPage`, `useDetailPage`, `FormField`, `RelationSelect`, `MoneyInput`, `usePermissions`, `useChannel`, `api` (oRPC istemcisi). Genişletme yazan **yalnızca bu pakette dışa aktarılanı** içe aktarır; kendi UI kopyasını getirmez (stil ve sürüm tek yerde).

### 2.1 Liste ve ayrıntı sayfaları

- `ListPage`: sözleşmedeki liste şemasından sütunlar üretilir; imleçli sayfalama, sıralama, filtre zorunlu. Vendure'daki `PaginatedList` kuralı karşılığı: uç nokta `{ items, nextCursor }` döner.
- `DetailPage` / `useDetailPage`: `new` kimliği oluşturma kipidir; şema sözleşmeden gelir; kayıt `version` taşır ve çakışmada fark gösterilir ([02-admin.md](02-admin.md) bölüm 2).
- Sekmeli sayfa: `Page` altında `Tabs`; her sekme tek `PageLayout` içerir (Vendure aynı kuralı koymuş: iç içe düzen bozuluyor).
- Ayrıntı sayfasında "kaydet" düğmesini açmak için formda alan kirletme gerekirse `form.update(fn, { taint: true })` yardımcısı SDK'da.

### 2.2 Formlar

Admin formları React form katmanıyla yapılır; sunucu eylemi yoktur, doğrulama `packages/contract`'taki Zod v4 şemasından gelir. React form kütüphanesi seçimi açıktır; SDK'nın `FormField` ve `useDetailPage` parçaları bu katmanın üstünde ince sarmalayıcıdır.

| Konu | Karar |
|---|---|
| Şema | `packages/contract`'taki **Zod v4** şeması; istemci doğrulaması aynı şemayla |
| Gönderme | Form submit işleyicisi oRPC çağrısı yapar; istek sunucuya form action ile gitmez |
| Sunucu hatası | API'nin alan hataları forma alan yoluyla yazılır, genel hata form iletisine; sözleşmedeki hata biçimi eşlenir |
| İç içe veri ve diziler | Form durumu iç içe JSON tutar (satır kalemleri, adresler, indirim kademeleri); hatalar aynı ağaçta |
| Kaydedilmemiş değişiklik | `taintedMessage` ile çıkış uyarısı; geri alınan değişiklik "kirli" sayılmaz. `useDetailPage` bunu kullanır |
| Eşzamanlı düzenleme | Form katmanında yok. Kayıt `version` taşır, forma gizli alan olarak girer; API 409 dönerse fark ekranı açılır ([02-admin.md](02-admin.md) bölüm 2) |
| Başlangıç verisi | Rota/Query verisiyle form başlatılır; yeni kayıtta şemadan üretilen varsayılanlar |
| Birden çok form | Her biri ayrı `id`; iç içe `<form>` etiketi yok (iç form diyalog/portal içinde ayrı kök) |
| Özel girdi bileşenleri | `customFormComponents` / `detailForms.inputs` bileşenleri `value`, `onChange`, `name`, `errors`, `disabled` prop'larını alır |
| Şemadan üretilen operasyon formları | Promosyon koşulu, kargo hesaplayıcı vb. argüman formları dinamik şemadan üretilir; React form katmanının çalışma zamanında oluşan Zod şemasıyla kullanımı doğrulanmadı (ATLANANLAR) |

SDK'nın `FormField`, `useDetailPage`, `RelationSelect` vb. parçaları form katmanının üstüne ince sarmalayıcıdır; genişletme yazan form kütüphanesini doğrudan kurmaz. Doğrulama istemcide yalnızca kolaylıktır, **yetki ve gerçek doğrulama API'dedir** (istemci doğrulaması kurcalanabilir).

### 2.3 Uyarılar ve pano

- **Uyarı** (`alerts`): `id`, `check()`, `shouldShow(veri)`, `title`, `description`, `severity`, `actions`. Vendure her uyarı için ayrı aralıkla yoklar. Bizde: tek merkezli yoklayıcı en az 30 sn aralıkla çalışır, sekme gizliyken durur, her uyarı aralığına rastgele sapma eklenir; uyarı sayısı arttıkça admin'in API'yi sık dövmesi engellenir.
- **Pano widget'ı:** `id`, `name`, `component`, `defaultSize { w, h }`. Çekirdek `useWidgetFilters()` (tarih aralığı, genel filtreler) ve `useWidgetConfig()` (kullanıcı başına kalıcı ayar, `admin_user_prefs` tablosu) sağlar. Veri günlük özet tablosundan ([../05-ticaret/16-raporlama.md](../05-ticaret/16-raporlama.md)); widget ham tabloya gitmez. Genel yenile düğmesi, anahtarı `INSIGHTS_WIDGET_QUERY_KEY` ile başlayan sorguları yeniler (pencere odağında yenileme yok).

### 2.4 Tema ve dil

- **Tema:** CSS özel özellikleri (shadcn jeton adlarıyla: `--primary`, `--background`, `--sidebar-*`, `--radius`, `--brand`). `store.config.ts` içinde `admin.theme: { light, dark }` (oklch). Vitrin temasından ([04-tema-sistemi.md](04-tema-sistemi.md)) ayrıdır; yönetici paneli teması ve vitrin teması karıştırılmaz.
- **Dil:** **Lingui** (karar verildi). Vendure ile aynı katalog biçimi ve CLI ile çıkarım. Lingui React'i resmî olarak destekler; `.tsx` dosyalarından çıkarım yapılır. Katalog app başına `admin/i18n/{locale}`; v1 dilleri `tr`, `en`. Vitrin Paraglide kullanır ([../01-tech-stack/01-tech-stack.md](../01-tech-stack/01-tech-stack.md)); admin ve vitrin dil altyapısı ayrıdır.

### 2.5 Bildirim (toast): Sonner

- Admin'de bildirim **tek yol** `sonner` paketidir (`<Toaster />` bileşeni `@openmers/ui` üzerinden). `<Toaster />` admin kök bileşeninde bir kez yer alır; genişletmeler kendi `<Toaster />`ını koymaz. `toast` `@openmers/admin-sdk`'dan yeniden dışa aktarılır (Vendure'daki `toast` içe aktarma kuralının karşılığı).
- API: `toast.success / info / warning / error`, `toast.promise(fn, { loading, success, error })`, `description`, `action: { label, onClick }`, `position`.
- Kurallar: kaydetme/silme gibi mutasyonlar `toast.promise` ile; hata bildiriminde API hata kodu ve istek kimliği `description`'da (destek için); geri alınabilir eylemde (silme, arşivleme) `action` ile "Geri al"; **kalıcı olması gereken bilgi** (stok istisnası, başarısız iş) toast değil, `alerts` veya operasyon ekranıdır; bir toast hiçbir zaman tek başına yetkisiz/başarısız durumun tek göstergesi olmaz.
- Tema: Sonner varsayılan olarak sistem açık/koyu tercihini izler; biz `admin.theme` kipine bağlarız (`theme` prop'u) ve `--normal-bg / --normal-text / --normal-border` değişkenlerini tema jetonlarıyla eşleriz.
- Doğrulanmadı: `sonner` bileşeninin React 19 uyumu; `richColors` ve `Toaster`'ın diğer prop'ları bu oturumda okunmadı; ekran okuyucu duyurusu (aria-live) doğrulanmadı.

### 2.6 Animasyon: Motion

- Animasyon için **Motion** (`motion` paketi; React bağlayıcısı `motion/react`). `motion` bileşeni ve `animate()` işlevi kullanılır; durum değişince `useEffect` içinde çalıştırılır. React'in kendi geçiş/animasyon API'leri admin'de kullanılmaz (tek kural, tek kütüphane). shadcn/Radix bileşenlerinin kendi CSS animasyonlarına dokunulmaz.
- Boyut: `motion/mini` (belgeye göre ≈3.2 kb; yalnızca HTML/SVG stilleri, bağımsız dönüşüm yok) varsayılandır; tam `motion` (≈22 kb, gzip olup olmadığı belirtilmemiş) yalnızca yay (spring) fiziği, düzen (layout) animasyonu, sürükle-bırak yerleşimi gibi gereken yerde ve **dinamik içe aktarmayla**.
- Yerler: panel/çekmece açılışı, blok ekleme-kaldırma, yerleşim düzenleyicide sürükleme ve yeniden sıralama (bölüm 2.7), sıralı liste girişi. Sürükleme dışında süre ≤ 200 ms. 1000 satırlık tabloda, hücrede ve yazı yazarken tetiklenen yerde animasyon **yok**; animasyon kritik yolda beklenen bir şey olmaz (animasyon biterken veri yüklenir).
- **Azaltılmış hareket:** Motion sayfalarında `prefers-reduced-motion` anlatımı bulunamadı. SDK'da `useMotion()` yardımcısı bu medya sorgusunu okur ve animasyonu anında bitirir; admin içindeki hiçbir genişletme doğrudan `animate` çağırmaz, SDK'nın `animate` sarmalayıcısını kullanır. Düzen animasyonu için React DOM'dan `flushSync()` kullanılır.
- Doğrulanmadı: Motion React API'sinin React 19 ile uyumu, düzen animasyonlarının TanStack Router sayfa geçişlerindeki davranışı.

### 2.7 Yerleşim düzenleyici (Layout Composer, klasik pano)

Medusa 2.17.2'de duyurulan Layout Composer'dan uyarlandı (blog yazısı kısa; saklama biçimi, geliştirici API'si, sınırlar yazıda yok, aşağıdaki tasarım bizimdir). Yönetici klasik panelde şunları yeniden düzenler ve gizler: ayrıntı/liste sayfalarındaki **blok ve kartlar** (sürükle-bırak), **ana menü ve ayarlar menüsü** öğeleri, **üst çubuk** öğeleri. Çekirdek ve app blokları aynı biçimde ele alınır; çekirdek bir bloğu değiştirmek için gizle + yerine bir app bloğu koy (Medusa'nın "replace" tarifi) ya da `pageBlocks` içinde `replace`.

| Konu | Karar |
|---|---|
| Kapsam | İki katman: **mağaza varsayılanı** (tüm yöneticiler) ve **kişisel** (kullanıcı kendi üstüne yazar). Çözümleme: kişisel varsa o, yoksa mağaza, yoksa kodla gelen varsayılan |
| Yetki | Kişisel yerleşim: her yönetici. Mağaza varsayılanı: `admin_layout:manage` |
| Saklama | `admin_layouts`: `scope` (`store · user`), `admin_user_id?`, `page_id`, `config` (JSON: sütun başına sıralı `block_id` listesi, gizlenenler, menü ve üst çubuk sırası), `version`. Eşzamanlı yazma `version` ile |
| Yeni/kaldırılan blok | App güncellenince eklenen blok kodun varsayılan konumunda görünür (kullanıcının düzenini bozmaz), kaldırılmış veya app kapalı olan blok kimliği yok sayılır |
| Kilitli bloklar | Kaydet/iptal çubuğu, ana form gibi `locked: true` kayıtlı bloklar gizlenemez ve sütun değiştiremez; kayıt defteri bunu bildirir |
| Gizleme | Yalnızca sunumdur; yetki API'dedir ([06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)). Gizli blok veri istemez (sorgu yapılmaz) |
| Sıra önceliği | Yerleşim sırası, genişletmenin `order: before/after`'ından önceliklidir; `before/after` yalnızca varsayılan yerleşimi belirler |
| Yükleme | Oturum paketiyle tek istekte gelir (mevcut `/me` benzeri), nanostore'da; sayfa açılırken ek gidiş-dönüş yok. Kaydetme gecikmeli (debounce) |
| Sıfırlama | Sayfa başına "varsayılana dön"; mağaza varsayılanını silince kodla gelen varsayılan |
| Denetim | Mağaza varsayılanı değişikliği `audit_log`'a düşer; kişisel değişiklik düşmez (kişisel tercih) |
| Erişilebilirlik | Sürükleme yanında klavyeyle yukarı/aşağı taşıma zorunlu; yalnızca fareyle çalışan düzenleyici kabul edilmez |
| Dış uygulama blokları | Yerleştirilebilir/gizlenebilir ama içerik iframe kalır |
| Mobil | Düzenleme yalnızca masaüstü genişliğinde; kaydedilen sıra dar ekranda da uygulanır |

Sürükle-bırak kütüphanesi **seçilmedi** (Motion yalnızca animasyon sağlar, yerleşim sürükleme mantığı ayrı bir karar; ATLANANLAR). Test: kişisel + mağaza çözümlemesi; app güncellemesinde yeni blok görünür; kapalı app bloğu yok sayılır; kilitli blok gizlenemez; eşzamanlı iki kaydetmede biri çakışma görür; klavyeyle yeniden sıralama; gizli blok istek yapmaz.

## 3. Yaşam döngüsü ve performans

- **Kod bölme:** her genişletme anahtarı rota veya sayfa açılınca dinamik içe aktarılır; app'in admin kodu o sayfaya girilmedikçe yüklenmez. SaaS'ta tüm app'ler derlenir ama her blok mağazanın `settings.<app>_enabled` bayrağıyla süzülür; kapalı app'in menü öğesi, bloğu, uyarısı, widget'ı görünmez.
- **Hata yalıtımı:** her genişletme bileşeni bir hata sınırına sarılır; bir bloğun hatası sayfayı düşürmez, yerine "bu blok yüklenemedi" kartı ve denetim/telemetri satırı gelir. ⚠️ React hata sınırının TanStack Router'ın `errorComponent`'i ile birlikte davranışı bu oturumda doğrulanmadı.
- **Sıra ve çakışma:** aynı hedefte birden çok app varsa `order` sonra app kimliği sırasıyla; iki app aynı bloğu `replace` ederse **derleme hatası** (Vendure bu durumda ne olduğunu belgelemiyor; sessiz üzerine yazma istemiyoruz).
- **Yetki:** `requiresPermission` yalnızca gizler; API her zaman denetler ([06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)), kayıt düzeyi politika da API'dedir.

## 4. Dış (tak-çalıştır) uygulamalar

Dış uygulamanın kodu admin'in DOM'unda çalışmaz ([03-tak-calistir-apps.md](../04-genisletme/03-tak-calistir-apps.md)); yukarıdaki anahtarların bir alt kümesi **bildirimle** sunulur ve iframe veya köprü üzerinden çalışır:

| Anahtar | Dış uygulamada |
|---|---|
| `navSections` / `routes` | Manifestte `nav.page`: menü öğesi, sayfa iframe |
| `pageBlocks` | Manifestte `*.panel` yuvaları (ör. `order.details.panel`): iframe blok, sabit/yeniden boyutlanan yükseklik |
| `actionBarItems` | ⚙️ Önerilen: manifestte düğme; tıklayınca iframe modal veya `app.action` webhook'u |
| `alerts` | ⚙️ Önerilen: uygulama `admin.alerts.push` ucunu kendi token'ıyla çağırır (çekirdek istemci yoklaması gerekmez) |
| `insights.widgets` | ⚙️ Önerilen: `dashboard.widget` yuvası, iframe |
| `dataTables`, `detailForms`, `customFormComponents`, `login`, `customProviders`, `toolbarItems` | **Yok**: DOM'a doğrudan müdahale gerektirir; bunlar built-in app ayrıcalığıdır |

Yuva adlarının listesi ve manifest alanları [05-tak-calistir-app-gelistirme.md](../04-genisletme/05-tak-calistir-app-gelistirme.md) ile uyumlu tutulur; ⚙️ işaretliler önerilmiş, henüz o belgede yoktur.

## 5. Dağıtım

- **Cloudflare:** admin Vite statik derlemesidir (tek HTML kabuğu), statik varlık olarak ayrı alt alan adında (`admin.…`) sunulur; Pages/Workers statik varlıklarında SPA geri dönüşünün (bilinmeyen yolun kabuğa düşmesi) ayarı gerekir (doğrulanmadı); API ayrı kökene gidiyorsa `credentials` ve CORS ayarı gerekir. **Aynı kök alan altında çerez paylaşımı yapılmaz** ([08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md) bölüm 1).
- **Self-host:** aynı Node sürecinden `/admin` olarak sunulur ([01-self-host.md](../08-isletme/01-self-host.md)). Vendure'un "ayrı statik host" seçeneği için ek şey gerekmez, ama API adresi **derleme zamanında** gömülürse bir kez derlenen paket başka ortama taşınamaz; biz adresi çalışma zamanında `window.__OPENMERS__` ile veririz.
- Vendure'daki `base` ile sunucu `route` değerinin uyuşması ve sondaki eğik çizgi sorunu bizde tek kaynaktan (`admin.basePath`) türetilir.

## 6. Test

Yanlış `pageId` derleme hatası; toast tek `<Toaster />` ile görünür; azaltılmış harekette animasyon anında biter; yerleşim kişisel/mağaza çözümlemesi; kapalı app'in hiçbir yuvada görünmemesi; aynı bloğa iki `replace` derleme hatası; bozuk blok sayfayı düşürmez; yetkisiz kullanıcıda öğe gizli, API 403; uyarı yoklaması sekme gizliyken durur; widget yavaşlığı sayfayı bekletmez; dış uygulama yuvaları dışında bir şey kaydedemez.
