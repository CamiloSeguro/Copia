import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const USERS_DIR_KEY = "eafit_users_v1";

type DirUser = {
  id: string;
  name: string;
  email: string;
  role: "usuario" | "trabajador";
  banned: boolean;
  banReason?: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normEmail(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export default function BanSyncGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthed, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!isAuthed || !user?.email) return;

    const check = () => {
      const dir = safeParse<DirUser[]>(localStorage.getItem(USERS_DIR_KEY), []);
      const me = dir.find((u) => normEmail(u.email) === normEmail(user.email));
      if (me?.banned) {
        const reason = me.banReason?.trim();
        logout();
        nav("/login", {
          replace: true,
          state: {
            from: loc.pathname + loc.search,
            error: reason ? `Usuario vetado: ${reason}` : "Usuario vetado.",
          },
        });
      }
    };

    check();

    // ✅ se actualiza cuando el trabajador edita usuarios (otro tab/ventana)
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [isAuthed, user?.email, logout, nav, loc.pathname, loc.search]);

  return <>{children}</>;
}