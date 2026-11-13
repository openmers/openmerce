import { defineMeta, oc } from "@orpc/contract"

/**
 * Admin prosedürünün erişim bildirimi (`06-guvenlik-ve-yetki`: her handler gereken izni bildirir).
 * - `<varlık>:<eylem>`: oturum + bu izin.
 * - `"session"`: yalnız geçerli yönetici oturumu (ör. `admin.me`).
 * - `"public"`: oturumsuz (kurulum, giriş, çıkış); kurulum kapısı yine uygulanır.
 */
export type AdminAccess = `${string}:${string}` | "session" | "public"

const [adminAccessMeta, readAdminAccess] = defineMeta(
  "adminAccess",
  (incoming: AdminAccess) => incoming,
)

/**
 * Admin sözleşmesi yalnız bununla başlar; meta'sız Admin prosedürü sunucuda kapalı kalır
 * (`requirePermission` 403) ve `admin-access.test.ts` sözleşmede meta'sız uç bulursa kırılır.
 */
export function adminProcedure(access: AdminAccess) {
  return oc.meta(adminAccessMeta(access))
}

/** Prosedürün erişim bildirimi; yoksa `undefined` (kapalı say). */
export const getAdminAccess = readAdminAccess
