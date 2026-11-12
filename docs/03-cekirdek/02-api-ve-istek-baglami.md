# API ve istek bağlamı

## 1. İki API

Vendure'daki gibi iki ayrı yüzey vardır; aynı `core` fonksiyonlarını çağırırlar.

| | Shop API | Admin API |
|---|---|---|
| Kullanan | Vitrin, mobil, B2B portalı | Admin paneli, uygulamalar, betikler |
| Kimlik | Anonim, müşteri oturumu veya yayınlanabilir kanal anahtarı | Yönetici oturumu, uygulama token'ı veya API anahtarı |
| Okuma kaynağı | Okuma modeli (`catalog_index`, `product_view`) | Normalize tablolar |
| Önbellek | İzin listesindeki uçlar paylaşımlı, segment anahtarlı | Her zaman `no-store` |
| Kimlikler | Yalnızca `public_id` | Yalnızca `public_id` |

- **oRPC:** sözleşme `packages/contract` içinde bir kez yazılır; web ve mobil aynı tipli istemciyi kullanır. Üçüncü taraflar için OpenAPI çıktısı üretilir; uygulamalar aynı Admin API'yi kullanır, ayrı bir "uygulama API'si" yoktur.
- **Katalog okuma uçları GET'tir** ve sabit, sıralı sorgu parametreleri taşır; kenar önbelleğine girebilmeleri için.
- **GraphQL yok.** Her uç elle yazılmış bir-iki sorgudur; alan çözücü, DataLoader ve N+1 riski yoktur. İstemci ihtiyacı kadar alan için uçlar `fields` yerine amaca özel DTO döner (liste kartı, ürün sayfası, sepet).

## 2. Ctx (istek bağlamı)

Vendure'un `RequestContext`'inin karşılığı. Her `core` fonksiyonunun ilk parametresidir; istek başına bir kez kurulur.

```ts
interface Ctx {
  platform: Platform;
  api: 'shop' | 'admin';
  channel: Channel;            // bellekten
  lang: string;
  currency: string;
  customer?: { id; groupIds: number[] };
  company?: { id; role: 'admin' | 'buyer' | 'approver' };   // B2B
  priceListIds: number[];      // öncelik sırasıyla; oturumda saklanır
  segment: string;             // önbellek anahtarı: kanal+dil+para birimi+fiyat listeleri
  actor: { type: 'anonymous' | 'customer' | 'admin' | 'app' | 'apiKey'; id?; permissions: Set<string> };
  now: number;
  requestId: string;
}
```

Kurulum sırası ve maliyeti:

1. **Kanal:** ana bilgisayar adı veya `x-openmers-channel` başlığındaki anahtar → bellekteki kanal tablosu. Sorgu yok.
2. **Oturum:** çerez / bearer → önbellek (KV / LRU). Iska olursa bir sorgu.
3. **Segment:** oturumdaki müşteri grubu ve şirketten türetilmiş fiyat listesi kümesi. Girişte bir kez hesaplanır, oturumda durur; fiyat listesi ataması değişince oturumun sürüm sayacı geçersiz kılar.

Anonim B2C isteğinde Ctx kurulumu **sıfır veritabanı turudur.**

## 3. Handler kuralları

- Girdi Zod ile doğrulanır; yetki `ctx.actor.permissions` üzerinden kontrol edilir; sonra tek bir `core` fonksiyonu çağrılır.
- **Beklenen hatalar değer olarak döner** (Vendure `ErrorResult` gibi): `{ ok: false, code: 'INSUFFICIENT_STOCK', ... }`. İstisna yalnızca beklenmeyen durum içindir. İstemci, tipli hata koduna göre dallanır.
- Listeler imleçlidir: `{ items, nextCursor }`. Toplam sayı yalnızca `withTotal` istenirse.
- Yazma uçları `Idempotency-Key` başlığını kabul eder; anahtar + aktör için sonuç 24 saat saklanır ve tekrar gelen istek aynı yanıtı alır. Uygulamalar ve ERP için zorunlu, vitrin için isteğe bağlı.
- Toplu uçlar (`products.upsertMany`, `stock.setMany`, `prices.setMany`) sabit üst sınırla (ör. 500 kayıt) çalışır ve kayıt başına sonuç döner.

## 4. Kimlik türleri

| Tür | Nerede | Not |
|---|---|---|
| Müşteri oturumu | Vitrin, mobil | Better Auth; çerez veya bearer |
| Yönetici oturumu | Admin | Roller kanal başına atanır |
| Yayınlanabilir kanal anahtarı | Vitrin/mobil istemcisi | Gizli değildir; yalnızca kanalı seçer ve Shop API'ye izin verir |
| Uygulama token'ı | Uygulamalar | Kurulumda üretilir, onaylanan izinleri taşır |
| API anahtarı | Betikler, entegrasyonlar | Admin'den üretilir, izin ve kanal kapsamı seçilir, yalnızca özeti saklanır |

