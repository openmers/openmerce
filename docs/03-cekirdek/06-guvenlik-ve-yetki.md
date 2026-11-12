# Güvenlik ve yetki


- **Admin kapalı başlar.** Hiçbir şey yapılandırılmamışsa admin engellidir. İlk kurulumda yalnızca kurulum sihirbazı açıktır; parola belirlenince kapı kilitlenir. Koruma hem `/admin` arayüzünü hem admin API prosedürlerini kapsar.
- **Sır kasası.** Sağlayıcı anahtarları (ödeme, e-posta, SMS, kargo) admin panelinden girilir, veritabanında AES-256-GCM ile şifreli durur. Anahtar şifreleme anahtarı (KEK) yalnızca platformun secret deposundadır; veritabanı sızıntısı tek başına yalnızca şifreli metin verir. Değerler arayüze geri gösterilmez. KEK yoksa kasa uykudadır ve mağaza demo modunda çalışır.
- **İstek sınırlama.** Giriş, checkout ve arama için ayrı bütçeler; anahtar = mağaza + rota + istemci. Webhook'lar hariç (imzalıdır, sağlayıcı yeniden dener). Sınırlayıcı çökerse istek geçer, hata loglanır.
- **Güvenlik başlıkları** her yanıta: CSP, HSTS, `X-Content-Type-Options: nosniff`, çerçeveleme koruması.
- **CSRF:** durum değiştiren isteklerde `Origin` kontrolü.
- **Bot koruması:** giriş ve checkout'ta Turnstile (isteğe bağlı).
- **İçerik sayfaları** `html: false` Markdown'dır; ham HTML kaçışlanır. Vitrin ve admin önizlemesi aynı sunucu tarafı `renderMarkdown()` fonksiyonunu kullanır.
- **Yalnızca Web Crypto.** `node:crypto` yok (Workers'ta çalışmaz).

## Roller ve izinler

Vendure modeli:

- **İzin** = `<varlık>:<eylem>` (`orders:read`, `orders:write`, `products:delete`, `settings:write`, `companies:approve`, `quotes:offer` …). Built-in app'ler kendi izinlerini tanımlar.
- **Rol** = izin kümesi. Roller **kanal başına** atanır: bir yönetici B2B kanalında sipariş yöneticisi, B2C kanalında yalnızca okuyucu olabilir.
- `SuperAdmin` her şeyi yapar ve silinemez; kurulum sihirbazı ilk hesabı bu rolle açar.
- Uygulama token'ları ve API anahtarları aynı izin sözlüğünü kullanır.
- Her handler gereken izni bildirir; bildirmeyen handler derlenmez (tip düzeyinde zorunlu).
- **Müşteri tarafı yetki** rol değil sahipliktir: müşteri yalnızca kendi kaydını, şirket üyesi yalnızca kendi şirketinin kaydını görür. Bu filtre `core` sorgusunun içindedir, handler'a bırakılmaz.

## Kayıt düzeyi erişim politikaları

Roller **ne yapılabileceğini**, politikalar **hangi kayıtlar üzerinde** yapılabileceğini belirler. Politika yoksa rolün kanal içindeki tüm kayıtlara erişimi vardır (mevcut davranış). Örnek: "Marmara bölge yöneticisi yalnızca teslimat ili Marmara olan siparişleri ve o siparişlerin müşterilerini görür", "marka yöneticisi yalnızca kendi koleksiyonundaki ürünleri düzenler", "satış temsilcisi yalnızca kendine atanmış şirketleri görür".

**`access_policies`**: `role_id` (veya `admin_id`), `resource` (`orders · customers · products · companies · quotes`), `condition` (JSON), `active`.

Koşul kapalı bir şemadır ve yalnızca **indeksli kapsam sütunlarına** bağlanabilir (kapsam alanı olmayan alan seçilemez; böylece her politika indeks kullanır):

| Kaynak | Kapsam alanları |
|---|---|
| orders | `channel_id`, `company_id`, `shipping_country`, `shipping_province`, `assigned_to` |
| customers | `channel`, `group_id`, `country` (varsayılan adres), `assigned_to` |
| products | `channel`, `collection_id`, `product_type`, indeksli işaretli özel alan (örn. `brand`) |
| companies | `channel_id`, `assigned_to`, `tag` |
| quotes | `channel_id`, `company_id`, `assigned_to` |

**Uygulama (tek yer):** politikalar oturum açılırken **tek SQL koşuluna derlenir** (akıllı gruplarla aynı derleme fikri, [../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md) bölüm 5.2) ve admin oturumunda saklanır; çekirdek sorgu oluşturucusu bu koşulu her liste, ayrıntı, arama ve dışa aktarma sorgusuna **eklemeden sorgu çalıştırmaz** (handler eklemeyi unutamaz, sorgu katmanı zorunlu kılar).

| Yüzey | Davranış |
|---|---|
| Liste, filtre, imleç | Koşul sorguya eklenir; toplam sayı da kapsamlıdır |
| Ayrıntı (kimlikle) | Kapsam dışı kayıt **404** döner (var olduğu sızdırılmaz) |
| Arama, global arama | FTS sonucu kimlikle kapsamlı tabloya birleştirilir |
| Yazma/silme | Kayıt kapsamdaysa ve rol izin veriyorsa; yeni kayıt kapsam dışı değere ayarlanamaz |
| Dışa aktarma işleri | İş, eylemi yapanın politika görüntüsüyle çalışır |
| Raporlar | Toplam tablolar yalnızca kanal bazlıdır; politikası olan yönetici, boyutu toplam tabloda olmayan raporu görmez (kısmi veriyi tam göstermek yanıltıcıdır) |
| Ajan araçları | Eylemi yapan yöneticinin politikasıyla çalışır; ajan ekstra kapsam kazanmaz |
| Uygulama token'ları | Politikaya tabi değil; uygulamanın kendi onaylı izinleri geçerli |

**Test (sözleşmeden üretilir):** her liste/arama/dışa aktarma ucu için, kısıtlı bir yönetici ve kapsam dışı kayıtlarla "sızıntı testi": sonuçta, sayıda, 404'te, dışa aktarılan dosyada, ajan çıktısında kapsam dışı kayıt yok. Politikasız rol eski sonucu verir.

## Denetim kaydı

Admin, uygulama ve API anahtarıyla yapılan her yazma `audit_log`'a düşer (aktör, eylem, varlık, önce/sonra özeti). "Müşteri adına sipariş" (B2B satış temsilcisi) hem temsilciyi hem müşteriyi kaydeder. Önce/sonra özetinde sır ve kişisel veri maskelenir; kayıt yazma değişiklikle **aynı `atomic()` içindedir** (değişiklik yazıldıysa kayıt vardır).

### Saklama

- **`audit.retention_days`** (kanal/mağaza ayarı, varsayılan 730; yasal asgari mağazanın kendi sorumluluğudur ⚠️). Süresi dolan satırlar önce arşivlenir, sonra silinir.
- **Arşiv:** aylık parçalar hâlinde gzip NDJSON, `private` kovaya (`audit/YYYY-MM.ndjson.gz`) yazılır, ayın zincir başı ve sonu ve çapa (aşağıda) dosyaya girer. Arşiv başarısızsa silme yapılmaz.
- **Zamanlanmış dışa aktarma:** isteğe bağlı olarak mağaza sahibinin S3 uyumlu kovasına veya webhook'una her gün yeni kayıtları gönderir (uyum arşivi). `audit:export` izni ve kendisi de denetlenir.
- **Okuma:** `audit:read` izni; arama (varlık, aktör, dönem, eylem), süzgeçler. Hassas kaydı açanlar ayrıca kaydedilir (müşteri belgesindeki `read_pii` açılışı).

### Kurcalama kanıtı (hash zinciri)

- Her satır `row_hash = SHA-256(prev_hash ‖ kanonik(satır))` ile zincire girer. D1'de etkileşimli işlem olmadığı ve eşzamanlı yazma sırası garanti olmadığı için zincir **yazma anında değil, bir mühürleme işiyle** kurulur: tek tüketicili iş mühürlenmemiş satırları `seq` sırasıyla okur, `prev_hash` ve `row_hash` yazar. Sıcak yol yavaşlamaz; mühür gecikmesi saniyeler mertebesindedir.
- **Günlük çapa:** her gün zincirin son özeti `audit_anchors(day, last_seq, last_hash, signature)` olarak yazılır; `signature` KEK'ten türetilen anahtarla HMAC'tir (veritabanına yazma yetkisi olan biri çapayı sahteleyemez). Çapa aynı zamanda arşiv dosyasına ve (ayarlıysa) harici uyum arşivine gider.
- **Doğrulama:** `openmers audit verify [--from --to]` zinciri ve çapaları yeniden hesaplar; kopukluk, değişmiş veya silinmiş satır raporlanır. Admin'de "bütünlük" durumu (son doğrulama, sonuç) görünür; doğrulama zamanlanır.
- **Sınır:** zincir **kanıt** üretir, engellemez. Anahtara ve veritabanına tam erişimi olan bir saldırgan zinciri baştan kurabilir; bu yüzden çapa harici arşive de gidebilir ⚠️ (R2/S3 nesne kilidi kullanımı doğrulanmadı).

**Test:** aynı anda çok yazma sonrası mühür sırası; bir satırı değiştirme/silme sonrası `verify` kopukluğu bulur; çapa imzası; arşivleme başarısızsa silme olmaması; saklama sınırında zincirin devamı (arşiv başı = önceki son özet); sır maskesi; yazma yoksa denetim satırı da yok (atomiklik).

## Kişisel veri

Çerez onayı, açık rıza kayıtları, veri dışa aktarma ve silme talebi çekirdektedir. Müşteri kişisel verisi içeren olaylar yalnızca ilgili okuma izni olan uygulamaya gider.
