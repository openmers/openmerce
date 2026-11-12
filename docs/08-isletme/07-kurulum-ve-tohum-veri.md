# Kurulum sihirbazı ve tohum veri

## 1. İlk açılış

Veritabanı boşsa uygulama **kurulum kipinde** açılır: yalnızca `/setup` ve sağlık uçları yanıt verir; vitrin "yakında" sayfası döner, admin API kapalıdır.

Kurulum sayfasına erişim bir **kurulum anahtarı** ister: süreç ilk açılışta rastgele bir anahtar üretir ve yalnızca loglara (self-host) veya `wrangler` çıktısına/secret'a (Cloudflare) yazar. Böylece yeni açılmış bir sunucuyu ilk bulan kişi sahiplenemez.

## 2. Sihirbaz adımları

| Adım | İçerik | Zorunlu |
|---|---|---|
| 1. Yönetici | E-posta, parola, 2FA kurulumu → `SuperAdmin` | Evet |
| 2. Mağaza | Ad, ülke, para birimi, dil, saat dilimi, alan adı → varsayılan kanal | Evet |
| 3. Vergi | Ülkeye göre hazır oran seti (Türkiye: KDV %1/%10/%20), fiyatlar vergi dahil mi | Evet |
| 4. Depo | İlk stok konumu | Evet (varsayılan oluşturulur) |
| 5. Ödeme | Sağlayıcı seç, anahtarları gir, bağlantıyı sına | Atlanabilir |
| 6. Kargo | Bölge + sabit ücret veya firma built-in app'i | Atlanabilir |
| 7. E-posta | Sağlayıcı anahtarı, test gönderimi | Atlanabilir |
| 8. Yedek (self-host) | Litestream hedefi ve durum | Atlanabilir, uyarıyla |
| 9. Örnek veri | İsteğe bağlı demo katalog | Atlanabilir |

1-4 tek `atomic()` ile yazılır ve kurulum kipi **kalıcı olarak** kapanır (`settings.setup_completed_at`); kurulum anahtarı geçersizleşir. `/setup` bundan sonra 404 döner.

Atlanan adımlar admin panosunda "kurulumu tamamla" listesi olarak durur. Ödeme yapılandırılmadan vitrin açılabilir ama checkout "şu an sipariş alınamıyor" der; **sahte ödeme ile sipariş alınmaz.**

## 3. Tohum veri

| Küme | Ne zaman | İçerik |
|---|---|---|
| Sistem | Her kurulumda, migration ile | Roller ve izinler, ülke/il listesi, para birimleri, bildirim türleri, varsayılan şablonlar |
| Bölgesel | Sihirbazda ülkeye göre | Vergi bölgeleri ve oranları, adres biçimi, yasal sayfa taslakları |
| Demo | İsteğe bağlı | ~30 ürün, koleksiyonlar, görseller, bir menü, ana sayfa bölümleri, örnek B2B şirketi ve fiyat listesi |
| Test | Yalnızca CI ve geliştirme | Belirlenimci, büyük (10.000 / 100.000 ürün) yük testi kümeleri |

- Demo veri `demo` işaretiyle yazılır ve tek tıkla kaldırılabilir; gerçek siparişle karışmaz.
- Tohum betikleri normal `core` fonksiyonlarını çağırır (ham SQL değil); böylece okuma modeli ve olaylar doğru oluşur.
- Yasal sayfa taslakları yer tutucudur ve açıkça "hukuki metin değildir, kendi metninizle değiştirin" notu taşır.

## 4. Komut satırı

```
openmers setup            # sihirbazın etkileşimsiz karşılığı (ortam değişkenleri / dosyadan)
openmers seed demo|test   # tohum veri
openmers admin create     # kurtarma: yeni SuperAdmin (yalnızca sunucuya erişimi olan)
openmers doctor           # yapılandırma, bağlantılar, yedek, migration durumu
```

`admin create` self-host'ta kilitlenme durumunun kurtarma yoludur; Cloudflare'de aynı iş `wrangler` ile çalışan bir betiktir. İkisi de denetim kaydına düşer.

## 5. Geliştirici kurulumu

`pnpm i && pnpm dev`: yerel SQLite dosyası, migration, test tohumu, sahte e-posta (konsola yazar) ve **yalnızca geliştirme kipinde** çalışan sahte ödeme sağlayıcısı. Sahte sağlayıcı üretim derlemesine dahil edilmez.

## 6. Test

Kurulum anahtarı olmadan `/setup` reddi; kurulum sonrası `/setup` 404; sihirbazın iki kez gönderilmesinde tek yönetici; demo verinin kaldırılmasıyla ilgili tüm kayıtların ve görsellerin gitmesi; etkileşimsiz kurulumla sihirbazın aynı sonucu üretmesi.
