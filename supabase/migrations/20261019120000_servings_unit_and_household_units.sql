-- Appliqué sur le projet Supabase le 19/10/2026 (migration
-- recipe_servings_unit_and_household_units). Colonnes ajoutées, toutes deux
-- facultatives : les anciennes versions de l'app les ignorent sans souci.

-- Unité des portions d'une recette : null = « personnes » (comportement
-- d'avant), sinon un libellé libre (ex. « cookies », « parts », « pots »).
alter table public.recipes add column if not exists servings_unit text;

-- Unités d'ingrédients propres au foyer (Réglages > Unités des ingrédients) :
-- null = liste par défaut. Forme : { "custom": ["sachet", …], "hidden": ["cl", …] }.
alter table public.app_state add column if not exists units jsonb;
