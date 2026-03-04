import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoans, type Ticket } from "../app/loansContext";
import { Topbar } from "../components/TopBar";

// =========================
// Types
// =========================

type Tone = "info" | "warning" | "danger" | "neutral";

interface ToneMeta {
  pill: string;
  dot: string;
  bar: string;
}

// =========================
// Helpers
// =========================

const STATUS_LABELS: Record<Ticket["status"], string> = {
  pending_delivery: "Pendiente",
  delivered: "Entregado",
  returned: "Devuelto",
  cancelled: "Cancelado",
};

function ticketStatusLabel(status: Ticket["status"]): string {
  return STATUS_LABELS[status] ?? status;
}

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
  danger: {
    pill: "border-status-danger/20 bg-status-danger/10 text-status-danger",
    dot: "bg-status-danger",
    bar: "bg-status-danger/50",
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

/** Formatea el horario de inicio de un ticket. */
function fmtStart(t: Ticket): string {
  if (t.startDateISO && t.startTime) return `${t.startDateISO} · ${t.startTime}`;
  if (t.startDateISO) return `${t.startDateISO} · (sin hora)`;
  return "Sin fecha/hora";
}

/** Genera un código corto legible a partir del ID del ticket. */
function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

// =========================
// Sub-components
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
        "ui-card ui-card-hover p-6 text-left relative overflow-hidden",
        clickable ? "cursor-pointer" : "cursor-default",
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

const SECTION_MAX_ITEMS = 6;

interface SectionProps {
  title: string;
  subtitle: string;
  empty: string;
  items: Ticket[];
  onOpen: (id: string) => void;
  tone: Tone;
  onViewAll?: () => void;
}

function Section({ title, subtitle, empty, items, onOpen, tone }: SectionProps) {
  const m = toneMeta(tone);
  const sliced = items.slice(0, SECTION_MAX_ITEMS);
  

  return (
    <div className="ui-card overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-eafit-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-eafit-text">{title}</div>
            <div className="text-sm text-eafit-muted mt-1">{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="p-6 text-eafit-muted">{empty}</div>
      ) : (
        <div className="max-h-[420px] overflow-auto scroll-soft divide-y divide-eafit-border">
          {sliced.map((t) => (
            <button
              key={t.id}
              className="w-full text-left px-6 py-4 transition hover:bg-eafit-bg/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-eafit-secondary/30"
              onClick={() => onOpen(t.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-eafit-text">Ticket {ticketCode(t.id)}</div>
                  <div className="text-sm text-eafit-muted mt-1">
                    Ítems: {t.items.length} · {fmtStart(t)}
                  </div>
                </div>

                <span className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${m.pill}`}>
                  <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
                  {ticketStatusLabel(t.status)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// Page
// =========================

/** Dashboard del trabajador: muestra solo tickets pendientes de entrega. */
export default function OpsDashboardPage() {
  const nav = useNavigate();
  const { tickets } = useLoans();

  const pendingDelivery = useMemo(
    () => tickets.filter((t) => t.status === "pending_delivery"),
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
            <div className="text-eafit-muted mt-1">Vista rápida: Solo entregas pendientes.</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              className="ui-btn-ghost ui-btn-sm"
              onClick={() => nav("/ops/catalogo")}
              type="button"
            >
              <span className="ui-btn-label">Gestionar catálogo</span>
            </button>

            <button
              className="ui-btn-secondary ui-btn-sm"
              onClick={() => nav("/ops/usuarios")}
              type="button"
            >
              <span className="ui-btn-label">Administrar usuarios</span>
            </button>

            <button
              className="ui-btn-primary ui-btn-sm"
              onClick={() => nav("/ops/solicitudes")}
              type="button"
            >
              <span className="ui-btn-label">Ver solicitudes →</span>
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="mt-8">
          <KPI
            label="Pendientes de entrega"
            value={pendingDelivery.length}
            tone="info"
            hint="Abrir bandeja de solicitudes"
            onClick={() => nav("/ops/solicitudes")}
          />
        </div>

        {/* Lista de pendientes */}
        <div className="mt-8">
          <Section
            title="Pendientes de entrega"
            subtitle="Solicitudes auto-aprobadas listas para entregar."
            empty="No hay tickets pendientes."
            items={pendingDelivery}
            onOpen={(id) => nav(`/ops/ticket/${id}`)}
            tone="info"
            onViewAll={() => nav("/ops/solicitudes")}
          />
        </div>

        {/* Footer tip */}
        <div className="mt-10 ui-card p-6">
          <div className="text-sm font-semibold text-eafit-text">Tip</div>
          <div className="text-sm text-eafit-muted mt-2 leading-6">
            Abre el ticket para confirmar{" "}
            <b className="text-eafit-text">entrega</b> o{" "}
            <b className="text-eafit-text">devolución</b>.
          </div>
        </div>
      </main>
    </div>
  );
}