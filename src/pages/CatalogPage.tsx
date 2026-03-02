import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Topbar } from "../components/TopBar";
import { InfoBanner } from "../components/InfoBanner";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { ResourceCard } from "../components/ResourceCard";
import { TicketBar } from "../components/TicketBar";
import { mockResources } from "../data/mockResources";
import { useTicket } from "../app/ticketContext";
import { ResourceDetailModal } from "../components/ResourceDetailModal";
import { useLoans } from "../app/loansContext";
import {
  computeResourceAvailability,
  type AvailabilityFilter,
  type Resource,
  type ResourceAvailability,
} from "../types";

// =========================
// Utilidades puras (fuera del componente para evitar recreación)
// =========================

function normalize(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function resourceHaystack(r: Resource): string {
  const assetId = r.assetId ?? r.code ?? "";
  return normalize(`${assetId} ${r.name} ${r.category} ${r.id}`);
}

function availabilityLabel(v: AvailabilityFilter): string {
  const labels: Record<AvailabilityFilter, string> = {
    all: "Todas",
    available: "Disponible",
    in_use: "En uso",
    maintenance: "Mantenimiento",
  };
  return labels[v];
}

// ✅ Fuente única para decidir si se puede AGREGAR desde el catálogo
function canAddFromCatalog(args: {
  r: Resource;
  availabilityById: Map<string, ResourceAvailability>;
}): boolean {
  const { r, availabilityById } = args;
  const a = availabilityById.get(r.id) ?? "available";
  const effective: ResourceAvailability = r.operationalStatus !== "active" ? "maintenance" : a;
  return effective === "available";
}

// =========================
// CatalogPage
// =========================

export default function CatalogPage() {
  const nav = useNavigate();
  const { draft, toggleSelectedId, setSelectedIds } = useTicket();
  const { tickets } = useLoans();

  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const qNorm = normalize(q);

  const categories = useMemo(
    () => Array.from(new Set(mockResources.map((r) => r.category))).sort(),
    []
  );

  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityFilter>("all");

  // Disponibilidad calculada por recurso — usa el modelo actual del loansContext
  const availabilityById = useMemo(() => {
    const map = new Map<string, ResourceAvailability>();
    for (const r of mockResources) {
      map.set(r.id, computeResourceAvailability(r, tickets));
    }
    return map;
  }, [tickets]);

  // ✅ Sanitiza selección cuando cambie disponibilidad (evita que queden "En solicitud" recursos no disponibles)
  useEffect(() => {
    const allowed = new Set<string>();
    for (const r of mockResources) {
      if (canAddFromCatalog({ r, availabilityById })) allowed.add(r.id);
    }
    const cleaned = draft.selectedIds.filter((id) => allowed.has(id));
    if (cleaned.length !== draft.selectedIds.length) {
      setSelectedIds(cleaned);
    }
  }, [availabilityById, draft.selectedIds, setSelectedIds]);

  // Recursos filtrados
  const filtered = useMemo(() => {
    return mockResources.filter((r) => {
      const okCat = selectedCategory === "all" || r.category === selectedCategory;

      const avail = availabilityById.get(r.id) ?? "available";
      const okAvail = selectedAvailability === "all" || avail === selectedAvailability;

      const okSearch = !qNorm || resourceHaystack(r).includes(qNorm);

      return okCat && okAvail && okSearch;
    });
  }, [selectedCategory, selectedAvailability, qNorm, availabilityById]);

  const hasActiveFilters =
    selectedCategory !== "all" || selectedAvailability !== "all" || qNorm.length > 0;

  function clearAll() {
    setSelectedCategory("all");
    setSelectedAvailability("all");
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
  }

  // Detail modal
  const [detailResourceId, setDetailResourceId] = useState<string | null>(null);
  const detailResource = useMemo(
    () => mockResources.find((x) => x.id === detailResourceId) ?? null,
    [detailResourceId]
  );
  const detailSelected = !!detailResourceId && draft.selectedIds.includes(detailResourceId);

  function openDetail(id: string) {
    setDetailResourceId(id);
  }

  function closeDetail() {
    setDetailResourceId(null);
  }

  return (
    <div className="min-h-screen bg-eafit-bg pb-[96px]">
      <Topbar />
      <InfoBanner />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar sticky */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <FiltersSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedAvailability={selectedAvailability}
              onSelectAvailability={setSelectedAvailability}
            />
          </div>

          {/* Catálogo */}
          <section className="flex-1 min-w-0">
            {/* Header */}
            <div className="ui-card p-5 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-semibold text-eafit-text">Catálogo</div>
                  <div className="text-sm text-eafit-muted mt-1">
                    {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
                    {hasActiveFilters && (
                      <span className="text-eafit-muted"> · filtros aplicados</span>
                    )}
                  </div>

                  {/* Chips de filtros activos */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {qNorm && (
                        <span className="ui-chip ui-chip-on">
                          Búsqueda: <b className="ml-1">{q}</b>
                        </span>
                      )}
                      {selectedCategory !== "all" && (
                        <span className="ui-chip ui-chip-on">Categoría: {selectedCategory}</span>
                      )}
                      {selectedAvailability !== "all" && (
                        <span className="ui-chip ui-chip-on">
                          Estado: {availabilityLabel(selectedAvailability)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ui-chip ui-chip-off"
                        onClick={clearAll}
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid o estado vacío */}
            {filtered.length === 0 ? (
              <div className="ui-card p-8">
                <div className="text-lg font-semibold text-eafit-text">Sin resultados</div>
                <div className="text-sm text-eafit-muted mt-1">
                  Prueba otra búsqueda (Ctrl+K) o limpia los filtros.
                </div>
                <div className="mt-4">
                  <button className="ui-btn-primary" type="button" onClick={clearAll}>
                    <span className="ui-btn-label">Limpiar filtros</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 xl:gap-7">
                {filtered.map((r) => {
                  const availability = availabilityById.get(r.id) ?? "available";
                  const selected = draft.selectedIds.includes(r.id);
                  const canAdd = canAddFromCatalog({ r, availabilityById });

                  return (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      availability={availability}
                      selected={selected}
                      onToggle={() => toggleSelectedId(r.id, { canAdd })}
                      onOpenDetail={() => openDetail(r.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <TicketBar count={draft.selectedIds.length} onGo={() => nav("/solicitud/nueva")} />

      <ResourceDetailModal
  open={!!detailResourceId}
  onClose={closeDetail}
  resource={detailResource}
  availability={
    detailResourceId ? (availabilityById.get(detailResourceId) ?? "available") : "available"
  }
  selected={detailSelected}
  onToggle={() => {
    if (!detailResourceId) return;

    const r = mockResources.find((x) => x.id === detailResourceId);
    if (!r) return;

    const a = availabilityById.get(r.id) ?? "available";
    const effective = r.operationalStatus !== "active" ? "maintenance" : a;
    const canAdd = effective === "available";

    toggleSelectedId(detailResourceId, { canAdd });
  }}
/>
    </div>
  );
}