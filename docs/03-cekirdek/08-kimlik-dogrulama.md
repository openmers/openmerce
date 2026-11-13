# Kimlik doğrulama

Kütüphane: Better Auth (Drizzle adaptörü, SQLite/D1). *Better Auth'un aşağıda adı geçen eklentilerinin (2FA, passkey, organization, bearer) güncel adları ve D1 uyumu bu oturumda belgeden doğrulanmadı; kod yazarken teyit edilir.*

## 1. İki ayrı kimlik alanı

Müşteriler ve yöneticiler **ayrı kullanıcı tablolarında, ayrı oturumlarla** yaşar. Aynı e-posta iki tarafta da bulunabilir ve birbirini etkilemez.

| | Müşteri | Yönetici |
|---|---|---|
| Tablolar | `users`, `sessions`, `accounts` | `admin_users`, `admin_sessions` |
| Çerez | `om_s` (site alan adına özel) | `om_a` (admin alan adına özel) |
| Kullandığı API | Shop API | Admin API |
| Kayıt | Açık (kanal ayarı) | Yalnızca davet |
| 2FA | İsteğe bağlı | **Zorunlu kılınabilir** (varsayılan: SuperAdmin için zorunlu) |
| Oturum süresi | Uzun, kayan | Kısa, hareketsizlikte sonlanır |

Neden ayrı: yönetici oturumu çalınması mağazanın tamamıdır; müşteri tarafındaki bir açık (XSS, oturum sabitleme) admin'e sıçramamalı. Admin ayrı alt alan adında sunulur (`admin.…`), çerezi vitrinle paylaşılmaz.

## 2. Müşteri girişi

