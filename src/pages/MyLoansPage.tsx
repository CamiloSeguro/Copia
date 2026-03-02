import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/TopBar";
import { useLoans, type Ticket } from "../app/loansContext";
import { mockResources } from "../data/mockResources";

// =========================
// Types
// =========================

type TicketItem = Ticket["items"][number];

// =========================
// Constants
// =========================

const STATUS_META: Record<Ticket["status"], { text: string; dot: string; pill: string }> = {
  pending_delivery: {
    text: "Pendiente",
    dot: "bg-status-warning",
    pill: "border-status-warning/20 bg-status-warning/10 text-status-warning",
  },
  delivered: {
    text: "Entregado",
    dot: "bg-status-success",
    pill: "border-status-success/20 bg-status-success/10 text-status-success",
  },
  returned: {
    text: "Devuelto",
    dot: "bg-status-neutral",
    pill: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
  },
  cancelled: {
    text: "Cancelado",
    dot: "bg-status-danger",
    pill: "border-status-danger/20 bg-status-danger/10 text-status-danger",
  },
};

const ITEM_META = {
  overdue: {
    text: "Vencido",
    pill: "border-status-danger/20 bg-status-danger/10 text-status-danger",
  },
  ok: {
    text: "Entregado",
    pill: "border-status-success/20 bg-status-success/10 text-status-success",
  },
};

// =========================
// Helpers
// =========================

function isOverdue(dueAtISO?: string): boolean {
  if (!dueAtISO) return false;
  const due = new Date(dueAtISO);
  return !Number.isNaN(due.getTime()) && Date.now() > due.getTime();
}

