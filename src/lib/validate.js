export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s ?? "").trim());

const RANGES = {
  age: [14, 90, "La edad debe estar entre 14 y 90 años."],
  height_cm: [120, 230, "La altura debe estar entre 120 y 230 cm."],
  weight_kg: [30, 300, "El peso actual debe estar entre 30 y 300 kg."],
  target_kg: [30, 300, "El peso objetivo debe estar entre 30 y 300 kg."],
};

/** Devuelve el primer mensaje de error de las medidas corporales presentes en `v`, o "" si todo está bien. */
export function bodyError(v) {
  for (const k of Object.keys(RANGES)) {
    if (!(k in v)) continue;
    const n = Number(v[k]);
    const [lo, hi, msg] = RANGES[k];
    if (String(v[k]).trim() === "" || !Number.isFinite(n) || n < lo || n > hi) return msg;
  }
  return "";
}
