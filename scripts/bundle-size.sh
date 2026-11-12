#!/bin/sh
# Derlemeden sonra çalıştır: paket/uygulama çıktı boyutları (büyükten küçüğe). Workers paket sınırı için izle.
for d in apps/*/dist apps/*/build packages/*/dist packages/*/*/dist; do
  [ -d "$d" ] && echo "$(du -sh "$d" | cut -f1) - $d"
done | sort -hr
