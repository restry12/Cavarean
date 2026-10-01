-- Cursos creados por WhatsApp o subiendo un audio/video:
-- media = { tipo: "audio"|"video", url }, transcripcion = lo que dijo (Voxtral),
-- origen = "whatsapp" | "subida" | null (grabado en la web),
-- telefono = a quién avisarle los "gracias" si no tiene cuenta (nunca se manda al navegador).
alter table public.guias
  add column if not exists media jsonb,
  add column if not exists transcripcion text,
  add column if not exists origen text,
  add column if not exists telefono text not null default '';
