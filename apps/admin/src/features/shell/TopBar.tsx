import { ChannelSelector } from "./ChannelSelector"
import { UserMenu } from "./UserMenu"

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <ChannelSelector />
      <UserMenu />
    </header>
  )
}
