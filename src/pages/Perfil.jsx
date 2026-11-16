import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { joinGym, loadGym, regenerateRoutine, updateProfile } from "../lib/api";
import { EQUIP, EQUIP_KEYS, equipKey } from "../lib/routine";
import { DAYS, GOALS, LEVELS, MINUTES, SEXES } from "../lib/options";
import { bodyError } from "../lib/validate";
import { Input, Select } from "../components/Fields";

const fromProfile = (p) => ({
  full_name: p.full_name || "", sex: p.sex || "M", age: String(p.age ?? ""), height_cm: String(p.height_cm ?? ""), target_kg: String(p.target_kg ?? ""),
  goal: p.goal || GOALS[0], level: String(p.level ?? 1), days_per_week: String(p.days_per_week ?? 4), minutes: String(p.minutes ?? 60),
  equip: equipKey(p.equipment), glute: Boolean(p.glute_focus),
});

export default function Perfil({ uid, profile, plan, reload }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(() => fromProfile(profile));
  const [regen, setRegen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [gym, setGym] = useState(null);
  const [code, setCode] = useState("");
  const bind = (k) => ({ value: f[k], onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })) });

  useEffect(() => {
    if (!profile.gym_id) return setGym(null);
    loadGym(profile.gym_id).then((g) => setGym(g?.name ?? null)).catch(() => {});
  }, [profile.gym_id]);

  const patch = () => ({
    full_name: f.full_name.trim(), sex: f.sex, age: +f.age, height_cm: +f.height_cm, target_kg: +f.target_kg, goal: f.goal, level: +f.level,
    days_per_week: +f.days_per_week, minutes: +f.minutes, equipment: EQUIP[f.equip], glute_focus: f.sex === "F" && f.glute === true,
  });
  const planChanged = () => {
    const p = patch();
    return ["level", "days_per_week", "minutes", "goal", "glute_focus"].some((k) => p[k] !== profile[k]) || p.equipment.join() !== (profile.equipment || []).join();
  };

  async function save() {
    const bErr = bodyError({ age: f.age, height_cm: f.height_cm, target_kg: f.target_kg });
    if (f.full_name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (bErr) return setErr(bErr);
    setBusy(true); setErr(""); setInfo("");
    try {
      const p = patch();
      await updateProfile(uid, p);
      if (regen && planChanged()) await regenerateRoutine({ ...profile, ...p });
      await reload();
      setEditing(false);
      setInfo("Perfil actualizado.");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function newRoutine() {
    if (!window.confirm("Se creará una rutina nueva con tus datos actuales. Tu historial de entrenamientos se conserva. ¿Continuar?")) return;
    setBusy(true); setErr(""); setInfo("");
    try { await regenerateRoutine(profile); await reload(); setInfo("Rutina nueva creada."); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function join(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setErr(""); setInfo("");
    try { const name = await joinGym(code); setCode(""); await reload(); setInfo(`Te uniste a ${name}.`); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="hd">
        <h1>Perfil</h1>
        <p>{profile.full_name}</p>
      </div>
      {info && <p className="ok" role="status" style={{ marginBottom: 12 }}>{info}</p>}
      {err && <p className="err" role="alert" style={{ marginBottom: 12 }}>{err}</p>}
      <div className="grid">
        <section className="card c8" aria-label="Datos personales">
          <div className="row sp" style={{ marginBottom: 12 }}>
            <h2>Tus datos</h2>
            {!editing && <button className="btn o sm" onClick={() => { setF(fromProfile(profile)); setEditing(true); setInfo(""); }}>Editar</button>}
          </div>
          {!editing ? (
            <>
              <div className="row wr" style={{ marginBottom: 10 }}>
                {[profile.goal, `${profile.days_per_week} días/semana`, `${profile.minutes} min`, equipKey(profile.equipment), LEVELS.find(([v]) => +v === profile.level)?.[1]].filter(Boolean).map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
              {[["Edad", profile.age && `${profile.age} años`], ["Altura", profile.height_cm && `${profile.height_cm} cm`], ["Peso actual", profile.weight_kg && `${profile.weight_kg} kg`], ["Peso objetivo", profile.target_kg && `${profile.target_kg} kg`]].map(([l, v]) => (
                <div key={l} className="li"><span className="mu">{l}</span><span>{v || "—"}</span></div>
              ))}
            </>
          ) : (
            <>
              <Input label="Nombre" {...bind("full_name")} />
              <Select label="Sexo" options={SEXES} {...bind("sex")} />
              <div className="row">
                <Input label="Edad" type="number" inputMode="numeric" {...bind("age")} />
                <Input label="Altura (cm)" type="number" inputMode="numeric" {...bind("height_cm")} />
                <Input label="Peso objetivo (kg)" type="number" inputMode="decimal" step="0.1" {...bind("target_kg")} />
              </div>
              <Select label="Objetivo" options={GOALS} {...bind("goal")} />
              <div className="row wr">
                <div style={{ flex: "1 1 120px" }}><Select label="Nivel" options={LEVELS} {...bind("level")} /></div>
                <div style={{ flex: "1 1 120px" }}><Select label="Días por semana" options={DAYS} {...bind("days_per_week")} /></div>
                <div style={{ flex: "1 1 120px" }}><Select label="Tiempo por sesión" options={MINUTES} {...bind("minutes")} /></div>
              </div>
              <Select label="Equipo" options={EQUIP_KEYS} {...bind("equip")} />
              {f.sex === "F" && (
                <Select label="Enfoque" options={[["true", "Rutina enfocada en glúteos"], ["false", "Rutina equilibrada"]]} value={String(f.glute)} onChange={(e) => setF((p) => ({ ...p, glute: e.target.value === "true" }))} />
              )}
              <label className="row s" style={{ margin: "6px 0 16px", gap: 8 }}>
                <input type="checkbox" style={{ width: 18, height: 18 }} checked={regen} onChange={(e) => setRegen(e.target.checked)} />
                <span>Crear una rutina nueva si cambié nivel, días, tiempo, equipo, objetivo o enfoque</span>
              </label>
              <div className="row">
                <button className="btn o" onClick={() => { setEditing(false); setErr(""); }}>Cancelar</button>
                <button className="btn" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </>
          )}
        </section>

        <section className="card c4" aria-label="Rutina">
          <h2 style={{ marginBottom: 6 }}>Rutina</h2>
          <p className="mu s" style={{ marginBottom: 14 }}>{plan?.name ?? "Sin rutina"}</p>
          <button className="btn o" disabled={busy} onClick={newRoutine}>Generar rutina nueva</button>
        </section>

        <section className="card c6" aria-label="Gimnasio">
          <h2 style={{ marginBottom: 6 }}>Gimnasio</h2>
          {profile.gym_id ? (
            <p>Perteneces a <b>{gym ?? "tu gimnasio"}</b>.</p>
          ) : (
            <form onSubmit={join} noValidate>
              <p className="mu s" style={{ marginBottom: 10 }}>Si tu gimnasio usa TEYRA, escribe su código de invitación.</p>
              <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" />
              <button className="btn" disabled={busy || !code.trim()}>Unirme</button>
            </form>
          )}
        </section>

        <section className="card c6" aria-label="Cuenta">
          <h2 style={{ marginBottom: 12 }}>Cuenta</h2>
          <button className="btn o" onClick={() => sb.auth.signOut()}>Cerrar sesión</button>
        </section>
      </div>
    </>
  );
}
