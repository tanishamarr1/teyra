import test from "node:test";
import assert from "node:assert/strict";
import { bmr, targets, sumFoods, normalize } from "../src/lib/nutrition.js";

test("bmr Mifflin-St Jeor", () => {
  assert.equal(bmr({ sex: "M", weight_kg: 80, height_cm: 180, age: 30 }), 1780);
  assert.equal(bmr({ sex: "F", weight_kg: 60, height_cm: 165, age: 25 }), 1345.25);
});

test("metas para mantener peso", () => {
  const t = targets({ sex: "M", weight_kg: 80, height_cm: 180, age: 30, days_per_week: 4, goal: "Mantener peso" });
  assert.equal(t.kcal, 2760);
  assert.equal(t.protein, 128);
  assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) < 20);
});

test("déficit al perder grasa y suelo calórico", () => {
  const t = targets({ sex: "F", weight_kg: 60, height_cm: 165, age: 25, days_per_week: 3, goal: "Perder grasa" });
  assert.equal(t.kcal, 1480);
  const low = targets({ sex: "F", weight_kg: 40, height_cm: 150, age: 60, days_per_week: 3, goal: "Perder grasa" });
  assert.equal(low.kcal, 1200);
});

test("menores de edad no reciben déficit", () => {
  const base = { sex: "M", weight_kg: 70, height_cm: 175, age: 16, days_per_week: 4 };
  assert.equal(targets({ ...base, goal: "Perder grasa" }).kcal, targets({ ...base, goal: "Mantener peso" }).kcal);
});

test("la proteína no pasa del 35 % de las calorías", () => {
  const t = targets({ sex: "M", weight_kg: 200, height_cm: 180, age: 30, days_per_week: 4, goal: "Perder grasa" });
  assert.ok(t.protein * 4 <= t.kcal * 0.35 + 4);
});

test("sin datos devuelve null", () => {
  assert.equal(targets({ sex: "M", weight_kg: null, height_cm: 170, age: 20 }), null);
  assert.equal(targets(null), null);
});

test("sumFoods y normalize", () => {
  const s = sumFoods([{ qty: 2, foods: { kcal: 100, protein: 10, carbs: 5, fat: 1 } }, { qty: 0.5, foods: { kcal: 200, protein: 0, carbs: 40, fat: 0 } }]);
  assert.deepEqual(s, { kcal: 300, protein: 20, carbs: 30, fat: 2 });
  assert.equal(normalize("Plátano MADURO"), "platano maduro");
});
