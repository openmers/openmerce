# B2C ve B2B: aynı çekirdek

B2B ayrı bir ürün veya ayrı bir kod yolu değildir. Sepet, fiyat çözümleme, rezervasyon, settlement ve sipariş B2C ile **aynı fonksiyonlardır**; B2B bunların üzerine dört kavram ekler.

## 1. Fark tablosu

| Konu | B2C | B2B | Mekanizma |
|---|---|---|---|
| Alıcı | Kişi (veya misafir) | Şirket adına üye | `companies`, `company_members` |
| Erişim | Herkese açık | Giriş zorunlu, onaylı şirket | kanal `access` |
| Fiyat | Perakende, vergi dahil | Sözleşme / liste, vergi hariç, miktar kademeli | fiyat listesi + `prices_include_tax` |
| Katalog | Kanalın tümü | Kanalın tümü veya şirkete özel alt küme | kanal + koleksiyon görünürlüğü |
| Stok gösterimi | Kova | Adet veya kademe (isteğe bağlı) | `stockDisplay` stratejisi |
| Sepet | Tek | Adlandırılmış birden çok, hızlı sipariş, CSV | `carts` |
| Sipariş kuralları | Yok | En az tutar, en az adet, paket katı | varyant alanları + kanal ayarı |
| Ödeme | Kart, havale, kapıda | Bunlar + vadeli (açık hesap) | `PaymentHandler: terms` |
| Kesinleşme | Ödeme | Ödeme **veya** kredi kontrolü | `orderPlaced` stratejisi |
| Onay | Yok | Limit üstü siparişte onaylayıcı | `approvalPolicy` stratejisi |
| Pazarlık | Yok | Teklif iste / teklif ver | `quotes` |
| Belge | Fatura | Sipariş no (PO), irsaliye, cari ekstre | sipariş alanları + built-in app |
| Satış temsilcisi | Yok | Müşteri adına sipariş | admin izni + denetim kaydı |

## 2. Kanal türleri

- **`b2c`**: şirket kavramı görünmez.
- **`b2b`**: giriş zorunlu; anonim ziyaretçi yalnızca giriş/başvuru sayfasını görür (isteğe bağlı: katalog fiyatsız açık).
- **`hybrid`**: tek site. Anonim ve bireysel müşteri perakende deneyimi yaşar; şirket üyesi giriş yapınca segmenti değişir ve B2B fiyat, sepet ve ödeme seçeneklerini görür.

## 3. Performans

B2B'nin klasik performans sorunu "her müşteriye özel fiyat → önbellek yok"tur. Çözüm segmenttir:

- Segment = kanal + dil + para birimi + **fiyat listesi kümesi**. Şirket kimliği anahtara girmez.
- Katalog sayfaları segment başına önbelleklenir; 500 bayi 4 fiyat listesini paylaşıyorsa 4 kopya vardır.
- Şirkete özgü her şey (kredi, sepet, onay bekleyenler, kesin stok adedi) önbellekli sayfada değil, giriş yapmış kullanıcı için ayrı `no-store` uçtadır ve istemci adasında dolar.
- Şirket ve üyelik bilgisi oturumdadır; istek başına sorgulanmaz.
- Büyük B2B sepeti (yüzlerce satır) için hesaplama yine iki turdur: satırlar + `IN` listeli tek fiyat sorgusu.

## 4. Sıralama

1. Fiyat listeleri + müşteri grupları (B2C'de de işe yarar).
2. Şirket hesapları + `b2b` kanal erişimi + vergi hariç gösterim.
3. Hızlı sipariş, adlandırılmış sepetler, sipariş kuralları.
4. Vadeli ödeme + kredi limiti.
5. Onay akışı.
6. Teklif.

Her adım bir öncekine dayanır ve tek başına yayınlanabilir.
