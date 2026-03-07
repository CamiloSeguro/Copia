import React, { createContext, useContext, useState } from "react";

/* ─── types ───────────────────────────────────────────── */
export type UserRole = "usuario" | "trabajador" | "admin";

/** Verifica si un rol tiene acceso al panel de operaciones */
export function isOpsRole(role?: string): role is "trabajador" | "admin" {
  return role === "trabajador" || role === "admin";
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthed: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
};

/* ─── storage keys ────────────────────────────────────── */
const LS_TOKEN = "eafit_auth_token";
const LS_USER = "eafit_auth_user";
const LS_REG_USERS = "eafit_registered_users";

/** ✅ Directorio administrable por trabajador (UsersProvider) */
const USERS_DIR_KEY = "eafit_users_v1";

/* ─── internal store type ─────────────────────────────── */
type StoredUser = User & {
  password: string;
  token: string;
};

/* ─── directory type (solo lo que necesitamos) ────────── */
type DirUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAtISO?: string;
  updatedAtISO?: string;
};

/* ─── seed accounts ───────────────────────────────────── */
const SEED_USERS: StoredUser[] = [
  {
    id: "u0",
    name: "Admin MediaLab",
    email: "admin@eafit.edu.co",
    password: "admin123",
    token: "demo_token_admin",
    role: "admin",
  },
  {
    id: "u1",
    name: "Camilo Seguro",
    email: "cseguroc@eafit.edu.co",
    password: "1234",
    token: "demo_token_trabajador",
    role: "trabajador",
  },
  {
    id: "u2",
    name: "Usuario Demo",
    email: "user@eafit.edu.co",
    password: "user123",
    token: "demo_token_usuario",
    role: "usuario",
  },
];

/* ─── helpers ─────────────────────────────────────────── */
const normEmail = (s: string) => s.trim().toLowerCase();

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadRegisteredUsers(): StoredUser[] {
  return safeParse<StoredUser[]>(localStorage.getItem(LS_REG_USERS), []);
}

function saveRegisteredUsers(users: StoredUser[]) {
  localStorage.setItem(LS_REG_USERS, JSON.stringify(users));
}

function findUserByEmail(email: string): StoredUser | undefined {
  const e = normEmail(email);
  return [...SEED_USERS, ...loadRegisteredUsers()].find((u) => u.email === e);
}

function persistSession(token: string | null, user: User | null) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);

  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
  else localStorage.removeItem(LS_USER);
}

/* ─── ✅ directory helpers ─────────────────────────────── */
function nowISO() {
  return new Date().toISOString();
}

function loadUserDirectory(): DirUser[] {
  return safeParse<DirUser[]>(localStorage.getItem(USERS_DIR_KEY), []);
}

function saveUserDirectory(users: DirUser[]) {
  localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));
}

function findDirUserByEmail(email: string): DirUser | undefined {
  const e = normEmail(email);
  return loadUserDirectory().find((u) => normEmail(u.email) === e);
}

function findDirUserByPhone(phone: string): DirUser | undefined {
  const p = phone.trim();
  if (!p) return undefined;
  return loadUserDirectory().find((u) => u.phone?.trim() === p);
}

/** Crea o actualiza el directorio para que admin pueda gestionar */
function upsertDirUser(input: { id: string; name: string; email: string; role: UserRole; phone?: string }) {
  const t = nowISO();
  const dir = loadUserDirectory();
  const e = normEmail(input.email);
  const idx = dir.findIndex((u) => normEmail(u.email) === e);

  if (idx >= 0) {
    const prev = dir[idx]!;
    dir[idx] = {
      ...prev,
      id: prev.id ?? input.id,
      name: input.name.trim(),
      email: e,
      role: input.role,
      phone: input.phone?.trim() || prev.phone,
      updatedAtISO: t,
      createdAtISO: prev.createdAtISO ?? t,
    };
  } else {
    dir.unshift({
      id: input.id,
      name: input.name.trim(),
      email: e,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      createdAtISO: t,
      updatedAtISO: t,
    });
  }

  saveUserDirectory(dir);
}

/* ─── context ─────────────────────────────────────────── */
const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [user, setUser] = useState<User | null>(() =>
    safeParse<User | null>(localStorage.getItem(LS_USER), null)
  );

  const isAuthed = Boolean(token && user);

  async function login(emailOrPhone: string, password: string) {
    // Busca primero por email; si no encuentra, intenta por celular
    let entry = findUserByEmail(emailOrPhone);
    if (!entry) {
      const byPhone = findDirUserByPhone(emailOrPhone);
      if (byPhone) entry = findUserByEmail(byPhone.email);
    }
    if (!entry || entry.password !== password) throw new Error("Correo, celular o contraseña incorrectos");

    // ✅ Usa name/role del directorio si existen (admin manda)
    const dirUser = findDirUserByEmail(entry.email);
    const nextUser: User = {
      id: entry.id,
      name: dirUser?.name?.trim() || entry.name,
      email: entry.email,
      role: dirUser?.role || entry.role,
    };

    // ✅ asegura que esté en directorio (por si viene del seed y nunca se creó)
    upsertDirUser(nextUser);

    setToken(entry.token);
    setUser(nextUser);
    persistSession(entry.token, nextUser);
  }

  // ✅ Register hace auto-login y también crea el registro en directorio
  async function register(email: string, password: string, phone?: string) {
    const normalized = normEmail(email);
    if (findUserByEmail(normalized)) throw new Error("Ya existe una cuenta con este correo.");

    const newStored: StoredUser = {
      id: `reg_${Date.now()}`,
      name: normalized.split("@")[0] ?? "usuario",
      email: normalized,
      password,
      role: "usuario",
      token: `token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };

    saveRegisteredUsers([...loadRegisteredUsers(), newStored]);

    const existingDir = findDirUserByEmail(normalized);
    const nextUser: User = {
      id: newStored.id,
      name: existingDir?.name?.trim() || newStored.name,
      email: newStored.email,
      role: existingDir?.role || newStored.role,
    };

    // ✅ crea/actualiza el registro administrable (incluye celular)
    upsertDirUser({ ...nextUser, phone });

    setToken(newStored.token);
    setUser(nextUser);
    persistSession(newStored.token, nextUser);
  }

  function logout() {
    setToken(null);
    setUser(null);
    persistSession(null, null);
  }

  return (
    <AuthCtx.Provider value={{ token, user, isAuthed, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}