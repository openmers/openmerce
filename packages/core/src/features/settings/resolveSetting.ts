import { getSettingDefinition, type SettingScope } from "./registry"

export type SettingRow = { scope: SettingScope; scopeId: number; key: string; value: unknown }

/**
 * Düşüş zinciri: kanal → global → kod varsayılanı (07-yapilandirma, §6 karar 10).
 * `admin_user`/`customer`/`built_in_app` satırları bu zincire karışmaz.
 */
export function resolveSetting(
  key: string,
  rows: readonly SettingRow[],
  channelId: number | null,
): unknown {
  const def = getSettingDefinition(key)
  const find = (scope: SettingScope, scopeId: number) =>
    rows.find((r) => r.key === key && r.scope === scope && r.scopeId === scopeId)
  const row = (channelId !== null ? find("channel", channelId) : undefined) ?? find("global", 0)
  return row ? row.value : def.default
}
