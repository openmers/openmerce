export {
  type AppPermissions,
  allPermissions,
  CORE_PERMISSIONS,
  type CorePermission,
  isPermission,
  type Permission,
  PermissionError,
  registerAppPermissions,
  SUPER_ADMIN_ROLE,
} from "./permissions/registry"
export { type RoleAssignment, resolvePermissions } from "./permissions/resolvePermissions"
export {
  SETUP_PROCEDURE_PREFIX,
  type SetupGateDecision,
  type SetupGateInput,
  setupGate,
} from "./setupGate"
