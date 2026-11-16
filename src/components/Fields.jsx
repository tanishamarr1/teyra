export const Input = ({ label, ...p }) => (
  <label className="f">
    <span>{label}</span>
    <input {...p} />
  </label>
);

export const Select = ({ label, options, ...p }) => (
  <label className="f">
    <span>{label}</span>
    <select {...p}>
      {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  </label>
);

export const Meter = ({ label, value, max, unit = "" }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter">
      <div className="row sp s">
        <span>{label}</span>
        <span className="mu">{Math.round(value)} / {Math.round(max)} {unit}</span>
      </div>
      <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
