import React, { createContext, useContext, useEffect, useState } from "react";
import type { TicketDraft } from "./ticketContext";

/** Modelo simple: immediate + agenda (día/hora) + ops confirma entrega/devolución */
export type TicketStatus = "pending_delivery" | "delivered" | "returned" | "cancelled";

export type TicketItem = {
  id: string;
  resourceId: string;
  status: "pending" | "delivered" | "returned" | "cancelled";
  deliveredAtISO?: string;
  dueAtISO?: string;        // ✅ propiedad (opcional)
  returnedAtISO?: string;
};

export type Ticket = {
  id: string;
  createdAtISO: string;
  type: "immediate";

  userId: string;
  userName: string;
  userEmail: string;

  startDateISO?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM

  status: TicketStatus;
  items: TicketItem[];
  notes?: string;
};

const TICKETS_KEY = "eafit_loans_tickets_v5";

type TicketUser = { id: string; name: string; email: string };

type LoansContextValue = {
  tickets: Ticket[];
  getTicket: (ticketId: string) => Ticket | undefined;

  createTicketFromDraft: (draft: TicketDraft, user: TicketUser) => Ticket;
  updateTicket: (
    ticketId: string,
    patch: Partial<Pick<Ticket, "startDateISO" | "startTime" | "notes">> & { selectedIds?: string[] }
  ) => void;

  cancelTicket: (ticketId: string) => void;
  confirmDelivery: (ticketId: string) => void;
  confirmReturn: (ticketId: string) => void;
};

const LoansContext = createContext<LoansContextValue | null>(null);

function uid(prefix = "t") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
function nowISO() {
  return new Date().toISOString();
}
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isWithinBusinessHours(d = new Date()) {
  const day = d.getDay(); // 0 dom, 6 sab
  const isWeekday = day >= 1 && day <= 5;
  const minutes = d.getHours() * 60 + d.getMinutes();
  return isWeekday && minutes >= 8 * 60 && minutes <= 18 * 60;
}

export function LoansProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    safeParse<Ticket[]>(localStorage.getItem(TICKETS_KEY), [])
  );

  useEffect(() => {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const getTicket = (ticketId: string) => tickets.find((t) => t.id === ticketId);

  const createTicketFromDraft = (draft: TicketDraft, user: TicketUser) => {
    const ticket: Ticket = {
      id: uid("ticket"),
      createdAtISO: nowISO(),
      type: "immediate",

      userId: user.id,
      userName: user.name,
      userEmail: user.email,

      startDateISO: draft.startDateISO,
      startTime: draft.startTime,

      status: "pending_delivery",
      notes: draft.notes ?? "",

      items: draft.selectedIds.map((resourceId) => ({
        id: uid("item"),
        resourceId,
        status: "pending",
      })),
    };

    setTickets((prev) => [ticket, ...prev]);
    return ticket;
  };

  const updateTicket: LoansContextValue["updateTicket"] = (ticketId, patch) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        if (t.status !== "pending_delivery") return t;

        // items (si cambian ids)
        let nextItems = t.items;
        if (patch.selectedIds) {
          const byRid = new Map(t.items.map((it) => [it.resourceId, it]));
          nextItems = patch.selectedIds.map((rid) => byRid.get(rid) ?? { id: uid("item"), resourceId: rid, status: "pending" });
        }

        return {
          ...t,
          startDateISO: patch.startDateISO ?? t.startDateISO,
          startTime: patch.startTime ?? t.startTime,
          notes: patch.notes ?? t.notes,
          items: nextItems,
        };
      })
    );
  };

  const cancelTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        if (t.status !== "pending_delivery") return t;

        return {
          ...t,
          status: "cancelled",
          items: t.items.map((it) => ({ ...it, status: "cancelled" })),
        };
      })
    );
  };

  const confirmDelivery = (ticketId: string) => {
    if (!isWithinBusinessHours()) {
      throw new Error("Fuera de horario. Entregas solo lunes–viernes 08:00–18:00.");
    }

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        if (t.status !== "pending_delivery") return t;

        const deliveredAtISO = nowISO();
        return {
          ...t,
          status: "delivered",
          items: t.items.map((it) => ({ ...it, status: "delivered", deliveredAtISO })),
        };
      })
    );
  };

  const confirmReturn = (ticketId: string) => {
    if (!isWithinBusinessHours()) {
      throw new Error("Fuera de horario. Devoluciones solo lunes–viernes 08:00–18:00.");
    }

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        if (t.status !== "delivered") return t;

        const returnedAtISO = nowISO();
        return {
          ...t,
          status: "returned",
          items: t.items.map((it) =>
            it.status === "delivered" ? { ...it, status: "returned", returnedAtISO } : it
          ),
        };
      })
    );
  };

  return (
    <LoansContext.Provider
      value={{ tickets, getTicket, createTicketFromDraft, updateTicket, cancelTicket, confirmDelivery, confirmReturn }}
    >
      {children}
    </LoansContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoansContext);
  if (!ctx) throw new Error("useLoans must be used within LoansProvider");
  return ctx;
}