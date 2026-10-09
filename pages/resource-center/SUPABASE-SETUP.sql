-- WestRiffa Smart Office | Resource Center V2
create extension if not exists pgcrypto;
create table if not exists public.resource_center_activations (
 id uuid primary key default gen_random_uuid(), teacher_user_id uuid not null references auth.users(id) on delete cascade,
 teacher_name text not null, department_id uuid null, department_name text null,
 activation_type text not null, activation_type_label text not null, grade text not null, section text not null,
 student_count integer not null check(student_count>0), subject text null, goal text not null, description text not null,
 evidence_paths text[] not null default '{}', status text not null default 'completed', completed_at timestamptz default now(), created_at timestamptz default now(),
 satisfaction_score integer null check(satisfaction_score between 1 and 5), goal_achieved text null, student_engagement text null,
 satisfaction_comment text null, satisfaction_submitted_at timestamptz null
);
create index if not exists rc_act_teacher_idx on public.resource_center_activations(teacher_user_id);
create index if not exists rc_act_department_idx on public.resource_center_activations(department_id);
create index if not exists rc_act_completed_idx on public.resource_center_activations(completed_at desc);
alter table public.resource_center_activations enable row level security;
-- Helpers read existing profile tables used by the platform.
create or replace function public.wr_current_role() returns text language sql stable security definer set search_path=public as $$
 select coalesce((select role::text from public.user_profiles where user_id=auth.uid() limit 1),(select role::text from public.profiles where id=auth.uid() limit 1),'teacher') $$;
create or replace function public.wr_current_department() returns uuid language sql stable security definer set search_path=public as $$
 select (select department_id from public.user_profiles where user_id=auth.uid() limit 1) $$;
drop policy if exists rc_select on public.resource_center_activations;
create policy rc_select on public.resource_center_activations for select to authenticated using (
 teacher_user_id=auth.uid() or public.wr_current_role()='admin' or (public.wr_current_role()='coordinator' and department_id=public.wr_current_department())
);
drop policy if exists rc_insert on public.resource_center_activations;
create policy rc_insert on public.resource_center_activations for insert to authenticated with check (teacher_user_id=auth.uid());
drop policy if exists rc_update on public.resource_center_activations;
create policy rc_update on public.resource_center_activations for update to authenticated using (teacher_user_id=auth.uid() or public.wr_current_role()='admin') with check (teacher_user_id=auth.uid() or public.wr_current_role()='admin');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('resource-center-evidence','resource-center-evidence',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists rc_storage_insert on storage.objects;
create policy rc_storage_insert on storage.objects for insert to authenticated with check (bucket_id='resource-center-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists rc_storage_select on storage.objects;
create policy rc_storage_select on storage.objects for select to authenticated using (bucket_id='resource-center-evidence');
-- V3 unified story activation fields
alter table public.resource_center_activations add column if not exists story_id text null;
alter table public.resource_center_activations add column if not exists story_title text null;
alter table public.resource_center_activations add column if not exists quiz_score integer null;
alter table public.resource_center_activations add column if not exists quiz_total integer null;
alter table public.resource_center_activations add column if not exists quiz_answers jsonb null;
-- coordinator may update satisfaction only on own activation; admin can view all via rc_select.
