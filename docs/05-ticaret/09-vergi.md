# Vergi

## 1. Model (Vendure)

| Tablo | İçerik |
|---|---|
| `zones`, `zone_members` | Ülke / il kümeleri; vergi ve kargo ortak kullanır |
| `tax_categories` | Ürün sınıfı: standart, indirimli, gıda, kitap … |
| `tax_rates` | `(zone, tax_category, customer_group?)` → oran (baz puan) |

Varyant bir vergi kategorisi taşır. Tümü bellekte durur.

## 2. Hesaplama

1. `taxZone` stratejisi bölgeyi seçer: teslimat adresi, yoksa kanalın varsayılanı.
2. `taxLine` stratejisi satırın vergi satırlarını üretir (varsayılan: bölge + kategori oranı).
3. Fiyat vergi dahilse net geri hesaplanır; hariçse vergi eklenir. Her satır **hem net hem brüt** saklar.
4. Yuvarlama satır düzeyindedir; sipariş vergisi satırların toplamıdır. Faturayla kuruş farkı çıkmaması için e-fatura built-in app'i aynı yardımcıyı kullanır.
5. Kargo ücreti kendi vergi kategorisine sahiptir.
6. Sipariş düzeyi indirim, satırlara oransal dağıtıldıktan sonra vergi hesaplanır.

## 3. B2B ve muafiyet

- Müşteri grubu veya şirket başına oran tanımlanabilir (`customer_group`): ihraç kayıtlı, muaf kurum.
- Şirket kaydı vergi dairesi ve vergi numarası taşır; muafiyet belge ve geçerlilik tarihiyle saklanır.
- AB içi ters yükleme (reverse charge) `taxLine` stratejisiyle eklenir; çekirdekte yoktur.

## 4. Türkiye

KDV oranları (%1, %10, %20) kategoriyle modellenir; oran değişikliği admin'den yapılır ve yalnızca yeni sepetleri etkiler (sipariş anlık görüntü taşır). Tevkifat, ÖTV ve e-fatura senaryoları e-fatura built-in app'inin işidir.

## 5. Dış vergi servisi

Uygulama `taxes:handle` izniyle senkron kanca sağlayabilir; yalnızca sepet/checkout'ta çağrılır, zaman aşımında yerel orana düşülür.
