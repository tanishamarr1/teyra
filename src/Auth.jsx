import { useState } from "react";
import { sb } from "./lib/supabase";
import { isEmail } from "./lib/validate";
import { Input } from "./components/Fields";
import Onboarding from "./Onboarding";

const friendly = (e) => {
  const m = e?.message || "";
  if (/invalid login/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/not confirmed/i.test(m)) return "Confirma tu correo antes de entrar (revisa tu bandeja de entrada).";
  if (/rate limit|too many/i.test(m)) return "Demasiados intentos. Espera un momento e inténtalo otra vez.";
  if (/network|fetch/i.test(m)) return "No hay conexión. Revisa tu internet.";
  return m || "Ocurrió un error. Inténtalo de nuevo.";
};

export default function Auth() {
  const [mode, setMode] = useState("welcome");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const go = (m) => { setMode(m); setErr(""); setInfo(""); };

  async function login(e) {
    e.preventDefault();
    if (!isEmail(email)) return setErr("Escribe un correo válido.");
    if (!pw) return setErr("Escribe tu contraseña.");
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr(friendly(error));
    setBusy(false);
  }

  async function forgot(e) {
    e.preventDefault();
    if (!isEmail(email)) return setErr("Escribe un correo válido.");
    setBusy(true); setErr("");
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setBusy(false);
    if (error) return setErr(friendly(error));
    setInfo("Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador.");
  }

  if (mode === "register") return <Onboarding mode="register" onBack={() => go("welcome")} onLogin={() => go("login")} />;

  if (mode === "welcome")
    return (
      <div className="auth">
        <div className="hero">
          <img src="/logo.png" alt="TEYRA" />
          <h1>TEYRA.</h1>
          <p className="mu">Entrenamiento y nutrición a tu medida.</p>
          <div className="row wr" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => go("register")}>Empezar</button>
            <button className="btn o" onClick={() => go("login")}>Ya tengo cuenta</button>
          </div>
        </div>
      </div>
    );

  const isLogin = mode === "login";
  return (
    <div className="auth">
      <form onSubmit={isLogin ? login : forgot} noValidate>
        <h1 style={{ marginBottom: 20 }}>{isLogin ? "Inicia sesión" : "Recupera tu contraseña"}</h1>
        <Input label="Correo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {isLogin && <Input label="Contraseña" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
        {err && <p className="err" role="alert">{err}</p>}
        {info && <p className="ok" role="status">{info}</p>}
        <div className="row" style={{ marginTop: 18 }}>
          <button type="button" className="btn o" onClick={() => go("welcome")}>Atrás</button>
          <button className="btn" disabled={busy}>{busy ? "Un momento…" : isLogin ? "Entrar" : "Enviar enlace"}</button>
        </div>
        <p className="s" style={{ marginTop: 18 }}>
          {isLogin ? (
            <button type="button" className="lnk" onClick={() => go("forgot")}>¿Olvidaste tu contraseña?</button>
          ) : (
            <button type="button" className="lnk" onClick={() => go("login")}>Volver a iniciar sesión</button>
          )}
        </p>
      </form>
    </div>
  );
}

/** Pantalla que se muestra al abrir el enlace de recuperación del correo. */
export function ResetPassword({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(e) {
    e.preventDefault();
    if (pw.length < 8) return setErr("La contraseña debe tener al menos 8 caracteres.");
    if (pw !== pw2) return setErr("Las contraseñas no coinciden.");
    setBusy(true); setErr("");
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(friendly(error));
    onDone();
  }

  return (
    <div className="auth">
      <form onSubmit={save} noValidate>
        <h1 style={{ marginBottom: 20 }}>Nueva contraseña</h1>
        <Input label="Contraseña nueva (mínimo 8 caracteres)" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input label="Repite la contraseña" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
      </form>
    </div>
  );
}
