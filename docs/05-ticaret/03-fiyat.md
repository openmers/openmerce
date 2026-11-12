# Fiyat

Veri modeli Medusa'nın fiyat listesidir, karar noktası Vendure'un stratejisidir. Fiyat hiçbir zaman istek anında dış sistemden çekilmez.

## 1. Tablolar

**`price_lists`**: `public_id`, ad, `channel_id`, `currency`, `type` (`base` · `sale` · `contract`), `priority`, `starts_at`, `ends_at`, `includes_tax`, `status`.

**`price_list_targets`**: listeyi kimin gördüğü: herkes, müşteri grubu veya şirket.

**`prices`**: `(price_list_id, variant_id, min_qty)` → `amount`. `min_qty` miktar kademesidir (1, 10, 50 …). Birincil anahtar bu üçlüdür; arama tek indeks erişimidir.

Her kanalın bir `base` listesi vardır ve her satılan varyantın orada fiyatı bulunur. Üstü çizili fiyat `compare_at_amount` sütunudur.

## 2. Çözümleme

1. **Girişte, bir kez:** müşterinin grupları ve şirketinden geçerli fiyat listeleri bulunur, öncelik sırasıyla `ctx.priceListIds` olarak oturuma yazılır. Anonim ziyaretçide yalnızca `base` (+ herkese açık `sale`).
2. **İstek anında:** `SELECT ... FROM prices WHERE variant_id IN (...) AND price_list_id IN (...)` tek sorgu.
3. **`priceSelection` stratejisi** (saf): aday satırlardan birini seçer. Varsayılan: önce `contract`, sonra geçerli `sale`, sonra `base`; aynı türde `priority`; miktara uyan en yüksek `min_qty`.
4. **`linePrice` stratejisi** (saf): sepet satırının birim fiyatını verir; girdisi `{ variant, quantity, selectedPrice, personalization }`; varsayılan, seçilen fiyat artı ürün tanımındaki kişiselleştirme ek ücretidir ([05-sepet-ve-checkout.md](05-sepet-ve-checkout.md) bölüm 1.1). Müşteriye özel hesap (maliyet + marj gibi) buraya yazılır.

Geçerlilik tarihleri sorguda değil seçimde değerlendirilir; süresi dolan liste bir zamanlanmış görevle `status = expired` yapılır ve etiketi temizlenir.

## 3. Vergi dahil / hariç

Liste `includes_tax` taşır. Sepet her satır için hem net hem brüt tutarı hesaplar ve ikisini de saklar; gösterim kanalın `prices_include_tax` ayarına göredir. B2C vitrin brüt, B2B portal net + KDV gösterir. Hesap: [09-vergi.md](09-vergi.md).

## 4. Para birimi

Her para birimi için ayrı fiyat satırı tutulur (ayrı liste). Otomatik kur dönüşümü isteğe bağlı bir zamanlanmış görevdir: kaynak listeden hedef listeye kur + yuvarlama kuralıyla **yazar**; istek anında çarpma yapılmaz. Sipariş kendi para biriminde saklanır; raporlama için sipariş anındaki kur anlık görüntüde durur.

## 5. Önbellek

Fiyatı belirleyen küme `ctx.segment`'in parçasıdır. Aynı listeleri gören herkes aynı önbellek kopyasını paylaşır ([../02-genel-mimari/03-performans.md](../02-genel-mimari/03-performans.md) bölüm 2). Fiyat yazılınca: `reindex` (varsayılan liste ise) + `pl:<id>` etiketi temizliği.

## 6. Güven sınırı

İstemciden gelen fiyat hiçbir zaman kullanılmaz. Sepet her hesaplamada, checkout rezervasyonu da son kez fiyatı yazma modelinden çözer ve anlık görüntüye yazar. Rezervasyon sonrası fiyat değişirse o checkout eski fiyatla tamamlanır (rezervasyon ömrü kısadır).

## 7. Toplu yazma

`prices.setMany` (liste + varyant + kademe + tutar) parçalı ve idempotenttir; ERP ve CSV aynı ucu kullanır. On binlerce satırlık yükleme işle yapılır, indeksleme tamponlanır.

## 8. Kapsam dışı (şimdilik)

Kural motoru (bölge × grup × ürün kombinasyonlarından türeyen fiyat), teklif dışı pazarlık, canlı ERP fiyatı. İhtiyaç olursa önce `linePrice` stratejisiyle çözülür.
