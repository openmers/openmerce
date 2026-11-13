# Kargo ve teslimat

## 1. Kargo yöntemi (sepet tarafı)

Vendure modeli: **kargo yöntemi** = admin'de tanımlanan kayıt (ad, kanal, bölge) + `ShippingEligibilityChecker` + `ShippingCalculator`, argümanlarıyla.

- Varyantlar ağırlık ve ölçü taşır; sepet toplam ağırlığı ve desiyi hesaplar.
- Yerleşik hesaplayıcılar: sabit ücret, ağırlık kademesi, desi, tutar üstü ücretsiz.
- Ağırlık tamsayı gramdır (birim dönüşümü yalnız form sınırında). `null` = bilinmiyor, 0 değil; ağırlığa bağlı hesaplayıcı bilinmeyen ağırlıkta yedek ücrete düşer ya da yöntemi uygun saymaz (yöntem ayarı), sessizce 0 hesaplamaz.
- Kademeler birikmez: toplam ağırlık tek kademeye düşer; son kademe sonluysa üstü hizmet dışıdır (hata değil, uygun olmayan yöntem).
- Teslim biçimi (kargo/mağazadan teslim) etiket metninden çıkarılmaz, yöntemde veri olarak tutulur.
- Kargo firması canlı fiyatı bir hesaplayıcı built-in app'idir; zaman aşımı ve yedek ücret zorunludur, sonuç sepet özeti anahtarıyla kısa süre önbelleklenir.
- Uygulamalar `shipping:handle` izniyle senkron kanca üzerinden oran sağlayabilir.
- Yöntemler ve bölgeler bellektedir; yerleşik hesaplayıcılarla kargo seçeneği listesi sorgu atmaz.
- Sipariş, fiyatlandığı ağırlığı, yöntemi ve ücreti anlık görüntü olarak saklar.

Birden çok depodan çıkan sepet v1'de tek kargo satırıyla fiyatlanır; depo başına ayrı gönderim teslimat tarafında oluşur.

## 2. Teslimat (sipariş tarafı)

**`fulfillments`**: sipariş, depo, `state` (`pending · shipped · delivered · cancelled`), taşıyıcı, takip numarası, etiket dosyası.
**`fulfillment_lines`**: sipariş satırı + adet (kısmi gönderim).
**Dijital ürün tabloları (bölüm 7):** `digital_assets (variant_id, media_id, version, label)` · `digital_entitlements (order_line_id, customer_id?, media_id, token_hash, expires_at, download_limit, downloads, revoked_at)`; `fulfillments.kind` = `physical` (varsayılan) · `digital`.

Gönderim oluşturma tek `atomic()`: fulfillment satırları + stok düşümü (`on_hand −`, `reserved −`) + `sale` hareketleri + `order.fulfilled` olayı + siparişin teslimat durumu sütunu.

`FulfillmentHandler` operasyonu taşıyıcıyla konuşur (etiket, takip). Dış çağrı olduğu için bir outbox adımıdır: önce gönderim `pending` olarak yazılır, iş taşıyıcıdan etiketi alır ve `shipped` yapar. Takip güncellemeleri taşıyıcı webhook'u veya zamanlanmış sorguyla gelir.

## 3. İade (return)

**`returns`**: sipariş, satırlar, neden, `state` (`requested · approved · received · rejected`). Teslim alınınca: stok `on_hand +` (satılabilir işaretliyse), ardından ödeme iadesi ([06-odeme-ve-iade.md](06-odeme-ve-iade.md)) ayrı adım olarak. Müşteri iade talebini hesabından açar; iade kargo kodu taşıyıcı built-in app'inden gelir.

