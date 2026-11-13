// HTTP önbelleğini etikete göre temizleme: Cloudflare Cache purge API, self-host reverse proxy ya da no-op.
export type Purge = (tags: readonly string[]) => Promise<void>
