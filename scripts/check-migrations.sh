#!/bin/sh
# main'e girmiş migration düzenlenmez (docs/veritabani/04-asama-1-db-plani.md §1.5).
# .sql ve snapshot: M/D/R yasak (yalnız yeni dosya); meta/_journal.json: eski girdiler aynen kalır, yalnız ekleme.
# Karşılaştırma tabanı BASE (varsayılan origin/main); yoksa (yerel, remote yok) atlanır.
BASE=${BASE:-origin/main}; DIR=packages/db/migrations; JOURNAL=$DIR/meta/_journal.json; bad=0
if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  echo "check-migrations: $BASE yok, atlandı"; exit 0
fi
changed=$(git diff --name-status "$BASE" -- "$DIR" | grep -E '^(M|D|R)' | grep -E '\.sql|_snapshot\.json')
if [ -n "$changed" ]; then echo "uygulanmış migration değişti:"; echo "$changed"; bad=1; fi
if old=$(git show "$BASE:$JOURNAL" 2>/dev/null); then
  # Satır diff'i son girdinin `}` → `},` değişimini silme sayar; girdileri JSON olarak karşılaştır.
  printf '%s' "$old" | node -e '
    const old = JSON.parse(require("fs").readFileSync(0, "utf8")).entries
    const cur = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).entries
    const ok = old.every((e, i) => JSON.stringify(e) === JSON.stringify(cur[i]))
    if (!ok) { console.error("_journal.json: eski girdi değişti ya da silindi"); process.exit(1) }
  ' "$JOURNAL" || bad=1
fi
exit $bad
