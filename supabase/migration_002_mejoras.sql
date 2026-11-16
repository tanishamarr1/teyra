-- TEYRA. · migración 002. Ejecutar DESPUÉS de schema.sql. Se puede repetir sin romper nada.

-- 1) SEGURIDAD: el cliente ya no puede cambiarse role ni gym_id (antes cualquiera podía hacerse admin).
revoke insert, update on profiles from authenticated, anon;
grant update (full_name, sex, age, height_cm, weight_kg, target_kg, goal, level, days_per_week, minutes, equipment, diet, glute_focus)
  on profiles to authenticated;

-- 2) SEGURIDAD: funciones auxiliares para evitar la recursión infinita de las políticas de profiles.
create or replace function my_gym() returns uuid language sql stable security definer set search_path = public
  as $$ select gym_id from profiles where id = auth.uid() $$;
create or replace function my_role() returns text language sql stable security definer set search_path = public
  as $$ select role from profiles where id = auth.uid() $$;

drop policy if exists gym_read on gyms;
create policy gym_read on gyms for select using (id = my_gym());
drop policy if exists admin_members on profiles;
create policy admin_members on profiles for select using (gym_id is not null and gym_id = my_gym() and my_role() = 'admin');

-- 3) Columnas y tablas nuevas
alter table food_logs add column if not exists meal text not null default 'almuerzo'
  check (meal in ('desayuno', 'almuerzo', 'cena', 'snack'));
alter table foods add column if not exists created_by uuid references auth.users on delete cascade default auth.uid();

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kg numeric not null check (kg > 0 and kg < 500),
  logged_at date not null default current_date,
  unique (user_id, logged_at)
);
alter table weight_logs enable row level security;
drop policy if exists my_weight on weight_logs;
create policy my_weight on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Alimentos: los globales los ve todo el mundo; los personalizados solo su dueño.
drop policy if exists foods_read on foods;
create policy foods_read on foods for select using (created_by is null or created_by = auth.uid());
drop policy if exists foods_ins on foods;
create policy foods_ins on foods for insert with check (created_by = auth.uid());
create unique index if not exists foods_global_name on foods (lower(name)) where created_by is null;

create index if not exists workout_logs_user_date on workout_logs (user_id, done_at desc);
create index if not exists food_logs_user_date on food_logs (user_id, eaten_at desc);
create index if not exists weight_logs_user_date on weight_logs (user_id, logged_at);

-- 4) El perfil se crea solo al registrarse (funciona aunque haya que confirmar el correo).
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  begin
    insert into profiles (id, full_name, sex, age, height_cm, weight_kg, target_kg, goal, level, days_per_week, minutes, equipment, glute_focus)
    values (
      new.id, m->>'full_name',
      case when m->>'sex' in ('M', 'F') then m->>'sex' end,
      nullif(m->>'age', '')::int, nullif(m->>'height_cm', '')::int,
      nullif(m->>'weight_kg', '')::numeric, nullif(m->>'target_kg', '')::numeric,
      m->>'goal',
      least(3, greatest(1, coalesce(nullif(m->>'level', '')::int, 1))),
      least(5, greatest(3, coalesce(nullif(m->>'days_per_week', '')::int, 4))),
      coalesce(nullif(m->>'minutes', '')::int, 60),
      case when jsonb_typeof(m->'equipment') = 'array'
           then array(select jsonb_array_elements_text(m->'equipment')) else '{peso_corporal}' end,
      coalesce((m->>'glute_focus')::boolean, false)
    ) on conflict (id) do nothing;
  exception when others then
    insert into profiles (id, full_name) values (new.id, coalesce(m->>'full_name', '')) on conflict (id) do nothing;
  end;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Para usuarios que se registraron antes y se quedaron sin perfil.
create or replace function ensure_profile() returns void language sql security definer set search_path = public
  as $$ insert into profiles (id) values (auth.uid()) on conflict (id) do nothing $$;

-- 5) Guardado atómico: o se guarda la rutina completa o no se guarda nada.
create or replace function save_routine(p_name text, p_glute boolean, p_plan jsonb) returns uuid language plpgsql as $$
declare rid uuid; did uuid; d jsonb; e jsonb;
begin
  update routines set active = false where user_id = auth.uid();
  insert into routines (user_id, name, glute_focus) values (auth.uid(), p_name, p_glute) returning id into rid;
  for d in select * from jsonb_array_elements(p_plan) loop
    insert into routine_days (routine_id, day_index, title) values (rid, (d->>'day_index')::int, d->>'title') returning id into did;
    for e in select * from jsonb_array_elements(d->'exercises') loop
      insert into routine_exercises (day_id, exercise_id, position, sets, reps, rest_s)
      values (did, (e->>'exercise_id')::uuid, (e->>'position')::int, (e->>'sets')::int, e->>'reps', (e->>'rest_s')::int);
    end loop;
  end loop;
  return rid;
end $$;

-- Registro atómico de un entrenamiento y sus series.
create or replace function log_workout(p_day uuid, p_sets jsonb) returns uuid language plpgsql as $$
declare wid uuid; vol numeric;
begin
  if not exists (select 1 from routine_days d join routines r on r.id = d.routine_id where d.id = p_day and r.user_id = auth.uid()) then
    raise exception 'Ese día de rutina no existe';
  end if;
  select coalesce(sum((s->>'kg')::numeric * (s->>'reps')::int), 0) into vol from jsonb_array_elements(p_sets) s;
  insert into workout_logs (user_id, day_id, volume_kg) values (auth.uid(), p_day, vol) returning id into wid;
  insert into set_logs (workout_id, exercise_id, set_no, kg, reps)
  select wid, (s->>'exercise_id')::uuid, (s->>'set_no')::int, (s->>'kg')::numeric, (s->>'reps')::int from jsonb_array_elements(p_sets) s;
  return wid;
end $$;

-- Unirse a un gimnasio con su código de invitación.
create or replace function join_gym(p_code text) returns text language plpgsql security definer set search_path = public as $$
declare g gyms;
begin
  select * into g from gyms where invite_code = lower(trim(p_code));
  if not found then raise exception 'Código no válido'; end if;
  update profiles set gym_id = g.id where id = auth.uid();
  return g.name;
end $$;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function ensure_profile(), join_gym(text) from public, anon;
