# SEO

Vitrin sunucuda render edilir ve JavaScript'siz okunabilir; SEO bunun üstüne dört şeydir: kalıcı adresler, doğru meta, yapılandırılmış veri, site haritası.

## 1. Adresler

- Varsayılan kalıplar: `/urun/<slug>`, `/koleksiyon/<slug>`, `/sayfa/<slug>`, `/blog/<slug>`; önek kanal ve dil başına ayarlanır (`/products/…`).
- Slug `(kanal, dil)` içinde benzersizdir; çeviri tablosunda durur.
- Varyant ayrı adres değildir: `?variant=var_…` sorgu parametresidir ve kanonik adres ürün adresidir.
- Filtre ve sıralama parametreli liste sayfaları `noindex, follow` ve kanonik olarak filtresiz koleksiyona işaret eder. İzin verilen birkaç filtre (ör. marka) temiz adresle indekslenebilir; bu, koleksiyon başına ayardır.
- Sayfalama: `?after=<imleç>`; her sayfa kendi kanoniğidir.

## 2. Yönlendirmeler

**`redirects`**: `channel_id`, `from_path`, `to_path`, `status` (301/302), `hits`, `source` (`auto · manual · import`).

- **Slug değişince otomatik 301:** slug güncellemesi ile yönlendirme satırı aynı `atomic()` içinde yazılır. Zincir oluşmaz: yeni yönlendirme eklenirken eski hedefi `from` olan satırlar yeni hedefe güncellenir.
- Silinen ürün: ayarla koleksiyonuna 301 veya 410.
- Arama sırası: önce gerçek rota, yalnızca 404 olacaksa `redirects` (tek indeksli sorgu, sonucu önbelleklenir). Böylece yönlendirme tablosu sıcak yola maliyet eklemez.
- Platform taşımada eski adresler toplu içe aktarılır ([../08-isletme/08-veri-tasima.md](../08-isletme/08-veri-tasima.md)).

## 3. Meta

Her ürün, koleksiyon, sayfa ve yazı için: `seo_title`, `seo_description` (boşsa ad ve açıklamadan türetilir), Open Graph ve Twitter kart alanları, `robots`. Varsayılan şablonlar kanal ayarındadır (`{ad} | {mağaza}`). Hepsi okuma modelinde hazır durur.

- **Kanonik:** her sayfada mutlak adres, kanalın birincil alan adıyla.
- **`hreflang`:** aynı kaydın diğer dil ve kanallardaki karşılıkları + `x-default`. Eşleşme indeksleme anında çözülür ve `product_view`'da saklanır.
- Aynı ürün birden çok kanalda (farklı alan adı) varsa hangisinin kanonik olduğu kanal ayarıdır; varsayılan, her alan adı kendi kanoniğidir.

## 4. Yapılandırılmış veri (JSON-LD)

| Sayfa | Tür |
|---|---|
| Ürün | `Product` + `Offer` (fiyat, para birimi, stok durumu, satıcı), `AggregateRating` (yorum varsa) |
| Koleksiyon | `ItemList`, `BreadcrumbList` |
| Yazı | `Article` |
| Site | `Organization`, `WebSite` + arama kutusu |

Üretim, tema bileşeni değil çekirdekteki saf fonksiyondur; tema yalnızca yerleştirir. Fiyat, anonim segmentin fiyatıdır (B2B fiyatı yapılandırılmış veriye girmez). Stok durumu kovadan gelir.

## 5. Site haritası ve robots

- `/sitemap.xml` bir dizindir; alt haritalar tür ve dil başına, 50.000 adres sınırıyla bölünür.
- İçerik `catalog_index` üzerinden imleçli okunur ve önbelleklenir; ürün yayınlanınca ilgili alt harita etiketi temizlenir. İstek anında tüm kataloğu taramaz.
- `robots.txt` kanal başınadır; varsayılanı sepet, checkout, hesap ve arama sonuçlarını dışlar. `b2b` (giriş zorunlu) kanalda varsayılan `Disallow: /`.
- Hazırlık ortamı ve yayınlanmamış kanal her zaman `noindex`.

## 6. Hız (Core Web Vitals)

- HTML kenar önbelleğinden gelir; kişiye özel parça sonradan dolar ve yer kaplamaz (rozet için sabit alan).
- Görseller hazır `srcset`, genişlik/yükseklik öznitelikleri ve ilk görsel için öncelik ipucuyla.
- Vitrin JavaScript'i yalnızca adalardır; ana içerik için JS gerekmez.
- Pixel betikleri sandbox'ta ve ana iş parçacığı dışında çalışır.
- Hedefler k6/Lighthouse CI ile ölçülür; ölçülmeden iddia edilmez.

## 7. Ürün beslemeleri

Google Merchant Center ve Meta katalog beslemesi kanal başına üretilen dosyalardır (iş ile, depolamaya yazılır, sabit adresten sunulur). Pixel uygulamasının "katalog beslemesi" maddesi buraya bağlanır.

## 8. Test

Slug değişince 301; zincirsiz yönlendirme; filtreli sayfada `noindex` + kanonik; `hreflang` karşılıklılığı; JSON-LD şema doğrulaması; site haritasında yayından kalkmış ürün olmaması; B2B kanalında `Disallow`.
