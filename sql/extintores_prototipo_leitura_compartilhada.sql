-- PROTÓTIPO: permite leitura das rondas por clientes com chave pública.
-- NÃO utilizar esta política em produção: dados de todas as empresas ficam consultáveis.
drop policy if exists "extintores_prototipo_leitura" on public.checklist_extintores_rondas;
create policy "extintores_prototipo_leitura"
on public.checklist_extintores_rondas for select
to anon, authenticated
using (true);
grant select on public.checklist_extintores_rondas to anon, authenticated;
-- Inserção e atualização continuam limitadas ao criador pelas políticas existentes.
