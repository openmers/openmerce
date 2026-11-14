import { Text } from "@openmers/ui"
import { Link } from "@tanstack/react-router"
import { navItems } from "../../lib/nav"
import { usePermissions } from "../../lib/permissions"

export function Sidebar() {
  const { can } = usePermissions()
  return (
    <nav aria-label="Main" className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card p-3">
      <Text size="small" weight="plus" className="px-2 py-3">
        OpenMers
      </Text>
      {navItems
        .filter((item) => can(item.permission))
        .map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="txt-compact-small-plus rounded-md px-2 py-1.5 text-muted-foreground hover:bg-bg-base-pressed data-[status=active]:bg-bg-base-pressed data-[status=active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
    </nav>
  )
}
