# Kanallar

Kanal (Vendure `Channel`) bir satış yüzeyidir: bir mağaza, bir ülke sitesi, bir B2B portalı, mobil uygulama veya bir pazaryeri beslemesi. Her kurulumda silinemeyen bir **varsayılan kanal** vardır ve her şeyi içerir; tek mağazalı kurulum kanal kavramını hiç görmez.

## 1. Kanalın taşıdıkları

| Alan | Not |
|---|---|
| `code`, `public_id`, alan adları | İstek, ana bilgisayar adından veya yayınlanabilir anahtardan kanala çözülür |
| `type` | `b2c` · `b2b` · `hybrid` |
| Para birimleri | varsayılan + izin verilenler |
| Diller | varsayılan + izin verilenler |
| `prices_include_tax` | B2C'de genelde evet, B2B'de hayır |
| Varsayılan vergi ve kargo bölgesi | adres yokken kullanılır |
| Varsayılan fiyat listesi | [03-fiyat.md](03-fiyat.md) |
| Depolar | `channel_stock_locations` (öncelik sırasıyla) |
| Erişim | `public` · `login_required` · `approved_companies_only` |
| Misafir alışveriş, en az sipariş tutarı | kanal ayarı |

## 2. Kanala bağlananlar

Ürün ve varyant (görünürlük), fiyat, koleksiyon, promosyon, kargo yöntemi, ödeme yöntemi, depo, müşteri, sipariş, yönetici rolü. Bağlantılar `<varlık>_channels` tablolarındadır. Bir ürün birden çok kanalda, kanal başına farklı fiyatla bulunabilir; stok depodan gelir, kanaldan değil.

**Kanal–varyant ataması.** Ürün `product_channels` ile kanala atanır; varyant görünürlüğü `variant_channels` satırıyla belirlenir (ürün atanınca varsayılan olarak tüm varyantlar atanır, tek tek çıkarılabilir). Varsayılan kanal her şeyi içerir: alt kanalda oluşturulan ürün/varyant otomatik olarak varsayılan kanala da atanır, varsayılan kanaldan silmek ürünü tüm kanallardan çıkarır. Bir varyantın o kanalda satılabilmesi için kanalın varsayılan fiyat listesinde fiyatı olmalı; yoksa varyant `no_price` ile satılamaz görünür (sessizce 0 TL değil) ve admin'de uyarı çıkar. Kanallar arası fiyat eşitleme kanal ayarıdır (`sync_prices`, varsayılan **kapalı**): açıkken bir kanalın varsayılan listesindeki fiyat değişince aynı para birimindeki kanalların varsayılan listelerine de yazılır; para birimi farklıysa eşitlenmez.

## 3. Kullanım biçimleri

| Senaryo | Kurulum |
|---|---|
| Tek mağaza | Yalnızca varsayılan kanal |
| Ülke siteleri | Kanal başına para birimi, dil, vergi bölgesi; ortak depo |
| B2C + B2B | `b2c` kanalı herkese açık; `b2b` kanalı giriş zorunlu, vergi hariç fiyat, vadeli ödeme yöntemi |
| Karma tek site | `hybrid`: anonim ziyaretçi perakende fiyat görür, giriş yapan şirket kendi fiyat listesini |
| Mobil uygulamaya özel kampanya | Mobil için ayrı kanal veya aynı kanal + promosyon koşulu |
| Pazaryeri beslemesi | Kanal = dışa aktarılan ürün ve fiyat kümesi; siparişler o kanala yazılır |
| Çok kiracılı SaaS | Kanal **değil**; kiracı başına ayrı veritabanı (yalıtım ve D1 boyut sınırı) |

## 4. Performans

- Kanal tablosu küçüktür ve bellekte durur; kanal çözümleme sorgu atmaz.
- Okuma modeli satırları `channel_id` taşır; vitrin sorgusu bağlantı tablosuna gitmez.
- Kanal ayarı değişince `settings_version` artar; bellekteki kopya ve o kanalın önbellek etiketi (`chn:<id>`) temizlenir.
- Bir ürünün kanala eklenmesi veya çıkarılması bir `reindex` işidir.

## 5. Yetki

Yönetici rolleri kanal başınadır ([../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)). Admin panelinde etkin kanal seçilir; listeler o kanala süzülür. `SuperAdmin` hepsini görür.

## 6. Farklı alan adlarında birden çok site

Tek kurulum, birçok alan adı: her site bir kanaldır.

- **`channel_domains`**: `domain` → `channel_id` (+ varsayılan dil). Bir kanalın birden çok alan adı olabilir (`.com`, `.com.tr`); biri birincildir, diğerleri ona yönlenir veya dil seçer.
- İstek `Host` başlığından kanala çözülür; tablo bellektedir, sorgu atılmaz. Bilinmeyen alan adı 404 döner (varsayılan kanala düşmez; yanlış sitenin fiyatı gösterilmesin).
- Kanal başına: tema ve tasarım belirteçleri, logo, mağaza adı, e-posta gönderen adresi ve şablonları, yasal sayfalar, SEO ayarları, site haritası, analitik/Pixel kimlikleri.
- Önbellek anahtarı zaten kanal taşır; siteler birbirinin sayfasını göremez.
- Çerezler alan adına özeldir: sepet ve oturum siteler arasında paylaşılmaz. Ortak müşteri hesabı istenirse müşteri iki kanala da kayıtlıdır ama her sitede ayrı giriş yapar (alan adları arası tek oturum v1 dışı).
- Katalog ortak olabilir (aynı ürün birkaç kanalda, farklı fiyat ve adla) veya tamamen ayrı; stok ortak depodan gelir.
- **TLS ve yönlendirme:** Cloudflare'de her alan adı Worker'a özel alan adı olarak eklenir; SaaS kurulumunda Cloudflare for SaaS (müşteri alan adları). Self-host'ta Caddy isteğe bağlı sertifika ile; izinli alan adı listesini API'den sorar.
- Admin tek paneldir; kanal seçiciyle siteler arasında geçilir, roller kanal başınadır.

Karttaki ekstre adı site başına ayrıdır: [06-odeme-ve-iade.md](06-odeme-ve-iade.md) bölüm 7.
