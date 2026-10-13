-- Audit sécurité du 13/10/2026 : une demande pour rejoindre un foyer
-- (request_join_household, statut 'pending') donnait déjà TOUS les droits.
-- Les règles d'accès vérifiaient seulement « figure dans household_members »,
-- jamais « demande acceptée ». Vérifié sur la base (test annulé) : un membre
-- en attente voyait les 25 recettes du foyer et pouvait retirer l'admin.
--
-- Appliqué sur le projet Supabase le 13/10/2026 (migrations
-- household_ids_approved_only, household_access_approved_only_policies et
-- recipe_images_household_only). Les règles existantes sont MODIFIÉES
-- (alter policy) plutôt que supprimées puis recréées : même effet, noms
-- inchangés. Vérifié ensuite (test annulé) : un membre en attente ne voit
-- plus aucune recette, ni le foyer, ni ses membres, ni app_state, et ne peut
-- ni modifier une recette ni s'ajouter comme admin ; un membre approuvé
-- garde un accès normal.

-- 1. Foyers de l'utilisateur connecté : membres APPROUVÉS uniquement.
--    Toutes les règles ci-dessous passent par cette fonction.
create or replace function public.get_my_household_ids()
returns setof uuid language sql stable security definer set search_path to 'public'
as $$
  select household_id from public.household_members
  where user_id = auth.uid() and status = 'approved';
$$;

create or replace function public.get_or_create_my_household()
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id from household_members
  where user_id = auth.uid() and status = 'approved' limit 1;
  if v_household_id is null then
    insert into households default values returning id into v_household_id;
    insert into household_members (user_id, household_id, role, status)
      values (auth.uid(), v_household_id, 'admin', 'approved');
  end if;
  return v_household_id;
end;
$$;

-- 2. Recettes, listes de courses, app_state (garde-manger, planning).
alter policy "recipes_select_household" on public.recipes using (household_id in (select public.get_my_household_ids()));
alter policy "recipes_insert_household" on public.recipes with check (household_id in (select public.get_my_household_ids()));
alter policy "recipes_update_household" on public.recipes using (household_id in (select public.get_my_household_ids())) with check (household_id in (select public.get_my_household_ids()));
alter policy "recipes_delete_household" on public.recipes using (household_id in (select public.get_my_household_ids()));

alter policy "shopping_lists_select_household" on public.shopping_lists using (household_id in (select public.get_my_household_ids()));
alter policy "shopping_lists_insert_household" on public.shopping_lists with check (household_id in (select public.get_my_household_ids()));
alter policy "shopping_lists_update_household" on public.shopping_lists using (household_id in (select public.get_my_household_ids())) with check (household_id in (select public.get_my_household_ids()));
alter policy "shopping_lists_delete_household" on public.shopping_lists using (household_id in (select public.get_my_household_ids()));

alter policy "app_state_select_household" on public.app_state using (household_id in (select public.get_my_household_ids()));
alter policy "app_state_insert_household" on public.app_state with check (household_id in (select public.get_my_household_ids()));
alter policy "app_state_update_household" on public.app_state using (household_id in (select public.get_my_household_ids())) with check (household_id in (select public.get_my_household_ids()));

-- 3. household_members : plus d'ajout direct (tout passe par les fonctions
--    RPC, qui vérifient déjà les droits), et on ne peut retirer que SA ligne.
alter policy "RLS_Insert_Members" on public.household_members with check (false);
alter policy "RLS_Delete_Members" on public.household_members using (user_id = (select auth.uid()));

-- 4. households : suppression uniquement via delete_household (admins) ;
--    renommer reste possible pour un membre approuvé.
alter policy "RLS_Delete_Households" on public.households using (false);
alter policy "RLS_Update_Households" on public.households using (id in (select public.get_my_household_ids())) with check (id in (select public.get_my_household_ids()));

-- 5. Photos de recettes : dépôt et suppression limités au dossier d'un foyer
--    dont on est membre approuvé ; 5 Mo maximum, images uniquement.
alter policy "recipe_images_authenticated_insert" on storage.objects with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] in (select public.get_my_household_ids()::text)
);
alter policy "recipe_images_household_delete" on storage.objects using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] in (select public.get_my_household_ids()::text)
);
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('recipe-images', 'avatars');

-- 6. Sans session (visiteur non connecté, session expirée) : les règles
--    ci-dessus appellent get_my_household_ids(), qui doit donc rester
--    exécutable par « anon » — elle ne lui renvoie rien (auth.uid() est vide),
--    et les lectures répondent « aucune ligne » au lieu d'une erreur 401.
--    (Migration household_ids_anon_execute.)
grant execute on function public.get_my_household_ids() to anon;
