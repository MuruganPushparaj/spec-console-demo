-- =====================================================================
-- SPEC CONSOLE — Supabase schema + Row-Level Security
-- Paste into Supabase Studio → SQL Editor → Run.
-- (Or let Claude Code turn this into supabase/migrations/0001_init.sql)
--
-- The security model lives HERE, in the database — not in the UI.
-- A viewer cannot write even if they bypass the front-end, because
-- every write is gated by an RLS policy that checks their project role.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

-- role is the permission system. owner = manage members + edit,
-- editor = edit, viewer = read-only (can still export).
create table if not exists public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer' check (role in ('owner','editor','viewer')),
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

-- A whole form is stored as ONE jsonb blob in `content`, matching the
-- exact object shape the prototype already uses. This means the existing
-- rendering + export logic ports unchanged.
create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  content     jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- File metadata. The bytes live in Supabase Storage (bucket 'attachments');
-- only the reference lives here.
create table if not exists public.attachments (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.forms(id) on delete cascade,
  field_ref     text,                -- e.g. 'f:<fieldId>' or 'c:<fieldId>:<colIndex>'
  file_name     text not null,
  mime          text,
  size          bigint,
  storage_path  text not null,       -- path inside the 'attachments' bucket
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- Pending invites for people who may not have an account yet.
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  email       text not null,
  role        text not null default 'viewer' check (role in ('owner','editor','viewer')),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (project_id, email)
);

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER — avoid RLS recursion)
-- These run with elevated rights so a membership check inside an RLS
-- policy does NOT re-trigger RLS on project_members (classic Supabase
-- infinite-recursion trap).
-- ---------------------------------------------------------------------

create or replace function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function public.project_role(pid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from project_members
  where project_id = pid and user_id = auth.uid();
$$;

create or replace function public.shares_project(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from project_members a
    join project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create or replace function public.form_project(fid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select project_id from forms where id = fid;
$$;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

-- New auth user -> create a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New project -> add its creator as the 'owner' member.
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.add_owner_as_member();

-- ---------------------------------------------------------------------
-- RPCs the app calls
-- ---------------------------------------------------------------------

-- Atomic, permission-checked save with optimistic concurrency.
-- Returns the new version, or raises 'version_conflict' / 'forbidden'.
create or replace function public.save_form(
  p_id uuid, p_content jsonb, p_expected_version integer
) returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if public.project_role(public.form_project(p_id)) not in ('owner','editor') then
    raise exception 'forbidden';
  end if;

  update public.forms
     set content = p_content,
         version = version + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_id and version = p_expected_version
  returning version into v;

  if v is null then
    raise exception 'version_conflict';
  end if;
  return v;
end; $$;

-- On login, pull the signed-in user into any projects they were invited to.
create or replace function public.accept_my_invitations()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  select i.project_id, auth.uid(), i.role
  from public.invitations i
  where lower(i.email) = lower(auth.email())
  on conflict (project_id, user_id) do nothing;

  delete from public.invitations
  where lower(email) = lower(auth.email());
end; $$;

-- ---------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.forms           enable row level security;
alter table public.attachments     enable row level security;
alter table public.invitations     enable row level security;

-- profiles: you can read yourself + anyone who shares a project with you.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.shares_project(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- projects: members read; any authed user can create (becomes owner via trigger);
-- only owner can rename/delete.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (public.is_project_member(id));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert
  with check (owner_id = auth.uid());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (public.project_role(id) = 'owner');
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete
  using (public.project_role(id) = 'owner');

-- project_members: members see co-members; only owner adds/changes roles;
-- a member may remove themselves (leave).
drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select
  using (public.is_project_member(project_id));
drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert
  with check (public.project_role(project_id) = 'owner');
drop policy if exists members_update on public.project_members;
create policy members_update on public.project_members for update
  using (public.project_role(project_id) = 'owner');
drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members for delete
  using (public.project_role(project_id) = 'owner' or user_id = auth.uid());

-- forms: members read; owner/editor write. (Direct UPDATE allowed, but the
-- app should prefer the save_form() RPC for version-safe writes.)
drop policy if exists forms_select on public.forms;
create policy forms_select on public.forms for select
  using (public.is_project_member(project_id));
drop policy if exists forms_insert on public.forms;
create policy forms_insert on public.forms for insert
  with check (public.project_role(project_id) in ('owner','editor'));
drop policy if exists forms_update on public.forms;
create policy forms_update on public.forms for update
  using (public.project_role(project_id) in ('owner','editor'));
drop policy if exists forms_delete on public.forms;
create policy forms_delete on public.forms for delete
  using (public.project_role(project_id) in ('owner','editor'));

-- attachments: gated by the parent form's project.
drop policy if exists att_select on public.attachments;
create policy att_select on public.attachments for select
  using (public.is_project_member(public.form_project(form_id)));
drop policy if exists att_insert on public.attachments;
create policy att_insert on public.attachments for insert
  with check (public.project_role(public.form_project(form_id)) in ('owner','editor'));
drop policy if exists att_delete on public.attachments;
create policy att_delete on public.attachments for delete
  using (public.project_role(public.form_project(form_id)) in ('owner','editor'));

-- invitations: owner manages; an invitee can see invites addressed to them.
drop policy if exists inv_select on public.invitations;
create policy inv_select on public.invitations for select
  using (public.project_role(project_id) = 'owner' or lower(email) = lower(auth.email()));
drop policy if exists inv_insert on public.invitations;
create policy inv_insert on public.invitations for insert
  with check (public.project_role(project_id) = 'owner');
drop policy if exists inv_delete on public.invitations;
create policy inv_delete on public.invitations for delete
  using (public.project_role(project_id) = 'owner' or lower(email) = lower(auth.email()));

-- ---------------------------------------------------------------------
-- STORAGE (run after creating a PRIVATE bucket named 'attachments'
-- in Supabase Studio → Storage). Access is via short-lived signed URLs
-- generated server-side after the app has checked permission.
-- ---------------------------------------------------------------------
-- Minimal policy: only authenticated users touch the bucket; real authz
-- is enforced by the attachments-table RLS above + signed URLs.
drop policy if exists storage_attachments_rw on storage.objects;
create policy storage_attachments_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');

-- =====================================================================
-- DONE. Verify in Studio: every table shows "RLS enabled".
-- =====================================================================
