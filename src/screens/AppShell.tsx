import { Activity, useEffect, useRef, useState, lazy, Suspense } from "react";
import { AnimatePresence } from "motion/react";
import { Wand2 } from "lucide-react";

import { FILTERS, TABS } from "../constants";
import { nextId, copyText } from "../utils/helpers";
import { useTranslation } from "../contexts/LanguageContext";
import useTabNavigation from "../hooks/useTabNavigation";
import useFilterSwipe from "../hooks/useFilterSwipe";

import NavButton from "../components/common/NavButton";
import ErrorBoundary from "../components/common/ErrorBoundary";
import AppHeader from "./AppHeader";
import TabBars from "./TabBars";
import { RecipesView, RecipeForm, RecipeDetail, CookMode } from "../components/recipe";
import type { Recipe } from "../hooks/useRecipes";
import type { ShowToast, ToastState } from "../hooks/useToast";
import Toast from "../components/common/Toast";
import type { RecipesApi, PantryApi, MealPlanApi, ShoppingApi, SettingsApi, HouseholdApi, SyncApi } from "./appShellTypes";

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
const CookbookBuilderModal = lazy(() => import("../components/cookbook/CookbookBuilderModal"));
const DiagnosticsPanelModal = lazy(() => import("../components/diagnostics/DiagnosticsPanelModal"));
const ListsManagerModal = lazy(() => import("../components/common/ListsManagerModal"));
const OnboardingTour = lazy(() => import("../components/onboarding/OnboardingTour"));
const RecipeEditTour = lazy(() => import("../components/onboarding/RecipeEditTour"));

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

