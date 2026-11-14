# Self-host: VPS üzerinde Node.js


Hedef: boş bir VPS'e Node.js (veya Docker) ile kurulur, başka servis gerektirmez. Cloudflare hedefiyle aynı kod tabanıdır; fark yalnızca `Platform` adaptörleridir ([platform arayüzü](../03-cekirdek/01-platform-arayuzu.md)).

Dosyalar repoda `deploy/` altındadır: `docker/` (Dockerfile, `entrypoint.sh`, `litestream.yml`, `docker-compose.yml`), `Caddyfile`, `systemd/openmers.service`. Bunlar iskelettir; derlenip denenmedi.

## 1. Çalışma biçimi

- **Tek süreç:** Hono API, Astro storefront (Astro Node adaptörü) ve admin (Vite/React statik çıktısı, Hono statik dosya sunumuyla `/admin`) aynı Node sürecinden sunulur. Kuyruk tüketicisi ve zamanlayıcı da aynı süreçtedir.
- **Bileşenler:** SQLite dosyası (WAL kipinde), yükleme klasörü veya S3 uyumlu depo, bellek içi önbellek. Redis, PostgreSQL, ayrı worker yoktur.
- **Önde reverse proxy** (Caddy veya nginx) HTTPS ve statik önbellek için; kurulum belgesinde hazır Caddyfile verilir.
- **Açılışta:** migration'lar otomatik uygulanır, ardından süreç trafiğe açılır. Migration başarısızsa süreç başlamaz.
- **Kopya sayısı:** bir. Bellek içi önbellek ve sayaçlar kopyalar arası paylaşılmaz; çok sunuculu kurulum bu sürümün kapsamı dışındadır (Redis adaptörü sonradan).

## 2. Yedekleme: Litestream zorunludur

Self-host kurulumunda **Litestream varsayılan olarak açıktır ve kurulumun ayrılmaz parçasıdır.** Veritabanı tek bir dosya olduğu için diskin kaybı siparişlerin kaybı demektir; Litestream bunu saniyeler seviyesinde veri kaybına indirir.

- **Ne yapar:** SQLite'ın WAL değişikliklerini sürekli olarak S3 uyumlu bir depoya (R2, Backblaze B2, MinIO, AWS S3) kopyalar. Ayrı süreç olarak çalışır; uygulama koduna dokunmaz.
- **Gereksinim:** veritabanı WAL kipinde olmalıdır. Uygulama açılışta `PRAGMA journal_mode = WAL` ayarlar ve değilse başlamayı reddeder. Checkpoint işini Litestream üstlendiği için uygulama kendi checkpoint'ini zorlamaz ve uzun süre açık kalan okuma transaction'ı tutmaz.
- **Çalıştırma:** Docker imajı Litestream'i içerir ve uygulamayı onun gözetiminde başlatır (`litestream replicate -exec "node dist/server.js"`); uygulama çökerse yedekleme de durur, böylece sessiz yedeksiz çalışma olmaz. Docker'sız kurulumda aynı iş için systemd birimi örneği belgede yer alır.
- **Geri yükleme:** açılış betiği, yerel veritabanı dosyası yoksa ve yedek yapılandırılmışsa önce `litestream restore` çalıştırır. Yeni bir VPS'e taşınmak = aynı yapılandırma + boş disk + başlat.
- **Yapılandırma:** `litestream.yml` örneği repoda gelir; hedef depo adresi ve anahtarlar ortam değişkenlerinden okunur. Yapılandırma yoksa süreç açılışta uyarı verir ve admin panelinin üstünde kalıcı bir "Yedekleme yapılandırılmadı" uyarısı gösterilir. Bilinçli kapatma için `OPENMERS_BACKUP=off` gerekir.
- **Yedek durumu admin'de:** son başarılı kopyalama zamanı ve gecikme gösterilir; gecikme eşiği aşılırsa mağaza sahibine bildirim gider.
- **Saklama süresi:** varsayılan 7 gün geri alınabilir (belirli bir ana dönme), `litestream.yml` içinde ayarlanır.

## 3. Litestream'in kapsamadığı şeyler

Litestream yalnızca SQLite dosyasını yedekler. Ayrıca:

- **Yüklenen dosyalar:** yerel disk depolamasında görseller ve dosyalar yedeklenmez. İki seçenek: depolamayı doğrudan S3 uyumlu depoya (R2, B2, MinIO) vermek (önerilen) veya yükleme klasörü için `restic` / `rclone` ile ayrı yedek. Belgeler önerilen yolu ilk sırada gösterir.
- **Sırlar:** sır kasası anahtarı (`SECRETS_KEK`) veritabanında değil ortam değişkenindedir ve yedeğe girmez. Kaybedilirse kasadaki ağ geçidi anahtarları çözülemez; kurulum belgesi bunu parola yöneticisine kaydetmeyi ister.
- **Geri yükleme testi:** yedek, geri yüklenene kadar yedek sayılmaz. Repoda, yedekten sıfır bir dizine geri yükleyip sipariş sayısını karşılaştıran bir betik (`pnpm backup:verify`) bulunur; kurulum rehberi bunu periyodik çalıştırmayı önerir.

## 4. Cloudflare ile fark

Cloudflare hedefinde Litestream yoktur: D1 kendi zaman noktası geri yüklemesini (Time Travel) sağlar. Bu yüzden yedekleme adımı yalnızca self-host Docker imajı ve kurulum rehberinde yer alır; çekirdek kod iki hedefte aynıdır.
