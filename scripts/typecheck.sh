#!/bin/sh
# Type check: every workspace package that has a tsconfig.json.
# shortcut: Svelte/Astro/Expo packages (ui, admin, storefront, mobile) are skipped; added once svelte-check is installed.
set -e
fail=0
for cfg in packages/*/tsconfig.json packages/modules/*/tsconfig.json apps/api/tsconfig.json integration-tests/*/tsconfig.json; do
  [ -f "$cfg" ] || continue
  case "$cfg" in packages/ui/*) continue ;; esac
  dir=$(dirname "$cfg")
  # Empty skeleton package: tsc reports a "no inputs" error.
  [ -n "$(find "$dir" -name "*.ts" -not -path "*/node_modules/*" | head -1)" ] || continue
  pnpm exec tsc -p "$cfg" || { echo "tip hatası: $cfg"; fail=1; }
done
exit $fail
