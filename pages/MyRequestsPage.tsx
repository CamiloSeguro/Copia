import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoans, type Ticket } from "../app/loansContext";
import { useCatalog } from "../app/catalogContext";
import { Topbar } from "../components/TopBar";

// =========================
// Types
// =========================

type TicketStatus = Ticket["status"]; // "pending_delivery" | "delivered" | "returned" | "cancelled"
type FilterKey = "all" | "active" | "done" | TicketStatus;

interface StatusMeta {
  text: string;
  dot: string;
  cls: string;
  weight: number;
}

// =========================
// Constants
// =========================

const STATUS_META: Record<TicketStatus, StatusMeta> = {
  pending_delivery: {
    text: "Pendiente de entrega",
    dot: "bg-status-info",
    cls: "bg-status-info/10 text-status-info border-status-info/20",
    weight: 3,
  },
  delivered: {
    text: "Entregado",
    dot: "bg-status-success",
    cls: "bg-status-success/10 text-status-success border-status-success/20",
    weight: 1,
  },
  returned: {
    text: "Devuelto",
    dot: "bg-status-neutral",
    cls: "bg-status-neutral/10 text-status-neutral border-status-neutral/20",
    weight: 0,
  },
  cancelled: {
    text: "Cancelado",
    dot: "bg-status-neutral",
    cls: "bg-status-neutral/10 text-status-neutral border-status-neutral/20",
    weight: 0,
  },
};

/** Los status que requieren atención del estudiante. */
const ACTIVE_STATUSES = new Set<TicketStatus>(["pending_delivery", "delivered"]);

// =========================
// Helpers
// =========================

function statusMeta(status: TicketStatus): StatusMeta {
  return STATUS_META[status];
}

function isActiveStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

