import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, isOpsRole } from "../auth/AuthContext";

const roleLabel = (role?: string) =>
  role === "admin" ? "Admin" : role === "trabajador" ? "Trabajador" : "Usuario";

const avatarLetter = (name?: string, email?: string) =>
  ((name ?? "").trim()[0] ?? (email ?? "").trim()[0] ?? "U").toUpperCase();

export default function UserMenu({ className = "" }: { className?: string }) {
  const { isAuthed, user, logout } = useAuth();
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isOps = isAuthed && isOpsRole(user?.role);
  const label = roleLabel(user?.role);
  const avatar = avatarLetter(user?.name, user?.email);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isAuthed) return null;

  const go = (to: string) => {
    setOpen(false);
    nav(to);
  };

  const onLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className={["relative shrink-0", className].join(" ")}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "h-11 w-11 rounded-md border bg-eafit-surface grid place-items-center transition",
          "border-eafit-border hover:bg-eafit-bg",
          open ? "ring-2 ring-eafit-secondary/20 border-eafit-secondary/30" : "",
        ].join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        title="Cuenta"
      >
        <span className="text-sm font-semibold text-eafit-text">{avatar}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Menú de cuenta"
          className={[
            "absolute right-0 mt-2 w-[280px] overflow-hidden",
            "rounded-xl border border-eafit-border bg-eafit-surface shadow-soft",
          ].join(" ")}
        >
          <div className="p-4 border-b border-eafit-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-eafit-secondary/10 border border-eafit-secondary/20 grid place-items-center">
                <span className="text-sm font-semibold text-eafit-text">{avatar}</span>
              </div>

              <div className="min-w-0">
                <div className="text-xs text-eafit-muted">{label}</div>
                <div className="text-sm font-semibold text-eafit-text truncate">{user?.name ?? "Cuenta"}</div>
                <div className="text-xs text-eafit-muted truncate">{user?.email ?? ""}</div>
              </div>
            </div>
          </div>

          <div className="p-2">
            {isOps && (
              <>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => go("/ops")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-eafit-bg transition text-sm text-eafit-text"
                >
                  Ir a Dashboard
                </button>

                <button
                  role="menuitem"
                  type="button"
                  onClick={() => go("/ops/solicitudes")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-eafit-bg transition text-sm text-eafit-text"
                >
                  Ir a Solicitudes
                </button>

                <div className="my-2 h-px bg-eafit-border" />
              </>
            )}

            <button
              role="menuitem"
              type="button"
              onClick={onLogout}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-eafit-bg transition text-sm text-status-danger"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}