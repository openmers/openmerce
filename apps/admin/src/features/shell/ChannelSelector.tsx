import { useStore } from "@nanostores/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@openmers/ui"
import { $channel } from "../../lib/channel"

// Placeholder: the Admin API has no channel list endpoint yet, so only the configured channel is shown.
const DEFAULT_VALUE = "__host__"

export function ChannelSelector() {
  const channel = useStore($channel)
  const value = channel || DEFAULT_VALUE
  return (
    <Select value={value} size="small" disabled>
      <SelectTrigger aria-label="Channel" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={value}>{channel || "Default channel"}</SelectItem>
      </SelectContent>
    </Select>
  )
}
