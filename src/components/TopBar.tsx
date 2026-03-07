import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth, isOpsRole } from "../auth/AuthContext";
import { useCatalog } from "../app/catalogContext";
import { useLoans, type Ticket } from "../app/loansContext";
import { useUsers } from "../app/userContext";
import type { Resource } from "../types";

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  to?: string;
  onRun?: () => void;
  badge?: "Recurso" | "Buscar" | "Ticket" | "Persona";
  section?: "Acciones" | "Recursos" | "Tickets" | "Personas";
};

const TICKET_STATUS_LABEL: Record<Ticket["status"], string> = {
  pending_delivery: "Pendiente entrega",
  delivered: "Entregado",
  returned: "Devuelto",
  cancelled: "Cancelado",
};

const LS_RECENT_RESOURCES = "eafit_recent_resources_v1";
const RECENT_MAX = 10;

type RecentEntry = { id: string; ts: number; n: number };

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function loadRecent(): RecentEntry[] {
  return safeParse<RecentEntry[]>(localStorage.getItem(LS_RECENT_RESOURCES), []);
}

function saveRecent(list: RecentEntry[]) {
  localStorage.setItem(LS_RECENT_RESOURCES, JSON.stringify(list));
}

function bumpRecent(resourceId: string) {
  const now = Date.now();
  const cur = loadRecent();
  const i = cur.findIndex((x) => x.id === resourceId);

  let next = [...cur];
  if (i >= 0) {
    const prev = next[i]!;
    next[i] = { ...prev, ts: now, n: (prev.n ?? 0) + 1 };
  } else {
    next.unshift({ id: resourceId, ts: now, n: 1 });
  }

  next = next.sort((a, b) => b.ts - a.ts).slice(0, RECENT_MAX);
  saveRecent(next);
}

const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Chevron: ({ open }: { open: boolean }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  List: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const avatarLetter = (name?: string, email?: string) =>
  ((name ?? "").trim()[0] ?? (email ?? "U")[0] ?? "U").toUpperCase();

const navItemCls = (active: boolean) =>
  [
    "px-3 py-2 rounded-md text-sm font-medium transition",
    active ? "bg-eafit-bg text-eafit-text" : "text-eafit-muted hover:bg-eafit-bg hover:text-eafit-text",
  ].join(" ");

function useHotkeys(open: boolean, onToggle: () => void, onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggle();
      } else if (open && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onToggle, onClose]);
}

function Logo({ to, subtitle }: { to: string; subtitle: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 shrink-0 group">
      <div className="relative h-9 w-9 rounded-lg bg-eafit-primary overflow-hidden grid place-items-center shrink-0">
        <span className="relative text-sm font-extrabold text-white tracking-tight leading-none">E</span>
      </div>

      <div className="leading-tight hidden sm:block">
        <div className="text-sm font-semibold text-eafit-text group-hover:text-eafit-primary transition">EAFIT · MediaLab</div>
        <div className="text-[11px] text-eafit-muted">{subtitle}</div>
      </div>
    </Link>
  );
}

function DropdownItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-eafit-bg transition text-sm text-eafit-text"
    >
      <span className="text-eafit-muted">{icon}</span>
      {label}
    </button>
  );
}

