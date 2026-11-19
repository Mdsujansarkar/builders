import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AuthContext.jsx";
import AdminLayout from "./AdminLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import RecordsPage from "./pages/RecordsPage.jsx";
import RecordDetailPage from "./pages/RecordDetailPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import InvoicesPage from "./pages/InvoicesPage.jsx";
import InvoiceDetailPage from "./pages/InvoiceDetailPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";

function RequireAuth({ children }) {
  const { user, booting } = useAdminAuth();
  const location = useLocation();
  if (booting) return <div className="admin-loading">Loading console…</div>;
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  return children;
}

/** Regular users may only use the Financial Records screens. */
function SuperAdminOnly({ children }) {
  const { user } = useAdminAuth();
  if (user?.role !== "SUPER_ADMIN") return <Navigate to="/admin/records" replace />;
  return children;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <AdminLayout>
              <Routes>
                <Route index element={<SuperAdminOnly><DashboardPage /></SuperAdminOnly>} />
                <Route path="users" element={<SuperAdminOnly><UsersPage /></SuperAdminOnly>} />
                <Route path="projects" element={<SuperAdminOnly><ProjectsPage /></SuperAdminOnly>} />
                <Route path="categories" element={<SuperAdminOnly><CategoriesPage /></SuperAdminOnly>} />
                <Route path="records" element={<RecordsPage />} />
                <Route path="records/:id" element={<RecordDetailPage />} />
                <Route path="transactions" element={<SuperAdminOnly><TransactionsPage /></SuperAdminOnly>} />
                <Route path="invoices" element={<SuperAdminOnly><InvoicesPage /></SuperAdminOnly>} />
                <Route path="invoices/:id" element={<SuperAdminOnly><InvoiceDetailPage /></SuperAdminOnly>} />
                <Route path="reports" element={<SuperAdminOnly><ReportsPage /></SuperAdminOnly>} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
