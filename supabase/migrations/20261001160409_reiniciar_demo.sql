-- Deja la demo como al principio: borra lo creado y restaura los contadores.
-- No se expone en la API: se corre desde el SQL editor o el MCP.
create function public.reiniciar_demo()
returns void language sql security invoker set search_path = '' as $$
  delete from public.guias where id not in ('g-videollamada','g-estafa','g-pan-amasado','g-tomates','g-boton');
  delete from public.usuarios where id not in ('u-rosa','u-equipo','u-luis','u-carmen');
  update public.guias g set aprendieron = v.n
    from (values ('g-videollamada',58),('g-estafa',41),('g-pan-amasado',34),('g-tomates',21),('g-boton',12)) v(id, n)
    where g.id = v.id;
  update public.usuarios set ensenados = 1;
$$;
revoke execute on function public.reiniciar_demo() from public, anon, authenticated;
