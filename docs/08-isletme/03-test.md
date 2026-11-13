# Test stratejisi


| Katman | Ne | Nasıl |
|---|---|---|
| Birim | `core` içindeki saf mantık (fiyat, kargo, slug, kimlik, durum makineleri) | Vitest; `db` ve sırlar parametre, platform import'u yok |
| Entegrasyon | Rezervasyon, settlement, iade, outbox, medya | Gerçek D1 (izole Miniflare durumu) **ve** gerçek SQLite; aynı test iki hedefte |
| Yarış | Aynı son ürüne iki eşzamanlı alıcı; aynı webhook'un iki eşzamanlı teslimatı | Entegrasyon içinde, tam olarak bir kazanan beklenir |
| Sözleşme | Sızıntı kapısı, tema sözleşmesi, önbellek politikası | Vitest |
| E2E | Vitrin + admin | `e2e` (web hedefi) |
| E2E | Mobil | `e2e` (mobil hedefi) |

**Klasör düzeni** (Medusa'nın `integration-tests/` + `medusa-test-utils` yapısından uyarlandı, Medusa deposu okundu): kökte `integration-tests/{api,core,race,contract,helpers}`, çalıştırıcı `packages/test-utils` (taze D1/SQLite ile uygulamayı kaldırır, tohum veri verir), modül başına kendi `integration-tests/` klasörü. Ayrıntı: `integration-tests/README.md`. Medusa PostgreSQL'e ihtiyaç duyar ve paketleri derlenmiş haliyle içe aktarır; bizde veritabanı süreç içidir, harici servis gerekmez.

Tek komut (`pnpm verify`) birim testleri, tip kontrolünü, derlemeyi ve entegrasyon testlerini çalıştırır; yeşilse değişiklik sağlamdır.

## Bileşen ve mobil testleri

- **Svelte bileşenleri** (`packages/ui`, admin, storefront adaları): Vitest + `@testing-library/svelte`, jsdom; rol ve erişilebilir ada göre sorgu, `userEvent`. `@openmers/ui` bileşeni başına: klavye, ARIA rolü, `...rest` geçişi, açık/koyu görsel anlık görüntü, ağaç sallama bütçesi.
- **Expo ekranları:** ortak mantık (`contract` istemcisi, store'lar, biçimlendirme) bir kez Vitest'te test edilir; ekran testi render ve durum içindir, yerel modüller yalnızca sınırda taklit edilir. Kritik yollar `e2e` mobil testleridir.
- Ajan/geliştirici için kısa rehber: `.claude/skills/tests/openmers-testing/SKILL.md`. Bu araçların (`@testing-library/*`, jsdom) seçimi henüz doğrulanmadı.

## Ek kapılar

- **Uzak-güvenli migration testi** (Minshop'tan): migration dosyalarında `wrangler d1 ... --remote` ile bozulan kalıplar yasaktır (ör. trigger gövdesinde `END;` ayrıştırıcıyı keser). Test her `.sql` dosyasını tarar; bu kural migration kapısının (drizzle-kit `DROP`/`__new_` yakalama) yanında çalışır.
- **Koşullu SQL gerçek motorda:** stok, kupon, kredi ve iade üst sınırı gibi koşullu `UPDATE`/`INSERT … SELECT` birim testte taklitle değil, gerçek migration uygulanmış SQLite/D1 üzerinde sınanır; her birinde `Promise.all` ile iki eşzamanlı çağrı: tam bir kazanan, kalan değer doğru.
- **Webhook yinelenmesi:** aynı olay iki kez eşzamanlı teslim edilir; tek sipariş, tek stok düşümü, tek e-posta.

| Kapı | Ne |
|---|---|
| Sorgu planı | Vitrin sorgularında tam tablo taraması yok (`EXPLAIN QUERY PLAN`) |
| Tur bütçesi | İstek başına veritabanı turu sayacı ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md) bölüm 3) |
| Sözleşme testleri | Her strateji, operasyon türü ve port için ortak test; built-in app bunu geçmeden yayınlanmaz |
| Segment sızıntısı | Bir segmentin fiyatı başka segmentin önbellek anahtarından dönmez |
| Sahiplik | Bir şirket üyesi başka şirketin sipariş, teklif veya kredisini okuyamaz |
| Yük | k6; 10.000 ve 100.000 ürünlük tohum veri, paralel checkout |

Yarış testleri listesi: [../05-ticaret/05-sepet-ve-checkout.md](../05-ticaret/05-sepet-ve-checkout.md) bölüm 8; B2B için ek olarak aynı şirketten kredi limitini birlikte aşan iki sipariş, aynı teklifin iki kez kabulü, iki onaylayıcının eşzamanlı kararı.
