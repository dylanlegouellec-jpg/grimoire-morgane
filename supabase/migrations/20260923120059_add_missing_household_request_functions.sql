-- Le client (src/utils/auth.ts) appelle depuis longtemps 5 fonctions RPC
-- pour le workflow "demandes d'adhésion à un foyer" : get_pending_requests,
-- approve_household_member, reject_household_member,
-- change_household_member_role, remove_household_member. Aucune des 5
-- n'existait réellement en base (PGRST202 "Could not find the function
-- public.get_pending_requests" en usage réel) — seule request_join_household
-- (déposer une demande) avait été créée. Résultat : un utilisateur pouvait
-- demander à rejoindre un foyer, mais aucun admin ne pouvait jamais voir la
-- demande ni l'accepter/refuser, et la gestion des rôles/retrait de membre
-- était également cassée depuis le début.
--
-- Écrites en reprenant à l'identique les conventions déjà en place
-- (SECURITY DEFINER, search_path figé sur 'public', vérification
-- "appelant = membre approuvé" comme dans add_user_to_household, ici
-- étendue à "et admin" puisque ces 5 actions sont réservées aux admins —
-- voir les commentaires déjà présents dans auth.ts au-dessus de chaque
-- fonction correspondante, qui décrivaient ce comportement avant même que
-- le SQL existe).
--
-- Exécuté manuellement dans le SQL Editor Supabase le 23/09/2026 — comme
-- pour la migration RLS du 22/09, ce fichier documente le changement dans
-- Git, il n'a pas été appliqué via `supabase db push`.

create or replace function public.get_pending_requests(p_household_id uuid)
returns table(id uuid, user_id uuid, display_name text, email text, role text, status text, avatar_url text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and status = 'approved' and role = 'admin'
  ) then
    raise exception 'Réservé aux admins de ce foyer.';
  end if;

  return query
  select
    hm.user_id as id,
    hm.user_id,
    coalesce(p.display_name, p.first_name, u.email) as display_name,
    u.email::text,
    coalesce(hm.role, 'member') as role,
    hm.status,
    p.avatar_url
  from public.household_members hm
  join auth.users u on u.id = hm.user_id
  left join public.profiles p on p.id = hm.user_id
  where hm.household_id = p_household_id
    and hm.status = 'pending';
end;
$function$;

create or replace function public.approve_household_member(p_household_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and status = 'approved' and role = 'admin'
  ) then
    raise exception 'Réservé aux admins de ce foyer.';
  end if;

  update household_members
  set status = 'approved'
  where household_id = p_household_id and user_id = p_user_id and status = 'pending';
end;
$function$;

create or replace function public.reject_household_member(p_household_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and status = 'approved' and role = 'admin'
  ) then
    raise exception 'Réservé aux admins de ce foyer.';
  end if;

  -- Supprime la ligne plutôt que de marquer un statut "rejected" (qui
  -- n'existe nulle part ailleurs dans le modèle) : la personne peut
  -- redéposer une demande plus tard via request_join_household sans
  -- entrer en conflit avec une ligne laissée derrière elle.
  delete from household_members
  where household_id = p_household_id and user_id = p_user_id and status = 'pending';
end;
$function$;

create or replace function public.change_household_member_role(p_household_id uuid, p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and status = 'approved' and role = 'admin'
  ) then
    raise exception 'Réservé aux admins de ce foyer.';
  end if;

  if p_new_role not in ('admin', 'member') then
    raise exception 'Rôle invalide.';
  end if;

  if p_new_role = 'member'
    and exists (select 1 from household_members where household_id = p_household_id and user_id = p_user_id and role = 'admin')
    and (select count(*) from household_members where household_id = p_household_id and role = 'admin' and status = 'approved') <= 1
  then
    raise exception 'Impossible de rétrograder le dernier admin du foyer.';
  end if;

  update household_members
  set role = p_new_role
  where household_id = p_household_id and user_id = p_user_id;
end;
$function$;

create or replace function public.remove_household_member(p_household_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and status = 'approved' and role = 'admin'
  ) then
    raise exception 'Réservé aux admins de ce foyer.';
  end if;

  if exists (select 1 from household_members where household_id = p_household_id and user_id = p_user_id and role = 'admin')
    and (select count(*) from household_members where household_id = p_household_id and role = 'admin' and status = 'approved') <= 1
  then
    raise exception 'Impossible de retirer le dernier admin du foyer.';
  end if;

  delete from household_members
  where household_id = p_household_id and user_id = p_user_id;
end;
$function$;
