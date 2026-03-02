import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

/** Estado interno del catálogo */
export type ResourceStatus = "available" | "loaned" | "maintenance";

export type Resource = {
  id: string;
  name: string;
  category: string;
  status: ResourceStatus;

  // opcionales (mantén solo lo que uses en UI)
  location?: string;
  brand?: string;
  model?: string;
  serial?: string;
  includes?: string[];
  notes?: string;
  imageUrl?: string;
  tags?: string[];

  updatedAtISO?: string;
  createdAtISO?: string;
};

export type ResourceCreateInput = Omit<Resource, "id" | "createdAtISO" | "updatedAtISO" | "status"> & {
  status?: ResourceStatus;
};

type CatalogContextValue = {
  resources: Resource[];

  getById: (id: string) => Resource | undefined;
  search: (q: string) => Resource[];

  canManage: boolean;

  createResource: (input: ResourceCreateInput) => Resource;
  updateResource: (id: string, patch: Partial<Omit<Resource, "id" | "createdAtISO">>) => void;
  deleteResource: (id: string) => void;

  setAll: (next: Resource[]) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const CATALOG_KEY = "eafit_catalog_v1";

function uid(prefix = "res") {
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

const norm = (s: string) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

function cleanList(xs?: string[]) {
  return xs?.map((x) => x.trim()).filter(Boolean) ?? [];
}

export function CatalogProvider({
  children,
  initialResources,
}: {
  children: React.ReactNode;
  /** opcional: catálogo inicial (si no, arranca vacío) */
  initialResources?: Resource[];
}) {
  const { user } = useAuth();
  const canManage = user?.role === "practicante";

  const [resources, setResources] = useState<Resource[]>(() => {
    const stored = safeParse<Resource[]>(localStorage.getItem(CATALOG_KEY), []);
    if (stored.length) return stored;
    return initialResources ?? [];
  });

  useEffect(() => {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(resources));
  }, [resources]);

  const value = useMemo<CatalogContextValue>(() => {
    const assertOps = () => {
      if (!canManage) throw new Error("No autorizado: solo practicantes pueden gestionar el catálogo.");
    };

    const getById = (id: string) => resources.find((r) => r.id === id);

    const search = (q: string) => {
      const nq = norm(q);
      if (!nq) return resources;

      return resources.filter((r) => {
        const hay = [
          r.name,
          r.category,
          r.location ?? "",
          r.brand ?? "",
          r.model ?? "",
          r.serial ?? "",
          ...(r.includes ?? []),
          ...(r.tags ?? []),
        ].join(" ");

        return norm(hay).includes(nq);
      });
    };

    const createResource: CatalogContextValue["createResource"] = (input) => {
      assertOps();
      const t = nowISO();

      const newItem: Resource = {
        id: uid("res"),
        createdAtISO: t,
        updatedAtISO: t,

        name: input.name.trim(),
        category: input.category.trim(),
        status: input.status ?? "available",

        location: input.location?.trim(),
        brand: input.brand?.trim(),
        model: input.model?.trim(),
        serial: input.serial?.trim(),
        notes: input.notes?.trim(),
        imageUrl: input.imageUrl?.trim(),

        includes: cleanList(input.includes),
        tags: cleanList(input.tags),
      };

      setResources((prev) => [newItem, ...prev]);
      return newItem;
    };

    const updateResource: CatalogContextValue["updateResource"] = (id, patch) => {
      assertOps();
      setResources((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;

          const next: Resource = {
            ...r,
            ...patch,
            updatedAtISO: nowISO(),
          };

          // normalización mínima
          if (typeof next.name === "string") next.name = next.name.trim();
          if (typeof next.category === "string") next.category = next.category.trim();
          if (typeof next.location === "string") next.location = next.location.trim();
          if (typeof next.brand === "string") next.brand = next.brand.trim();
          if (typeof next.model === "string") next.model = next.model.trim();
          if (typeof next.serial === "string") next.serial = next.serial.trim();
          if (typeof next.notes === "string") next.notes = next.notes.trim();
          if (typeof next.imageUrl === "string") next.imageUrl = next.imageUrl.trim();
          if (Array.isArray(next.includes)) next.includes = cleanList(next.includes);
          if (Array.isArray(next.tags)) next.tags = cleanList(next.tags);

          return next;
        })
      );
    };

    const deleteResource: CatalogContextValue["deleteResource"] = (id) => {
      assertOps();
      setResources((prev) => prev.filter((r) => r.id !== id));
    };

    return {
      resources,
      getById,
      search,
      canManage,
      createResource,
      updateResource,
      deleteResource,
      setAll: setResources,
    };
  }, [resources, canManage]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}