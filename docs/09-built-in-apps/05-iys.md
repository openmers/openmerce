# İYS (İleti Yönetim Sistemi) senkronu: built-in app

**Biçim kararı:** built-in app (`@openmers/builtin-iys`), **v1'de**. Neden çekirdek değil: Türkiye'ye özgü, her mağazaya gerekmez. Neden tak-çalıştır app değil: `consents` yazımıyla aynı `atomic()` ve outbox'a bağlanır, müşteri oturumunu ve izin durumunu anında okur ([../04-genisletme/06-medusa-eklentileri-karar-tablosu.md](../04-genisletme/06-medusa-eklentileri-karar-tablosu.md) ölçütleri). Çekirdek yalnızca `consent.changed` olayını ve `ConsentRegistry` portunu sağlar ([../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md) bölüm 17).

> **Doğrulama durumu.** Resmî İYS geliştirici belgesi bu oturumda **bulunamadı/okunmadı**. Aşağıdaki alan adları ve uç davranışı, üç entegratörün (iletiMerkezi, Netmera, Mysoft) belgelerinden dolaylı toplandı: `iysCode` + `brandCode`, alıcı türü `BIREYSEL`/`TACIR`, izin türü `MESAJ`/`ARAMA`/`EPOSTA`, durum `ONAY`/`RET`, toplu kayıt (iletiMerkezi tek istekte en çok 5000 alıcı), tek alıcı sorgusu, token ile kimlik doğrulama (örnekte ~24 saat ömürlü). Uç yolları, alan adları ve sınırlar **resmî belgeden doğrulanmadan kodlanmaz**; ilk iş marka başvurusu yapıp sandbox/belge erişimi almaktır.

## 1. Port

```ts
interface ConsentRegistry {
  push(batch: ConsentRecord[]): Promise<PushResult[]>;      // OpenMers → İYS
  query(recipient, channel): Promise<RegistryState>;         // tek alıcı sorgusu
  pull(since?: Date): AsyncIterable<RegistryChange>;         // İYS → OpenMers (ret, değişiklik)
}
```
Port adı ve imzası bizim tasarımımızdır; İYS dışında (başka ülkenin kaydı) aynı port uygulanabilir.

## 2. Veri

| Tablo | İçerik |
|---|---|
| `bia_iys_settings` | `iys_code`, `brand_code`, kimlik bilgileri (sırlar kasada, [../03-cekirdek/06-guvenlik-ve-yetki.md](../03-cekirdek/06-guvenlik-ve-yetki.md)), `recipient_default` (`BIREYSEL`), kanal eşlemesi |
| `bia_iys_sync` | `consent_id` (çekirdek `consents` satırı), `direction` (`push · pull`), `state` (`pending · sent · confirmed · failed · conflict`), `attempts`, `last_error`, `external_ref?` |
| `bia_iys_cursor` | son çekme zamanı / sayfa imleci |

Eşleme: `channel` (`sms→MESAJ`, `call→ARAMA`, `email→EPOSTA`; `push` İYS kapsamında değildir), `status` (`granted→ONAY`, `withdrawn→RET`), alıcı = telefon (E.164) veya e-posta.

## 3. Akış

- **OpenMers → İYS (itme):** `consent.changed` olayı → `bia_iys_sync` satırı `pending` (aynı `atomic()`) → iş, toplu istekle gönderir (`idempotencyKey` = `consents.id`) → `sent`/`confirmed`. Başarısızlıkta artan beklemeyle yeniden dener; kalıcı hata `failed` ve alarm. İYS'ye yazılamayan bir **onay** pazarlamaya hazır sayılmaz (güvenli taraf: İYS onayı doğrulanana kadar `customer_consent_state` değişmez, ama `pending_registry` işareti ile gösterilir); bir **ret** ise yerel olarak hemen geçerlidir (iletişim durur), İYS'ye yazımı arkadan yürür.
- **İYS → OpenMers (çekme):** zamanlanmış iş (varsayılan 15 dk) İYS'deki değişiklikleri çeker; müşteri izni İYS'de geri çektiyse `consents`'e `withdrawn` (kaynak `iys`) eklenir. Çakışma (iki taraf farklı): **İYS'deki ret her zaman kazanır**; onay çakışmasında zaman damgası yeni olan geçerlidir ve çekirdek yine İYS'e doğrulatır. `conflict` admin'de listelenir.
- **Gönderimden önce sorgu:** pazarlama bildirimi gönderilmeden önce, yerel durumun yaşı eşiği (varsayılan 24 saat) aşıyorsa `query` ile tazelenir; İYS'ye ulaşılamıyorsa pazarlama gönderilmez (işlemsel bildirim etkilenmez).
- **İlk içe aktarma:** mevcut izinli müşteri listesi yönetici onayı ve kaynak/kanıt alanlarıyla toplu `push` edilir; kanıtı olmayan kayıt gönderilmez (ayar).
- **İşlemsel/ticari ayrımı:** sipariş ve kargo bildirimi ticari ileti değildir, İYS gerektirmez; bu ayrım [../05-ticaret/15-bildirimler.md](../05-ticaret/15-bildirimler.md) türleriyle yapılır.

## 4. Kurallar

- Kimlik bilgileri günlüğe ve izlere yazılmaz; alıcı telefon/e-posta günlükte maskelenir.
- Hız sınırı ve toplu boyut ayardır (entegratör sınırları farklı olduğundan resmî değer doğrulanana kadar küçük başlanır).
- `TACIR` alıcı (esnaf-tüccar) için izinsiz iletim hukuki istisna sayılabilir; bu karar mağazanın hukuk danışmanına aittir, varsayılan **BIREYSEL** ve izin zorunludur.
- Silme/anonimleştirme isteğinde İYS'deki kayıt ayrıca silinmez, `RET` olarak işlenir ([../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md) bölüm 15).

## 5. Admin

Ayar sayfası (kodlar, bağlantı testi), eşitleme panosu (bekleyen/başarısız/çakışma), müşteri sayfasında kanal başına "İYS durumu", yeniden dene, dışa aktarım.

## 6. Test

Aynı `consent.changed` iki kez işlenince tek istek; İYS'deki ret yerelde `withdrawn` olur; İYS erişilemezken pazarlama gitmez ama sipariş e-postası gider; ret anında yerel iletişim durur; çakışma çözümü; toplu sınır aşımında bölme; anonimleştirmede `RET`; sahte sağlayıcıyla uçtan uca.

## 7. Sıralama

1. Port + `bia_iys_sync` + sahte sağlayıcı ile uçtan uca test (çekirdek tarafı).
2. **Resmî İYS belgesine erişim ve marka başvurusu;** gerçek uç adları teyit.
3. Gerçek itme + çekme + admin panosu.
4. İlk içe aktarma.

## 8. Doğrulanmamış

Resmî uçlar, kimlik doğrulama biçimi, toplu sınır, kanıt/kaynak alanları, çekme (değişiklik akışı) ucunun varlığı, TACIR kuralı, ret/silme davranışı, entegratör zorunluluğu (bazı markalar yalnızca onaylı entegratör üzerinden bağlanıyor olabilir).
