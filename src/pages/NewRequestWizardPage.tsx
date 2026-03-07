import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTicket } from "../app/ticketContext";
import { useCatalog } from "../app/catalogContext";
import { useLoans } from "../app/loansContext";
import { useAuth } from "../auth/AuthContext";
import { Topbar } from "../components/TopBar";
import type { Resource } from "../types";

// =========================
// Types
// =========================

type Step = 1 | 2 | 3;
type StepState = "idle" | "active" | "done";

// =========================
// Constants
// =========================

const BUSINESS_START = 8 * 60;  // 08:00 en minutos
const BUSINESS_END   = 18 * 60; // 18:00 en minutos
const TIME_STEP_MIN  = 15;

// =========================
// Helpers
// =========================

function isWeekday(dateISO: string): boolean {
  const [y, m, d] = dateISO.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day >= 1 && day <= 5;
}

function inBusinessHours(time: string): boolean {
  const [hh, mm] = time.split(":").map(Number);
  const minutes = hh * 60 + mm;
  return minutes >= BUSINESS_START && minutes <= BUSINESS_END;
}

function todayISO(): string {
  const t = new Date();
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, "0"),
    String(t.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatWhen(d?: string, t?: string): string {
  if (!d || !t) return "—";
  return `${d} · ${t}`;
}

function weekdayLabelES(date = new Date()): string {
  return date.toLocaleDateString("es-CO", { weekday: "long" });
}

/** Devuelve la etiqueta del siguiente día hábil, o null si hoy ya lo es. */
function nextBusinessDayLabel(): string | null {
  const d = new Date();
  const day = d.getDay();
  const add = day === 6 ? 2 : day === 0 ? 1 : 0;
  if (add === 0) return null;
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "short", day: "2-digit" });
}

/** Genera opciones de hora entre 08:00 y 18:00 en intervalos de `step` minutos. */
function generateTimeOptions(step = TIME_STEP_MIN): string[] {
  const options: string[] = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += step) {
      if (h === 18 && m > 0) break;
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return options;
}

const DUE_TEXT_SUFFIX = "Devolución: el mismo día antes de las 6:00pm";

// =========================
// Page
// =========================

