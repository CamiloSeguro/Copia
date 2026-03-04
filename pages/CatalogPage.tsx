import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Topbar } from "../components/TopBar";
import { InfoBanner } from "../components/InfoBanner";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { ResourceCard } from "../components/ResourceCard";
import { TicketBar } from "../components/TicketBar";
import { useTicket } from "../app/ticketContext";
import { ResourceDetailModal } from "../components/ResourceDetailModal";
import { useLoans } from "../app/loansContext";
import { useCatalog } from "../app/catalogContext";
import {
  computeResourceAvailability,
  type AvailabilityFilter,
  type Resource,
  type ResourceAvailability,
} from "../types";

// =========================
// Utilidades puras
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

function canAddFromCatalog(r: Resource, availabilityById: Map<string, ResourceAvailability>): boolean {
  const a = availabilityById.get(r.id) ?? "available";
  const effective: ResourceAvailability = r.operationalStatus !== "active" ? "maintenance" : a;
  return effective === "available";
}

// =========================
// CatalogPage
// =========================

export default function CatalogPage() {
  const navigate = useNavigate();
  const { resources } = useCatalog();
  const { draft, toggleSelectedId, setSelectedIds } = useTicket();
  const { tickets } = useLoans();

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const searchQueryNorm = normalize(searchQuery);

  const categories = useMemo(
    () => Array.from(new Set(resources.map((r) => r.category))).sort(),
    [resources]
  );

  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityFilter>("all");

  const availabilityById = useMemo(() => {
    const map = new Map<string, ResourceAvailability>();
    for (const r of resources) {
      map.set(r.id, computeResourceAvailability(r, tickets));
    }
    return map;
  }, [resources, tickets]);

  // Ref para evitar que draft.selectedIds sea dependencia del efecto
  const selectedIdsRef = useRef(draft.selectedIds);
  selectedIdsRef.current = draft.selectedIds;

  useEffect(() => {
    const allowed = new Set<string>();
    for (const r of resources) {
      if (canAddFromCatalog(r, availabilityById)) allowed.add(r.id);
    }
    const cleaned = selectedIdsRef.current.filter((id) => allowed.has(id));
    if (cleaned.length !== selectedIdsRef.current.length) setSelectedIds(cleaned);
  }, [resources, availabilityById, setSelectedIds]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const okCat = selectedCategory === "all" || r.category === selectedCategory;
      const avail = availabilityById.get(r.id) ?? "available";
      const okAvail = selectedAvailability === "all" || avail === selectedAvailability;
      const okSearch = !searchQueryNorm || resourceHaystack(r).includes(searchQueryNorm);
      return okCat && okAvail && okSearch;
    });
  }, [resources, selectedCategory, selectedAvailability, searchQueryNorm, availabilityById]);

  const hasActiveFilters =
    selectedCategory !== "all" || selectedAvailability !== "all" || searchQueryNorm.length > 0;

  function clearAll() {
    setSelectedCategory("all");
    setSelectedAvailability("all");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
  }

  const [detailResourceId, setDetailResourceId] = useState<string | null>(null);
  const detailResource = useMemo(
    () => (detailResourceId ? resources.find((x) => x.id === detailResourceId) ?? null : null),
    [detailResourceId, resources]
  );
  const detailSelected = !!detailResourceId && draft.selectedIds.includes(detailResourceId);

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
                    {hasActiveFilters && <span className="text-eafit-muted"> · filtros aplicados</span>}
                  </div>

                  {/* Chips de filtros activos */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {searchQueryNorm && (
                        <span className="ui-chip ui-chip-on">
                          Búsqueda: <b className="ml-1">{searchQuery}</b>
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
                      <button type="button" className="ui-chip ui-chip-off" onClick={clearAll}>
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
                  const canAdd = canAddFromCatalog(r, availabilityById);

                  return (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      availability={availability}
                      selected={selected}
                      onToggle={() => toggleSelectedId(r.id, { canAdd })}
                      onOpenDetail={() => setDetailResourceId(r.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <TicketBar count={draft.selectedIds.length} onGo={() => navigate("/solicitud/nueva")} />

      <ResourceDetailModal
        open={!!detailResourceId}
        onClose={() => setDetailResourceId(null)}
        resource={detailResource}
        availability={detailResourceId ? availabilityById.get(detailResourceId) ?? "available" : "available"}
        selected={detailSelected}
        onToggle={() => {
          if (!detailResourceId) return;
          const r = resources.find((x) => x.id === detailResourceId);
          if (!r) return;
          toggleSelectedId(detailResourceId, { canAdd: canAddFromCatalog(r, availabilityById) });
        }}
      />
    </div>
  );
}
