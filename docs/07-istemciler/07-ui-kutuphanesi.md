# UI kütüphanesi (`@openmers/ui`)

Kaynak: Medusa UI (`docs.medusajs.com/ui`). Okunan sayfalar: genel bakış, bağımsız kurulum, admin eklentisi kurulumu, ikonlar, `Container`. **Bileşen listesi, hook'lar, renk/jeton adları ve katkı sayfasına ulaşılamadı**; bu belge Medusa'nın paket ayrımını ve kurulum modelini alır, bileşen kataloğunu kendi ihtiyacımızdan çıkarır.

## 1. Medusa'da ne var, bizde karşılığı

| Medusa | İçerik | OpenMers |
|---|---|---|
| `@medusajs/ui` | React bileşenleri, hook'lar, yardımcılar | `@openmers/ui`: React bileşenleri, hook tabanlı yardımcılar (React portu sürüyor) |
| `@medusajs/ui-preset` | Tailwind ön ayarı (tüm sınıflar, jetonlar) | `@openmers/ui/theme.css`: Tailwind 4 `@theme` + jeton değişkenleri (`packages/tokens` kaynağından üretilir) |
| `@medusajs/icons` | 20 px sabit ikonlar | Lucide (`lucide-react`) üzerinden `@openmers/ui/icons` yeniden dışa aktarımı; ayrı ikon paketi yazılmaz |
| Figma "medusa-ui" | Bileşen, ikon, jeton | v1'de yok; jetonlar JSON, bileşen başvurusu Storybook benzeri `apps/ui-docs` (isteğe bağlı) |
| Admin'de hazır gelir (`admin-sdk`) | Ek kurulum yok | `@openmers/admin-sdk` `@openmers/ui`'yi yeniden dışa aktarır; admin eklentisi ayrıca kurmaz |

Medusa UI "Radix'in stilli, görüş sahibi hâli, shadcn'den esinli"; bizde admin zeminini **Radix primitives + React bileşenleri** oluşturur, vitrin teması ayrıdır. Fark: shadcn bileşenleri **kopyalanır** (kullanıcı düzenler); Medusa'nınki **paket** olarak gelir. Biz ikisini ayırırız:

- **`@openmers/ui` paketi (yeni, bu belge):** admin ve admin eklentileri için **sürümlü, düzenlenmeyen** ortak bileşen kümesi. Eklenti yazarı aynı görünümü paketten alır; admin yükseltilince eklentiler birlikte güncellenir.
- **Vitrin teması `ui/` klasörü** ([04-tema-sistemi.md](04-tema-sistemi.md)): shadcn-svelte bileşenleri temaya **kopyalanır**, tema serbestçe düzenler. Bu pakete bağlı değildir. Admin görünümü ve vitrin görünümü karıştırılmaz.

## 1.1 Zorunluluk: admin her zaman bu tasarım sistemiyle