**Cayma hakkı ve iade pencereleri (kaynak: ilme.av.tr makalesi, 30 Eylül 2026 tarihli ikincil yorum; mevzuat metni okunmadı).** `returns.kind` = `withdrawal` (14 günlük cayma) · `other` (garanti, hatalı ürün, mağaza politikası). Cayma kuralları:
- **Süre:** 14 gün, gerekçesiz. Mal için başlangıç **teslim alındığı gün** (`fulfillments.delivered_at`; kargoya verilme teslim sayılmaz), çok parçalı teslimatta son parça, çok teslimatlı siparişte son mal; hizmet için sözleşmenin kurulduğu gün. Teslimden önce de cayma yapılabilir. Çekirdek pencereyi `delivered_at`'ten hesaplar; teslim bilgisi yoksa (taşıyıcı bildirmediyse) admin elle girer, yoksa pencere kapanmaz.
- **Bilgilendirme eksikse süre uzar** (en çok 1 yıl); bu yüzden cayma bilgilendirme metninin gösterildiği an ve sürümü siparişe yazılır (ispat yükü satıcıdadır).
- **İstisnalar** (md. 15, makalenin tablosuna göre): (b) kişiye özel hazırlanan mallar, (c) çabuk bozulan, (ç) koruyucu unsuru açılmış hijyen ürünü (iki şart birlikte aranır, kutusu açılmış ayakkabı kapsam dışı), (e) açılmış maddi ortamdaki kitap/dijital içerik/sarf, (ğ) anında teslim gayrimaddi mallar, (h) onayla başlanan hizmet ve diğerleri. Çekirdek bunu **ürün/varyant bayrağı** (`withdrawal_exempt` + gerekçe) ve satır düzeyi (kişiselleştirme, dijital hak) olarak uygular; müşteri forma istisnalı satırı seçemez, admin elle açabilir. Liste mevzuat değiştikçe değişir, kod içine gömülmez, ayar/tablo olarak tutulur.
- **Satıcı geri ödemesi:** iade bildirimi/ürün teslim alınmasına göre başlayan süre içinde, **tek seferde, aynı ödeme aracına ve masrafsız**; hediye çeki veya bakiye bu şartı karşılamaz (makale). Çekirdekte `refund` varsayılan hedefi özgün ödeme aracıdır ([06-odeme-ve-iade.md](06-odeme-ve-iade.md)); mağaza kredisi ancak müşteri açıkça seçerse sunulur.
- **Müşterinin geri gönderme süresi:** cayma bildiriminden itibaren 14 gün (makaleye göre 2022 değişikliğiyle 10'dan 14'e çıkmış, 1 Ocak 2026'dan beri uygulanıyor).
- **İade kargosu masrafı:** mağaza ön bilgilendirmede **iade taşıyıcısını** belirtir (`returns.carrier` ayarı, zorunlu). Ürün o taşıyıcıyla gönderilirse masraf müşteriye yüklenemez; taşıyıcı belirtilmemişse masraf istenemez; taşıyıcının müşterinin bulunduğu yerde şubesi yoksa mağaza ek masraf istemeden ürünü teslim alır (kapıdan alım etiketi). Pazaryeri siparişlerinde bu yükümlülük aracıya aittir (makale); pazaryeri app'i iadeyi pazaryerine devreder. Müşterinin başka bir kargoyla göndermesinin masrafı yürürlükteki metinde açık değil (makale), varsayılan: mağaza öder.
- **Bu sayıların hiçbiri koda gömülmez; hepsi örnek varsayılandır ve değiştirilebilir.** Mevzuat ülkeye ve zamana göre değiştiği için kurallar bir **hukuk ilkesi (`legal_policy`)** ayarında tutulur. `policy-tr` örnek hazır ayar olarak gelir, mağaza sahibi admin'den düzenler, başka ülke kendi ilkesini ekler (kanal/pazar başına seçilir). Örnek içerik:
  `withdrawal.days=14` · `withdrawal.start=delivery` (`delivery` | `contract`) · `withdrawal.extended_max_days=365` · `withdrawal.exempt_kinds=[personalized, perishable, opened_hygiene, opened_media, instant_digital, consented_service]` · `refund.days=14` · `refund.method=original` · `return.ship_days=14` · `return.cost_payer=merchant_if_carrier_named` (`merchant` | `customer` | `merchant_if_carrier_named`) · `return.carrier_required=true`.
  Çekirdek yalnızca bu değerleri okur. Değer değişince yeni siparişler yeni ilkeyi kullanır; mevcut siparişe **sipariş anındaki ilke sürümü** yazıldığı için eski siparişin penceresi geriye dönük değişmez. Ürün/varyant bayrağı ve admin'in elle istisna açması ilkenin üstünde çalışır. Varsayılanlar hukuki tavsiye değildir; yayına almadan önce mağaza sahibi/danışmanı gözden geçirir.
- **Cayma bildirimi:** hesaptan form, e-posta veya yazılı; kalıcı veri saklayıcıyla yapılmış sayılır, `returns` satırı oluşur. İspat yükü müşteride olduğundan bildirim zaman damgası ve kanal saklanır.

## 4. Mağazadan teslim

Depo `pickup_enabled` ise bir kargo yöntemi olarak sunulur; uygunluk denetleyicisi o depoda stok arar ve `stockLocation` stratejisi o depoyu zorlar.

## 5. B2B

Kısmi ve parçalı gönderim, teslimat tarihi talebi, şirket adres defterinden seçim, palet/koli katları (varyantın paket katı) ve sevk irsaliyesi (e-fatura built-in app'i) desteklenir; [../06-b2c-b2b/](../06-b2c-b2b/).

## 6. Elle teslimat (varsayılan işleyici)

`fulfillments` taşıyıcı adı, takip numarası ve etiket dosyası alanlarını taşır (bölüm 2). Çekirdekte varsayılan `manual` teslimat işleyicisi: admin taşıyıcı seçer (listeden veya serbest), takip no ve isteğe bağlı bağlantı şablonu girer, "gönderildi" der; müşteriye bildirim gider. Kargo firması built-in app'leri (Yurtiçi, Aras, MNG) aynı portu etiket üretip takip numarasını kendileri doldurarak uygular.

## 7. Dijital ürünler

Kaynak: Vendure `how-to/digital-products` (tam okundu). Vendure örneği bayrak + özel teslimat işleyicisi + eşleme stratejisi ile çalışır ama **erişim denetimi, süre, iade, yeniden indirme ve gerçek teslim mekanizmasını boş bırakır** (bağlantılar `public` alandan okunur). Bizde çekirdek minimum, güvenli sürüm:

- **Tanım:** `variants.fulfillment_type` = `physical` (varsayılan) · `digital`. Dijital varyantın `digital_assets` kaydı vardır: `(variant_id, media_id (özel kova), version, label)`; birden çok dosya ve sürüm olabilir. Dijital varyant `track_inventory = false` varsayılır; lisans anahtarı havuzu v2'dir.
- **Sepet ve checkout:** yalnızca dijital kalem varsa adres ve kargo adımı atlanır, e-posta zorunludur ve **misafir alışveriş açıksa e-postaya bağlantı gider**. Karma sepette dijital kalemler kargo grubuna **girmez** (Vendure'un atama stratejisi karşılığı çekirdekte sabit kural), kargo yalnızca fiziksel kalemler içindir.
- **Teslimat:** ödeme `settled` olunca (`order.payment_settled` olayı) çekirdek, dijital satırlar için `kind = digital` bir `fulfillment` açar ve doğrudan `delivered` yapar (stok düşümü yok). Elle onay isteyen mağaza `digital.auto_fulfill = false` yapar.
- **Erişim hakkı:** `digital_entitlements(id, order_line_id, customer_id?, media_id, token_hash, expires_at, download_limit, downloads, revoked_at)`. Varsayılan: 365 gün, 5 indirme (ayar). Hak sipariş satırı başınadır.
- **İndirme:** `GET /shop/downloads/:entitlement_public_id`. Girişli müşteri sahiplikle, misafir e-postadaki tek hakka özel jetonla (yalnızca özeti saklanır) doğrulanır; geçerliyse sunucu 15 dakikalık imzalı özel kova bağlantısına yönlendirir ve `downloads` artar. Süre/limit aşımı veya `revoked_at` ise 403. **Bağlantı hiçbir zaman sipariş alanı olarak dönmez**; siparişte yalnızca hak kimliği vardır.
- **İade / iptal:** iade tamamlanınca veya sipariş iptal edilince ilgili haklar `revoked_at` ile kapanır; kısmi iadede yalnızca o satırın hakkı. Yönetici hakkı elle uzatabilir/sıfırlayabilir (denetim kaydı).
- **Yeni sürüm:** `digital_assets.version` artınca eski hak sahipleri yeni sürümü indirebilir (varsayılan) veya yalnızca satın aldığı sürümü (ayar).
- **Cayma hakkı:** Mesafeli Sözleşmeler Yönetmeliği md. 15 (2014 yayım metni ve ilme.av.tr makalesi okundu; makaleye göre (ğ) ve (e) için onay şartı yoktur, onay yalnızca (h) hizmet bendindedir, aşağıdaki onay kutusu bizim koruyucu uygulamamızdır): "elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallar" için cayma hakkı yoktur ((ğ) bendi); cayma süresi dolmadan **tüketicinin onayıyla** ifasına başlanan hizmetler için de yoktur ((h) bendi). Bizde: dijital kalemde ödeme öncesi onay kutusu zorunlu ("indirme başladığında cayma hakkımı kaybedeceğimi biliyorum", zaman damgası siparişe yazılır); `digital.withdrawal` = `none` varsayılan (indirme/erişim ilk kez gerçekleşince iade kapanır; hiç indirilmemişse mağaza iade edebilir). Makaleye göre 2022'de eklenen (i) bendi (telefon, tablet, bilgisayar, akıllı saat) 24 Mayıs 2025'te uygulanmadan kaldırıldı; (ı), (j), (k) bentleri için makale Danıştay'ın 6 Mayıs 2026 tarihli iptal kararını söylüyor (kontrol edilmedi). Güncel konsolide metin hâlâ okunmadı.
- **Vergi:** AB'ye dijital hizmet satışında müşterinin ülkesine göre KDV [09-vergi.md](09-vergi.md) `taxLine` stratejisiyle eklenir. Türkiye'de dijital ürün için fatura (e-arşiv) kesimi normal mal satışıyla aynı akıştır (e-fatura app'i); özel bir dijital ürün KDV oranı doğrulanmadı.
- **Test:** süresi dolmuş/iptal edilmiş hak 403; başkasının hakkıyla indirememe; iade sonrası erişim kapanır; misafir jetonu tek hak için çalışır; karma sepette kargo satırı yalnızca fiziksel kalemleri kapsar; bağlantı siparişe sızmaz.