function UserDropdown({ isOps }: { isOps: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const letter = avatarLetter(user?.name, user?.email);

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

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 h-10 pl-2 pr-3 rounded-lg border transition",
          open
            ? "border-eafit-secondary/30 bg-eafit-bg ring-2 ring-eafit-secondary/10"
            : "border-eafit-border bg-eafit-surface hover:bg-eafit-bg",
        ].join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de cuenta"
      >
        <div
          className={[
            "h-7 w-7 rounded-md grid place-items-center text-xs font-bold",
            isOps ? "bg-eafit-primary text-white" : "bg-eafit-secondary/15 text-eafit-text",
          ].join(" ")}
        >
          {letter}
        </div>

        <span className="hidden sm:block text-sm font-medium text-eafit-text max-w-[100px] truncate">
          {user?.name?.split(" ")[0] ?? "Cuenta"}
        </span>

        <Icons.Chevron open={open} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 mt-2 w-[272px] rounded-xl border border-eafit-border bg-eafit-surface shadow-card overflow-hidden z-50"
        >
          <div className={["px-4 py-3 border-b border-eafit-border", isOps ? "bg-eafit-primary/5" : "bg-eafit-surface"].join(" ")}>
            <div className="flex items-center gap-3">
              <div
                className={[
                  "h-10 w-10 rounded-lg grid place-items-center text-sm font-bold shrink-0",
                  isOps ? "bg-eafit-primary text-white" : "bg-eafit-secondary/15 text-eafit-text",
                ].join(" ")}
              >
                {letter}
              </div>

              <div className="min-w-0">
                <div
                  className={[
                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-0.5",
                    isOps
                      ? "bg-eafit-primary/10 border-eafit-primary/20 text-eafit-primary"
                      : "bg-eafit-secondary/10 border-eafit-secondary/20 text-eafit-text",
                  ].join(" ")}
                >
                  {user?.role === "admin" ? "Admin" : isOps ? "Trabajador" : "Usuario"}
                </div>
                <div className="text-sm font-semibold text-eafit-text truncate">{user?.name ?? "Cuenta"}</div>
                <div className="text-xs text-eafit-muted truncate">{user?.email ?? ""}</div>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            {isOps && (
              <>
                <DropdownItem icon={<Icons.Dashboard />} label="Dashboard" onClick={() => { setOpen(false); navigate("/ops"); }} />
                <DropdownItem icon={<Icons.List />} label="Solicitudes" onClick={() => { setOpen(false); navigate("/ops/solicitudes"); }} />
                <div className="my-1 mx-2 h-px bg-eafit-border" />
              </>
            )}

            <button
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-status-danger/5 transition text-sm text-status-danger"
            >
              <Icons.Logout />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose, isOps }: { open: boolean; onClose: () => void; isOps: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const linkCls =
    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-eafit-text hover:bg-eafit-bg transition";

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} aria-hidden />

      <div className="fixed top-[65px] inset-x-0 z-40 bg-eafit-surface border-b border-eafit-border shadow-card px-4 py-3">
        <nav className="flex flex-col gap-1">
          {isOps ? (
            <>
              <NavLink to="/ops" end onClick={onClose} className={({ isActive }) => `${linkCls} ${isActive ? "bg-eafit-bg" : ""}`}>
                <Icons.Dashboard />
                Dashboard
              </NavLink>
              <NavLink to="/ops/solicitudes" onClick={onClose} className={({ isActive }) => `${linkCls} ${isActive ? "bg-eafit-bg" : ""}`}>
                <Icons.List />
                Solicitudes
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end onClick={onClose} className={({ isActive }) => `${linkCls} ${isActive ? "bg-eafit-bg" : ""}`}>
                <Icons.Search />
                Catálogo
              </NavLink>
              <NavLink to="/mis-prestamos" onClick={onClose} className={({ isActive }) => `${linkCls} ${isActive ? "bg-eafit-bg" : ""}`}>
                <Icons.List />
                Mis préstamos
              </NavLink>
              <NavLink to="/mis-solicitudes" onClick={onClose} className={({ isActive }) => `${linkCls} ${isActive ? "bg-eafit-bg" : ""}`}>
                <Icons.List />
                Mis solicitudes
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </>
  );
}

