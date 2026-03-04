// src/app/usersContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export type UserRole = "usuario" | "trabajador" | "admin";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  banned: boolean;
  banReason?: string;
  bannedAtISO?: string;

  createdAtISO: string;
  updatedAtISO: string;
};

export type UserCreateInput = {
  name: string;
  email: string;
  role: UserRole;
  banned?: boolean;
  banReason?: string;
};

type UsersContextValue = {
  users: UserRecord[];

  canManage: boolean;

  getById: (id: string) => UserRecord | undefined;
  findByEmail: (email: string) => UserRecord | undefined;
  search: (q: string) => UserRecord[];

  createUser: (input: UserCreateInput) => UserRecord;
  updateUser: (id: string, patch: Partial<Omit<UserRecord, "id" | "createdAtISO">>) => void;
  deleteUser: (id: string) => void;

  setAll: (next: UserRecord[]) => void;
};

const UsersContext = createContext<UsersContextValue | null>(null);
const USERS_KEY = "eafit_users_v1";

function nowISO() {
  return new Date().toISOString();
}

function uid(prefix = "usr") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
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

function cleanStr(v?: string) {
  const s = (v ?? "").toString().trim();
  return s ? s : undefined;
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("[UsersProvider] No se pudo guardar en localStorage.", e);
  }
}

export function UsersProvider({
  children,
  initialUsers,
}: {
  children: React.ReactNode;
  initialUsers?: UserRecord[];
}) {
  const { user } = useAuth();
  const canManage = user?.role === "trabajador" || user?.role === "admin";

  const [users, setUsers] = useState<UserRecord[]>(() => {
    const stored = safeParse<UserRecord[]>(localStorage.getItem(USERS_KEY), []);
    if (stored.length) return stored;
    return initialUsers ?? [];
  });

  useEffect(() => {
    safeSetLocalStorage(USERS_KEY, JSON.stringify(users));
  }, [users]);

  const value = useMemo<UsersContextValue>(() => {
    const assertOps = () => {
      if (!canManage) throw new Error("No autorizado: solo trabajadores pueden gestionar usuarios.");
    };

    const getById = (id: string) => users.find((u) => u.id === id);

    const findByEmail = (email: string) => {
      const e = norm(email);
      if (!e) return undefined;
      return users.find((u) => norm(u.email) === e);
    };

    const search = (q: string) => {
      const nq = norm(q);
      if (!nq) return users;

      return users.filter((u) => {
        const hay = [u.name, u.email, u.role, u.banned ? "vetado" : "activo", u.banReason ?? ""].join(
          " "
        );
        return norm(hay).includes(nq);
      });
    };

    const createUser: UsersContextValue["createUser"] = (input) => {
      assertOps();

      const t = nowISO();
      const banned = Boolean(input.banned);

      const next: UserRecord = {
        id: uid("usr"),
        name: input.name.trim(),
        email: input.email.trim(),
        role: input.role,
        banned,
        banReason: banned ? cleanStr(input.banReason) : undefined,
        bannedAtISO: banned ? t : undefined,
        createdAtISO: t,
        updatedAtISO: t,
      };

      // opcional: evita duplicados por email (si quieres)
      // si existe, actualiza en vez de crear
      const existing = findByEmail(next.email);
      if (existing) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === existing.id
              ? { ...u, ...next, id: existing.id, createdAtISO: existing.createdAtISO, updatedAtISO: t }
              : u
          )
        );
        return { ...existing, ...next, id: existing.id, createdAtISO: existing.createdAtISO, updatedAtISO: t };
      }

      setUsers((prev) => [next, ...prev]);
      return next;
    };

    const updateUser: UsersContextValue["updateUser"] = (id, patch) => {
      assertOps();

      const t = nowISO();
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;

          const next = { ...u, ...patch } as UserRecord;

          next.name = next.name?.trim?.() ?? u.name;
          next.email = next.email?.trim?.() ?? u.email;
          next.banReason = next.banned ? cleanStr(next.banReason) : undefined;
          next.bannedAtISO = next.banned ? next.bannedAtISO ?? t : undefined;
          next.updatedAtISO = t;

          return next;
        })
      );
    };

    const deleteUser: UsersContextValue["deleteUser"] = (id) => {
      assertOps();
      setUsers((prev) => prev.filter((u) => u.id !== id));
    };

    return {
      users,
      canManage,
      getById,
      findByEmail,
      search,
      createUser,
      updateUser,
      deleteUser,
      setAll: setUsers,
    };
  }, [users, canManage]);

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}