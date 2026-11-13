# E-fatura / e-arşiv (Türkiye)

Türkiye'de satış yapan bir mağaza için fatura, sipariş zincirinin zorunlu adımıdır. Bu belge çekirdeğin fatura modelini ve entegratör bağlantısını tanımlar.

> **Sorumluluk reddi.** Aşağıdaki mevzuat özetleri (kimin e-fatura, kimin e-arşiv alacağı, kesim süreleri, iade faturası kuralları) genel bilgime dayanır, **bu oturumda resmî kaynaktan doğrulanmadı ve hukuki/mali danışmanlık değildir.** Kurallar ve eşikler değişir; uygulamadan önce mali müşavir ve entegratör belgesiyle teyit edilmelidir. Entegratör API'leri de (Paraşüt, Logo vb.) doğrulanmadı.

## 1. Biçim: built-in app + port

Fatura kesmek sipariş sürecinin içindedir ve her Türkiye kurulumunda gerekir; bu yüzden **süreç içi built-in app**dir (uygulama değil), `InvoiceProvider` portunu doldurur. Faturayı ERP kesiyorsa aynı portu ERP uygulaması doldurur ([02-erp.md](../10-tak-calistir-apps/02-erp.md) `invoices` yeteneği); çekirdek farkı bilmez. Aynı anda yalnızca bir sağlayıcı etkindir.

```ts
interface InvoiceProvider {
  id: string;
  capabilities: { eInvoice: boolean; eArchive: boolean; eDespatch?: boolean; cancel: boolean; taxpayerLookup: boolean };
  lookupTaxpayer?(ctx, taxId): Promise<{ registered: boolean; alias?: string }>;   // e-fatura mükellefi mi
  issue(ctx, doc: InvoiceDraft, idempotencyKey): Promise<{ externalId; number; kind; pdfUrl? }>;
  findByReference?(ctx, reference): Promise<{ externalId; number } | null>;        // belirsiz sonuç için
  cancel?(ctx, externalId, reason): Promise<Result>;
  fetchStatus?(ctx, externalId): Promise<InvoiceStatus>;
  fetchPdf?(ctx, externalId): Promise<ReadableStream>;
}
```

> **Etkinleştirme.** Her mağazaya gerekmez (Türkiye dışı, fatura kesmeyen). Ayrı paket (`@openmers/builtin-e-fatura`); listeye eklenmedikçe derlemeye girmez, SaaS'ta bayrakla açılır. Bkz. [../04-genisletme/02-built-in-apps.md](../04-genisletme/02-built-in-apps.md) bölüm 4.

## 2. Belge türü seçimi

| Alıcı | Belge |
|---|---|
| E-fatura mükellefi (şirket) | e-Fatura |
| Mükellef olmayan şirket veya bireysel müşteri | e-Arşiv fatura |

- Alıcının mükellef olup olmadığı vergi numarasıyla sorgulanır (`lookupTaxpayer`). Sonuç müşteri/şirket kaydında önbelleklenir ve fatura kesiminden hemen önce yenilenir (mükellefiyet değişebilir).
- Bireysel müşteride TC kimlik numarası yoksa, mevzuatın izin verdiği genel numara kullanılır; hangi durumda zorunlu olduğu eşiğe bağlıdır ve **ayar olarak** tutulur (koda gömülmez).
- Checkout, kurumsal fatura seçilince `tax_id` ister; vergi dairesi ve mükellefiyet gibi Türkiye'ye özgü alanları bu app kendi alanları olarak ekler ve doğrular. Çekirdek yalnız `tax_id` taşır. Türkiye'ye özgü biçim ve denetim hanesi doğrulaması da bu app'tedir; çekirdek yalnız genel doğrulama yapar.

## 3. Veri modeli

**`invoices`**: `public_id`, `order_id`, `due_at`, `kind` (`e_invoice · e_archive`), `type` (`sale · return`), `state`, `number`, `external_id`, `provider`, toplamlar, `issued_at`, `related_invoice_id?` (iade için), `snapshot` (JSON: alıcı, satırlar, vergi dökümü).

Durumlar: `pending → issuing → issued`, `failed`, `unknown` (zaman aşımı), `cancelled`; e-fatura için ayrıca alıcı yanıtı `accepted · rejected` (ticari senaryoda).

Fatura satırları siparişin anlık görüntüsünden üretilir; vergi tutarları sepetin kullandığı **aynı yuvarlama yardımcısıyla** hesaplanır ([../05-ticaret/09-vergi.md](../05-ticaret/09-vergi.md)), böylece siparişle fatura arasında kuruş farkı çıkmaz. Bu, sözleşme testidir.

