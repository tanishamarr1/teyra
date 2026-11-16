import { useState } from "react";
import { sb } from "./lib/supabase";
import { ensureProfile, updateProfile } from "./lib/api";
import { EQUIP, EQUIP_KEYS } from "./lib/routine";
import { DAYS, GOALS, LEVELS, MINUTES, SEXES } from "./lib/options";
import { bodyError, isEmail } from "./lib/validate";
import { Input, Select } from "./components/Fields";
import GlutePrompt from "./GlutePrompt";

const TITLES = { account: "Crea tu cuenta", who: "¿Cómo te llamas?", body: "Tu cuerpo", goal: "Tu objetivo", equip: "Tu equipo", glute: "¿Rutina enfocada en glúteos?" };

/**
 * mode="register": crea la cuenta; el perfil lo crea un trigger en la base de datos con estos datos.
 * mode="complete": la persona ya tiene cuenta pero no perfil (registro anterior incompleto).
 */
export default function Onboarding({ mode = "register", uid, onDone, onBack, onLogin }) {
  const complete = mode === "complete";
  const [s, setS] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({
    email: "", pw: "", full_name: "", sex: "M", age: "28", height_cm: "170", weight_kg: "70", target_kg: "65",
    goal: GOALS[0], level: "1", days_per_week: "4", minutes: "60", equip: EQUIP_KEYS[0], glute_focus: null,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const bind = (k) => ({ value: f[k], onChange: (e) => set(k, e.target.value) });
  const isF = f.sex === "F";
  const steps = [complete ? "who" : "account", "body", "goal", "equip", ...(isF ? ["glute"] : [])];
  const step = steps[Math.min(s, steps.length - 1)];
  const last = s >= steps.length - 1;
  const bErr = step === "body" ? bodyError(f) : "";
  const nameOk = f.full_name.trim().length >= 2;
  const invalid =
    (step === "account" && (!nameOk || !isEmail(f.email) || f.pw.length < 8)) ||
    (step === "who" && !nameOk) ||
    (step === "body" && bErr !== "") ||
    (step === "glute" && f.glute_focus === null);

  const payload = () => ({
    full_name: f.full_name.trim(), sex: f.sex, age: +f.age, height_cm: +f.height_cm, weight_kg: +f.weight_kg, target_kg: +f.target_kg,
    goal: f.goal, level: +f.level, days_per_week: +f.days_per_week, minutes: +f.minutes, equipment: EQUIP[f.equip],
    glute_focus: isF && f.glute_focus === true,
  });

  async function finish() {
    setBusy(true); setErr("");
    try {
      if (complete) {
        await ensureProfile();
        await updateProfile(uid, payload());
        onDone();
        return;
      }
      const { data, error } = await sb.auth.signUp({ email: f.email.trim(), password: f.pw, options: { data: payload() } });
      if (error) throw error;
      if (data.user?.identities?.length === 0) throw new Error("Ese correo ya está registrado. Inicia sesión.");
      if (!data.session) setSent(true); // el proyecto exige confirmar el correo
    } catch (e) {
      setErr(e.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="auth">
        <div>
          <h1 style={{ marginBottom: 12 }}>Revisa tu correo</h1>
          <p className="mu">Te enviamos un enlace para confirmar tu cuenta. Después inicia sesión: tu rutina se crea automáticamente.</p>
          <button className="btn" style={{ marginTop: 20 }} onClick={onLogin}>Ir a iniciar sesión</button>
        </div>
      </div>
    );

  return (
    <div className="auth">
      <div>
        <div className="steps" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i <= s ? "on" : ""} />)}</div>
        <p className="mu s">Paso {s + 1} de {steps.length}</p>
        <h1 style={{ margin: "4px 0 20px" }}>{TITLES[step]}</h1>

        {step === "account" && (
          <>
            <Input label="Nombre" autoComplete="name" {...bind("full_name")} />
            <Input label="Correo" type="email" autoComplete="email" {...bind("email")} />
            <Input label="Contraseña (mínimo 8 caracteres)" type="password" autoComplete="new-password" {...bind("pw")} />
          </>
        )}
        {step === "who" && <Input label="Nombre" autoComplete="name" {...bind("full_name")} />}
        {step === "body" && (
          <>
            <Select label="Sexo" options={SEXES} {...bind("sex")} />
            <div className="row">
              <Input label="Edad" type="number" inputMode="numeric" min="14" max="90" {...bind("age")} />
              <Input label="Altura (cm)" type="number" inputMode="numeric" min="120" max="230" {...bind("height_cm")} />
            </div>
            <div className="row">
              <Input label="Peso actual (kg)" type="number" inputMode="decimal" step="0.1" {...bind("weight_kg")} />
              <Input label="Peso objetivo (kg)" type="number" inputMode="decimal" step="0.1" {...bind("target_kg")} />
            </div>
            {bErr && <p className="err" role="alert">{bErr}</p>}
          </>
        )}
        {step === "goal" && (
          <>
            <Select label="Objetivo" options={GOALS} {...bind("goal")} />
            <Select label="Nivel" options={LEVELS} {...bind("level")} />
            <div className="row">
              <Select label="Días por semana" options={DAYS} {...bind("days_per_week")} />
              <Select label="Tiempo por sesión" options={MINUTES} {...bind("minutes")} />
            </div>
          </>
        )}
        {step === "equip" && (
          <div role="group" aria-label="Equipo disponible">
            {EQUIP_KEYS.map((k) => (
              <button key={k} type="button" className="opt" aria-pressed={f.equip === k} onClick={() => set("equip", k)}>{k}</button>
            ))}
          </div>
        )}
        {step === "glute" && <GlutePrompt value={f.glute_focus} onChange={(v) => set("glute_focus", v)} />}

        {err && <p className="err" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 20 }}>
          <button type="button" className="btn o" onClick={() => (s === 0 ? onBack?.() : setS(s - 1))}>{s === 0 && complete ? "Salir" : "Atrás"}</button>
          <button type="button" className="btn" disabled={invalid || busy} onClick={() => (last ? finish() : setS(s + 1))}>
            {last ? (busy ? "Creando…" : complete ? "Guardar perfil" : "Crear cuenta") : "Continuar"}
          </button>
        </div>
        {s === 0 && !complete && (
          <p className="s" style={{ marginTop: 18 }}>
            ¿Ya tienes cuenta? <button type="button" className="lnk" onClick={onLogin}>Inicia sesión</button>
          </p>
        )}
      </div>
    </div>
  );
}
