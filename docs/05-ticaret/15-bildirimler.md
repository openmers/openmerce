# Bildirimler

Bildirim = bir olayın, bir alıcıya, bir kanaldan iletilen şablonlu hâli. Teslimat her zaman outbox'tandır ([../03-cekirdek/04-olaylar-isler-outbox.md](../03-cekirdek/04-olaylar-isler-outbox.md)); bu belge onun üstündeki katmanı tanımlar.

## 1. Model

| Tablo | İçerik |
|---|---|
| `notification_types` | Kodda tanımlı: kod, tetikleyen olay, alıcı çözücü, veri şeması, desteklenen kanallar |
| `notification_templates` | `(tür, kanal, satış kanalı, dil)` → konu + gövde; boşsa yerleşik varsayılan |
| `notification_settings` | Satış kanalı başına hangi tür, hangi kanaldan açık |
| `notification_log` | Gönderilen her bildirim: alıcı (maskeli), tür, kanal, durum, sağlayıcı kimliği, outbox satırı |

Kanallar: e-posta, SMS, mobil push, admin içi bildirim, webhook (mağaza sahibinin Slack'i gibi). Her biri bir porttur (`EmailProvider`, `SmsProvider`, `PushProvider`).

## 2. Türler

| Alıcı | Örnekler |
|---|---|
| Müşteri | sipariş alındı, ödeme bekleniyor (havale), kargoya verildi, teslim edildi, iade onaylandı, para iadesi yapıldı, parola sıfırlama, e-posta doğrulama, terk edilmiş sepet |
| B2B | şirket başvurusu alındı/onaylandı, davet, onay bekleyen sipariş, onay sonucu, teklif geldi, vade yaklaşıyor/geçti |
| Mağaza sahibi | yeni sipariş, stok istisnası, belirsiz iade, `dead` outbox satırı, yedek gecikmesi, uygulama teslimat hatası, düşük stok |

Built-in app'ler kendi türünü ekleyebilir. Uygulamalar bildirim göndermek için kendi altyapısını kullanır; mağazanın sağlayıcısı üzerinden göndermek isterlerse `notifications:send` izniyle tanımlı bir türü tetiklerler.

## 3. Şablonlar

- Dil: sınırlı bir şablon dili (değişken, koşul, döngü, biçimlendirme yardımcıları); keyfi kod çalıştırmaz. Şablon motoru Workers'ta çalışmalıdır.
- E-posta: ortak düzen (logo, renkler `packages/tokens`'tan, alt bilgi) + tür başına içerik. HTML ve düz metin birlikte üretilir.
- Mağaza sahibi admin'den konu ve gövdeyi düzenler; **önizleme** ve **test gönderimi** örnek veriyle çalışır.
- Varsayılan şablonlar çekirdekle gelir ve sürümle güncellenir; düzenlenmiş şablona dokunulmaz, admin "varsayılan değişti" notu görür.
- SMS şablonu karakter sayacı ve Türkçe karakter uyarısıyla (uzunluk maliyeti).
- Veri şablona **gönderim anında değil, olay anında** çözülmüş anlık görüntüden gelir (sipariş zaten anlık görüntü taşır); geç giden e-posta, o anki doğru bilgiyi gösterir.

## 4. Dil ve kanal seçimi

Dil: siparişin/müşterinin dili → satış kanalının varsayılanı. Kanal: tür için açık olanlar; müşteri tercihleri pazarlama türlerinde geçerlidir.

## 5. İşlemsel ve pazarlama ayrımı

- **İşlemsel** (sipariş, kargo, parola): izin gerektirmez, her zaman gider.
- **Pazarlama** (terk edilmiş sepet, kampanya): yalnızca geçerli açık rıza varsa ([11-musteriler.md](11-musteriler.md) `consents`). Türkiye'de ticari elektronik ileti için İYS kaydı gerekir; İYS sorgulama/kayıt bir built-in app kancasıdır. *İYS API ayrıntıları doğrulanmadı.*
- Her pazarlama iletisinde tek tıkla çıkış bağlantısı; çıkış anında `consents`'e yazılır.
- Toplu kampanya gönderimi çekirdekte yoktur; e-posta pazarlama araçları uygulama olarak bağlanır.

## 6. Teslimat

- Olay → abone → alıcı ve kanal başına bir outbox satırı (`kind = notify`). Sağlayıcı idempotency anahtarı = satır kimliği.
- Yeniden deneme, `dead` ve admin'den tekrar outbox kurallarıdır.
- Geri dönüş (bounce) ve şikâyet webhook'ları sağlayıcı built-in app'inden gelir; kalıcı geri dönen adres işaretlenir ve o adrese pazarlama iletisi kesilir.
- Sağlayıcı yapılandırılmamışsa bildirimler "gönderilmedi (sağlayıcı yok)" olarak loglanır, hata sayılmaz; kurulum sihirbazı bunu uyarır.

## 7. Alan adı ve gönderen

Satış kanalı başına gönderen adı ve adresi. SPF/DKIM/DMARC kurulumu sağlayıcı tarafındadır; admin, sağlayıcının doğrulama durumunu gösterir.

## 8. Test

Tür başına şablonun örnek veriyle hatasız render'ı (tüm diller); izin yokken pazarlama iletisinin gitmemesi; aynı olayın iki teslimatında tek ileti; kişisel verinin `notification_log`'da maskeli olması.
