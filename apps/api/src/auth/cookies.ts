/**
 * Better Auth'un ürettiği `Set-Cookie` başlıklarını oRPC yanıtına taşır. Örnek tek ve `Secure`
 * kapalı kurulur; HTTPS isteğinde bayrak burada eklenir (`08-kimlik-dogrulama` §7: `HttpOnly`,
 * `Secure`, `SameSite=Lax`).
 */
export function forwardSetCookies(from: Headers, to: Headers | undefined, https: boolean): void {
  if (!to) return
  for (const cookie of from.getSetCookie()) {
    to.append("set-cookie", https && !/;\s*secure/i.test(cookie) ? `${cookie}; Secure` : cookie)
  }
}
