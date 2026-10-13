-- Listes de courses : modifications article par article.
--
-- Avant, chaque coche, ajout ou suppression renvoyait TOUTE la liste
-- (colonne items, en JSON) : deux personnes qui faisaient les courses en même
-- temps, ou deux coches rapides sur un réseau lent, s'écrasaient et des cases
-- cochées disparaissaient. L'app envoie désormais seulement les modifications
-- (voir src/utils/shoppingOps.ts), appliquées ici sur la version du serveur,
-- ligne verrouillée le temps de l'opération.
--
-- Opérations (toutes rejouables sans effet de bord) :
--   add / append  {op, item}        ajoute en tête / en fin si l'id n'existe pas déjà
--   remove        {op, id}          retire l'article
--   patch         {op, id, fields}  remplace des champs de l'article (checked, qty, unit...)
--   clear         {op}              vide la liste
-- Renvoie la liste à jour, ou null si elle n'existe pas (ou n'est pas accessible).
--
-- SECURITY INVOKER : les règles d'accès (RLS) de shopping_lists s'appliquent
-- normalement — on ne peut modifier que les listes de ses foyers.
-- Appliqué sur le projet Supabase le 13/10/2026 (migration shopping_list_item_ops).

create or replace function public.shopping_list_apply(p_list_id text, p_ops jsonb)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_items jsonb;
  v_op jsonb;
  v_kind text;
begin
  select items into v_items from public.shopping_lists where id = p_list_id for update;
  if not found then
    return null;
  end if;
  v_items := coalesce(v_items, '[]'::jsonb);

  for v_op in select value from jsonb_array_elements(coalesce(p_ops, '[]'::jsonb)) loop
    v_kind := v_op->>'op';
    if v_kind in ('add', 'append') then
      if not exists (select 1 from jsonb_array_elements(v_items) e where e->>'id' = v_op->'item'->>'id') then
        if v_kind = 'add' then
          v_items := jsonb_build_array(v_op->'item') || v_items;
        else
          v_items := v_items || jsonb_build_array(v_op->'item');
        end if;
      end if;
    elsif v_kind = 'remove' then
      select coalesce(jsonb_agg(t.e order by t.i), '[]'::jsonb) into v_items
      from jsonb_array_elements(v_items) with ordinality as t(e, i)
      where t.e->>'id' is distinct from v_op->>'id';
    elsif v_kind = 'patch' then
      select coalesce(jsonb_agg(case when t.e->>'id' = v_op->>'id' then t.e || coalesce(v_op->'fields', '{}'::jsonb) else t.e end order by t.i), '[]'::jsonb)
        into v_items
      from jsonb_array_elements(v_items) with ordinality as t(e, i);
    elsif v_kind = 'clear' then
      v_items := '[]'::jsonb;
    end if;
  end loop;

  update public.shopping_lists set items = v_items where id = p_list_id;
  return v_items;
end;
$$;

revoke execute on function public.shopping_list_apply(text, jsonb) from public, anon;
grant execute on function public.shopping_list_apply(text, jsonb) to authenticated;
