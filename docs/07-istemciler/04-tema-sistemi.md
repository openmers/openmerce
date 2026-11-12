# Tema sistemi

Tema yığını: **Astro + TypeScript + Tailwind CSS 4 + Svelte 5 + shadcn-svelte + nanostores.** Admin'de Shopify'daki gibi tema kütüphanesi vardır: yayındaki tema, taslak temalar ve **GitHub'dan bağla**. Tema içe aktarmanın tek yolu GitHub deposudur; zip yükleme yoktur.

Tema sözleşmesi (temanın hangi veriyi gördüğü) [01-storefront.md](01-storefront.md)'dedir; bölümler [../05-ticaret/13-icerik-ve-gezinme.md](../05-ticaret/13-icerik-ve-gezinme.md)'dedir. Bu belge temanın paket yapısını, derlenmesini ve yayınlanmasını tanımlar.

> **Doğrulama (2026-11-12, Cloudflare ve GitHub belgelerinden):** Worker sürümleri, sürüm adresleri, Workers for Platforms fiyatı, hesap sınırları, servis bağlaması, GitHub App izinleri, kurulum token'ı ve webhook imzası belgeden okundu; ilgili bölümlerde ✅ ile işaretli. Okunmayanlar ⚠️ ile işaretli.

## 1. Shopify'dan temel fark: tema derlenir

Shopify teması Liquid şablonudur; sunucu onu çalışma anında yorumlar, bu yüzden yüklenir yüklenmez çalışır. Bizim temamız **Astro kodudur ve derlenmesi gerekir**; ayrıca Workers çalışma anında kod yükleyemez.

Sonuç: "içe aktar" = **kaynağı al → derle → önizle → yayınla**. Kullanıcı için akış Shopify ile aynıdır (depoyu bağla, taslak olarak görünür, önizle, yayınla); arada bir derleme adımı vardır ve bir-iki dakika sürer.

Karşılığında kazanılan: tam Astro/Svelte gücü, tip güvenliği, derleme anında sözleşme denetimi ve yorumlayıcısız, hızlı vitrin.

## 2. Kabuk ve tema ayrımı

Vitrin iki parçadan derlenir:

| | Kabuk (`@openmers/storefront`) | Tema |
|---|---|---|
| Kim yazar | Çekirdek ekip | Herkes |
| İçerik | Yönlendirme, veri yükleme, önbellek başlıkları ve etiketleri, segment, SEO (meta, JSON-LD, site haritası, yönlendirmeler), sepet/checkout uçları, Pixel sandbox'ı, hata sayfası iskeleti | Düzenler, sayfa şablonları, bölümler, bileşenler, stiller, çeviriler |
| Veritabanı / sır erişimi | Yok; yalnızca Shop API | Yok; yalnızca kabuğun verdiği sunum modelleri |

Tema **rota tanımlamaz, veri çekmez, önbellek politikası yazmaz.** Kabuk sabit bir şablon kümesi bekler ve her şablona hazır sunum modelini `props` olarak verir. Böylece tema ne kadar değişirse değişsin önbellek, SEO ve performans kuralları bozulmaz.

**Vitrin API'den ayrı dağıtılır.** Tema üçüncü taraf kodudur; API süreciyle aynı yerde çalışırsa veritabanına ve sırlara erişebilirdi. Bu yüzden vitrin ayrı bir Worker / süreçtir ve elinde yalnızca Shop API istemcisi vardır (Cloudflare'de servis bağlaması, ağ turu olmadan; self-host'ta yerel HTTP). [01-storefront.md](01-storefront.md)'deki "aynı süreçte doğrudan `core` çağrısı" yalnızca yerleşik varsayılan tema ile, içe aktarılan tema yokken geçerli bir kısayoldur; içe aktarılan tema etkinse kullanılmaz.

## 3. Tema paketi

