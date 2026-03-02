import React, { createContext, useContext, useState } from "react";

/* ─── types ───────────────────────────────────────────── */
export type UserRole = "usuario" | "practicante";

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

/* ─── storage keys ────────────────────────────────────── */
const LS_TOKEN = "eafit_auth_token";
const LS_USER = "eafit_auth_user";
const LS_REG_USERS = "eafit_registered_users";

/* ─── internal store type ─────────────────────────────── */
type StoredUser = User & {
  password: string;
  token: string;
};

/* ─── seed accounts ───────────────────────────────────── */
const SEED_USERS: StoredUser[] = [
  {
    id: "u1",
    name: "Camilo Seguro",
    email: "cseguroc@eafit.edu.co",
    password: "1234",
    token: "demo_token_practicante",
    role: "practicante",
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

/* ─── context ─────────────────────────────────────────── */
const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [user, setUser] = useState<User | null>(() =>
    safeParse<User | null>(localStorage.getItem(LS_USER), null)
  );

  const isAuthed = Boolean(token && user);

  async function login(email: string, password: string) {
    const entry = findUserByEmail(email);
    if (!entry || entry.password !== password) throw new Error("Correo o contraseña incorrectos");

    const nextUser: User = { id: entry.id, name: entry.name, email: entry.email, role: entry.role };

    setToken(entry.token);
    setUser(nextUser);
    persistSession(entry.token, nextUser);
  }

  // ✅ Register ahora hace auto-login y lo persiste
  async function register(email: string, password: string) {
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

    // ✅ auto-login al crear
    const nextUser: User = {
      id: newStored.id,
      name: newStored.name,
      email: newStored.email,
      role: newStored.role,
    };

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