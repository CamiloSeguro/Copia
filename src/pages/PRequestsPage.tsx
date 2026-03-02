import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoans, type Ticket } from "../app/loansContext";
import { Topbar } from "../components/TopBar";

// =========================
// Types
// =========================

type Tab = Ticket["status"];

interface StatusMeta {
  text: string;
  cls: string;
  dot: string;
}

// =========================
// Constants
// =========================

const TAB_LABELS: Record<Tab, string> = {
  pending_delivery: "Pendientes",
  delivered: "Entregados",
  returned: "Devueltos",
  cancelled: "Cancelados",
};

const STATUS_META: Record<Tab, StatusMeta> = {
  pending_delivery: {
    text: "Pendiente entrega",
    cls: "border-status-info/20 bg-status-info/10 text-status-info",
    dot: "bg-status-info",
  },
  delivered: {
    text: "Entregado",
    cls: "border-status-success/20 bg-status-success/10 text-status-success",
    dot: "bg-status-success",
  },
  returned: {
    text: "Devuelto",
    cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
    dot: "bg-status-neutral",
  },
  cancelled: {
    text: "Cancelado",
    cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
    dot: "bg-status-neutral",
  },
};

const TABS: Tab[] = ["pending_delivery", "delivered", "returned", "cancelled"];

// =========================
// Helpers
// =========================

/** Formatea un ISO string a fecha/hora corta en español colombiano. */
function fmt(dtISO?: string): string {
  if (!dtISO) return "—";
  const d = new Date(dtISO);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Formatea el horario de inicio de un ticket. */
function fmtStart(t: Ticket): string {
  if (t.startDateISO && t.startTime) return `${t.startDateISO} · ${t.startTime}`;
  if (t.startDateISO) return `${t.startDateISO} · (sin hora)`;
  return "—";
}

function statusMeta(s: Tab): StatusMeta {
  return STATUS_META[s] ?? {
    text: s,
    cls: "border-eafit-border bg-eafit-bg text-eafit-muted",
    dot: "bg-eafit-muted/40",
  };
}

/** Genera un código corto legible a partir del ID del ticket. */
function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

// =========================
// Sub-components
// =========================

function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={["ui-chip", active ? "ui-chip-on" : "ui-chip-off"].join(" ")}
    >
      {label}
    </button>
  );
}

// =========================
// Page
// =========================

/** Bandeja de tickets para el practicante. Filtra por estado y búsqueda de texto. */
export default function OpsRequestsPage() {
  const nav = useNavigate();
  const { tickets } = useLoans();

  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") ?? "pending_delivery") as Tab;
  const q = sp.get("q") ?? "";

  function setTab(value: Tab) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      value === "pending_delivery" ? next.delete("tab") : next.set("tab", value);
      next.delete("q"); // resetea búsqueda al cambiar de tab
      return next;
    });
  }

  function setQ(value: string) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set("q", value) : next.delete("q");
      return next;
    });
  }

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1)),
    [tickets]
  );

  const counts = useMemo<Record<Tab, number>>(() => {
    const c: Record<Tab, number> = {
      pending_delivery: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };
    for (const t of sorted) c[t.status] += 1;
    return c;
  }, [sorted]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return sorted.filter((t) => {
      if (t.status !== tab) return false;
      if (!query) return true;

      const haystack = [
        t.id,
        ticketCode(t.id),
        "Inmediato",
        statusMeta(t.status).text,
        fmtStart(t),
        String(t.items.length),
        t.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [sorted, tab, q]);

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-eafit-text">Practicante · Solicitudes</div>
            <div className="text-eafit-muted mt-1">
              Bandeja de tickets (solo flujo entrega/devolución).
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="ui-chip ui-chip-on">
                {TAB_LABELS[tab]}: <b>{counts[tab]}</b>
              </span>
              <span className="ui-chip ui-chip-off">
                Mostrando: <b>{filtered.length}</b>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="ui-input h-10 w-full sm:w-72"
              placeholder="Buscar por ticket, fecha/hora, nota…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="ui-btn-ghost h-10" onClick={() => nav("/ops")} type="button">
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 ui-card p-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <TabBtn
                key={t}
                active={tab === t}
                onClick={() => setTab(t)}
                label={`${TAB_LABELS[t]} (${counts[t]})`}
              />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 ui-card overflow-hidden">
          <div className="px-6 py-4 border-b border-eafit-border flex items-center justify-between">
            <div className="text-sm font-semibold text-eafit-text">Tickets</div>
            <span className="text-xs text-eafit-muted">Orden: más recientes primero</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-lg font-semibold text-eafit-text">Sin resultados</div>
              <div className="text-sm text-eafit-muted mt-1">
                Prueba cambiando el tab o la búsqueda.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <button className="ui-btn-ghost" onClick={() => setQ("")} type="button">
                  Limpiar búsqueda
                </button>
                <button
                  className="ui-btn-primary"
                  onClick={() => setTab("pending_delivery")}
                  type="button"
                >
                  Ver pendientes
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-eafit-bg text-eafit-muted">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold">Ticket</th>
                    <th className="text-left px-6 py-4 font-semibold">Ítems</th>
                    <th className="text-left px-6 py-4 font-semibold">Fecha/Hora</th>
                    <th className="text-left px-6 py-4 font-semibold">Estado</th>
                    <th className="text-left px-6 py-4 font-semibold">Creado</th>
                    <th className="text-right px-6 py-4 font-semibold">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-eafit-border">
                  {filtered.map((t) => {
                    const s = statusMeta(t.status);
                    const code = ticketCode(t.id);

                    return (
                      <tr key={t.id} className="hover:bg-eafit-bg/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-eafit-text">{code}</div>
                          <div className="text-xs text-eafit-muted">ID: {t.id}</div>
                        </td>

                        <td className="px-6 py-4 text-eafit-muted">{t.items.length}</td>

                        <td className="px-6 py-4 text-eafit-muted">{fmtStart(t)}</td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${s.cls}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
                            {s.text}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-eafit-muted">{fmt(t.createdAtISO)}</td>

                        <td className="px-6 py-4 text-right">
                          <button
                            className="ui-btn-primary h-10"
                            onClick={() => nav(`/ops/ticket/${t.id}`)}
                            type="button"
                          >
                            Abrir →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-eafit-muted">
          Tip: entra a <b className="text-eafit-text">Pendientes</b> para confirmar entregas. En{" "}
          <b className="text-eafit-text">Entregados</b> puedes confirmar devoluciones.
        </div>
      </main>
    </div>
  );
}