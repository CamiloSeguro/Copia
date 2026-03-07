import { useMemo, useState } from "react";
import type { Resource, ResourceAvailability } from "../types";

type Props = {
  resource: Resource;
  availability: ResourceAvailability;
  selected: boolean;
  onToggle: () => void;
  onOpenDetail?: () => void;
};

const META: Record<
  ResourceAvailability,
  { text: string; dot: string; pill: string; disabled: boolean; helper: string }
> = {
  available: {
    text: "Disponible",
    dot: "bg-status-success",
    pill: "bg-status-success/10 text-status-success border-status-success/20",
    disabled: false,
    helper: "",
  },
  in_use: {
    text: "En uso",
    dot: "bg-status-warning",
    pill: "bg-status-warning/10 text-status-warning border-status-warning/20",
    disabled: true,
    helper: "Está prestado actualmente.",
  },
};

const Icons = {
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 9h10v10H9V9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

function assetIdOf(r: Resource) {
  return String(r.assetId ?? r.code ?? "").trim();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function MediaPlaceholder({ name, category }: { name: string; category: string }) {
  const initials =
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-eafit-subtle">
      <div className="h-14 w-14 rounded-2xl bg-eafit-primary/10 border border-eafit-primary/15 grid place-items-center">
        <span className="text-lg font-bold text-eafit-primary select-none">{initials}</span>
      </div>
      <div className="text-[11px] text-eafit-muted font-medium">{category}</div>
    </div>
  );
}

export function ResourceCard({ resource, availability, selected, onToggle, onOpenDetail }: Props) {
  const s = META[availability];
  const disabled = s.disabled;
  const canOpen = !!onOpenDetail;

  const assetId = useMemo(() => assetIdOf(resource), [resource]);
  const showId = !!assetId;

  const [copied, setCopied] = useState(false);
  const [selectKey, setSelectKey] = useState(0);

  function handleToggle() {
    if (!disabled) {
      setSelectKey((k) => k + 1);
      onToggle();
    }
  }

  const handleCopy = async () => {
    if (!assetId) return;
    const ok = await copyText(assetId.toUpperCase());
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article
      key={selectKey}
      className={[
        "ui-card ui-card-hover overflow-hidden transition-all duration-150",
        selected ? "ring-2 ring-eafit-secondary shadow-card" : "",
        selectKey > 0 ? "animate-card-select" : "",
      ].join(" ")}
      aria-selected={selected}
    >
      {/* MEDIA */}
      <div
        className={[
          "relative h-40 bg-gradient-to-b from-white to-eafit-subtle overflow-hidden flex items-center justify-center p-6",
          canOpen ? "cursor-pointer group" : "",
        ].join(" ")}
        onClick={canOpen ? onOpenDetail : undefined}
        role={canOpen ? "button" : undefined}
        tabIndex={canOpen ? -1 : undefined}
        aria-label={canOpen ? `Ver detalle de ${resource.name}` : undefined}
      >
        {resource.imageUrl ? (
          <img src={resource.imageUrl} alt={resource.name} className="max-h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
        ) : (
          <MediaPlaceholder name={resource.name} category={resource.category} />
        )}
        {canOpen && (
          <div className="absolute inset-0 bg-eafit-primary/0 group-hover:bg-eafit-primary/4 transition-colors duration-200" />
        )}

        {/* Pills sobre la imagen */}
<div className="absolute left-4 right-4 top-4 flex items-center gap-2 min-w-0">
  {/* Estado: ancho contenido, con max y truncate */}
  <span
    className={[
      "inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-pill border",
      "font-medium min-w-0 max-w-[160px] sm:max-w-[190px]",
      s.pill,
    ].join(" ")}
    title={s.text}
  >
    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
    <span className="truncate">{s.text}</span>
  </span>

  {/* Badge: siempre a la derecha */}
  {selected && (
    <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] px-2.5 h-7 rounded-pill border border-eafit-secondary bg-eafit-secondary text-white font-medium">
      <span className="truncate">En solicitud</span>
    </span>
  )}
</div>

      </div>

      {/* CONTENT */}
      <div className="p-5 flex flex-col gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-eafit-text leading-6 truncate" title={resource.name}>
            {resource.name}
          </h3>

          <div className="text-xs text-eafit-muted mt-1">
            {resource.includes?.length ? (
              <span className="line-clamp-2">
                <span className="font-medium text-eafit-text/70">Incluye: </span>
                {resource.includes.join(", ")}
              </span>
            ) : (
              <span>Sin accesorios registrados</span>
            )}
          </div>
        </div>

        {/* Asset ID */}
        {showId && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 h-8 rounded-lg border border-eafit-border bg-eafit-bg px-3 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-eafit-muted uppercase tracking-wide">ID</span>
              <span className="text-xs font-semibold text-eafit-text truncate">{assetId.toUpperCase()}</span>
            </div>

            <button
              type="button"
              className={[
                "h-8 w-8 rounded-lg border transition grid place-items-center shrink-0",
                copied
                  ? "border-status-success/30 bg-status-success/10 text-status-success"
                  : "border-eafit-border bg-eafit-bg hover:bg-eafit-surface text-eafit-muted hover:text-eafit-text",
              ].join(" ")}
              onClick={handleCopy}
              title={copied ? "Copiado" : "Copiar ID"}
              aria-label="Copiar ID"
            >
              {copied ? <Icons.Check /> : <Icons.Copy />}
            </button>
          </div>
        )}

        {/* Razón */}
        {disabled && (
          <div className="flex items-center gap-1.5 text-[11px] text-eafit-muted bg-eafit-subtle rounded-lg px-3 py-2">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} aria-hidden />
            <span className="min-w-0 truncate">{s.helper}</span>
          </div>
        )}

        <div className="pt-1 grid grid-cols-2 gap-2 items-stretch">
  {/* Detalle */}
  <button
    type="button"
    className={[
      "ui-btn ui-btn-ghost ui-btn-block min-w-0",
      "h-auto min-h-11 py-2 px-3",
      "flex-col gap-1.5",
      canOpen ? "" : "ui-btn-disabled cursor-not-allowed",
    ].join(" ")}
    onClick={canOpen ? onOpenDetail : undefined}
    disabled={!canOpen}
  >
    <span className="shrink-0"><Icons.Info /></span>
    <span className="ui-btn-label-wrap text-[12px]">Ver detalle</span>
  </button>

  {/* Agregar */}
  <button
    type="button"
    className={[
      "ui-btn ui-btn-block min-w-0",
      "h-auto min-h-11 py-2 px-3",
      "flex-col gap-1.5",
      disabled
        ? "ui-btn-disabled cursor-not-allowed"
        : selected
          ? "ui-btn-secondary"
          : "ui-btn-primary",
    ].join(" ")}
    onClick={!disabled ? handleToggle : undefined}
    disabled={disabled}
    aria-pressed={!disabled ? selected : undefined}
    title={disabled ? s.helper : undefined}
  >
    <span className="shrink-0">
      {disabled ? null : selected ? <Icons.Check /> : <Icons.Plus />}
    </span>

    <span className="ui-btn-label-wrap text-[12px]">
      {disabled ? "No disponible" : selected ? "Agregado" : "Agregar"}
    </span>
  </button>
</div>
      </div>
    </article>
  );
}