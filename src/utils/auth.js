import { getSupabaseClient } from "./supabaseClient";
import { fetchTable, updateRow } from "./supabase";

/* ------------------------------------------------------------------ */
/*  AUTHENTIFICATION (Google OAuth via Supabase Auth) + FOYERS         */
/* ------------------------------------------------------------------ */

const RPC_TIMEOUT_MS = 6000;

// Les appels RPC passent par le SDK Supabase (pas par utils/supabase.js,
// réservé aux tables REST classiques) — on leur applique le même budget
// de temps que le reste de l'app pour ne jamais rester bloqué en
// attente d'un réseau qui ne répond pas (cf. la resynchro de
// utils/supabase.js).
function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Ramène l'utilisateur exactement là où il était après le
      // redirect Google, plutôt qu'à la racine du site.
      redirectTo: window.location.href,
    },
  });
  if (error) throw error;
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data && data.session;
}

/* ------------------------------------------------------------------ */
/*  FOYERS — liste, création, renommage, membres                       */
/* ------------------------------------------------------------------ */

// Tous les foyers dont l'utilisateur connecté est membre (id + nom).
// Passe par fetchTable (utils/supabase.js) plutôt que par le SDK
// directement : on récupère gratuitement le timeout de 6s et la
// détection hors-ligne déjà en place pour le reste de l'app. RLS
// (policy households_select_members) filtre déjà côté serveur — pas
// besoin de repasser par la RPC my_household_ids ici.
export async function getMyHouseholds() {
  try {
    const rows = await fetchTable("households", "select=id,name&order=name.asc");
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("Impossible de récupérer la liste des foyers :", err);
    return [];
  }
}

// Crée un nouveau foyer et y ajoute l'utilisateur courant comme membre,
// de façon atomique (voir la fonction SQL create_household — un seul
// aller-retour réseau, pas de risque d'avoir un foyer créé sans membre
// si la deuxième requête échouait en plein milieu).
export async function createHousehold(name) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { data, error } = await withTimeout(
    client.rpc("create_household", { p_name: name }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors de la création du foyer."
  );
  if (error) throw error;
  return data; // uuid du nouveau foyer
}

// Renomme un foyer existant — passe par updateRow (utils/supabase.js),
// donc bénéficie aussi de la mise en file hors-ligne si le réseau
// manque au moment du clic.
export async function renameHousehold(householdId, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Le nom du foyer ne peut pas être vide.");
  return updateRow("households", householdId, { name: trimmed });
}

// Supprime un foyer et tout ce qui lui appartient (recettes, listes de
// courses, app_state, appartenances) — voir la fonction SQL
// delete_household : elle vérifie l'appartenance de l'appelant et
// refuse si c'est son unique foyer, plutôt que de le laisser sans aucun
// foyer actif.
export async function deleteHousehold(householdId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await withTimeout(
    client.rpc("delete_household", { p_household_id: householdId }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors de la suppression du foyer."
  );
  if (error) throw error;
}

// Liste des membres (e-mail) du foyer donné — voir la fonction SQL
// get_household_members : elle vérifie elle-même que l'appelant fait
// partie de ce foyer avant de renvoyer quoi que ce soit.
export async function getHouseholdMembers(householdId) {
  const client = getSupabaseClient();
  if (!client || !householdId) return [];
  try {
    const { data, error } = await withTimeout(
      client.rpc("get_household_members", { p_household_id: householdId }),
      RPC_TIMEOUT_MS,
      "Délai dépassé lors du chargement des membres."
    );
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Impossible de récupérer les membres du foyer :", err);
    return [];
  }
}

// Ajoute un membre par e-mail (doit déjà s'être connecté une fois à
// l'appli — voir le message d'erreur renvoyé par la RPC côté SQL).
export async function addUserToHousehold(email, householdId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await withTimeout(
    client.rpc("add_user_to_household", { user_email: email, target_household_id: householdId }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors de l'ajout du membre."
  );
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  DEMANDES D'ADHÉSION — foyer "pending" avant validation par un admin  */
/*  (voir la refonte SQL : household_members.role/status, fonctions      */
/*  RPC request_join_household / get_pending_requests /                  */
/*  approve_household_member / reject_household_member).                 */
/* ------------------------------------------------------------------ */

// Dépose une demande d'adhésion à un foyer (statut "pending" — ne donne
// PAS accès aux données du foyer tant qu'un admin n'a pas validé, voir
// approveHouseholdMember ci-dessous).
export async function requestJoinHousehold(householdId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await withTimeout(
    client.rpc("request_join_household", { p_household_id: householdId }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors de la demande d'adhésion."
  );
  if (error) throw error;
}

// Demandes en attente pour un foyer donné — réservé aux admins (la RPC
// vérifie elle-même le rôle de l'appelant et refuse sinon).
export async function getPendingHouseholdRequests(householdId) {
  const client = getSupabaseClient();
  if (!client || !householdId) return [];
  try {
    const { data, error } = await withTimeout(
      client.rpc("get_pending_requests", { p_household_id: householdId }),
      RPC_TIMEOUT_MS,
      "Délai dépassé lors du chargement des demandes."
    );
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Impossible de récupérer les demandes en attente :", err);
    return [];
  }
}

export async function approveHouseholdMember(householdId, userId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await withTimeout(
    client.rpc("approve_household_member", { p_household_id: householdId, p_user_id: userId }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors de la validation du membre."
  );
  if (error) throw error;
}

export async function rejectHouseholdMember(householdId, userId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré");
  const { error } = await withTimeout(
    client.rpc("reject_household_member", { p_household_id: householdId, p_user_id: userId }),
    RPC_TIMEOUT_MS,
    "Délai dépassé lors du refus du membre."
  );
  if (error) throw error;
}
