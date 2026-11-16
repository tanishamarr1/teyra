import { readFileSync } from "node:fs";
const RX = /\('([^']+)','([^']+)','([^']*)','([^']+)','\{([^}]*)\}',(\d+),(\d+),(\d+),(\d+),'([^']+)',(\d+)/g;

/** Lee los ejercicios de los archivos seed .sql para probar el generador con datos reales. */
export function loadExercises() {
  const out = [];
  for (const f of ["seed_exercises.sql", "seed_exercises_extra.sql"]) {
    const sql = readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8");
    for (const m of sql.matchAll(RX)) {
      out.push({ id: m[1], slug: m[1], name: m[2], muscle: m[3], pattern: m[4], equipment: m[5].split(","), level: +m[6], rank: +m[7], glute_emphasis: +m[8], sets: +m[9], reps: m[10], rest_s: +m[11] });
    }
  }
  return out;
}
