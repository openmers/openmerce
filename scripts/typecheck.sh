#!/bin/sh
# Type check: every workspace package that has a tsconfig.json.
# shortcut: Astro/Expo apps (admin, storefront, mobile) are skipped until they have sources to check.
set -e
fail=0
for cfg in packages/*/tsconfig.json packages/modules/*/tsconfig.json apps/api/tsconfig.json integration-tests/*/tsconfig.json; do
  [ -f "$cfg" ] || continue
  dir=$(dirname "$cfg")
  # Empty skeleton package: tsc reports a "no inputs" error.
  [ -n "$(find "$dir" \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" | head -1)" ] || continue
  pnpm exec tsc -p "$cfg" || { echo "tip hatası: $cfg"; fail=1; }
done
exit $fail
