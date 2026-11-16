// Estimaciones generales (Mifflin-St Jeor). No sustituyen la valoración de un profesional.
export const GOAL_ADJ = {
  "Ganar masa muscular": 0.1,
  "Perder grasa": -0.2,
  "Bajar de peso": -0.15,
  "Mantener peso": 0,
  "Mejorar condición física": 0,
};

export const bmr = ({ sex, weight_kg, height_cm, age }) => 10 * weight_kg + 6.25 * height_cm - 5 * age + (sex === "F" ? -161 : 5);
export const activityFactor = (days) => (days <= 3 ? 1.375 : days === 4 ? 1.55 : 1.65);

/** Metas diarias {kcal, protein, carbs, fat} o null si faltan datos del perfil. */
export function targets(p) {
  const n = (k) => Number(p?.[k]);
  if (![n("weight_kg"), n("height_cm"), n("age")].every((v) => Number.isFinite(v) && v > 0)) return null;
  const days = Number(p.days_per_week) || 4;
  let adj = GOAL_ADJ[p.goal] ?? 0;
  if (n("age") < 18) adj = Math.max(0, adj); // sin déficit calórico para menores de edad
  const floor = p.sex === "F" ? 1200 : 1500;
  const kcal = Math.round(Math.max(floor, bmr(p) * activityFactor(days) * (1 + adj)) / 10) * 10;
  const perKg = ["Perder grasa", "Ganar masa muscular"].includes(p.goal) ? 2 : 1.6;
  const protein = Math.min(Math.round(n("weight_kg") * perKg), Math.round((kcal * 0.35) / 4));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/** Suma de lo comido: `logs` = [{qty, foods:{kcal,protein,carbs,fat}}]. */
export function sumFoods(logs = []) {
  return logs.reduce(
    (a, l) => {
      const q = Number(l.qty) || 0;
      const f = l.foods || {};
      a.kcal += q * (Number(f.kcal) || 0);
      a.protein += q * (Number(f.protein) || 0);
      a.carbs += q * (Number(f.carbs) || 0);
      a.fat += q * (Number(f.fat) || 0);
      return a;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Minúsculas y sin tildes, para buscar "platano" y encontrar "Plátano". */
export const normalize = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