```
my-theme/
├── theme.json            # manifest
├── package.json          # yalnızca izinli bağımlılıklar (bölüm 9)
├── src/
│   ├── styles/
│   │   └── theme.css     # Tailwind 4: @import "tailwindcss"; @theme { … }
│   ├── layouts/
│   │   └── Base.astro
│   ├── templates/        # kabuğun beklediği sabit ad kümesi
│   │   ├── index.astro
│   │   ├── product.astro
│   │   ├── collection.astro
│   │   ├── search.astro
│   │   ├── page.astro
│   │   ├── post.astro  ·  blog.astro
│   │   ├── cart.astro
│   │   ├── account/…     # giriş, siparişler, adresler; B2B: hızlı sipariş, teklifler, onaylar
│   │   ├── checkout/…    # adım iskeletleri (form alanları kabuktan gelir)
│   │   └── 404.astro
│   ├── sections/         # her biri: Bileşen.astro + schema.ts (Zod)
│   │   ├── hero/
│   │   └── featured-collection/
│   ├── components/       # .astro (statik) ve .svelte (ada)
│   │   └── ui/           # shadcn-svelte bileşenleri (temaya kopyalanır)
│   ├── stores/           # temaya özel nanostores (arayüz durumu)
│   └── locales/          # tr.json, en.json
└── public/               # yazı tipleri, simgeler
```

### `theme.json`

```json
{
  "id": "acme.aurora",
  "name": "Aurora",
  "version": "1.4.0",
  "engine": "^1.0.0",
  "author": "Acme",
  "preview": "public/preview.png",
  "supports": { "b2b": true, "blog": true },
  "settings": "src/settings.ts"
}
```

- `engine`: uyumlu kabuk (tema sözleşmesi) sürüm aralığı. Karşılanmıyorsa derleme başlamadan reddedilir.
- `supports.b2b: false` olan tema `b2b`/`hybrid` kanalda yayınlanamaz (eksik şablonlar).
- `settings`: tema ayar şeması (Zod); admin formu bundan üretilir.

### Tema kiti

Tema, kabukla `@openmers/theme-kit` üzerinden konuşur:

