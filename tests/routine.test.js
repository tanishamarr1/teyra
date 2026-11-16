import test from "node:test";
import assert from "node:assert/strict";
import { buildRoutine, EQUIP, EQUIP_KEYS, equipKey, alternatives, toEntry, planWarnings, MIN_EX, MAX_EX } from "../src/lib/routine.js";
import { loadExercises } from "./seed.js";

const all = loadExercises();

test("el catálogo se leyó completo y los slugs son únicos", () => {
  assert.ok(all.length >= 55, `solo ${all.length} ejercicios`);
  assert.equal(new Set(all.map((e) => e.slug)).size, all.length);
});

test("todas las combinaciones dan días completos, sin repetir ejercicio dentro del día", () => {
  for (const eq of EQUIP_KEYS) for (const level of [1, 2, 3]) for (const days of [3, 4, 5]) for (const gluteFocus of [true, false]) {
    const plan = buildRoutine(all, { gluteFocus, level, days, equipment: EQUIP[eq], goal: "Mantener peso" });
    const ctx = `${eq} / nivel ${level} / ${days} días / glúteos=${gluteFocus}`;
    assert.equal(plan.length, days, ctx);
    assert.deepEqual(planWarnings(plan), [], ctx);
    for (const d of plan) {
      assert.ok(d.exercises.length >= MIN_EX && d.exercises.length <= MAX_EX, `${ctx} / ${d.title}: ${d.exercises.length} ejercicios`);
      assert.equal(new Set(d.exercises.map((e) => e.exercise_id)).size, d.exercises.length, `${ctx} / ${d.title}: repetidos`);
      d.exercises.forEach((e, i) => assert.equal(e.position, i));
    }
  }
});

test("solo usa ejercicios compatibles con el equipo y el nivel", () => {
  for (const eq of EQUIP_KEYS) {
    const have = new Set(EQUIP[eq]);
    const plan = buildRoutine(all, { level: 1, days: 5, equipment: EQUIP[eq] });
    for (const d of plan) for (const e of d.exercises) {
      const ex = all.find((x) => x.id === e.exercise_id);
      assert.ok(ex.level <= 1 && ex.equipment.every((x) => have.has(x)), `${eq}: ${ex.name}`);
    }
  }
});

test("el número de días se limita a 3-5", () => {
  assert.equal(buildRoutine(all, { days: 2, equipment: EQUIP["Gimnasio completo"] }).length, 3);
  assert.equal(buildRoutine(all, { days: 9, equipment: EQUIP["Gimnasio completo"] }).length, 5);
});

test("toEntry: nivel, tiempo disponible y objetivo", () => {
  const c = { id: "x", name: "X", sets: 4, reps: "6-10", rest_s: 90 };
  assert.equal(toEntry(c, { level: 1 }).sets, 3);
  assert.equal(toEntry(c, { level: 3 }).sets, 4);
  assert.equal(toEntry(c, { level: 3, minutes: 30 }).sets, 3);
  assert.equal(toEntry(c, { level: 3, minutes: 90 }).sets, 5);
  assert.equal(toEntry(c, { level: 3, goal: "Perder grasa" }).reps, "12-15");
  assert.equal(toEntry({ ...c, reps: "30-45 s" }, { goal: "Perder grasa" }).reps, "30-45 s"); // no pisa los ejercicios por tiempo
});

test("alternatives: mismo patrón, sin repetir los del día", () => {
  const cur = all.find((e) => e.slug === "flexiones" || e.pattern === "horizontal_push");
  const alts = alternatives(all, cur, { level: 3, equipment: EQUIP["Gimnasio completo"], exclude: new Set() });
  assert.ok(alts.length > 0);
  assert.ok(alts.every((a) => a.pattern === cur.pattern && a.id !== cur.id));
  assert.equal(alternatives(all, cur, { level: 3, equipment: EQUIP["Gimnasio completo"], exclude: new Set(alts.map((a) => a.id)) }).length, 0);
});

test("equipKey recupera la opción desde el perfil", () => {
  for (const k of EQUIP_KEYS) assert.equal(equipKey(EQUIP[k]), k);
  assert.equal(equipKey(["peso_corporal"]), "Solo peso corporal");
  assert.equal(equipKey(undefined), "Solo peso corporal");
});
