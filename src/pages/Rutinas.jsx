import { useState } from "react";
import { Link } from "react-router-dom";
import { alternatives, MIN_EX, sortDays, sortExercises, toEntry } from "../lib/routine";
import { loadExercises, swapExercise } from "../lib/api";

export default function Rutinas({ profile, plan, reload }) {
  const days = sortDays(plan);
  const [all, setAll] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const short = days.filter((d) => sortExercises(d).length < MIN_EX).map((d) => d.title);

  async function toggleSwap(rowId) {
    setErr("");
    if (open === rowId) return setOpen(null);
    try {
      if (!all) setAll(await loadExercises());
      setOpen(rowId);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function swap(row, alt) {
    setBusy(true); setErr("");
    try {
      await swapExercise(row.id, toEntry(alt, { level: profile.level, goal: profile.goal, minutes: profile.minutes }));
      setOpen(null);
      await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="hd">
        <h1>Rutinas</h1>
        <p>{plan?.name ?? "Aún no tienes una rutina."}</p>
      </div>
      {short.length > 0 && (
        <p className="card s" role="note" style={{ marginBottom: 14 }}>
          Faltan ejercicios para tu equipo en: {short.join(", ")}. Puedes cambiar tu equipo en el perfil.
        </p>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="grid">
        {days.map((d) => {
          const rows = sortExercises(d);
          const inDay = new Set(rows.map((r) => r.exercise_id));
          return (
            <section key={d.id} className="card c6" aria-label={d.title}>
              <div className="row sp">
                <h2>{d.title}</h2>
                <Link className="btn sm" to={`/entreno/${d.id}`}>Empezar</Link>
              </div>
              {rows.map((r) => (
                <div key={r.id} className="li" style={{ flexDirection: "column", gap: 6 }}>
                  <div className="row sp" style={{ alignItems: "flex-start" }}>
                    <div>
                      <b>{r.exercises.name}</b>
                      <div className="mu s">{r.exercises.muscle} · descanso {r.rest_s} s</div>
                    </div>
                    <span className="chip">{r.sets} × {r.reps}</span>
                  </div>
                  <div className="row wr">
                    <details className="s" style={{ flex: 1 }}>
                      <summary>Cómo se hace</summary>
                      <p className="mu" style={{ marginTop: 6 }}>{r.exercises.instructions}</p>
                    </details>
                    <button className="btn o sm" aria-expanded={open === r.id} onClick={() => toggleSwap(r.id)}>Cambiar</button>
                  </div>
                  {open === r.id && all && (
                    <div className="alts" role="group" aria-label={`Alternativas a ${r.exercises.name}`}>
                      {(() => {
                        const alts = alternatives(all, r.exercises, { level: profile.level, equipment: profile.equipment, exclude: inDay }).slice(0, 6);
                        if (!alts.length) return <p className="mu s">No hay alternativas para tu equipo y nivel.</p>;
                        return alts.map((a) => (
                          <button key={a.id} className="opt" disabled={busy} onClick={() => swap(r, a)} style={{ margin: "6px 0", padding: 12 }}>
                            <b>{a.name}</b> <span className="mu s">· {a.muscle}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
