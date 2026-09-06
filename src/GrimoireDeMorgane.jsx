import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { DEFAULT_BASICS, SUPABASE_READY, demoRecipes } from "./constants";
import { loadLocalCache } from "./utils/localCache";
import { getStoredTheme, storeTheme, applyTheme, watchSystemTheme } from "./utils/theme";
import {
  getStoredPressDuration,
  storePressDuration,
  getStoredShowNutriscore,
  storeShowNutriscore,
  getStoredTextSize,
  storeTextSize,
  applyTextSize,
  getStoredLanguage,
  storeLanguage,
} from "./utils/localSettings";
import { getProfile, saveProfile, pressDurationFromDb } from "./utils/profile";

import useSupabaseAuth from "./hooks/useSupabaseAuth";
import useToast from "./hooks/useToast";
import useRecipes from "./hooks/useRecipes";
import usePantry from "./hooks/usePantry";
import useMealPlan from "./hooks/useMealPlan";
import useShoppingLists from "./hooks/useShoppingLists";
import useOfflineSync from "./hooks/useOfflineSync";
import useConnectionStatus from "./hooks/useConnectionStatus";

import LoadingScreen from "./screens/LoadingScreen";
import LoginScreen from "./screens/LoginScreen";
import AppShell from "./screens/AppShell";
import { LanguageProvider } from "./contexts/LanguageContext";

// Reproduit le déséquilibre réel signalé en mode invité (4 recettes Salé /
// 20 Sucré) pour rejouer fidèlement le bug de bascule de filtre — la
// fonction demoRecipes() seule (3 Salé / 3 Sucré, partagée avec le repli
// hors-ligne normal quand Supabase est injoignable) est trop équilibrée
// pour reproduire un filtre qui révèle très peu de cartes face à un autre
// qui en révèle beaucoup.
function buildGuestDemoRecipes() {
  const base = demoRecipes();
  const sale = base.filter((r) => r.category === "Salé");
  const sucre = base.filter((r) => r.category === "Sucré");
  const clone = (r, n) => ({ ...r, id: `${r.id}-g${n}`, title: `${r.title} ${n}` });
  const extraSale = Array.from({ length: Math.max(0, 4 - sale.length) }, (_, i) => clone(sale[i % sale.length], i + 1));
  const extraSucre = Array.from({ length: Math.max(0, 20 - sucre.length) }, (_, i) => clone(sucre[i % sucre.length], i + 1));
  return [...sale, ...extraSale, ...sucre, ...extraSucre];
}

