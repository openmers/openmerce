# Entegrasyon testleri

Strateji: [../docs/08-isletme/03-test.md](../docs/08-isletme/03-test.md). Yapı Medusa'nın `integration-tests/` düzeninden uyarlandı; çalıştırıcı `packages/test-utils` içindedir.

| Klasör      | Ne                                                                                      | Hedef            |
| ----------- | --------------------------------------------------------------------------------------- | ---------------- |
| `api/`      | Shop ve Admin API'yi HTTP üzerinden, kaynağa göre (`__tests__/shop`, `__tests__/admin`) | D1 **ve** SQLite |
| `core/`     | HTTP'siz feature mantığı: rezervasyon, settlement, iade, outbox, medya                  | D1 **ve** SQLite |
| `race/`     | Eşzamanlı alıcı, çift webhook, kredi limiti yarışı: tam bir kazanan                     | D1 **ve** SQLite |
| `contract/` | Strateji/operasyon/port ortak sözleşme testleri, sızıntı kapısı, önbellek politikası    | Vitest           |
| `helpers/`  | Ortak tohum veri ve oturum yardımcıları                                                 |                  |

Birim testleri burada değil, ilgili dosyanın yanında (`*.test.ts`) durur. Bir modülün (`packages/modules/*`) kendi entegrasyon testleri o modülün `integration-tests/` klasöründe olur (Medusa'daki paket başına düzen).
