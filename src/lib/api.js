import { sb } from "./supabase";
import { buildRoutine } from "./routine";
import { toYMD } from "./dates";

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---- perfil
export const loadProfile = (uid) => sb.from("profiles").select("*").eq("id", uid).maybeSingle().then(unwrap);
export const updateProfile = (uid, patch) => sb.from("profiles").update(patch).eq("id", uid).then(unwrap);
export const ensureProfile = () => sb.rpc("ensure_profile").then(unwrap);
export const loadGym = (id) => sb.from("gyms").select("name").eq("id", id).maybeSingle().then(unwrap);
export const joinGym = (code) => sb.rpc("join_gym", { p_code: code }).then(unwrap);

// ---- rutina
export const loadExercises = () => sb.from("exercises").select("*").then(unwrap);

export const loadRoutine = () =>
  sb
    .from("routines")
    .select(
      "id,name,glute_focus,routine_days(id,title,day_index,routine_exercises(id,position,sets,reps,rest_s,exercise_id,exercises(id,name,pattern,muscle,instructions)))"
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(unwrap);

export const saveRoutine = (name, glute, plan) =>
  sb
    .rpc("save_routine", {
      p_name: name,
      p_glute: glute,
      p_plan: plan.map((d) => ({
        day_index: d.day_index,
        title: d.title,
        exercises: d.exercises.map(({ exercise_id, position, sets, reps, rest_s }) => ({ exercise_id, position, sets, reps, rest_s })),
      })),
    })
    .then(unwrap);

/** Genera y guarda (en una sola transacción) una rutina nueva a partir del perfil. */
export async function regenerateRoutine(p) {
  const all = await loadExercises();
  const glute = Boolean(p.glute_focus && p.sex === "F");
  const plan = buildRoutine(all, {
    gluteFocus: glute,
    level: p.level,
    days: p.days_per_week,
    equipment: p.equipment,
    goal: p.goal,
    minutes: p.minutes,
  });
  await saveRoutine(glute ? "Plan enfocado en glúteos" : "Plan personalizado", glute, plan);
  return plan;
}

export const swapExercise = (rowId, entry) =>
  sb.from("routine_exercises").update({ exercise_id: entry.exercise_id, sets: entry.sets, reps: entry.reps, rest_s: entry.rest_s }).eq("id", rowId).then(unwrap);

// ---- entrenamientos
export const recentWorkouts = (limit = 60) =>
  sb.from("workout_logs").select("id,day_id,done_at,volume_kg").order("done_at", { ascending: false }).limit(limit).then(unwrap);

export const logWorkout = (dayId, sets) => sb.rpc("log_workout", { p_day: dayId, p_sets: sets }).then(unwrap);

/** Series de los entrenamientos recientes de esos ejercicios (con la fecha de cada entrenamiento). */
export async function lastSets(exerciseIds) {
  const w = await recentWorkouts(40);
  if (!w.length || !exerciseIds.length) return [];
  const rows = await sb
    .from("set_logs")
    .select("exercise_id,workout_id,set_no,kg,reps")
    .in("workout_id", w.map((x) => x.id))
    .in("exercise_id", exerciseIds)
    .then(unwrap);
  const when = Object.fromEntries(w.map((x) => [x.id, x.done_at]));
  return rows.map((r) => ({ ...r, done_at: when[r.workout_id] }));
}

export const allSets = () => sb.from("set_logs").select("kg,reps,exercises(name)").limit(3000).then(unwrap);

// ---- peso
export const weightLogs = () => sb.from("weight_logs").select("kg,logged_at").order("logged_at").then(unwrap);

export async function addWeight(uid, kg) {
  unwrap(await sb.from("weight_logs").upsert({ user_id: uid, kg, logged_at: toYMD() }, { onConflict: "user_id,logged_at" }));
  unwrap(await sb.from("profiles").update({ weight_kg: kg }).eq("id", uid));
}

// ---- nutrición
export const listFoods = () => sb.from("foods").select("*").order("name").then(unwrap);
export const addFood = (food) => sb.from("foods").insert(food).select().single().then(unwrap);
export const foodLogsBetween = (a, b) =>
  sb
    .from("food_logs")
    .select("id,qty,meal,eaten_at,foods(name,serving,kcal,protein,carbs,fat)")
    .gte("eaten_at", a)
    .lt("eaten_at", b)
    .order("eaten_at")
    .then(unwrap);
export const addFoodLog = (uid, foodId, qty, meal, at) =>
  sb.from("food_logs").insert({ user_id: uid, food_id: foodId, qty, meal, eaten_at: at }).then(unwrap);
export const removeFoodLog = (id) => sb.from("food_logs").delete().eq("id", id).then(unwrap);