function fmtCreated(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

// =========================
// Icons
// =========================

const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Chevron: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// =========================
// Page
// =========================

export default function MyRequestsPage() {
  const nav = useNavigate();
  const { tickets } = useLoans();
  const { resources } = useCatalog();

  const resourceMap = useMemo(
    () => new Map(resources.map((r) => [r.id, r])),
    [resources]
  );

  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const filter = (sp.get("filter") ?? "all") as FilterKey;

  function setQ(value: string) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set("q", value) : next.delete("q");
      return next;
    });
  }

  function setFilter(value: FilterKey) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      value === "all" ? next.delete("filter") : next.set("filter", value);
      return next;
    });
  }

  const stats = useMemo(() => {
    const map = new Map<TicketStatus, number>();
    for (const t of tickets) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return map;
  }, [tickets]);

  const ordered = useMemo(
    () =>
      tickets
        .filter((t) => t.status !== "cancelled")
        .sort((a, b) => {
          const wa = statusMeta(a.status).weight;
          const wb = statusMeta(b.status).weight;
          if (wb !== wa) return wb - wa;
          return new Date(b.createdAtISO ?? 0).getTime() - new Date(a.createdAtISO ?? 0).getTime();
        }),
    [tickets]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return ordered.filter((t) => {
      if (filter !== "all") {
        if (filter === "active" && !isActiveStatus(t.status)) return false;
        if (filter === "done" && isActiveStatus(t.status)) return false;
        if (filter !== "active" && filter !== "done" && t.status !== filter) return false;
      }

      if (!query) return true;

      const haystack = [
        ticketCode(t.id),
        "inmediato",
        statusMeta(t.status).text,
        String(t.items?.length ?? 0),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [ordered, q, filter]);

  const counts = useMemo(() => {
    const visible = tickets.filter((t) => t.status !== "cancelled");
    const total = visible.length;
    const active = visible.filter((t) => isActiveStatus(t.status)).length;
    return {
      total,
      active,
      done: total - active,
      pending: stats.get("pending_delivery") ?? 0,
    };
  }, [tickets, stats]);

  function chipCls(active: boolean) {
    return [
      "ui-chip",
      active ? "ui-chip-on" : "ui-chip-off",
      "cursor-pointer select-none",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-eafit-secondary/25",
    ].join(" ");
  }

  function clearFilters() {
    setSp({});
  }

  const hasActiveFilters = q.trim().length > 0 || filter !== "all";

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-eafit-text">Mis solicitudes</div>
            <div className="text-eafit-muted mt-1">
              Historial de tickets enviados{counts.total ? ` (${counts.total})` : ""}.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={chipCls(filter === "all")} onClick={() => setFilter("all")}>
                Total: {counts.total}
              </button>
              <button type="button" className={chipCls(filter === "active")} onClick={() => setFilter("active")}>
                Activas: {counts.active}
              </button>
              <button type="button" className={chipCls(filter === "done")} onClick={() => setFilter("done")}>
                Finalizadas: {counts.done}
              </button>
              {counts.pending > 0 && (
                <button type="button" className={chipCls(filter === "pending_delivery")} onClick={() => setFilter("pending_delivery")}>
                  Pendientes: {counts.pending}
                </button>
              )}
            </div>
          </div>

          <button className="ui-btn-ghost ui-btn-sm" onClick={() => nav("/")} type="button">
            <span className="ui-btn-label">← Volver al catálogo</span>
          </button>
        </div>

        {/* Search */}
        {tickets.length > 0 && (
          <div className="mt-6 ui-card p-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-eafit-muted">
                <Icons.Search />
              </span>
              <input
                className="w-full h-11 rounded-input border border-eafit-border bg-eafit-bg pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-eafit-secondary/20 focus:border-eafit-secondary/30"
                placeholder="Buscar por ticket, estado…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-eafit-muted">
                  Mostrando <span className="font-semibold text-eafit-text">{filtered.length}</span> resultado(s).
                </div>
                <button type="button" className="ui-btn-ghost ui-btn-sm !h-9" onClick={clearFilters}>
                  <span className="ui-btn-label">Limpiar</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="mt-6 ui-card overflow-hidden">
          <div className="px-6 py-4 border-b border-eafit-border text-sm font-semibold text-eafit-text">
            Tickets
          </div>

          {tickets.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-eafit-subtle border border-eafit-border text-eafit-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-eafit-text">Aún no tienes solicitudes</div>
                <div className="text-sm text-eafit-muted mt-1">Ve al catálogo para seleccionar recursos y crear una solicitud.</div>
              </div>
              <button className="ui-btn-primary ui-btn-sm mt-1" type="button" onClick={() => nav("/")}>
                <span className="ui-btn-label">Ir al catálogo</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-eafit-subtle border border-eafit-border text-eafit-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-eafit-text">Sin resultados</div>
                <div className="text-sm text-eafit-muted mt-1">Prueba con otro término o ajusta los filtros.</div>
              </div>
              <button className="ui-btn-ghost ui-btn-sm mt-1" type="button" onClick={clearFilters}>
                <span className="ui-btn-label">Limpiar búsqueda</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-eafit-border">
              {filtered.map((t) => {
                const s = statusMeta(t.status);
                const code = ticketCode(t.id);

                return (
                  <button
                    key={t.id}
                    className="w-full text-left px-6 py-5 transition hover:bg-eafit-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-eafit-secondary/30"
                    onClick={() => nav(`/mis-solicitudes/${t.id}`)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-semibold text-eafit-text truncate">Ticket {code}</div>
                          <span className="text-[11px] text-eafit-muted shrink-0">
                            · {fmtCreated(t.createdAtISO)}
                          </span>
                        </div>
                        <div className="text-sm text-eafit-muted mt-1">
                          {(() => {
                            const names = (t.items ?? [])
                              .map((it) => resourceMap.get(it.resourceId)?.name)
                              .filter(Boolean);
                            const preview = names.slice(0, 2).join(", ");
                            const extra = names.length > 2 ? ` +${names.length - 2}` : "";
                            return names.length > 0 ? `${preview}${extra}` : `Inmediato · ${t.items?.length ?? 0} ítem(s)`;
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={["inline-flex items-center gap-2 text-[11px] px-3 h-8 rounded-pill border shrink-0", s.cls].join(" ")}
                          title={s.text}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
                          <span className="truncate max-w-[160px]">{s.text}</span>
                        </span>

                        <span className="hidden sm:grid h-8 w-8 rounded-lg border border-eafit-border bg-eafit-surface place-items-center text-eafit-muted">
                          <Icons.Chevron />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}