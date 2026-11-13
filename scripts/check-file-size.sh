#!/bin/sh
# Kaynak dosyası 250 satırı geçerse hata verir (bileşen/dosya bölme kuralı, .claude/skills/*-structure).
# Migration, üretilmiş dosya ve belgeler hariç. Sınır: MAX=250.
MAX=${MAX:-250}; bad=0
for f in $(find apps packages integration-tests -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.svelte' -o -name '*.astro' \) \
  -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/migrations/*' -not -name '*.d.ts' -not -name '*.generated.*'); do
  n=$(wc -l < "$f")
  if [ "$n" -gt "$MAX" ]; then echo "$n satır: $f"; bad=1; fi
done
exit $bad
