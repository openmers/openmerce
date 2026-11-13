# Yapılandırma: iki katman


| Katman | Nerede | Örnek | Değişiklik |
|---|---|---|---|
| Çalışma zamanı | `settings` tablosu, admin paneli | mağaza adı, ödeme yöntemleri, e-posta, arama | Deploy gerekmez |
| Derleme zamanı | `store.config.ts` (varsayılanların üstüne birleşir) | para birimi, görsel boyutları, sipariş numarası biçimi | Deploy gerekir |

Varsayılanlar `config.ts` içinde durur ve doğrudan düzenlenmez; mağaza yalnızca değiştirdiği anahtarları yazar. Etkin değer her zaman tek bir yardımcı üzerinden okunur.

## `store.config.ts`

Vendure'un `vendure-config.ts` dosyasının karşılığıdır; derleme zamanı katmanının tamamı buradadır.

```ts
export default defineStore({
  builtInApps: [stripe(), resend(), loyaltyApp()],
  strategies: {
    orderNumber: sequentialPerYear(),
    stockLocation: nearestLocation(),
    linePrice: contractPrice(),
  },
  customFields: {
    product: { warrantyMonths: z.number().int().optional() },
    company: { dealerCode: z.string().optional() },
  },
  images: { widths: [320, 640, 1000] },
});
```

Kod gerektiren her şey (built-in app, strateji, özel alan) buradadır ve deploy ister. Kod gerektirmeyen her şey (kanal, vergi oranı, kargo yöntemi, promosyon, ödeme yöntemi ayarı) admin panelindedir ve deploy istemez.

## Ayar deposu

`settings(scope, scope_id, key, value)`; kapsamlar: `global`, `channel`, `user`, `built-in app`. Okuma `getSetting(ctx, key)` ile yapılır: kanal değeri yoksa genele, o da yoksa koddaki varsayılana düşer. Değerler bellekte durur ([05-onbellek.md](05-onbellek.md)). Sırlar burada değil kasadadır.
