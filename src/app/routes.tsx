import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import HomeGate from "../router/HomeGate";
import StudentOnlyGuard from "../router/StudentOnlyGuard";
import OpsGuard from "./OpsGuard";
import LoginPage from "../pages/LoginPage";
import CatalogPage from "../pages/CatalogPage";
import NewRequestWizardPage from "../pages/NewRequestWizardPage";
import MyRequestsPage from "../pages/MyRequestsPage";
import RequestDetailPage from "../pages/RequestDetailPage";
import MyLoansPage from "../pages/MyLoansPage";
import OpsDashboardPage from "../pages/PDashboardPage";
import OpsRequestsPage from "../pages/PRequestsPage";
import OpsTicketDetailPage from "../pages/PTicketDetailPage";
import OpsCatalogPage from "../pages/PCatalogPage"; // ← añadido

function AuthGuard() {
  const { isAuthed } = useAuth();
  const loc = useLocation();
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }
  return <Outlet />;
}

function LoginGate() {
  const { isAuthed } = useAuth();
  return isAuthed ? <Navigate to="/" replace /> : <LoginPage />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginGate /> },
  {
    element: <AuthGuard />,
    children: [
      { path: "/", element: <HomeGate /> },
      {
        element: <StudentOnlyGuard />,
        children: [
          { path: "/catalogo", element: <CatalogPage /> },
          { path: "/solicitud/nueva", element: <NewRequestWizardPage /> },
          { path: "/mis-solicitudes", element: <MyRequestsPage /> },
          { path: "/mis-solicitudes/:id", element: <RequestDetailPage /> },
          { path: "/mis-prestamos", element: <MyLoansPage /> },
        ],
      },
      {
        path: "/ops",
        element: <OpsGuard />,
        children: [
          { index: true, element: <OpsDashboardPage /> },
          { path: "solicitudes", element: <OpsRequestsPage /> },
          { path: "ticket/:id", element: <OpsTicketDetailPage /> },
          { path: "catalogo", element: <OpsCatalogPage /> }, // ← añadido
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);