interface AppShellProps {
  recipesApi: RecipesApi;
  pantryApi: PantryApi;
  mealPlanApi: MealPlanApi;
  shoppingApi: ShoppingApi;
  settingsApi: SettingsApi;
  householdApi: HouseholdApi;
  syncApi: SyncApi;
  toast?: ToastState | null;
  showToast: ShowToast;
  hideToast?: () => void;
}

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
  hideToast,
  showToast,
}: AppShellProps) {
  const { recipes, saveRecipe, importRecipe, deleteRecipe, toggleFavorite, exportGrimoire, handleImportFile } = recipesApi;
  const { pantry, setPantry, basics, moveBasicToVariable, removeBasic, resetPantry } = pantryApi;
  const { mealPlan, addMealPlanEntry, removeMealPlanEntries, restoreMealPlanEntries, updateMealPlanEntry, reorderMealPlanEntries, moveMealPlanSection } = mealPlanApi;
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
    heroTreatment,
    setHeroTreatment,
    iconStyle,
    setIconStyle,
    textSize,
    setTextSize,
    language,
    setLanguage,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    onboardingResolved,
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

  // Navigation entre onglets (onglet demandé / affiché, sens du glissement,
  // retour en haut à la bascule) : voir hooks/useTabNavigation.ts.
  const appContentRef = useRef<HTMLElement | null>(null);
  const { tab, shownTab, tabExiting, tabSlideStyle, changeTab } = useTabNavigation(appContentRef);
  // Onglets déjà affichés au moins une fois : gardés en mémoire (<Activity>).
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([shownTab]));
  if (!visitedTabs.has(shownTab)) setVisitedTabs(new Set([...visitedTabs, shownTab]));
  const [filter, setFilter] = useState("tout");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [formTarget, setFormTarget] = useState<Recipe | "new" | null>(null); // null | 'new' | recipe object
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [textModal, setTextModal] = useState<{ title: string; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [showTemplateImport, setShowTemplateImport] = useState(false);
  const [showLinkImport, setShowLinkImport] = useState(false);
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [showCookbookBuilder, setShowCookbookBuilder] = useState(false);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);
  const [showListsManager, setShowListsManager] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRecipeTour, setShowRecipeTour] = useState(false);
  // Lance le tuto UNE SEULE FOIS, dès qu'on sait avec certitude que ce
  // compte (ou cet appareil, en mode invité) ne l'a jamais terminé —
  // jamais avant `onboardingResolved` (voir son commentaire,
  // GrimoireDeMorgane.jsx) : sans cette garde, un compte qui a déjà
  // terminé le tuto sur un AUTRE appareil verrait le tuto s'ouvrir puis se
  // refermer tout seul ici, le temps que cette valeur "vraie" arrive du
  // réseau.
  const onboardingAutoShownRef = useRef(false);
  useEffect(() => {
    if (onboardingAutoShownRef.current) return;
    if (!onboardingResolved || hasCompletedOnboarding) return;
    onboardingAutoShownRef.current = true;
    setShowOnboarding(true);
  }, [onboardingResolved, hasCompletedOnboarding]);
  // Fin normale OU "Passer le tuto" : dans les deux cas, marqué comme
  // terminé — revoir le tuto ensuite ne repasse plus JAMAIS par cet
  // affichage automatique, seulement par "Revoir le tutoriel" dans les
  // Réglages (voir replayOnboarding ci-dessous, qui ne touche volontairement
  // pas ce statut : le rejouer à la demande ne doit pas pouvoir le
  // remarquer "non terminé" si l'utilisateur quitte l'app en plein milieu).
  const closeOnboarding = () => {
    setShowOnboarding(false);
    setHasCompletedOnboarding(true);
  };
  // Ferme d'abord les Réglages (évite toute cohabitation avec la modale de
  // Réglages encore montée, voir son animation de sortie) avant d'ouvrir le
  // tuto par-dessus l'écran principal.
  const replayOnboarding = () => {
    setShowSecretSettings(false);
    setShowOnboarding(true);
  };
  // Tuto « Modifier une recette » : ouvre un formulaire de création VIDE
  // derrière le tuto (rien n'est enregistré, aucune recette existante n'est
  // touchée) et le referme à la fin, quelle que soit la façon de quitter.
  // Raccourcis de l'icône de l'app (manifest "shortcuts", vite.config.ts) :
  // /?raccourci=nouvelle-recette | courses | planning. Lu une seule fois à
  // l'ouverture puis retiré de l'adresse (un rechargement ne le rejoue pas).
  useEffect(() => {
    const url = new URL(window.location.href);
    const shortcut = url.searchParams.get("raccourci");
    if (!shortcut) return;
    url.searchParams.delete("raccourci");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (shortcut === "nouvelle-recette") setFormTarget("new");
    else if (shortcut === "courses") changeTab("courses");
    else if (shortcut === "planning") changeTab("plan");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à l'ouverture
  }, []);
  // Retirer un ou plusieurs repas du planning : toast « Annuler » (5 s) qui
  // les remet à leur place (voir restoreMealPlanEntries, hooks/useMealPlan.ts).
  const removeMealsWithUndo = (ids: string[]) => {
    const idSet = new Set(ids);
    const removed = mealPlan.flatMap((entry, index) => (idSet.has(entry.id) ? [{ entry, index }] : []));
    removeMealPlanEntries(ids);
    if (!removed.length) return;
    showToast(
      removed.length === 1 ? t("messages.planning.mealRemoved") : t("messages.planning.mealsRemoved", { count: removed.length }),
      { label: t("common.undo"), onAction: () => restoreMealPlanEntries(removed) }
    );
  };
  const startRecipeTour = () => {
    setFormTarget("new");
    setShowRecipeTour(true);
  };
  const closeRecipeTour = () => {
    setShowRecipeTour(false);
    setFormTarget(null);
  };
  const replayRecipeTour = () => {
    setShowSecretSettings(false);
    startRecipeTour();
  };
  // Contrairement à replayOnboarding ci-dessus, ces deux-là s'ouvrent
  // PAR-DESSUS les Réglages (comme les sous-vues de SettingsSubPanel,
  // voir son commentaire de fichier dans SecretSettingsModal.tsx) plutôt
  // qu'à leur place : `showSecretSettings` ne doit JAMAIS passer à false
  // ici. Un aller-retour false->true (avant/après) démontait puis
  // remontait toute la modale Réglages à chaque ouverture/fermeture — le
  // fond de l'app redevenait visible pendant le tirage de fermeture du
  // Livre de cuisine/Panneau de diagnostics, au lieu de laisser
  // apparaître les Réglages toujours montés en dessous (signalé : "on
  // voit le fond de l'application pendant le mouvement"). Les deux
  // modales partagent déjà le même verrou de scroll (compteur partagé,
  // voir useBodyScrollLock.ts) et le même piège à focus empilable (pile
  // de modales, voir useFocusTrap.ts) : rien d'autre à coordonner pour
  // les empiler sans se gêner, comme RecipeDetail + RecipeForm.
  const openCookbookBuilder = () => setShowCookbookBuilder(true);
  const closeCookbookBuilder = () => setShowCookbookBuilder(false);
  const openDiagnostics = () => setShowDiagnosticsPanel(true);
  const closeDiagnostics = () => setShowDiagnosticsPanel(false);
  // Ne touche QUE l'état React local (voir hasCompletedOnboarding
  // ci-dessus) : le flag localStorage lui-même est déjà mis à jour par
  // DiagnosticsPanelModal (storeOnboardingCompleted(false)) avant cet
  // appel — ce composant n'a pas à connaître ce détail de stockage.
  const resetOnboarding = () => setHasCompletedOnboarding(false);



  const shareText = async (text: string, label: string) => {
    const ok = await copyText(text);
    if (ok) showToast(t("app.copiedSuffix", { label }));
    else setTextModal({ title: label, text });
  };

  const confirmPendingImport = () => {
    if (!pendingImport) return;
    saveRecipe({ ...pendingImport, id: nextId(), favorite: false } as unknown as Recipe);
    setPendingImport(null);
    showToast(t("app.recipeAdded"));
  };

  // --- Ouverture d'une recette : la photo de la carte "grandit" jusqu'à
  // devenir la photo hero de la fiche. Anciennement la View Transition API
  // du navigateur (flushSync + document.startViewTransition, un seul
  // `view-transition-name` global qui ne devait jamais se retrouver sur
  // deux éléments montés en même temps) — remplacée par un layoutId Framer
  // Motion PAR RECETTE (voir RecipeCard.jsx/RecipeDetail.jsx,
  // `recipe-photo-${id}`) : plus besoin de cette danse en deux temps ici,
  // Framer détecte lui-même le passage de témoin entre la carte (qui perd
  // son layoutId dès que `openRecipe` désigne cette recette, voir
  // RecipeCard.jsx) et la fiche (qui le récupère en montant). Ouvrir une
  // recette est donc redevenu un simple setOpenRecipe direct — passé tel
  // quel comme `onOpen` à RecipesView/FridgeView plus bas.

  const filterIndex = FILTERS.findIndex((f) => f.key === filter);

  // Balayage horizontal sur la grille : passe au filtre voisin (voir
  // hooks/useFilterSwipe.ts).
  useFilterSwipe(appContentRef, tab, filterIndex, setFilter);

  // Arrivée de l'app au lancement (voir .app-intro, shell.css) : classe
  // posée au premier rendu puis retirée une fois les animations terminées
  // (~0,85 s), pour qu'elles ne rejouent JAMAIS ensuite — en particulier
  // quand .search-bar/.filter-bar sont remontées en revenant sur l'onglet
  // Recettes. Durée de la minuterie : un peu plus que la plus longue des
  // animations (délai + durée).
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`grimoire-app${intro ? " app-intro" : ""}`}>

      {/* Regroupe en-tête/recherche/filtres/nav — en paysage (voir
          responsive.css, .app-sidebar), cette colonne devient une
          colonne flex indépendante (sa propre hauteur, min-height: 100vh),
          plutôt que de PARTAGER les mêmes lignes de grille CSS que
          .app-content juste en dessous. Avant ce correctif, .app-content
          (qui s'étend sur ces 4 lignes dans la grille d'origine) influençait
          la hauteur calculée de la ligne "nav" selon la quantité de contenu
          affiché (beaucoup de recettes vs. peu après un filtre, ou un onglet
          Plan/Courses sans recherche ni filtres du tout) — la nav latérale
          se décalait alors de haut en bas à chaque changement de filtre ou
          d'onglet (signalé avec vidéo à l'appui). En portrait, ce wrapper
          est neutre ("display: contents", voir responsive.css) : aucun
          changement de rendu, les enfants restent directement dans le flux
          de .grimoire-app comme avant. */}
      <div className="app-sidebar">
      <AppHeader
        user={user}
        connectionStatus={connectionStatus}
        onRetryConnection={onRetryConnection}
        offlineQueueSize={offlineQueueSize}
        onOpenSettings={() => setShowSecretSettings(true)}
      />

      <TabBars
        shownTab={shownTab}
        tabExiting={tabExiting}
        tabSlideStyle={tabSlideStyle}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        fridgeSearch={fridgeSearch}
        onFridgeSearchChange={setFridgeSearch}
      />

      {/* Dernier enfant de .app-sidebar (voir son commentaire plus haut) :
          en paysage, "margin-top: auto" (responsive.css) la pousse tout
          en bas de cette colonne flex indépendante, quel que soit le
          contenu affiché à côté dans .app-content. */}
      <nav className="bottom-nav">
        {TABS.map(({ key, icon: Icon }) => (
          <NavButton
            key={key}
            tabKey={key}
            label={t(`nav.${key}`)}
            Icon={Icon}
            active={tab === key}
            onSelect={() => changeTab(key)}
            onLongPress={key === "courses" && shoppingLists.length > 0 ? () => setShowListsManager(true) : undefined}
            pressDuration={pressDuration}
          />
        ))}
      </nav>
      </div>

      <main className="app-content" ref={appContentRef}>
        {/* Chaque onglet déjà visité reste en mémoire dans son <Activity>
            (React 19) : caché quand on n'est pas dessus, il garde son état
            (recherche, sections dépliées…) et on y retrouve sa position de
            défilement (voir hooks/useTabNavigation.ts). Un onglet jamais
            ouvert n'est pas monté (chargement à la demande conservé).
            Un ErrorBoundary par onglet : une erreur n'emporte que son propre
            contenu (en-tête/filtres/nav basse restent utilisables).
            Glissement horizontal léger à l'arrivée (voir .tab-transition,
            shell.css) — "left"/opacity, jamais "transform" : plusieurs
            onglets contiennent un élément position:fixed propre (.fab en
            Recettes, .planning-reorder-banner en Planification) qui
            deviendrait sinon ancré à CE calque le temps de l'animation
            plutôt qu'au vrai viewport. Réafficher un onglet caché (display:
            none -> visible) relance cette animation d'entrée d'elle-même. */}
        {TABS.filter(({ key }) => visitedTabs.has(key)).map(({ key }) => (
          <Activity key={key} mode={shownTab === key ? "visible" : "hidden"}>
            <ErrorBoundary compact>
              <div
                className={`tab-transition${shownTab === key && tabExiting ? " tab-exit" : ""}`}
                style={tabSlideStyle}
              >
                {key === "recettes" && (
          <RecipesView
            recipes={recipes}
            filter={filter}
            search={search}
            favoritesOnly={favoritesOnly}
            onToggleFavorite={toggleFavorite}
            onAddRequest={() => setFormTarget("new")}
            onImportRequest={() => setShowLinkImport(true)}
            onOpen={setOpenRecipe}
            openRecipeId={openRecipe ? openRecipe.id : null}
            onRequestDelete={setDeleteTarget}
            onUpdateRecipe={saveRecipe}
            onEdit={setFormTarget}
            pressDuration={pressDuration}
            showNutriscore={showNutriscore}
            householdId={householdId}
            showToast={showToast}
          />
                )}
                {key === "plan" && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <PlanningView
              recipes={recipes}
              mealPlan={mealPlan}
              onAddMeal={addMealPlanEntry}
              onRemoveMeal={(id) => removeMealsWithUndo([id])}
              onRemoveMeals={removeMealsWithUndo}
              onUpdateMeal={updateMealPlanEntry}
              onReorderMeals={reorderMealPlanEntries}
              onMoveMealSection={moveMealPlanSection}
              onSendToShoppingList={(ids) => {
                generateShoppingList(recipes, ids);
                changeTab("courses");
              }}
              showToast={showToast}
              user={user}
            />
          </Suspense>
                )}
                {key === "frigo" && (
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
              onOpen={setOpenRecipe}
            />
          </Suspense>
                )}
                {key === "courses" && (
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
              </div>
            </ErrorBoundary>
          </Activity>
        ))}
      </main>

      <AnimatePresence>
        {showOnboarding && (
          <Suspense fallback={null}>
            <OnboardingTour currentTab={tab} changeTab={changeTab} onFinish={closeOnboarding} onStartRecipeTour={startRecipeTour} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecipeTour && (
          <Suspense fallback={null}>
            <RecipeEditTour onFinish={closeRecipeTour} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
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
            heroTreatment={heroTreatment}
          />
        )}
      </AnimatePresence>
      {/* Rendu APRÈS RecipeDetail (pas avant) : pour une édition, les deux
          restent montés en même temps (voir onEdit ci-dessus, qui ne referme
          plus la fiche recette) — l'ordre du DOM tranche les égalités de
          z-index (voir .modal-backdrop) et le formulaire doit donc venir en
          second pour s'afficher PAR-DESSUS la fiche, pas dessous. Fermer le
          formulaire (sauvegarde ou annulation) ne fait alors que révéler à
          nouveau la fiche recette déjà ouverte en dessous, à jour, plutôt
          que de retomber sur la grille. */}
      <AnimatePresence>
        {formTarget && (
          <RecipeForm
            onClose={() => setFormTarget(null)}
            onSave={saveRecipe}
            // Même confirmation que depuis le menu d'une carte (DeleteConfirmModal
            // plus bas) : supprimer depuis le formulaire effaçait sans prévenir.
            onDelete={() => { if (formTarget !== "new") setDeleteTarget(formTarget); }}
            initialRecipe={formTarget === "new" ? null : formTarget}
            pressDuration={pressDuration}
          />
        )}
      </AnimatePresence>
      {cookingRecipe && (
        <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} pressDuration={pressDuration} />
      )}
      <AnimatePresence>
        {textModal && (
          <Suspense fallback={null}>
            <TextShareModal title={textModal.title} text={textModal.text} onClose={() => setTextModal(null)} />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pendingImport && (
          <Suspense fallback={null}>
            <ImportConfirmModal
              recipe={pendingImport}
              onConfirm={confirmPendingImport}
              onCancel={() => setPendingImport(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
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
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <Suspense fallback={null}>
            <DeleteConfirmModal
              recipe={deleteTarget}
              onConfirm={() => {
                deleteRecipe(deleteTarget.id);
                showToast(t("app.recipeDeleted"));
                if (openRecipe && openRecipe.id === deleteTarget.id) setOpenRecipe(null);
                setDeleteTarget(null);
              }}
              onCancel={() => setDeleteTarget(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTemplateImport && (
          <Suspense fallback={null}>
            <TextTemplateImportModal
              onClose={() => setShowTemplateImport(false)}
              onImport={(parsed) => { if (parsed) importRecipe(parsed, t("app.sheetImported")); }}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLinkImport && (
          <Suspense fallback={null}>
            <RecipeLinkImportModal
              onClose={() => setShowLinkImport(false)}
              onCreateRecipe={() => setFormTarget("new")}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
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
            heroTreatment={heroTreatment}
            onSetHeroTreatment={setHeroTreatment}
            iconStyle={iconStyle}
            onSetIconStyle={setIconStyle}
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
            onReplayOnboarding={replayOnboarding}
            onReplayRecipeTour={replayRecipeTour}
            onOpenCookbookBuilder={openCookbookBuilder}
            onOpenDiagnostics={openDiagnostics}
          />
        </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCookbookBuilder && (
        <Suspense fallback={null}>
          <CookbookBuilderModal
            recipes={recipes}
            onClose={closeCookbookBuilder}
            showToast={showToast}
          />
        </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiagnosticsPanel && (
        <Suspense fallback={null}>
          <DiagnosticsPanelModal
            onClose={closeDiagnostics}
            showToast={showToast}
            onResetOnboarding={resetOnboarding}
            accountEmail={user?.email ?? null}
            householdName={households.find((h) => h.id === householdId)?.name ?? null}
          />
        </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
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
      </AnimatePresence>
      {/* Zone annoncée par les lecteurs d'écran (toujours présente, le
          message y apparaît) : sans elle, les confirmations restaient muettes. */}
      <Toast toast={toast} onHide={hideToast} />
    </div>
  );
}
