# Vendure "Capabilities": ne, bizde karşılığı, gerek var mı

Kaynak: Vendure sitesindeki **Capabilities** menüsü ve `docs.vendure.io/current/guides/capabilities/*` altındaki 33 sayfa (2026-11-12'de okundu, web-fetch ile).

## 1. Bu menü tam olarak ne

Açık kaynak çekirdeğin parçası değil, **Vendure Platform'un ücretli planlarında satılan özellik kataloğudur.** Her sayfada hangi plandan itibaren dahil olduğu yazar: **Starter** (€199/ay), **Growth** (€599/ay), **Scale** (€2.499/ay), **Enterprise** (€60.000/yıldan başlayan sözleşme). Planlar kümülatiftir. Sayfalar pazarlama düzeyindedir: ne yaptığını anlatır; varlık adı, API, yapılandırma vermez. "Technical reference" bağlantılarının hepsi "Vendure Platform lisansı gerekir" der, okunamadı. Hiçbir sayfa açık kaynak olduğunu söylemez.

Bunun bizim için anlamı: **tasarım kaynağı değil, kontrol listesidir.** Bu sayfalardan veri modeli veya davranış kopyalanamaz (ve gerekmez); biz hangi B2B/ticaret özelliklerinin pazarda sattığını görüp kendi tasarımımızla karşılaştırırız. OpenMers bu özelliklerin tamamını açık kaynak ve plan duvarı olmadan sunar. Bu nedenle "Starter/Growth/Scale/Enterprise" ayrımı bizde geçerli değil.

## 2. Karşılaştırma ve kararlar

Biçim: [../04-genisletme/02-built-in-apps.md](../04-genisletme/02-built-in-apps.md) bölüm 3.1 sırası. "Var" = bizim belgelerde tasarlı.

### 2.1 Zaten var (değişiklik gerekmiyor)

| Vendure (plan) | Bizde | Not |
|---|---|---|
| Company accounts (Starter) | [../06-b2c-b2b/02-sirket-hesaplari.md](../06-b2c-b2b/02-sirket-hesaplari.md) | Çekirdek |
| Organization hierarchy (Growth) | Aynı belge, bölüm 4 | Çekirdek |
| Quick order (Starter) | [../06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md](../06-b2c-b2b/03-b2b-katalog-fiyat-siparis.md) bölüm 4 (SKU + CSV, `cart.addMany`) | Çekirdek |
| Reorder (Starter) | Aynı belge, bölüm 4 | Çekirdek |
| Quote requests (Starter) | [../06-b2c-b2b/04-teklif-ve-onay.md](../06-b2c-b2b/04-teklif-ve-onay.md) bölüm 2 | Çekirdek |
| Order approvals (Scale) | Aynı belge, bölüm 1 | Çekirdek |
| Contract pricing (Scale) | [../05-ticaret/03-fiyat.md](../05-ticaret/03-fiyat.md) (fiyat listeleri, şirket/grup kapsamı) | Çekirdek |
| Packaging units (Growth) | Koli/palet ayrı varyant, paket katı ve en az adet varyant alanı (03-b2b bölüm 2) | Stok tek havuzdan düşer, v1: bölüm 2.3 |
| Catalog search + Database engine (Starter) | [../05-ticaret/02-katalog-ve-arama.md](../05-ticaret/02-katalog-ve-arama.md): FTS5 varsayılan | Çekirdek |
| Typesense engine (Growth) | Meilisearch built-in app'i (aynı port) | Motor farkı, ürün aynı |
| Audit log (Scale) | [../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md) | Çekirdek |
| B2B storefront (Scale) | Ayrı ürün yok: B2C ve B2B aynı çekirdek ve aynı tema ([../06-b2c-b2b/01-b2c-ve-b2b-ayni-cekirdek.md](../06-b2c-b2b/01-b2c-ve-b2b-ayni-cekirdek.md)) | Vendure da "bir kod tabanı, forklanmaz" diyor |
| OIDC SSO (Scale) | Kimlik doğrulama belgesinde "kurumsal SSO (SAML/OIDC) şirket başına, v1 dışı" | Karar bölüm 2.4 |
| Content history (Scale) | [../05-ticaret/13-icerik-ve-gezinme.md](../05-ticaret/13-icerik-ve-gezinme.md): "sürüm geçmişi v1'de yok, denetim kaydı önce/sonra özetini tutar" | Karar bölüm 2.4 |

### 2.2 Eksik ve gerekli: yazılacak

| Özellik | Biçim | Neden / kapsam |
|---|---|---|
| **Vergi no doğrulama** (Tax ID validation, Starter) | **Çekirdek** biçim doğrulama + sağlayıcı sorgusu | Türkiye'de VKN (10 hane, sağlama basamağı) ve TCKN (11 hane, algoritma) biçim kontrolü çekirdekte, kayıt ve adres girişinde. Mükellef/e-fatura sorgusu zaten `InvoiceProvider.taxpayerLookup` ([../09-built-in-apps/01-e-fatura.md](../09-built-in-apps/01-e-fatura.md)). AB satışları için VIES sorgusu istenirse ayrı küçük built-in app ⚠️ (VIES kullanım şartları doğrulanmadı). Durum: `valid · invalid · pending`, yönetici görür |
| **Alışveriş listeleri** (personal + managed lists, Starter/Growth) | **Built-in app** (mevcut favori listesi app'inin genişlemesi) | [../09-built-in-apps/03-favori-listesi.md](../09-built-in-apps/03-favori-listesi.md) tek listeyle başladı. Genişleme: birden çok adlı kişisel liste ("aylık sipariş") + **şirket listeleri** (satıcı ekibi yönetir, şirketin tüm alıcıları görür, tek değişiklik herkese yansır) + "hepsini sepete ekle" (güncel fiyat ve stokla). Tablo `list_id` zaten anahtarda; v1.1 |
| **Ortak sepet** (Shared carts, Scale) | **Çekirdek** (sepet) | Aynı şirketin üyeleri bir sepete satır ekler, bir kişi gönderir, onay akışı bitmiş sepete uygulanır. Sepet `company_cart` kipi + katkıda bulunan üyeler listesi; eşzamanlı düzenleme için satır düzeyinde `version`. v1.1 |
| **Mağaza kredisi + hediye kartı** (Store credit Starter, Gift cards Growth) | **Built-in app** `store-credit`, varsayılan kapalı | Tek **defter** (ledger): bakiye hareketleri salt ekleme; hediye kartı defterin üstünde (kod, kampanya toplu üretimi, e-posta ile teslim, kısmi kullanım, son kullanma). Ödeme yöntemi olarak `credit` işleyicisi: bakiye siparişten düşer, kalan başka yöntemle. İade kredisi (iadeyi para yerine krediye) aynı defter. ⚠️ Hediye çeki/kredinin KDV ve muhasebe zamanı (satışta mı kullanımda mı) doğrulanmadı |
| **Ürün tipleri** (Product types, Scale) | **Çekirdek** (katalog) | Ürün tipi = özel alan kümesi + zorunlu alanlar + hangilerinin facet olacağı. "Vida: diş ölçüsü", "kablo: uzunluk". Tip olmadan kaydetme engellenir, tipli alanlar `catalog_index` facet'lerine girer. Mevcut özel alanlar ([../04-genisletme/04-ozel-alanlar-ve-metadata.md](../04-genisletme/04-ozel-alanlar-ve-metadata.md)) üzerine kurulur, yeni sütun açmaz. v1.1 |
| **Global arama** (admin, Growth) | **Çekirdek admin** | Ctrl+K: ürün, sipariş, müşteri, ayarlar. Her kaynak için FTS5 tablosu zaten var (`customer_search`, ürün ve sipariş için eklenir); sonuçlar izinle süzülür. v1 |
| **Arama analitiği** (Search analytics, Scale) | **Çekirdek** raporlama, hafif | Ham arama günlüğü saklanmaz: günlük `(terim, sonuç_sayısı_kovası)` sayaçları (en çok aranan, sıfır sonuç, tıklama oranı) D1'de toplu. Sıfır sonuçlu terimler Meilisearch eş anlamlı/boost önerisine beslenir. Kişisel veri yok (terim oturumla ilişkilendirilmez). v1.1 |

### 2.3 Var ama eksik yanı olan

| Konu | Eksik | Karar |
|---|---|---|
| Packaging units | Vendure her seviyede ayrı stok tutar; bizde koli ayrı varyant | Ayrı varyant kalır, stok tek havuzdan düşer (`base_variant_id` + `unit_factor`). **v1.** [../05-ticaret/04-stok.md](../05-ticaret/04-stok.md) bölüm 8 |
| Quote negotiation (Enterprise) | Karşı teklif turları, sürüm geçmişi, iç not, büyük indirimde satıcı onayı | Sürümlü teklif, karşı teklif, iç not, iç indirim onayı, ek dosya. **v1.** [../06-b2c-b2b/04-teklif-ve-onay.md](../06-b2c-b2b/04-teklif-ve-onay.md) bölüm 2 |
| Advanced approvals (Enterprise) | Çok kademeli, zaman aşımı/yükseltme, devir, özel koşul, dış sistem adımı | Hepsi **v1**: politika + zincir, devir, zaman aşımı, harici adım. [../06-b2c-b2b/04-teklif-ve-onay.md](../06-b2c-b2b/04-teklif-ve-onay.md) bölüm 1 |
| Admin access policies (Enterprise) | Kayıt düzeyi kapsam (marka, bölge, kanal, alan) | **v1**, çekirdek: derlenmiş koşul tüm liste/arama/dışa aktarmaya sorgu katmanında eklenir. [../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md) |
| Audit governance (Enterprise) | Saklama süresi, zamanlanmış dışa aktarma, kurcalama kanıtı, hassas kaydı kimin gördüğü | **v1**: `retention_days` + arşiv, zamanlanmış dışa aktarma, hash zinciri + imzalı günlük çapa + `audit verify`. [../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md) |
| Content history | Sürüm geçmişi yok | Sayfalar ve fiyat listeleri için sürüm tablosu v1.1; ürün açıklaması için denetim özeti yetmeye devam eder |
| Advanced pricing (Enterprise) | ERP/CPQ'dan canlı fiyat | Canlı fiyat sorgusu **yapmayız** (okuma yolu yavaşlar, bkz. [03-performans.md](03-performans.md)). ERP app fiyat listelerini senkronlar; özel mantık `linePrice` stratejisiyle |

### 2.4 Gerek yok / sonra

| Özellik | Karar | Gerekçe |
|---|---|---|
| **PunchOut** (OCI/cXML, Enterprise) | Kapsam dışı; talep olursa tak-çalıştır app | SAP Ariba/Coupa entegrasyonu Türkiye pazarında nadir, adaptör (cXML) çekirdek gerektirmez: app, mağaza API'siyle sepet oluşturur |
| **Product configurator / CPQ** (Enterprise) | Kapsam dışı v1; ileride built-in app (`linePrice` stratejisi + sipariş satırına yapılandırma) | Kısıt/bağımlılık motoru ayrı bir ürün; satır `custom_fields` ile yapılandırmayı taşıyabilir |
| **Federated SSO** (Enterprise), OIDC SSO | Şirket başına SSO v1 dışı (mevcut karar); yönetici girişi için OIDC'yi Better Auth eklentisiyle v1.1'e almak kolay | Önce müşteri talebi |
| Typesense motoru | Alma | Aynı port; Meilisearch yeter. İstenirse yeni sürücü |

## 3. Sonuç: gerek var mı

- **Ana B2B yetenekleri (şirket, hiyerarşi, hızlı sipariş, yeniden sipariş, teklif, onay, sözleşme fiyatı, kredi) zaten tasarlı;** burada eksik bir sütun yok.
- **Yazılması gereken yeni:** vergi no doğrulama, alışveriş listeleri (genişlemiş), ortak sepet, mağaza kredisi + hediye kartı, ürün tipleri, global arama, arama analitiği; mevcutlara eklemeler (paket dönüşümü, teklif sürümleri ve karşı teklif, çok kademeli onay, denetim saklama/hash zinciri, kayıt düzeyi erişim politikası) **v1'de** ve kendi belgelerine yazıldı.
- **Alınmayan:** PunchOut, CPQ, federe SSO (talep olursa).
- Vendure'un plan duvarlarını kopyalamıyoruz: özellikler açık kaynak ve kanal bazlı açılır (built-in app) ya da çekirdeğe girer.

## 4. Doğrulanmayanlar

Sayfalar teknik ayrıntı vermediği için Vendure'un bu özellikleri **nasıl** yaptığı bilinmiyor; bu belgedeki tasarımlar bizimdir. Hediye kartı/kredinin Türkiye'deki KDV ve muhasebe işlemi, VIES kullanım şartları ve VKN/TCKN algoritmasının güncel mevzuatla uyumu doğrulanmadı. "Okuma yolu yavaşlar" gerekçesi kendi performans ilkemizdir, ölçüm değildir.
