# Storefront (vitrin) ve tema sözleşmesi


Tema dosyaları (`apps/storefront/src/themes/<tema>/`) veritabanı satırı **görmez**. Yalnızca sunum modelleri alır:

- Değerler çözülmüş gelir: görsel için hazır `src`/`srcset`, biçimlenmiş fiyat metni, hazır URL, stok için boolean/kova.
- Tema asla R2 anahtarından URL üretmez, para hesaplamaz, API yolu kurmaz.
- Sözleşme, varsayılan temanın ihtiyacı kadar küçüktür; her alan bir uyumluluk sözüdür.

Böylece tema düzenlemesi çekirdeği bozamaz ve iç kimlikler şablona sızmaz. Tema başına `tokens.css` renk, yazı tipi ve köşe yarıçapını tanımlar; `packages/tokens` bunun kaynağıdır.

Vitrin sunucuda render edilir ve JavaScript'siz çalışır; Svelte adaları yalnızca kazandırdığı yerde kullanılır (sepet çekmecesi, ürün galerisi, ödeme durumu yoklaması). Gerekirse ileride React adaları eklenebilir; bu şu an planlanmıyor.

**Sepet etkileşimi:**

- Sepete ekle gerçek bir `<form method="post">`'tur. JavaScript varsa ada isteği yakalar, rozeti günceller ve çekmeceyi açar; sayfa yenilenmez, kaydırma konumu kaybolmaz. JavaScript yoksa normal POST + yönlendirme çalışır.
- Rozetteki adet `@nanostores/persistent` ile yerel depodan okunur ve ekleme/çıkarmada güncellenir. Sayfa başına sepet isteği atılmaz, rozet yüklenirken yer değiştirmez.
- Sepetin tamamı yalnızca çekmece açıldığında veya sepet sayfasında API'den yüklenir.
- Checkout sıkıcı kalır: düz formlar + sağlayıcının barındırdığı ödeme sayfası. Apple Pay / Google Pay gibi yöntemler sağlayıcının sayfasından gelir, ayrıca entegre edilmez.

## B2B portalı

Ayrı bir uygulama değildir; aynı storefront'un `b2b` / `hybrid` kanalda açılan ek sayfalarıdır: şirket başvurusu, etkin şirket seçimi, hızlı sipariş, kayıtlı listeler, onay bekleyenler, teklifler, kredi ve ekstre. Hepsi `no-store`'dur. Katalog sayfaları B2C ile aynı şablondur; fark segmentten gelen fiyat ve vergi hariç gösterimdir.

## Render ve önbellek

- Katalog sayfaları SSR + kenar önbelleği; anahtar segmenttir ([../03-cekirdek/05-onbellek.md](../03-cekirdek/05-onbellek.md)).
- Sayfa verisi okuma modelinden tek turda gelir ([../05-ticaret/02-katalog-ve-arama.md](../05-ticaret/02-katalog-ve-arama.md)).
- Kişiye özel her şey (sepet rozeti, hesap, B2B'de kesin stok ve kredi) istemci adasında dolar.
- Storefront API'den ayrı dağıtılır ve yalnızca Shop API istemcisine sahiptir (Cloudflare'de servis bağlaması, ağ turu yok). Tema üçüncü taraf kodu olabildiği için veritabanına ve sırlara erişemez; ayrıntı [04-tema-sistemi.md](04-tema-sistemi.md).

## Tema paketi, içe aktarma ve yayın

Tema yapısı (Astro + Tailwind 4 + Svelte + shadcn-svelte + nanostores), tema kütüphanesi, GitHub içe aktarma, derleme ve güvenlik: [04-tema-sistemi.md](04-tema-sistemi.md).
