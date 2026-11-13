#!/bin/sh
# A migration merged into main is never edited (docs/veritabani/04-asama-1-db-plani.md §1.5).
# .sql and snapshots: M/D/R forbidden (new files only); meta/_journal.json: old entries stay as is, append only.
# Comparison base is BASE (default origin/main); skipped if missing (local, no remote).
BASE=${BASE:-origin/main}; DIR=packages/db/migrations; JOURNAL=$DIR/meta/_journal.json; bad=0
if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  echo "check-migrations: $BASE yok, atlandı"; exit 0
fi
changed=$(git diff --name-status "$BASE" -- "$DIR" | grep -E '^(M|D|R)' | grep -E '\.sql|_snapshot\.json')
if [ -n "$changed" ]; then echo "uygulanmış migration değişti:"; echo "$changed"; bad=1; fi
if old=$(git show "$BASE:$JOURNAL" 2>/dev/null); then
  # The line diff counts the last entry's `}` → `},` change as a deletion; compare entries as JSON.
  printf '%s' "$old" | node -e '
    const old = JSON.parse(require("fs").readFileSync(0, "utf8")).entries
    const cur = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).entries
    const ok = old.every((e, i) => JSON.stringify(e) === JSON.stringify(cur[i]))
    if (!ok) { console.error("_journal.json: eski girdi değişti ya da silindi"); process.exit(1) }
  ' "$JOURNAL" || bad=1
fi
exit $bad
