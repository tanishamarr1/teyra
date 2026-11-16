import { Link } from "react-router-dom";
import { sortDays, sortExercises } from "../lib/routine";
import { nextDayIndex, sessionsThisWeek } from "../lib/progress";
import { targets } from "../lib/nutrition";

export default function Inicio({ profile, plan, workouts }) {
  const days = sortDays(plan);
  const next = days.length ? days[nextDayIndex(days, workouts[0])] : null;
  const goalDays = profile.days_per_week || days.length || 1;
  const week = sessionsThisWeek(workouts);
  const t = targets(profile);
  const first = (profile.full_name || "").split(" ")[0];

  return (
    <>
      <div className="hd">
        <h1>Hola{first ? `, ${first}` : ""}</h1>
        <p>Esto es lo que toca hoy.</p>
      </div>
      <div className="grid">
        <section className="card dk c8" aria-label="Próximo entrenamiento">
          {next ? (
            <>
              <span className="chip" style={{ background: "rgba(128,128,128,.25)" }}>Próximo entrenamiento</span>
              <h2 style={{ fontSize: 28, margin: "14px 0 6px" }}>{next.title}</h2>
              <p style={{ opacity: 0.75, marginBottom: 18 }}>
                {sortExercises(next).map((r) => r.exercises.name).join(" · ")}
              </p>
              <Link className="btn w" to={`/entreno/${next.id}`}>Empezar entrenamiento</Link>
            </>
          ) : (
            <p>Aún no tienes una rutina. Ve a tu perfil para generarla.</p>
          )}
        </section>

        <section className="card c4" aria-label="Esta semana">
          <p className="mu s">Esta semana</p>
          <p className="big" style={{ margin: "8px 0 12px" }}>{week}<span className="mu" style={{ fontSize: 20 }}> / {goalDays}</span></p>
          <div className="bar" role="progressbar" aria-label="Entrenamientos de la semana" aria-valuemin={0} aria-valuemax={goalDays} aria-valuenow={Math.min(week, goalDays)}>
            <i style={{ width: `${Math.min(100, (week / goalDays) * 100)}%` }} />
          </div>
        </section>

        <section className="card c4" aria-label="Peso">
          <p className="mu s">Peso actual</p>
          <p className="big" style={{ margin: "8px 0" }}>{profile.weight_kg ?? "—"}<span className="mu" style={{ fontSize: 20 }}> kg</span></p>
          <p className="mu s">{profile.target_kg ? `Objetivo: ${profile.target_kg} kg` : "Define tu peso objetivo en el perfil"}</p>
        </section>

        <section className="card c4" aria-label="Nutrición">
          <p className="mu s">Meta diaria</p>
          {t ? (
            <>
              <p className="big" style={{ margin: "8px 0" }}>{t.kcal}<span className="mu" style={{ fontSize: 20 }}> kcal</span></p>
              <p className="mu s">P {t.protein} g · C {t.carbs} g · G {t.fat} g</p>
            </>
          ) : (
            <p className="mu s" style={{ marginTop: 8 }}>Completa edad, altura y peso en tu perfil.</p>
          )}
        </section>

        <section className="card c4" aria-label="Plan">
          <p className="mu s">Tu plan</p>
          <p style={{ fontWeight: 600, margin: "8px 0" }}>{plan?.name ?? "Sin plan"}</p>
          <Link className="btn o sm" to="/rutinas">Ver rutinas</Link>
        </section>
      </div>
    </>
  );
}
