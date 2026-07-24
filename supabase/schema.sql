-- Project-Check-Site Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  orientation text not null default 'vertical' check (orientation in ('vertical', 'horizontal')),
  client_id text
);

create table if not exists flow_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('start', 'task', 'end')),
  title text not null default '',
  position jsonb not null default '{"x":0,"y":0}',
  created_at timestamptz not null default now(),
  completed boolean not null default false,
  completed_at timestamptz,
  client_id text
);

create table if not exists flow_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source uuid not null references flow_nodes(id) on delete cascade,
  target uuid not null references flow_nodes(id) on delete cascade,
  branch_side text check (branch_side in ('left', 'right')),
  client_id text
);

create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references flow_nodes(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  text text not null,
  author text,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz,
  client_id text
);

create table if not exists memo_replies (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references memos(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  text text not null,
  author text,
  created_at timestamptz not null default now(),
  client_id text
);

alter table projects replica identity full;
alter table flow_nodes replica identity full;
alter table flow_edges replica identity full;
alter table memos replica identity full;
alter table memo_replies replica identity full;

alter table projects enable row level security;
alter table flow_nodes enable row level security;
alter table flow_edges enable row level security;
alter table memos enable row level security;
alter table memo_replies enable row level security;

-- No login for this internal tool: anyone with the anon key can read/write everything.
create policy "public full access" on projects for all using (true) with check (true);
create policy "public full access" on flow_nodes for all using (true) with check (true);
create policy "public full access" on flow_edges for all using (true) with check (true);
create policy "public full access" on memos for all using (true) with check (true);
create policy "public full access" on memo_replies for all using (true) with check (true);

alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table flow_nodes;
alter publication supabase_realtime add table flow_edges;
alter publication supabase_realtime add table memos;
alter publication supabase_realtime add table memo_replies;
