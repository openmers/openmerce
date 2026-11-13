export {
  type AccountAddress,
  type AccountProfile,
  getAccountProfile,
  listAccountAddresses,
} from "./account/getAccount"
export { type LinkedCustomer, linkUserOnVerified } from "./account/linkUserOnVerified"
export { type AddAddressInput, addAddress } from "./addresses/addAddress"
export { type DeleteAddressInput, deleteAddress } from "./addresses/deleteAddress"
export {
  type Address as CustomerAddress,
  type AddressInput as CustomerAddressInput,
  addressSchema,
  addressSchemaFor,
  parseAddress,
} from "./addresses/schemas"
export { type SetDefaultAddressInput, setDefaultAddress } from "./addresses/setDefault"
export { ADDRESS_LIMIT } from "./addresses/statements"
export { type UpdateAddressInput, updateAddress } from "./addresses/updateAddress"
export { normalizeEmail } from "./email/normalizeEmail"
export {
  type UpsertCheckoutCustomerInput,
  type UpsertCheckoutCustomerResult,
  upsertCheckoutCustomer,
} from "./email/upsertCheckoutCustomer"
export {
  type CreateManualGroupInput,
  createManualGroup,
} from "./groups/manual/createManualGroup"
export {
  addGroupMember,
  type GroupMemberInput,
  removeGroupMember,
} from "./groups/manual/membership"
export { COMMERCE_GROUP_LIMIT, commerceGroupIds } from "./session/commerceGroupIds"
export {
  type CustomerAdminCtx,
  CustomerError,
  type CustomerErrorCode,
  type CustomersCtx,
} from "./types"
