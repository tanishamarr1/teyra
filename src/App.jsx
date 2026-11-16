import { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { configured, sb } from "./lib/supabase";
import { loadProfile, loadRoutine, recentWorkouts, regenerateRoutine } from "./lib/api";
import { Icon, NAV } from "./components/Icon";
import ErrorBoundary from "./components/ErrorBoundary";
import Auth, { ResetPassword } from "./Auth";
import Onboarding from "./Onboarding";
import Inicio from "./pages/Inicio";
import Rutinas from "./pages/Rutinas";
import Entreno from "./pages/Entreno";
import Nutricion from "./pages/Nutricion";
import Progreso from "./pages/Progreso";
import Perfil from "./pages/Perfil";

function Splash({ text }) {
  return (
    <div className="auth">
      <div className="hero">
        <img src="/logo.png" alt="TEYRA" />
        {text && <p className="mu" role="status">{text}</p>}
      </div>
    </div>
  );
}

function Setup() {
  return (
    <div className="auth">
      <div className="card">
        <h1 style={{ fontSize: 24 }}>Falta configurar Supabase</h1>
        <p className="mu" style={{ marginTop: 10 }}>
          Copia <code>.env.example</code> a <code>.env</code>, pega tu URL y tu anon key, y reinicia <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

function Shell({ uid }) {
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [data, setData] = useState({ profile: null, plan: null, workouts: [] });
  const generating = useRef(null);
  const { pathname } = useLocation();

  // Recarga los datos en segundo plano (no vuelve a mostrar la pantalla de carga).
  const reload = useCallback(async () => {
    try {
      const [profile, plan0, workouts] = await Promise.all([loadProfile(uid), loadRoutine(), recentWorkouts()]);
      let plan = plan0;
      if (profile && !plan) {
        setNote("Creando tu rutina…");
        generating.current ??= regenerateRoutine(profile).finally(() => { generating.current = null; });
        await generating.current;
        plan = await loadRoutine();
      }
      setData({ profile, plan, workouts });
      setError("");
      setStatus("ready");
    } catch (e) {
      setError(e.message || "No se pudieron cargar tus datos.");
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (status === "loading") return <Splash text={note} />;
  if (status === "error")
    return (
      <div className="auth">
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>No pudimos cargar tus datos</h1>
          <p className="err" role="alert">{error}</p>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => { setStatus("loading"); reload(); }}>Reintentar</button>
            <button className="btn o" onClick={() => sb.auth.signOut()}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    );
  if (!data.profile) return <Onboarding mode="complete" uid={uid} onDone={reload} onBack={() => sb.auth.signOut()} />;

  const ctx = { uid, ...data, reload };
  const links = NAV.map(([to, icon, label]) => (
    <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => "nv" + (isActive ? " on" : "")}>
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <div className="app">
      <aside>
        <div className="row">
          <img src="/logo.png" className="lg" alt="" />
          <b style={{ fontSize: 20, letterSpacing: "-.03em" }}>TEYRA.</b>
        </div>
        <nav aria-label="Principal">{links}</nav>
        <small>Creada por Tanisha Rodriguez</small>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Inicio {...ctx} />} />
          <Route path="/rutinas" element={<Rutinas {...ctx} />} />
          <Route path="/entreno/:dayId" element={<Entreno {...ctx} />} />
          <Route path="/nutricion" element={<Nutricion {...ctx} />} />
          <Route path="/progreso" element={<Progreso {...ctx} />} />
          <Route path="/perfil" element={<Perfil {...ctx} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="bn" aria-label="Principal">{links}</nav>
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let live = true;
    sb.auth.getSession().then(({ data }) => live && setSession(data.session)).catch(() => live && setSession(null));
    // Dentro de este callback solo se guarda estado (no se llama a Supabase) para evitar bloqueos.
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      setSession(s);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  // Quita ?code=... de la barra de direcciones después de abrir un enlace del correo.
  useEffect(() => {
    if (session && window.location.search.includes("code=")) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, [session]);

  if (session === undefined) return <Splash />;
  if (session && recovery) return <ResetPassword onDone={() => setRecovery(false)} />;
  if (!session) return <Auth />;
  return <Shell key={session.user.id} uid={session.user.id} />;
}

export default function App() {
  if (!configured) return <Setup />;
  return (
    <ErrorBoundary>
      <HashRouter>
        <Root />
      </HashRouter>
    </ErrorBoundary>
  );
}
