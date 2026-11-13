/**
 * Copies the `Set-Cookie` headers produced by Better Auth onto the oRPC response. There is a single
 * instance built with `Secure` off; on HTTPS requests the flag is added here (`08-kimlik-dogrulama` §7: `HttpOnly`,
 * `Secure`, `SameSite=Lax`).
 */
export function forwardSetCookies(from: Headers, to: Headers | undefined, https: boolean): void {
  if (!to) return
  for (const cookie of from.getSetCookie()) {
    to.append("set-cookie", https && !/;\s*secure/i.test(cookie) ? `${cookie}; Secure` : cookie)
  }
}
