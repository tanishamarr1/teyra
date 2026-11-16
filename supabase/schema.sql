-- TEYRA. · esquema Supabase (multi-gimnasio + RLS). Ejecuta primero este archivo y luego seed_exercises.sql
create table gyms(id uuid primary key default gen_random_uuid(),name text not null,logo_url text,invite_code text unique default substr(md5(random()::text),1,8),created_at timestamptz default now());
create table profiles(id uuid primary key references auth.users on delete cascade,gym_id uuid references gyms,role text default 'member' check(role in('member','admin')),
 full_name text,sex text check(sex in('M','F')),age int,height_cm int,weight_kg numeric,target_kg numeric,goal text,level int default 1 check(level between 1 and 3),
 days_per_week int default 4,minutes int default 60,equipment text[] default '{peso_corporal}',diet text,glute_focus boolean default false,start_date date default current_date);
create table exercises(id uuid primary key default gen_random_uuid(),slug text unique,name text not null,muscle text,pattern text not null,equipment text[] not null,
 level int default 1,rank int default 1,glute_emphasis int default 1,sets int default 3,reps text default '10-12',rest_s int default 60,instructions text);
create table routines(id uuid primary key default gen_random_uuid(),user_id uuid references profiles on delete cascade,name text,glute_focus boolean default false,active boolean default true,created_at timestamptz default now());
create table routine_days(id uuid primary key default gen_random_uuid(),routine_id uuid references routines on delete cascade,day_index int,title text);
create table routine_exercises(id uuid primary key default gen_random_uuid(),day_id uuid references routine_days on delete cascade,exercise_id uuid references exercises,position int,sets int,reps text,rest_s int);
create table workout_logs(id uuid primary key default gen_random_uuid(),user_id uuid references profiles on delete cascade,day_id uuid references routine_days,done_at timestamptz default now(),volume_kg numeric default 0);
create table set_logs(id uuid primary key default gen_random_uuid(),workout_id uuid references workout_logs on delete cascade,exercise_id uuid references exercises,set_no int,kg numeric,reps int);
create table foods(id uuid primary key default gen_random_uuid(),name text not null,serving text,kcal numeric,protein numeric,carbs numeric,fat numeric,barcode text);
create table food_logs(id uuid primary key default gen_random_uuid(),user_id uuid references profiles on delete cascade,food_id uuid references foods,qty numeric default 1,eaten_at timestamptz default now());
-- Regla de negocio: nunca más de 5 ejercicios por día
create function max5() returns trigger language plpgsql as $$ begin
 if (select count(*) from routine_exercises where day_id=new.day_id)>=5 then raise exception 'Máximo 5 ejercicios por día'; end if; return new; end $$;
create trigger t_max5 before insert on routine_exercises for each row execute function max5();
do $$ declare t text; begin foreach t in array array['profiles','routines','workout_logs','food_logs','exercises','foods','gyms','routine_days','routine_exercises','set_logs'] loop execute format('alter table %I enable row level security',t); end loop; end $$;
create policy ex_read on exercises for select using(true);
create policy foods_read on foods for select using(true);
create policy gym_read on gyms for select using(id=(select gym_id from profiles where id=auth.uid()));
create policy me_profile on profiles for all using(id=auth.uid()) with check(id=auth.uid());
create policy admin_members on profiles for select using(gym_id=(select gym_id from profiles where id=auth.uid() and role='admin'));
create policy my_routines on routines for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy my_days on routine_days for all using(routine_id in(select id from routines where user_id=auth.uid())) with check(routine_id in(select id from routines where user_id=auth.uid()));
create policy my_rex on routine_exercises for all using(day_id in(select d.id from routine_days d join routines r on r.id=d.routine_id where r.user_id=auth.uid())) with check(day_id in(select d.id from routine_days d join routines r on r.id=d.routine_id where r.user_id=auth.uid()));
create policy my_wl on workout_logs for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy my_sl on set_logs for all using(workout_id in(select id from workout_logs where user_id=auth.uid())) with check(workout_id in(select id from workout_logs where user_id=auth.uid()));
create policy my_fl on food_logs for all using(user_id=auth.uid()) with check(user_id=auth.uid());
