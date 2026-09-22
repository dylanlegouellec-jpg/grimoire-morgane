import { fetchTable, insertRow, updateRow } from "./supabase";
import { getSupabaseClient } from "./supabaseClient";
import { compressImageToBlob } from "./imageUpload";

/* ------------------------------------------------------------------ */
/*  PROFIL UTILISATEUR — identité + préférences (Apparence/Accessibilité) */
/*  Table `profiles` (voir le script SQL fourni avec cette évolution).    */
/*  Passe par utils/supabase.js (fetchTable/insertRow/updateRow) plutôt   */
/*  que par le SDK directement : mêmes garanties que le reste de l'app    */
/*  (timeout 6s, mise en file hors-ligne si le réseau manque au moment     */
/*  d'un changement).                                                      */
/*                                                                          */
/*  Contrairement aux données du foyer (recettes, courses...), le profil   */
/*  et ses préférences sont propres À L'UTILISATEUR — jamais partagés      */
/*  entre les membres d'un même foyer.                                     */
/* ------------------------------------------------------------------ */

export const AVATAR_BUCKET = "avatars";
const PROFILE_COLUMNS =
  "id,display_name,avatar_url,first_name,last_name,username,birth_date,theme,press_duration,show_nutriscore,text_size,hero_treatment,icon_style";

// Ligne `profiles` telle qu'elle revient de Supabase (PROFILE_COLUMNS
// ci-dessus) — pas encore un type partagé plus largement dans le code
// (voir le même choix pour Recipe/MealPlanEntry, toujours absents).
export type ProfileRow = Record<string, unknown>;

// `press_duration` est stocké en base sous forme de texte lisible
// ("0.75s"), pendant que le reste de l'app raisonne en millisecondes
// (500/750/1000, voir components/common/pressDuration.js) — conversion
// isolée ici, au plus près de la colonne qu'elle concerne.
const PRESS_DURATION_DB_BY_MS: Record<number, string> = { 500: "0.5s", 750: "0.75s", 1000: "1s" };
const MS_BY_PRESS_DURATION_DB: Record<string, number> = { "0.5s": 500, "0.75s": 750, "1s": 1000 };

export function pressDurationToDb(ms: number): string {
  return PRESS_DURATION_DB_BY_MS[ms] || "0.75s";
}
export function pressDurationFromDb(value: string): number {
  return MS_BY_PRESS_DURATION_DB[value] || 750;
}

/* --- Repli hors-ligne : dernier profil connu, en localStorage --------- */
const PROFILE_CACHE_KEY = "grimoire_profile_cache";

export function getCachedProfile(): ProfileRow | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: ProfileRow): void {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* pas grave : juste un cache */
  }
}

export async function getProfile(userId: string | null | undefined): Promise<ProfileRow | null> {
  if (!userId) return null;
  try {
    const rows = await fetchTable("profiles", `select=${PROFILE_COLUMNS}&id=eq.${encodeURIComponent(userId)}`);
    const profile = (rows && rows[0]) || null;
    if (profile) setCachedProfile(profile);
    return profile;
  } catch (err) {
    console.error("Profil injoignable :", err);
    return null;
  }
}

// Upsert manuel (existe ? update : insert) plutôt qu'un vrai upsert
// PostgREST : ça nous permet de rester sur les mêmes petites fonctions
// insertRow/updateRow déjà utilisées partout ailleurs (recettes, listes de
// courses...), avec leur repli file hors-ligne intégré.
export interface SaveProfileOptions {
  displayName?: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  birthDate?: string;
  theme?: string;
  pressDuration?: number;
  showNutriscore?: boolean;
  textSize?: string;
  heroTreatment?: string;
  iconStyle?: string;
}

export async function saveProfile(userId: string, {
  displayName,
  avatarUrl,
  firstName,
  lastName,
  username,
  birthDate,
  theme,
  pressDuration,
  showNutriscore,
  textSize,
  heroTreatment,
  iconStyle,
}: SaveProfileOptions = {}) {
  const patch: Record<string, unknown> = {};
  if (displayName !== undefined) patch.display_name = displayName;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
  if (firstName !== undefined) patch.first_name = firstName;
  if (lastName !== undefined) patch.last_name = lastName;
  if (username !== undefined) patch.username = username;
  // "" (champ vidé dans le formulaire) doit effacer la date en base, pas y
  // écrire une chaîne vide — une colonne `date` PostgreSQL n'accepte que
  // NULL ou une vraie date.
  if (birthDate !== undefined) patch.birth_date = birthDate || null;
  if (theme !== undefined) patch.theme = theme;
  if (pressDuration !== undefined) patch.press_duration = pressDurationToDb(pressDuration);
  if (showNutriscore !== undefined) patch.show_nutriscore = showNutriscore;
  if (textSize !== undefined) patch.text_size = textSize;
  if (heroTreatment !== undefined) patch.hero_treatment = heroTreatment;
  if (iconStyle !== undefined) patch.icon_style = iconStyle;
  if (!Object.keys(patch).length) return;

  // Le surnom affiché aux autres membres du foyer (liste "Membres", voir
  // HouseholdManagerModal) lit toujours `display_name` — on le garde donc
  // renseigné automatiquement à partir du nouveau surnom/prénom+nom saisi
  // dans le formulaire de profil, sans que l'appelant ait à s'en soucier.
  if (patch.display_name === undefined && (username !== undefined || firstName !== undefined || lastName !== undefined)) {
    const fallback = username || [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fallback) patch.display_name = fallback;
  }

  const existing = await getProfile(userId);
  let saved;
  if (existing) {
    saved = await updateRow("profiles", userId, patch);
  } else {
    saved = await insertRow("profiles", { id: userId, ...patch });
  }
  setCachedProfile({ ...(existing || {}), ...patch, id: userId });
  return saved;
}

// Compresse (voir utils/imageUpload.js — même pipeline que les photos de
// recettes, juste une résolution plus petite pour un avatar) puis envoie
// vers le bucket `avatars`, toujours au même chemin par utilisateur
// (upsert: true) pour ne jamais accumuler d'anciens avatars orphelins.
export async function uploadAvatar(file: File, userId: string | null | undefined): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré — upload d'avatar impossible.");
  if (!userId) throw new Error("Utilisateur inconnu.");

  const { blob, mimeType, extension } = await compressImageToBlob(file, { maxWidth: 400, quality: 0.85 });
  const path = `${userId}/avatar.${extension}`;

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error("URL publique introuvable après upload.");
  // Petit cache-bust : le chemin est réutilisé à chaque nouvel avatar
  // (upsert), donc sans ce paramètre le navigateur/service worker
  // pourrait continuer d'afficher l'ancienne image depuis son cache.
  return `${data.publicUrl}?v=${Date.now()}`;
}
