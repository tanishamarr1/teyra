import { useCallback, useEffect, useMemo, useState } from "react";
import { addWeight, allSets, weightLogs } from "../lib/api";
import { personalRecords, sessionsThisWeek, weeklyVolume } from "../lib/progress";
import { shortDate } from "../lib/dates";
import { Input } from "../components/Fields";
import { BarChart, LineChart } from "../components/Charts";

export default function Progreso({ uid, profile, workouts, reload }) {
  const [weights, setWeights] = useState(null);
  const [sets, setSets] = useState([]);
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    try { setWeights(await weightLogs()); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { allSets().then(setSets).catch(() => {}); }, []);

  async function save(e) {
    e.preventDefault();
    const n = Number(kg);
    if (!(n >= 30 && n <= 300)) return setErr("Escribe un peso entre 30 y 300 kg.");
    setBusy(true); setErr("");
    try {
      await addWeight(uid, Math.round(n * 10) / 10);
      setKg("");
      await Promise.all([refresh(), reload()]);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  const points = useMemo(() => (weights || []).map((w) => ({ x: shortDate(w.logged_at), y: Number(w.kg) })), [weights]);
  const chartPoints = points.length ? points : profile.weight_kg ? [{ x: "Hoy", y: Number(profile.weight_kg) }] : [];
  const current = chartPoints.length ? chartPoints[chartPoints.length - 1].y : null;
  const target = profile.target_kg ? Number(profile.target_kg) : null;
  const left = current != null && target != null ? Math.abs(current - target) : null;
  const change = points.length > 1 ? points[points.length - 1].y - points[0].y : null;
  const volume = useMemo(() => weeklyVolume(workouts), [workouts]);
  const records = useMemo(() => personalRecords(sets), [sets]);

  return (
    <>
      <div className="hd">
        <h1>Progreso</h1>
        <p>Tu constancia, tu peso y tus mejores marcas.</p>
      </div>
      <div className="grid">
        <section className="card c4"><p className="mu s">Esta semana</p><p className="big" style={{ marginTop: 8 }}>{sessionsThisWeek(workouts)}</p><p className="mu s">entrenamientos</p></section>
        <section className="card c4"><p className="mu s">Registrados</p><p className="big" style={{ marginTop: 8 }}>{workouts.length}</p><p className="mu s">entrenamientos recientes</p></section>
        <section className="card c4">
          <p className="mu s">Objetivo de peso</p>
          <p className="big" style={{ marginTop: 8 }}>{left == null ? "—" : left < 0.1 ? "¡Listo!" : `${left.toFixed(1)}`}{left != null && left >= 0.1 && <span className="mu" style={{ fontSize: 20 }}> kg</span>}</p>
          <p className="mu s">{left != null && left >= 0.1 ? "por recorrer" : change != null ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg desde que empezaste` : "Registra tu peso para ver el cambio"}</p>
        </section>

        <section className="card c8" aria-label="Evolución del peso">
          <h2 style={{ marginBottom: 10 }}>Peso</h2>
          {chartPoints.length > 0 && <LineChart points={chartPoints} target={target} label="Gráfica de tu peso en el tiempo" />}
          {points.length < 2 && <p className="mu s">Registra tu peso cada semana para ver la gráfica de tu evolución.</p>}
        </section>
        <section className="card c4">
          <h2 style={{ marginBottom: 10 }}>Registrar peso de hoy</h2>
          <form onSubmit={save} noValidate>
            <Input label="Peso (kg)" type="number" inputMode="decimal" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} />
            <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          </form>
          {err && <p className="err" role="alert">{err}</p>}
        </section>

        <section className="card c8" aria-label="Volumen semanal">
          <h2 style={{ marginBottom: 4 }}>Volumen por semana</h2>
          <p className="mu s" style={{ marginBottom: 8 }}>Kilos × repeticiones, últimas 8 semanas.</p>
          {workouts.length ? <BarChart data={volume} label="Volumen de entrenamiento por semana" /> : <p className="emp">Termina tu primer entrenamiento para ver tu volumen.</p>}
        </section>
        <section className="card c4" aria-label="Mejores marcas">
          <h2 style={{ marginBottom: 6 }}>Mejores marcas</h2>
          {records.length === 0 && <p className="emp">Aún no hay series con peso registradas.</p>}
          {records.map((r) => (
            <div key={r.name} className="li">
              <div><div>{r.name}</div><div className="mu s">{r.kg} kg × {r.reps}</div></div>
              <span className="chip" title="1RM estimado">{r.e1rm} kg</span>
            </div>
          ))}
          {records.length > 0 && <p className="mu s" style={{ marginTop: 8 }}>El número es el 1RM estimado.</p>}
        </section>
      </div>
    </>
  );
}
