import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OpsGuard() {
  const { isAuthed, user } = useAuth();

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role;
  const isOps = role === "practicante";

  if (!isOps) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}