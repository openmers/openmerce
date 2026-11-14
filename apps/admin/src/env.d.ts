interface ImportMetaEnv {
  /** Path (not origin) of the API's RPC handler; default `/rpc`. Same origin by design (cookies; proxied in dev). */
  readonly VITE_API_BASE?: string
  /** Channel code or public id sent as `x-openmers-channel`; empty means the API resolves by Host. */
  readonly VITE_OPENMERS_CHANNEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
