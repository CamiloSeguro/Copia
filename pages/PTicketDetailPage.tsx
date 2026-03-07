import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLoans, type Ticket } from "../app/loansContext";
import { useCatalog } from "../app/catalogContext";
import { Modal } from "../components/Modal";
import { Topbar } from "../components/TopBar";

/* =============================
   TYPES
============================= */

type ChecklistState = {
  idOk: boolean;
  accessoriesOk: boolean;
  physicalOk: boolean;
  userPresent: boolean;
};

const initialChecklist: ChecklistState = {
  idOk: false,
  accessoriesOk: false,
  physicalOk: false,
  userPresent: false,
};

type Tone = "info" | "danger" | "success" | "neutral";

/* =============================
   HELPERS
============================= */

function fmt(dtISO?: string) {
  if (!dtISO) return "—";
  try {
    const d = new Date(dtISO);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtStart(t: Ticket) {
  if (t.startDateISO && t.startTime) return `${t.startDateISO} · ${t.startTime}`;
  if (t.startDateISO) return `${t.startDateISO} · (sin hora)`;
  return "—";
}

function statusMeta(s: Ticket["status"]): { text: string; cls: string; dot: string; tone: Tone } {
  switch (s) {
    case "pending_delivery":
      return {
        text: "Pendiente entrega",
        cls: "border-status-info/20 bg-status-info/10 text-status-info",
        dot: "bg-status-info",
        tone: "info",
      };

    case "delivered":
      return {
        text: "Entregado",
        cls: "border-status-success/20 bg-status-success/10 text-status-success",
        dot: "bg-status-success",
        tone: "success",
      };

    case "returned":
      return {
        text: "Devuelto",
        cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral",
        dot: "bg-status-neutral",
        tone: "neutral",
      };

    case "cancelled":
      return {
        text: "Cancelado",
        cls: "border-eafit-border bg-eafit-bg text-eafit-muted",
        dot: "bg-eafit-muted/40",
        tone: "neutral",
      };

    default:
      return {
        text: s,
        cls: "border-eafit-border bg-eafit-bg text-eafit-muted",
        dot: "bg-eafit-muted/40",
        tone: "neutral",
      };
  }
}

function itemStatusMeta(s: Ticket["items"][number]["status"]) {
  if (s === "delivered")
    return { text: "Entregado", cls: "border-status-success/20 bg-status-success/10 text-status-success" };
  if (s === "returned")
    return { text: "Devuelto", cls: "border-status-neutral/20 bg-status-neutral/10 text-status-neutral" };
  if (s === "pending")
    return { text: "Pendiente", cls: "border-status-info/20 bg-status-info/10 text-status-info" };
  if (s === "cancelled")
    return { text: "Cancelado", cls: "border-eafit-border bg-eafit-bg text-eafit-muted" };
  return { text: s, cls: "border-eafit-border bg-eafit-bg text-eafit-muted" };
}

/* =============================
   PAGE
============================= */

export default function OpsTicketDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { getTicket, confirmDelivery, confirmReturn } = useLoans();

  const ticket = id ? getTicket(id) : undefined;

  const { resources } = useCatalog();

  const resourceMap = useMemo(
  () => new Map(resources.map((r) => [r.id, r] as const)),
  [resources]
);

  /* =============================
     STATES
  ============================= */

  const [openDelivery, setOpenDelivery] = useState(false);
  const [deliveryChecklist, setDeliveryChecklist] = useState<ChecklistState>(initialChecklist);
  const [deliveryError, setDeliveryError] = useState<string>("");

  const [openReturn, setOpenReturn] = useState(false);
  const [returnChecklist, setReturnChecklist] = useState<ChecklistState>(initialChecklist);
  const [returnError, setReturnError] = useState<string>("");

  if (!ticket) {
    return (
      <div className="min-h-screen bg-eafit-bg">
        <Topbar />
        <main className="mx-auto max-w-content px-6 py-10">
          <div className="ui-card p-8">
            <div className="text-eafit-text font-semibold">Ticket no encontrado.</div>
            <button className="ui-btn-ghost mt-4" onClick={() => nav("/ops")} type="button">
              ← Volver
            </button>
          </div>
        </main>
      </div>
    );
  }

  const s = statusMeta(ticket.status);

  const canConfirmDelivery = ticket.status === "pending_delivery";
  const canConfirmReturn = ticket.status === "delivered";

  const deliveryOk =
    deliveryChecklist.userPresent &&
    deliveryChecklist.idOk &&
    deliveryChecklist.accessoriesOk &&
    deliveryChecklist.physicalOk;

  const returnOk =
    returnChecklist.userPresent &&
    returnChecklist.idOk &&
    returnChecklist.accessoriesOk &&
    returnChecklist.physicalOk;

  const nextAction = canConfirmDelivery
    ? "Confirma la entrega con el checklist."
    : canConfirmReturn
    ? "Confirma la devolución con el checklist."
    : "No hay acciones pendientes para este ticket.";

  /* =============================
     UI
  ============================= */

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-eafit-text">
              Ticket {ticket.id.slice(-6).toUpperCase()}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${s.cls}`}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
                {s.text}
              </span>

              <span className="ui-chip ui-chip-off">Inmediato</span>

              <span className="ui-chip ui-chip-off">
                {ticket.items.length} tipo(s) · {ticket.items.reduce((sum, it) => sum + (it.quantity ?? 1), 0)} ud.
              </span>

              <span className="ui-chip ui-chip-off">Fecha/Hora: {fmtStart(ticket)}</span>
            </div>

            <div className="mt-3 rounded-card border border-eafit-border bg-eafit-secondary/10 p-4 text-sm text-eafit-text">
              <div className="font-semibold">Siguiente acción</div>
              <div className="mt-1">{nextAction}</div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button className="ui-btn-primary ui-btn-sm" onClick={() => nav("/ops")} type="button">
              ← Solicitudes
            </button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ITEMS */}
          <section className="ui-card p-6">
            <div className="text-sm font-semibold text-eafit-text">Ítems del ticket</div>

            <div className="mt-5 flex flex-col gap-4">
              {ticket.items.map((it) => {
                const r = resourceMap.get(it.resourceId);
                const ist = itemStatusMeta(it.status);

                return (
                  <div key={it.id} className="rounded-card border border-eafit-border p-4 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-eafit-text">
                          {r?.name ?? "Recurso no encontrado"}
                        </div>
                        <div className="text-sm text-eafit-muted">
                          {r?.category ?? "Puede haber sido eliminado del catálogo"}
                        </div>
                        <div className="text-xs text-eafit-muted mt-1">
                          Cantidad: <span className="font-medium text-eafit-text">{it.quantity ?? 1}</span>
                        </div>

                        {it.deliveredAtISO ? (
                          <div className="text-xs text-eafit-muted mt-2">
                            Entregado: {fmt(it.deliveredAtISO)}
                          </div>
                        ) : null}

                        {it.dueAtISO ? (
                          <div className="text-xs text-eafit-muted mt-1">
                            Límite (referencia): {fmt(it.dueAtISO)}
                          </div>
                        ) : null}

                        {it.returnedAtISO ? (
                          <div className="text-xs text-eafit-muted mt-1">
                            Devuelto: {fmt(it.returnedAtISO)}
                          </div>
                        ) : null}
                      </div>

                      <span className={`shrink-0 inline-flex items-center text-xs px-3 py-1 rounded-full border ${ist.cls}`}>
                        {ist.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ACTION PANEL */}
          <aside className="ui-card p-6 h-fit sticky top-24">
            <div className="text-sm font-semibold text-eafit-text">Acciones</div>
            <div className="text-sm text-eafit-muted mt-2">Disponibles según estado.</div>

            <div className="mt-6 flex flex-col gap-3">
              {canConfirmDelivery && (
                <button
                  className="ui-btn-primary h-12"
                  onClick={() => {
                    setDeliveryChecklist(initialChecklist);
                    setDeliveryError("");
                    setOpenDelivery(true);
                  }}
                  type="button"
                >
                  Confirmar entrega
                </button>
              )}

              {canConfirmReturn && (
                <button
                  className="ui-btn-primary h-12"
                  onClick={() => {
                    setReturnChecklist(initialChecklist);
                    setReturnError("");
                    setOpenReturn(true);
                  }}
                  type="button"
                >
                  Confirmar devolución
                </button>
              )}

              {!canConfirmDelivery && !canConfirmReturn ? (
                <div className="rounded-card border border-eafit-border bg-eafit-bg p-4 text-sm text-eafit-muted">
                  No hay acciones disponibles para este estado.
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-card border border-eafit-border bg-eafit-bg p-4 text-sm text-eafit-text">
              <div className="font-semibold">Regla</div>
              <div className="text-eafit-muted mt-1">
                La entrega y devolución deben ser confirmadas por trabajador.
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* DELIVERY MODAL */}
      <Modal
        open={openDelivery}
        title="Confirmar entrega"
        onClose={() => {
          setOpenDelivery(false);
          setDeliveryError("");
        }}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-eafit-muted">Completa el checklist para confirmar.</div>
            <div className="flex gap-2">
              <button
                className="ui-btn-ghost h-10"
                onClick={() => {
                  setOpenDelivery(false);
                  setDeliveryError("");
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="ui-btn-primary h-10 disabled:opacity-50"
                disabled={!deliveryOk}
                onClick={() => {
                  try {
                    confirmDelivery(ticket.id);
                    setOpenDelivery(false);
                    setDeliveryError("");
                  } catch (e: any) {
                    setDeliveryError(e?.message ?? "No se pudo confirmar la entrega.");
                  }
                }}
                type="button"
              >
                Confirmar
              </button>
            </div>
          </div>
        }
      >
        {deliveryError ? (
          <div className="mb-3 rounded-card border border-status-danger/20 bg-status-danger/10 p-3 text-sm text-status-danger">
            {deliveryError}
          </div>
        ) : null}

        <Checklist value={deliveryChecklist} onChange={setDeliveryChecklist} />
      </Modal>

      {/* RETURN MODAL */}
      <Modal
        open={openReturn}
        title="Confirmar devolución"
        onClose={() => {
          setOpenReturn(false);
          setReturnError("");
        }}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-eafit-muted">Completa el checklist para confirmar.</div>
            <div className="flex gap-2">
              <button
                className="ui-btn-ghost h-10"
                onClick={() => {
                  setOpenReturn(false);
                  setReturnError("");
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="ui-btn-primary h-10 disabled:opacity-50"
                disabled={!returnOk}
                onClick={() => {
                  try {
                    confirmReturn(ticket.id);
                    setOpenReturn(false);
                    setReturnError("");
                  } catch (e: any) {
                    setReturnError(e?.message ?? "No se pudo confirmar la devolución.");
                  }
                }}
                type="button"
              >
                Confirmar
              </button>
            </div>
          </div>
        }
      >
        {returnError ? (
          <div className="mb-3 rounded-card border border-status-danger/20 bg-status-danger/10 p-3 text-sm text-status-danger">
            {returnError}
          </div>
        ) : null}

        <Checklist value={returnChecklist} onChange={setReturnChecklist} />
      </Modal>
    </div>
  );
}

/* =============================
   CHECKLIST
============================= */

function Checklist({
  value,
  onChange,
}: {
  value: ChecklistState;
  onChange: (v: ChecklistState) => void;
}) {
  const Item = ({
    checked,
    label,
    onChecked,
  }: {
    checked: boolean;
    label: string;
    onChecked: (v: boolean) => void;
  }) => (
    <label className="flex items-center justify-between gap-4 rounded-btn border border-eafit-border px-4 py-3 bg-white">
      <span className="text-sm text-eafit-text">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChecked(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <Item
        checked={value.userPresent}
        label="Usuario presente"
        onChecked={(v) => onChange({ ...value, userPresent: v })}
      />
      <Item
        checked={value.idOk}
        label="Identificación verificada"
        onChecked={(v) => onChange({ ...value, idOk: v })}
      />
      <Item
        checked={value.accessoriesOk}
        label="Accesorios completos"
        onChecked={(v) => onChange({ ...value, accessoriesOk: v })}
      />
      <Item
        checked={value.physicalOk}
        label="Estado físico revisado"
        onChecked={(v) => onChange({ ...value, physicalOk: v })}
      />
    </div>
  );
}