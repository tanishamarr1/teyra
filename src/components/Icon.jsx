const PATHS = {
  inicio: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  rutinas: "M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11",
  nutricion: "M12 21c-4 0-7-3-7-7 0-3 2-5 4-6 1 1 2 1 3 0 2 1 4 3 4 6 0 4-3 7-7 7zM12 8c0-2 1-4 3-5",
  progreso: "M3 3v18h18M7 15l4-4 3 3 5-6",
  perfil: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
};

export const NAV = [
  ["/", "inicio", "Inicio"],
  ["/rutinas", "rutinas", "Rutinas"],
  ["/nutricion", "nutricion", "Nutrición"],
  ["/progreso", "progreso", "Progreso"],
  ["/perfil", "perfil", "Perfil"],
];

export function Icon({ name }) {
  return (
    <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
