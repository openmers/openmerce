# OpenMers — Tasarım Belgeleri

Açık kaynak, self-host edilebilir B2C + B2B ticaret altyapısı. Okuma sırası klasör ve dosya numarasıdır. Henüz kod yoktur; bunlar tasarım kararlarıdır.

## 01 — Tech stack
- [01-tech-stack.md](01-tech-stack/01-tech-stack.md)

## 02 — Genel mimari
- [01-genel-bakis.md](02-genel-mimari/01-genel-bakis.md) — katmanlar, beş kavram, değişmezler
- [02-vendure-saleor-medusa-kararlar.md](02-genel-mimari/02-vendure-saleor-medusa-kararlar.md) — kimden ne alındı, neden
- [03-performans.md](02-genel-mimari/03-performans.md) — okuma modeli, segment önbelleği, tur bütçesi, ölçüm kapıları
- [04-monorepo-klasor-yapisi.md](02-genel-mimari/04-monorepo-klasor-yapisi.md)
- [05-vendure-capabilities.md](02-genel-mimari/05-vendure-capabilities.md) — Vendure'un ücretli "Capabilities" kataloğu: bizde karşılığı, gerek var mı

## 03 — Çekirdek
- [01-platform-arayuzu.md](03-cekirdek/01-platform-arayuzu.md) — Cloudflare + Node, `atomic()`
- [02-api-ve-istek-baglami.md](03-cekirdek/02-api-ve-istek-baglami.md) — Shop/Admin API, Ctx
- [03-veri-kurallari.md](03-cekirdek/03-veri-kurallari.md) — kimlik, para, anlık görüntü, migration
- [04-olaylar-isler-outbox.md](03-cekirdek/04-olaylar-isler-outbox.md)
- [05-onbellek.md](03-cekirdek/05-onbellek.md)
- [06-guvenlik-ve-yetki.md](03-cekirdek/06-guvenlik-ve-yetki.md)
- [07-yapilandirma.md](03-cekirdek/07-yapilandirma.md)
- [08-kimlik-dogrulama.md](03-cekirdek/08-kimlik-dogrulama.md) — müşteri/yönetici ayrımı, B2B, mobil

## 04 — Genişletme
- [01-stratejiler-ve-operasyonlar.md](04-genisletme/01-stratejiler-ve-operasyonlar.md)
- [02-built-in-apps.md](04-genisletme/02-built-in-apps.md) — süreç içi, derleme zamanı
- [03-tak-calistir-apps.md](04-genisletme/03-tak-calistir-apps.md) — dışarıda çalışan, tıkla-kur
- [05-tak-calistir-app-gelistirme.md](04-genisletme/05-tak-calistir-app-gelistirme.md) — geliştirici rehberi: iskeletten yayına
- [07-built-in-app-gelistirme.md](04-genisletme/07-built-in-app-gelistirme.md) — built-in app yazan ve çekirdeğe katkı veren geliştirici rehberi (Vendure Developer Guide uyarlaması)
- [06-medusa-eklentileri-karar-tablosu.md](04-genisletme/06-medusa-eklentileri-karar-tablosu.md) — 13 Medusa eklentisi/sağlayıcısı: çekirdek mi, built-in mi, tak-çalıştır mı
- [04-ozel-alanlar-ve-metadata.md](04-genisletme/04-ozel-alanlar-ve-metadata.md)

## 05 — Ticaret alanları
- [01-kanallar.md](05-ticaret/01-kanallar.md)
- [02-katalog-ve-arama.md](05-ticaret/02-katalog-ve-arama.md)
- [03-fiyat.md](05-ticaret/03-fiyat.md)
- [04-stok.md](05-ticaret/04-stok.md)
- [05-sepet-ve-checkout.md](05-ticaret/05-sepet-ve-checkout.md)
- [06-odeme-ve-iade.md](05-ticaret/06-odeme-ve-iade.md)
- [07-siparis.md](05-ticaret/07-siparis.md)
- [08-promosyon.md](05-ticaret/08-promosyon.md)
- [09-vergi.md](05-ticaret/09-vergi.md)
- [10-kargo-ve-teslimat.md](05-ticaret/10-kargo-ve-teslimat.md)
- [11-musteriler.md](05-ticaret/11-musteriler.md)
- [12-medya.md](05-ticaret/12-medya.md)
- [13-icerik-ve-gezinme.md](05-ticaret/13-icerik-ve-gezinme.md)
- [14-seo.md](05-ticaret/14-seo.md)
- [15-bildirimler.md](05-ticaret/15-bildirimler.md)
- [16-raporlama.md](05-ticaret/16-raporlama.md)
- [17-belgeler.md](05-ticaret/17-belgeler.md) — sipariş özeti, paketleme listesi

