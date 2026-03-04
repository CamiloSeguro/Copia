import { Navigate, Outlet } from "react-router-dom";
import { useAuth, isOpsRole } from "../auth/AuthContext";

export default function OpsGuard() {
  const { isAuthed, user } = useAuth();

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  if (!isOpsRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}