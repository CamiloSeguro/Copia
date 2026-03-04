type Props = {
  count: number;
  onGo: () => void;
};

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h12M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TicketBar({ count, onGo }: Props) {
  if (count <= 0) return null;

  const label =
    count === 1 ? "Recurso seleccionado" : "Recursos seleccionados";

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-40",
        "pointer-events-none", // ✅ solo el contenido clickeable
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-10">
        {/* Card */}
        <div
          className={[
            "pointer-events-auto", // ✅ vuelve clickeable
            "mb-3",
            "rounded-2xl border border-eafit-border bg-eafit-surface/95 backdrop-blur",
            "shadow-top",
            "px-4 sm:px-5 py-3 sm:py-4",
            "animate-[ticketSlide_.18s_ease-out]",
          ].join(" ")}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left */}
            <div className="flex items-start gap-3 min-w-0">
              <span
                className={[
                  "inline-flex items-center justify-center",
                  "min-w-[32px] h-8 px-2 rounded-lg",
                  "bg-eafit-secondary text-white",
                  "text-xs font-semibold shrink-0",
                ].join(" ")}
                aria-label={`${count} seleccionados`}
              >
                {count}
              </span>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-eafit-text leading-tight">
                  Listo para crear tu solicitud
                </div>
                <div
                  className={[
                    "text-xs text-eafit-muted mt-0.5",
                    "leading-snug",
                    "min-w-0",
                    "line-clamp-2", // ✅ 2 líneas en vez de truncate
                  ].join(" ")}
                  title={label}
                >
                  {label}
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={onGo}
              className={[
                "ui-btn-primary",
                "h-11 sm:h-12",
                "px-4 sm:px-5",
                "rounded-xl",
                "w-full sm:w-auto",
                "min-w-0",
                "gap-2",
              ].join(" ")}
              aria-label="Crear solicitud"
            >
              <span className="ui-btn-label">Crear solicitud</span>
              <span className="shrink-0">
                <IconArrow />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Safe-area iOS */}
      <div
        className="h-[max(env(safe-area-inset-bottom),0px)]"
        aria-hidden="true"
      />

      <style>{`
        @keyframes ticketSlide {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}