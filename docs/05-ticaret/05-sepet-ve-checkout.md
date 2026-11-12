# Sepet ve checkout

Sepet sipariş değildir (Vendure'dan ayrıldığımız yer). Akış: `carts` → `checkout_reservations` → `orders`.

## 1. Sepet

**`carts`**: `public_id`, `channel_id`, `customer_id?`, `company_id?`, `currency`, adresler, seçilen kargo yöntemi, kupon kodları, `version`, `expires_at`.
**`cart_lines`**: `variant_id`, `quantity`, `custom_fields`, `personalization?` (JSON, bölüm 1.1), `line_key`.

Sepette **tutar saklanmaz**; her okumada hesaplanır. Böylece bayat fiyat veya süresi dolmuş promosyon sepette kalamaz.

- Anonim sepetin anahtarı imzalı çerezdir. Girişte `cartMerge` stratejisi misafir sepetini müşterinin sepetiyle birleştirir.
- B2B'de sepet şirkete bağlıdır; bir alıcının birden çok adlandırılmış sepeti olabilir ([../06-b2c-b2b/](../06-b2c-b2b/)).
- Satır ekleme/çıkarma tek koşullu yazmadır (`ON CONFLICT(cart_id, variant_id, line_key) DO UPDATE` (kişiselleştirmesiz satırda `line_key = ''`; aynı varyant farklı kişiselleştirmeyle ayrı satırdır)); stok burada **ayrılmaz**, yalnızca kova kontrol edilir.
- Terk edilmiş sepetler zamanlanmış görevle hatırlatılır ve süresi dolunca silinir; `orders` tablosuna hiç dokunmazlar.

### 1.1 Kişiselleştirilebilir ürün (gravür, hediye notu, baskı görseli)

Müşterinin seçtiği, varyantla ilgisi olmayan bilgi (Vendure `how-to/configurable-products` örneği: gravür metni). Çekirdek özelliktir; ayrı bir app değildir, çünkü her siparişte satır ve fiyat yoluna girer.

**Tanım (ürün sahibi, admin'de).** `products.personalization` JSON sütunu, varyant başına geçersiz kılınabilir (`variants.personalization`; `null` = üründen devral, `{ "enabled": false }` = kapat). Kapalı şema (rastgele kod yok):

```ts
{ enabled: true,
  fields: [
    { key: 'engraving', type: 'text',  label, required: false, maxLength: 100, pattern?: string },
    { key: 'gift_note', type: 'text',  maxLength: 250, multiline: true, customizesGoods: false },
    { key: 'color',     type: 'select', options: ['altın','gümüş'] },
    { key: 'artwork',   type: 'image', maxBytes, mime: ['image/png','image/jpeg'] },
    { key: 'gift_wrap', type: 'boolean', customizesGoods: false } ],
  surcharge: [ { when: 'engraving', amount: 1000 },      // alan dolu ise sabit (küçük birim)
               { when: 'artwork',   percent: 5 } ] }      // liste fiyatının yüzdesi
```

Ek ücret para birimi başına tutar (`amount` yalnızca `currency` ile birlikte; çok para birimli kanalda `{ TRY: 1000, USD: 300 }`). `label` ve `options` çevrilebilir. En çok 10 alan.

**Doğrulama sunucuda, tek yerde (çekirdek).** Vitrin bayrağına güvenilmez (Vendure örneği bunu vitrine bırakıyor, bu bir açıktır):
1. Varyantta kişiselleştirme kapalıysa gelen `personalization` **reddedilir** (`PERSONALIZATION_NOT_ALLOWED`), sessizce yok sayılmaz.
2. Tanımda olmayan `key` reddedilir; `required` alan eksikse, `maxLength`, `pattern`, `select` seçeneği, `mime` ve boyut ihlalinde ilgili alan kodlu hata döner.
3. Metin normalize edilir (boşluk kırpma, Unicode NFC, kontrol karakterleri atılır); HTML işlenmez, her yerde metin olarak basılır (XSS ve e-posta/belge kaçışı).
4. Boş değerli alan saklanmaz (`engraving: ''` yok sayılır; ek ücret tetiklemez).

**Görsel yükleme.** Müşteri görseli sepete gömülmez: önce imzalı yükleme URL'si, görsel **özel kovaya** (`private/personalization/<cart>/`) gider, sepet satırı yalnızca `media_id` taşır ([12-medya.md](12-medya.md)). Tür ve boyut doğrulanır, içerik türü başlığa değil dosyaya bakılarak denetlenir; vitrin görseli yalnızca imzalı kısa ömürlü bağlantıyla gösterilir. Satın alınmayan sepetin görselleri sepetle birlikte silinir (zamanlanmış görev); siparişe geçenler sipariş saklama süresi boyunca durur, anonimleştirmede silinir ([11-musteriler.md](11-musteriler.md) bölüm 17).

**Satır kimliği.** `line_key` = kanonik (alanlar `key` sırasıyla, değerler normalize) `personalization` JSON'unun SHA-256'sının ilk 16 baytı. Aynı varyant + aynı kişiselleştirme aynı satırda adet artırır; farklıysa ayrı satır. `custom_fields` `line_key`'e girmez (özel alan farkı satırı bölmez).

**Fiyat.** `linePrice` stratejisinin girdisi artık `{ variant, quantity, selectedPrice, personalization }`'dır (saf kalır). Varsayılan uygulama tanımdaki `surcharge` kurallarını uygular: birim fiyat = seçilen fiyat + ek ücret(ler). Ek ücret **liste fiyatına** eklenir, promosyon bu toplam üzerinden çalışır (ek ücreti indirimden hariç tutmak isteyen mağaza, promosyon koşulunda `personalized = false` kullanır). Ek ücret ayrı bir tutar olarak `CartTotals` satırında ve sipariş satırında görünür (`surcharge`, `base_unit_price`); **ek ücret satırın vergi kategorisini ve oranını alır** (ayrı kategori yok). Dayanak: KDV Genel Uygulama Tebliği (2023 birleşik metin, "Matraha Dahil Olan Unsurlar", KDVK md. 24): ambalaj, taşıma, komisyon ve "servis ve benzer adlar altında sağlanan her türlü menfaat, hizmet" matraha dahildir; yani ek ücret satışın matrahına girer. Ek ücret ayrı bir hizmet faturası kalemi sayılacaksa oran farkı ihtimali muhasebeciye sorulmalı; çekirdek bunu desteklemez. Tebliğin sonraki değişiklikleri okunmadı.

**Düzenleme.**
- Sepette: satır düzenlenirse `line_key` değişir; çekirdek bunu "eski satırı sil + yeni satır ekle" olarak tek koşullu yazmayla yapar (adet korunur). Fiyat yeniden hesaplanır.
- Siparişe dönüştükten sonra: müşteri değiştiremez. Yönetici, sipariş `unfulfilled` iken **ek ücreti değiştirmeyen** düzeltmeyi yapabilir (yazım hatası): `order_lines.personalization` yeni sürümü yazılır, eski değer `order_notes` ve `audit_log`'a düşer. Ek ücreti değiştiren düzeltme yapılamaz (iptal + yeni sipariş veya manuel düzenleme/iade akışı).
- Gönderim başladıktan (`partially_fulfilled`) sonra hiç değişmez.

**Sipariş satırı.** `order_lines.personalization` (anlık görüntü, doğrulanmış JSON; görseller için `media_id` + dosya adı özeti), `base_unit_price`, `surcharge`. Fatura ve e-fatura: birim fiyat ek ücret dahil tek satırdır; satır açıklamasına kişiselleştirme metni eklenir (örn. "Gravür: …"), sağlayıcının açıklama sınırını aşarsa kesilir (sınır e-fatura app'inin ayarıdır, tam metin sipariş satırında kalır) ([../09-built-in-apps/01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)). İade: kişiselleştirilmiş ürünün iadesi mağaza politikasıdır (ayar `returns.personalized`: `blocked` varsayılan (müşteri iade talebi formunda bu satır seçilemez, admin yine de elle iade açabilir) · `allowed`). Dayanak: Mesafeli Sözleşmeler Yönetmeliği md. 15, "tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan mallar" bendi ((b) bendi; ilme.av.tr makalesi de aynı bendi "ölçüye göre dikim, isim işlemeli ürün" örnekleriyle veriyor; güncel konsolide metin okunmadı). Kural **alan düzeyindedir**: alan tanımında `customizes_goods` (metin/görsel/seçim için varsayılan **true**; hediye paketi ve hediye notu gibi malı değiştirmeyenler için **false**). Satırda `customizes_goods = true` alan doluysa iade `returns.personalized` kuralına tabidir; yalnız hediye paketi/notu olan satır normal iadeye tabidir. Ürün sayfasında ve sepette "kişiye özel üründe iade yoktur" uyarısı ve onay kutusu (onay zaman damgasıyla siparişe yazılır) gösterilir; metin mağazanın hukuki danışmanına bırakılır, çekirdek yalnızca şablon verir.

**Teklif ve sözleşme fiyatı.** Teklif satırında birim fiyat teklifin kendisidir ve kişiselleştirme ek ücretini zaten içerir (`linePrice` atlanır, `personalization` yine saklanır ve doğrulanır). Sözleşme fiyatlı satırda ek ücret sözleşme fiyatının üzerine eklenir (varsayılan); mağaza `surcharge_on_contract = false` ile kapatabilir.

**Görünürlük.**
- Vitrin: ürün sayfasında alanlar tanımdan üretilir (yalnızca `enabled` ise), ek ücret önceden gösterilir; sepet, ödeme ve sipariş e-postasında satırın altında kişiselleştirme görünür.
- Admin: sipariş satırında kişiselleştirme bloğu; sipariş listesinde "kişiselleştirilmiş" rozeti ve süzgeci (`has_personalization`).
- Paketleme listesi ve sipariş özeti: her kalemin altında kişiselleştirme alanları, görsel için küçük önizleme ve indirme bağlantısı ([17-belgeler.md](17-belgeler.md)); belge sürümü kişiselleştirme düzeltmesinde yeniden üretilir.
- Dışa aktarma ve uygulamalar: `order.placed` olayı `personalization` taşır (ERP/üretim uygulaması kullanır); görsel yalnızca imzalı bağlantı olarak, süresi kısa.
- Stok: kişiselleştirme stoku etkilemez; ayrı üretim süresi gerekiyorsa varyantın `lead_time_days` alanı kullanılır ([04-stok.md](04-stok.md) bölüm 9).

**Performans.** Tanım ürün okuma modeline indekslenir (vitrin ek sorgu atmaz); doğrulama bellekte, `linePrice` hâlâ saf ve veri turu eklemez. Görsel yükleme sepet yolundan dışarıdadır.

**Test:** kapalı varyanta kişiselleştirme gönderme reddedilir; zorunlu alan eksik; uzunluk/desen/seçenek ihlali; boş alanın ek ücret tetiklememesi; aynı varyant farklı gravür = iki satır, aynı gravür = tek satır adet 2; ek ücret toplamda ve sipariş satırında doğru, promosyon sonrası doğru; çok para birimli ek ücret; HTML/kontrol karakteri kaçışı; başka sepetin görsel `media_id`'sini kullanma reddedilir (sahiplik); sipariş sonrası ek ücreti değiştiren düzeltme reddedilir; paketleme listesinde görünür; anonimleştirmede görsel silinir.

## 2. Hesaplama boru hattı

Saf fonksiyon: `calculate(ctx, cart, data) → CartTotals`. Veri iki turda toplanır (sepet + satırlar; sonra fiyatlar, stok kovaları, vergi kategorileri tek `batch`), geri kalanı bellekteki yapılandırmadır.

1. Satır fiyatı: `priceSelection` → `linePrice` ([03-fiyat.md](03-fiyat.md))
2. Promosyonlar: koşul → eylem; indirimler satırlara oransal dağıtılır ([08-promosyon.md](08-promosyon.md))
3. Kargo: uygun yöntemler + ücret ([10-kargo-ve-teslimat.md](10-kargo-ve-teslimat.md))
4. Vergi: satır ve kargo için vergi satırları ([09-vergi.md](09-vergi.md))
5. Toplamlar: net, vergi, brüt; her biri satırların toplamı

Aynı fonksiyon vitrinde, mobilde, teklifte ve checkout'ta kullanılır. Senkron uygulama kancaları (kargo oranı, vergi) 3. ve 4. adımda çağrılır; zaman aşımında yapılandırılmış yedeğe düşülür.

## 3. Rezervasyon (ödemeye gitmeden önce)

D1'de interaktif transaction olmadığı için her adım tek `atomic()` ve koşullu ifadelerdir.

**`checkout_reservations`**: `public_id`, `cart_id`, `channel_id`, `snapshot` (JSON: satırlar, fiyatlar, indirim, vergi, kargo, adresler, depo dağılımı, atıf verisi), `payment_method`, `status`, `expires_at`.

Tek `atomic()` içinde:

1. `INSERT INTO checkout_reservations ... SELECT ... WHERE <her (varyant, depo) hedefi için on_hand - reserved - safety >= adet> AND <sepet version'ı değişmedi>` — bir kalem bile yetersizse satır hiç oluşmaz.
2. Her hedef için `UPDATE stock_levels SET reserved = reserved + ? ... AND EXISTS (rezervasyon 'active')`.
3. Kupon kullanım sayacı (sınırlıysa) aynı koşula bağlı artar.
4. `stock_movements` satırları.

Aynı varyanta ait kalemler önce toplanır. Rezervasyon dönmediyse stok yoktur; kısmi ayırma mümkün değildir.

Durum makinesi: `active → payment_pending → settled` veya `active → released | expired | failed`.

## 4. Serbest bırakma

Aynı desenin tersi; hepsi "rezervasyon hâlâ `active` veya `payment_pending`" koşuluna bağlıdır, iki kez bırakılamaz.

- **Barındırılan ödeme sayfası (iyzico, PayTR, Stripe):** yalnızca doğrulanmış sağlayıcı webhook'u bırakır. Yerel saat dolsa bile bırakılmaz; ödeme tamamlanmış ve webhook gecikmiş olabilir.
- **Kendi sayfamızda beklenen ödeme (havale/EFT):** yerel `expires_at` yetkilidir; zamanlanmış görev süpürür.

## 5. Sipariş kaydı (settlement)

`orders` tablosunda yalnızca kesinleşmiş sipariş bulunur. Kesinleşmeyi `orderPlaced` stratejisi tanımlar: ödeme alındı / provizyon alındı / kapıda ödeme onaylandı / B2B vadeli sipariş kredi kontrolünden geçti.

Tek `atomic()`:

1. `INSERT INTO orders ... ON CONFLICT(reservation_id) DO NOTHING`
2. `UPDATE orders SET settlement_token = <bu çağrıya özel UUID> WHERE reservation_id = ? AND settlement_token IS NULL`
3. Sipariş satırları, indirim ve vergi satırları, ödeme kaydı, rezervasyonu `settled` yapma, sepeti kapatma, (B2B) kredi kullanımını artırma, outbox olayları (`order.placed`) — **hepsi `settlement_token = <aynı UUID>` koşuluna bağlı.**

Aynı tetikleyici iki kez veya eşzamanlı gelirse yalnızca biri token'ı alır; diğerinin ifadeleri etkisizdir. Sipariş kalemleri sağlayıcı metadata'sından değil rezervasyon anlık görüntüsünden okunur.

Stokta `reserved` yerinde kalır; artık siparişe aittir ve gönderimde düşer ([04-stok.md](04-stok.md)).

**Geç gelen ödeme** (rezervasyon `expired`/`failed` olduktan sonra): sipariş yine kaydedilir, stok bu kez koşullu ayrılır; yetmezse sipariş "stok istisnası" ile işaretlenir ve admin'e düşer. Ödeme almış sipariş asla sessizce yutulmaz.

## 6. Tetikleyiciler ve uzlaştırma

Settlement'ı üç şey çağırır ve hepsi aynı fonksiyondur: ödeme webhook'u, ödeme dönüş sayfası, zamanlanmış uzlaştırma. Dönüş sayfası ile webhook aynı anda gelirse token yalnızca birini kazandırır; ayrı kilit yoktur.

Uzlaştırma görevi, belirli süredir `active` / `payment_pending` bekleyen rezervasyonları ve `unknown` iadeleri sağlayıcı API'sinden sorgular ve normal settlement / bırakma yolunu çağırır. Webhook hiç gelmese de sistem doğru duruma varır.

## 7. Checkout arayüzü

Düz formlar + sağlayıcının barındırdığı ödeme sayfası. Mobil uygulama aynı sayfayı WebView içinde açar. Adımlar sunucu durumudur (adres → kargo → ödeme); her adım sepeti yeniden hesaplar.

## 8. Zorunlu yarış testleri

Son ürüne iki eşzamanlı alıcı (tam bir kazanan); aynı webhook'un iki eşzamanlı teslimatı; dönüş sayfası + webhook; sınırlı kuponun son kullanımına iki alıcı; rezervasyon sırasında ERP `on_hand` yazması; ödeme sonrası zaman aşımı + uzlaştırma.