/* ------------------------------------------------------------------ */
/*  APPLICATION PRINCIPALE                                             */
/*                                                                      */
/*  Ce fichier ne fait plus que du branchement : authentification,      */
/*  hooks de données (recettes / frigo / courses / synchro), thème, et   */
/*  le choix du bon écran. Toute la logique métier vit désormais dans    */
/*  src/hooks/*, et tout le rendu de l'app connectée vit dans            */
/*  src/screens/AppShell.jsx — voir l'audit "God Component" (point 5).   */
/* ------------------------------------------------------------------ */
export default function GrimoireDeMorgane() {
  // Lu une seule fois au montage : hydrate l'app instantanément avec les
  // dernières données connues, avant même que Supabase réponde (ou en
  // l'absence totale de réseau — coeur de l'offline-first).
  const localCacheRef = useRef(null);
  if (localCacheRef.current === null) localCacheRef.current = loadLocalCache() || {};
  const localCache = localCacheRef.current;

  // Accès de test TEMPORAIRE (?atelier=1) : contourne l'écran de connexion
  // Google pour ouvrir directement l'app avec des recettes de démo, sans
  // jamais toucher au vrai compte/foyer Supabase de l'utilisateur (aucune
  // session authentifiée n'existe dans ce mode — toute tentative
  // d'écriture réseau serait de toute façon rejetée par les policies RLS,
  // qui exigent une session valide). Sert uniquement à déboguer des bugs
  // d'affichage/animation sans avoir besoin des identifiants réels de
  // l'utilisateur — à retirer une fois le débogage terminé.
  const isGuestModeRef = useRef(null);
  if (isGuestModeRef.current === null) {
    isGuestModeRef.current =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("atelier") === "1";
  }
  const isGuestMode = isGuestModeRef.current;

  const [theme, setThemeState] = useState(() => getStoredTheme()); // "light" | "dark" | "system"
  const { toast, showToast } = useToast();
  const guestToastShownRef = useRef(false);
  useEffect(() => {
    if (isGuestMode && !guestToastShownRef.current) {
      guestToastShownRef.current = true;
      showToast("Mode invité — recettes de démonstration, rien n'est sauvegardé.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    user,
    householdId,
    households,
    householdLoading,
    switchHousehold,
    createHousehold,
    renameHousehold,
    deleteHousehold,
    requestJoinHousehold,
    getPendingHouseholdRequests,
    approveHouseholdMember,
    rejectHouseholdMember,
    refreshHouseholds,
    loading: authLoading,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();

  // Apparence + Accessibilité : toujours lus en local d'abord (offline-
  // first, jamais bloquant), puis synchronisés PAR COMPTE dans la table
  // `profiles` dès qu'une session existe (voir l'effet de "pull" ci-dessous
  // et utils/profile.js) — propres à l'utilisateur, jamais partagés avec
  // le reste du foyer.
  const [pressDuration, setPressDurationState] = useState(() => getStoredPressDuration());
  const [showNutriscore, setShowNutriscoreState] = useState(() => getStoredShowNutriscore());
  const [textSize, setTextSizeState] = useState(() => getStoredTextSize());
  // Réglage mémorisé localement uniquement (pas encore de vraie traduction
  // à synchroniser — voir la note dans utils/localSettings.js).
  const [language, setLanguageState] = useState(() => getStoredLanguage());
  const setLanguage = (lang) => {
    storeLanguage(lang);
    setLanguageState(lang);
  };

  const setPressDuration = (ms) => {
    storePressDuration(ms);
    setPressDurationState(ms);
    if (user) saveProfile(user.id, { pressDuration: ms }).catch((err) => console.error("Sync appui long impossible :", err));
  };
  const setShowNutriscore = (value) => {
    storeShowNutriscore(value);
    setShowNutriscoreState(value);
    if (user) saveProfile(user.id, { showNutriscore: value }).catch((err) => console.error("Sync badge Nutri-Score impossible :", err));
  };
  const setTextSize = (size) => {
    storeTextSize(size);
    setTextSizeState(size);
    if (user) saveProfile(user.id, { textSize: size }).catch((err) => console.error("Sync taille de texte impossible :", err));
  };

  const recipesApi = useRecipes({
    householdId,
    initialRecipes: Array.isArray(localCache.recipes) && localCache.recipes.length
      ? localCache.recipes
      : (isGuestMode ? buildGuestDemoRecipes() : []),
    showToast,
  });
  const shoppingApi = useShoppingLists({
    householdId,
    initialLists: Array.isArray(localCache.shoppingLists) ? localCache.shoppingLists : [],
    initialActiveListId: localCache.activeListId || null,
    showToast,
  });
  const pantryApi = usePantry({
    initialPantry: Array.isArray(localCache.pantry) ? localCache.pantry : [],
    initialBasics: Array.isArray(localCache.basics) ? localCache.basics : DEFAULT_BASICS,
    showToast,
    addManualItemToShoppingList: shoppingApi.addManualItem,
  });
  const mealPlanApi = useMealPlan({
    initialMealPlan: Array.isArray(localCache.mealPlan) ? localCache.mealPlan : [],
  });

  const sync = useOfflineSync({
    authLoading,
    user,
    householdId,
    localCache,
    recipes: recipesApi.recipes,
    setRecipes: recipesApi.setRecipes,
    pantry: pantryApi.pantry,
    setPantry: pantryApi.setPantry,
    basics: pantryApi.basics,
    setBasics: pantryApi.setBasics,
    mealPlan: mealPlanApi.mealPlan,
    setMealPlan: mealPlanApi.setMealPlan,
    shoppingLists: shoppingApi.shoppingLists,
    setShoppingLists: shoppingApi.setShoppingLists,
    activeListId: shoppingApi.activeListId,
    setActiveListId: shoppingApi.setActiveListId,
    showToast,
  });

  // Statut de connexion RÉEL (ping Supabase, pas juste navigator.onLine —
  // voir hooks/useConnectionStatus.js) : alimente la bannière "Hors ligne"
  // et la pastille de statut sur l'avatar du profil. `recheckConnection`
  // permet au bouton "Réessayer" du bandeau de forcer une revérification
  // immédiate plutôt que d'attendre le prochain ping programmé.
  const { status: connectionStatus, recheck: recheckConnection } = useConnectionStatus();

  // Applique le thème sur <html data-theme="..."> avant la peinture du
  // navigateur (useLayoutEffect) pour limiter le flash de la mauvaise
  // couleur au démarrage. Si "Système" est choisi, on réapplique à
  // chaque bascule clair/sombre de l'OS.
  useLayoutEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return undefined;
    return watchSystemTheme(() => applyTheme("system"));
  }, [theme]);

  // Même principe que le thème, pour <html data-text-size="...">.
  useLayoutEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);

  const setTheme = (nextTheme) => {
    storeTheme(nextTheme);
    setThemeState(nextTheme);
    if (user) saveProfile(user.id, { theme: nextTheme }).catch((err) => console.error("Sync thème impossible :", err));
  };

  // À la connexion (ou au changement de compte), les préférences propres
  // à CE compte priment sur les valeurs locales de l'appareil : elles
  // sont tirées une fois depuis `profiles` et remplacent l'état courant —
  // c'est ce qui fait que le thème/l'appui long/le badge Nutri-Score/la
  // taille de texte suivent l'utilisateur d'un appareil à l'autre. Tant
  // que le réseau n'a pas répondu (ou en l'absence de ligne dans
  // `profiles`, ex. tout premier lancement), les valeurs locales déjà
  // appliquées ci-dessus restent affichées — jamais d'écran bloqué.
  // Pas de flag "cancelled" ici : ce composant racine ne se démonte
  // jamais réellement en usage normal, et le repli sur `syncedUserIdRef`
  // empêche déjà tout nouvel appel tant que l'id du compte ne change pas
  // (ex. rafraîchissement de token, qui ne doit surtout pas re-tirer les
  // préférences par-dessus une modification locale toute fraîche).
  const syncedUserIdRef = useRef(null);
  useEffect(() => {
    if (!user || syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;
    getProfile(user.id).then((p) => {
      if (!p) return;
      if (p.theme) {
        storeTheme(p.theme);
        setThemeState(p.theme);
      }
      if (p.press_duration) {
        const ms = pressDurationFromDb(p.press_duration);
        storePressDuration(ms);
        setPressDurationState(ms);
      }
      if (p.show_nutriscore !== null && p.show_nutriscore !== undefined) {
        storeShowNutriscore(p.show_nutriscore);
        setShowNutriscoreState(p.show_nutriscore);
      }
      if (p.text_size) {
        storeTextSize(p.text_size);
        setTextSizeState(p.text_size);
      }
    });
  }, [user]);

  // --- Écran à afficher --------------------------------------------------
  // Priorité absolue au cache local : si on a déjà des recettes en
  // mémoire (donc un grimoire déjà ouvert sur cet appareil), on ouvre
  // l'app TOUT DE SUITE — sans attendre la session, sans attendre la
  // résolution du foyer, sans attendre quoi que ce soit du réseau. C'est
  // le coeur du mode hors-ligne : avant ce correctif, ces écrans de
  // chargement étaient gatés sur `authLoading`/`householdId`, qui eux
  // dépendaient du réseau — un utilisateur hors-ligne restait bloqué sur
  // "Ouverture de ton foyer…" indéfiniment, même avec un grimoire complet
  // déjà disponible localement.
  const hasLocalData = Array.isArray(localCache.recipes) && localCache.recipes.length > 0;

  if (!sync.ready) {
    return <LoadingScreen message="Ouverture du grimoire…" />;
  }

  // Le mode invité (?atelier=1, voir plus haut) contourne complètement
  // cette porte : jamais d'écran de connexion, toujours l'app directement,
  // sur les recettes de démo — aucun impact sur le parcours normal des
  // vrais utilisateurs ci-dessous.
  if (!isGuestMode) {
    if (SUPABASE_READY && !hasLocalData) {
      if (authLoading) return <LoadingScreen message="Vérification de la session…" />;
      if (!user) return <LoginScreen signInWithGoogle={signInWithGoogle} showToast={showToast} toast={toast} />;
      if (householdLoading && !householdId) return <LoadingScreen message="Ouverture de ton foyer…" />;
    } else if (SUPABASE_READY && hasLocalData && !authLoading && !user) {
      // Vérification en ligne aboutie (pas juste "encore en cours") et
      // réellement concluante : pas de session. On protège quand même le
      // grimoire plutôt que de l'ouvrir avec un cache d'un compte dont la
      // session a expiré ou a été révoquée — mais seulement une fois la
      // vérification terminée, jamais pendant qu'elle est encore en attente
      // du réseau (c'est tout l'intérêt du hasLocalData ci-dessus).
      return <LoginScreen signInWithGoogle={signInWithGoogle} showToast={showToast} toast={toast} />;
    }
  }

  return (
    <LanguageProvider language={language}>
      <AppShell
        recipesApi={recipesApi}
        pantryApi={pantryApi}
        mealPlanApi={mealPlanApi}
        shoppingApi={shoppingApi}
        offlineQueueSize={sync.offlineQueueSize}
        connectionStatus={connectionStatus}
        onRetryConnection={recheckConnection}
        pendingImport={sync.pendingImport}
        setPendingImport={sync.setPendingImport}
        pendingHouseholdJoin={sync.pendingHouseholdJoin}
        setPendingHouseholdJoin={sync.setPendingHouseholdJoin}
        theme={theme}
        setTheme={setTheme}
        pressDuration={pressDuration}
        setPressDuration={setPressDuration}
        showNutriscore={showNutriscore}
        setShowNutriscore={setShowNutriscore}
        textSize={textSize}
        setTextSize={setTextSize}
        language={language}
        setLanguage={setLanguage}
        user={user}
        householdId={householdId}
        households={households}
        onSwitchHousehold={switchHousehold}
        onCreateHousehold={createHousehold}
        onRenameHousehold={renameHousehold}
        onDeleteHousehold={deleteHousehold}
        onRequestJoinHousehold={requestJoinHousehold}
        onGetPendingHouseholdRequests={getPendingHouseholdRequests}
        onApproveHouseholdMember={approveHouseholdMember}
        onRejectHouseholdMember={rejectHouseholdMember}
        onRefreshHouseholds={refreshHouseholds}
        signOut={signOut}
        toast={toast}
        showToast={showToast}
      />
    </LanguageProvider>
  );
}
