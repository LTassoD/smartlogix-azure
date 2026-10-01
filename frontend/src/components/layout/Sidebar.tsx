import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Settings,
  ShieldCheck,
  Truck,
  Warehouse
} from "lucide-react";
import type { NavigationItem } from "@/types/navigation";
import { cn } from "@/utils/cn";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import type { PageKey } from "@/features/auth/permissions/permissions";

type SidebarNavigationItem = NavigationItem & {
  page: PageKey;
};

const navigation: SidebarNavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, page: "dashboard" },
  { name: "Inventario", href: "/inventario", icon: Boxes, page: "inventory" },
  { name: "Pedidos", href: "/pedidos", icon: ClipboardList, page: "orders" },
  { name: "Envios", href: "/envios", icon: Truck, page: "shipments" },
  { name: "Transportistas", href: "/transportistas", icon: MapPinned, page: "carriers" },
  { name: "Bodegas", href: "/bodegas", icon: Warehouse, page: "warehouses" },
  { name: "Reportes", href: "/reportes", icon: BarChart3, page: "reports" },
  { name: "Configuracion", href: "/configuracion", icon: Settings, page: "settings" }
];

export function Sidebar() {
  const { canViewPage } = usePermissions();
  const allowedNavigation = navigation.filter((item) => canViewPage(item.page));

  return (
    <aside className="border-b border-slate-800 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-72 lg:border-b-0">
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">SmartLogix</p>
            </div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:py-5">
          {allowedNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15 active:scale-[0.99]",
                  isActive && "bg-white text-slate-950 shadow-sm hover:bg-white hover:text-slate-950 focus-visible:ring-white/30"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