## 4. Akış

Fatura bir outbox adımıdır ([../05-ticaret/07-siparis.md](../05-ticaret/07-siparis.md) bölüm 8).

- **Ne zaman:** ayar: sipariş kesinleşince / gönderim oluşunca / elle. **Varsayılan: sipariş kesinleşince** (Shopify gibi: satış, ödeme alındığı/sipariş onaylandığı anda kaydedilir; gönderim beklenmez). "Kesinleşme" = ödeme `settled`; kapıda ödeme ve havalede sipariş onayı. Sonuçları: fatura sipariş toplamı üzerinden kesilir; sonradan iptal/iade edilen veya gönderilemeyen kalemler için **iade faturası** (bölüm 5) kesilir; kısmi gönderim ayrı fatura doğurmaz. Gönderimde kesmek isteyen mağaza ayarı değiştirir (kısmi gönderimde gönderilen kalemler için). ⚠️ Shopify'ın davranışı genel bilgiye dayanır (Shopify kendisi Türkiye resmî faturası kesmez; satış kaydı sipariş anındadır), bu oturumda belgeden doğrulanmadı; mal teslimi ile fatura arasındaki yasal süre kuralı da doğrulanmadı.
- **ikas karşılaştırması (ikas'ın kendi sayfaları ve yardım merkezi okundu):** ikas **kendisi resmî fatura kesmez**; Paraşüt, Sovos, QNB eSolutions, EDM gibi entegratör uygulamaları üzerinden çalışır (ikas'ın e-fatura sayfası bunları listeler). Tetikleme anı: Sovos uygulama sayfası faturanın sipariş **alındığında** ya da **kargolandığında** otomatik oluşturulabildiğini söylüyor (seçimin nasıl yapıldığı yazmıyor); ikas'ın "PDF Invoices" uygulaması ödeme alınınca otomatik, ya da sipariş menüsünden elle "Create Invoice" ile PDF üretir (iki ikas sayfası "ödeme" ve "sipariş" konusunda tutarsız). Paraşüt/QNB/EDM'de tetikleme anı belirtilmemiş; ikas sipariş durumları Created → Ready for Shipment → Shipped → Delivered ve hangisinin faturayı tetiklediği yazılmamış. Sonuç: bizim ayar kümemiz (sipariş kesinleşince · gönderimde · elle) ikas'ın sunduğu seçeneklerle örtüşür; varsayılanımız "kesinleşince" olarak kalır. ikas'tan alınanlar: kanal başına fatura üretimini kapatma, ülkeye göre otomatik üretim, fatura/müşteri numarası için başlangıç + önek/sonek (resmî olmayan PDF belgesi için; resmî fatura numarası entegratörden gelir), faturayı müşteriye otomatik gönderme, mevcut faturayı yeniden üretme (yalnızca PDF; kesilmiş resmî fatura değişmez). ikas'ta fatura iptali/iade faturası bilgisi okunan sayfalarda yok; bizim iade faturası akışı (bölüm 5) kendi tasarımımızdır.
- **7 gün kuralı (kullanıcı bildirdi, 2026-11-12):** fatura, **satışın ve ödemenin gerçekleştiği tarihten itibaren 7 gün içinde** düzenlenmelidir. Başlangıç olayının (satış/ödeme mi, mal teslimi mi) mevzuattaki karşılığını bu oturumda metinden doğrulamadım; bu yüzden başlangıç ayardır: `invoice.deadline_basis` = `order_and_payment` (varsayılan: sipariş verilmesi ve ödemenin `settled` olmasından **geç olanı**) · `delivery`. `invoices.due_at` (başlangıç + 7 gün) siparişe yazılır. Sonuçları: (1) varsayılan "sipariş kesinleşince" bu kurala doğal uyar; (2) "gönderimde kes" ayarı riskli (stoksuz, ön sipariş, kişiselleştirilen ürün 7 günü aşabilir), bu yüzden `invoice.force_by_deadline` (varsayılan **açık**) gönderim olmasa da son günde faturayı keser; (3) 5. günde hâlâ kesilmemiş sipariş için uyarı, `due_at` geçmişse alarm ve admin'de "süresi geçmiş" listesi ([../08-isletme/04-gozlemlenebilirlik.md](../08-isletme/04-gozlemlenebilirlik.md) alarm tablosuna "fatura süresi geçen sipariş: herhangi" eklenir); (4) `unknown` durumundaki fatura sorgulanarak çözülene kadar süre dolmuş sayılmaz ama alarm düşer; (5) iade faturası bu kurala tabi değildir, iade belgesinin kendi kuralı (bölüm 5, doğrulanmadı) geçerlidir.
- **Değiştirilebilir:** `deadline_days=7`, `deadline_basis`, `force_by_deadline` ve uyarı günü (`warn_before_days=2`) örnek varsayılandır; aynı `legal_policy` ayarında ([../05-ticaret/10-kargo-ve-teslimat.md](../05-ticaret/10-kargo-ve-teslimat.md) bölüm 3) `invoice.*` anahtarları olarak durur. Kural değişirse admin'den ayarlanır, kod değişmez; `due_at` fatura/sipariş anındaki değerle hesaplanır.
- **Adımlar:** `invoices` satırı `pending` yazılır (tetikleyen olayla aynı `atomic()`) → iş sağlayıcıyı çağırır (`idempotencyKey` = fatura `public_id`) → `issued` + numara + PDF bağlantısı → müşteriye bildirim.
- **Belirsiz sonuç yeniden denenmez:** zaman aşımında `unknown`; önce `findByReference` ile sorgulanır. Körlemesine tekrar, çift fatura demektir ve iptali mali süreçtir.
- **Kalıcı hata** (geçersiz vergi no, eksik adres): `failed`, admin'e düşer; düzeltilip yeniden kuyruğa alınır.
- **Fatura numarası** entegratörden gelir; mağaza kendi sayacını üretmez (seri ve sıra entegratör/GİB tarafında yönetilir).

