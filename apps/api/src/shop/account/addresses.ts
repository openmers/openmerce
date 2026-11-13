import {
  addAddress,
  deleteAddress,
  listAccountAddresses,
  setDefaultAddress,
  updateAddress,
} from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { base } from "../../orpc/base"
import { requireCustomer, rethrowCustomer } from "./requireCustomer"

const list = base.shop.account.addresses.list.handler(async ({ context }) => {
  const customer = requireCustomer(context)
  const book = await listAccountAddresses(context.platform, customer.id)
  if (!book) throw new ORPCError("UNAUTHENTICATED")
  return {
    version: book.version,
    items: book.items.map(({ publicId, ...a }) => ({ id: publicId, ...a })),
  }
})

const create = base.shop.account.addresses.create.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  const r = await addAddress(context.ctx, { customerId: customer.id, ...input }).catch(
    rethrowCustomer,
  )
  return { id: r.publicId, version: r.version }
})

const update = base.shop.account.addresses.update.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  const r = await updateAddress(context.ctx, {
    customerId: customer.id,
    publicId: input.id,
    version: input.version,
    address: input.address,
  }).catch(rethrowCustomer)
  return { version: r.version }
})

const remove = base.shop.account.addresses.delete.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  return deleteAddress(context.ctx, {
    customerId: customer.id,
    publicId: input.id,
    version: input.version,
  }).catch(rethrowCustomer)
})

const setDefault = base.shop.account.addresses.setDefault.handler(async ({ input, context }) => {
  const customer = requireCustomer(context)
  return setDefaultAddress(context.ctx, {
    customerId: customer.id,
    publicId: input.id,
    version: input.version,
    kind: input.kind,
  }).catch(rethrowCustomer)
})

export const addressesRouter = { list, create, update, delete: remove, setDefault }
