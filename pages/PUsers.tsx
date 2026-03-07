import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/TopBar";
import { Modal } from "../components/Modal";
import { useUsers, type UserRole, type UserRecord } from "../app/userContext";

type Draft = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};

type FormErrors = Partial<Record<keyof Draft, string>>;

const emptyDraft = (): Draft => ({
  name: "",
  email: "",
  phone: "",
  role: "usuario",
});

function validateDraft(d: Draft): FormErrors {
  const errors: FormErrors = {};
  if (!d.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!d.email.trim()) errors.email = "El correo es obligatorio.";
  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) errors.email = "Correo inválido.";
  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-status-danger">{message}</p>;
}

export default function OpsUsersPage() {
  const nav = useNavigate();
  const { users, search, canManage, createUser, updateUser, deleteUser } = useUsers();

  if (!canManage) return null;

  const [q, setQ] = useState("");
  const list = useMemo(() => search(q), [q, users, search]);

  const [openEditor, setOpenEditor] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => users.find((u) => u.id === editingId) ?? null, [users, editingId]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setErrors({});
    setOpenEditor(true);
  }

  function openEdit(u: UserRecord) {
    setEditingId(u.id);
    setDraft({
      name: u.name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      role: u.role ?? "usuario",
    });
    setErrors({});
    setOpenEditor(true);
  }

  function closeEditor() {
    setOpenEditor(false);
    setErrors({});
  }

  function submit() {
    const e = validateDraft(draft);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    if (!editingId) {
      createUser({
        name: draft.name,
        email: draft.email,
        phone: draft.phone || undefined,
        role: draft.role,
      });
    } else {
      updateUser(editingId, {
        name: draft.name,
        email: draft.email,
        phone: draft.phone || undefined,
        role: draft.role,
      });
    }

    setOpenEditor(false);
  }

  function askDelete(u: UserRecord) {
    setEditingId(u.id);
    setOpenDelete(true);
  }

  function confirmDelete() {
    if (editingId) deleteUser(editingId);
    setOpenDelete(false);
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-eafit-bg">
      <Topbar />

      <main className="mx-auto max-w-content px-4 sm:px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-eafit-text">Administración de usuarios</div>
            <div className="text-sm text-eafit-muted mt-1">
              Agregar, editar y eliminar usuarios del sistema.
            </div>
          </div>

          <div className="flex gap-2">
            <button className="ui-btn-ghost h-10" onClick={() => nav("/ops")} type="button">
              ← Volver
            </button>
            <button className="ui-btn-primary h-10" onClick={openCreate} type="button">
              + Nuevo usuario
            </button>
          </div>
        </div>

        <div className="mt-6 ui-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              className="ui-input h-10 w-full"
              placeholder="Buscar por nombre, correo, rol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-sm text-eafit-muted shrink-0">{list.length} usuarios</div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {list.map((u) => (
              <div
                key={u.id}
                className="rounded-btn border border-eafit-border bg-white p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-eafit-text truncate">{u.name}</div>

                    <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full border border-eafit-border bg-eafit-bg text-eafit-muted">
                      {u.role === "admin" ? "Admin" : u.role === "trabajador" ? "Trabajador" : "Usuario"}
                    </span>
                  </div>

                  <div className="text-sm text-eafit-muted mt-1 truncate">{u.email}</div>
                  {u.phone ? (
                    <div className="text-xs text-eafit-muted mt-0.5">{u.phone}</div>
                  ) : null}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button className="ui-btn-ghost h-10" onClick={() => openEdit(u)} type="button">
                    Editar
                  </button>

                  <button className="ui-btn-danger h-10" onClick={() => askDelete(u)} type="button">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            {!list.length && (
              <div className="text-sm text-eafit-muted py-8 text-center">No hay usuarios.</div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Crear/Editar */}
      <Modal
        open={openEditor}
        title={editingId ? "Editar usuario" : "Nuevo usuario"}
        onClose={closeEditor}
        footer={
          <div className="flex justify-end gap-2">
            <button className="ui-btn-ghost h-10" onClick={closeEditor} type="button">
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
            <span className="text-sm text-eafit-muted">Nombre</span>
            <input
              className={[
                "ui-input h-10",
                errors.name ? "border-status-danger focus:ring-status-danger/20" : "",
              ].join(" ")}
              value={draft.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <FieldError message={errors.name} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Correo</span>
            <input
              className={[
                "ui-input h-10",
                errors.email ? "border-status-danger focus:ring-status-danger/20" : "",
              ].join(" ")}
              value={draft.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="nombre@eafit.edu.co"
            />
            <FieldError message={errors.email} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Celular</span>
            <input
              className="ui-input h-10"
              value={draft.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="300 000 0000"
              type="tel"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-eafit-muted">Rol</span>
            <select
              className="ui-input h-10"
              value={draft.role}
              onChange={(e) => updateField("role", e.target.value as UserRole)}
            >
              <option value="usuario">Usuario</option>
              <option value="trabajador">Trabajador</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        {editing ? (
          <div className="mt-4 text-xs text-eafit-muted">
            ID: <span className="text-eafit-text/80">{editing.id}</span>
          </div>
        ) : null}
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        open={openDelete}
        title="Eliminar usuario"
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
