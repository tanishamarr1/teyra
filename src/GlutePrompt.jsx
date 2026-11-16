const OPTIONS = [
  [true, "Sí, enfocar en glúteos", "Hip thrust, bisagras y trabajo de glúteo medio en 2 a 3 días por semana."],
  [false, "No, rutina equilibrada", "Entrenamiento de todo el cuerpo con la misma atención en cada zona."],
];

export default function GlutePrompt({ value, onChange }) {
  return (
    <div role="group" aria-label="Enfoque de la rutina">
      {OPTIONS.map(([v, title, desc]) => (
        <button key={String(v)} type="button" className="opt" aria-pressed={value === v} onClick={() => onChange(v)}>
          <b>{title}</b>
          <br />
          <span className="s mu">{desc}</span>
        </button>
      ))}
    </div>
  );
}
