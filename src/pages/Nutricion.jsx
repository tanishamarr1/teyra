import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addFood, addFoodLog, foodLogsBetween, listFoods, removeFoodLog } from "../lib/api";
import { normalize, sumFoods, targets } from "../lib/nutrition";
import { addDays, dayRange, isSameDay, labelDay, stampFor } from "../lib/dates";
import { Input, Meter, Select } from "../components/Fields";

const MEALS = [["desayuno", "Desayuno"], ["almuerzo", "Almuerzo"], ["cena", "Cena"], ["snack", "Snack"]];
const defaultMeal = () => { const h = new Date().getHours(); return h < 10 ? "desayuno" : h < 15 ? "almuerzo" : h < 18 ? "snack" : "cena"; };
const EMPTY_FOOD = { name: "", serving: "", kcal: "", protein: "", carbs: "", fat: "" };
const r1 = (n) => Math.round(n * 10) / 10;

export default function Nutricion({ uid, profile }) {
  const [date, setDate] = useState(() => new Date());
  const [foods, setFoods] = useState([]);
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState("1");
  const [meal, setMeal] = useState(defaultMeal);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState(EMPTY_FOOD);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const goal = targets(profile);
  const today = isSameDay(date, new Date());

  const refresh = useCallback(async () => {
    try {
      const [a, b] = dayRange(date);
      setLogs(await foodLogsBetween(a, b));
    } catch (e) { setErr(e.message); }
  }, [date]);

  useEffect(() => { listFoods().then(setFoods).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const found = useMemo(() => {
    const n = normalize(q.trim());
    return n ? foods.filter((f) => normalize(f.name).includes(n)).slice(0, 8) : [];
  }, [q, foods]);
  const total = useMemo(() => sumFoods(logs), [logs]);

  async function add() {
    const n = Number(qty);
    if (!sel) return setErr("Elige un alimento de la lista.");
    if (!(n > 0 && n <= 20)) return setErr("La cantidad debe estar entre 0 y 20 porciones.");
    setBusy(true); setErr("");
    try {
      await addFoodLog(uid, sel.id, n, meal, stampFor(date));
      setSel(null); setQ(""); setQty("1");
      await refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove(id) {
    try { await removeFoodLog(id); await refresh(); } catch (e) { setErr(e.message); }
  }

  async function createFood() {
    const num = (k) => Number(nf[k]);
    if (nf.name.trim().length < 2 || !nf.serving.trim()) return setErr("Escribe el nombre y la porción del alimento.");
    if (["kcal", "protein", "carbs", "fat"].some((k) => nf[k] === "" || !(num(k) >= 0) || num(k) > 5000)) return setErr("Calorías y macros deben ser números válidos (0 o más).");
    setBusy(true); setErr("");
    try {
      const f = await addFood({ name: nf.name.trim(), serving: nf.serving.trim(), kcal: num("kcal"), protein: num("protein"), carbs: num("carbs"), fat: num("fat") });
      setFoods((l) => [...l, f].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setSel(f); setQ(f.name); setNf(EMPTY_FOOD); setShowNew(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const bindNf = (k) => ({ value: nf[k], onChange: (e) => setNf((p) => ({ ...p, [k]: e.target.value })) });

  return (
    <>
      <div className="hd">
        <h1>Nutrición</h1>
        <p>Registra lo que comes y compáralo con tu meta diaria.</p>
      </div>

      <div className="row sp wr" style={{ marginBottom: 14 }}>
        <div className="row">
          <button className="btn o sm" aria-label="Día anterior" onClick={() => setDate((d) => addDays(d, -1))}>←</button>
          <b style={{ minWidth: 110, textAlign: "center" }}>{labelDay(date)}</b>
          <button className="btn o sm" aria-label="Día siguiente" disabled={today} onClick={() => setDate((d) => addDays(d, 1))}>→</button>
        </div>
        {!today && <button className="lnk" onClick={() => setDate(new Date())}>Ir a hoy</button>}
      </div>

      <div className="grid">
        <section className="card c12" aria-label="Resumen del día">
          {goal ? (
            <>
              <div className="row sp wr" style={{ marginBottom: 14 }}>
                <div><p className="big">{Math.round(total.kcal)}<span className="mu" style={{ fontSize: 20 }}> / {goal.kcal} kcal</span></p></div>
                <p className="mu">{goal.kcal - total.kcal >= 0 ? `Te quedan ${Math.round(goal.kcal - total.kcal)} kcal` : `Te pasaste ${Math.round(total.kcal - goal.kcal)} kcal`}</p>
              </div>
              <div className="grid" style={{ gap: 12 }}>
                <div className="c4"><Meter label="Proteína" value={total.protein} max={goal.protein} unit="g" /></div>
                <div className="c4"><Meter label="Carbohidratos" value={total.carbs} max={goal.carbs} unit="g" /></div>
                <div className="c4"><Meter label="Grasas" value={total.fat} max={goal.fat} unit="g" /></div>
              </div>
              <p className="mu s" style={{ marginTop: 14 }}>Estimación general según tu perfil y objetivo; no sustituye la consulta con un profesional de la salud.</p>
            </>
          ) : (
            <p>Para calcular tus metas faltan datos. <Link to="/perfil">Completa tu perfil</Link>.</p>
          )}
        </section>

        <section className="card c12" aria-label="Añadir alimento">
          <h2 style={{ marginBottom: 12 }}>Añadir alimento</h2>
          <div className="row wr" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: "2 1 220px" }}>
              <Input label="Buscar" placeholder="Ej: arroz, huevo, plátano…" value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
            </div>
            <div style={{ flex: "0 1 90px" }}>
              <Input label="Porciones" type="number" inputMode="decimal" min="0.25" step="0.25" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <Select label="Comida" options={MEALS} value={meal} onChange={(e) => setMeal(e.target.value)} />
            </div>
          </div>
          {!sel && found.map((f) => (
            <button key={f.id} className="opt" style={{ margin: "6px 0", padding: 12 }} onClick={() => { setSel(f); setQ(f.name); }}>
              <b>{f.name}</b> <span className="mu s">· {f.serving} · {f.kcal} kcal</span>
            </button>
          ))}
          {!sel && q.trim() && found.length === 0 && <p className="mu s">No encontramos ese alimento. Puedes crearlo abajo.</p>}
          {sel && <p className="s" style={{ margin: "4px 0 10px" }}>{sel.serving} = {sel.kcal} kcal · P {sel.protein} g · C {sel.carbs} g · G {sel.fat} g</p>}
          <div className="row wr">
            <button className="btn" disabled={busy || !sel} onClick={add}>Añadir</button>
            <button className="lnk" onClick={() => setShowNew((v) => !v)} aria-expanded={showNew}>{showNew ? "Cancelar" : "Crear alimento nuevo"}</button>
          </div>
          {showNew && (
            <div style={{ marginTop: 16 }}>
              <Input label="Nombre" {...bindNf("name")} />
              <Input label="Porción (ej: 1 taza, 100 g)" {...bindNf("serving")} />
              <div className="row wr">
                {[["kcal", "Calorías"], ["protein", "Proteína (g)"], ["carbs", "Carbohidratos (g)"], ["fat", "Grasas (g)"]].map(([k, l]) => (
                  <div key={k} style={{ flex: "1 1 110px" }}><Input label={l} type="number" inputMode="decimal" min="0" step="0.1" {...bindNf(k)} /></div>
                ))}
              </div>
              <button className="btn" disabled={busy} onClick={createFood}>Guardar alimento</button>
            </div>
          )}
          {err && <p className="err" role="alert">{err}</p>}
        </section>

        <section className="card c12" aria-label="Lo que comiste">
          <h2 style={{ marginBottom: 6 }}>Lo que comiste</h2>
          {logs.length === 0 && <p className="emp">Todavía no registras nada {today ? "hoy" : "este día"}.</p>}
          {MEALS.map(([k, label]) => {
            const items = logs.filter((l) => l.meal === k);
            if (!items.length) return null;
            const kcal = items.reduce((a, l) => a + l.qty * l.foods.kcal, 0);
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div className="row sp"><b>{label}</b><span className="mu s">{Math.round(kcal)} kcal</span></div>
                {items.map((l) => (
                  <div key={l.id} className="li">
                    <div>
                      <div>{l.foods.name}</div>
                      <div className="mu s">{r1(l.qty)} × {l.foods.serving} · {Math.round(l.qty * l.foods.kcal)} kcal</div>
                    </div>
                    <button className="lnk" aria-label={`Quitar ${l.foods.name}`} onClick={() => remove(l.id)}>Quitar</button>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
