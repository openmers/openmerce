#!/bin/sh
# Run after building: package/app output sizes (largest first). Watch for the Workers bundle limit.
for d in apps/*/dist apps/*/build packages/*/dist packages/*/*/dist; do
  [ -d "$d" ] && echo "$(du -sh "$d" | cut -f1) - $d"
done | sort -hr
