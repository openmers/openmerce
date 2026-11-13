export { getSettings, type ScopeRef } from "./queries/getSettings"
export { getSettingsVersion } from "./queries/getSettingsVersion"
export { markSetupCompleted } from "./queries/markSetupCompleted"
export { type SetSettingInput, setSetting } from "./queries/setSetting"
export {
  getSettingDefinition,
  registerAppSetting,
  registerSetting,
  type SettingDefinition,
  SettingError,
  type SettingErrorCode,
  type SettingScope,
} from "./registry"
export { resolveSetting, type SettingRow } from "./resolveSetting"
