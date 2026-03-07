import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      // evita focusables invisibles
      (el.offsetParent !== null || el === document.activeElement)
  );
}

function pickInitialFocus(panel: HTMLElement | null) {
  if (!panel) return null;

  // Prioriza campos del formulario (mejor UX)
  const field = panel.querySelector<HTMLElement>(
    'input:not([disabled]),textarea:not([disabled]),select:not([disabled])'
  );
  if (field) return field;

  return focusables(panel)[0] ?? panel;
}

export function Modal({ open, title, children, onClose, footer }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  // ✅ Mantén onClose estable para no re-disparar el effect de open
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ✅ Para detectar transición closed -> open (y enfocar solo una vez)
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    // Solo correr “setup” cuando acaba de abrir
    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;

    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = () => {
      const panel = panelRef.current;
      if (!panel) return;
      pickInitialFocus(panel)?.focus?.();
    };

    if (justOpened) {
      requestAnimationFrame(focusInitial);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const active = document.activeElement as HTMLElement | null;
      const isInside = active ? panel.contains(active) : false;

      if (!isInside) {
        e.preventDefault();
        pickInitialFocus(panel)?.focus?.();
        return;
      }

      const els = focusables(panel);
      if (!els.length) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        if (active === first || active === panel) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={() => onCloseRef.current()}
        aria-label="Cerrar"
      />

      {/* Wrapper */}
      <div className="absolute inset-0 flex justify-center p-4 sm:items-center items-start sm:pt-4 pt-10">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={[
            "w-full max-w-[720px]",
            "rounded-card bg-eafit-surface border border-eafit-border shadow-soft overflow-hidden",
            "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
            "flex flex-col",
            "animate-[modalIn_.14s_ease-out]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-eafit-border flex items-center justify-between gap-4 shrink-0">
            <div id={titleId} className="font-semibold text-eafit-text min-w-0">
              <span className="truncate block">{title}</span>
            </div>

            <button
              type="button"
              className="ui-btn-ghost ui-btn-sm !h-9 !px-3 shrink-0"
              onClick={() => onCloseRef.current()}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <span className="ui-btn-label">✕</span>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-auto scroll-soft flex-1 min-h-0">{children}</div>

          {/* Footer */}
          {footer ? (
            <div className="px-6 py-4 border-t border-eafit-border bg-eafit-bg shrink-0">
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(6px) scale(.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}