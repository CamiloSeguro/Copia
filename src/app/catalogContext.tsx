// src/app/catalogContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Resource, ResourceOperationalStatus } from "../types";

/** Input para crear un recurso (id lo genera el sistema). */
export type ResourceCreateInput = Omit<Resource, "id"> & {
  operationalStatus?: ResourceOperationalStatus;
};

type CatalogContextValue = {
  resources: Resource[];

  getById: (id: string) => Resource | undefined;
  search: (q: string) => Resource[];

  canManage: boolean;

  createResource: (input: ResourceCreateInput) => Resource;
  updateResource: (id: string, patch: Partial<Omit<Resource, "id">>) => void;
  deleteResource: (id: string) => void;

  setAll: (next: Resource[]) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const CATALOG_KEY = "eafit_catalog_v1";

function uid(prefix = "res") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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

function cleanStr(v?: string) {
  const s = (v ?? "").toString().trim();
  return s ? s : undefined;
}

// (Opcional) si tu catálogo crece mucho por imágenes base64, esto ayuda a detectar.
// Muchos navegadores limitan localStorage ~5MB por dominio.
function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Si se llena el storage, al menos no explota la app en silencio.
    // Puedes cambiar esto por un toast si ya tienes sistema de notificaciones.
    console.warn(
      "[CatalogProvider] No se pudo guardar en localStorage. Probablemente excediste el límite (imágenes muy pesadas).",
      e
    );
  }
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
  const canManage = user?.role === "trabajador" || user?.role === "admin";

  const [resources, setResources] = useState<Resource[]>(() => {
    const stored = safeParse<Resource[]>(localStorage.getItem(CATALOG_KEY), []);
    if (stored.length) return stored;
    return initialResources ?? [];
  });

  useEffect(() => {
    safeSetLocalStorage(CATALOG_KEY, JSON.stringify(resources));
  }, [resources]);

  const value = useMemo<CatalogContextValue>(() => {
    const assertOps = () => {
      if (!canManage) throw new Error("No autorizado: solo trabajadores pueden gestionar el catálogo.");
    };

    const getById = (id: string) => resources.find((r) => r.id === id);

    const search = (q: string) => {
      const nq = norm(q);
      if (!nq) return resources;

      return resources.filter((r) => {
        const hay = [
          r.name,
          r.category,
          r.assetId,
          r.location ?? "",
          r.code ?? "",
          ...(r.includes ?? []),
        ].join(" ");

        return norm(hay).includes(nq);
      });
    };

    const createResource: CatalogContextValue["createResource"] = (input) => {
      assertOps();

      const newItem: Resource = {
        id: uid("res"),
        assetId: input.assetId.trim(),
        name: input.name.trim(),
        category: input.category.trim(),

        // ✅ FIX: antes estaba duplicado
        operationalStatus: input.operationalStatus ?? "active",

        includes: cleanList(input.includes),
        imageUrl: cleanStr(input.imageUrl),
        location: cleanStr(input.location),
        code: cleanStr(input.code),
      };

      setResources((prev) => [newItem, ...prev]);
      return newItem;
    };

    const updateResource: CatalogContextValue["updateResource"] = (id, patch) => {
      assertOps();

      setResources((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;

          const next: Resource = { ...r, ...patch };

          // normalización mínima (consistente)
          if (typeof next.assetId === "string") next.assetId = next.assetId.trim();
          if (typeof next.name === "string") next.name = next.name.trim();
          if (typeof next.category === "string") next.category = next.category.trim();

          if (typeof next.location === "string") next.location = cleanStr(next.location);
          if (typeof next.code === "string") next.code = cleanStr(next.code);
          if (Array.isArray(next.includes)) next.includes = cleanList(next.includes);

          if (typeof next.imageUrl === "string") next.imageUrl = cleanStr(next.imageUrl);

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