export default function NewRequestWizardPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const {
    draft,
    setSelectedIds,
    setQuantity,
    setStartDateISO,
    setStartTime,
    setNotes,
    setAcceptCampusRule,
    setAcceptTerms,
    clear,
  } = useTicket();

  const { createTicketFromDraft } = useLoans();

  const [step, setStep] = useState<Step>(1);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const TODAY = todayISO();
  const isTodayWeekday = isWeekday(TODAY);
  const nextBiz = nextBusinessDayLabel();
  const dueText = `${DUE_TEXT_SUFFIX} (${TODAY}).`;

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // Sube al top al cambiar de paso
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Paso 2: fija el día a hoy y limpia valores inválidos
  useEffect(() => {
    if (step !== 2) return;
    if (draft.startDateISO !== TODAY) setStartDateISO(TODAY);
    if (!isTodayWeekday) {
      if (draft.startTime) setStartTime(undefined);
      return;
    }
    if (draft.startTime && !inBusinessHours(draft.startTime)) setStartTime(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, TODAY, isTodayWeekday]);

  const { resources } = useCatalog();

  const resourceMap = useMemo(
    () => new Map(resources.map((r) => [r.id, r])),
    [resources]
  );

  const selectedResources = useMemo(() => {
    return draft.selectedIds
      .map((id) => resourceMap.get(id))
      .filter((r): r is Resource => Boolean(r));
  }, [draft.selectedIds, resourceMap]);

  const whenText = formatWhen(draft.startDateISO, draft.startTime);

  // ── Validaciones ───────────────────────────────────────────────────────────
  const totalQuantity = useMemo(
    () => draft.selectedIds.reduce((sum, id) => sum + (draft.quantities[id] ?? 1), 0),
    [draft.selectedIds, draft.quantities]
  );

  const step1Ok = draft.selectedIds.length > 0;

  const step2Ok =
    Boolean(draft.startDateISO) &&
    Boolean(draft.startTime) &&
    draft.startDateISO === TODAY &&
    isTodayWeekday &&
    inBusinessHours(draft.startTime!);

  const step3Ok = draft.acceptCampusRule && draft.acceptTerms;

  const canGoNext =
    (step === 1 && step1Ok) ||
    (step === 2 && step2Ok) ||
    (step === 3 && step3Ok);

  const errors = useMemo<string[]>(() => {
    const e: string[] = [];
    if (!step1Ok) e.push("Debes seleccionar al menos 1 recurso.");
    if (step >= 2) {
      if (!isTodayWeekday) e.push("Hoy no es día hábil. El préstamo solo aplica Lunes a Viernes.");
      if (!draft.startTime) e.push("Selecciona una hora.");
      else if (!inBusinessHours(draft.startTime)) e.push("La hora debe estar entre 08:00 y 18:00.");
    }
    if (step === 3 && !step3Ok) e.push("Debes aceptar las condiciones para continuar.");
    return e;
  }, [draft.startTime, step, step1Ok, step3Ok, isTodayWeekday]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function next() {
    if (step < 3) setStep((s) => (s + 1) as Step);
  }

  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      setStartDateISO(TODAY);
      createTicketFromDraft(
        { ...draft, startDateISO: TODAY, type: "immediate" } as any,
        { id: user?.id ?? "", name: user?.name ?? "", email: user?.email ?? "" }
      );
      setSubmitted(true);
      setSubmitDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step states ────────────────────────────────────────────────────────────
  const stepState = (n: Step): StepState =>
    step === n ? "active" : step > n ? "done" : "idle";

  const progressPct = (step / 3) * 100;
  const nextBtnLabel = step === 2 && !isTodayWeekday ? "No disponible hoy" : "Continuar →";

  // =========================
  // Summary (post-submit, read-only)
  // =========================
  if (submitted && !submitDone) {
    return (
      <div className="min-h-screen bg-eafit-bg">
        <Topbar />
        <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
          <div className="ui-card p-8 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-success/15 text-status-success text-lg">
                ✓
              </div>
              <div>
                <div className="text-xl font-semibold text-eafit-text">Resumen de la solicitud</div>
                <div className="text-sm text-status-success font-medium mt-0.5">Enviada · Pendiente de entrega</div>
              </div>
            </div>

            <div className="mt-6 h-px bg-eafit-border" />

            {/* Info general */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <div className="text-xs text-eafit-muted uppercase tracking-wide">Tipo</div>
                <div className="mt-1 font-medium text-eafit-text">Inmediato</div>
              </div>
              <div>
                <div className="text-xs text-eafit-muted uppercase tracking-wide">Fecha y hora</div>
                <div className="mt-1 font-medium text-eafit-text">{whenText}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-eafit-muted uppercase tracking-wide">Devolución</div>
                <div className="mt-1 text-eafit-text">{dueText}</div>
              </div>
              {draft.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-eafit-muted uppercase tracking-wide">Notas</div>
                  <div className="mt-1 text-eafit-text">{draft.notes}</div>
                </div>
              )}
            </div>

            <div className="mt-6 h-px bg-eafit-border" />

            {/* Recursos */}
            <div className="mt-5">
              <div className="text-xs text-eafit-muted uppercase tracking-wide mb-3">
                Recursos — {draft.selectedIds.length} tipo(s) · {totalQuantity} unidad(es)
              </div>
              <div className="flex flex-col divide-y divide-eafit-border">
                {selectedResources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-eafit-text truncate">{r.name}</div>
                      <div className="text-xs text-eafit-muted mt-0.5">{r.category}</div>
                    </div>
                    <div className="shrink-0 text-eafit-muted">
                      × <span className="font-semibold text-eafit-text">{draft.quantities[r.id] ?? 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <button
                className="ui-btn-primary ui-btn-lg"
                onClick={() => { clear(); nav("/"); }}
                type="button"
              >
                <span className="ui-btn-label">Volver al catálogo</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // Success state
  // =========================
  if (submitDone) {
    return (
      <div className="min-h-screen bg-eafit-bg">
        <Topbar />
        <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
          <div className="ui-card p-8 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-success/15 text-status-success text-2xl">
                ✓
              </div>
              <div>
                <div className="text-2xl font-semibold text-eafit-text">Solicitud enviada</div>
                <div className="text-sm text-status-success font-medium mt-0.5">Pendiente de entrega</div>
              </div>
            </div>

            <div className="mt-6 h-px bg-eafit-border" />

            {/* Instrucción */}
            <div className="mt-6 rounded-card border border-eafit-secondary/20 bg-eafit-secondary/8 p-4 text-sm text-eafit-text">
              Acércate al trabajador del laboratorio en el horario seleccionado para confirmar la entrega de los recursos.
            </div>

            {/* Fecha y hora */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <div className="text-xs text-eafit-muted uppercase tracking-wide">Fecha y hora</div>
                <div className="mt-1 font-medium text-eafit-text">{whenText}</div>
              </div>
              <div>
                <div className="text-xs text-eafit-muted uppercase tracking-wide">Devolución</div>
                <div className="mt-1 font-medium text-eafit-text">{dueText}</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                className="ui-btn-primary ui-btn-lg"
                onClick={() => { clear(); nav("/"); }}
                type="button"
              >
                <span className="ui-btn-label">Volver al catálogo</span>
              </button>
              <button
                className="ui-btn-ghost ui-btn-lg"
                onClick={() => setSubmitDone(false)}
                type="button"
              >
                <span className="ui-btn-label">Ver resumen completo</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // Wizard
  // =========================
  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-eafit-text">Crear solicitud</div>
            <div className="text-sm text-eafit-muted mt-1">
              Paso {step} de 3 · {draft.selectedIds.length} recurso(s)
            </div>
          </div>

          <button className="ui-btn-primary ui-btn-sm" onClick={() => nav("/")} type="button">
            <span className="ui-btn-label">Cancelar</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="mt-6 ui-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StepChip n={1} label="Recursos" state={stepState(1)} onClick={() => setStep(1)} />
            <StepConnector />
            <StepChip n={2} label="Día y hora" state={stepState(2)} onClick={() => step1Ok ? setStep(2) : undefined} />
            <StepConnector />
            <StepChip n={3} label="Confirmar" state={stepState(3)} onClick={() => (step1Ok && step2Ok) ? setStep(3) : undefined} />
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* Left panel */}
          <div className="ui-card p-6 sm:p-8">

            {/* Step 1: Recursos */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-eafit-text">Recursos</h2>
                <p className="text-eafit-muted mt-1">Revisa y ajusta los recursos de tu solicitud.</p>

                <div className="mt-6 flex flex-col gap-3">
                  {selectedResources.length === 0 ? (
                    <div className="text-eafit-muted">
                      No tienes recursos seleccionados. Vuelve al catálogo y agrega al menos uno.
                    </div>
                  ) : (
                    selectedResources.map((r) => (
                      <div key={r.id} className="ui-card-inner p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-eafit-text truncate">{r.name}</div>
                          <div className="text-sm text-eafit-muted">{r.category}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex items-center gap-2 text-sm text-eafit-muted">
                            Cant.
                            <input
                              type="number"
                              min={1}
                              className="ui-input h-9 w-16 text-center"
                              value={draft.quantities[r.id] ?? 1}
                              onChange={(e) => setQuantity(r.id, Number(e.target.value))}
                            />
                          </label>
                          <button
                            className="ui-btn-ghost ui-btn-sm"
                            onClick={() => setSelectedIds(draft.selectedIds.filter((id) => id !== r.id))}
                            type="button"
                          >
                            <span className="ui-btn-label">Quitar</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6">
                  <button className="ui-btn-ghost ui-btn-sm" onClick={() => nav("/")} type="button">
                    <span className="ui-btn-label">+ Agregar más recursos</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Día y hora */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-eafit-text">Día y hora</h2>
                <p className="text-eafit-muted mt-1">
                  Selecciona la hora para pasar por el laboratorio. Solo <b>hoy</b> entre <b>08:00 y 18:00</b>.
                </p>

                {!isTodayWeekday && (
                  <div className="mt-4 rounded-card border border-status-danger/20 bg-status-danger/10 p-4 text-sm text-status-danger">
                    <div className="font-semibold">Hoy ({weekdayLabelES()}) no hay atención.</div>
                    <div className="mt-1">
                      Los préstamos inmediatos solo se agendan <b>lunes a viernes</b>.
                      {nextBiz && <> Vuelve el <b>{nextBiz}</b>.</>}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-eafit-muted">Día</label>
                    <input type="date" className="ui-input mt-2" value={TODAY} disabled readOnly />
                    <div className="mt-2 text-[11px] text-eafit-muted">
                      El préstamo inmediato solo se agenda para el día actual.
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-eafit-muted">Hora</label>
                    <select
                      className="ui-input mt-2"
                      value={draft.startTime ?? ""}
                      onChange={(e) => setStartTime(e.target.value || undefined)}
                      disabled={!isTodayWeekday}
                    >
                      <option value="">Selecciona una hora</option>
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    {draft.startTime && !inBusinessHours(draft.startTime) && (
                      <div className="mt-2 text-sm text-status-danger">
                        Debe estar entre 08:00 y 18:00.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 ui-card-inner p-4 text-sm text-eafit-text bg-eafit-secondary/10">
                  <div className="font-semibold">Regla de devolución</div>
                  <div className="mt-1">{dueText}</div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmación */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-semibold text-eafit-text">Confirmación</h2>
                <p className="text-eafit-muted mt-1">Verifica la información y acepta las condiciones.</p>

                <div className="mt-6 ui-card-inner p-5 bg-eafit-bg">
                  <div className="text-sm font-semibold text-eafit-text">Resumen de la solicitud</div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-eafit-muted text-xs">Tipo</div>
                      <div className="font-medium text-eafit-text">Inmediato</div>
                    </div>
                    <div>
                      <div className="text-eafit-muted text-xs">Recursos</div>
                      <div className="font-medium text-eafit-text">
                        {draft.selectedIds.length} tipo(s) · {totalQuantity} unidad(es)
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-eafit-muted text-xs">Fecha y hora</div>
                      <div className="font-medium text-eafit-text">{whenText}</div>
                      <div className="text-eafit-muted mt-1">{dueText}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-semibold text-eafit-muted">Notas (opcional)</label>
                  <textarea
                    className="mt-2 w-full min-h-[96px] rounded-input border border-eafit-border bg-eafit-bg p-4 outline-none focus:ring-2 focus:ring-eafit-secondary/30"
                    value={draft.notes ?? ""}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Curso, proyecto o información adicional…"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <label className="flex items-start gap-3 text-eafit-text">
                    <input
                      type="checkbox"
                      checked={draft.acceptCampusRule}
                      onChange={(e) => setAcceptCampusRule(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-eafit-secondary"
                    />
                    <span className="leading-6">
                      Confirmo que los recursos <b>no saldrán del campus</b>.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 text-eafit-text">
                    <input
                      type="checkbox"
                      checked={draft.acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-eafit-secondary"
                    />
                    <span className="leading-6">
                      Acepto las condiciones del préstamo y el control de entrega/devolución por parte del trabajador.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-6 rounded-card border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}

            {/* Footer controls */}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                className="ui-btn-primary ui-btn-lg"
                onClick={() => {
                  if (step === 1) nav("/");
                  else back();
                }}
                type="button"
                >
                ← {step === 1 ? "Volver al catálogo" : "Atrás"}
              </button>

              {step < 3 ? (
                <button
                  className="ui-btn-primary ui-btn-lg disabled:opacity-40"
                  onClick={next}
                  disabled={!canGoNext}
                  type="button"
                >
                  {nextBtnLabel}
                </button>
              ) : (
                <button
                  className="ui-btn-primary ui-btn-lg disabled:opacity-40"
                  onClick={submit}
                  disabled={!(step1Ok && step2Ok && step3Ok) || submitting || submitted}
                  type="button"
                >
                  {submitting ? "Enviando…" : submitted ? "Ya enviada" : "Confirmar solicitud"}
                </button>
              )}
            </div>
          </div>

          {/* Right rail */}
          <aside className="ui-card p-6 h-fit">
            <div className="text-sm font-semibold text-eafit-text">Estado de la solicitud</div>
            <div className="text-sm text-eafit-muted mt-1">Paso {step} de 3</div>

            <div className="mt-3 h-2 rounded-full bg-eafit-border overflow-hidden" aria-hidden>
              <div
                className="h-full bg-eafit-secondary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-4 ui-card-inner p-4 text-sm bg-eafit-bg">
              <div className="flex items-center justify-between gap-3">
                <div className="text-eafit-muted">Recursos</div>
                <div className="font-semibold text-eafit-text">
                  {draft.selectedIds.length} tipo(s) · {totalQuantity} ud.
                </div>
              </div>
              <div className="mt-3">
                <div className="text-eafit-muted">Fecha y hora</div>
                <div className="font-medium text-eafit-text mt-1">{whenText}</div>
                <div className="text-eafit-muted mt-1">{dueText}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 max-h-[280px] overflow-auto scroll-soft pr-1">
              {selectedResources.length === 0 ? (
                <div className="text-sm text-eafit-muted">Aún no hay recursos seleccionados.</div>
              ) : (
                selectedResources.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="text-eafit-text min-w-0 truncate">{r.name}</div>
                    <div className="text-eafit-muted shrink-0">{r.category}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 ui-card-inner p-4 text-sm text-eafit-text bg-eafit-bg">
              <b>Reglas:</b> 
              <p>· Lunes a Viernes de 08:00–18:00</p>
              <p>· No salir del campus</p>
              <p>· Trabajador confirma entrega/devolución</p>  
            </div>

            <button
              className="mt-6 w-full ui-btn-secondary ui-btn-lg"
              onClick={() => { setSelectedIds([]); setStep(1); nav("/"); }}
              type="button"
            >
              <span className="ui-btn-label">Vaciar selección</span>
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

// =========================
// UI helpers
// =========================

function StepConnector() {
  return <div className="hidden sm:block h-px w-10 bg-eafit-border" aria-hidden />;
}

function StepChip({
  label,
  state,
  onClick,
}: {
  n: number;
  label: string;
  state: StepState;
  onClick?: () => void;
}) {
  const base = "inline-flex items-center gap-2 px-3 h-9 rounded-full border text-xs font-semibold transition min-w-0";
  const interactive = onClick ? "cursor-pointer hover:bg-eafit-bg" : "";

  const variantCls: Record<StepState, string> = {
    active: "border-eafit-secondary/30 bg-eafit-secondary/10 text-eafit-text shadow-sm ring-2 ring-eafit-secondary/10",
    done:   "border-status-success/30 bg-status-success/10 text-status-success",
    idle:   "border-eafit-border bg-eafit-surface text-eafit-muted",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[base, interactive, variantCls[state]].join(" ")}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}