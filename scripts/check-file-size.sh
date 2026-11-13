#!/bin/sh
# Fails if a source file exceeds 250 lines (component/file splitting rule, .claude/skills/*-structure).
# Migrations, generated files and docs are excluded. Limit: MAX=250.
MAX=${MAX:-250}; bad=0
for f in $(find apps packages integration-tests -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.svelte' -o -name '*.astro' \) \
  -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/migrations/*' -not -name '*.d.ts' -not -name '*.generated.*'); do
  n=$(wc -l < "$f")
  if [ "$n" -gt "$MAX" ]; then echo "$n satır: $f"; bad=1; fi
done
exit $bad
