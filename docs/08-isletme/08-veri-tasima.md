# Veri taşıma (başka platformdan geçiş)

Hedef: Shopify, WooCommerce, ikas ve benzeri bir mağazayı, satışı durdurmadan ve arama motoru sıralamasını kaybetmeden OpenMers'e taşımak.

> Kaynak platformların API ve dışa aktarma biçimleri bu oturumda doğrulanmadı; her bağlayıcı yazılırken kendi belgesinden teyit edilir.

## 1. Yapı

Taşıma aracı bir komut satırı aracı + admin ekranıdır; çekirdeğe özel kod eklemez, **toplu Admin API uçlarını** kullanır (`products.upsertMany`, `customers.upsertMany`, `prices.setMany`, `stock.setMany`, `redirects.importMany`, `orders.importHistorical`).

```
kaynak (API veya dışa aktarma dosyası)
   → okuyucu (platforma özel)          → ortak ara biçim (JSONL dosyaları)
   → doğrulayıcı (rapor üretir)        → yükleyici (toplu uçlar, parçalı, sürdürülebilir)
```

Ara biçim bilinçli olarak dosyadır: taşıma yeniden çalıştırılabilir, incelenebilir ve desteklenmeyen bir platform için elle üretilebilir (CSV → JSONL dönüştürücü dahil).

## 2. Ne taşınır

| Veri | Not |
|---|---|
| Ürünler, varyantlar, seçenekler, özellikler | SKU zorunlu ve benzersiz; eksikse üretilir ve raporlanır |
| Görseller | Kaynaktan indirilir, medya olarak yüklenir, boyut merdiveni üretilir (iş olarak) |
| Koleksiyonlar / kategoriler | Elle üyelikler aynen; kural tabanlılar en yakın `CollectionFilter`'a, olmuyorsa elle üyeliğe |
| Fiyatlar | Kanalın `base` listesine; indirimli fiyat `compare_at` olarak |
| Stok | İlk depoya; çoklu konum varsa eşleme dosyasıyla |
| Müşteriler, adresler | **Parolalar taşınmaz** (aşağıda) |
| Sipariş geçmişi | Salt okunur "tarihsel sipariş" olarak (aşağıda) |
| Sayfalar, blog, menüler | HTML → Markdown dönüşümü; dönüştürülemeyen bloklar raporlanır |
| Adresler (URL) | Eski yol → yeni yol `redirects` olarak |
| İndirim kodları | Basit olanlar promosyona; karmaşıklar raporlanır |

Taşınmayanlar: tema, uygulama verileri, ödeme sağlayıcısında saklı kartlar, abonelikler, hediye kartı bakiyeleri.

## 3. Hassas noktalar

- **Parolalar:** kaynak platformlar parola özetlerini vermez veya uyumsuz algoritma kullanır. Müşteriler parolasız içe aktarılır; ilk girişte "parolanızı belirleyin" e-postası (tek kullanımlık kod) alırlar. Toplu duyuru e-postası isteğe bağlıdır.
- **Tarihsel siparişler:** `orders.importHistorical` siparişi `source = import` ile yazar; **stok düşmez, ödeme kaydı sağlayıcıya bağlanmaz, outbox olayı üretmez** (müşteriye e-posta, ERP'ye sipariş, Pixel'e dönüşüm gitmez). Raporlara dahil edilip edilmeyeceği ayardır. İade bu siparişlerde yalnızca elle kayıt olarak yapılabilir.
- **Kimlikler:** kaynak kimlikleri `external_refs`'e yazılır (`kaynak = shopify` vb.); taşıma tekrar çalıştırıldığında aynı kayıt güncellenir, çift oluşmaz.
- **Pazarlama izni:** kaynakta izin kaydı (zaman, kaynak) varsa taşınır; yoksa müşteri **izinsiz** sayılır.
- **SEO:** her eski ürün, koleksiyon, sayfa ve yazı adresi için 301. Doğrulayıcı, kaynak site haritasındaki her adresin bir karşılığı olduğunu denetler ve eksikleri listeler.
- **Sipariş numarası:** yeni siparişler eski numaralarla çakışmasın diye sayaç, içe aktarılan en büyük numaradan sonra başlar veya önek alır.

## 4. Akış (kesintisiz geçiş)

1. **Deneme:** kaynak → ara biçim → doğrulama raporu. Hiçbir şey yazılmaz.
2. **İlk yükleme:** yeni mağaza yayında değilken tam içe aktarma.
3. **Kontrol:** örneklem karşılaştırması (ürün sayısı, rastgele 50 ürünün fiyat/stok/görsel sayısı, müşteri sayısı), vitrin ön izleme.
4. **Artımlı:** geçiş gününe kadar aralıklarla yeniden çalıştırma; yalnızca değişenler yazılır (içerik özeti).
5. **Geçiş:** eski mağaza siparişe kapatılır → son artımlı (stok ve son siparişler) → DNS değişir → yönlendirmeler etkin.
6. **Sonrası:** bir hafta boyunca 404 kaydı izlenir (`redirects` isabetleri ve karşılıksız yollar raporu); eksik yönlendirmeler eklenir.

## 5. Performans ve güvenlik

- Yükleyici toplu uçların sınırına (ör. 500 kayıt) uyar, hız sınırını gözetir ve imleçten sürer; kesilirse kaldığı yerden devam eder.
- İndeksleme içe aktarma boyunca tamponlanır, sonunda bir kez çalışır.
- Görsel indirme ayrı iş kuyruğudur; kaynak sunucuyu yormamak için eşzamanlılık sınırlıdır. Yalnızca `https` ve herkese açık adresler indirilir (SSRF koruması).
- Kaynak platform anahtarları taşıma aracının yapılandırmasında kalır, mağazaya yazılmaz.

## 6. Bağlayıcı sırası

1. Ortak ara biçim + CSV dönüştürücü + doğrulayıcı + yükleyici.
2. Shopify (en yaygın geçiş kaynağı; dışa aktarma biçimi bilinir).
3. WooCommerce.
4. ikas ve yerli altyapılar (Ticimax, IdeaSoft, T-Soft): erişim yöntemleri platforma göre değişir; çoğunda XML besleme veya CSV ile başlanır.

## 7. Test

Aynı taşımanın iki kez çalıştırılmasında çift kayıt olmaması; tarihsel siparişin stok, outbox ve rapor (ayar kapalıyken) üzerinde etkisiz olması; her kaynak adresin 301 ile 200 dönen bir hedefe gitmesi; yarıda kesilen yüklemenin sürdürülmesi.