## 06 — B2C ve B2B
- [01-b2c-ve-b2b-ayni-cekirdek.md](06-b2c-b2b/01-b2c-ve-b2b-ayni-cekirdek.md)
- [02-sirket-hesaplari.md](06-b2c-b2b/02-sirket-hesaplari.md)
- [03-b2b-katalog-fiyat-siparis.md](06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md)
- [04-teklif-ve-onay.md](06-b2c-b2b/04-teklif-ve-onay.md)
- [05-kredi-ve-odeme-kosullari.md](06-b2c-b2b/05-kredi-ve-odeme-kosullari.md)
- [06-uygulama-sistemi-ve-b2b.md](06-b2c-b2b/06-uygulama-sistemi-ve-b2b.md)

## 07 — İstemciler
- [01-storefront.md](07-istemciler/01-storefront.md)
- [02-admin.md](07-istemciler/02-admin.md) — klasik kip
- [03-mobil.md](07-istemciler/03-mobil.md)
- [04-tema-sistemi.md](07-istemciler/04-tema-sistemi.md) — tema paketi, GitHub içe aktarma, derleme, yayın
- [06-admin-genisletme.md](07-istemciler/06-admin-genisletme.md) — admin'e eklenti yazma modeli (dashboard modelinden uyarlandı, React)
- [07-ui-kutuphanesi.md](07-istemciler/07-ui-kutuphanesi.md) — `@openmers/ui` (Medusa UI karşılığı): bileşenler, tema CSS'i, ikonlar, kurulum
- [08-ajan-ticareti.md](07-istemciler/08-ajan-ticareti.md) — `llms.txt`, ajan ödeme akışı, MCP (varsayılan kapalı)
- [05-agentic-builder.md](07-istemciler/05-agentic-builder.md) — sohbetle yönetim (Bloom/Vulpy tarzı), klasik kiple geçiş

## 08 — İşletme
- [01-self-host.md](08-isletme/01-self-host.md) — Node VPS + Litestream
- [02-ci-cd.md](08-isletme/02-ci-cd.md)
- [03-test.md](08-isletme/03-test.md)
- [04-gozlemlenebilirlik.md](08-isletme/04-gozlemlenebilirlik.md)
- [05-cok-kiracili-saas.md](08-isletme/05-cok-kiracili-saas.md)
- [06-surum-yukseltme.md](08-isletme/06-surum-yukseltme.md)
- [07-kurulum-ve-tohum-veri.md](08-isletme/07-kurulum-ve-tohum-veri.md)
- [08-veri-tasima.md](08-isletme/08-veri-tasima.md) — Shopify, WooCommerce, ikas'tan geçiş

## 09 — Built-in app'ler (süreç içi, derlemeye girer, seçmeli)
- [01-e-fatura.md](09-built-in-apps/01-e-fatura.md)
- [02-abonelik.md](09-built-in-apps/02-abonelik.md) — yinelenen sipariş, dunning (Reorder incelemesi)
- [03-favori-listesi.md](09-built-in-apps/03-favori-listesi.md)
- [04-urun-yorumlari.md](09-built-in-apps/04-urun-yorumlari.md)
- [05-iys.md](09-built-in-apps/05-iys.md) — İYS izin senkronu (v1)

## 10 — Tak-çalıştır app'ler (dışarıda çalışan, admin'den kurulur)
- [01-pixel.md](10-tak-calistir-apps/01-pixel.md)
- [02-erp.md](10-tak-calistir-apps/02-erp.md)
- [03-pazaryeri-entegrasyonu.md](10-tak-calistir-apps/03-pazaryeri-entegrasyonu.md) — Trendyol, Hepsiburada, N11

- [veritabani/00-genel.md](veritabani/00-genel.md) — tüm tablolar, sütunlar, migration sırası, yapılacaklar
- [YOL-HARITASI.md](YOL-HARITASI.md) — hangi dosyadan başlıyoruz: aşama aşama, yapıldı/yapılacak
- [ATLANANLAR.md](ATLANANLAR.md) — doğrulanmayanlar, bekleyen kararlar, atlananlar

Yeni özellik: biçim kararı [02-built-in-apps.md](04-genisletme/02-built-in-apps.md) bölüm 3.1'e göredir. Uygulama ise `10-tak-calistir-apps/NN-<ad>.md`, built-in app ise `09-built-in-apps/NN-<ad>.md`.
