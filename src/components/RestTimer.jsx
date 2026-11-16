import { useEffect, useState } from "react";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Cuenta atrás de descanso. Calcula desde la hora final, así no se atrasa si la pestaña se duerme. */
export default function RestTimer({ seconds, onClose }) {
  const [end, setEnd] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const tick = () => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      return l;
    };
    tick();
    const id = setInterval(() => {
      if (tick() === 0) {
        clearInterval(id);
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ }
        setTimeout(onClose, 1500);
      }
    }, 250);
    return () => clearInterval(id);
  }, [end]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rest" role="timer" aria-label="Descanso entre series">
      <div>
        <span className="mu s">{left === 0 ? "¡A la siguiente serie!" : "Descanso"}</span>
        <div className="big" style={{ fontSize: 28 }}>{fmt(left)}</div>
      </div>
      <div className="row">
        <button className="btn o sm" onClick={() => setEnd((e) => e - 15000)}>−15 s</button>
        <button className="btn o sm" onClick={() => setEnd((e) => e + 15000)}>+15 s</button>
        <button className="btn sm" onClick={onClose}>Saltar</button>
      </div>
    </div>
  );
}
