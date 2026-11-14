# Admin paneli

**React 19 + Vite** (SPA, statik çıktı), TanStack Router (dosya tabanlı rotalar), TanStack Query (sunucu durumu), TanStack Table (denetimli tablo modeli), shadcn/ui (Radix) tabanlı `@openmers/ui`, Tailwind CSS 4, nanostores (`@nanostores/react`). SEO gerekmez; tek sayfa uygulaması gibi davranır ve yalnızca Admin API ile konuşur. Vitrin Astro'dur ([01-storefront.md](01-storefront.md)); admin Astro kullanmaz.

**SPA kipi:** statik derleme tek HTML kabuğu üretir; sunucu tarafı kod yoktur (SSR, sunucu `load`, form action, API rotası yok). Rotalar TanStack Router'ın dosya tabanlı ağacından çıkar; her rota dosyası incedir, veri istemcide TanStack Query ile oRPC istemcisi üzerinden yüklenir. Neden Vite + React: dosya tabanlı yönlendirme, iç içe düzenler, tipli arama parametreleri ve istemci veri yükleme; Astro adası bunların hiçbirini vermiyordu ve tek sayfa uygulamasında ada mantığı gereksizdi. Neden sunucu yok: ikinci bir sunucu yüzeyi (çerez, CORS, gizli anahtar) eklememek; tüm yetki ve veri Admin API'dedir.

Bu belge **klasik kipi** (Shopify tarzı pano) anlatır. Aynı uygulamanın ikinci kipi, sohbet + önizleme + kod çalışma alanı olan **builder**dır: [05-agentic-builder.md](05-agentic-builder.md). İki kip aynı API'yi, izinleri ve denetim kaydını paylaşır; üst çubuktan geçilir.

## 1. Yapı

```
apps/admin/src/
  routes/        TanStack Router dosya yönlendirmesi; sayfa başına ince rota dosyası; genişletme rotaları için yakalayıcı `$`
  features/      orders/ products/ customers/ companies/ quotes/ settings/ apps/ ... (tablolar, formlar)
  lib/           api istemcisi · izin yardımcıları · tablo ve form çekirdeği
  extensions/    built-in app bileşen kayıt defteri · uygulama iframe konağı
```

## 2. Kurallar

- **Tablolar:** `@openmers/ui` DataTable, TanStack Table denetimli model ([07-ui-kutuphanesi.md](07-ui-kutuphanesi.md) bölüm 2.1); sunucu taraflı imleçli sayfalama, sıralama ve filtre. Tüm listeyi istemciye çekmek yok.
- **Formlar:** React form katmanı; Zod şeması `packages/contract`'tan, aynı şema sunucuda doğrular ([06-admin-genisletme.md](06-admin-genisletme.md) bölüm 2.2).
- **Operasyon formları şemadan üretilir:** promosyon koşulu, kargo hesaplayıcı, ödeme işleyici argümanları için elle form yazılmaz.
- **Özel alanlar** ilgili formun altında şemadan üretilen bölümde görünür.
- **İzin:** menü ve düğmeler `permissions` kümesine göre gizlenir; asıl denetim API'dedir.
- **Kanal seçici** üst çubuktadır; listeler etkin kanala süzülür.
- **Eşzamanlı düzenleme:** kayıt `version` taşır; çakışmada kullanıcıya fark gösterilir.

## 3. Genişletme

| Kaynak | Nasıl | Yalıtım |
|---|---|---|
| Built-in app | React bileşeni; `nav`, `panel`, `settings`, `dashboard widget` yuvalarına kaydolur ve admin derlemesine girer | Yok (güvenilen kod) |
| Uygulama | iframe + `@openmers/app-bridge` | Tam; DOM ve oturuma erişemez |

Çekirdek formların içine alan enjekte etmenin yolu özel alandır; yuva değil. Genişletme anahtarlarının tamamı (sayfa bloğu, eylem çubuğu, widget, uyarı, tema, dil), bildirim (Sonner), animasyon (Motion) ve yerleşim düzenleyici: [06-admin-genisletme.md](06-admin-genisletme.md).

## 4. Operasyon ekranları (çekirdek)

- **Outbox / işler:** bekleyen, başarısız, `dead` satırlar; yeniden kuyruğa alma.
- **Uygulamalar:** kurulu uygulamalar, izinler, son teslimatlar ve hatalar.
- **Stok istisnaları, belirsiz iadeler, uzlaştırma farkları.**
- **Yedek durumu** (self-host).
- **Denetim kaydı.**

## 5. Çalıştırma

- Geliştirme: önce API (`pnpm --filter @openmers/api-app dev`, varsayılan `http://localhost:3000`), sonra `pnpm --filter @openmers/admin-app dev`. Vite `/rpc` isteklerini API'ye vekiller; çerez aynı kökende kalır. Farklı API adresi için `OPENMERS_API_ORIGIN=http://localhost:4000` (yalnız dev vekili).
- Ortam değişkenleri (`apps/admin/.env.local`): `VITE_API_BASE` RPC yolu (varsayılan `/rpc`, köken değil yol); `VITE_OPENMERS_CHANNEL` istekte `x-openmers-channel` olarak gönderilen kanal kodu (boşsa API kanalı Host'tan çözer).
- Derleme: `pnpm --filter @openmers/admin-app build` → `apps/admin/dist` (tek HTML kabuğu + statik varlıklar); `preview` ile yerelde sunulur. Üretimde admin API ile aynı kökenden sunulmalı (`/rpc` aynı alan adında).
- `src/routeTree.gen.ts` TanStack Router eklentisinin ürettiği dosyadır; elle düzenlenmez, `dev`/`build` sırasında yenilenir ve depoya girer (tip denetimi Vite olmadan koşar).
- Kurulum yapılmamışsa API `SETUP_REQUIRED` döner ve admin `/setup` ekranına (ilk yönetici) yönlendirir.

## 6. Performans

Admin normalize tablolardan okur ve önbelleklenmez; doğruluk hızdan önce gelir. Yine de: her liste sorgusu indeksli ve imleçli, pano sayıları günlük özet tablosundan, ağır dışa aktarmalar işle.
