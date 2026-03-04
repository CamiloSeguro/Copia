// src/types/index.ts

// =========================
// Resources
// =========================

/** Estado operativo del equipo (condición técnica, no disponibilidad de uso). */
export type ResourceOperationalStatus = "active" | "maintenance" | "retired";

export type Resource = {
  /** ID interno (slug/uuid). Ej: "metaquest3_01" */
  id: string;

  /** ID físico del activo en inventario. Ej: "MQ3-01" */
  assetId: string;

  name: string;
  category: string;

  /** Estado técnico del equipo — distinto de su disponibilidad de préstamo. */
  operationalStatus: ResourceOperationalStatus;

  /** Accesorios o elementos incluidos con el recurso. */
  includes?: string[];
  imageUrl?: string;
  location?: string;
  code?: string;
  description?: string;
};

// =========================
// Availability
// =========================

/**
 * Estado de disponibilidad calculado, usado en catálogo y filtros.
 * Importar exclusivamente desde aquí: CatalogPage, FiltersSidebar, ResourceCard.
 */
export type AvailabilityFilter = "all" | "available" | "in_use" | "maintenance";

/** Estado de disponibilidad sin "all" — para ResourceCard y computeResourceAvailability. */
export type ResourceAvailability = Exclude<AvailabilityFilter, "all">;

// =========================
// Tickets / Loans
// =========================

export type TicketType = "immediate";

export type TicketStatus =
  | "pending_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

export type TicketItemStatus = "pending" | "delivered" | "returned" | "cancelled";

export type TicketItem = {
  id: string;
  resourceId: string;
  status: TicketItemStatus;
  deliveredAtISO?: string;
  dueAtISO?: string;
  returnedAtISO?: string;
};

export type Ticket = {
  id: string;
  createdAtISO: string;
  type: TicketType;
  startDateISO?: string;
  startTime?: string;
  startISO?: string;
  status: TicketStatus;
  items: TicketItem[];
  notes?: string;
};

/** Ticket con metadatos computados (útil para vistas y listas). */
export type TicketWithMeta = Ticket & {
  resourceAvailability?: ResourceAvailability;
};

// =========================
// Availability helpers
// =========================

/**
 * Devuelve `true` si el recurso tiene un préstamo activo (ticket "delivered"
 * con al menos un item en estado "delivered" para ese resourceId).
 */
export function isResourceInUse(resourceId: string, tickets: Ticket[]): boolean {
  return tickets.some(
    (t) =>
      t.status === "delivered" &&
      t.items.some((it) => it.resourceId === resourceId && it.status === "delivered")
  );
}

/**
 * Calcula la disponibilidad de un recurso según el estado actual de los tickets.
 *
 * Prioridad: maintenance > in_use > available
 */
export function computeResourceAvailability(
  resource: Resource,
  tickets: Ticket[]
): ResourceAvailability {
  if (resource.operationalStatus !== "active") return "maintenance";
  if (isResourceInUse(resource.id, tickets)) return "in_use";
  return "available";
}