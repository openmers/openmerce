// Public surface of id generation (roadmap 6.5-6.6). The single source of the prefix map
// is `@openmers/db` (`schema/public-id-prefixes.ts`); it is only re-exported here.
export {
  isPublicIdPrefix,
  isTokenPrefix,
  PUBLIC_ID_PREFIXES,
  PUBLIC_ID_TABLES,
  type PublicIdPrefix,
  TOKEN_PREFIXES,
  type TokenPrefix,
} from "@openmers/db"
export {
  CROCKFORD_ALPHABET,
  encodeCrockford,
  isCrockfordBody,
  PUBLIC_ID_BODY_LENGTH,
} from "./crockford"
export {
  type InsertWithPublicIdOptions,
  insertWithPublicId,
  isPublicIdCollision,
  PUBLIC_ID_INSERT_ATTEMPTS,
} from "./insertWithPublicId"
export {
  isPublicId,
  newPublicId,
  normalizePrefix,
  type ParsedPublicId,
  parsePublicId,
  type RandomBytes,
  webCryptoRandomBytes,
} from "./publicId"
