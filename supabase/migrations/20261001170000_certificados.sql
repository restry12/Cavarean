-- Certificados emitidos al completar una guía/curso.
-- La clave de propietario hace que una misma persona reciba un solo
-- certificado por curso, incluso si toca el botón más de una vez.
create table public.certificados (
  id text primary key default 'c-' || substr(md5(random()::text), 1, 12),
  codigo text not null unique default 'SAB-' || upper(substr(md5(random()::text), 1, 8)),
  guia_id text references public.guias(id) on delete set null,
  usuario_id text references public.usuarios(id) on delete set null,
  propietario_clave text not null,
  aprendiz text not null,
  curso_titulo text not null,
  autor text not null,
  emitido_en timestamptz not null default now(),
  unique (guia_id, propietario_clave)
);

create index certificados_propietario_idx
  on public.certificados (propietario_clave, emitido_en desc);
create index certificados_usuario_idx
  on public.certificados (usuario_id, emitido_en desc);

alter table public.certificados enable row level security;

-- Incluye los certificados en el reinicio del prototipo.
create or replace function public.reiniciar_demo()
returns void language sql security invoker set search_path = '' as $$
  delete from public.certificados;
  delete from public.guias where id not in ('g-videollamada','g-estafa','g-pan-amasado','g-tomates','g-boton');
  delete from public.usuarios where id not in ('u-rosa','u-equipo','u-luis','u-carmen');
  update public.guias g set aprendieron = v.n
    from (values ('g-videollamada',58),('g-estafa',41),('g-pan-amasado',34),('g-tomates',21),('g-boton',12)) v(id, n)
    where g.id = v.id;
  update public.usuarios set ensenados = 1;
$$;
revoke execute on function public.reiniciar_demo() from public, anon, authenticated;
