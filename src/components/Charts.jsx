const W = 600, H = 220, P = { l: 44, r: 16, t: 14, b: 28 };

export function LineChart({ points, target, label }) {
  if (!points.length) return null;
  const ys = points.map((p) => p.y).concat(target != null ? [target] : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  const pad = Math.max(1, (max - min) * 0.15);
  min -= pad; max += pad;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const X = (i) => P.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (v) => P.t + ((max - v) / (max - min)) * ih;
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const ticks = [min + pad / 2, (min + max) / 2, max - pad / 2];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: "100%", height: "auto" }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke="var(--ln)" />
          <text x={P.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--mu)">{t.toFixed(1)}</text>
        </g>
      ))}
      {target != null && (
        <g>
          <line x1={P.l} x2={W - P.r} y1={Y(target)} y2={Y(target)} stroke="var(--mu)" strokeDasharray="5 5" />
          <text x={W - P.r} y={Y(target) - 5} textAnchor="end" fontSize="11" fill="var(--mu)">Objetivo</text>
        </g>
      )}
      <path d={d} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r="3.5" fill="var(--fg)" />)}
      <text x={P.l} y={H - 8} fontSize="11" fill="var(--mu)">{points[0].x}</text>
      {points.length > 1 && <text x={W - P.r} y={H - 8} textAnchor="end" fontSize="11" fill="var(--mu)">{points[points.length - 1].x}</text>}
    </svg>
  );
}

const compact = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));

export function BarChart({ data, label }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const iw = W - P.l - P.r, bw = iw / data.length, ch = H - P.t - P.b - 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: "100%", height: "auto" }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * ch);
        const x = P.l + i * bw + bw * 0.18, w = bw * 0.64, y = H - P.b - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="4" fill={d.value ? "var(--fg)" : "var(--g2)"} />
            {d.value > 0 && <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="var(--mu)">{compact(d.value)}</text>}
            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mu)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
