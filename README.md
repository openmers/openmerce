**English** | [Türkçe](README.tr.md)

# OpenMers

Open-source, self-hostable B2C + B2B commerce platform. It runs on Cloudflare Workers (D1, R2) or on your own server (Node.js + SQLite), from the same codebase.

> **Status: design phase.** The repository currently holds design documents and an empty monorepo skeleton. There is no runnable code yet.

## Overview

- **Core model:** follows Vendure's concepts (channels, catalog, stock, orders), borrowing the best parts of Saleor and Medusa.
- **Three extension tiers:** the core; built-in apps (in-process modules, compiled in); plug-and-run apps (external, installed from the admin).
- **Stack:** Hono, oRPC, Drizzle (SQLite), Zod, Better Auth; Astro + Svelte storefront; SvelteKit admin; Expo mobile.
- **License:** MIT.

## Repository layout

```
apps/                 api · storefront · admin · mobile
packages/
  core/ contract/ db/ ui/ tokens/ theme-kit/ app-sdk/ app-bridge/ test-utils/ ...
  modules/            built-in apps (payment, shipping, invoice, İYS, ...)
  plugins/            plug-and-run apps shipped in the repo (pixel, erp)
  themes/             default theme
integration-tests/    api · core · race · contract
deploy/               Docker + Litestream, Caddy, systemd
docs/                 design documents
```

## Documentation

The design documents are written in Turkish and live in [`docs/`](docs/README.md). Start with the index there; unverified items and pending decisions are tracked in [`docs/ATLANANLAR.md`](docs/ATLANANLAR.md).

## License

[MIT](LICENSE)
