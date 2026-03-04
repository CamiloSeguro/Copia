import React, { createContext, useContext, useState } from "react";

export type TicketDraft = {
  selectedIds: string[];
  startDateISO?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  notes?: string;
  acceptCampusRule: boolean;
  acceptTerms: boolean;
};

type TicketContextValue = {
  draft: TicketDraft;

  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string, opts?: { canAdd?: boolean }) => void;
  sanitizeSelectedIds: (allowedIds: string[]) => void;
  clear: () => void;

  setStartDateISO: (d?: string) => void;
  setStartTime: (t?: string) => void;
  setStartWindow: (dateISO?: string, timeHHMM?: string) => void;

  setNotes: (n: string) => void;

  setAcceptCampusRule: (v: boolean) => void;
  setAcceptTerms: (v: boolean) => void;

  getStartISO: () => string | null;
  getStartLocalLabel: () => string | null;
};

const TicketContext = createContext<TicketContextValue | null>(null);

const initialDraft: TicketDraft = {
  selectedIds: [],
  startDateISO: undefined,
  startTime: undefined,
  notes: "",
  acceptCampusRule: false,
  acceptTerms: false,
};

const clean = (v?: string) => {
  const s = (v ?? "").trim();
  return s ? s : undefined;
};

const dedupe = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

function localDateTime(dateISO: string, timeHHMM: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = timeHHMM.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<TicketDraft>(initialDraft);

  const setSelectedIds = (ids: string[]) =>
    setDraft((p) => ({ ...p, selectedIds: dedupe(ids) }));

  // 🔐 BLINDADO: el source of truth decide si se puede agregar
  const toggleSelectedId = (id: string, opts?: { canAdd?: boolean }) =>
    setDraft((p) => {
      const has = p.selectedIds.includes(id);

      // ✅ siempre permitir quitar
      if (has) {
        const next = p.selectedIds.filter((x) => x !== id);
        return { ...p, selectedIds: dedupe(next) };
      }

      // ❌ bloquear agregar si no está permitido
      if (opts?.canAdd === false) return p;

      // ✅ agregar
      return { ...p, selectedIds: dedupe([...p.selectedIds, id]) };
    });

  // 🧹 Limpieza automática desde el catálogo
  const sanitizeSelectedIds = (allowedIds: string[]) =>
    setDraft((p) => ({
      ...p,
      selectedIds: p.selectedIds.filter((id) => allowedIds.includes(id)),
    }));

  const clear = () => setDraft(initialDraft);

  const setStartDateISO = (d?: string) =>
    setDraft((p) => ({ ...p, startDateISO: clean(d) }));

  const setStartTime = (t?: string) =>
    setDraft((p) => ({ ...p, startTime: clean(t) }));

  const setStartWindow = (dateISO?: string, timeHHMM?: string) =>
    setDraft((p) => ({
      ...p,
      startDateISO: clean(dateISO),
      startTime: clean(timeHHMM),
    }));

  const setNotes = (n: string) =>
    setDraft((p) => ({ ...p, notes: n ?? "" }));

  const setAcceptCampusRule = (v: boolean) =>
    setDraft((p) => ({ ...p, acceptCampusRule: v }));

  const setAcceptTerms = (v: boolean) =>
    setDraft((p) => ({ ...p, acceptTerms: v }));

  const getStartISO = () => {
    if (!draft.startDateISO || !draft.startTime) return null;
    return localDateTime(draft.startDateISO, draft.startTime).toISOString();
  };

  const getStartLocalLabel = () => {
    if (!draft.startDateISO || !draft.startTime) return null;
    return `${draft.startDateISO} · ${draft.startTime}`;
  };

  return (
    <TicketContext.Provider
      value={{
        draft,
        setSelectedIds,
        toggleSelectedId,
        sanitizeSelectedIds,
        clear,
        setStartDateISO,
        setStartTime,
        setStartWindow,
        setNotes,
        setAcceptCampusRule,
        setAcceptTerms,
        getStartISO,
        getStartLocalLabel,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTicket() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTicket must be used within TicketProvider");
  return ctx;
}