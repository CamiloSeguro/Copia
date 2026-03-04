import { useEffect, useRef, useState } from "react";
import type { AvailabilityFilter } from "../types";

type Props = {
  categories: string[];
  selectedCategory: string | "all";
  onSelectCategory: (v: string | "all") => void;
  selectedAvailability: AvailabilityFilter;
  onSelectAvailability: (v: AvailabilityFilter) => void;
};

const AVAILABILITY: Array<{
  key: AvailabilityFilter;
  label: string;
  dot: string;
  helper: string;
}> = [
  { key: "all", label: "Todas", dot: "bg-eafit-muted", helper: "Muestra todo el inventario." },
  { key: "available", label: "Disponible", dot: "bg-status-success", helper: "Se puede pedir ahora." },
];

function Dot({ cls }: { cls: string }) {
  return <span className={`h-2 w-2 rounded-full ${cls}`} aria-hidden />;
}

const catLabel = (v: string | "all") => (v === "all" ? "Todas las categorías" : v);

export function FiltersSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedAvailability,
  onSelectAvailability,
}: Props) {
  const hasActive = selectedCategory !== "all" || selectedAvailability !== "all";

  const options = ["all" as const, ...[...categories].sort((a, b) => a.localeCompare(b))] as Array<
    "all" | string
  >;

  const selectedIdx = Math.max(0, options.findIndex((x) => x === selectedCategory));

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  const clear = () => {
    onSelectCategory("all");
    onSelectAvailability("all");
  };

  // al abrir: posiciona el foco "virtual" en el seleccionado
  useEffect(() => {
    if (open) setActiveIdx(selectedIdx);
  }, [open, selectedIdx]);

  // teclado cuando el menú está abierto
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "ArrowDown":
          e.preventDefault();
          setActiveIdx((p) => Math.min(p + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIdx((p) => Math.max(0, p - 1));
          break;
        case "Home":
          e.preventDefault();
          setActiveIdx(0);
          break;
        case "End":
          e.preventDefault();
          setActiveIdx(options.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          onSelectCategory(options[activeIdx]);
          close();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, activeIdx, options, onSelectCategory]);

  // asegura que el item activo quede visible
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIdx]);

  return (
    <aside className="ui-card p-6 w-[300px] max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-eafit-text">Filtros</div>
          <div className="text-xs text-eafit-muted mt-1">Ajusta por categoría y disponibilidad.</div>
        </div>
        {hasActive && (
  <button
    type="button"
    onClick={clear}
    className={[
      "inline-flex items-center gap-1.5 shrink-0",
      "h-7 px-2.5 rounded-md",
      "text-[11px] font-semibold",
      "bg-eafit-subtle text-eafit-text border border-eafit-border",
      "hover:bg-eafit-bg",
      "transition",
    ].join(" ")}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    Limpiar
  </button>
)}
      </div>

      <div className="mt-5 h-px bg-eafit-border" />

      {/* Categoría */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-eafit-muted">Categoría</div>

        <div className="mt-2 relative">
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={[
              "w-full h-11 rounded-lg border px-3.5 flex items-center justify-between gap-3 transition",
              "bg-eafit-surface hover:bg-eafit-bg",
              open ? "border-eafit-secondary/30 ring-2 ring-eafit-secondary/10" : "border-eafit-border",
            ].join(" ")}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="text-sm text-eafit-text truncate">{catLabel(selectedCategory)}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className={`shrink-0 text-eafit-muted transition ${open ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <>
              <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={close} aria-label="Cerrar" />

              <div
                ref={menuRef}
                className="absolute z-50 mt-2 w-full rounded-xl border border-eafit-border bg-eafit-surface shadow-soft overflow-hidden"
                role="listbox"
                aria-label="Categorías"
              >
                <div className="max-h-[260px] overflow-auto p-1">
                  {options.map((c, idx) => {
                    const active = idx === activeIdx;
                    const selected = c === selectedCategory;

                    return (
                      <button
                        key={String(c)}
                        type="button"
                        data-idx={idx}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => {
                          onSelectCategory(c);
                          close();
                        }}
                        className={[
                          "w-full px-3 py-2 rounded-lg text-left flex items-center justify-between gap-3 transition",
                          active ? "bg-eafit-bg" : "hover:bg-eafit-bg",
                        ].join(" ")}
                      >
                        <span className="text-sm text-eafit-text truncate">{catLabel(c)}</span>
                        <span className={selected ? "text-xs text-eafit-secondary font-semibold" : "text-xs text-eafit-muted"}>
                          {selected ? "✓" : " "}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-2 border-t border-eafit-border text-[11px] text-eafit-muted flex items-center justify-between">
                  <span>↑↓ navegar · Enter</span>
                  <span>ESC</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-2 text-[11px] text-eafit-muted">
          {selectedCategory === "all" ? "Sin filtro por categoría." : "Filtrando por categoría."}
        </div>
      </div>

      <div className="mt-6 h-px bg-eafit-border" />

      {/* Disponibilidad */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-eafit-muted">Disponibilidad</div>

        <div className="mt-2 rounded-xl border border-eafit-border overflow-hidden bg-eafit-surface">
          {AVAILABILITY.map((opt, idx) => {
            const active = selectedAvailability === opt.key;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelectAvailability(opt.key)}
                className={[
                  "w-full px-4 py-3 flex items-start gap-3 text-left transition",
                  idx ? "border-t border-eafit-border" : "",
                  active ? "bg-eafit-secondary/10" : "hover:bg-eafit-bg",
                ].join(" ")}
              >
                <div className="pt-[5px]">
                  <Dot cls={opt.dot} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-eafit-text">{opt.label}</span>

                    <span
                      className={[
                        "ml-auto h-5 w-5 rounded-full border flex items-center justify-center shrink-0",
                        active ? "border-eafit-secondary" : "border-eafit-border",
                      ].join(" ")}
                      aria-hidden
                    >
                      {active && <span className="h-3 w-3 rounded-full bg-eafit-secondary" />}
                    </span>
                  </div>

                  <div className="text-[11px] text-eafit-muted mt-1">{opt.helper}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default FiltersSidebar;