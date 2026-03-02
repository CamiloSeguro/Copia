import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLoans } from "../app/loansContext";
import { mockResources } from "../data/mockResources";
import { Topbar } from "../components/TopBar";
import { Modal } from "../components/Modal";
import type { TicketStatus, TicketItemStatus } from "../types";

// =========================
// Types
// =========================

interface StatusMeta {
  text: string;
  dot: string;
  cls: string;
  hint: string;
  tone: "info" | "ok" | "neutral";
}

interface ItemStatusMeta {
  text: string;
  dot: string;
  cls: string;
}

// =========================
// Helpers
// =========================

/** Un ticket solo puede cancelarse si está pendiente de entrega. */
function canCancel(status: TicketStatus): boolean {
  return status === "pending_delivery";
}

/** Formatea un ISO string a fecha/hora legible en español colombiano. */
function fmtDateTime(iso?: string): string {
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

/** Devuelve los metadatos visuales del estado del ticket. */
function statusMeta(status: TicketStatus): StatusMeta {
  switch (status) {
    case "pending_delivery":
      return {
        text: "Pendiente de entrega",
        dot: "bg-status-info",
        cls: "border-status-info/20 bg-status-info/10 text-status-info",
        hint: "Acércate al laboratorio en el horario seleccionado para confirmar la entrega.",
        tone: "info",
      };
    case "delivered":
      return {
        text: "Entregado",
        dot: "bg-status-success",
        cls: "border-status-success/20 bg-status-success/10 text-status-success",
        hint: "Recuerda devolverlo dentro del horario del laboratorio.",
        tone: "ok",
      };
    case "returned":
      return {
        text: "Devuelto",
        dot: "bg-status-neutral",
        cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
        hint: "Ticket finalizado.",
        tone: "neutral",
      };
    case "cancelled":
      return {
        text: "Cancelado",
        dot: "bg-status-neutral",
        cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
        hint: "Este ticket fue cancelado.",
        tone: "neutral",
      };
    default:
      return {
        text: status ?? "—",
        dot: "bg-eafit-muted/40",
        cls: "border-eafit-border bg-eafit-bg text-eafit-muted",
        hint: "",
        tone: "neutral",
      };
  }
}

/** Devuelve los metadatos visuales del estado de un ítem. */
function itemStatusMeta(status: TicketItemStatus): ItemStatusMeta {
  switch (status) {
    case "delivered":
      return {
        text: "Entregado",
        dot: "bg-status-success",
        cls: "border-status-success/20 bg-status-success/10 text-status-success",
      };
    case "returned":
      return {
        text: "Devuelto",
        dot: "bg-status-neutral",
        cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
      };
    case "cancelled":
      return {
        text: "Cancelado",
        dot: "bg-status-neutral",
        cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
      };
    case "pending":
      return {
        text: "Pendiente",
        dot: "bg-status-info",
        cls: "border-status-info/20 bg-status-info/10 text-status-info",
      };
    default:
      return {
        text: status ?? "—",
        dot: "bg-eafit-muted/40",
        cls: "border-eafit-border bg-eafit-bg text-eafit-muted",
      };
  }
}

/** Genera un código corto legible a partir del ID del ticket. */
function ticketCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

// =========================
// Icons
// =========================

const Icons = {
  ArrowLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.29 3.86l-8.3 14.38A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.71-2.76l-8.3-14.38a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Note: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Rules: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7h10M7 12h10M7 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// =========================
// Sub-components
// =========================

function TicketMetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-eafit-border bg-eafit-bg px-3 py-2.5 min-w-0">
      <div className="text-[10px] font-semibold text-eafit-muted uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-medium text-eafit-text truncate">{value}</div>
    </div>
  );
}

/** Badge de estado reutilizable. */
function StatusBadge({ meta, maxWidth = "240px" }: { meta: StatusMeta | ItemStatusMeta; maxWidth?: string }) {
  return (
    <span
      className={["inline-flex items-center gap-2 text-[11px] px-3 h-8 rounded-pill border min-w-0", meta.cls].join(" ")}
      title={meta.text}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} aria-hidden />
      <span className="truncate" style={{ maxWidth }}>{meta.text}</span>
    </span>
  );
}

// =========================
// Page
// =========================

