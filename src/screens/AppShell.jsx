import { useCallback, useEffect, useLayoutEffect, useRef, useState, lazy, Suspense } from "react";
import { flushSync } from "react-dom";
import { Heart, Search, Settings, Wand2 } from "lucide-react";

import { FILTERS, TABS } from "../constants";
import { CSS } from "../constants/styles.css";
import { triggerHaptic, nextId, copyText } from "../utils/helpers";
import { getCachedProfile, getProfile } from "../utils/profile";
import { useTranslation } from "../contexts/LanguageContext";

import { NavButton } from "../components/common";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { RecipesView, RecipeForm, RecipeDetail, CookMode } from "../components/recipe";

// Chargés à la demande (React.lazy), importés directement depuis leur
// fichier — jamais depuis le barrel components/*/index.js, qui est déjà
// importé statiquement plus haut (NavButton, RecipesView...) : passer par
// le même barrel aurait ramené tout son contenu dans le bundle initial et
// annulé le découpage. Recettes reste le seul onglet chargé "en dur" (c'est
// l'onglet d'atterrissage par défaut) ; Planning/Frigo/Courses et les
// fenêtres modales peu fréquentes rejoignent chacun leur propre chunk,
// récupéré au premier clic qui les ouvre.
const PlanningView = lazy(() => import("../components/planning/PlanningView"));
const FridgeView = lazy(() => import("../components/fridge/FridgeView"));
const ShoppingView = lazy(() => import("../components/shopping/ShoppingView"));
const TextShareModal = lazy(() => import("../components/common/TextShareModal"));
const ImportConfirmModal = lazy(() => import("../components/common/ImportConfirmModal"));
const JoinHouseholdConfirmModal = lazy(() => import("../components/common/JoinHouseholdConfirmModal"));
const DeleteConfirmModal = lazy(() => import("../components/common/DeleteConfirmModal"));
const TextTemplateImportModal = lazy(() => import("../components/common/TextTemplateImportModal"));
const RecipeLinkImportModal = lazy(() => import("../components/common/RecipeLinkImportModal"));
const SecretSettingsModal = lazy(() => import("../components/common/SecretSettingsModal"));
const ListsManagerModal = lazy(() => import("../components/common/ListsManagerModal"));

// Fallback minimal pour les onglets secondaires (Planning/Frigo/Courses) :
// juste la baguette qui tourne déjà utilisée sur l'écran de chargement
// global, mais en version compacte insérée dans la mise en page (pas de
// min-height: 100vh) — le chunk est petit, ce spinner n'est visible qu'une
// fraction de seconde au tout premier accès à l'onglet.
const ViewLoadingFallback = () => (
  <div className="view-loading">
    <Wand2 className="spin-wand" size={22} />
  </div>
);