- **Yöntemler:** e-posta + parola, e-posta ile tek kullanımlık kod (parolasız), sosyal giriş (Google, Apple; kanal başına açılır). Telefon + SMS kodu isteğe bağlı eklentidir (ör. Türkiye'de yaygın) (SMS portu üzerinden).
- **Parola:** Workers'ta çalışan bir özet algoritması gerekir (Web Crypto veya saf JS/WASM). *Better Auth'un varsayılanının Workers CPU sınırına uyup uymadığı ölçülmelidir.*
- **E-posta doğrulama** kanal ayarıdır; doğrulanmamış hesap sipariş verebilir ama hesap sayfasına giremez (misafir siparişle aynı güven düzeyi).
- **Parola sıfırlama:** tek kullanımlık, kısa ömürlü token; yalnızca özeti saklanır; e-posta outbox'tan gider. Yanıt, hesabın var olup olmadığını belli etmez.
- **Misafir → hesap:** müşteri e-posta başına tek kayıttır; kayıt aynı `customers` satırına `user_id` bağlar (yeni satır açılmaz), bağlama e-posta doğrulandıktan **sonra** yapılır. Ayrıntı: [../05-ticaret/11-musteriler.md](../05-ticaret/11-musteriler.md).
- **Oturum:** veritabanında satır + önbellekte kopya ([05-onbellek.md](05-onbellek.md)). Oturum şunları taşır: müşteri kimliği, grup kimlikleri, etkin şirket ve rol, fiyat listesi kümesi, `version`. Vitrin isteğinde oturum doğrulaması veritabanına gitmez.
- **Geçersiz kılma:** parola değişimi, çıkış, "tüm cihazlardan çık", grup/şirket/fiyat listesi değişimi kullanıcının `session_version` sayacını artırır; önbellekteki eski oturumlar reddedilir.

## 3. B2B

- Şirket üyeliği müşteri hesabının üstündedir ([../06-b2c-b2b/02-sirket-hesaplari.md](../06-b2c-b2b/02-sirket-hesaplari.md)); ayrı bir kullanıcı türü değildir.
- **Etkin şirket değişimi** yeni oturum açmaz; oturumdaki `company` alanını ve segmenti yeniden yazar, `version` artar.
- **Davet:** şirket yöneticisi e-posta ile davet eder; tek kullanımlık, 7 gün geçerli token. Hesabı olmayan davetli kayıtla birlikte üye olur.
- **Kurumsal SSO** (SAML/OIDC) şirket başına isteğe bağlı eklentidir; v1 dışı.

## 4. Yönetici girişi

- İlk hesap kurulum sihirbazında açılır ([../08-isletme/07-kurulum-ve-tohum-veri.md](../08-isletme/07-kurulum-ve-tohum-veri.md)); sonrakiler davetle.
- 2FA: TOTP ve passkey. Kurtarma kodları bir kez gösterilir, özetleri saklanır.
- Hassas işlemler (API anahtarı üretme, uygulama kurma, ödeme anahtarı değiştirme, rol atama) **yeniden doğrulama** ister (son 10 dakikada parola/2FA).
- Self-host'ta isteğe bağlı: admin'i Cloudflare Access veya ters vekil kimlik doğrulamasının arkasına alma; doğrulama başarısızsa kapalı kalır.
- **Rol/izin değişimi yansıması:** `admin_users.session_version` vardır (müşteri tarafındaki sayaçla aynı mantık). Bir yöneticinin rolü, rolün izinleri, kanal ataması veya `access_policies` kaydı değişince etkilenen tüm yöneticilerin sayacı aynı `atomic()` içinde artar; sonraki istekte önbellekteki oturum reddedilir ve izinler yeniden okunur (en geç bir sonraki istek, işlemdeki istek tamamlanır). İzin düşürmede açık admin sekmesi 401 alıp yeniden doğrulamaya yönlendirilir; izin eklemede sayfa yenilenmeden yeni menü görünmez (menü oturum açılışında hesaplanır). Yönetici silme/askıya alma tüm oturumlarını anında sonlandırır.
- Her giriş, başarısız deneme ve yeniden doğrulama denetim kaydına düşer.

## 5. Mobil

- Çerez yerine bearer token; `expo-secure-store`'da saklanır. Aynı oturum tablosu, aynı geçersiz kılma.
- Sosyal giriş sistem tarayıcısında (PKCE) yapılır, uygulama içi WebView'da değil.
- **Checkout WebView'ına geçiş:** uygulama API'den tek kullanımlık, 60 saniye ömürlü bir geçiş kodu alır; WebView bu kodla açılır ve kod o alan adında çereze çevrilir. Bearer token URL'ye konmaz.

## 6. Makine kimlikleri

Uygulama token'ı, API anahtarı ve yayınlanabilir kanal anahtarı [02-api-ve-istek-baglami.md](02-api-ve-istek-baglami.md) bölüm 4'tedir. Ortak kurallar: yalnızca özeti saklanır, önek türü belli eder (`omk_`, `oma_`, `omp_`), son kullanım zamanı tutulur, admin'den iptal anında geçerlidir.

## 7. Korumalar

- Giriş, kayıt, kod gönderme ve parola sıfırlama için ayrı hız sınırları (IP + hesap); eşik aşılınca Turnstile.
- Durum değiştiren isteklerde `Origin` kontrolü; çerezler `HttpOnly`, `Secure`, `SameSite=Lax`.
- Hesap numaralandırmaya karşı: giriş ve sıfırlama yanıtları ve süreleri hesap var/yok için aynıdır.
- Parola ihlal listesi kontrolü isteğe bağlıdır (dış çağrı; yalnızca kayıt ve parola değişiminde).

## 8. Performans

- Anonim istek: kimlik doğrulama maliyeti sıfır (çerez yoksa hiçbir şey yapılmaz).
- Girişli istek: bir önbellek okuması.
- Parola özeti yalnızca giriş ve kayıt anında hesaplanır; bu uçlar önbelleksiz ve hız sınırlıdır.

## 9. Test

Oturum sabitleme, sürüm artınca eski oturumun reddi, müşteri çerezinin Admin API'de işe yaramaması, başka şirketin verisine erişememe, geçiş kodunun ikinci kullanımda reddi, sıfırlama token'ının tek kullanımlık olması.