/** Formatea un ISO string a fecha/hora legible en español colombiano. */
function fmtDate(iso?: string): string {
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

/** Genera un código corto legible a partir del ID del ticket. */
function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

function overdueCount(items: TicketItem[]): number {
  return items.filter((it) => isOverdue(it.dueAtISO)).length;
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
  Chevron: ({ open }: { open: boolean }) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// =========================
// Page
// =========================

/** Lista de tickets activamente entregados al estudiante. */
export default function MyLoansPage() {
  const nav = useNavigate();
  const { tickets } = useLoans();

  const resourceMap = useMemo(() => new Map(mockResources.map((r) => [r.id, r])), []);

  const delivered = useMemo(
    () => tickets.filter((t) => t.status === "delivered"),
    [tickets]
  );

  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return delivered;

    return delivered.filter((t) => {
      if (ticketCode(t.id).toLowerCase().includes(query)) return true;
      return t.items.some((it) => {
        const r = resourceMap.get(it.resourceId);
        return `${r?.name ?? ""} ${r?.category ?? ""} ${it.resourceId}`
          .toLowerCase()
          .includes(query);
      });
    });
  }, [q, delivered, resourceMap]);

  const totals = useMemo(() => {
    const totalItems = delivered.reduce((acc, t) => acc + t.items.length, 0);
    const overdueItems = delivered.reduce((acc, t) => acc + overdueCount(t.items), 0);
    return { totalTickets: delivered.length, totalItems, overdueItems };
  }, [delivered]);

  function toggleTicket(id: string) {
    setOpenIds((p) => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-eafit-text">Mis préstamos</div>
            <div className="text-eafit-muted mt-1">
              {totals.totalTickets === 0 ? (
                "Recursos actualmente entregados."
              ) : (
                <>
                  {totals.totalTickets} ticket(s) · {totals.totalItems} recurso(s)
                  {totals.overdueItems > 0 && (
                    <> · <span className="text-status-danger font-semibold">{totals.overdueItems} vencido(s)</span></>
                  )}
                </>
              )}
            </div>
          </div>

          <button className="ui-btn-ghost ui-btn-sm" onClick={() => nav("/")} type="button">
            <span className="ui-btn-label">← Volver al catálogo</span>
          </button>
        </div>

        {/* Search */}
        {delivered.length > 0 && (
          <div className="mt-6 ui-card p-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-eafit-muted">
                <Icons.Search />
              </span>
              <input
                className="w-full h-11 rounded-input border border-eafit-border bg-eafit-bg pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-eafit-secondary/20 focus:border-eafit-secondary/30"
                placeholder="Buscar por ticket, nombre o categoría…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="mt-2 text-[11px] text-eafit-muted">
              Tip: escribe el código del ticket o el nombre del recurso.
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mt-6 ui-card overflow-hidden">
          {delivered.length === 0 ? (
            <div className="p-8">
              <div className="text-lg font-semibold text-eafit-text">Sin préstamos activos</div>
              <div className="text-sm text-eafit-muted mt-1">No tienes recursos entregados actualmente.</div>
              <div className="mt-4">
                <button className="ui-btn-primary" type="button" onClick={() => nav("/")}>
                  <span className="ui-btn-label">Ir al catálogo</span>
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <div className="text-lg font-semibold text-eafit-text">Sin resultados</div>
              <div className="text-sm text-eafit-muted mt-1">Prueba con otro término.</div>
              <div className="mt-4">
                <button className="ui-btn-ghost" type="button" onClick={() => setQ("")}>
                  <span className="ui-btn-label">Limpiar búsqueda</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-eafit-border">
              {filtered.map((t) => {
                const tl = STATUS_META[t.status];
                const isOpen = openIds[t.id] ?? true;
                const overdue = overdueCount(t.items);

                return (
                  <section key={t.id} className="px-6 py-6">
                    {/* Ticket header */}
                    <button
                      type="button"
                      onClick={() => toggleTicket(t.id)}
                      className="w-full text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold text-eafit-text truncate">
                              Ticket {ticketCode(t.id)}
                            </div>
                            {overdue > 0 && (
                              <span className="inline-flex items-center text-[11px] px-2 h-6 rounded-full border border-status-danger/20 bg-status-danger/10 text-status-danger shrink-0">
                                {overdue} vencido(s)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-eafit-muted mt-1">
                            Creado: {fmtDate(t.createdAtISO)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={["inline-flex items-center gap-2 text-[11px] px-3 h-8 rounded-pill border", tl.pill].join(" ")}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${tl.dot}`} aria-hidden />
                            <span className="truncate">{tl.text}</span>
                          </span>

                          <span className="h-8 w-8 rounded-lg border border-eafit-border bg-eafit-surface grid place-items-center text-eafit-muted">
                            <Icons.Chevron open={isOpen} />
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-[11px] text-eafit-muted">
                        {t.items.length} recurso(s) · clic para {isOpen ? "ocultar" : "ver"} detalle
                      </div>
                    </button>

                    {/* Ticket items */}
                    {isOpen && (
                      <div className="mt-4 flex flex-col gap-3">
                        {t.items.map((it) => {
                          const r = resourceMap.get(it.resourceId);
                          const od = isOverdue(it.dueAtISO);
                          const im = od ? ITEM_META.overdue : ITEM_META.ok;

                          return (
                            <div key={it.id} className="ui-card-inner p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="font-semibold text-eafit-text truncate">
                                    {r?.name ?? it.resourceId}
                                  </div>
                                  <div className="text-sm text-eafit-muted truncate">
                                    {r?.category ?? "—"}
                                  </div>
                                  <div className="text-xs text-eafit-muted mt-1">
                                    {it.dueAtISO ? (
                                      <>
                                        Límite:{" "}
                                        <span className={od ? "text-status-danger font-semibold" : ""}>
                                          {fmtDate(it.dueAtISO)}
                                        </span>
                                      </>
                                    ) : (
                                      "Sin fecha límite registrada"
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={["inline-flex items-center text-[11px] px-3 h-7 rounded-pill border shrink-0", im.pill].join(" ")}
                                >
                                  {im.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}