İzin modeli: [06-guvenlik-ve-yetki.md](06-guvenlik-ve-yetki.md).

## 5. Sürümleme

Sözleşme eklemelidir: yeni alan ve yeni uç eklenir, mevcut alan kaldırılmaz veya anlam değiştirmez. Kırıcı değişiklik yeni uç adıyla gelir; eskisi en az bir büyük sürüm boyunca çalışır. Mobil uygulamanın eski sürümleri sahada kaldığı için bu zorunludur.

## 6. oRPC kurulumu (iki işleyici, tek sözleşme)

Kaynak: projedeki oRPC skill'leri (`.claude/skills/backend/orpc*`). oRPC v2 hâlâ hareketli; kod yazarken skill'in dediği gibi `orpc.dev` belgesi esas alınır.

| İşleyici | Önek | Ne için | Yöntem |
|---|---|---|---|
| `OpenAPIHandler` | `/api` | Önbelleklenebilir katalog okumaları, üçüncü taraflar, uygulamalar, OpenAPI belgesi | Rota başına `GET` / `POST` … |
| `RPCHandler` | `/rpc` | Kendi istemcilerimizin (admin, storefront adaları, mobil) yazma ve kişiye özel çağrıları | Yalnızca `POST` |

- **Neden iki tane:** `RPCHandler` varsayılan olarak GET'i reddeder (çerezli oturumda CSRF riski) ve biz bunu açmıyoruz. Kenar önbelleği ise GET ister. Bu yüzden önbelleğe girecek her uç sözleşmede `openapi({ method: 'GET', path })` ile tanımlanır ve `/api` altından sunulur. Önbellek izin listesi ([05-onbellek.md](05-onbellek.md)) yalnızca bu GET rotalarından oluşur.
- **Sözleşme önce:** `packages/contract` içinde `oc` ile tanımlanır, `apps/api` içinde `implement(contract)` ile uygulanır; istemciler yalnızca sözleşmeye bağlıdır. Her prosedür `.output` tanımlar (yoksa istemci `unknown` görür).
- **İstemciler:** web ve mobil `RPCLink` (yazma) + katalog için `OpenAPILink` (GET). Uygulama geliştiricilerine yayınlanan `@openmers/app-sdk`, küçültülmüş sözleşme JSON'u + `OpenAPILink` fabrikasıdır.
- **Sorgu parametreleri:** GET uçlarında girdi düz ve sıralı tutulur (iç içe nesne yok); sayı ve boolean için Smart Coercion eklentisi yalnızca `/api` işleyicisinde açıktır.
- **Hatalar:** beklenen hatalar sözleşmede `.errors({...})` ile tanımlanır; istemci `safe()` ile tipli hata alır. HTTP durum eşlemesi işleyicideki `errorStatusMap` ile yapılır. `message` ve `data` istemciye gider; içine sır veya iç kimlik konmaz.
- **Ara katman bir kez çalışır:** v2'de otomatik tekilleştirme yoktur; router ve prosedür düzeyinde eklenen ara katman iki kez çalışır. Kural: `Ctx` kuran ara katman **yalnızca kökte** eklenir ve sonucu bağlamda bir bayrakla saklar (`ctxLoaded`); prosedürler yalnızca izin ara katmanı ekler.
- **Storefront SSR aynı süreçteyken** HTTP'ye çıkmaz; `createRouterClient(router, { context })` ile doğrudan çağırır.
- **Hono'nun rolü:** yönlendirme kabuğu. Güvenlik başlıkları, kanal çözümleme, hız sınırı ve webhook rotaları Hono ara katmanıdır; `/api/*` ve `/rpc/*` oRPC işleyicilerine devredilir. Hono'nun kendi RPC istemcisi (`hc`) kullanılmaz.

## 7. Sürüm kararları

| Paket | Karar | Gerekçe |
|---|---|---|
| oRPC | **v2** (şu an `beta` etiketi), tam sürüm sabitlenir | v1 → v2 tel biçimi uyumsuz; sahada eski mobil sürümler varken geçiş pahalı olur, o yüzden v2 ile başlanır |
| Drizzle | **0.45.x** (`latest`), v1 kararlı çıkınca geçilir | Sorgu kurucu iki sürümde aynı; ilişkisel API'yi (`db.query`) zaten kullanmıyoruz (sorgular elle yazılır). v1'in yeni migration klasör düzeninin `wrangler d1 migrations apply` ile uyumu doğrulanmadı |
| Zod | v4 | oRPC ve Drizzle doğrulayıcıları Standard Schema üzerinden çalışır |

Bu kararlar önerimdir ve kod başlamadan önce paketlerin güncel durumuna bakılarak teyit edilmelidir; sürümleri bu oturumda npm'den kontrol etmedim.
