#!/bin/sh
# Tip denetimi: tsconfig.json taşıyan her çalışma alanı paketi.
# shortcut: Svelte/Astro/Expo paketleri (ui, admin, storefront, mobile) atlanır; svelte-check kurulunca eklenir.
set -e
fail=0
for cfg in packages/*/tsconfig.json packages/modules/*/tsconfig.json apps/api/tsconfig.json integration-tests/*/tsconfig.json; do
  [ -f "$cfg" ] || continue
  case "$cfg" in packages/ui/*) continue ;; esac
  dir=$(dirname "$cfg")
  # Boş iskelet paket: tsc "girdi yok" hatası verir.
  [ -n "$(find "$dir" -name "*.ts" -not -path "*/node_modules/*" | head -1)" ] || continue
  pnpm exec tsc -p "$cfg" || { echo "tip hatası: $cfg"; fail=1; }
done
exit $fail
