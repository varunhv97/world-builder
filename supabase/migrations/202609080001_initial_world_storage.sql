-- Account-owned metadata. All browser access is mediated by these RLS policies.
create table if not exists public.worlds (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  checkpoint_path text not null,
  current_sequence bigint not null default 0 check (current_sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worldlog_records (
  world_id uuid not null references public.worlds(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  base_checkpoint_sequence bigint not null check (base_checkpoint_sequence >= 0),
  transaction_id uuid not null,
  forward_delta jsonb not null,
  created_at timestamptz not null default now(),
  primary key (world_id, sequence),
  unique (world_id, transaction_id)
);

alter table public.worlds enable row level security;
alter table public.worldlog_records enable row level security;

create policy "owners manage their worlds" on public.worlds for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage their worldlog records" on public.worldlog_records for all using (exists (select 1 from public.worlds where worlds.id = worldlog_records.world_id and worlds.owner_id = auth.uid())) with check (exists (select 1 from public.worlds where worlds.id = worldlog_records.world_id and worlds.owner_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('loka-checkpoints', 'loka-checkpoints', false) on conflict (id) do nothing;
create policy "owners read their checkpoints" on storage.objects for select using (bucket_id = 'loka-checkpoints' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners write their checkpoints" on storage.objects for insert with check (bucket_id = 'loka-checkpoints' and (storage.foldername(name))[1] = auth.uid()::text);