function CommandPalette({
  open,
  onClose,
  dynamicItems,
}: {
  open: boolean;
  onClose: () => void;
  dynamicItems: (q: string) => CmdItem[];
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = dynamicItems(q);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActive((p) => Math.min(p, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const run = (it: CmdItem) => {
    if (it.badge === "Recurso" && it.id.startsWith("resource-")) {
      bumpRecent(it.id.replace("resource-", ""));
    }
    it.onRun?.();
    if (it.to) navigate(it.to);
    onClose();
  };

  const badgeCls = (b?: CmdItem["badge"]) => {
    switch (b) {
      case "Recurso":
        return "border-status-info/25 bg-status-info/10 text-status-info";
      case "Ticket":
        return "border-status-warning/25 bg-status-warning/10 text-status-warning";
      case "Persona":
        return "border-eafit-primary/20 bg-eafit-primary/8 text-eafit-primary";
      case "Buscar":
        return "border-eafit-border bg-eafit-bg text-eafit-muted";
      default:
        return "border-eafit-border bg-eafit-surface text-eafit-muted";
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return e.preventDefault(), onClose();
    if (e.key === "ArrowDown") return e.preventDefault(), setActive((p) => Math.min(p + 1, Math.max(0, filtered.length - 1)));
    if (e.key === "ArrowUp") return e.preventDefault(), setActive((p) => Math.max(0, p - 1));
    if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[active];
      if (it) run(it);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (!panelRef.current?.contains(e.target as Node)) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto mt-20 sm:mt-24 w-[min(680px,94vw)]">
        <div ref={panelRef} className="rounded-xl border border-eafit-border bg-eafit-surface shadow-card overflow-hidden" onKeyDown={onKeyDown}>
          <div className="p-3 border-b border-eafit-border">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-eafit-muted">
                <Icons.Search />
              </span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                className="w-full h-11 rounded-lg border border-eafit-border bg-eafit-bg pl-10 pr-16 text-sm outline-none
                           focus:ring-2 focus:ring-eafit-secondary/20 focus:border-eafit-secondary/30"
                placeholder="Buscar por ID, nombre, categoría…"
                aria-controls="cmd-results"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-eafit-muted border border-eafit-border rounded-md px-2 py-1 bg-eafit-surface font-sans">
                ESC
              </kbd>
            </div>
          </div>

          <div ref={listRef} id="cmd-results" className="max-h-[360px] overflow-auto" role="listbox">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="text-sm font-medium text-eafit-text">Sin resultados</div>
                <div className="text-xs text-eafit-muted mt-1">Intenta con otro término.</div>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filtered.map((it, idx) => {
                  const isActive = idx === active;
                  const prev = filtered[idx - 1];
                  const showHeader = it.section && it.section !== prev?.section;

                  return (
                    <div key={it.id} className="space-y-1">
                      {showHeader && (
                        <div className="px-3 pt-2 pb-1">
                          <div className="text-[10px] font-semibold tracking-wide uppercase text-eafit-muted">
                            {it.section}
                          </div>
                          <div className="mt-2 h-px bg-eafit-border" />
                        </div>
                      )}

                      <button
                        data-idx={idx}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => run(it)}
                        className={[
                          "w-full text-left px-4 py-2.5 rounded-lg flex items-center justify-between gap-4 transition",
                          isActive ? "bg-eafit-secondary/8 border border-eafit-secondary/20" : "border border-transparent hover:bg-eafit-bg",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          {it.badge && (
                            <span className={["shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border", badgeCls(it.badge)].join(" ")}>
                              {it.badge}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-eafit-text truncate">{it.label}</div>
                            {it.hint && <div className="text-xs text-eafit-muted mt-0.5 truncate">{it.hint}</div>}
                          </div>
                        </div>

                        {isActive && (
                          <kbd className="shrink-0 text-[10px] text-eafit-muted border border-eafit-border rounded px-1.5 py-0.5 bg-eafit-surface font-sans">
                            ↵
                          </kbd>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-eafit-border bg-eafit-subtle flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-eafit-muted">
              <span>↑↓ navegar</span>
              <span className="text-eafit-border">·</span>
              <span>Enter ejecutar</span>
              <span className="text-eafit-border">·</span>
              <span>ESC cerrar</span>
            </div>
            <kbd className="hidden sm:inline text-[11px] text-eafit-muted border border-eafit-border rounded-md px-2 py-0.5 bg-eafit-surface font-sans">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Topbar() {
  const { isAuthed, user } = useAuth();
  const { resources } = useCatalog();
  const { tickets } = useLoans();
  const { users } = useUsers();
  const navigate = useNavigate();

  const isOps = isAuthed && isOpsRole(user?.role);

  const [openCmd, setOpenCmd] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleCmd = () => setOpenCmd((v) => !v);
  useHotkeys(openCmd, toggleCmd, () => setOpenCmd(false));

  const dynamicItems = (q: string): CmdItem[] => {
    const term = q.trim();
    const low = term.toLowerCase();

    if (isOps) {
      if (!term) {
        const recentTickets = [...tickets]
          .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
          .slice(0, 4)
          .map((t) => ({
            id: `ticket-${t.id}`,
            label: t.id,
            hint: t.userName ? `${t.userName} · ${TICKET_STATUS_LABEL[t.status]}` : TICKET_STATUS_LABEL[t.status],
            to: `/ops/ticket/${t.id}`,
            badge: "Ticket" as const,
            section: "Tickets" as const,
          }));

        const recentUsers = users.slice(0, 4).map((u) => ({
          id: `user-${u.id}`,
          label: u.name,
          hint: u.email,
          to: `/ops/usuarios`,
          badge: "Persona" as const,
          section: "Personas" as const,
        }));

        return [...recentTickets, ...recentUsers];
      }

      const ticketHits = tickets
        .filter((t) =>
          t.id.toLowerCase().includes(low) ||
          TICKET_STATUS_LABEL[t.status].toLowerCase().includes(low) ||
          (t.userName ?? "").toLowerCase().includes(low) ||
          (t.userEmail ?? "").toLowerCase().includes(low)
        )
        .slice(0, 4)
        .map((t) => ({
          id: `ticket-${t.id}`,
          label: t.id,
          hint: t.userName ? `${t.userName} · ${TICKET_STATUS_LABEL[t.status]}` : TICKET_STATUS_LABEL[t.status],
          to: `/ops/ticket/${t.id}`,
          badge: "Ticket" as const,
          section: "Tickets" as const,
        }));

      const userHits = users
        .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(low))
        .slice(0, 4)
        .map((u) => ({
          id: `user-${u.id}`,
          label: u.name,
          hint: u.email,
          to: `/ops/usuarios`,
          badge: "Persona" as const,
          section: "Personas" as const,
        }));

      return [...ticketHits, ...userHits];
    }

    // Usuario normal: búsqueda de recursos
    if (!term) {
      const recentIds = loadRecent().map((x) => x.id);
      const byId = new Map(resources.map((r: Resource) => [r.id, r]));
      const recentResources = recentIds.map((id) => byId.get(id)).filter(Boolean) as Resource[];
      const fallback = resources
        .filter((r: Resource) => !recentIds.includes(r.id))
        .slice(0, Math.max(0, 8 - recentResources.length));

      return [...recentResources, ...fallback].slice(0, 8).map((r: Resource) => ({
        id: `resource-${r.id}`,
        label: `${r.assetId ?? "—"} · ${r.name}`,
        hint: r.category,
        to: `/?q=${encodeURIComponent(r.assetId ?? r.name)}`,
        badge: "Recurso" as const,
        section: "Recursos" as const,
      }));
    }

    const apply: CmdItem = {
      id: `apply-${low}`,
      label: `Buscar: "${term}"`,
      hint: "Filtra el catálogo",
      to: `/?q=${encodeURIComponent(term)}`,
      badge: "Buscar",
      section: "Acciones",
    };

    const hits = resources
      .filter((r: Resource) =>
        `${r.assetId ?? ""} ${r.name} ${r.category} ${r.id}`.toLowerCase().includes(low)
      )
      .slice(0, 8)
      .map((r: Resource) => ({
        id: `resource-${r.id}`,
        label: `${r.assetId ?? "—"} · ${r.name}`,
        hint: r.category,
        to: `/?q=${encodeURIComponent(r.assetId ?? r.name)}`,
        badge: "Recurso" as const,
        section: "Recursos" as const,
      }));

    return [apply, ...hits];
  };

  return (
    <>
      <header
        className={[
          "sticky top-0 z-40 w-full border-b",
          isOps ? "border-eafit-primary/20 bg-eafit-surface/98" : "border-eafit-border bg-eafit-surface/95",
        ].join(" ")}
      >
        {isOps && <div className="h-[3px] bg-eafit-primary w-full" />}

        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 h-[65px] flex items-center gap-3 sm:gap-4">
          <Logo to={isOps ? "/ops" : "/"} subtitle={isOps ? "Panel de trabajador" : "Préstamo de recursos"} />

          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => (!isAuthed ? navigate("/login") : setOpenCmd(true))}
              className={[
                "w-full h-10 rounded-input border bg-eafit-bg px-3.5 flex items-center justify-between gap-3",
                "hover:bg-eafit-subtle transition focus:outline-none focus:ring-2 focus:ring-eafit-secondary/20",
                "border-eafit-border",
              ].join(" ")}
            >
              <div className="flex items-center gap-2.5 text-eafit-muted min-w-0">
                <Icons.Search />
                <span className="text-sm truncate">Buscar por ID, nombre, categoría… (Ctrl K)</span>
              </div>
              <kbd className="hidden md:inline text-[11px] text-eafit-muted border border-eafit-border rounded px-2 py-0.5 bg-eafit-surface shrink-0 font-sans">
                Ctrl K
              </kbd>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {isOps ? (
              <>
                <NavLink to="/ops" end className={({ isActive }) => navItemCls(isActive)}>
                  Dashboard
                </NavLink>
                <NavLink to="/ops/solicitudes" className={({ isActive }) => navItemCls(isActive)}>
                  Solicitudes
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/mis-prestamos" className={({ isActive }) => navItemCls(isActive)}>
                  Mis préstamos
                </NavLink>
                <NavLink to="/mis-solicitudes" className={({ isActive }) => navItemCls(isActive)}>
                  Mis solicitudes
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {!isAuthed ? (
              <Link
                to="/login"
                className="h-10 px-4 rounded-lg border border-eafit-border bg-eafit-surface text-sm font-medium text-eafit-text hover:bg-eafit-bg transition"
              >
                Iniciar sesión
              </Link>
            ) : (
              <UserDropdown isOps={!!isOps} />
            )}

            {isAuthed && (
              <button
                type="button"
                onClick={() => setOpenMobile((v) => !v)}
                className="lg:hidden h-10 w-10 rounded-lg border border-eafit-border bg-eafit-surface hover:bg-eafit-bg transition grid place-items-center text-eafit-muted"
                aria-label={openMobile ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={openMobile}
              >
                {openMobile ? <Icons.X /> : <Icons.Menu />}
              </button>
            )}
          </div>
        </div>
      </header>

      <MobileMenu open={openMobile} onClose={() => setOpenMobile(false)} isOps={!!isOps} />
      <CommandPalette open={openCmd} onClose={() => setOpenCmd(false)} dynamicItems={dynamicItems} />
    </>
  );
}
