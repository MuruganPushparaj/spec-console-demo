-- Status validation workspace — one jsonb blob per project (same shape as localStorage M object)

create table if not exists public.status_workspaces (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade unique,
  content     jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

alter table public.status_workspaces enable row level security;

create policy "status: members can read"
  on public.status_workspaces for select
  using (public.is_project_member(project_id));

create policy "status: editors can insert"
  on public.status_workspaces for insert
  with check (public.project_role(project_id) in ('owner', 'editor'));

create policy "status: editors can update"
  on public.status_workspaces for update
  using (public.project_role(project_id) in ('owner', 'editor'));

create policy "status: owners can delete"
  on public.status_workspaces for delete
  using (public.project_role(project_id) = 'owner');

-- Atomic save with optimistic concurrency (mirrors save_form)
create or replace function public.save_status_workspace(
  p_project_id uuid,
  p_content jsonb,
  p_expected_version integer
) returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if public.project_role(p_project_id) not in ('owner', 'editor') then
    raise exception 'forbidden';
  end if;

  update public.status_workspaces
     set content = p_content,
         version = version + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where project_id = p_project_id and version = p_expected_version
  returning version into v;

  if v is null then
    raise exception 'version_conflict';
  end if;
  return v;
end; $$;
