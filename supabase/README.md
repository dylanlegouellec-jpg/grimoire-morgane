# Schéma Supabase

Les fichiers de `migrations/` documentent dans Git les changements de
schéma/politiques RLS appliqués manuellement dans le SQL Editor Supabase —
sans ça, une politique modifiée dans le dashboard ne laisse aucune trace
ni possibilité de la reproduire sur un autre projet.

**Ce dossier n'est pas (encore) une base de référence complète du schéma.**
Il ne contient que les changements documentés au fil de l'eau depuis le
22/09/2026. Pour un premier instantané complet (tables, colonnes, fonctions
RPC déjà en place comme `create_household`/`get_household_members`...),
lier le projet à la CLI Supabase et lancer :

```bash
supabase link --project-ref <ref-du-projet>
supabase db pull
```

## Convention

Un fichier par changement, nommé `AAAAMMJJHHMMSS_description.sql`
(horodatage croissant = ordre d'application). Chaque fichier explique en
commentaire le problème résolu, pas seulement le SQL — voir
`migrations/20260922160000_enable_rls_recipes_shopping_lists.sql` pour
l'exemple.