- **Tipler:** her şablonun `props` tipi (`ProductPageProps`, `CollectionPageProps` …) ve sunum modelleri. Sözleşme budur; tipler derlemede denetlenir.
- **Store'lar:** `cart`, `session`, `segment` nanostores'ları (web ve mobille ortak olanlar). Tema bunları okur ve eylemlerini çağırır (`cart.add`), API yolu kurmaz.
- **Yardımcılar:** `formatPrice`, `t()` (çeviri), `<Image>` (hazır `srcset` ile), `<Section>` / `<Sections>` (bölüm render), `<CartForm>` (JS'siz çalışan gerçek form).
- **Yuvalar:** kabuğun `<head>` (meta, JSON-LD, Pixel) ve gövde sonu içeriği için `<ShellHead />`, `<ShellBody />`; tema bunları düzenine koymak zorundadır (derleme denetler).

## 4. Stil: Tailwind 4 ve tasarım belirteçleri

- Tailwind 4 CSS-öncelikli yapılandırmadır: tema `theme.css` içinde `@theme { --color-primary: …; --font-sans: …; --radius-md: … }` tanımlar. Ayrı `tailwind.config.js` yoktur.
- shadcn-svelte bileşenleri bu belirteçleri kullanır; tema `ui/` altındaki bileşenleri istediği gibi düzenler.
- **Ayarlar derleme gerektirmez:** `@theme` değişkenleri CSS özel özellikleridir. Mağaza sahibi admin'den rengi, yazı tipini, köşe yarıçapını değiştirdiğinde kabuk, `<head>`'e bu değişkenleri ezen küçük bir `<style>` basar (kanal + tema ayarından, bellekte). Yeniden derleme olmaz; yalnızca `shell` önbellek etiketi temizlenir.
- Aynı belirteçler `packages/tokens` üzerinden mobil uygulamanın temasına da aktarılır; mağaza rengini bir kez seçer.
- Koyu kip, tema destekliyorsa belirteç kümesi çiftidir.

## 5. Ayarlar ve bölümler

- **Tema ayarları** (genel): renkler, yazı tipleri, logo, üst/alt bilgi seçenekleri, ürün kartı biçimi. Şema Zod; değerler `theme_settings(channel_id, theme_id)` JSON'unda.
- **Bölümler:** `sections/<ad>/schema.ts` ayar şemasını ve bölümün istediği referansları (`collection`, `products`, `media`) bildirir. Sayfa düzeni (hangi bölüm, hangi sırada, hangi ayarla) veritabanındadır, temada değil; tema değişince düzen, aynı adlı bölümler için korunur, olmayanlar "bu temada yok" olarak işaretlenir.
- Tema, şablon başına **varsayılan düzen** (`templates/index.json` gibi) sağlayabilir; ilk yayında kopyalanır.
- Ayar ve düzen değişikliği **taslak** olarak kaydedilir, önizlenir, sonra yayınlanır.
- Sürükle-bırak görsel düzenleyici v1'de yoktur; form tabanlı düzenleme + canlı önizleme vardır.

## 6. Etkileşim: adalar

- Varsayılan `.astro` (sıfır JavaScript). Svelte yalnızca gerektiğinde ada olarak: sepet çekmecesi, ürün galerisi, varyant seçici, arama önerileri, mobil menü.
- Adalar veri çekmez; `theme-kit` store'larını ve kabuğun verdiği `props`'u kullanır.
- Sepete ekle ve benzeri eylemler JS'siz de çalışır (`<CartForm>`); ada varsa yakalar ve sayfayı yenilemeden günceller.
- Derleme, sayfa başına JavaScript bütçesini ölçer ve eşik aşılırsa **uyarır** (varsayılan) veya reddeder (ayar).

## 7. Tema kütüphanesi (admin)

Shopify'daki ekranın karşılığı: **Çevrimiçi Mağaza → Temalar.**

- **Yayındaki tema** (kanal başına bir tane): önizleme görseli, sürüm, "Düzenle", "Önizle".
- **Taslak temalar:** her biri için "Yayınla", "Önizle", "Düzenle", "Sil", ve depoda yeni commit varsa **"Güncelle"**.
- **GitHub'dan bağla:** yeni tema eklemenin tek yolu.
- Varsayılan tema her kurulumda hazır gelir.

Tablolar:

| Tablo | İçerik |
|---|---|
| `themes` | `public_id`, ad, kaynak (`builtin · github`), depo, dal, GitHub kurulum kimliği, durum |
| `theme_builds` | tema, commit SHA, `state` (`queued · building · ready · failed`), derleme günlüğü, çıktı referansı (Worker sürüm kimliği veya yerel dizin), kabuk sürümü, JS/CSS boyutları |
| `theme_settings` | kanal + tema başına ayar ve taslak |
| `channel_themes` | kanal → yayındaki `theme_build` + bir önceki (geri dönüş için) |

**Yayınla** = kanalı hazır bir derlemeye çevirmek; yeniden derleme gerekmez. **Geri al** = önceki derlemeye dönmek. Nasıl yapıldığı hedefe göre değişir (bölüm 9).

**Önizleme:** her hazır derlemenin bir önizleme adresi vardır; yanıtları `no-store` ve `noindex`'tir, yayındaki mağazayı ve önbelleğini etkilemez.

## 8. GitHub'dan bağla

1. Admin "GitHub'dan bağla"yı seçer → GitHub App'i kendi hesabına/kuruluşuna kurar ve **yalnızca tema deposunu** seçer → dal seçer.
2. Mağaza, deponun kökünde geçerli bir `theme.json` arar; yoksa reddeder.
3. İlk derleme kuyruğa girer; tema taslaklara eklenir.
4. **Her push** yeni bir derleme tetikler. Hazır olunca:
   - dal **taslak** temaya bağlıysa derleme o taslağın güncel hâli olur;
   - dal **yayındaki** temaya bağlıysa varsayılan davranış "Güncelle" düğmesi göstermektir; otomatik yayın isteğe bağlı bir ayardır (kapalı gelir).
5. Derleme durumu commit'e geri yazılır (önizleme bağlantısıyla).

Başkasının temasını kullanmak = o depoyu kendi hesabına çatallayıp (fork) bağlamak. Böylece mağaza sahibi çalışan kodun sahibidir ve yukarı akıştaki değişiklik onun onayı olmadan vitrine giremez.

Admin'de yapılan ayar ve düzen değişiklikleri veritabanındadır, depoya geri yazılmaz. Kod depoda, içerik veritabanında.

### 8.1 GitHub App ✅

| İhtiyaç | Depo izni | Uç |
|---|---|---|
| Kaynağı indirme | **Contents: read** | `GET /repos/{owner}/{repo}/tarball/{ref}` (302 yönlendirme; özel depoda bağlantı 5 dakika geçerli) |
| Depo bilgisi | **Metadata: read** | `GET /repos/{owner}/{repo}` |
| Push olayı alma | Contents: read (push olayı için en az okuma) | webhook `push` |
| Derleme durumunu yazma | **Commit statuses: write** | `POST /repos/{owner}/{repo}/statuses/{sha}` (`pending · success · failure · error`) |

- Başka izin istenmez (issue, PR yok).
- **İstisna — builder:** ajanın tema kodu yazabilmesi için App'e **Contents: write** eklenir; yazma yalnızca `openmers/agent/*` dallarına ve "Yayınla" ile bağlı dala yapılır, token işlem başına daraltılır ([05-agentic-builder.md](05-agentic-builder.md) bölüm 6). ⚠️ Git Data API ve dal güncelleme uçları doğrulanmadı.
- **Kurulum token'ı** 1 saat geçerlidir ve istek anında üretilir; `repository_ids` ve `permissions` ile tek depoya ve gereken izinlere daraltılır. Saklanmaz. Kasada yalnızca App özel anahtarı ve webhook sırrı durur.
- **Webhook doğrulama:** `X-Hub-Signature-256` başlığı = gövdenin webhook sırrıyla HMAC-SHA256 özeti (`sha256=` önekli); karşılaştırma sabit zamanlı yapılır (düz `==` kullanılmaz). İmza geçersizse 401 ve hiçbir şey yazılmaz.
- `push` gövdesinden `ref` (dal), `after` (commit SHA), `repository` ve `installation` okunur; yalnızca bağlı dalın push'u derleme tetikler. Webhook yalnızca dürtmedir; commit, kurulum token'ıyla GitHub'dan yeniden okunur.
- Barındırılan kurulumda OpenMers'in App'i kullanılır. Self-host'ta mağaza sahibi kendi App'ini oluşturur (kurulum sihirbazı, GitHub'ın "manifestten App oluştur" akışıyla tek tık yapmayı hedefler ⚠️ doğrulanmadı).

## 9. Derleme ve yayın

Derleme = `kabuk + tema kaynağı → Astro build → dağıtılabilir çıktı`. İstek sürecinde **yapılamaz** (Workers'ta Node araç zinciri yok).

Derleme adımları (her hedefte aynı):

1. Commit'i al, bütünlük özetini kaydet.
2. **Statik denetim** (bölüm 10).
3. Bağımlılıkları kilit dosyasından, **betik çalıştırmadan** kur (`--ignore-scripts`).
4. Tip denetimi: şablon `props` tipleri sözleşmeye uyuyor mu, zorunlu şablonlar var mı, `<ShellHead/>`/`<ShellBody/>` yerleştirilmiş mi.
5. Astro derlemesi (hedef adaptör: Cloudflare veya Node).
6. Duman testi: derlenen vitrin sahte veriyle açılır; her şablon 200 döner, JS bütçesi ölçülür.
7. Çıktıyı yükle, `theme_builds` satırını `ready` yap, commit durumunu yaz.

Derleme ortamı **yalıtılmıştır**: mağaza sırları, veritabanı ve iç ağ erişimi yoktur.

### 9.1 Self-host

- **Derleyici:** sunucuda ayrı, yetkisiz bir alt süreç/konteyner. Kaynağı kurulum token'ıyla tarball olarak indirir.
- **Çıktı:** `packages/themes/<build>/` dizini.
- **Yayınla:** `channel_themes` işaretçisini değiştirmek (tek koşullu güncelleme) + `shell` önbellek temizliği. Vitrin süreci yayındaki derlemeyi yükler.
- **Önizleme:** imzalı, süreli `?theme_preview=<token>` → çerez; aynı süreç ilgili derlemeyi sunar.

### 9.2 Cloudflare (tek mağaza) ✅

Kanal başına bir vitrin Worker'ı vardır (`storefront-<kanal>`); **her tema derlemesi o Worker'ın bir sürümüdür.**

| İş | Cloudflare karşılığı |
|---|---|
| Derleme çıktısını yükleme | `wrangler versions upload` — sürüm oluşturur, trafiğe açmaz |
| Önizleme | Sürüm adresi: `<sürüm-öneki>-<worker>.<alt-alan>.workers.dev` |
| Yayınla | O sürümü %100 trafikle yeni dağıtım yapmak |
| Geri al | Önceki sürümü yeniden dağıtmak |
| Kademeli geçiş (isteğe bağlı) | Kademeli dağıtım: iki sürüm arasında yüzdeyle |

Belgeden doğrulanan sınırlar:

- Bir dağıtımda **en fazla iki sürüm** aynı anda trafik alır; yani kanal başına tek yayındaki tema (+ geçiş sırasında bir önceki). Bu, modelimizle örtüşür.
- Dağıtılabilecek sürümler **son 100 yüklenen sürümle** sınırlıdır. Çok eski bir taslağı yayınlamak için yeniden derlemek gerekir; `theme_builds` bunu "süresi doldu" olarak gösterir.
- Sürüm adresleri **yalnızca `workers.dev` altında** çalışır, özel alan adında çalışmaz ve açıldığında **herkese açıktır**. Bu yüzden önizleme adresi mağaza alan adında değildir; gizlilik için Cloudflare Access önerilir veya kabuk, sürüm adresinden gelen isteklerde imzalı önizleme token'ı ister.
- Durable Object kullanan Worker'lar için sürüm adresi üretilmez; vitrin Worker'ı Durable Object kullanmaz.
- Hesap başına Worker sayısı: Free 100, Paid 500. Kanal başına bir vitrin Worker'ı bu sınırın çok altındadır.
- Vitrin → API çağrısı **servis bağlamasıdır**: belgeye göre ek gecikme ve ek maliyet yoktur; RPC (`WorkerEntrypoint`) desteklenir. Tek istekte en fazla 32 Worker çağrısı sınırı vardır.

**Derleyici:** GitHub Actions. Tema şablonu (`create-openmers-theme`) hazır bir iş akışıyla gelir: push'ta OpenMers derleme eylemi kabuğu indirir, bölüm 9'daki adımları çalıştırır, `wrangler versions upload` ile sürümü yükler ve sürüm kimliğini mağaza API'sine bildirir. Depoya iki sır eklenir: Cloudflare API token'ı (yalnızca o Worker için) ve mağazanın tema derleme token'ı. *Bu sırların bağlama sihirbazınca otomatik yazılması ek GitHub izni ister; v1'de sihirbaz değerleri gösterir, kullanıcı ekler.*

**Yayınla düğmesi** Cloudflare API'sini çağırır; bunun için mağaza kasasında Workers düzenleme yetkili bir Cloudflare API token'ı durur. Token yoksa admin, aynı işi yapan `wrangler` komutunu gösterir.

Cloudflare'in kendi derleme hizmeti (Workers Builds) depoya bağlanıp push'ta derleyebilir ve üretim dışı dallar için önizleme üretir; ancak bizim derleme "kabuk + tema" birleşimi ve ek denetimler içerdiği için varsayılan yol GitHub Actions'tır. Workers Builds'in süre/fiyat sınırları okunmadı ⚠️.

### 9.3 Barındırılan (SaaS) ✅

Çok sayıda mağaza ve tema için **Workers for Platforms**: her tema derlemesi bir dağıtım ad alanındaki (dispatch namespace) ayrı bir "kullanıcı Worker'ı"dır; yönlendirici Worker, kanalın işaretçisine göre `env.DISPATCHER.get("<derleme-adı>")` ile doğru olanı çağırır.

- Müşteri kodunu yalıtılmış çalıştırmak için tasarlanmıştır; kullanıcı Worker'ına yalnızca verilen bağlamalar geçer ve **giden trafik bir "outbound Worker" ile denetlenebilir** (temanın dışarıya istek atmasını engellemek için).
- Yayınla = işaretçi değişimi (anında, Cloudflare dağıtımı gerekmez). İstenen sayıda taslak aynı anda önizlenebilir, özel alan adında da.
- Fiyat (belgeden, 2026-04): aylık **25 $**; 20 milyon istek, 60 milyon CPU ms ve **1000 betik** dahil; fazlası milyon istek başına 0,30 $, milyon CPU ms başına 0,02 $, **ek betik başına 0,02 $**. Yönlendirici + kullanıcı + outbound Worker zinciri tek istek olarak faturalanır.
- Eski derlemeler silinerek betik sayısı sınırlı tutulur (tema başına son N derleme).

Tek mağazalı kurulum için Workers for Platforms gerekmez; 9.2 ücretsizdir.

## 10. Güvenlik

Tema üçüncü taraf kodudur ve müşterinin tarayıcısında, ayrıca vitrin sunucusunda çalışır.

- **Sunucu tarafı yalıtım:** vitrin sürecinde veritabanı, kasa veya admin API erişimi yoktur. Kötü niyetli tema en fazla kendi kanalının Shop API'sini, o isteğin müşteri oturumuyla çağırabilir.
- **Statik denetim:** `theme-kit` dışında sunucu tarafı ağ çağrısı (`fetch`), `process`/`env` erişimi, `eval`, dinamik `import()` ve Astro ara katmanı/uç nokta dosyaları reddedilir. Tema `src/pages` ve `src/middleware` içeremez.
- **Bağımlılıklar:** izin listesi (Svelte, bits-ui ve shadcn-svelte'in dayandıkları, yardımcı küçük kütüphaneler) + kilit dosyası zorunlu + kurulum betikleri kapalı. Liste dışı paket uyarıyla derlemeyi durdurur; mağaza sahibi (self-host) açıkça izin verebilir.
- **Tarayıcı tarafı:** tema, müşterinin gördüğü sayfadır; kötü niyetli tema form verisini okuyabilir. Bu yüzden **ödeme bilgisi sayfada değil sağlayıcının barındırdığı sayfadadır**, checkout form alanları kabuğun bileşenleridir ve CSP dış betik/bağlantı kökenlerini sınırlar (tema ek köken isterse `theme.json`'da bildirir, admin onaylar).
- **Kurulum uyarısı:** resmî olmayan tema bağlanırken "bu tema mağazanızın vitrininde kod çalıştırır" onayı istenir; kaynak ve özet kaydedilir.
- Tema bağlama ve yayınlama `themes:write` izni ve yeniden kimlik doğrulama ister; hepsi denetim kaydına düşer.

## 11. Performans

- Vitrin derlenmiş koddur; istek anında şablon yorumlanmaz.
- Önbellek, veri turu bütçesi ve "render yolunda dış çağrı yok" kuralları kabuktadır; tema bunları bozamaz ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md)).
- Tema ayarı değişikliği CSS değişkenidir; derleme ve tam önbellek temizliği gerektirmez.
- Derleme, sayfa başına JS/CSS boyutunu ve en büyük içerik görselinin öncelik ipucunu denetler; sonuç `theme_builds`'te saklanır ve kütüphanede gösterilir.

## 12. Varsayılan tema ve geliştirici deneyimi

- **Varsayılan tema** depoda gelir (`packages/themes/default`), B2C + B2B şablonlarının tamamını içerir ve tema sözleşmesinin referans uygulamasıdır.
- `create-openmers-theme`: varsayılan temadan yeni tema iskeleti.
- `openmers theme dev --store <adres>`: yerelde Astro geliştirme sunucusu, gerçek mağazanın Shop API'sine (veya tohum veriye) bağlı, anında yenileme.
- `openmers theme check`: bölüm 9'daki statik denetim + tip denetimi, yerelde ve CI'da.

## 13. Sürüm uyumu

- Tema sözleşmesi (`theme-kit` tipleri ve zorunlu şablon kümesi) eklemelidir: yeni isteğe bağlı alan ve yeni isteğe bağlı şablon küçük sürümde gelir; zorunlu yeni şablon veya alan kaldırma yalnızca büyük sürümde.
- Çekirdek yükseltilince kabuk değişir; **mevcut tema derlemeleri yeni kabukla yeniden derlenir** (iş olarak). Yeniden derleme başarısız olursa kanal eski derlemeyle (eski kabuk sürümüyle) yayında kalır ve admin'e uyarı düşer; bu yüzden kabuk, bir önceki küçük sürümün Shop API'siyle uyumlu kalır.
- Tema mağazası / pazaryeri kapsam dışıdır; temalar GitHub depoları olarak dağıtılır.

## 14. Sıralama

1. Kabuk / tema ayrımı + `theme-kit` + varsayılan tema (derleme deponun kendi CI'ında).
2. Tema ayarları (CSS değişkenleri) ve bölümler.
3. `theme_builds`, yayınla / önizle / geri al.
4. GitHub'dan bağla: GitHub App + self-host derleyici.
5. Cloudflare: GitHub Actions derleme eylemi + Worker sürümleriyle yayın.
6. `create-openmers-theme` ve `theme dev`.

## 15. Test

Sözleşmeye uymayan temanın derlemede reddi; yasak içe aktarma/`fetch` içeren temanın reddi; bağlı olmayan dalın push'unun yok sayılması; yayınla/geri al sırasında kesintisizlik; önizlemenin yayındaki önbelleği kirletmemesi; ayar değişikliğinin yeniden derleme olmadan yansıması; imzası geçersiz GitHub webhook'unun reddi; kabuk yükseltmesinde yeniden derleme başarısız olursa eski derlemenin yayında kalması.

## 16. Açık sorular

1. Yayındaki temaya bağlı dalda otomatik yayın varsayılanı (şu an: kapalı).
2. Bağımlılık izin listesinin kapsamı.
3. Cloudflare'de depo sırlarını sihirbazın otomatik yazması (ek GitHub izni) isteniyor mu?
4. Sürüm adresiyle önizlemenin gizliliği: Cloudflare Access mi, kabukta imzalı token mı?
5. Görsel (sürükle-bırak) düzenleyici sonraki aşamada isteniyor mu?
