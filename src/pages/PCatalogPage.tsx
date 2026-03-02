import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/TopBar";
import { Modal } from "../components/Modal";
import { useCatalog } from "../app/catalogContext";
import type { Resource, ResourceOperationalStatus } from "../types";

// =========================
// Types
// =========================

type Draft = {
  assetId: string;
  name: string;
  category: string;
  operationalStatus: ResourceOperationalStatus;
  includesText: string;
  description: string;
};

type FormErrors = Partial<Record<keyof Draft, string>>;

// =========================
// Helpers
// =========================

const emptyDraft = (): Draft => ({
  assetId: "",
  name: "",
  category: "",
  operationalStatus: "active",
  includesText: "",
  description: "",
});

function toIncludesArray(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function validateDraft(draft: Draft): FormErrors {
  const errors: FormErrors = {};
  if (!draft.assetId.trim()) errors.assetId = "El ID de inventario (assetId) es obligatorio.";
  if (!draft.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!draft.category.trim()) errors.category = "La categoría es obligatoria.";
  return errors;
}

// =========================
// Sub-components
// =========================

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-status-danger">{message}</p>;
}

// =========================
// Page
// =========================

export default function OpsCatalogPage() {
  const nav = useNavigate();
  const { resources, search, canManage, createResource, updateResource, deleteResource } = useCatalog();

  if (!canManage) return null;

  const [q, setQ] = useState("");
  const list = useMemo(() => search(q), [q, resources, search]);

  const [openEditor, setOpenEditor] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const editing = useMemo(
    () => resources.find((r) => r.id === editingId) ?? null,
    [editingId, resources]
  );

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormErrors({});
    setOpenEditor(true);
  }

  function openEdit(r: Resource) {
    setEditingId(r.id);
    setDraft({
      assetId: r.assetId ?? "",
      name: r.name ?? "",
      category: r.category ?? "",
      operationalStatus: r.operationalStatus ?? "active",
      includesText: (r.includes ?? []).join(", "),
      description: r.description ?? "",
    });
    setFormErrors({});
    setOpenEditor(true);
  }

  function handleClose() {
    setOpenEditor(false);
    setFormErrors({});
  }

  function submit() {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: Omit<Resource, "id"> = {
      assetId: draft.assetId.trim(),
      name: draft.name.trim(),
      category: draft.category.trim(),
      operationalStatus: draft.operationalStatus,
      includes: toIncludesArray(draft.includesText),
      description: draft.description?.trim() || undefined,
    };

    if (!editingId) createResource(payload);
    else updateResource(editingId, payload);

    setOpenEditor(false);
  }

  function askDelete(r: Resource) {
    setEditingId(r.id);
    setOpenDelete(true);
  }

  function confirmDelete() {
    if (editingId) deleteResource(editingId);
    setOpenDelete(false);
    setEditingId(null);
  }

  function updateField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: undefined }));
  }

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-eafit-text">Gestión de catálogo</div>
            <div className="text-sm text-eafit-muted mt-1">
              Agregar, editar o eliminar recursos del laboratorio.
            </div>
          </div>

          <div className="flex gap-2">
            <button className="ui-btn-ghost h-10" onClick={() => nav("/ops")} type="button">
              ← Volver
            </button>
            <button className="ui-btn h-10" onClick={openCreate} type="button">
              + Nuevo recurso
            </button>
          </div>
        </div>

        <div className="mt-6 ui-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              className="ui-input h-10 w-full"
              placeholder="Buscar por nombre, categoría, assetId, incluye…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-sm text-eafit-muted shrink-0">{list.length} items</div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {list.map((r) => (
              <div
                key={r.id}
                className="rounded-btn border border-eafit-border bg-white p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-eafit-text truncate">{r.name}</div>
                  <div className="text-sm text-eafit-muted">
                    {r.category} · <span className="font-medium text-eafit-text/70">{r.assetId}</span>
                  </div>

                  {r.includes?.length ? (
                    <div className="text-xs text-eafit-muted mt-2 line-clamp-1">
                      <span className="font-semibold text-eafit-text/70">Incluye:</span>{" "}
                      {r.includes.join(", ")}
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button className="ui-btn-ghost h-10" onClick={() => openEdit(r)} type="button">
                    Editar
                  </button>
                  <button className="ui-btn-danger h-10" onClick={() => askDelete(r)} type="button">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            {!list.length && (
              <div className="text-sm text-eafit-muted py-8 text-center">No hay resultados.</div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Crear/Editar */}
      <Modal
        open={openEditor}
        title={editingId ? "Editar recurso" : "Nuevo recurso"}
        onClose={handleClose}
        footer={
          <div className="flex justify-end gap-2">
            <button className="ui-btn-ghost h-10" onClick={handleClose} type="button">
              Cancelar
            </button>
            <button className="ui-btn h-10" onClick={submit} type="button">
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">ID inventario (assetId)</span>
            <input
              className={[
                "ui-input h-10",
                formErrors.assetId ? "border-status-danger focus:ring-status-danger/20" : "",
              ].join(" ")}
              value={draft.assetId}
              onChange={(e) => updateField("assetId", e.target.value)}
              placeholder="MQ3-01, CAM-01…"
            />
            <FieldError message={formErrors.assetId} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Nombre</span>
            <input
              className={[
                "ui-input h-10",
                formErrors.name ? "border-status-danger focus:ring-status-danger/20" : "",
              ].join(" ")}
              value={draft.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <FieldError message={formErrors.name} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Categoría</span>
            <input
              className={[
                "ui-input h-10",
                formErrors.category ? "border-status-danger focus:ring-status-danger/20" : "",
              ].join(" ")}
              value={draft.category}
              onChange={(e) => updateField("category", e.target.value)}
            />
            <FieldError message={formErrors.category} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Estado operativo</span>
            <select
              className="ui-input h-10"
              value={draft.operationalStatus}
              onChange={(e) => updateField("operationalStatus", e.target.value as Draft["operationalStatus"])}
            >
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="retired">Retirado</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Incluye (separado por comas)</span>
            <input
              className="ui-input h-10"
              placeholder="Cable, cargador, estuche…"
              value={draft.includesText}
              onChange={(e) => updateField("includesText", e.target.value)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Descripción</span>
            <textarea
              className="ui-input min-h-[110px] py-2"
              value={draft.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </label>
        </div>

        {editing && (
          <div className="mt-4 text-xs text-eafit-muted">
            ID: <span className="text-eafit-text/80">{editing.id}</span>
          </div>
        )}
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        open={openDelete}
        title="Eliminar recurso"
        onClose={() => setOpenDelete(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="ui-btn-ghost h-10" onClick={() => setOpenDelete(false)} type="button">
              Cancelar
            </button>
            <button className="ui-btn-danger h-10" onClick={confirmDelete} type="button">
              Sí, eliminar
            </button>
          </div>
        }
      >
        <div className="rounded-card border border-status-danger/20 bg-status-danger/10 p-4 text-sm text-status-danger">
          Esta acción no se puede deshacer.
        </div>
      </Modal>
    </div>
  );
}
