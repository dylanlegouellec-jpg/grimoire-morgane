import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../utils/supabaseClient";
import {
  signInWithGoogle,
  signOutUser,
  getMyHouseholds,
  createHousehold as createHouseholdApi,
  renameHousehold as renameHouseholdApi,
  deleteHousehold as deleteHouseholdApi,
} from "../utils/auth";
import { loadLocalCache } from "../utils/localCache";
import { getCachedHouseholds, setCachedHouseholds } from "../utils/householdCache";

function getStoredActiveHouseholdId() {
  // Écrit en continu par useOfflineSync (à chaque sauvegarde du cache
  // local) — lu ici une seule fois, au montage, comme repli hors-ligne :
  // voir la note dans useOfflineSync.js.
  try {
    return (loadLocalCache() || {}).householdId || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  SESSION SUPABASE — écoute en direct (connexion, déconnexion,       */
/*  rafraîchissement de token) via onAuthStateChange. La persistance   */
/*  de session (localStorage) est gérée nativement par le SDK — rien   */
/*  à faire de plus pour qu'elle survive à un rechargement de page.    */
/*                                                                      */
/*  Important (fix hors-ligne) : `loading` ne dépend plus QUE de la     */
/*  session elle-même (lecture locale, quasi instantanée, même hors     */
/*  réseau) — plus de la liste des foyers, qui elle a besoin du réseau. */
/*  La résolution du foyer actif est un état séparé (`householdLoading`) */
/*  avec un repli sur le dernier foyer connu (cache local) : avant ce    */
/*  correctif, une résolution de foyer bloquée en attente du réseau      */
/*  laissait l'app coincée indéfiniment sur "Ouverture de ton foyer…",   */
/*  même quand tout le reste (session, recettes en cache) était déjà     */
/*  disponible localement.                                               */
/* ------------------------------------------------------------------ */
export default function useSupabaseAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [households, setHouseholds] = useState(() => getCachedHouseholds());
  const [householdId, setHouseholdIdState] = useState(() => getStoredActiveHouseholdId());
  const [householdLoading, setHouseholdLoading] = useState(true);

  // Le choix explicite de l'utilisateur (bascule manuelle) prime sur
  // n'importe quelle résolution automatique tant que la session ne
  // change pas — évite qu'un rafraîchissement de token ne le ramène de
  // force sur le premier foyer de la liste.
  const manualChoiceRef = useRef(getStoredActiveHouseholdId());

  const resolveHouseholds = useCallback(async () => {
    setHouseholdLoading(true);
    try {
      const list = await getMyHouseholds();
      setHouseholds(list);
      // Mémorisé en local (point 1 de la finition demandée) : le
      // sélecteur de foyers et leurs noms restent utilisables dans les
      // Réglages même hors-ligne, plutôt que vides/génériques.
      setCachedHouseholds(list);
      setHouseholdIdState((current) => {
        const preferred = manualChoiceRef.current || current;
        const stillValid = preferred && list.some((h) => h.id === preferred);
        if (stillValid) return preferred;
        return list.length ? list[0].id : null;
      });
    } catch (err) {
      console.error("Résolution des foyers impossible :", err);
      // On ne touche ni `households` ni `householdId` : on garde la
      // dernière valeur connue (cache local) plutôt que de tout vider.
    } finally {
      setHouseholdLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      setHouseholdLoading(false);
      return undefined;
    }

    let cancelled = false;

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false); // ← ne dépend plus de la résolution du foyer
      if (data.session) {
        resolveHouseholds();
      } else {
        setHouseholdLoading(false);
      }
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      if (newSession) {
        resolveHouseholds();
      } else {
        setHouseholds([]);
        setCachedHouseholds([]);
        setHouseholdIdState(null);
        manualChoiceRef.current = null;
        setHouseholdLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [resolveHouseholds]);

  const switchHousehold = useCallback((id) => {
    manualChoiceRef.current = id;
    setHouseholdIdState(id);
  }, []);

  const createHousehold = useCallback(async (name) => {
    const newId = await createHouseholdApi(name);
    await resolveHouseholds();
    manualChoiceRef.current = newId;
    setHouseholdIdState(newId);
    return newId;
  }, [resolveHouseholds]);

  const renameHousehold = useCallback(async (id, name) => {
    await renameHouseholdApi(id, name);
    setHouseholds((prev) => {
      const next = prev.map((h) => (h.id === id ? { ...h, name: name.trim() } : h));
      setCachedHouseholds(next);
      return next;
    });
  }, []);

  const deleteHousehold = useCallback(async (id) => {
    await deleteHouseholdApi(id);
    await resolveHouseholds();
    // Si le foyer supprimé était le foyer actif, resolveHouseholds()
    // bascule déjà automatiquement sur le premier foyer restant (voir
    // la logique de `stillValid` ci-dessus, qui invalide l'ancien choix
    // manuel puisqu'il n'apparaît plus dans la liste fraîche).
    if (manualChoiceRef.current === id) manualChoiceRef.current = null;
  }, [resolveHouseholds]);

  return {
    session,
    user: session ? session.user : null,
    householdId,
    households,
    householdLoading,
    switchHousehold,
    createHousehold,
    renameHousehold,
    deleteHousehold,
    refreshHouseholds: resolveHouseholds,
    loading,
    signInWithGoogle,
    signOut: signOutUser,
  };
}
