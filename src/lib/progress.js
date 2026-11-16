const num = (v) => Number(v) || 0;

export const repsMin = (r) => { const m = String(r ?? "").match(/\d+/); return m ? Number(m[0]) : 0; };
export const repsMax = (r) => { const m = String(r ?? "").match(/\d+/g); return m ? Number(m[m.length - 1]) : 0; };
export const isTimeReps = (r) => /\d\s*s$/.test(String(r ?? "").trim());
export const epley = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30)); // 1RM estimado

/** Lunes 00:00 (hora local) de la semana de `d`. */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export const sessionsThisWeek = (workouts = [], now = new Date()) => {
  const t0 = weekStart(now).getTime();
  return workouts.filter((w) => Date.parse(w.done_at) >= t0).length;
};

/** Volumen (kg × reps) por semana, de la más antigua a la actual. */
export function weeklyVolume(workouts = [], weeks = 8, now = new Date()) {
  const start = weekStart(now);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - 7 * i);
    buckets.push({ t: d.getTime(), label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 });
  }
  for (const w of workouts) {
    const t = Date.parse(w.done_at);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].t) { buckets[i].value += num(w.volume_kg); break; }
    }
  }
  return buckets.map(({ label, value }) => ({ label, value: Math.round(value) }));
}

/** Series de la última sesión de cada ejercicio. rows = [{exercise_id, workout_id, set_no, kg, reps, done_at}] */
export function lastSessionByExercise(rows = []) {
  const latest = {};
  for (const r of rows) {
    const t = Date.parse(r.done_at) || 0;
    if (!latest[r.exercise_id] || t > latest[r.exercise_id].t) latest[r.exercise_id] = { t, w: r.workout_id };
  }
  const out = {};
  for (const r of rows) if (latest[r.exercise_id].w === r.workout_id) (out[r.exercise_id] ??= []).push(r);
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.set_no - b.set_no);
  return out;
}

/** Progresión: si completó todas las series en el tope del rango de repeticiones, sugiere subir. */
export function suggest(prevSets, { sets, reps } = {}) {
  if (!prevSets?.length) return null;
  const top = Math.max(...prevSets.map((s) => num(s.kg)));
  const max = repsMax(reps);
  const hit = prevSets.length >= sets && max > 0 && prevSets.every((s) => num(s.reps) >= max);
  if (!hit) return { kg: top, up: false, text: top > 0 ? `Última vez: ${top} kg` : "Última vez: peso corporal" };
  if (top > 0) {
    const next = Math.round((top + (top >= 20 ? 2.5 : 1)) * 2) / 2;
    return { kg: next, up: true, text: `Completaste todas las series: sube a ${next} kg` };
  }
  return { kg: 0, up: true, text: "Completaste todas las series: prueba con más repeticiones o una variante más difícil" };
}

/** Mejores marcas por ejercicio (1RM estimado). rows = [{kg, reps, exercises:{name}}] */
export function personalRecords(rows = [], limit = 5) {
  const best = new Map();
  for (const r of rows) {
    const kg = num(r.kg), reps = num(r.reps), name = r.exercises?.name;
    if (kg <= 0 || reps <= 0 || !name) continue;
    const e1rm = Math.round(epley(kg, reps) * 10) / 10;
    if (!best.has(name) || e1rm > best.get(name).e1rm) best.set(name, { name, kg, reps, e1rm });
  }
  return [...best.values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}

/** Índice del próximo día de la rutina según el último entrenamiento registrado. */
export function nextDayIndex(days, lastWorkout) {
  const i = days.findIndex((d) => d.id === lastWorkout?.day_id);
  return i < 0 ? 0 : (i + 1) % days.length;
}
