import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Tab = "login" | "register";

const isOpsPath = (path: string) => path === "/ops" || path.startsWith("/ops/");
const isEafitEmail = (email: string) => /^[^\s@]+@eafit\.edu\.co$/i.test(email.trim());

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-eafit-muted">{label}</label>
      {children}
      {error && <p className="text-xs text-status-danger mt-1">{error}</p>}
    </div>
  );
}

/** ✅ Segmented control con slider (no se pega / no se corta) */
function SegmentedTabs({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
}) {
  const isLogin = value === "login";

  return (
    <div
      className={[
        "relative",
        "rounded-[18px] border border-eafit-border bg-eafit-surface",
        "p-1.5",                 // ✅ espacio interno real
        "overflow-hidden",       // ✅ el slider nunca se sale
      ].join(" ")}
      role="tablist"
      aria-label="Cambiar entre ingresar y registrarse"
    >
      {/* Slider */}
      <span
        className={[
          "absolute top-1.5 bottom-1.5", // ✅ mismo padding del contenedor
          "w-[calc(50%-0.375rem)]",      // ✅ resta el gap visual
          "rounded-[14px]",
          "bg-eafit-primary shadow-soft",
          "transition-transform duration-200 ease-out",
          isLogin ? "translate-x-0 left-1.5" : "translate-x-full left-1.5",
        ].join(" ")}
        aria-hidden
      />

      <div className="relative z-10 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange("login")}
          role="tab"
          aria-selected={isLogin}
          className={[
            "h-11 rounded-[14px] text-sm font-semibold transition",
            isLogin ? "text-white" : "text-eafit-muted hover:text-eafit-text",
          ].join(" ")}
        >
          Ingresar
        </button>

        <button
          type="button"
          onClick={() => onChange("register")}
          role="tab"
          aria-selected={!isLogin}
          className={[
            "h-11 rounded-[14px] text-sm font-semibold transition",
            !isLogin ? "text-white" : "text-eafit-muted hover:text-eafit-text",
          ].join(" ")}
        >
          Registrarse
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { login, register, isAuthed } = useAuth();

  const [tab, setTab] = useState<Tab>("login");

  const [loginForm, setLoginForm] = useState({ emailOrPhone: "", password: "" });
  const [loginState, setLoginState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  const [regForm, setRegForm] = useState({ email: "", phone: "", password: "", confirm: "" });
  const [regState, setRegState] = useState<{
    loading: boolean;
    error: string | null;
    errors: { email?: string; phone?: string; password?: string; confirm?: string };
  }>({ loading: false, error: null, errors: {} });

  const from = useMemo(
    () => (((location.state as any)?.from as string | undefined) ?? "/"),
    [location.state]
  );

  useEffect(() => {
    if (isAuthed) nav("/", { replace: true });
  }, [isAuthed, nav]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setLoginState({ loading: false, error: null });
    setRegState({ loading: false, error: null, errors: {} });
  };

  const validateRegister = () => {
    const email = regForm.email.trim();
    const errors: { email?: string; phone?: string; password?: string; confirm?: string } = {};

    if (!email) errors.email = "El correo es requerido.";
    else if (!isEafitEmail(email)) errors.email = "Debe ser un correo institucional (@eafit.edu.co).";

    if (!regForm.phone.trim()) errors.phone = "El celular es requerido.";

    if (!regForm.password) errors.password = "La contraseña es requerida.";
    else if (regForm.password.length < 8) errors.password = "Mínimo 8 caracteres.";

    if (!regForm.confirm) errors.confirm = "Confirma tu contraseña.";
    else if (regForm.password !== regForm.confirm) errors.confirm = "Las contraseñas no coinciden.";

    setRegState((p) => ({ ...p, errors }));
    return Object.keys(errors).length === 0;
  };

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginState({ loading: true, error: null });

    try {
      await login(loginForm.emailOrPhone.trim(), loginForm.password);

      // ✅ seguridad UX: usuario nunca entra a /ops por "from"
      if (isOpsPath(from)) {
        nav("/", { replace: true });
        return;
      }

      nav(from, { replace: true });
    } catch (err: any) {
      setLoginState({ loading: false, error: err?.message ?? "No se pudo iniciar sesión." });
      return;
    }

    setLoginState({ loading: false, error: null });
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegState((p) => ({ ...p, error: null }));

    if (!validateRegister()) return;

    setRegState((p) => ({ ...p, loading: true }));
    try {
      // ✅ register ahora auto-loguea en el AuthContext
      await register(regForm.email.trim(), regForm.password, regForm.phone.trim() || undefined);

      // ✅ directo al dashboard del estudiante
      nav("/", { replace: true });
    } catch (err: any) {
      setRegState((p) => ({ ...p, loading: false, error: err?.message ?? "No se pudo crear la cuenta." }));
    }
  }

  return (
    <div className="min-h-screen bg-eafit-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-eafit-primary shadow-soft mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div className="text-xl font-semibold text-eafit-text">Medialab</div>
          <div className="text-sm text-eafit-muted mt-0.5">Sistema de préstamos · EAFIT</div>
        </div>

        <div className="ui-card p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-eafit-text">
              {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-sm text-eafit-muted mt-1.5">
              {tab === "login"
                ? "Ingresa con tu correo institucional."
                : "Regístrate con tu correo @eafit.edu.co."}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <SegmentedTabs value={tab} onChange={switchTab} />
          </div>

        {tab === "login" && (
          <form onSubmit={onLoginSubmit} className="space-y-4">
            <Field label="Correo o celular">
              <input
                className="ui-input mt-1"
                type="text"
                autoComplete="username"
                placeholder="Correo Institucional"
                value={loginForm.emailOrPhone}
                onChange={(e) => setLoginForm((p) => ({ ...p, emailOrPhone: e.target.value }))}
                required
              />
            </Field>

            <Field label="Contraseña">
              <input
                className="ui-input mt-1"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </Field>

            {loginState.error && (
              <div className="rounded-card border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">
                {loginState.error}
              </div>
            )}

            <button type="submit" disabled={loginState.loading} className="ui-btn-primary w-full h-12 disabled:opacity-60">
              {loginState.loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}

        {tab === "register" && (
          <form onSubmit={onRegisterSubmit} className="space-y-4">
            <Field label="Correo" error={regState.errors.email}>
              <input
                className={[
                  "ui-input mt-1",
                  regState.errors.email ? "border-status-danger focus:ring-status-danger/30" : "",
                ].join(" ")}
                type="email"
                autoComplete="username"
                placeholder="Correo Institucional"  // ✅ no tu correo
                value={regForm.email}
                onChange={(e) => {
                  const v = e.target.value;
                  setRegForm((p) => ({ ...p, email: v }));
                  if (regState.errors.email)
                    setRegState((p) => ({ ...p, errors: { ...p.errors, email: undefined } }));
                }}
              />
            </Field>

            <Field label="Celular" error={regState.errors.phone}>
              <input
                className={[
                  "ui-input mt-1",
                  regState.errors.phone ? "border-status-danger focus:ring-status-danger/30" : "",
                ].join(" ")}
                type="tel"
                autoComplete="tel"
                placeholder="Número Celular"
                value={regForm.phone}
                onChange={(e) => {
                  const v = e.target.value;
                  setRegForm((p) => ({ ...p, phone: v }));
                  if (regState.errors.phone)
                    setRegState((p) => ({ ...p, errors: { ...p.errors, phone: undefined } }));
                }}
              />
            </Field>

            <Field label="Contraseña" error={regState.errors.password}>
              <input
                className={[
                  "ui-input mt-1",
                  regState.errors.password ? "border-status-danger focus:ring-status-danger/30" : "",
                ].join(" ")}
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={regForm.password}
                onChange={(e) => {
                  const v = e.target.value;
                  setRegForm((p) => ({ ...p, password: v }));
                  if (regState.errors.password)
                    setRegState((p) => ({ ...p, errors: { ...p.errors, password: undefined } }));
                }}
              />
            </Field>

            <Field label="Confirmar contraseña" error={regState.errors.confirm}>
              <input
                className={[
                  "ui-input mt-1",
                  regState.errors.confirm ? "border-status-danger focus:ring-status-danger/30" : "",
                ].join(" ")}
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={regForm.confirm}
                onChange={(e) => {
                  const v = e.target.value;
                  setRegForm((p) => ({ ...p, confirm: v }));
                  if (regState.errors.confirm)
                    setRegState((p) => ({ ...p, errors: { ...p.errors, confirm: undefined } }));
                }}
              />
            </Field>

            {regState.error && (
              <div className="rounded-card border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">
                {regState.error}
              </div>
            )}

            <button type="submit" disabled={regState.loading} className="ui-btn-primary w-full h-12 disabled:opacity-60">
              {regState.loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}