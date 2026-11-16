import test from "node:test";
import assert from "node:assert/strict";
import { repsMin, repsMax, isTimeReps, suggest, weekStart, weeklyVolume, sessionsThisWeek, lastSessionByExercise, personalRecords, nextDayIndex, epley } from "../src/lib/progress.js";

test("lectura de rangos de repeticiones", () => {
  assert.equal(repsMin("8-12"), 8);
  assert.equal(repsMax("8-12"), 12);
  assert.equal(repsMax("15"), 15);
  assert.equal(repsMax(""), 0);
  assert.ok(isTimeReps("30-45 s"));
  assert.ok(!isTimeReps("8-12"));
});

test("suggest: sube de peso solo si completó todas las series en el tope", () => {
  const t = { sets: 3, reps: "8-10" };
  const full = [1, 2, 3].map((n) => ({ set_no: n, kg: 40, reps: 10 }));
  assert.deepEqual(suggest(full, t), { kg: 42.5, up: true, text: "Completaste todas las series: sube a 42.5 kg" });
  assert.equal(suggest([{ set_no: 1, kg: 40, reps: 10 }], t).up, false); // faltan series
  assert.equal(suggest([...full.slice(0, 2), { set_no: 3, kg: 40, reps: 8 }], t).up, false);
  assert.equal(suggest(full.map((s) => ({ ...s, kg: 10 })), t).kg, 11);
  assert.equal(suggest(full.map((s) => ({ ...s, kg: 0 })), t).up, true);
  assert.equal(suggest([], t), null);
});

test("semana empieza el lunes", () => {
  const w = weekStart(new Date(2026, 10, 18, 15)); // miércoles
  assert.equal(w.getDate(), 16);
  assert.equal(w.getHours(), 0);
  assert.equal(weekStart(new Date(2026, 10, 22)).getDate(), 16); // domingo
});

test("volumen semanal y sesiones de la semana", () => {
  const now = new Date(2026, 10, 18, 12);
  const ws = [
    { done_at: new Date(2026, 10, 17, 9).toISOString(), volume_kg: 1000 },
    { done_at: new Date(2026, 10, 10, 9).toISOString(), volume_kg: 500 },
  ];
  assert.deepEqual(weeklyVolume(ws, 2, now), [{ label: "9/11", value: 500 }, { label: "16/11", value: 1000 }]);
  assert.equal(sessionsThisWeek(ws, now), 1);
});

test("última sesión por ejercicio", () => {
  const rows = [
    { exercise_id: "a", workout_id: "w1", set_no: 1, kg: 10, reps: 10, done_at: "2026-11-01T10:00:00Z" },
    { exercise_id: "a", workout_id: "w2", set_no: 2, kg: 12, reps: 8, done_at: "2026-11-08T10:00:00Z" },
    { exercise_id: "a", workout_id: "w2", set_no: 1, kg: 12, reps: 10, done_at: "2026-11-08T10:00:00Z" },
  ];
  const r = lastSessionByExercise(rows);
  assert.deepEqual(r.a.map((s) => s.set_no), [1, 2]);
  assert.ok(r.a.every((s) => s.workout_id === "w2"));
});

test("récords personales por 1RM estimado", () => {
  const rows = [
    { kg: 100, reps: 1, exercises: { name: "Sentadilla" } },
    { kg: 80, reps: 10, exercises: { name: "Sentadilla" } },
    { kg: 0, reps: 20, exercises: { name: "Flexiones" } },
    { kg: 20, reps: 10, exercises: { name: "Remo" } },
  ];
  const p = personalRecords(rows);
  assert.deepEqual(p.map((x) => x.name), ["Sentadilla", "Remo"]);
  assert.equal(p[0].e1rm, Math.round(epley(80, 10) * 10) / 10);
});

test("próximo día de la rutina", () => {
  const days = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(nextDayIndex(days, undefined), 0);
  assert.equal(nextDayIndex(days, { day_id: "a" }), 1);
  assert.equal(nextDayIndex(days, { day_id: "c" }), 0);
  assert.equal(nextDayIndex(days, { day_id: "zzz" }), 0);
});
