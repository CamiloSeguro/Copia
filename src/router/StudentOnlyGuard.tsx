import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Protege rutas exclusivas para estudiantes.
 * - Si no hay sesión activa → redirige a /login.
 * - Si el usuario es practicante/operador/admin → redirige a /ops.
 * - Si es estudiante → renderiza la ruta normalmente.
 */
export default function StudentOnlyGuard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "practicante") {
    return <Navigate to="/ops" replace />;
  }

  return <Outlet />;
}