[English](README.md) | **Türkçe**

# OpenMers

Açık kaynak, kendi sunucunda çalıştırılabilen B2C + B2B ticaret altyapısı. Aynı kod tabanıyla Cloudflare Workers (D1, R2) veya kendi sunucunda (Node.js + SQLite) çalışır.

> **Durum: tasarım aşaması.** Depoda şu an tasarım belgeleri ve boş bir monorepo iskeleti var. Çalıştırılabilir kod henüz yok.

## Genel bakış

- **Çekirdek model:** Vendure'un kavramlarını (kanal, katalog, stok, sipariş) izler, Saleor ve Medusa'nın en iyi yönlerini alır.
- **Üç genişletme katmanı:** çekirdek; built-in app'ler (süreç içi, derlemeye giren modüller); tak-çalıştır app'ler (dışarıda çalışan, admin'den kurulan).
- **Teknoloji:** Hono, oRPC, Drizzle (SQLite), Zod, Better Auth; Astro + Svelte vitrin; SvelteKit admin; Expo mobil.
- **Lisans:** MIT.

## Depo yapısı

```
apps/                 api · storefront · admin · mobile
packages/
  core/ contract/ db/ ui/ tokens/ theme-kit/ app-sdk/ app-bridge/ test-utils/ ...
  modules/            built-in app'ler (ödeme, kargo, fatura, İYS, ...)
  plugins/            depoyla gelen tak-çalıştır app'ler (pixel, erp)
  themes/             varsayılan tema
integration-tests/    api · core · race · contract
deploy/               Docker + Litestream, Caddy, systemd
docs/                 tasarım belgeleri
```

## Belgeler

Tasarım belgeleri Türkçe yazılmıştır ve [`docs/`](docs/README.md) altındadır. Dizinden başla; doğrulanmayanlar ve bekleyen kararlar [`docs/ATLANANLAR.md`](docs/ATLANANLAR.md) içinde izlenir.

## Lisans

[MIT](LICENSE)