/* ------------------------------------------------------------------ */
/*  COQUILLE APPLICATIVE — onglets, modales, gestes                    */
/*  Ne connaît que ce que les hooks lui exposent (recettes, frigo,      */
/*  courses, synchro) ; ne fait plus aucun appel Supabase directement — */
/*  c'était le rôle de GrimoireDeMorgane.jsx / des hooks data.          */
/* ------------------------------------------------------------------ */
// `settingsApi`/`householdApi`/`syncApi` regroupent (côté GrimoireDeMorgane.jsx)
// des lots de props apparentées qui, prises une par une, faisaient grimper
// AppShell à 36 props distinctes — le même principe déjà appliqué à
// recipesApi/pantryApi/mealPlanApi/shoppingApi, juste étendu au reste.
// Aucun changement de comportement : chaque groupe est déstructuré ci-dessous
// sous EXACTEMENT les mêmes noms qu'avant (theme, user, onSwitchHousehold...),
// donc tout le reste du composant — state, gestes, JSX — n'a pas bougé.
export default function AppShell({
  recipesApi,
  pantryApi,
  mealPlanApi,
  shoppingApi,
  settingsApi,
  householdApi,
  syncApi,
  toast,
  showToast,
}) {
  const { recipes, saveRecipe, importRecipe, deleteRecipe, toggleFavorite, exportGrimoire, handleImportFile } = recipesApi;
  const { pantry, setPantry, basics, moveBasicToVariable, removeBasic, resetPantry } = pantryApi;
  const { mealPlan, addMealPlanEntry, removeMealPlanEntry, removeMealPlanEntries, updateMealPlanEntry, reorderMealPlanEntries, moveMealPlanSection } = mealPlanApi;
  const { t } = useTranslation();
  const {
    shoppingLists,
    visibleShoppingLists,
    activeListId,
    openShoppingList,
    shoppingScope,
    setShoppingScope,
    createShoppingList,
    renameShoppingList,
    deleteShoppingList,
    addManualItem,
    toggleShoppingItem,
    deleteShoppingItem,
    adjustShoppingQty,
    setShoppingItemQty,
    generateShoppingList,
    resetActiveList,
  } = shoppingApi;
  const {
    theme,
    setTheme,
    pressDuration,
    setPressDuration,
    showNutriscore,
    setShowNutriscore,
    navOpacity,
    setNavOpacity,
    textSize,
    setTextSize,
    language,
    setLanguage,
  } = settingsApi;
  const {
    user,
    householdId,
    households,
    onSwitchHousehold,
    onCreateHousehold,
    onRenameHousehold,
    onDeleteHousehold,
    onRequestJoinHousehold,
    onGetPendingHouseholdRequests,
    onApproveHouseholdMember,
    onRejectHouseholdMember,
    onRefreshHouseholds,
    signOut,
  } = householdApi;
  const {
    offlineQueueSize,
    connectionStatus,
    onRetryConnection,
    pendingImport,
    setPendingImport,
    pendingHouseholdJoin,
    setPendingHouseholdJoin,
  } = syncApi;

  const [tab, setTab] = useState("recettes");
  const [filter, setFilter] = useState("tout");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [formTarget, setFormTarget] = useState(null); // null | 'new' | recipe object
  const [openRecipe, setOpenRecipe] = useState(null);
  // Id de la recette dont la photo de carte doit porter temporairement le
  // même `view-transition-name` que la photo hero de RecipeDetail (voir
  // openRecipeWithTransition ci-dessous) — jamais les deux montées avec ce
  // nom en même temps une fois la recette ouverte (voir son commentaire).
  const [transitionPhotoId, setTransitionPhotoId] = useState(null);
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [textModal, setTextModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showTemplateImport, setShowTemplateImport] = useState(false);
  const [showLinkImport, setShowLinkImport] = useState(false);
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [showListsManager, setShowListsManager] = useState(false);

  const touchStart = useRef(null);
  const appContentRef = useRef(null);

  // Photo de profil affichée dans le bouton de réglages de l'en-tête —
  // cache-first (voir utils/profile.js) : s'affiche instantanément avec la
  // dernière valeur connue, même hors ligne, puis se rafraîchit dès que le
  // réseau répond. Remplace l'ancien déclencheur "triple-clic sur le
  // titre" : le titre n'ouvre plus rien, ce bouton est l'unique porte
  // d'entrée vers les réglages.
  const [headerProfile, setHeaderProfile] = useState(() => getCachedProfile());
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getProfile(user.id).then((p) => { if (!cancelled && p) setHeaderProfile(p); });
    return () => { cancelled = true; };
  }, [user]);
  const headerAvatarUrl = headerProfile && headerProfile.avatar_url;

  const shareText = async (text, label) => {
    const ok = await copyText(text);
    if (ok) showToast(t("app.copiedSuffix", { label }));
    else setTextModal({ title: label, text });
  };

  const confirmPendingImport = () => {
    if (!pendingImport) return;
    saveRecipe({ ...pendingImport, id: nextId(), favorite: false });
    setPendingImport(null);
    showToast(t("app.recipeAdded"));
  };

  // --- Ouverture d'une recette : la photo de la carte "grandit" jusqu'à
  // devenir la photo hero de la fiche (View Transition API du navigateur —
  // aucune lib d'animation dans ce projet, voir useAnimatedClose.js). Repli
  // total et silencieux sur l'ouverture instantanée d'avant (aucun visuel
  // manquant, juste sans le morphing) sur tout navigateur qui ne supporte
  // pas encore l'API, ou si l'utilisateur a demandé "Réduire les animations"
  // au niveau système (prefers-reduced-motion).
  //
  // Séquence, pour que la même photo ne porte JAMAIS ce nom sur deux
  // éléments montés en même temps (règle stricte de l'API — sinon la
  // transition entière est silencieusement annulée par le navigateur) :
  // 1) on marque D'ABORD (flushSync, donc peint avant la suite) la carte de
  //    CETTE recette comme "source" de la transition à venir — c'est l'état
  //    "avant" que le navigateur va capturer en photo.
  // 2) DANS le callback de startViewTransition (exécuté de façon synchrone
  //    par le navigateur juste avant de capturer l'état "après") : on ouvre
  //    la fiche recette ET on retire ce marquage de la carte dans le MÊME
  //    flushSync — la carte perd le nom pile au moment où la fiche
  //    (nouvelle porteuse du même nom, voir RecipeDetail.jsx) apparaît.
  const openRecipeWithTransition = useCallback((recipe) => {
    const supportsViewTransition =
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!supportsViewTransition) {
      setOpenRecipe(recipe);
      return;
    }
    flushSync(() => setTransitionPhotoId(recipe.id));
    document.startViewTransition(() => {
      flushSync(() => {
        setOpenRecipe(recipe);
        setTransitionPhotoId(null);
      });
    });
  }, []);

  // --- Pastille dorée glissante de la nav basse (voir .nav-indicator,
  // modalsBase.css.js) — mesurée en JS plutôt que calculée en CSS pur
  // (ex. 100%/3 * index) car la largeur des boutons dépend du texte traduit
  // (langue), de la taille de texte (Réglages > Accessibilité) et du mode
  // PWA installée (padding différent, voir modalsBase.css.js) : aucune
  // formule fixe ne couvrirait ces trois sources de variation à la fois.
  // Masquée en paysage (voir responsive.css.js) où la nav bascule en colonne
  // latérale avec son propre indicateur (fond plein sur l'onglet actif) —
  // les mesures ci-dessous y seraient de toute façon dénuées de sens
  // (position horizontale sur une nav devenue verticale).
  const navRef = useRef(null);
  const navBtnRefs = useRef([]);
  const [navIndicator, setNavIndicator] = useState(null);
  const updateNavIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeIndex = TABS.findIndex((tb) => tb.key === tab);
    const btn = navBtnRefs.current[activeIndex];
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setNavIndicator({ left: btnRect.left - navRect.left, width: btnRect.width });
  }, [tab]);
  useLayoutEffect(() => { updateNavIndicator(); }, [updateNavIndicator, language]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => updateNavIndicator());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [updateNavIndicator]);

  const filterIndex = FILTERS.findIndex((f) => f.key === filter);

  // Swipe horizontal : bascule les filtres Recettes ("Tout"/"Salé"/"Sucré").
  //
  // Avant : l'axe était verrouillé DÉFINITIVEMENT dès les 10 premiers
  // pixels de mouvement, sur un simple `dx > dy` — sans marge, et sans
  // jamais être reconsidéré ensuite. Un balayage vertical (scroll) qui
  // commence avec ne serait-ce qu'un tout petit bruit horizontal (courant
  // avec un pavé tactile Windows à deux doigts, ou un vrai doigt qui n'est
  // jamais parfaitement vertical) se retrouvait alors verrouillé "x" pour
  // toute la suite du geste, même s'il devenait ensuite clairement
  // vertical. En fin de geste, `Math.abs(dx) >= 55` pouvait alors être
  // atteint par la seule dérive horizontale accumulée sur un long
  // défilement, déclenchant setFilter() — qui remet le défilement à zéro
  // (voir RecipesView.jsx, l'effet sur [filter, favoritesOnly]). Posé sur
  // .app-content (voir plus bas), donc uniquement quand le geste commence
  // au-dessus de la grille elle-même — confirmé : le défilement au geste
  // fonctionnait normalement dès que le pointeur était en dehors de cette
  // zone. En paysage, ce même faux positif passait inaperçu : .app-content
  // y est un vrai conteneur de scroll (voir responsive.css.js), donc
  // window.scrollTo(0,0) n'y avait aucun effet visible, contrairement au
  // mode portrait où c'est le document entier qui défile.
  //
  // Plus de verrouillage précoce : la décision ne se prend qu'à la fin du
  // geste, sur le déplacement cumulé RÉEL depuis le début (pas un
  // échantillon des 10 premiers pixels), avec une marge nette (pas juste
  // "plus horizontal que vertical", mais NETTEMENT plus). Filet de sécurité
  // supplémentaire : si le défilement a par ailleurs réellement bougé
  // pendant ce geste, ce n'était de toute façon pas une intention de
  // changer de filtre, quel que soit le dx mesuré (même principe déjà
  // appliqué à l'appui long, voir hooks/useLongPress.js).
  // Toujours les dernières valeurs, sans jamais réattacher les écouteurs
  // natifs ci-dessous (même principe que useFocusTrap.js/useLongPress.js).
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const filterIndexRef = useRef(filterIndex);
  filterIndexRef.current = filterIndex;

  // Attachés nativement en { passive: true } plutôt que via les props JSX
  // onTouchStart/onTouchEnd — repéré dans Chrome DevTools (Rendering >
  // "Scrolling performance issues") : ce geste était posé sur .app-content,
  // le conteneur COMMUN à tous les onglets (Recettes, Frigo...), et
  // apparaissait comme cause potentielle de "main thread scroll repaint" /
  // "touch event listener" sur chacun d'eux, pas seulement la grille de
  // recettes. Ce hook n'appelle jamais preventDefault() sur un événement
  // tactile, donc { passive: true } est toujours sûr ici — voir
  // hooks/useLongPress.js, qui a reçu le même traitement.
  useEffect(() => {
    const node = appContentRef.current;
    if (!node) return undefined;
    const handleTouchStart = (e) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, scrollY: window.scrollY };
    };
    const handleTouchEnd = (e) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (start == null || tabRef.current !== "recettes") return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 55) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (Math.abs(window.scrollY - start.scrollY) > 5) return;
      const next = dx < 0
        ? Math.min(filterIndexRef.current + 1, FILTERS.length - 1)
        : Math.max(filterIndexRef.current - 1, 0);
      setFilter(FILTERS[next].key);
    };
    const opts = { passive: true };
    node.addEventListener("touchstart", handleTouchStart, opts);
    node.addEventListener("touchend", handleTouchEnd, opts);
    return () => {
      node.removeEventListener("touchstart", handleTouchStart, opts);
      node.removeEventListener("touchend", handleTouchEnd, opts);
    };
  }, [setFilter]);

  return (
    <div className="grimoire-app">
      <style>{CSS}</style>

      <header className="app-header">
        <button
          type="button"
          className={`app-header-settings-btn ${headerAvatarUrl ? "has-avatar" : ""}`}
          onClick={() => { triggerHaptic(15); setShowSecretSettings(true); }}
          aria-label={t("settings.title")}
        >
          {headerAvatarUrl ? (
            <span className="app-header-avatar-wrap">
              <img
                src={headerAvatarUrl}
                alt=""
                className="app-header-avatar"
                loading="lazy"
                decoding="async"
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
              />
              <span
                className={`connection-status-dot app-header-status-dot connection-status-${connectionStatus || "checking"}`}
                aria-hidden="true"
              />
            </span>
          ) : (
            <Settings size={20} />
          )}
        </button>
        <h1>Le Grimoire de Morgane</h1>
        <p className="subtitle">{t("app.subtitle")}</p>
        {connectionStatus === "offline" && (
          <p className="offline-banner">
            {t("app.offline")}
            {onRetryConnection && (
              <button type="button" className="offline-banner-retry" onClick={() => { triggerHaptic(10); onRetryConnection(); }}>
                {t("app.offlineRetry")}
              </button>
            )}
          </p>
        )}
        {offlineQueueSize > 0 && (
          <p className="offline-queue-badge">
            {t("app.syncPending", { count: offlineQueueSize, plural: offlineQueueSize > 1 ? "s" : "" })}
          </p>
        )}
      </header>

      {tab === "recettes" && (
        <>
          <div className="search-bar">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("app.searchRecipePlaceholder")}
              aria-label={t("app.searchRecipePlaceholder")}
            />
          </div>
          <div className="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-pill ${filter === f.key ? "active" : ""}`}
                onClick={() => { triggerHaptic(10); setFilter(f.key); }}
              >
                {t(`filters.${f.key}`)}
              </button>
            ))}
            <button
              className={`filter-pill heart-pill ${favoritesOnly ? "active" : ""}`}
              onClick={() => { triggerHaptic(10); setFavoritesOnly((v) => !v); }}
              title={t("app.favoritesTitle")}
            >
              <Heart size={13} fill={favoritesOnly ? "currentColor" : "none"} /> {t("app.favorites")}
            </button>
          </div>
        </>
      )}
      {tab === "frigo" && (
        <div className="search-bar">
          <Search size={15} />
          <input
            value={fridgeSearch}
            onChange={(e) => setFridgeSearch(e.target.value)}
            placeholder={t("app.searchFridgePlaceholder")}
            aria-label={t("app.searchFridgePlaceholder")}
          />
        </div>
      )}

      <main className="app-content" ref={appContentRef}>
        {/* key={tab} : une erreur dans un onglet ne doit emporter que son
            propre contenu (en-tête/filtres/nav basse restent utilisables) —
            et changer d'onglet remonte le filet (nouvelle `key`), donc
            réinitialise l'erreur automatiquement plutôt que de rester
            bloqué sur le message d'erreur en revenant sur cet onglet. */}
        <ErrorBoundary compact key={tab}>
        {tab === "recettes" && (
          <RecipesView
            recipes={recipes}
            filter={filter}
            search={search}
            favoritesOnly={favoritesOnly}
            onToggleFavorite={toggleFavorite}
            onAddRequest={() => setFormTarget("new")}
            onOpen={openRecipeWithTransition}
            transitionPhotoId={transitionPhotoId}
            onRequestDelete={setDeleteTarget}
            onUpdateRecipe={saveRecipe}
            pressDuration={pressDuration}
            showNutriscore={showNutriscore}
            householdId={householdId}
            showToast={showToast}
          />
        )}
        {tab === "plan" && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <PlanningView
              recipes={recipes}
              mealPlan={mealPlan}
              onAddMeal={addMealPlanEntry}
              onRemoveMeal={removeMealPlanEntry}
              onRemoveMeals={removeMealPlanEntries}
              onUpdateMeal={updateMealPlanEntry}
              onReorderMeals={reorderMealPlanEntries}
              onMoveMealSection={moveMealPlanSection}
              onSendToShoppingList={(ids) => {
                generateShoppingList(recipes, ids);
                setTab("courses");
              }}
              showToast={showToast}
              user={user}
            />
          </Suspense>
        )}
        {tab === "frigo" && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <FridgeView
              recipes={recipes}
              pantry={pantry}
              setPantry={setPantry}
              basics={basics}
              search={fridgeSearch}
              onMoveBasicToVariable={moveBasicToVariable}
              onRemoveBasic={removeBasic}
              onResetPantry={resetPantry}
              onOpen={openRecipeWithTransition}
            />
          </Suspense>
        )}
        {tab === "courses" && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ShoppingView
              recipes={recipes}
              activeList={shoppingLists.find((l) => l.id === activeListId) || null}
              scope={shoppingScope}
              onChangeScope={setShoppingScope}
              onAddManualItem={addManualItem}
              onToggleItem={toggleShoppingItem}
              onDeleteItem={deleteShoppingItem}
              onAdjustQty={adjustShoppingQty}
              onSetItemQty={setShoppingItemQty}
              onGenerateFromRecipes={(ids) => generateShoppingList(recipes, ids)}
              onResetActiveList={resetActiveList}
              onOpenManager={() => setShowListsManager(true)}
              showToast={showToast}
              pressDuration={pressDuration}
            />
          </Suspense>
        )}
        </ErrorBoundary>
      </main>

      <nav className="bottom-nav" ref={navRef}>
        <span
          className="nav-indicator"
          aria-hidden="true"
          style={
            navIndicator
              ? { transform: `translateX(${navIndicator.left}px)`, width: `${navIndicator.width}px` }
              : { opacity: 0 }
          }
        />
        {TABS.map(({ key, icon: Icon }, i) => (
          <NavButton
            key={key}
            ref={(node) => { navBtnRefs.current[i] = node; }}
            label={t(`nav.${key}`)}
            Icon={Icon}
            active={tab === key}
            onSelect={() => setTab(key)}
            onLongPress={key === "courses" && shoppingLists.length > 0 ? () => setShowListsManager(true) : null}
            pressDuration={pressDuration}
          />
        ))}
      </nav>

      {openRecipe && (
        <RecipeDetail
          key={openRecipe.id}
          recipe={recipes.find((r) => r.id === openRecipe.id) || openRecipe}
          onClose={() => setOpenRecipe(null)}
          onCook={(r) => setCookingRecipe(r)}
          onEdit={(r) => setFormTarget(r)}
          shareText={shareText}
          showToast={showToast}
          showNutriscore={showNutriscore}
        />
      )}
      {/* Rendu APRÈS RecipeDetail (pas avant) : pour une édition, les deux
          restent montés en même temps (voir onEdit ci-dessus, qui ne referme
          plus la fiche recette) — l'ordre du DOM tranche les égalités de
          z-index (voir .modal-backdrop) et le formulaire doit donc venir en
          second pour s'afficher PAR-DESSUS la fiche, pas dessous. Fermer le
          formulaire (sauvegarde ou annulation) ne fait alors que révéler à
          nouveau la fiche recette déjà ouverte en dessous, à jour, plutôt
          que de retomber sur la grille. */}
      {formTarget && (
        <RecipeForm
          onClose={() => setFormTarget(null)}
          onSave={saveRecipe}
          onDelete={(id) => { deleteRecipe(id); setOpenRecipe(null); }}
          initialRecipe={formTarget === "new" ? null : formTarget}
          pressDuration={pressDuration}
        />
      )}
      {cookingRecipe && (
        <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} pressDuration={pressDuration} />
      )}
      {textModal && (
        <Suspense fallback={null}>
          <TextShareModal title={textModal.title} text={textModal.text} onClose={() => setTextModal(null)} />
        </Suspense>
      )}
      {pendingImport && (
        <Suspense fallback={null}>
          <ImportConfirmModal
            recipe={pendingImport}
            onConfirm={confirmPendingImport}
            onCancel={() => setPendingImport(null)}
          />
        </Suspense>
      )}
      {pendingHouseholdJoin && (
        <Suspense fallback={null}>
          <JoinHouseholdConfirmModal
            householdId={pendingHouseholdJoin}
            onRequestJoin={onRequestJoinHousehold}
            onClose={() => setPendingHouseholdJoin(null)}
            showToast={showToast}
          />
        </Suspense>
      )}
      {deleteTarget && (
        <Suspense fallback={null}>
          <DeleteConfirmModal
            recipe={deleteTarget}
            onConfirm={() => {
              deleteRecipe(deleteTarget.id);
              showToast(t("app.recipeDeleted"));
              setDeleteTarget(null);
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        </Suspense>
      )}
      {showTemplateImport && (
        <Suspense fallback={null}>
          <TextTemplateImportModal
            onClose={() => setShowTemplateImport(false)}
            onImport={(parsed) => importRecipe(parsed, t("app.sheetImported"))}
          />
        </Suspense>
      )}
      {showLinkImport && (
        <Suspense fallback={null}>
          <RecipeLinkImportModal
            onClose={() => setShowLinkImport(false)}
            onCreateRecipe={() => setFormTarget("new")}
          />
        </Suspense>
      )}
      {showSecretSettings && (
        <Suspense fallback={null}>
          <SecretSettingsModal
            onClose={() => setShowSecretSettings(false)}
            connectionStatus={connectionStatus}
            onExport={exportGrimoire}
            onImportFile={handleImportFile}
            onImportTextRecipe={() => setShowTemplateImport(true)}
            onImportLink={() => setShowLinkImport(true)}
            pressDuration={pressDuration}
            onSetPressDuration={setPressDuration}
            theme={theme}
            onSetTheme={setTheme}
            showNutriscore={showNutriscore}
            onSetShowNutriscore={setShowNutriscore}
            navOpacity={navOpacity}
            onSetNavOpacity={setNavOpacity}
            textSize={textSize}
            onSetTextSize={setTextSize}
            language={language}
            onSetLanguage={setLanguage}
            user={user}
            householdId={householdId}
            households={households}
            onSwitchHousehold={onSwitchHousehold}
            onCreateHousehold={onCreateHousehold}
            onRenameHousehold={onRenameHousehold}
            onDeleteHousehold={onDeleteHousehold}
            onRequestJoinHousehold={onRequestJoinHousehold}
            onGetPendingHouseholdRequests={onGetPendingHouseholdRequests}
            onApproveHouseholdMember={onApproveHouseholdMember}
            onRejectHouseholdMember={onRejectHouseholdMember}
            onRefreshHouseholds={onRefreshHouseholds}
            showToast={showToast}
            onSignOut={signOut}
          />
        </Suspense>
      )}
      {showListsManager && (
        <Suspense fallback={null}>
          <ListsManagerModal
            lists={visibleShoppingLists}
            activeListId={activeListId}
            scope={shoppingScope}
            onOpen={openShoppingList}
            onCreate={createShoppingList}
            onRename={renameShoppingList}
            onDelete={deleteShoppingList}
            onClose={() => setShowListsManager(false)}
          />
        </Suspense>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
