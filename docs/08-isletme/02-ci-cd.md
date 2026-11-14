# CI/CD (GitHub Actions)


| Workflow | Tetikleyici | İş |
|---|---|---|
| `verify` | Her PR ve `main` | `pnpm verify`: lint (Biome), tip (`tsc`; vitrin Svelte dosyaları için `svelte-check`), birim + entegrasyon testleri (D1 ve SQLite'ta), derleme |
| `e2e-web` | PR (etiketli) ve `main` | `e2e` web hedefi; geçici yerel mağazaya karşı |
| `e2e-mobile` | `main` ve sürüm etiketi | `e2e` mobil hedefi (Android emülatör); EAS ile derlenen apk |
| `deploy-cloudflare` | `main` (hazırlık ortamı), sürüm etiketi (üretim) | Önce D1 migration (`wrangler d1 migrations apply`), sonra Worker deploy. Migration eklemeli olduğu için ([veri kuralları](../03-cekirdek/03-veri-kurallari.md)) eski Worker geçiş sırasında çalışmaya devam eder |
| `release-docker` | Sürüm etiketi | Node + Litestream imajı derleyip kayıt defterine (GHCR) yükler; imaj açılışta migration'ı kendisi uygular |
| `release-mobile` | Sürüm etiketi | EAS Build + EAS Submit (TestFlight / Play); JS-only değişiklikte EAS Update |
| `release-packages` | Sürüm etiketi | Changesets ile `@openmers/*` paketlerini yayınlar |

Kurallar: üretim deploy'u yalnızca etiketten; sırlar GitHub Secrets'ta; `verify` yeşil olmadan birleştirme yok; dökümante edilmiş yedekten geri yükleme betiği (`backup:verify`) haftalık zamanlanmış bir işte çalışır.
