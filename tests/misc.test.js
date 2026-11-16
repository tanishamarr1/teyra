import test from "node:test";
import assert from "node:assert/strict";
import { bodyError, isEmail } from "../src/lib/validate.js";
import { toYMD, isSameDay, labelDay, addDays, dayRange } from "../src/lib/dates.js";

test("validación de correo y medidas", () => {
  assert.ok(isEmail("a@b.co"));
  assert.ok(!isEmail("a@b"));
  assert.ok(!isEmail("sin arroba"));
  assert.equal(bodyError({ age: "28", height_cm: "170", weight_kg: "70", target_kg: "65" }), "");
  assert.match(bodyError({ age: "5" }), /edad/);
  assert.match(bodyError({ age: "28", height_cm: "" }), /altura/);
  assert.match(bodyError({ weight_kg: "abc" }), /peso actual/);
  assert.equal(bodyError({ target_kg: "65" }), ""); // solo valida lo presente
});

test("fechas", () => {
  const d = new Date(2026, 10, 16, 8);
  assert.equal(toYMD(d), "2026-11-16");
  assert.ok(isSameDay(d, new Date(2026, 10, 16, 23)));
  assert.equal(labelDay(d, d), "Hoy");
  assert.equal(labelDay(addDays(d, -1), d), "Ayer");
  const [a, b] = dayRange(d);
  assert.ok(Date.parse(b) > Date.parse(a));
});
