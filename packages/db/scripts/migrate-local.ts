// Dev: apply migrations to a local SQLite file. Usage: pnpm db:migrate:local [file]
import { openMigratedDb } from "../src/testing/sqlite.ts"

const file = process.argv[2] ?? "local.sqlite"
openMigratedDb(file).close()
console.log(`migration'lar uygulandı: ${file}`)
