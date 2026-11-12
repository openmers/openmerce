# Sürüm yükseltme

## 1. Sürümleme

- Semantik sürüm. `@openmers/*` paketleri ve resmî built-in app'ler aynı numarayla çıkar.
- **Kırıcı sayılanlar** (yalnızca büyük sürümde): API sözleşmesinden alan/uç kaldırma, webhook gövdesinden alan kaldırma, built-in app arayüzünde (`defineBuiltInApp`, strateji imzaları, olay adları) uyumsuz değişiklik, yapılandırma anahtarının kaldırılması, en düşük Node sürümü.
- **Kırıcı sayılmayanlar:** yeni alan, yeni uç, yeni olay, yeni isteğe bağlı ayar, yeni tablo ve sütun.
- Kaldırılacak her şey önce en az bir küçük sürüm boyunca "kullanımdan kalkıyor" uyarısı verir (log + admin "Sistem" sayfası).

## 2. Self-host yükseltme akışı

```
1. Sürüm notlarını oku (kırıcı değişiklik ve elle adım var mı)
2. Yedek güncel mi?  → pnpm backup:verify
3. Yeni imajı/kodu çek
4. Başlat: süreç açılışta
     a. uyumluluk denetimi (built-in app sürümleri, Node sürümü, yapılandırma şeması)
     b. migration'ları uygula
     c. trafiğe aç
```

- Uyumluluk denetimi başarısızsa süreç **migration'a başlamadan** durur ve nedenini yazar.
- Migration başarısızsa süreç başlamaz; eski sürüme dönmek güvenlidir, çünkü migration'lar eklemelidir (eski kod yeni sütunları görmezden gelir).
- `openmers upgrade --check` komutu yukarıdaki a adımını ve bekleyen migration listesini, hiçbir şeyi değiştirmeden gösterir.
- Sürüm atlama: küçük sürümler atlanabilir. Büyük sürümler sırayla geçilir (1.x → 2.0 → 3.0); her büyük sürüm, bir öncekinin son küçük sürümünden yükseltmeyi destekler.

## 3. Migration türleri

| Tür | Ne zaman çalışır | Örnek |
|---|---|---|
| Şema (eklemeli) | Açılışta, trafik öncesi | Yeni sütun, tablo, indeks |
| Veri doldurma (backfill) | Açılıştan sonra, iş olarak, parçalı | Yeni sütunu eski satırlar için doldurma |
| Temizlik | Bir sonraki **büyük** sürümde | Artık kullanılmayan sütunu bırakma |

Kural (genişlet → taşı → daralt): yeni sütun eklenir ve kod ikisini de yazar; iş eski satırları doldurur; okuma yeni sütuna geçer; eski sütun ancak sonraki büyük sürümde kalkar. Uzun süren veri doldurma açılışı bekletmez; ilerlemesi admin'de görünür.

Büyük tabloya indeks eklemek SQLite'ta tabloyu kilitler; bu tür migration sürüm notunda "bakım penceresi gerektirir" diye işaretlenir.

## 4. Geri dönüş

- **Kod:** bir önceki küçük sürüme dönmek her zaman güvenlidir (eklemeli şema).
- **Veri:** geri alma migration'ı yoktur. Veriyi geri almak = Litestream ile yükseltme öncesi ana dönmek (aradaki siparişler kaybolur; yalnızca felaket durumunda).
- Büyük sürümde daraltma adımı çalıştıktan sonra eski büyük sürüme dönülemez; sürüm notu bunu açıkça yazar.

## 5. Cloudflare

Sıra: `wrangler d1 migrations apply` → Worker deploy. Eski Worker, migration ile deploy arasında yeni şemayla çalışır (eklemeli olduğu için sorun olmaz). Kademeli yayılım (gradual deployment) kullanılabilir; sorun çıkarsa önceki Worker sürümüne dönülür.

## 6. Built-in app'ler ve uygulamalar

- Built-in app `compatibility` aralığı çekirdeği karşılamıyorsa açılış durur; `upgrade --check` hangi built-in app'in güncellenmesi gerektiğini söyler.
- Built-in app migration'ları çekirdek migration'larından sonra, kendi numara dizisiyle çalışır.
- Uygulamalar API sözleşmesine bağlıdır; sözleşme eklemeli olduğundan küçük sürümlerde etkilenmezler. Büyük sürümde kaldırılan uçlar, kaldırılmadan önce yanıt başlığında `Deprecation` ile işaretlenir ve hangi uygulamanın hâlâ çağırdığı admin'de listelenir.

## 7. Mobil

Sahadaki eski uygulama sürümleri eski sözleşmeyle konuşur. API, desteklenen en düşük uygulama sürümünü bildirir; altındaki sürüm güncelleme ekranı görür. Bir ucun kaldırılması, onu kullanan son uygulama sürümünün desteği bittikten sonra olur.

## 8. Test

CI'da "yükseltme testi": bir önceki sürümün şeması ve tohum verisiyle veritabanı kurulur, yeni sürüm üzerine başlatılır, migration ve duman testleri çalışır. Ayrıca yeni şema üzerinde **eski** kodun duman testi (geri dönüş güvenliği).
