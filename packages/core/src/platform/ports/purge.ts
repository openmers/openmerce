// Purging the HTTP cache by tag: Cloudflare Cache purge API, self-host reverse proxy or no-op.
export type Purge = (tags: readonly string[]) => Promise<void>
