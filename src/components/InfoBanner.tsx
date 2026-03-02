import { useState } from "react";

// =========================
// Icons (mini)
// =========================

const Icons = {
  Info: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  ),
  Clock: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Phone: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <path
        d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.29 21 3 13.71 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Shield: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <path
        d="M12 3L4 7v5c0 4.42 3.37 8.56 8 9.56C17.63 20.56 21 16.42 21 12V7l-9-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: (p: React.SVGProps<SVGSVGElement>) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// =========================
// Small UI bits
// =========================

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-eafit-border bg-eafit-subtle text-xs text-eafit-text">
      <span className="text-eafit-secondary">{icon}</span>
      {label}
    </span>
  );
}

function PolicySection({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-eafit-secondary">{icon}</span>
        <span className="text-xs font-semibold text-eafit-text uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-eafit-text/90">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-eafit-secondary shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

// =========================
// Policy Modal
// =========================

function PolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="policy-title">
      <button type="button" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar" />

      <div className="relative w-full max-w-lg ui-card overflow-hidden">
        <header className="flex items-center justify-between px-6 py-5 border-b border-eafit-border">
          <div>
            <div className="text-xs text-eafit-muted font-medium">Escuela de Artes y Humanidades</div>
            <h2 id="policy-title" className="text-base font-semibold text-eafit-text mt-0.5">
              Política de préstamo de recursos
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-eafit-border bg-eafit-bg hover:bg-eafit-surface transition grid place-items-center text-eafit-muted hover:text-eafit-text"
            aria-label="Cerrar"
          >
            <Icons.X />
          </button>
        </header>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto scroll-soft">
          <PolicySection
            icon={<Icons.Clock />}
            title="Horario de atención"
            items={[
              "Lunes a viernes: 8:00 a.m. – 6:00 p.m.",
              "No se realizan préstamos fuera de este horario.",
              "La entrega y devolución deben ser confirmadas por un practicante.",
            ]}
          />

          <PolicySection
            icon={<Icons.Shield />}
            title="Condiciones de uso"
            items={[
              "Los equipos no pueden salir del campus bajo ninguna circunstancia.",
              "El tiempo máximo de préstamo es de un día hábil (hasta las 6:00 p.m.).",
              "El estudiante es responsable del equipo desde la entrega hasta la devolución.",
              "En caso de daño o pérdida, el estudiante asume los costos de reparación o reposición.",
              "No se permite ceder el equipo a terceros.",
            ]}
          />

          <PolicySection
            icon={<Icons.Phone />}
            title="Contacto del laboratorio"
            items={[
              "MediaLab — Bloque 38, piso 2.",
              "Correo: medialab@eafit.edu.co",
              "Para incidencias urgentes, dirígete directamente al laboratorio.",
            ]}
          />
        </div>

        <footer className="px-6 py-4 border-t border-eafit-border bg-eafit-subtle flex items-center justify-between gap-3">
          <span className="text-xs text-eafit-muted">Al solicitar un préstamo aceptas estas condiciones.</span>
          <button type="button" onClick={onClose} className="ui-btn-primary ui-btn-sm">
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}

// =========================
// InfoBanner
// =========================

export function InfoBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="w-full" aria-label="Información de préstamos">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 pt-6">
          <div role="note" className="ui-card overflow-hidden border-l-4 border-l-eafit-secondary">
            <div className="px-5 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0 h-8 w-8 rounded-md border border-eafit-secondary/20 bg-eafit-secondary/10 grid place-items-center text-eafit-secondary">
                    <Icons.Info />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-eafit-text">Información importante</div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <InfoPill icon={<Icons.Clock />} label="L–V 8:00–18:00" />
                      <InfoPill icon={<Icons.Shield />} label="No salen del campus" />
                      <InfoPill icon={<Icons.Clock />} label="Máx. 1 día hábil" />
                      <InfoPill icon={<Icons.Phone />} label="medialab@eafit.edu.co" />
                    </div>

                    <p className="mt-2 text-xs text-eafit-muted">
                      Entrega y devolución deben ser confirmadas por un practicante.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-11 sm:pl-0">
                  <button type="button" onClick={() => setOpen(true)} className="ui-btn-ghost ui-btn-sm text-xs whitespace-nowrap">
                    Ver política completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {open && <PolicyModal onClose={() => setOpen(false)} />}
    </>
  );
}