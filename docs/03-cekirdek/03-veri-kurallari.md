# Veri kuralları

## 1. Kimlikler

- **İç kimlik:** tamsayı satır `id`. API sınırını asla geçmez. Join'ler ve indeksler tamsayı üzerindedir (küçük ve hızlı).
- **Dış kimlik:** önekli `public_id` — `prod_`, `var_`, `col_`, `ord_`, `itm_`, `ref_`, `cus_`, `com_`, `quo_`, `chn_`, `pl_` + 10 karakter Crockford base32 (50 rastgele bit). Önekler kalıcıdır. Çakışmada benzersiz indeks yetkilidir, üç kez yeniden denenir.
- **Kimlik ≠ yetki.** `ord_...` bilmek siparişi görmeye yetmez. Misafir erişimi ayrı, iptal edilebilir bir token ile olur (`otk_...`, `order_guest_access` tablosu); sızarsa token döndürülür ve yeni bağlantı aynı `atomic()` içinde outbox'a yazılır.
- **Sızıntı kapısı (test):** API çıktıları özyinelemeli taranır; `id` / `*_id` altında tamsayı, yanlış önekli kimlik veya herhangi bir erişim token'ı görülürse test kırılır.
- **Dış sistem kimlikleri** `external_refs` tablosundadır (`kaynak, bağlantı, varlık türü, yerel public_id, dış kimlik, dış kod, özet`); ERP ve pazaryeri eşlemeleri buradan yürür.

## 2. Para

- Tutarlar baştan sona tamsayı küçük birimdir (kuruş); yalnızca kenarda `formatPrice()` ile biçimlenir. Ondalık basamak sayısı para biriminden okunur.
- Her tutarın yanında para birimi kodu durur; farklı para birimleri toplanmaz.
- Oranlar (vergi, indirim yüzdesi) baz puan tamsayıdır (%20 = 2000). Yuvarlama tek bir yardımcıdadır ve satır düzeyinde yapılır; sipariş toplamı satırların toplamıdır.
- Kur dönüşümü istek anında yapılmaz ([../05-ticaret/03-fiyat.md](../05-ticaret/03-fiyat.md)).

## 3. Anlık görüntü

Sipariş; verildiği andaki fiyatı, indirim satırlarını, vergi satırlarını, kargo satırını, adresleri, ürün adını ve SKU'yu **kopya olarak** saklar. Ürün, fiyat listesi veya vergi oranı sonradan değişse de sipariş değişmez. Rezervasyon aynı anlık görüntüyü checkout başında alır; sipariş kalemleri ödeme sağlayıcısının metadata'sından değil bu kayıttan okunur.

## 4. Kanal farkındalığı

Kanala bağlı varlıklar: ürün, varyant fiyatı, koleksiyon, promosyon, kargo yöntemi, ödeme yöntemi, depo, müşteri, sipariş, rol. İlişki `<varlık>_channels` bağlantı tablolarındadır; sipariş ve sepet doğrudan `channel_id` taşır. Vitrin sorguları bağlantı tablosuna gitmez, çünkü okuma modeli satırları zaten `channel_id` içerir.

## 5. Çeviri

Çevrilebilir alanlar (ad, slug, açıklama) `<varlık>_translations(varlık_id, lang, ...)` tablosundadır. Vitrin bunlara join atmaz; okuma modeli `(kanal, dil)` başına hazır satır tutar. Eksik çeviri kanalın varsayılan diline düşer ve bu düşüş indeksleme anında çözülür.

## 6. Özel veri

İki mekanizma ([../04-genisletme/04-ozel-alanlar-ve-metadata.md](../04-genisletme/04-ozel-alanlar-ve-metadata.md)):

- `custom_fields` (JSON, tipli, kodda tanımlı) — built-in app'ler ve mağazanın kendi alanları.
- `metadata` / `private_metadata` (JSON, anahtar-değer) — uygulamalar.

## 7. Zaman, silme, sürüm

- Zamanlar UTC epoch milisaniye tamsayıdır.
- Silme yumuşaktır (`deleted_at`) ve yalnızca katalog ve müşteri için vardır; sipariş, ödeme, stok hareketi silinmez. KVKK silme talebi müşteri satırını anonimleştirir, siparişteki anlık görüntüyü yasal saklama süresince tutar.
- Eşzamanlı düzenlenen satırlar (ürün, stok düzeyi, şirket kredisi) `version` sayacı taşır; admin güncellemesi `WHERE version = ?` ile yapılır, çakışmada kullanıcıya gösterilir.

## 8. Migration

- Eklemelidir: numaralı dosyalar, `ADD COLUMN`, yeni tablo, yeni indeks. Uygulanmış migration düzenlenmez, yıkıcı `DROP` yapılmaz.
- Eski sürüm süreç, migration ile yeni deploy arasında trafik almaya devam edebilir; şema değişikliği buna dayanmalıdır.
- Her liste/filtre sorgusunun indeksi aynı migration'da gelir.
- Built-in app migration'ları kendi numara dizisine sahiptir ve `bia_<ad>_` önekli tablolara dokunur.

## 9. JSON sütunları

JSON yalnızca **birlikte okunup birlikte yazılan** veri içindir: anlık görüntüler, operasyon argümanları, özel alanlar, hazır sunum modeli. Filtrelenen veya join'lenen şey sütundur. Bir JSON alanı filtrelenecekse üzerine ifade indeksi konur.
