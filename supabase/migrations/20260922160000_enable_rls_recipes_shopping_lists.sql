-- Audit architecture/sécurité (point 2) : `recipes` et `shopping_lists`
-- n'avaient AUCUNE politique RLS, contrairement à `app_state`,
-- `households`, `household_members` et `profiles` — n'importe quel compte
-- authentifié pouvait lire/modifier les recettes et listes de courses de
-- TOUS les foyers, pas seulement les siennes.
--
-- Policy calquée à l'identique sur celle déjà en place sur `app_state`
-- (voir "Gestion app_state par foyer" dans le dashboard Supabase) : accès
-- borné aux foyers dont l'utilisateur connecté est membre, via la table
-- `household_members`. Les deux tables reçoivent déjà `household_id` à
-- chaque écriture côté client (voir mapRecipeToRow/mapShoppingListToRow,
-- src/utils/supabase.js) — cette policy ne change donc rien pour un membre
-- légitime du foyer, elle bloque seulement l'accès depuis l'extérieur.
--
-- Exécuté manuellement dans le SQL Editor Supabase le 22/09/2026 — ce
-- fichier documente le changement dans Git, il n'a pas été appliqué via
-- `supabase db push`. Ce n'est PAS un instantané complet du schéma
-- (tables, colonnes, fonctions RPC déjà en place ne sont pas capturées
-- ici) : un premier `supabase db pull` sur un projet lié donnerait une
-- base de référence complète pour la suite.

alter table recipes enable row level security;
alter table shopping_lists enable row level security;

create policy "Gestion recipes par foyer"
on recipes
for all
using (household_id in (select household_members.household_id from household_members where household_members.user_id = auth.uid()))
with check (household_id in (select household_members.household_id from household_members where household_members.user_id = auth.uid()));

create policy "Gestion shopping_lists par foyer"
on shopping_lists
for all
using (household_id in (select household_members.household_id from household_members where household_members.user_id = auth.uid()))
with check (household_id in (select household_members.household_id from household_members where household_members.user_id = auth.uid()));
