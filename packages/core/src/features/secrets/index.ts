// Ham şifre çözme dışa açılmaz: sırra erişim yalnız `useSecret` üzerinden.
export { CURRENT_KEK_VERSION, constantTimeEqual, type Kek, type SecretAddress } from "./crypto"
export { isDemoMode, requireKek, SecretError, type SecretErrorCode } from "./demoMode"
export { hasSecret, type SecretRef, type SecretScope, setSecret, useSecret } from "./vault"
