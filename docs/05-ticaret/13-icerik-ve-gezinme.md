# İçerik ve gezinme

Çekirdekte küçük ama yeterli bir içerik katmanı vardır; tam bir CMS değildir. Daha fazlası isteyen harici CMS'i uygulama olarak bağlar.

## 1. Tablolar

| Tablo | İçerik |
|---|---|
| `pages` | Kanal başına içerik sayfası: slug, başlık, gövde (Markdown), SEO alanları, `status`, `published_at`; çeviri tablosuyla |
| `posts`, `post_tags` | Blog; `pages` ile aynı yapı + yazar, özet, kapak görseli |
| `menus`, `menu_items` | Kanal başına adlandırılmış menüler (`header`, `footer` …); öğe = koleksiyon, ürün, sayfa, yazı veya dış bağlantı; ağaç yapılı, sıralı |
| `sections` | Sayfa bölümleri (aşağıda) |
| `redirects` | [14-seo.md](14-seo.md) |

Yasal sayfalar (mesafeli satış sözleşmesi, KVKK aydınlatma metni, iade koşulları) sıradan sayfalardır ama kanal ayarında **rol** olarak işaretlenir; checkout onay kutuları bu rollere bağlanır ve sipariş, onaylanan metnin sürümünü anlık görüntü olarak saklar.

## 2. Bölümler (ana sayfa ve açılış sayfaları)

Sayfa = sıralı bölüm listesi. Bölüm = `type` + `settings` (JSON).

- Bölüm türleri **temada** tanımlanır: her tür bir Zod ayar şeması + bir Astro bileşenidir (`hero`, `featured-collection`, `product-grid`, `rich-text`, `image-with-text`, `banner`, `newsletter`).
- Admin, ayar şemasından formu üretir (yapılandırılabilir operasyonlarla aynı mekanizma); sürükle-bırak sıralama.
- Bölüm ayarı yalnızca **referans** taşır (koleksiyon `public_id`'si, medya kimliği); render anında okuma modelinden tek turda çözülür. Bölüm kendi başına sorgu atmaz; sayfa, bölümlerin istediği referansları toplar ve tek `batch` ile getirir.
- Built-in app'ler kendi bölüm türünü ekleyebilir. Uygulamalar ekleyemez (vitrine yabancı kod girmez); veriyi metadata/özel alanla yazar, tema gösterir.
- Düzenleme form tabanlıdır ve taslak önizlemesi vardır ([../07-istemciler/04-tema-sistemi.md](../07-istemciler/04-tema-sistemi.md)). Sürükle-bırak görsel düzenleyici ve tema mağazası kapsam dışıdır.

## 3. Menüler

Menü, kanal başına bellekte tutulan küçük bir ağaçtır; her sayfada sorgulanmaz. Öğe hedefi silinir veya yayından kalkarsa öğe render edilmez ve admin'de uyarı çıkar. Koleksiyon ağacından otomatik menü üretme bir menü kaynağı seçeneğidir.

## 4. Markdown

`html: false`; ham HTML kaçışlanır. Vitrin ve admin önizlemesi aynı sunucu tarafı `renderMarkdown()` fonksiyonunu kullanır. Görsel yerleştirme medya seçicisinden gelir ve hazır `srcset` üretir. Kısa kodlar (ürün kartı, koleksiyon ızgarası) sınırlı bir izin listesidir.

## 5. Yayın

`draft → published`; ileri tarihli yayın zamanlanmış görevle. Her kayıt değişikliği önbellek etiketini temizler (`page:<id>`, `menu:<id>`, `shell`). Sürüm geçmişi v1'de yoktur; denetim kaydı önce/sonra özetini tutar.

## 6. Performans

İçerik sayfaları katalog sayfalarıyla aynı kurala tabidir: SSR + segment anahtarlı kenar önbelleği, sayfa başına tek veritabanı turu, render yolunda dış çağrı yok. İçerik kişiye özel değildir; segment yalnızca kanal + dildir.

## 7. Harici CMS

Sanity, Contentful, Strapi gibi sistemler uygulama olarak bağlanır: içerik değişince uygulama `pages`/`sections` kayıtlarını API ile yazar (senkron), vitrin yine yerelden okur. İstek anında CMS'e gidilmez.
