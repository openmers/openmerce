/** Sidebar entry; `permission` hides it when the admin lacks it (the API still enforces). */
export type NavItem = { to: string; label: string; permission?: string }

/** Nav registry: core entries; built-in apps append to this list later (extension registry). */
export const navItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products", permission: "products:read" },
  { to: "/orders", label: "Orders", permission: "orders:read" },
]
