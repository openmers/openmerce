import { adminAuthLogin, adminAuthLogout, adminMe, adminSetupCreate } from "./auth"

// Admin API sözleşmesi: her uç `adminProcedure(erişim)` ile başlar (izin meta'sı zorunlu).
// Kurulum prosedürleri `setup.` altındadır (`setupGate` bu öneke bakar).
export const admin = {
  setup: { create: adminSetupCreate },
  auth: { login: adminAuthLogin, logout: adminAuthLogout },
  me: adminMe,
}

export {
  adminAuthLogin,
  adminAuthLogout,
  adminEmailSchema,
  adminMe,
  adminPasswordSchema,
  adminSetupCreate,
} from "./auth"