/** Pantalla de detalle de un ticket de préstamo. */
export default function RequestDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getTicket, cancelTicket } = useLoans();

  const ticket = id ? getTicket(id) : undefined;
  const resourceMap = useMemo(
    () => new Map(mockResources.map((r) => [r.id, r])),
    []
  );
  const [openCancel, setOpenCancel] = useState(false);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!ticket) {
    return (
      <div className="min-h-screen bg-eafit-bg">
        <Topbar />
        <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
          <div className="ui-card p-8">
            <div className="text-eafit-text font-semibold">Ticket no encontrado.</div>
            <button
              className="ui-btn-ghost mt-4"
              onClick={() => nav("/mis-solicitudes")}
              type="button"
            >
              <span className="ui-btn-label">← Volver</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const s = statusMeta(ticket.status);
  const code = ticketCode(ticket.id);
  const cancellable = canCancel(ticket.status);
  const typeText = "Inmediato";
  const scheduleText =
    ticket.startDateISO && ticket.startTime
      ? `${ticket.startDateISO} · ${ticket.startTime}`
      : "Hoy · antes de 6:00pm";

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleConfirmCancel() {
    cancelTicket(ticket!.id);
    setOpenCancel(false);
    nav("/mis-solicitudes");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
        {/* Top actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            className="ui-btn-ghost ui-btn-sm"
            onClick={() => nav("/mis-solicitudes")}
            type="button"
          >
            <Icons.ArrowLeft />
            <span className="ui-btn-label">Volver</span>
          </button>
        </div>

        {/* Header */}
        <div className="mt-5 ui-card p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="text-2xl font-semibold text-eafit-text truncate">
                Ticket {code}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge meta={s} />
                <span className="ui-chip ui-chip-off">Tipo: {typeText}</span>
                <span className="ui-chip ui-chip-off">Ítems: {ticket.items.length}</span>
              </div>

              <div className="text-sm text-eafit-muted mt-3 flex items-start gap-2">
                <span className="mt-[2px] text-eafit-muted">
                  <Icons.Clock />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-eafit-muted">
                    Horario
                  </div>
                  <div className="text-eafit-text font-semibold truncate" title={scheduleText}>
                    {scheduleText}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick meta grid */}
            <div className="grid grid-cols-2 gap-2 w-full lg:w-[360px]">
              <TicketMetaRow label="Creado" value={fmtDateTime(ticket.createdAtISO)} />
              <TicketMetaRow label="Estado" value={s.text} />
              <TicketMetaRow label="Tipo" value={typeText} />
              <TicketMetaRow label="Ítems" value={String(ticket.items.length)} />
            </div>
          </div>

          {s.hint && (
            <div className="mt-5 rounded-card border border-eafit-border bg-eafit-secondary/10 p-4 text-sm text-eafit-text flex items-start gap-3">
              <span className="mt-[2px] text-eafit-secondary">
                <Icons.Alert />
              </span>
              <div className="min-w-0">
                <div className="font-semibold">Qué sigue</div>
                <div className="text-eafit-text/90 mt-0.5">{s.hint}</div>
              </div>
            </div>
          )}

          {/* Cancelar — visible bajo el banner en móvil, oculto aquí en desktop (aparece en aside) */}
          {cancellable && (
            <div className="mt-4 lg:hidden rounded-xl border border-status-danger/20 bg-status-danger/10 p-4">
              <div className="text-sm font-semibold text-status-danger">Cancelar ticket</div>
              <div className="text-sm text-eafit-muted mt-1">
                Solo antes de la entrega. Si ya coordinabas, avisa al practicante.
              </div>
              <button
                className="mt-3 ui-btn-danger ui-btn-sm w-full"
                type="button"
                onClick={() => setOpenCancel(true)}
              >
                <Icons.Trash />
                <span className="ui-btn-label">Cancelar ticket</span>
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* Items */}
          <section className="ui-card p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-eafit-text">Ítems</div>
                <div className="text-sm text-eafit-muted mt-1">
                  Estado de cada recurso dentro del ticket.
                </div>
              </div>
              <div className="text-[11px] text-eafit-muted">
                {ticket.items.length} item{ticket.items.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {ticket.items.map((it) => {
                const r = resourceMap.get(it.resourceId);
                const ist = itemStatusMeta(it.status);

                return (
                  <div
                    key={it.id}
                    className="ui-card-inner p-4 flex items-start justify-between gap-4 hover:bg-eafit-bg/40 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-eafit-text truncate">
                        {r?.name ?? it.resourceId}
                      </div>
                      <div className="text-sm text-eafit-muted truncate">
                        {r?.category ?? "—"}
                      </div>

                      {r?.includes?.length ? (
                        <div className="text-xs text-eafit-muted mt-2 line-clamp-2">
                          <span className="font-semibold text-eafit-text/70">Incluye:</span>{" "}
                          {r.includes.join(", ")}
                        </div>
                      ) : null}

                      {it.deliveredAtISO && (
                        <div className="text-xs text-eafit-muted mt-2">
                          Entregado:{" "}
                          <span className="font-semibold text-eafit-text">
                            {fmtDateTime(it.deliveredAtISO)}
                          </span>
                        </div>
                      )}
                      {it.returnedAtISO && (
                        <div className="text-xs text-eafit-muted mt-1">
                          Devuelto:{" "}
                          <span className="font-semibold text-eafit-text">
                            {fmtDateTime(it.returnedAtISO)}
                          </span>
                        </div>
                      )}
                      {it.dueAtISO && (
                        <div className="text-xs text-eafit-muted mt-1">
                          Límite:{" "}
                          <span className="font-semibold text-eafit-text">
                            {fmtDateTime(it.dueAtISO)}
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="shrink-0">
                      <StatusBadge meta={ist} maxWidth="170px" />
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right rail */}
          <aside className="ui-card p-6 h-fit space-y-4">
            <div className="ui-card-inner p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-eafit-text">
                <Icons.Note />
                Notas
              </div>
              <div className="text-sm text-eafit-muted mt-2 whitespace-pre-wrap">
                {ticket.notes?.trim() || "Sin notas."}
              </div>
            </div>

            <div className="ui-card-inner p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-eafit-text">
                <Icons.Rules />
                Reglas
              </div>
              <div className="text-sm text-eafit-muted mt-2 leading-6">
                Lunes a Viernes de 08:00 am – 18:00 pm 
                <p>No salir del campus</p>
                <p>Practicante confirma entrega/devolución</p>
              </div>
            </div>

            {cancellable && (
              <div className="hidden lg:block rounded-xl border border-status-danger/20 bg-status-danger/10 p-4">
                <div className="text-sm font-semibold text-status-danger">Cancelar</div>
                <div className="text-sm text-eafit-muted mt-1">
                  Solo antes de la entrega. Si ya coordinabas, avisa al practicante.
                </div>
                <button
                  className="mt-3 ui-btn-danger ui-btn-sm w-full"
                  type="button"
                  onClick={() => setOpenCancel(true)}
                >
                  <Icons.Trash />
                  <span className="ui-btn-label">Cancelar ticket</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Modal: confirmar cancelación */}
      <Modal
        open={openCancel}
        title="Cancelar ticket"
        onClose={() => setOpenCancel(false)}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-eafit-muted">Esta acción no se puede deshacer.</div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:shrink-0">
              <button
                className="ui-btn-ghost ui-btn-sm w-full sm:w-auto min-w-0"
                onClick={() => setOpenCancel(false)}
                type="button"
              >
                <span className="ui-btn-label">Volver</span>
              </button>
              <button
                className="ui-btn-danger ui-btn-sm w-full sm:w-auto min-w-0 disabled:opacity-50"
                disabled={!cancellable}
                onClick={handleConfirmCancel}
                type="button"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        }
      >
        <div className="rounded-card border border-status-danger/20 bg-status-danger/10 p-4 text-sm text-status-danger">
          Vas a cancelar el ticket <b>{code}</b>.
        </div>

        <div className="mt-4 rounded-card border border-eafit-border bg-eafit-bg p-4 text-sm text-eafit-text">
          <div className="font-semibold">Resumen</div>
          <div className="text-eafit-muted mt-1">
            Estado actual: <b className="text-eafit-text">{s.text}</b> · Ítems:{" "}
            <b className="text-eafit-text">{ticket.items.length}</b>
          </div>
          <div className="text-eafit-muted mt-1">
            Tipo: <b className="text-eafit-text">{typeText}</b> · Horario:{" "}
            <b className="text-eafit-text">{scheduleText}</b>
          </div>
        </div>
      </Modal>
    </div>
  );
}