- **Klasik admin** (`apps/admin`) ve **AI ile oluşan admin** (agentic builder'ın ürettiği ekran, panel, form, eklenti arayüzü; [05-agentic-builder.md](05-agentic-builder.md)) yalnızca `@openmers/ui` bileşenlerini ve `theme.css` jetonlarını kullanır. İstisna yok.
- Ajan arayüz üretirken bileşeni paketten alır: `Button`, `DataTable`, `Select`, `Alert`... Yeni ham HTML bileşeni, satır içi renk/gölge değeri, başka bir UI kütüphanesi ya da ayrı CSS yazmaz. Gereken bileşen yoksa önce pakete eklenir (inceleme + test), sonra kullanılır.
- Klasik ve AI admin aynı bileşenleri paylaştığı için görünüm kip değiştirince bozulmaz (açık/koyu dahil).
- Kapsam dışı: vitrin teması (`ui/` klasörü, shadcn-svelte kopyaları) bu kurala tabi değildir.
- Denetim: admin ve builder şablonlarında `@openmers/ui` dışı UI kütüphanesi içe aktarımı ve ham renk değeri lint ile reddedilir (kural henüz yazılmadı, aşağıda "Doğrulanmamış").

## 2. Paket yapısı

`packages/ui` (React; React portu sürüyor):

```
packages/ui/
  src/components/   # Button, Input, Select, Dialog, DataTable, Badge, Tooltip, Container, Heading, Text …
  src/hooks/        # useToggleState, usePrompt (onay penceresi), useMotion ([06-admin-genisletme.md] bölüm 2.6)
  src/utils/        # cn, biçimleyiciler (para, tarih, adet; çeviri katalogundan)
  src/theme.css     # Tailwind 4 @theme + jeton değişkenleri (üretilir)
  src/icons.ts      # Lucide yeniden dışa aktarımı, 20 px varsayılan
```

- Bileşen kuralları (Medusa'dan): basit ve birleştirilebilir; fazladan prop yok; yerel HTML öznitelikleri alttaki öğeye geçer (`...rest`); veri getirmez, API çağırmaz.
- Yönetici bileşenleri: `Container` (kart gibi bölüm sarmalayıcı, sayfa blokları bunu kullanır), `Heading`, `Text`, `StatusBadge`, `Money`, `DataTable` (sunucu taraflı sayfalama, [02-admin.md](02-admin.md)), `FormField` (form katmanı bağlayıcı, [06-admin-genisletme.md](06-admin-genisletme.md) bölüm 2.2), `Prompt` (yıkıcı eylem onayı), `Drawer`/`Sheet`, `Toaster` (Sonner, bölüm 2.5).
- Erişilebilirlik Radix primitives'ten gelir (klavye, odak, ARIA); her bileşende eksiksiz klavye testi.

## 2.1 Bileşen kataloğu: Medusa'nın 38 bileşeni bize göre

Kaynak: `components/*.md` sayfalarının 38'i de okundu. **Sayfaların API tabloları boş geldi**; prop, varyant ve boyut adları yalnızca örnek kodlardan bilinir. Karar: shadcn (React) / Radix'te karşılığı varsa onu sarmalarız (yeniden yazmayız); yoksa biz yazarız. Bileşenler Medusa'nın görünümünü bölüm 4'teki jetonlarla verir (Medusa değerleri, shadcn adları; MIT, kök `NOTICE`).

| Durum | Bileşenler |
|---|---|
| shadcn (React) / Radix'te var, sarmala | Alert, Avatar, Badge, Button (`size=icon` = IconButton), Calendar, Checkbox, Command (komut paleti), Dropdown Menu, Input, Kbd, Label, Radio Group, Select, Switch, Table, Tabs, Textarea, Tooltip, Dialog (= Focus Modal, tam ekran kipli), Sheet (= Drawer), Alert Dialog (= Prompt), Input OTP, Date Picker (Calendar + Popover, aralık ve ön ayar), Sonner (= Toast) |
| Yok, **biz yazarız** (ticarete özgü, öncelikli) | **CommandBar** (satır seçilince beliren toplu eylem çubuğu; tek harfli kısayol yalnızca seçim varken), **CurrencyInput** (sembol + kod, **küçük birim tamsayı** üretir, ondalık biçimi para biriminden), **StatusBadge** (sipariş/ödeme/teslimat durumları; renk eşlemesi tek yerde), **ProgressTabs / ProgressAccordion** (çok adımlı ürün oluşturma, kurulum sihirbazı; adım durumu: boş/kısmi/tamam, değerleri sayfadan okunamadı, bizim tanımımız), **Container, Heading, Text** (ince sarmalayıcılar), **Copy** (API anahtarı, takip numarası), **CodeBlock/Command** (API anahtarı, webhook örneği, kurulum komutu), **InlineTip**, **IconBadge** |
| Medusa'dan farkımız | `DataTable` (aşağıda), `FormField` (form katmanı), `Money` (biçimleyici), `Prompt` hook'u |

**DataTable (ayrıntılı okundu, v4.0.4+).** Medusa modeli tamamen **denetimli**: tablo veri getirmez, sıralamaz, süzmez; her özellik `state` + `on…Change` ister. Bu bizim sunucu taraflı tasarımımızla ([02-admin.md](02-admin.md)) örtüşür, aynen alınır:
- `createColumnHelper` / `createFilterHelper` / `createCommandHelper` benzeri yardımcılar; `useDataTable` karşılığı React hook'u (TanStack Table durumu).
- Süzgeç türleri: `select`, `radio`, `date` (aralık + `$gt/$lt/$gte/$lte` ön ayarları). Biz buna `boolean` ve `number-range` ekleriz (fiyat, stok).
- Arama, sıralama (`{ id, desc }`), satır seçimi (`{ [id]: true }`), toplu komut (kısayol yalnızca seçim varken), satıra tıklama (`onRowClick`).
- **Fark:** Medusa sayfalamayı `pageIndex` + `rowCount` ile yapar (sayı gerekir). Bizde **imleç** esastır ([../03-cekirdek/02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md)); toplam sayı pahalıdır, bu yüzden `rowCount` isteğe bağlı, yoksa "önceki/sonraki" gösterilir.
- Süzgeç durumu URL'ye yazılır (paylaşılabilir/geri tuşu); kayıtlı görünüm (saved view) bu durumun adlandırılmış kopyasıdır.

**Hook'lar.** `usePrompt` (sayfa okundu): söz döndüren onay iletişimi, `const ok = await prompt({ title, description, verificationText? })`. `verificationText` ("silmek için mağaza adını yazın") yıkıcı eylemlerde (mağaza silme, API anahtarı iptali, toplu silme) zorunlu olur. Bizde kök düzende tek `<PromptHost />` + `prompt()` işlevi (nanostores); eklentiler aynı işlevi `@openmers/admin-sdk/ui`'den alır. `useToggleState` (yalnız boolean aç/kapa/değiştir) React'ta `useState` ile gereksizdir, **yazılmaz**.

**Küçük kurallar (Medusa sayfalarından, bizde de geçerli):**
- Select'te boş dize (`""`) seçimi temizler; "Yok" seçeneği için sentinel değer (`"none"`) kullan, değişim işleyicide `null`'a çevir.
- Tabs'ta `orientation` düzeni değiştirmez, yalnızca ok tuşu yönünü; dikey görünüm elle stillenir.
- Tooltip, Medusa Admin dışında `TooltipProvider` ister (CodeBlock, Command, Copy de tooltip kullandığından); bizde admin kökü sağlar, iframe app'te `@openmers/ui` kendi sağlayıcısını getirir.
- Hata durumu özel prop değil, yerel `aria-invalid`; form katmanı hatası buna bağlanır.
- Toast: `toast.info|success|error|warning|loading(başlık, { description, action })`, Sonner ile aynı biçim; ek bir sarmalayıcı yazılmaz.
- OTP: varsayılan 6 hane, 3'lü gruplama, `onComplete`; müşteri tek kullanımlık kod girişinde ve yönetici 2FA'sında kullanılır ([../03-cekirdek/08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md)).
- `clx` (clsx + tailwind-merge) = bizde shadcn'in `cn`'i; yeniden adlandırılmaz.

## 3. Kurulum modeli (Medusa'dan uyarlandı)

- **Admin eklentisi / built-in app:** kurulum yok; `@openmers/admin-sdk` içinden içe aktarılır (`import { Container, Heading } from '@openmers/admin-sdk/ui'`). Tek kaynak: eklentinin kendi React/Tailwind kopyasını getirmesi engellenir (paket çift yüklenmesin diye `peerDependencies`).
- **Tak-çalıştır app (iframe):** `@openmers/ui` ayrı kurulabilir; Tailwind 4'te `@import "@openmers/ui/theme.css";` + `@source "…/node_modules/@openmers/ui/dist";`. Jetonlar iframe'e `app-bridge` ile aktarılır ve **açık/koyu kip** admin'le eşitlenir ([../04-genisletme/05-tak-calistir-app-gelistirme.md](../04-genisletme/05-tak-calistir-app-gelistirme.md) bölüm 8). React app'ler `@openmers/ui` bileşenlerini kullanabilir; diğer çerçeveler yalnızca `theme.css` + jetonları alır, bileşenleri kendisi yazar.
- **Koyu kip:** `dark` sınıfı veya `data-mode="dark"` (Medusa ile aynı iki yol); varsayılan sistem tercihi, yönetici kullanıcı ayarıyla ezer.
- **Sürümleme:** `@openmers/ui` kendi SemVer'ine sahiptir; `theme.css` ve bileşenler **birlikte** sürümlenir (Medusa ikisini ayrı sürümlüyor, biz ayırmıyoruz: ayrı sürüm uyumsuzluk üretir). Admin yükseltmesi eklentilere uyumluluk aralığıyla bildirilir (`compatibility`).

## 4. Jetonlar

`packages/tokens/src/tokens.json` tek kaynaktır; `packages/ui/src/theme.css` (`pnpm --filter @openmers/tokens build:theme`) ve ileride mobil (NativeWind) ayarı buradan üretilir. Kaynak `@medusajs/ui-preset` 2.22.6 kodu okundu: 90 renk (açık/koyu), 23 gölge, 35 tipografi sınıfı, `radius-xs`, 2 keyframe, `transition-fg`.

- **Karar (değişti):** Medusa'nın **tüm tasarım değerleri aynen alınır**. Lisans MIT (depo kökü "Copyright (c) 2021 Medusajs", `ui-preset/LICENSE` "Copyright (c) 2023 Medusajs"; `design-system` Enterprise materyallerinde yok). Lisans metni ve türetilen dosyalar kök `NOTICE` dosyasında.
- **Adlar:** shadcn adları esastır (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--secondary`, `--destructive`, `--ring`), değerleri Medusa'nın karşılık gelen jetonudur. `--sidebar-*` ve `*-foreground` takma adları başka jetona `var()` ile bağlanır. Shadcn karşılığı olmayan her jeton (hover/pressed türevleri, `tag-*`, `button-*`, `contrast-*`, `alpha-*`, gölgeler, tipografi) Medusa adını korur; değer kaybı yok. Tam tablo: `packages/tokens/src/mapping.md`.
- **Tailwind 4:** `bg-background`, `text-muted-foreground`, `bg-tag-blue-bg`, `shadow-buttons-neutral`, `txt-compact-small`, `transition-fg`, `rounded-xs`, `animate-accordion-down`.
- Hover/pressed türevleri Medusa'daki gibi ayrı jetondur (önceki `color-mix` kararı kaldırıldı). Koyu kip değerleri Medusa'nın alfa tabanlı değerleridir.
- Önceki plandaki `--success`, `--warning`, `--info` Medusa'da yok; eklenmedi, gerekirse `tag-green/orange/blue` üzerinden ayrı karar.

## 5. Test ve kalite

Bileşen başına: görsel regresyon (açık/koyu), klavye ve ekran okuyucu rolü, `...rest` geçişi. Paket boyutu bütçesi (ağaç sallama çalışmalı; tek bileşen içe aktarımı tüm kümeyi çekmemeli).

## 5.1 Kararlar (açık kalanlar kapatıldı)

- **Bileşen belgesi:** v1'de ayrı `apps/ui-docs` yok; her bileşenin yanında `*.stories`-benzeri örnek dosyası ve paketin `README.md`'si yeter. Belge sitesi v2.
- **İkon:** `lucide-react`, 20 px; özel ikon gerekirse paket içine SVG olarak eklenir.
- **Adım durumları (`ProgressTabs/Accordion`):** `not-started · in-progress · completed` (sayfadan okunamadığı için bizim tanımımız).
- **CommandBar kısayolu:** yalnızca seçim varken ve odak metin alanında değilken çalışır; çakışmada seçim çubuğu kazanır.
- **Çok adımlı form:** adım durumu form doğrulamasından türer (adımın alanlarında hata yoksa `completed`).

## 6. Doğrulanmamış

- Bölüm 1.1'deki lint kuralı (admin/builder'da `@openmers/ui` dışı UI içe aktarımını ve ham renk değerini reddetme) tasarlanmadı.
- Lisans: `@medusajs/ui` ve `ui-preset` MIT doğrulandı (yerel kaynak kodu, `LICENSE` dosyaları); değerler alındı, `NOTICE` var.
- Medusa sayfalarının **API tabloları boş** geldi: varyant/boyut/prop adları, `StatusBadge` renk listesi, `Badge` renkleri, `ProgressTabs` durum değerleri okunamadı. Katkı/Figma sayfaları ve `@medusajs/icons`'un tam listesi okunmadı. `CommandBar` kısayollarının genel mi bar'a bağlı mı olduğu belirsiz (bizde seçim varken ve odak metin alanında değilken çalışır, karar bizim).
- Medusa UI'nin React `^18.3.1` eşlemesi; bizde React 19 olduğundan sürüm eşlemesi birebir geçerli değil.
- Lucide'in 20 px varsayılanı, shadcn (React) güncel ikon paketi seçimi.
- `Radix primitives` ile paket olarak (kopyalamadan) dağıtılan bileşenlerin shadcn (React) güncelleme akışıyla çakışması.
- React dışı app'lere bileşen vermemek kararı bizimdir; talep gelirse web components sarmalayıcısı değerlendirilir.
