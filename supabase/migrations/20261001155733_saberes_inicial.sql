create table public.usuarios (
  id text primary key default 'u-' || substr(md5(random()::text), 1, 10),
  nombre text not null,
  comuna text not null default '',
  edad int,
  intereses text[] not null default '{}',
  saberes text[] not null default '{}',
  palabra_clave text not null,
  telefono text not null default '',
  ensenados int not null default 0,
  creado_en timestamptz not null default now()
);

create table public.guias (
  id text primary key default 'g-' || substr(md5(random()::text), 1, 10),
  titulo text not null,
  categoria text not null default 'hogar'
    check (categoria in ('cocina','oficios','huerto','hogar','digital','historias')),
  autor text not null,
  autor_id text references public.usuarios(id) on delete set null,
  edad int,
  comuna text not null default '',
  foto text,
  materiales text[] not null default '{}',
  pasos text[] not null,
  ayudas text[] not null default '{}',
  consejos text[] not null default '{}',
  advertencias text[] not null default '{}',
  claves text[] not null default '{}',
  riesgo text not null default 'bajo' check (riesgo in ('bajo','alto')),
  estado text not null default 'publicada' check (estado in ('publicada','en revisión')),
  aprendieron int not null default 0,
  resumen_voz text not null default '',
  relato text,
  creado_en timestamptz not null default now()
);

create index guias_autor_idx on public.guias (autor_id);
create index guias_creado_idx on public.guias (creado_en desc);

-- Solo la Edge Function (service role) entra: sin políticas, anon no ve nada,
-- así las palabras clave nunca llegan al navegador por la API pública.
alter table public.usuarios enable row level security;
alter table public.guias enable row level security;

-- "¡Aprendí!": suma de forma atómica y devuelve el nuevo total
create function public.sumar_aprendieron(guia_id text)
returns int language sql security invoker set search_path = '' as $$
  update public.guias set aprendieron = aprendieron + 1 where id = guia_id returning aprendieron;
$$;
revoke execute on function public.sumar_aprendieron(text) from public, anon, authenticated;
