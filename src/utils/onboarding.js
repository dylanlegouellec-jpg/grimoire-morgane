import { fetchTable, insertRow, updateRow } from "./supabase";

/* ------------------------------------------------------------------ */
/*  STATUT DU TUTORIEL GUIDÉ — synchronisation par compte, VOLONTAIREMENT */
/*  ISOLÉE de utils/profile.js plutôt qu'une colonne de plus dans son     */
/*  PROFILE_COLUMNS partagé.                                              */
/*                                                                          */
/*  Raison : `profiles.has_completed_onboarding` doit être ajoutée à la      */
/*  main dans Supabase (voir la requête SQL ci-dessous) — rien dans ce        */
/*  dépôt ne migre le schéma. Tant que cette colonne n'existe pas encore       */
/*  sur une installation donnée, PostgREST rejette TOUTE requête qui la        */
/*  mentionne dans son "select=" ou son corps. Si cette colonne avait été       */
/*  ajoutée directement à PROFILE_COLUMNS (profile.js), la moindre lecture       */
/*  de profil échouerait alors en bloc — cassant du même coup la               */
/*  synchronisation du thème, de l'appui long, du badge Nutri-Score et de       */
/*  la taille de texte, pas seulement celle du tuto. Une table/fonction        */
/*  séparée avec son propre try/catch confine le risque au tuto seul :          */
/*  tant que la colonne n'a pas été ajoutée, le statut du tutoriel ne se         */
/*  synchronise simplement pas entre appareils (le flag localStorage, voir       */
/*  utils/localSettings.js, reste seul juge SUR CET appareil) — rien d'autre      */
/*  n'est affecté.                                                                 */
/*                                                                                    */
/*  SQL à exécuter une fois, à la main, dans le project Supabase :                     */
/*    ALTER TABLE profiles ADD COLUMN has_completed_onboarding boolean DEFAULT false;    */
/* ------------------------------------------------------------------ */

export async function getOnboardingCompletedFromProfile(userId) {
  if (!userId) return null;
  try {
    const rows = await fetchTable(
      "profiles",
      `select=has_completed_onboarding&id=eq.${encodeURIComponent(userId)}`
    );
    const row = rows && rows[0];
    if (!row || row.has_completed_onboarding === null || row.has_completed_onboarding === undefined) return null;
    return Boolean(row.has_completed_onboarding);
  } catch (err) {
    // Erreur de schéma (colonne pas encore migrée) ou réseau : jamais
    // remontée à l'appelant, voir le commentaire de fichier ci-dessus.
    console.error("Lecture du statut de tutoriel impossible :", err);
    return null;
  }
}

export async function saveOnboardingCompletedToProfile(userId, value) {
  if (!userId) return;
  try {
    const existing = await fetchTable("profiles", `select=id&id=eq.${encodeURIComponent(userId)}`);
    if (existing && existing[0]) {
      await updateRow("profiles", userId, { has_completed_onboarding: value });
    } else {
      await insertRow("profiles", { id: userId, has_completed_onboarding: value });
    }
  } catch (err) {
    console.error("Sync du statut de tutoriel impossible :", err);
  }
}
