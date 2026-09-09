create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists worlds_set_updated_at on public.worlds;
create trigger worlds_set_updated_at
before update on public.worlds
for each row execute function public.set_updated_at();
