# Belgeler (sipariş özeti, paketleme listesi, fiş)

Çekirdek `documents` servisi. Resmî fatura bu belgede değil, e-fatura built-in app'indedir ([../09-built-in-apps/01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)). Karar gerekçesi ve Medusa karşılaştırması: [../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md).

Medusa eklentisi: fatura ve irsaliye PDF'i; belge **saklanmaz**, her görüntülemede siparişten yeniden üretilir; numaralama otomatik, desenli (`ABC123{invoice_number}`) veya zorunlu sayı; çok dilli; otomatik e-posta ve premium şablonlar ücretlidir. Zayıf nokta: sipariş değişirse eski fatura da değişir.

Kararlar:

| Belge | Biçim | Neden |
|---|---|---|
| **Resmî fatura / e-arşiv / e-irsaliye** | E-fatura built-in app'i ([../09-built-in-apps/01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)) | Türkiye'de fatura GİB / entegratör kaydıdır, PDF'i yalnızca görünümdür; kesildikten sonra **değişmez** (`invoices` tablosu, `externalId`, numara) |
| **Sipariş özeti, paketleme listesi (irsaliye değil), teslimat fişi, iade etiketi** | Çekirdek `documents` servisi | Her mağaza ister, sipariş verisinden türer |
| **Fatura dışı ülke için basit fatura PDF'i** | E-fatura belgesindeki "diğer ülkeler" yolu (PDF üreten sağlayıcı) | Zaten tanımlı |

Çekirdek belge kuralları:
- Şablon: HTML + yazdırma CSS'i, kanal başına logo/adres/dil. Tarayıcıda "yazdır / PDF olarak kaydet" varsayılan yoldur (Workers'ta başsız tarayıcı yok). Sunucuda PDF dosyası gerekirse `DocumentRenderer` portu vardır; Node'da bir sürücü, Workers'ta HTML döner ⚠️ (Workers'ta PDF kitaplığı seçimi doğrulanmadı).
- **Paketleme listesi / sipariş özeti anlık değildir:** üretildiğinde `documents` tablosuna `(order_id, kind, version, content_hash, r2_key)` yazılır; sipariş sonradan değişirse yeni sürüm üretilir, eskisi durur. Resmî fatura ise ayrı ve değişmezdir.
- Toplu yazdırma: seçili siparişlerin paketleme listeleri tek HTML sayfasında (kargo hazırlığı için).
- Çok dilli: şablon sipariş dilini kullanır; metinler çeviri katalogundandır.
- Premium özellik yok. Otomatik e-posta gönderimi bildirim sistemindedir ([../05-ticaret/15-bildirimler.md](../05-ticaret/15-bildirimler.md)): "sipariş onayı" e-postasına belge eklenebilir.
- Belge erişimi: müşteri yalnızca kendi siparişinin belgesini, admin `orders:read` ile görür; R2 anahtarları özel kovada ve imzalı bağlantıyla verilir.

## Kişiselleştirilmiş kalemler

Paketleme listesi ve sipariş özeti, kişiselleştirmesi olan her kalemin altında alanları (etiket: değer) basar; metin her zaman düz metin olarak kaçışlanır. Görsel alanı için küçük önizleme (özel kovadan imzalı bağlantı, belge üretim anında) ve dosya adı yazılır; yazdırılan kâğıtta bağlantı QR olarak da basılabilir (ayar). Kişiselleştirme düzeltilirse ([05-sepet-ve-checkout.md](05-sepet-ve-checkout.md) bölüm 1.1) belgenin yeni sürümü üretilir, eski sürüm durur; toplu yazdırmada kişiselleştirilmiş siparişler üstte ve işaretli listelenir. Resmî faturaya yalnızca açıklama metni gider, görsel gitmez.