## 5. İade ve iptal

- Para iadesi ([../05-ticaret/06-odeme-ve-iade.md](../05-ticaret/06-odeme-ve-iade.md)) fatura tarafında ayrı bir belgedir. Türü alıcıya ve duruma göre değişir (iptal, iade faturası, alıcının iade faturası kesmesi, gider pusulası). Çekirdek yalnızca `type = return` kaydını ve ilişkiyi tutar; hangi belgenin üretileceğine sağlayıcı built-in app'i ve mağaza ayarı karar verir.
- Kısmi iade, iade edilen kalem ve tutarlarla kısmi belge üretir.
- İptal yalnızca sağlayıcı ve süre izin veriyorsa; değilse iade belgesi yoluna gidilir.

## 6. İrsaliye

Sevk irsaliyesi / e-İrsaliye `eDespatch` yeteneğiyle aynı built-in app'dedir ve gönderim (fulfillment) oluşunca tetiklenir. v1'de isteğe bağlıdır.

## 7. Admin ve müşteri

- Sipariş ayrıntısında fatura paneli: durum, numara, PDF, yeniden dene, iptal.
- "Fatura bekleyenler / hatalılar / belirsizler" listesi operasyon ekranlarındadır.
- Müşteri hesabında fatura PDF'i; e-arşiv faturası e-postayla iletilir (PDF ek değil, süreli bağlantı veya entegratörün bağlantısı).

## 8. Diğer ülkeler

Port ülkeden bağımsızdır: Türkiye dışında "fatura" basit bir PDF üreticisi built-in app'i olabilir (numara sayacı + şablon). Türkiye'ye özgü her şey built-in app'dedir; çekirdekte yalnızca `invoices` tablosu, port ve akış vardır.

## 9. Sıralama

1. Port + `invoices` + outbox adımı + admin paneli; sahte sağlayıcıyla uçtan uca test.
2. İlk gerçek entegratör (aday: Paraşüt; seçim, mağazaların en çok kullandığına göre).
3. İade belgeleri.
4. e-İrsaliye.

## 10. Test

Sipariş ile fatura toplamlarının kuruşu kuruşuna eşitliği (çok oranlı, indirimli, kargolu sepet); zaman aşımı sonrası tek fatura; mükellef/mükellef olmayan alıcıda doğru belge türü; kısmi gönderimde kısmi fatura; kısmi iadede doğru tutarlı iade belgesi.

## 11. Açık sorular

1. ~~İlk entegratör~~ **Paraşüt (karar: şimdilik bekletiliyor, port arkasında; API'si okunmadı).**
2. ~~Fatura zamanı~~ **Sipariş kesinleşince (Shopify gibi), ayarlanabilir.**
3. Bireysel müşteriden TC kimlik numarası hangi koşulda istenecek (eşik ayarı)?
4. Yurt dışı satışta (ihracat faturası, mikro ihracat) kapsam?
