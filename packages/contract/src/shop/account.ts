import { oc } from "@orpc/contract"
import { z } from "zod"

// Shop account endpoints (11-musteriler §9): RPC only (POST), every response `no-store`, the customer comes
// from the `om_s` session and core queries filter by it (another customer's record is 404).

export const customerPasswordSchema = z.string().min(8).max(128)
export const customerEmailSchema = z.email().max(254)

const okOutput = z.object({ ok: z.literal(true) })
const versionOutput = z.object({ version: z.number().int() })

const text = (max: number) => z.string().max(max).nullish()

/** Generic address shape; country rules are checked in core (`parseAddress`). */
export const shopAddressInput = z.object({
  label: text(50),
  firstName: text(100),
  lastName: text(100),
  company: text(200),
  addressLine1: z.string().min(1).max(200),
  addressLine2: text(200),
  city: z.string().min(1).max(100),
  region: text(100),
  district: text(100),
  postalCode: text(12),
  country: z.string().length(2),
  phone: text(16),
  taxId: text(50),
  taxIdType: text(30),
})

export const shopAddressOutput = z.object({
  id: z.string(),
  label: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  company: z.string().nullable(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  region: z.string().nullable(),
  district: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string(),
  phone: z.string().nullable(),
  taxId: z.string().nullable(),
  taxIdType: z.string().nullable(),
  isDefaultShipping: z.boolean(),
  isDefaultBilling: z.boolean(),
})

const version = z.number().int().min(0)

export const shopAccount = {
  auth: {
    /** Always `ok` (also for an existing email: no account enumeration); a verification email is queued. */
    signUp: oc
      .input(
        z.object({
          email: customerEmailSchema,
          password: customerPasswordSchema,
          name: z.string().trim().max(100).optional(),
        }),
      )
      .output(okOutput),
    /** Token from the verification email; binds the customer record. */
    verifyEmail: oc.input(z.object({ token: z.string().min(1).max(2048) })).output(okOutput),
    /** Cookie `om_s`; wrong password, unknown and unverified accounts get the same 401. */
    signIn: oc
      .input(z.object({ email: customerEmailSchema, password: customerPasswordSchema }))
      .output(okOutput),
    signOut: oc.output(okOutput),
  },
  me: oc.output(
    z.object({
      customer: z.object({
        id: z.string(),
        email: z.string(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        version: z.number().int(),
      }),
    }),
  ),
  addresses: {
    list: oc.output(z.object({ version: z.number().int(), items: z.array(shopAddressOutput) })),
    create: oc
      .input(
        z.object({
          version,
          address: shopAddressInput,
          defaultShipping: z.boolean().optional(),
          defaultBilling: z.boolean().optional(),
        }),
      )
      .output(z.object({ id: z.string(), version: z.number().int() })),
    update: oc
      .input(z.object({ id: z.string(), version, address: shopAddressInput }))
      .output(versionOutput),
    delete: oc.input(z.object({ id: z.string(), version })).output(versionOutput),
    setDefault: oc
      .input(z.object({ id: z.string(), version, kind: z.enum(["shipping", "billing"]) }))
      .output(versionOutput),
  },
}
