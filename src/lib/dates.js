const pad = (n) => String(n).padStart(2, "0");
export const toYMD = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isSameDay = (a, b) => toYMD(a) === toYMD(b);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** [inicio, fin) del día local, en ISO, para filtrar timestamptz en Supabase. */
export function dayRange(d = new Date()) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return [a.toISOString(), addDays(a, 1).toISOString()];
}

/** Marca de tiempo para registrar algo en el día `d` (ahora si es hoy; mediodía si es otro día). */
export function stampFor(d) {
  return isSameDay(d, new Date()) ? new Date().toISOString() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();
}

export function labelDay(d, now = new Date()) {
  if (isSameDay(d, now)) return "Hoy";
  if (isSameDay(d, addDays(now, -1))) return "Ayer";
  return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}

export function shortDate(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "short" });
}
