// Generador de rutinas. Lógica pura (sin Supabase ni React) para poder probarla con `npm test`.
export const EQUIP = {
  "Gimnasio completo": ["barra", "mancuernas", "maquina", "polea", "banco", "banda", "peso_corporal"],
  "Mancuernas en casa": ["mancuernas", "banco", "banda", "peso_corporal"],
  "Solo peso corporal": ["peso_corporal", "banda"],
};
export const EQUIP_KEYS = Object.keys(EQUIP);
export const MIN_EX = 4; // un día con menos ejercicios se considera incompleto
export const MAX_EX = 5; // regla de negocio (también la impone el trigger max5 en la base de datos)

/** Convierte el arreglo de equipo guardado en el perfil de vuelta a su opción de menú. */
export function equipKey(list = []) {
  const s = new Set(list);
  const exact = EQUIP_KEYS.find((k) => EQUIP[k].length === s.size && EQUIP[k].every((x) => s.has(x)));
  return exact ?? (s.size <= 1 ? "Solo peso corporal" : EQUIP_KEYS[0]);
}

const UP = ["horizontal_push", "vertical_pull", "vertical_push", "horizontal_pull", "core"];
const TC = ["Torso y core", ["vertical_push", "vertical_pull", "lateral_raise", "triceps", "core"]];
const GL = [
  ["Glúteos y pierna", ["hip_thrust", "squat", "lunge", "glute_isolation", "abduction"]],
  ["Torso", UP],
  ["Glúteos e isquios", ["hinge", "hip_thrust", "ham_curl", "lunge", "core"]],
];
const TPL = {
  glute: {
    3: GL,
    4: [...GL, TC],
    5: [...GL, TC, ["Glúteos y cuádriceps", ["squat", "hip_thrust", "quad_isolation", "glute_isolation", "abduction"]]],
  },
  std: {
    3: [
      ["Cuerpo completo A", ["squat", "horizontal_push", "horizontal_pull", "hinge", "core"]],
      ["Cuerpo completo B", ["lunge", "vertical_push", "vertical_pull", "hip_thrust", "core"]],
      ["Cuerpo completo C", ["squat", "horizontal_push", "horizontal_pull", "ham_curl", "lateral_raise"]],
    ],
    4: [
      ["Torso A", ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "triceps"]],
      ["Pierna A", ["squat", "hinge", "lunge", "ham_curl", "core"]],
      ["Torso B", ["vertical_push", "vertical_pull", "horizontal_push", "lateral_raise", "biceps"]],
      ["Pierna B", ["hinge", "squat", "hip_thrust", "quad_isolation", "core"]],
    ],
    5: [
      ["Empuje", ["horizontal_push", "vertical_push", "lateral_raise", "triceps", "core"]],
      ["Tirón", ["vertical_pull", "horizontal_pull", "biceps", "core", "lateral_raise"]],
      ["Pierna", ["squat", "hinge", "lunge", "ham_curl", "core"]],
      ["Torso", UP],
      ["Pierna y glúteo", ["hinge", "squat", "hip_thrust", "quad_isolation", "core"]],
    ],
  },
};

// Si no hay ejercicio de un patrón para el equipo/nivel del usuario, se prueba con patrones parecidos.
const ALT = {
  vertical_pull: ["horizontal_pull"],
  horizontal_pull: ["vertical_pull"],
  vertical_push: ["horizontal_push", "lateral_raise"],
  horizontal_push: ["vertical_push"],
  lateral_raise: ["vertical_push"],
  triceps: ["horizontal_push", "vertical_push"],
  biceps: ["horizontal_pull", "vertical_pull"],
  squat: ["lunge", "quad_isolation"],
  lunge: ["squat"],
  hinge: ["hip_thrust", "ham_curl"],
  ham_curl: ["hinge", "hip_thrust"],
  quad_isolation: ["squat", "lunge"],
  hip_thrust: ["hinge", "glute_isolation"],
  glute_isolation: ["abduction", "hip_thrust"],
  abduction: ["glute_isolation"],
  core: [],
};

export const sortDays = (plan) => [...(plan?.routine_days || [])].sort((a, b) => a.day_index - b.day_index);
export const sortExercises = (day) => [...(day?.routine_exercises || [])].sort((a, b) => a.position - b.position);

const isTime = (reps) => /\d\s*s$/.test(String(reps).trim()); // "30-45 s" = ejercicio por tiempo

/** Series/repeticiones/descanso de un ejercicio según nivel, objetivo y tiempo disponible. */
export function toEntry(c, { level = 1, goal = "", minutes = 60 } = {}) {
  const m = Number(minutes) || 60;
  let sets = Number(level) === 1 ? Math.min(c.sets, 3) : c.sets;
  if (m <= 45) sets = Math.max(2, sets - 1);
  else if (m >= 90) sets = Math.min(5, sets + 1);
  const reps = goal === "Perder grasa" && !isTime(c.reps) ? "12-15" : c.reps;
  return { exercise_id: c.id, name: c.name, sets, reps, rest_s: c.rest_s };
}

const allowed = (e, level, have) => e.level <= level && e.equipment.every((x) => have.has(x));

export function buildRoutine(all, { gluteFocus = false, level = 1, days = 4, equipment = [], goal = "", minutes = 60 } = {}) {
  const have = new Set(equipment);
  const lvl = Number(level) || 1;
  const pool = all.filter((e) => allowed(e, lvl, have));
  const used = new Set();
  const template = TPL[gluteFocus ? "glute" : "std"][Math.min(5, Math.max(3, Number(days) || 4))];

  const pick = (pattern, inDay) => {
    for (const p of [pattern, ...(ALT[pattern] || [])]) {
      const c = pool
        .filter((e) => e.pattern === p && !inDay.has(e.id))
        .sort((a, b) => used.has(a.id) - used.has(b.id) || a.rank - b.rank)[0];
      if (c) return c;
    }
    return null;
  };

  return template.map(([title, patterns], i) => {
    const inDay = new Set();
    const exercises = [];
    for (const p of patterns) {
      const c = pick(p, inDay);
      if (!c) continue;
      inDay.add(c.id);
      used.add(c.id);
      exercises.push(toEntry(c, { level: lvl, goal, minutes }));
    }
    return { day_index: i, title, exercises: exercises.slice(0, MAX_EX).map((e, position) => ({ ...e, position })) };
  });
}

/** Títulos de los días que quedaron con pocos ejercicios. */
export const planWarnings = (plan) => plan.filter((d) => d.exercises.length < MIN_EX).map((d) => d.title);

/** Ejercicios que pueden sustituir a `current` (mismo patrón, mismo equipo y nivel permitido). */
export function alternatives(all, current, { level = 1, equipment = [], exclude = new Set() } = {}) {
  const have = new Set(equipment);
  return all
    .filter((e) => e.pattern === current.pattern && e.id !== current.id && !exclude.has(e.id) && allowed(e, Number(level) || 1, have))
    .sort((a, b) => a.rank - b.rank);
}
