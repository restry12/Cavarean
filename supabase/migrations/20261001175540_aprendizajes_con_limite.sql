-- "¡Aprendí!" cuenta una vez por persona (origen = IP, guardada como hash) y guía
-- cada 10 minutos. Evita inflar el contador y disparar WhatsApp en los hitos.
create table public.aprendizajes (
  guia_id text not null references public.guias(id) on delete cascade,
  origen text not null,
  creado_en timestamptz not null default now()
);
create index aprendizajes_reciente_idx on public.aprendizajes (guia_id, origen, creado_en desc);
alter table public.aprendizajes enable row level security;

create function public.contar_aprendizaje(p_guia text, p_origen text)
returns table (total int, sumado boolean)
language plpgsql security invoker set search_path = '' as $$
declare
  h text := md5(coalesce(p_origen, ''));
begin
  if not exists (select 1 from public.guias g where g.id = p_guia) then
    return;
  end if;
  -- Dos toques al mismo tiempo no cuentan doble
  perform pg_advisory_xact_lock(hashtext(p_guia || ':' || h));
  if exists (select 1 from public.aprendizajes a
             where a.guia_id = p_guia and a.origen = h and a.creado_en > now() - interval '10 minutes') then
    return query select g.aprendieron, false from public.guias g where g.id = p_guia;
    return;
  end if;
  insert into public.aprendizajes (guia_id, origen) values (p_guia, h);
  return query update public.guias g set aprendieron = g.aprendieron + 1
    where g.id = p_guia returning g.aprendieron, true;
end;
$$;
revoke execute on function public.contar_aprendizaje(text, text) from public, anon, authenticated;
