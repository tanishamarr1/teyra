import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { lastSets, logWorkout } from "../lib/api";
import { sortExercises } from "../lib/routine";
import { isTimeReps, lastSessionByExercise, repsMin, suggest } from "../lib/progress";
import RestTimer from "../components/RestTimer";

const key = (rowId, i) => `${rowId}:${i}`;
const draftKey = (dayId) => `teyra-draft-${dayId}`;
const readDraft = (dayId) => {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(dayId)));
    if (d && Date.now() - d.t0 < 12 * 3600e3) return d; // borradores de más de 12 h se descartan
  } catch { /* sin almacenamiento */ }
  return null;
};
const writeDraft = (dayId, d) => { try { localStorage.setItem(draftKey(dayId), JSON.stringify(d)); } catch { /* ignorar */ } };
const clearDraft = (dayId) => { try { localStorage.removeItem(draftKey(dayId)); } catch { /* ignorar */ } };

// key={dayId} reinicia el estado al pasar de un día a otro.
export default function EntrenoPage(props) {
  const { dayId } = useParams();
  return <Entreno key={dayId} dayId={dayId} {...props} />;
}

function Entreno({ dayId, plan, reload }) {
  const day = plan?.routine_days?.find((d) => d.id === dayId);
  const rows = useMemo(() => sortExercises(day), [day]);
  const [prev, setPrev] = useState({});
  const [draft, setDraft] = useState(() => readDraft(dayId) || { t0: Date.now(), sets: {} });
  const [rest, setRest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    let live = true;
    if (rows.length)
      lastSets(rows.map((r) => r.exercise_id)).then((rs) => live && setPrev(lastSessionByExercise(rs))).catch(() => {});
    return () => { live = false; };
  }, [rows]);

  useEffect(() => { if (!saved) writeDraft(dayId, draft); }, [dayId, draft, saved]);

  // Valores por defecto: lo de la última sesión, o el peso sugerido si ya superó el rango de repeticiones.
  const hint = (r) => suggest(prev[r.exercise_id], r);
  const defaults = (r, i) => {
    const ps = prev[r.exercise_id] || [];
    const p = ps[i] ?? ps[ps.length - 1];
    const s = hint(r);
    return { kg: s && s.kg > 0 ? s.kg : p?.kg ?? "", reps: s?.up ? repsMin(r.reps) : p?.reps ?? repsMin(r.reps) };
  };
  const val = (r, i, f) => draft.sets[key(r.id, i)]?.[f] ?? defaults(r, i)[f];
  const patch = (r, i, p) =>
    setDraft((d) => ({ ...d, sets: { ...d.sets, [key(r.id, i)]: { ...d.sets[key(r.id, i)], ...p } } }));

  const toggle = (r, i) => {
    const done = !draft.sets[key(r.id, i)]?.done;
    patch(r, i, { done, kg: val(r, i, "kg"), reps: val(r, i, "reps") });
    setRest(done ? { id: Date.now(), seconds: r.rest_s || 60 } : null);
  };

  const totalSets = rows.reduce((a, r) => a + r.sets, 0);
  const doneSets = rows.reduce((a, r) => a + Array.from({ length: r.sets }).filter((_, i) => draft.sets[key(r.id, i)]?.done).length, 0);

  async function finish() {
    const payload = [];
    rows.forEach((r) => {
      for (let i = 0; i < r.sets; i++) {
        const s = draft.sets[key(r.id, i)];
        if (s?.done) payload.push({ exercise_id: r.exercise_id, set_no: i + 1, kg: Math.min(1000, Math.max(0, Number(s.kg) || 0)), reps: Math.max(0, Math.round(Number(s.reps)) || 0) });
      }
    });
    if (!payload.length) return setErr("Marca al menos una serie como hecha.");
    setBusy(true); setErr("");
    try {
      await logWorkout(dayId, payload);
      clearDraft(dayId);
      setRest(null);
      setSaved({
        sets: payload.length,
        volume: Math.round(payload.reduce((a, s) => a + s.kg * s.reps, 0)),
        minutes: Math.max(1, Math.round((Date.now() - draft.t0) / 60000)),
      });
      reload();
    } catch (e) {
      setErr(e.message || "No se pudo guardar el entrenamiento. Inténtalo de nuevo; tus series siguen aquí.");
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (!window.confirm("¿Descartar este entrenamiento? Se borrarán las series marcadas.")) return;
    clearDraft(dayId);
    setRest(null);
    setDraft({ t0: Date.now(), sets: {} });
  }

  if (!day)
    return (
      <div className="emp">
        <p>No encontramos este día de entrenamiento.</p>
        <Link className="btn" style={{ marginTop: 14 }} to="/rutinas">Volver a rutinas</Link>
      </div>
    );

  if (saved)
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h1>¡Entrenamiento guardado!</h1>
        <p className="mu" style={{ margin: "8px 0 18px" }}>{day.title}</p>
        <div className="row wr" style={{ gap: 24, marginBottom: 20 }}>
          <div><p className="big">{saved.sets}</p><p className="mu s">series</p></div>
          <div><p className="big">{saved.volume.toLocaleString("es")}</p><p className="mu s">kg de volumen</p></div>
          <div><p className="big">{saved.minutes}</p><p className="mu s">min</p></div>
        </div>
        <div className="row wr">
          <Link className="btn" to="/">Ir al inicio</Link>
          <Link className="btn o" to="/progreso">Ver mi progreso</Link>
        </div>
      </div>
    );

  return (
    <>
      <div className="hd">
        <Link to="/rutinas" className="mu s">← Rutinas</Link>
        <h1 style={{ marginTop: 6 }}>{day.title}</h1>
        <p>{doneSets} de {totalSets} series hechas</p>
      </div>

      {rows.map((r) => {
        const time = isTimeReps(r.reps);
        const h = hint(r);
        return (
          <section key={r.id} className="card" style={{ marginBottom: 14 }} aria-label={r.exercises.name}>
            <div className="row sp" style={{ alignItems: "flex-start" }}>
              <div>
                <h2>{r.exercises.name}</h2>
                <p className="mu s">Objetivo: {r.sets} × {r.reps} · descanso {r.rest_s} s</p>
              </div>
            </div>
            {h && <p className={"s " + (h.up ? "ok" : "mu")} style={{ marginTop: 6 }}>{h.text}</p>}
            <details className="s" style={{ margin: "8px 0" }}>
              <summary>Cómo se hace</summary>
              <p className="mu" style={{ marginTop: 6 }}>{r.exercises.instructions}</p>
            </details>
            <div className="setrow mu s" aria-hidden="true">
              <span>Serie</span><span>kg</span><span>{time ? "seg" : "reps"}</span><span />
            </div>
            {Array.from({ length: r.sets }).map((_, i) => {
              const done = Boolean(draft.sets[key(r.id, i)]?.done);
              return (
                <div key={i} className="setrow">
                  <span className="mu">{i + 1}</span>
                  <input type="number" inputMode="decimal" min="0" step="0.5" aria-label={`Serie ${i + 1}, kilos`} value={val(r, i, "kg")} onChange={(e) => patch(r, i, { kg: e.target.value })} />
                  <input type="number" inputMode="numeric" min="0" aria-label={`Serie ${i + 1}, ${time ? "segundos" : "repeticiones"}`} value={val(r, i, "reps")} onChange={(e) => patch(r, i, { reps: e.target.value })} />
                  <button className={"chk" + (done ? " on" : "")} aria-pressed={done} aria-label={`Serie ${i + 1} ${done ? "hecha" : "pendiente"}`} onClick={() => toggle(r, i)}>✓</button>
                </div>
              );
            })}
          </section>
        );
      })}

      {err && <p className="err" role="alert">{err}</p>}
      <div className="row wr" style={{ marginTop: 18 }}>
        <button className="btn" disabled={busy} onClick={finish}>{busy ? "Guardando…" : "Terminar entrenamiento"}</button>
        <Link className="btn o" to="/rutinas">Salir (se guarda el borrador)</Link>
        <button className="lnk" onClick={discard}>Descartar</button>
      </div>
      {rest && <RestTimer key={rest.id} seconds={rest.seconds} onClose={() => setRest(null)} />}
    </>
  );
}
