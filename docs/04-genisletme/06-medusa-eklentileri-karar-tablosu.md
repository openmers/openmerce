# Medusa eklentileri ve sağlayıcıları: OpenMers'te karşılığı ve biçimi

13 Medusa kaynağı 2026-11-12'de okundu (web-fetch ile; Playwright MCP bu oturumda yok). Her biri için: ne yapıyor, OpenMers'te **çekirdek / built-in app / tak-çalıştır app** hangisi olur, neden. Karar sırası: [02-built-in-apps.md](02-built-in-apps.md) bölüm 3.1.

> **Okuma sınırı.** Medusa entegrasyon sayfalarının README bölümleri çoğunda boş geldi (`[object Object]`). Bu yüzden Marketplace, Better Auth, `file-local`, manual fulfillment ve manual payment için sayfalardan **özellik çıkarılamadı**; aşağıda onlar için yalnızca bizim tasarımımız yazılıdır, Medusa davranışı varsayılmamıştır.

## 1. Özet

| # | Kaynak | Medusa'da | OpenMers biçimi | Durum |
|---|---|---|---|---|
| 1 | medusa-variant-images | Plugin; varyanta özel küçük resim + sıralı görseller, "taban seçenekle" toplu yükleme; veriyi `variant.metadata`'dan verir | **Çekirdek** (katalog) | Zaten var ([02-katalog-ve-arama.md](../05-ticaret/02-katalog-ve-arama.md) bölüm 7), bir ek: bölüm 2 |
| 2 | RSC-Labs documents | Plugin; sipariş için fatura ve irsaliye PDF'i, isteğe bağlı üretim, numaralama | **Çekirdek** (belgeler servisi) + resmî fatura **e-fatura built-in app**'te | Bölüm 3 |
| 3 | RSC-Labs wishlist | Plugin; müşteri başına tek liste, JWT ile paylaşım, yalnızca API | **Built-in app** `wishlist` | [../09-built-in-apps/03-favori-listesi.md](../09-built-in-apps/03-favori-listesi.md) |
| 4 | order-comments | Plugin; siparişe dahili yorum (yönetici snapshot'ı, yalnız ekleme) | **Çekirdek** (sipariş notları) | Bölüm 4 |
| 5 | Techlabi marketplace | Çok satıcılı plugin (sayfada içerik yok) | **Kapsam dışı** | Kullanıcı kararı: pazar yeri yok |
| 6 | lambdacurry product-reviews | Plugin; puan, yorum, moderasyon (approved/pending/flagged), yönetici yanıtı, istatistik | **Built-in app** `reviews` | [../09-built-in-apps/04-urun-yorumlari.md](../09-built-in-apps/04-urun-yorumlari.md) |
| 7 | File S3 provider | Altyapı modülü sağlayıcısı; tek sağlayıcı, herkese açık okuma kovası | **Çekirdek** `storage` portu + sürücüler | Bölüm 5 |
| 8 | file-local | Yerel disk sağlayıcısı (sayfada içerik yok) | **Çekirdek** sürücü (`local`) | Bölüm 5 |
| 9 | Odoo ERP tarifi | Odoo → Medusa tek yönlü, günlük cron, yalnızca ürün | **Tak-çalıştır app** (ERP) | Zaten var ([02-erp.md](../10-tak-calistir-apps/02-erp.md)), bölüm 6 |
| 10 | Emailpass auth | Varsayılan e-posta+parola, scrypt `hashConfig` | **Çekirdek** (Better Auth) | Zaten var, bölüm 7 |
| 11 | Better Auth plugin (sosyal giriş) | Üçüncü taraf plugin (OAuth, magic link, passkey; içerik yok) | **Çekirdek** (Better Auth zaten bizde) | Bölüm 7 |
| 12 | fulfillment-manual | Elle teslimat sağlayıcısı (sayfada içerik yok) | **Çekirdek** (varsayılan `manual` işleyici) | Zaten büyük ölçüde var, bölüm 8 |
| 13 | medusajs/payment (manual payment) | Varsayılan elle ödeme sağlayıcısı | **Çekirdek** (havale/EFT, kapıda `manual` işleyicileri) | Zaten var, bölüm 8 |

**Genel ilke.** Medusa'da hepsi plugin olduğu için "çekirdek mi plugin mi" farkı yoktur. Bizde biçim şuna göre seçildi: mağaza her sipariş/katalog yolunda ihtiyaç duyuyor ve kapalı hâli anlamsızsa çekirdek; yalnızca bir kısım mağazaya lazımsa ve müşteri oturumu ile okuma modeline bağlanıyorsa built-in app; dışarıdaki bir sistemle konuşuyorsa tak-çalıştır app. Yorum ve favori listesi müşteri oturumu ve katalog okuma modeli gerektirdiğinden dışarıda çalışan app olamaz: tak-çalıştır app yalnızca mağaza düzeyinde token taşır, müşteri kimliği taşımaz.

## 2. Varyant görselleri (çekirdek, zaten var)

OpenMers'in mevcut modeli Medusa eklentisinden güçlüdür: görsel üç düzeye bağlanır (ürün, seçenek değeri, varyant) ve çözümleme indeksleme anında yapılır; Medusa eklentisi ise `variant.metadata` içinde bir dizi tutar ve vitrinde `+metadata` istemek zorundadır. Eklentiden alınan tek fikir **taban seçenekle toplu yükleme**, zaten seçenek değeri düzeyiyle karşılanır: "Renk = Kahverengi" değerine bir kez yükleyin, o rengin tüm bedenleri paylaşır. Admin'de bu düzey için "Seçenek değerine yükle" kısayolu eklenir (arayüz işi, şema değişmez). Sıralama `product_assets.position`, varyant küçük resmi indekste `thumbnail` olarak çözülür.

## 3. Belgeler (çekirdek)

Taşındı: [../05-ticaret/17-belgeler.md](../05-ticaret/17-belgeler.md). Özet: resmî fatura e-fatura built-in app'inde ve değişmez; sipariş özeti ve paketleme listesi çekirdek `documents` servisinde, sürümlü, HTML + yazdırma CSS'i, `DocumentRenderer` portu.

## 4. Sipariş notları (çekirdek)

Taşındı: [../05-ticaret/07-siparis.md](../05-ticaret/07-siparis.md) bölüm 10 (`order_notes`: dahili/müşteri görünürlüğü, sabitleme, 15 dk düzeltme penceresi).

## 5. Dosya depolama (çekirdek `storage` portu)

Taşındı: [../05-ticaret/12-medya.md](../05-ticaret/12-medya.md) "Depolama sürücüleri ve kovalar". Özet: `r2`, `s3`, `local` sürücüleri; `public` ve `private` ad alanları; özel dosyalar imzalı bağlantıyla.

## 6. Odoo ERP (tak-çalıştır app, zaten var)

Medusa tarifi ürünleri günde bir, tek yönlü (Odoo → Medusa) çeker; stok senkronlanmaz, hata/yeniden deneme anlatılmaz; modül + workflow + zamanlanmış iş kullanır. [../10-tak-calistir-apps/02-erp.md](../10-tak-calistir-apps/02-erp.md) bunu aşar: iki yönlü, sayfalı toplu çekme, idempotency, ID eşleme; Odoo ilk sağlayıcı. Biçim kararı değişmez: dışarıdaki sisteme bağlanır → **tak-çalıştır app**.

## 7. Kimlik doğrulama (çekirdek)

Medusa Emailpass varsayılan olarak yüklü, yalnızca `hashConfig` (scrypt `logN: 15, r: 8, p: 1`) ayarı var; `require_verification` seçeneği v2.16.0'da kaldırılmış. OpenMers: parola ve diğer yöntemler **Better Auth** ile çekirdektedir ([../03-cekirdek/08-kimlik-dogrulama.md](../03-cekirdek/08-kimlik-dogrulama.md)): e-posta+parola, e-posta ile tek kullanımlık kod, sosyal giriş (Google, Apple) kanal başına açılır; e-posta doğrulama kanal ayarıdır. Üçüncü taraf "Better Auth plugin"ine ihtiyaç yok: aynı kütüphaneyi zaten çekirdek kullanıyor.

Ek kararlar:
- **Parola karması:** Better Auth varsayılanı (scrypt). Parametreler ayarlanabilir, Workers CPU süresi nedeniyle üretim değerleri ölçülür ⚠️ (Workers'ta scrypt maliyeti ölçülmedi).
- **Magic link:** "e-posta ile tek kullanımlık kod" mevcut; bağlantı biçimi aynı jetonla desteklenir (kod veya tıklanır bağlantı).
- **Passkey:** yönetici 2FA'sı için var, müşteri girişi için isteğe bağlı ve sonraya.
- Hiçbiri ayrı app değildir: giriş çekirdek güvenlik yüzeyidir.

## 8. Elle teslimat ve elle ödeme (çekirdek)

Taşındı: elle ödeme [../05-ticaret/06-odeme-ve-iade.md](../05-ticaret/06-odeme-ve-iade.md) bölüm 9, elle teslimat [../05-ticaret/10-kargo-ve-teslimat.md](../05-ticaret/10-kargo-ve-teslimat.md) bölüm 6. Medusa sayfalarında açıklama yoktu; yalnızca bizim tasarımımız.

## 9. Sonuç: yeni belgeler

- Built-in app olarak: `wishlist`, `reviews`.
- Çekirdek ek işleri: `documents` servisi, `order_notes`, storage `public/private` ayrımı, varsayılan `manual` işleyiciler. 
