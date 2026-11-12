# Medya


Depolanan dosyanın tek sahibi `media` özelliğidir. Ürünler, sayfalar ve logo yalnızca kullanım kaydı tutar; birinden görseli kaldırmak dosyayı silmez. Dosyayı yalnızca medya silme işlemi siler ve herhangi bir kayıt hâlâ referans veriyorsa reddeder. Silme ile ilişki yazma tek SQL ifadesinde korunur; "önce kontrol et, sonra yaz" yoktur.

**Görsel boyutları yüklemede üretilir.** Her yüklemede sabit bir genişlik merdiveni (ör. 320 / 640 / 1000 px, WebP) oluşturulup depoya yazılır; sunum modeli hazır `srcset` verir. İstek anında yeniden boyutlandırma yapılmaz. Üretim `ImageProcessor` portunun arkasındadır: Cloudflare'de Images binding'i, self-host'ta `sharp` (yalnızca Node adaptöründe). İşleyici yoksa özgün dosya saklanır ve tek boyut sunulur.

## Depolama sürücüleri ve kovalar

Port: [../03-cekirdek/01-platform-arayuzu.md](../03-cekirdek/01-platform-arayuzu.md) (`storage`). Karar gerekçesi: [../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md).

Medusa belgelerinden alınan ve değişen noktalar:

| Medusa | OpenMers |
|---|---|
| Tek sağlayıcı | Tek **varsayılan** sürücü + `public` ve `private` iki ad alanı |
| Kova herkese açık okuma olmalı (ACL) | `public` kova yalnızca CDN/alan adı üzerinden okunur, ACL açılmaz. `private` (fatura, dışa aktarma, belgeler) imzalı kısa ömürlü bağlantıyla verilir |
| `download_file_duration` varsayılan 3600 sn | `private` bağlantı ömrü ayar, varsayılan 15 dk; dışa aktarma bağlantıları [11-musteriler.md](11-musteriler.md) kuralıyla |
| `cache_control` `public, max-age=31536000` | Aynı; yüklemede içerik özeti dosya adına girdiğinden değişmez dosyalar için güvenli |
| `prefix`, `additional_client_config` | `prefix` kanal/mağaza öneki (çok kiracılı SaaS'ta zorunlu); istemci ayarı sürücü seçeneği |

Sürücüler: `r2` (Workers, bağlama), `s3` (AWS S3 ve S3 uyumlu: MinIO, DigitalOcean Spaces, Supabase Storage, Backblaze; self-host), `local` (Node, geliştirme ve küçük VPS; dosyalar `data/uploads`, Litestream kapsamı dışı, yedekleme ayrıca). Sürücü seçimi `store.config.ts` içinde (`storage: r2() | s3({...}) | local({...})`). Üç sürücü aynı sözleşme testini geçer. ⚠️ Medusa sayfasında Cloudflare R2 ve Supabase bölümleri boş geldi; S3 uyumluluğu ayrıca test edilir.

## Müşteri yüklemeleri (kişiselleştirme görseli) ve önizleme

- **Yol:** `private/personalization/<cart_public_id>/<içerik özeti>.<uzantı>`; yalnızca `media` kaydı sahibi sepet/sipariştir, başka sepet aynı `media_id`'yi kullanamaz (sahiplik denetimi).
- **Yükleme akışı:** vitrin `POST /shop/uploads` ile imzalı yükleme URL'si ve bekleyen `media` kaydı (`status = pending`) alır; dosya doğrudan depoya gider (Worker gövde sınırı devreye girmez). Ardından `POST /shop/uploads/:id/confirm`: sunucu dosyanın boyutunu (HEAD) ve ilk baytlarını okur, **sihirli sayıyla** türü doğrular (PNG, JPEG, WebP; başlıktaki `Content-Type` yetmez) ve görsel boyutlarını başlıktan çıkarır; ihlalde dosya silinir, `status = rejected`. Onaylanmamış kayıtlar 1 saat sonra süpürülür. Yeniden kodlama yapılmaz (Workers'ta görsel işleme yok), SVG kabul edilmez.
- **Sınır:** tür/boyut/en-boy tanımdan gelir (varsayılan 10 MB, en çok 8000 px); hız sınırı IP + sepet başına.
- **PDF ve video önizlemesi:** yerleşik üretilmez (sunucuda PDF/video çözücü yok). Yönetici medyası olarak PDF/video yüklenebilir; arayüz tür simgesi gösterir, video için isteğe bağlı `poster_media_id` (yüklenen kapak görseli) verilir. PDF ilk sayfa önizlemesi isteyen mağaza `DocumentRenderer`/medya built-in app'i ile ekler.
