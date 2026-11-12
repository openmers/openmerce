# Test stratejisi


| Katman | Ne | Nasıl |
|---|---|---|
| Birim | `core` içindeki saf mantık (fiyat, kargo, slug, kimlik, durum makineleri) | Vitest; `db` ve sırlar parametre, platform import'u yok |
| Entegrasyon | Rezervasyon, settlement, iade, outbox, medya | Gerçek D1 (izole Miniflare durumu) **ve** gerçek SQLite; aynı test iki hedefte |
| Yarış | Aynı son ürüne iki eşzamanlı alıcı; aynı webhook'un iki eşzamanlı teslimatı | Entegrasyon içinde, tam olarak bir kazanan beklenir |
| Sözleşme | Sızıntı kapısı, tema sözleşmesi, önbellek politikası | Vitest |
| E2E | Vitrin + admin | Playwright |
| E2E | Mobil | Maestro |

**Klasör düzeni** (Medusa'nın `integration-tests/` + `medusa-test-utils` yapısından uyarlandı, Medusa deposu okundu): kökte `integration-tests/{api,core,race,contract,helpers}`, çalıştırıcı `packages/test-utils` (taze D1/SQLite ile uygulamayı kaldırır, tohum veri verir), modül başına kendi `integration-tests/` klasörü. Ayrıntı: `integration-tests/README.md`. Medusa PostgreSQL'e ihtiyaç duyar ve paketleri derlenmiş haliyle içe aktarır; bizde veritabanı süreç içidir, harici servis gerekmez.

Tek komut (`pnpm verify`) birim testleri, tip kontrolünü, derlemeyi ve entegrasyon testlerini çalıştırır; yeşilse değişiklik sağlamdır.

## Ek kapılar

| Kapı | Ne |
|---|---|
| Sorgu planı | Vitrin sorgularında tam tablo taraması yok (`EXPLAIN QUERY PLAN`) |
| Tur bütçesi | İstek başına veritabanı turu sayacı ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md) bölüm 3) |
| Sözleşme testleri | Her strateji, operasyon türü ve port için ortak test; built-in app bunu geçmeden yayınlanmaz |
| Segment sızıntısı | Bir segmentin fiyatı başka segmentin önbellek anahtarından dönmez |
| Sahiplik | Bir şirket üyesi başka şirketin sipariş, teklif veya kredisini okuyamaz |
| Yük | k6; 10.000 ve 100.000 ürünlük tohum veri, paralel checkout |

Yarış testleri listesi: [../05-ticaret/05-sepet-ve-checkout.md](../05-ticaret/05-sepet-ve-checkout.md) bölüm 8; B2B için ek olarak aynı şirketten kredi limitini birlikte aşan iki sipariş, aynı teklifin iki kez kabulü, iki onaylayıcının eşzamanlı kararı.
