# TEYRA. (React + Vite + Supabase)

Entrenamiento y nutrición a tu medida: rutinas generadas por nivel y equipo, modo entrenamiento con temporizador, progreso, registro de comidas y gimnasio por código.

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com). En **SQL Editor** ejecuta, **en este orden**:
   1. `supabase/schema.sql`
   2. `supabase/migration_002_mejoras.sql` (seguridad, registro automático, funciones, tablas nuevas)
   3. `supabase/seed_exercises.sql`
   4. `supabase/seed_exercises_extra.sql`
   5. `supabase/seed_foods.sql`
2. Copia `.env.example` a `.env` y pega tu URL y anon key (Settings → API).
3. En **Authentication → URL Configuration** agrega la URL de tu app (`http://localhost:5173` en desarrollo y tu dominio en producción) como *Site URL* y en *Redirect URLs*. Es necesario para los enlaces de confirmación y de recuperar contraseña.
4. "Confirm email" puede quedar activado o no: la app funciona en ambos casos.
5. `npm install` y luego `npm run dev`.

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm test`: pruebas de la lógica (generador de rutinas con el catálogo real, nutrición, progreso, validación). No necesita instalar nada extra.

## Estructura

- `src/lib/routine.js`: generador de rutinas (puro). Elige por patrón el ejercicio de mejor `rank`, con respaldo por patrones parecidos si falta equipo.
- `src/lib/nutrition.js`: calorías y macros (Mifflin-St Jeor). `src/lib/progress.js`: progresión, volumen, récords.
- `src/lib/api.js`: todas las llamadas a Supabase. `save_routine` y `log_workout` son funciones RPC transaccionales.
- `src/pages/`: Inicio, Rutinas (con "Cambiar ejercicio"), Entreno, Nutrición, Progreso, Perfil.

## Notas de seguridad

- Los usuarios ya **no** pueden cambiar su `role` ni su `gym_id` desde el cliente; unirse a un gimnasio se hace con `join_gym(código)`.
- Los gimnasios y sus códigos se crean desde el SQL Editor (todavía no hay pantalla de administración).
- La app es una PWA: en producción registra `public/sw.js`, que nunca intercepta las peticiones a Supabase.
