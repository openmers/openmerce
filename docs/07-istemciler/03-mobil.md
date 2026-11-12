# Mobil uygulama (Expo)

React Native + Expo, Expo Router, NativeWind + React Native Reusables, FlashList, nanostores. Ayrıntılı seçimler: [../01-tech-stack/01-tech-stack.md](../01-tech-stack/01-tech-stack.md).

## 1. Paylaşılanlar

| Paylaşılır | Paylaşılmaz |
|---|---|
| `packages/contract` (tipli oRPC istemcisi, Zod şemaları) | Ekranlar (web Svelte, mobil React) |
| Sepet ve oturum store'ları (nanostores) | Gezinme |
| `packages/tokens` (tema) | Bileşen kütüphanesi |
| Biçimlendirme yardımcıları (para, tarih) | |

API değişince tip hatası mobilde de derleme anında çıkar.

## 2. Kurallar

- Mobil yalnızca **Shop API** kullanır ve kanalını yayınlanabilir anahtarla seçer. Mobil için ayrı kanal açılabilir (uygulamaya özel fiyat veya kampanya).
- **Tüm listeler FlashList;** imleçli sayfalama API'nin döndürdüğü `nextCursor` ile.
- **Görseller** `expo-image`; API hazır genişlik merdivenini verir, uygulama ekran yoğunluğuna uyanı seçer.
- **Checkout** storefront'un ödeme sayfasıdır, WebView içinde; 3D Secure ve sağlayıcı sayfaları orada çalışır. Sepet uygulamada, ödeme web'de; oturum kısa ömürlü tek kullanımlık bağlantıyla aktarılır.
- **Token** `expo-secure-store`'da; sepet anahtarı AsyncStorage'da.
- **B2B:** aynı uygulama; giriş yapan şirket üyesi için etkin şirket seçimi, hızlı sipariş, onay bekleyenler ve teklifler ek sekmelerdir. Ayrı uygulama yoktur.
- **Bildirim:** `expo-notifications`; cihaz token'ı müşteri kaydına bağlanır, gönderim outbox'tan (`notify` türü, push kanalı).
- **Müşteri olayları** (Pixel için) aynı şemayla API'ye gönderilir; mobilde sandbox'lı betik yoktur.

## 3. Sürüm uyumu

Eski uygulama sürümleri sahada kalır; API sözleşmesi eklemelidir ([../03-cekirdek/02-api-ve-istek-baglami.md](../03-cekirdek/02-api-ve-istek-baglami.md) bölüm 5). Uygulama açılışta en düşük desteklenen sürümü sorar; altındaysa güncelleme ekranı gösterir. JS-only değişiklikler EAS Update ile gider.

## 4. Performans

- Katalog istekleri web ile aynı GET uçlarıdır ve aynı kenar önbelleğinden yararlanır.
- Açılışta tek istek: kanal yapılandırması + ana sayfa bölümleri (önbellekli).
- Sepet rozeti yerel store'dan; sepetin tamamı yalnızca sepet ekranında yüklenir.

## 5. Test ve dağıtım

Maestro E2E (iOS simülatör + Android emülatör); EAS Build + Submit.
