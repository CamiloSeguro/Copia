import type { Resource, ResourceAvailability } from "../types";
import { Modal } from "./Modal";

// =========================
// Types
// =========================

type Props = {
  open: boolean;
  onClose: () => void;
  resource?: Resource | null;
  availability?: ResourceAvailability;
  selected: boolean;
  onToggle: () => void;
};

interface AvailabilityMeta {
  text: string;
  dot: string;
  cls: string;
  disabled: boolean;
}

// =========================
// Constants
// =========================

const AVAILABILITY_META: Record<ResourceAvailability, AvailabilityMeta> = {
  available: {
    text: "Disponible",
    dot: "bg-status-success",
    cls: "bg-status-success/10 text-status-success border-status-success/20",
    disabled: false,
  },
  in_use: {
    text: "En uso",
    dot: "bg-status-warning",
    cls: "bg-status-warning/10 text-status-warning border-status-warning/20",
    disabled: true,
  },
  maintenance: {
    text: "Mantenimiento",
    dot: "bg-status-neutral",
    cls: "bg-status-neutral/10 text-status-neutral border-status-neutral/20",
    disabled: true,
  },
};

const TECH_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  maintenance: "Mantenimiento",
  retired: "Retirado",
};

// =========================
// Icons
// =========================

const Icons = {
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// =========================
// Sub-components
// =========================

function MediaPlaceholder({ name, category }: { name: string; category: string }) {
  const initials =
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-eafit-subtle">
      <div className="h-16 w-16 rounded-2xl bg-eafit-primary/10 border border-eafit-primary/15 grid place-items-center">
        <span className="text-xl font-bold text-eafit-primary select-none">{initials}</span>
      </div>
      <div className="text-[11px] text-eafit-muted font-medium">{category}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const v = value?.trim();
  return (
    <div className="rounded-lg border border-eafit-border bg-eafit-bg px-3 py-2.5 min-w-0">
      <div className="text-[10px] font-semibold text-eafit-muted uppercase tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium text-eafit-text truncate">
        {v ? v : <span className="text-eafit-muted font-normal">—</span>}
      </div>
    </div>
  );
}

// =========================
// Modal
// =========================

export function ResourceDetailModal({
  open,
  onClose,
  resource,
  availability = "available",
  selected,
  onToggle,
}: Props) {
  const r = resource ?? null;
  if (!r) return null;

  const effective: ResourceAvailability =
    r.operationalStatus !== "active" ? "maintenance" : availability;

  const s = AVAILABILITY_META[effective];

  // Bloquear "Agregar" solo si el recurso no está disponible y aún no está seleccionado.
  // Si ya está seleccionado, siempre se permite quitarlo.
  const disabled = !selected && s.disabled;

  const techLabel = TECH_STATUS_LABELS[r.operationalStatus ?? ""] ?? "Retirado";

  return (
    <Modal
      open={open}
      title="Detalle del recurso"
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-eafit-muted min-w-0">
            {selected ? (
              <span>
                Ya está en tu solicitud.{" "}
                <span className="text-eafit-text font-medium">Puedes quitarlo si cambias de opinión.</span>
              </span>
            ) : s.disabled ? (
              <span>
                Recurso <span className="font-semibold text-eafit-text">{s.text.toLowerCase()}</span>{" "}
                — no se puede agregar al ticket.
              </span>
            ) : (
              <span>Revisa la información y agrégalo a tu solicitud.</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:shrink-0">
            <button
              type="button"
              className="ui-btn ui-btn-sm ui-btn-ghost ui-btn-block ui-btn-nowrap min-w-0"
              onClick={onClose}
            >
              <Icons.X />
              <span className="ui-btn-label">Cerrar</span>
            </button>

            <button
              type="button"
              className={[
                "ui-btn ui-btn-sm ui-btn-block ui-btn-nowrap min-w-0",
                disabled ? "ui-btn-disabled" : selected ? "ui-btn-secondary" : "ui-btn-primary",
              ].join(" ")}
              disabled={disabled}
              onClick={!disabled ? onToggle : undefined}
              aria-pressed={!disabled ? selected : undefined}
              title={disabled ? s.text : undefined}
            >
              {disabled ? (
                <span className="ui-btn-label">No disponible</span>
              ) : selected ? (
                <>
                  <Icons.Check />
                  <span className="ui-btn-label">Quitar</span>
                </>
              ) : (
                <>
                  <Icons.Plus />
                  <span className="ui-btn-label">Agregar</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_.9fr] gap-5">
        {/* Preview */}
        <div
          className={[
            "ui-card overflow-hidden transition-all duration-150",
            selected ? "ring-2 ring-eafit-secondary" : "",
          ].join(" ")}
        >
          <div className="relative h-64 md:h-full min-h-[260px]">
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <MediaPlaceholder name={r.name} category={r.category} />
            )}

            <div className="absolute left-4 right-4 top-4 flex items-center gap-2 min-w-0">
              <span className="min-w-0 flex-1">
                <span
                  className={[
                    "w-full inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-pill border font-medium",
                    "min-w-0 max-w-[80px]",
                    s.cls,
                  ].join(" ")}
                  title={s.text}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} aria-hidden />
                  <span className="truncate">{s.text}</span>
                </span>
              </span>

              {selected && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2.5 h-7 rounded-pill border border-eafit-secondary bg-eafit-secondary text-white font-medium">
                  <Icons.Check />
                  <span className="ui-btn-label">En solicitud</span>
                </span>
              )}
            </div>

            {r.imageUrl && (
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h3 className="text-lg font-semibold text-eafit-text leading-6 truncate" title={r.name}>
              {r.name}
            </h3>
            <p className="text-sm text-eafit-muted mt-1">{r.category}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Asset ID" value={r.assetId} />
            <Field label="Estado técnico" value={techLabel} />
          </div>

          <div className="ui-card-inner p-4">
            <div className="text-[10px] font-semibold text-eafit-muted uppercase tracking-wide mb-2">
              Incluye
            </div>
            {r.includes?.length ? (
              <ul className="space-y-1.5">
                {r.includes.map((x) => (
                  <li key={x} className="flex items-center gap-2 text-sm text-eafit-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-eafit-secondary shrink-0" aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-eafit-muted">Sin accesorios registrados.</p>
            )}
          </div>

          <div className="ui-card-inner p-4">
            <div className="text-[10px] font-semibold text-eafit-muted uppercase tracking-wide mb-2">
              Descripción
            </div>
            <p className="text-sm text-eafit-muted leading-6">
              {r.description?.trim() || "Sin descripción registrada para este recurso."}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ResourceDetailModal;