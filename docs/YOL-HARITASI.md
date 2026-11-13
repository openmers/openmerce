# Yol haritası: hangi dosyadan başlıyoruz

Sıra bağımlılığa göre: altta duran önce, üstüne kurulan sonra. `+` yapıldı, `-` yapılacak, `±` kısmen. Durum 2026-11-13 itibarıyla: kodda araç zinciri, `packages/tokens`, `packages/ui`, `packages/db` (settings, channels, channel_domains + migration kapısı) ve `packages/test-utils` (yalnız SQLite hedefi) var; `apps/*`, `contract` ve `core` boş iskelet (core'da yalnız `features/*/index.ts` yer tutucuları). Her madde kendi belgesinin kararlarını koda çevirmektir; karar değişirse önce belge güncellenir.

## Ayrıntılı listeler (belge belge)

Her belge için kaynak kararlar, bağımlılık, numaralı alt görevler (`+`/`-`/`±`), testler, bitti kriteri ve açık sorular:

- [01-asama-0-1-temel.md](yol-haritasi/01-asama-0-1-temel.md): madde 1-13
- [02-asama-2-ticaret.md](yol-haritasi/02-asama-2-ticaret.md): madde 14-30
- [03-asama-3-4-istemci-b2b.md](yol-haritasi/03-asama-3-4-istemci-b2b.md): madde 31-42
- [04-asama-5-6-genisletme-apps.md](yol-haritasi/04-asama-5-6-genisletme-apps.md): madde 43-54 + sağlayıcılar
- [05-asama-7-isletme-tak-calistir.md](yol-haritasi/05-asama-7-isletme-tak-calistir.md): madde 55-63

Bu listeler tasarım belgelerinden ve kodun bugünkü durumundan türetildi; yolların çoğu öneridir, kodda karşılığı yoktur.

Veritabanı kataloğu (173 tablo, migration sırası): [veritabani/00-genel.md](veritabani/00-genel.md).

## Aşama 0: araç zinciri ve tasarım sistemi (büyük kısmı bitti)

1. `01-tech-stack/01-tech-stack.md`
   + pnpm workspace, Biome, Vitest, Changesets, `pnpm verify`
   + e2e aracı (web + Android), `.mcp.json`
   - Tip denetimi (`tsc`/`svelte-check`) `verify`'a eklenmedi
2. `08-isletme/02-ci-cd.md`
   + `verify` ve `release-docker` iş akışları, `e2e-web`/`e2e-mobile` (yalnız elle tetik)
   - e2e-mobile'da emülatör ve apk adımı, gerçek `bundleId`
   - `verify` iş akışına tip denetimi
3. `08-isletme/03-test.md`
   + Vitest iki proje (`unit`, `ui`), e2e config ve duman testi
   - Storefront `dev` script'i yok, duman e2e koşmuyor
   - Sorgu planı testi, tur bütçesi testi, yarış testi (`integration-tests/*` boş)
4. `07-istemciler/07-ui-kutuphanesi.md`
   + 90 jeton, `theme.css`, `NOTICE`, 44 bileşen + DataTable, galeri (`pnpm --filter @openmers/ui playground`)
   ± Görsel kontrol (galeri açık); ikon boyutları, checkbox düzeltildi
   - Çıkarılan sınıflar (`bg-ui-border-component`, switch gradient) için görsel fark kararı
   - Tarih bileşenleri: varsayılan `tr` yerelini global yap
   - DataTable sütun sürükle-bırak (`@dnd-kit`)
   - Admin/builder'da `@openmers/ui` dışı UI'yı reddeden lint kuralı (bölüm 1.1)

## Aşama 1: veri ve çekirdek omurga (her şey buna bağlı)

5. `03-cekirdek/01-platform-arayuzu.md`
   - `Platform` arayüzü, `atomic()`, Node ve Cloudflare uygulamaları
6. `03-cekirdek/03-veri-kurallari.md`
   - `packages/db`: Drizzle şema (tablo grubu başına dosya), numaralı migration, para/kimlik kuralları
7. `03-cekirdek/07-yapilandirma.md`
   - Yapılandırma okuma, `env` yalnız uygulama katmanında
8. `03-cekirdek/02-api-ve-istek-baglami.md`
   - `Ctx`, Shop/Admin API ayrımı; `packages/contract` (Zod + oRPC)
9. `03-cekirdek/04-olaylar-isler-outbox.md`
   - Outbox, olay adları ve yükleri, iş kuyruğu
10. `03-cekirdek/05-onbellek.md`
    - Önbellek katmanı (`features/cache`)
11. `03-cekirdek/06-guvenlik-ve-yetki.md`
    - İzin modeli, denetim kaydı, gizli bilgi saklama (`secrets`)
12. `03-cekirdek/08-kimlik-dogrulama.md`
    - Müşteri/yönetici oturumu, B2B ve mobil belirteç
13. `02-genel-mimari/04-monorepo-klasor-yapisi.md`
    ± Klasörler ve paket iskeletleri var; içleri boş
    - Her paketin `index.ts` yüzeyi gerçek koda bağlanacak

## Aşama 2: ticaret çekirdeği (sipariş alabilen en küçük dilim)

14. `05-ticaret/01-kanallar.md` - kanal modeli ve kapsamı
15. `05-ticaret/02-katalog-ve-arama.md` - `catalog` (yazma), `catalogIndex` (okuma), arama
16. `05-ticaret/03-fiyat.md` - `pricing`, fiyat listesi seçimi (saf fonksiyon)
17. `05-ticaret/04-stok.md` - `stock`, rezervasyon
18. `05-ticaret/09-vergi.md` - `tax` (pazardan bağımsız varsayılan)
19. `05-ticaret/08-promosyon.md` - `promotions`
20. `05-ticaret/10-kargo-ve-teslimat.md` - `shipping`, `fulfillment`
21. `05-ticaret/05-sepet-ve-checkout.md` - `cart`, `checkout` (tur bütçesi)
22. `05-ticaret/06-odeme-ve-iade.md` - `payments`, iade
23. `05-ticaret/07-siparis.md` - `orders`, durum makinesi
24. `05-ticaret/11-musteriler.md` - `customers`
25. `05-ticaret/12-medya.md` - `media`
26. `05-ticaret/13-icerik-ve-gezinme.md` - `pages`, menüler
27. `05-ticaret/14-seo.md` - meta, site haritası
28. `05-ticaret/15-bildirimler.md` - `notify`
29. `05-ticaret/16-raporlama.md` - raporlar
30. `05-ticaret/17-belgeler.md` - sipariş özeti, paketleme listesi
    (14-30 hepsi: - henüz kod yok; yalnız `features/*/index.ts` yer tutucu)

## Aşama 3: istemciler (ilk görünür ürün)

31. `07-istemciler/02-admin.md`
    - `apps/admin`: iskelet, `routes` ince kabuk, `features/<x>/` (tablo, form); `@openmers/ui` zorunlu
32. `07-istemciler/06-admin-genisletme.md`
    - Admin eklenti modeli (`admin-sdk` `@openmers/ui`'yi yeniden dışa aktarır)
33. `07-istemciler/01-storefront.md`
    - `apps/storefront`, `dev` script'i, e2e duman testi çalışır hale gelir
34. `07-istemciler/04-tema-sistemi.md`
    - Tema paketi, `theme-kit`, `create-openmers-theme`, taslak önizleme
35. `07-istemciler/03-mobil.md`
    - `apps/mobile` (Expo), Android e2e
36. `07-istemciler/05-agentic-builder.md`
    - Sohbetle yönetim; araçlar = Admin API prosedürleri; arayüzü yalnız `@openmers/ui` ile üretir

## Aşama 4: B2B

37. `06-b2c-b2b/01-b2c-ve-b2b-ayni-cekirdek.md` - ortak çekirdek kuralları
38. `06-b2c-b2b/02-sirket-hesaplari.md` - `companies`
39. `06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md`
40. `06-b2c-b2b/04-teklif-ve-onay.md` - `quotes`
41. `06-b2c-b2b/05-kredi-ve-odeme-kosullari.md`
42. `06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md`
    (37-42 hepsi: - kod yok)

## Aşama 5: genişletme sistemi

43. `04-genisletme/01-stratejiler-ve-operasyonlar.md` - strateji noktaları
44. `04-genisletme/04-ozel-alanlar-ve-metadata.md`
45. `04-genisletme/02-built-in-apps.md` - `defineBuiltInApp`, `packages/modules/*`
46. `04-genisletme/07-built-in-app-gelistirme.md` - geliştirici rehberi uygulaması
47. `04-genisletme/03-tak-calistir-apps.md` - `features/apps`, `app-sdk`, `app-bridge`
48. `04-genisletme/05-tak-calistir-app-gelistirme.md` - `create-openmers-app`
49. `04-genisletme/06-medusa-eklentileri-karar-tablosu.md` - karar tablosu uygulaması
    (hepsi: - kod yok)

## Aşama 6: built-in app'ler ve sağlayıcılar

50. `09-built-in-apps/01-e-fatura.md` - `invoice-parasut`
51. `09-built-in-apps/05-iys.md` - `modules/iys`
52. `09-built-in-apps/03-favori-listesi.md`
53. `09-built-in-apps/04-urun-yorumlari.md`
54. `09-built-in-apps/02-abonelik.md`
54b. `07-istemciler/08-ajan-ticareti.md` - `llms.txt`, `/api/checkout/agent`, `packages/mcp-shop` (- kod yok; bağımlılık: 22 ödeme, 31 katalog API, idempotency)
    Ödeme, kargo, e-posta, SMS, arama sağlayıcıları (`payment-*`, `shipping-*`, `email-resend`, `sms-netgsm`, `search-meilisearch`): hepsi - yalnız iskelet. Global varsayılan: Stripe, e-posta, Meilisearch; Türkiye (iyzico, PayTR, Aras/MNG/Yurtiçi, Netgsm, Paraşüt, İYS) ek modül.

## Aşama 7: işletme ve tak-çalıştır app'ler

55. `08-isletme/01-self-host.md` - Node VPS + Litestream (`deploy/docker` var, ± çalıştırılmadı)
56. `08-isletme/07-kurulum-ve-tohum-veri.md` - ilk kurulum, tohum veri
57. `08-isletme/04-gozlemlenebilirlik.md`
58. `08-isletme/06-surum-yukseltme.md` - migration → deploy sırası
59. `08-isletme/08-veri-tasima.md` - Shopify, WooCommerce, ikas içe aktarma
60. `08-isletme/05-cok-kiracili-saas.md`
61. `10-tak-calistir-apps/01-pixel.md`
62. `10-tak-calistir-apps/02-erp.md`
63. `10-tak-calistir-apps/03-pazaryeri-entegrasyonu.md`
    (hepsi: - kod yok)

## Başvuru belgeleri (kod işi yok)

- `02-genel-mimari/01-genel-bakis.md`, `02-vendure-saleor-medusa-kararlar.md`, `03-performans.md` (ölçüm kapıları aşama 1-2'de testlere dönüşür), `05-vendure-capabilities.md`
- `ATLANANLAR.md`: bekleyen kararlar; her aşama başında gözden geçirilir
- `shopify-raporu/*`: araştırma notları, ilgili ticaret belgesini yazarken bakılır

## Önerilen ilk adım

Aşama 1'in 5-8. maddeleri (platform, `db`, yapılandırma, `Ctx` + `contract`). Bunlar olmadan ne `apps/api` ne admin ekranı gerçek veri okuyabilir. Paralel olarak admin iskeleti (31) `@openmers/ui` ile sahte veriyle başlayabilir.
