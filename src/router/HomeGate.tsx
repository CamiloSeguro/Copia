import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CatalogPage from "../pages/CatalogPage";

/**
 * Puerta de entrada a la ruta raíz "/".
 * - Sin sesión activa       → redirige a /login.
 * - Rol practicante (ops)   → redirige a /ops.
 * - Estudiante autenticado  → muestra el catálogo.
 */
export default function HomeGate() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "practicante") {
    return <Navigate to="/ops" replace />;
  }

  return <CatalogPage />;
}