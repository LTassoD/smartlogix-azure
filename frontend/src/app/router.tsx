import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { PAGE_PERMISSIONS } from "@/features/auth/permissions/permissions";
import { CarriersPage } from "@/features/carriers/pages/CarriersPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { ShipmentsPage } from "@/features/shipments/pages/ShipmentsPage";
import { WarehousesPage } from "@/features/warehouses/pages/WarehousesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.dashboard}>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/inventario",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.inventory}>
            <InventoryPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/pedidos",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.orders}>
            <OrdersPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/envios",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.shipments}>
            <ShipmentsPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/transportistas",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.carriers}>
            <CarriersPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/bodegas",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.warehouses}>
            <WarehousesPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/reportes",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.reports}>
            <ReportsPage />
          </ProtectedRoute>
        )
      },
      {
        path: "/configuracion",
        element: (
          <ProtectedRoute permission={PAGE_PERMISSIONS.settings}>
            <SettingsPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
