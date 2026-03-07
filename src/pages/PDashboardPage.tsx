import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLoans, type Ticket } from "../app/loansContext";
import { Topbar } from "../components/TopBar";

// =========================
// Types
// =========================

type Tone = "info" | "warning" | "neutral";

interface ToneMeta {
  pill: string;
  dot: string;
  bar: string;
}

// =========================
// Helpers
// =========================

const TONE_META: Record<Tone, ToneMeta> = {
  info: {
    pill: "border-status-info/20 bg-status-info/10 text-status-info",
    dot: "bg-status-info",
    bar: "bg-status-info/50",
  },
  warning: {
    pill: "border-status-warning/20 bg-status-warning/10 text-status-warning",
    dot: "bg-status-warning",
    bar: "bg-status-warning/50",
  },
  neutral: {
    pill: "border-eafit-border bg-eafit-bg text-eafit-muted",
    dot: "bg-eafit-muted/40",
    bar: "bg-eafit-border",
  },
};

function toneMeta(tone: Tone): ToneMeta {
  return TONE_META[tone];
}

function fmtStart(t: Ticket): string {
  if (t.startDateISO && t.startTime) return `${t.startDateISO} · ${t.startTime}`;
  if (t.startDateISO) return t.startDateISO;
  return "Sin fecha";
}

function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

// =========================
// KPI card
// =========================

interface KPIProps {
  label: string;
  value: number;
  tone: Tone;
  hint: string;
  onClick?: () => void;
}

function KPI({ label, value, tone, hint, onClick }: KPIProps) {
  const m = toneMeta(tone);
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "ui-card p-6 text-left relative overflow-hidden w-full",
        clickable ? "cursor-pointer ui-card-hover" : "cursor-default",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-eafit-secondary/30",
      ].join(" ")}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.bar}`} aria-hidden />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-eafit-text">{label}</div>
        <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} aria-hidden />
      </div>

      <div className="text-3xl font-bold mt-2 leading-none text-eafit-text">{value}</div>

      <div className="text-sm mt-3 text-eafit-muted">{hint}</div>
    </button>
  );
}

// =========================
// Section
// =========================

const SECTION_MAX_ITEMS = 6;

interface SectionProps {
  title: string;
  subtitle: string;
  empty: string;
  emptyIcon: ReactNode;
  items: Ticket[];
  onOpen: (id: string) => void;
  tone: Tone;
  onViewAll?: () => void;
  renderRow?: (t: Ticket) => ReactNode;
}

function Section({ title, subtitle, empty, emptyIcon, items, onOpen, tone, onViewAll, renderRow }: SectionProps) {
  const m = toneMeta(tone);
  const sliced = items.slice(0, SECTION_MAX_ITEMS);
  const hasMore = items.length > SECTION_MAX_ITEMS;

  return (
    <div className="ui-card overflow-hidden">
      <div className="px-6 py-4 border-b border-eafit-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-eafit-text">{title}</div>
              {items.length > 0 && (
                <span className={`inline-flex items-center text-[11px] px-2 h-5 rounded-full border ${m.pill}`}>
                  {items.length}
                </span>
              )}
            </div>
            <div className="text-sm text-eafit-muted mt-1">{subtitle}</div>
          </div>

          {onViewAll && items.length > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className="shrink-0 text-xs font-semibold text-eafit-secondary hover:underline mt-0.5"
            >
              Ver todos →
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-eafit-subtle border border-eafit-border text-eafit-muted">
            {emptyIcon}
          </div>
          <div className="text-sm text-eafit-muted">{empty}</div>
        </div>
      ) : (
        <>
          <div className="max-h-[420px] overflow-auto scroll-soft divide-y divide-eafit-border">
            {sliced.map((t) => (
              <button
                key={t.id}
                className="w-full text-left px-6 py-4 transition hover:bg-eafit-bg/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-eafit-secondary/30"
                onClick={() => onOpen(t.id)}
                type="button"
              >
                {renderRow ? renderRow(t) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-eafit-text">Ticket {ticketCode(t.id)}</div>
                      <div className="text-sm text-eafit-muted mt-1">
                        {t.items.length} ítem(s) · {fmtStart(t)}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${m.pill}`}>
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
                      Pendiente
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {hasMore && onViewAll && (
            <div className="px-6 py-3 border-t border-eafit-border">
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-semibold text-eafit-secondary hover:underline"
              >
                Ver {items.length - SECTION_MAX_ITEMS} más →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =========================
// Page
// =========================

export default function OpsDashboardPage() {
  const nav = useNavigate();
  const { tickets } = useLoans();

  const pendingDelivery = useMemo(
    () => tickets.filter((t) => t.status === "pending_delivery"),
    [tickets]
  );

  const pendingReturn = useMemo(
    () => tickets.filter((t) => t.status === "delivered"),
    [tickets]
  );

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-eafit-text">Panel · Trabajador</div>
            <div className="text-eafit-muted mt-1">Resumen operativo del laboratorio.</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button className="ui-btn-ghost ui-btn-sm" onClick={() => nav("/ops/catalogo")} type="button">
              <span className="ui-btn-label">Gestionar catálogo</span>
            </button>
            <button className="ui-btn-secondary ui-btn-sm" onClick={() => nav("/ops/usuarios")} type="button">
              <span className="ui-btn-label">Administrar usuarios</span>
            </button>
            <button className="ui-btn-primary ui-btn-sm" onClick={() => nav("/ops/solicitudes")} type="button">
              <span className="ui-btn-label">Ver solicitudes →</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPI
            label="Pendientes de entrega"
            value={pendingDelivery.length}
            tone="info"
            hint="Solicitudes listas para entregar"
          />
          <KPI
            label="Recursos en uso"
            value={pendingReturn.length}
            tone="warning"
            hint="Tickets con recursos entregados"
          />
        </div>

        {/* Sections */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Pendientes de entrega"
            subtitle="Solicitudes aprobadas listas para entregar."
            empty="No hay entregas pendientes."
            emptyIcon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            items={pendingDelivery}
            onOpen={(id) => nav(`/ops/ticket/${id}`)}
            tone="info"
            onViewAll={() => nav("/ops/solicitudes")}
          />

          <Section
            title="Pendientes de devolución"
            subtitle="Recursos actualmente entregados a estudiantes."
            empty="Todos los recursos han sido devueltos."
            emptyIcon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            }
            items={pendingReturn}
            onOpen={(id) => nav(`/ops/ticket/${id}`)}
            tone="warning"
            renderRow={(t) => (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-eafit-text truncate">Ticket {ticketCode(t.id)}</div>
                  <div className="text-sm text-eafit-muted mt-1 truncate">
                    {t.userName} · {t.items.length} ítem(s)
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-status-warning/20 bg-status-warning/10 text-status-warning">
                  <span className="h-2 w-2 rounded-full bg-status-warning" aria-hidden />
                  En uso
                </span>
              </div>
            )}
          />
        </div>
      </main>
    </div>
  );
}
