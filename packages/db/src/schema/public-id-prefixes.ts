// `public_id` önek haritası: TEK kaynak. Sahibi belgelerdir (`03-cekirdek/03-veri-kurallari.md` §1
// ve `docs/veritabani/01|02|03`); kod ve testler buradan okur, kopya tutmaz.
// Harita `packages/db`'de durur: `core` zaten `db`'ye bağımlıdır, ters yön (db → core) döngü olurdu.
// `core/features/ids/prefixes.ts` bu dosyayı yeniden dışa açar.
//
// Değerler kalıcıdır: bir varlığın öneki değişmez, yeni varlık yeni satır ekler (03-veri-kurallari §1).

/** Tablo adı → önek. `03-veri-kurallari` §1 listesi + katalog 01/02/03 satırları. */
export const PUBLIC_ID_PREFIXES = {
  // 03-veri-kurallari §1 (kalıcı liste)
  products: "prod_",
  product_variants: "var_",
  collections: "col_",
  orders: "ord_",
  order_lines: "itm_",
  refunds: "ref_",
  customers: "cus_",
  companies: "com_",
  quotes: "quo_",
  channels: "chn_",
  price_lists: "pl_",
  // katalog 02 (`02-ticaret.md`)
  stock_locations: "loc_",
  carts: "cart_",
  checkout_reservations: "rsv_",
  payments: "pay_",
  promotions: "prm_",
  zones: "zon_",
  tax_rates: "txr_",
  shipping_methods: "shm_",
  fulfillments: "ful_",
  returns: "ret_",
  digital_entitlements: "ent_",
  addresses: "adr_",
  customer_notes: "cnt_",
  customer_groups: "cgr_",
  customer_exports: "cex_",
  media: "med_",
  pages: "pag_",
  posts: "pst_",
  redirects: "rdr_",
  documents: "doc_",
  // katalog 01 (`01-cekirdek-isletme.md` "public_id önekleri")
  admin_users: "adm_",
  roles: "rol_",
  access_policies: "acp_",
  api_keys: "apk_",
  channel_publishable_keys: "cpk_",
  app_installations: "app_",
  outbox: "evt_",
  audit_log: "aud_",
  tenants: "tnt_",
  // katalog 03 (`03-b2b-istemci-genisletme.md` "Kimlik" satırı)
  company_members: "cmb_",
  company_addresses: "cad_",
  approval_policies: "apl_",
  approval_requests: "apr_",
  approval_delegations: "apd_",
  quote_attachments: "qat_",
  themes: "thm_",
  theme_builds: "thb_",
  agent_sessions: "ags_",
  invoices: "inv_",
  customer_payment_methods: "cpm_",
  reviews: "rev_",
  subscription_plans: "spl_",
  subscriptions: "sub_",
  subscription_cycles: "cyc_",
  dunning_attempts: "dun_",
  deliveries: "sdl_",
  retention_offers: "rto_",
} as const

export type PublicIdPrefix = (typeof PUBLIC_ID_PREFIXES)[keyof typeof PUBLIC_ID_PREFIXES]

/** Önek → tablo (ters arama; sınırda "hangi varlık" sorusu için). */
export const PUBLIC_ID_TABLES: Readonly<Record<PublicIdPrefix, string>> = Object.fromEntries(
  Object.entries(PUBLIC_ID_PREFIXES).map(([table, prefix]) => [prefix, table]),
) as Readonly<Record<PublicIdPrefix, string>>

/** Token önekleri `public_id` değildir, ayrı ad alanı (katalog 01, 08-kimlik §6). */
export const TOKEN_PREFIXES = ["omk_", "oma_", "omp_", "otk_"] as const

export type TokenPrefix = (typeof TOKEN_PREFIXES)[number]

export function isPublicIdPrefix(value: string): value is PublicIdPrefix {
  return Object.hasOwn(PUBLIC_ID_TABLES, value)
}

export function isTokenPrefix(value: string): value is TokenPrefix {
  return (TOKEN_PREFIXES as readonly string[]).includes(value)
}
