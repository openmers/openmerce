# Integration tests

Strategy: [../docs/08-isletme/03-test.md](../docs/08-isletme/03-test.md). The layout follows a common `integration-tests/` convention; the runner lives in `packages/test-utils`.

| Folder      | What                                                                            | Target            |
| ----------- | ------------------------------------------------------------------------------- | ----------------- |
| `api/`      | Shop and Admin API over HTTP, by resource (`__tests__/shop`, `__tests__/admin`) | D1 **and** SQLite |
| `core/`     | Feature logic without HTTP: reservation, settlement, refunds, outbox, media     | D1 **and** SQLite |
| `race/`     | Concurrent buyers, duplicate webhooks, credit limit races: exactly one winner   | D1 **and** SQLite |
| `contract/` | Shared contract tests for strategies/operations/ports, leak gate, cache policy  | Vitest            |
| `helpers/`  | Shared seed data and session helpers                                            |                   |

Unit tests do not live here; they sit next to the file they test (`*.test.ts`). A module's (`packages/modules/*`) own integration tests live in that module's `integration-tests/` folder (one layout per package).
