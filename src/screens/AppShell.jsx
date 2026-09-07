import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Heart, Search, Settings, Wand2 } from "lucide-react";

import { FILTERS, TABS } from "../constants";
import { CSS } from "../constants/styles.css";
import { triggerHaptic, nextId, copyText } from "../utils/helpers";
import { getCachedProfile, getProfile } from "../utils/profile";
import { useTranslation } from "../contexts/LanguageContext";

import { NavButton } from "../components/common";
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
  const { mealPlan, addMealPlanEntry, removeMealPlanEntry } = mealPlanApi;
  const { t } = useTranslation();
  const {
    shoppingLists,
    activeListId,
    setActiveListId,
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
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [textModal, setTextModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showTemplateImport, setShowTemplateImport] = useState(false);
  const [showLinkImport, setShowLinkImport] = useState(false);
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [showListsManager, setShowListsManager] = useState(false);

  const touchStart = useRef(null);
  const axisLock = useRef(null);

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

  const filterIndex = FILTERS.findIndex((f) => f.key === filter);

  // Swipe horizontal : bascule les filtres Recettes ("Tout"/"Salé"/"Sucré").
  // Verrouillage d'axe pour ne pas interférer avec un scroll vertical.
  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axisLock.current = null;
  };
  const onTouchMove = (e) => {
    if (touchStart.current == null || axisLock.current != null) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  };
  const onTouchEnd = (e) => {
    if (touchStart.current == null || tab !== "recettes" || axisLock.current !== "x") {
      touchStart.current = null;
      axisLock.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    touchStart.current = null;
    axisLock.current = null;
    if (Math.abs(dx) < 55) return;
    const next = dx < 0 ? Math.min(filterIndex + 1, FILTERS.length - 1) : Math.max(filterIndex - 1, 0);
    setFilter(FILTERS[next].key);
  };

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
          />
        </div>
      )}

      <main className="app-content" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {tab === "recettes" && (
          <RecipesView
            recipes={recipes}
            filter={filter}
            search={search}
            favoritesOnly={favoritesOnly}
            onToggleFavorite={toggleFavorite}
            onAddRequest={() => setFormTarget("new")}
            onOpen={setOpenRecipe}
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
              onSendToShoppingList={(ids) => {
                generateShoppingList(recipes, ids);
                setTab("courses");
              }}
              showToast={showToast}
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
              onOpen={setOpenRecipe}
            />
          </Suspense>
        )}
        {tab === "courses" && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ShoppingView
              recipes={recipes}
              activeList={shoppingLists.find((l) => l.id === activeListId) || null}
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
      </main>

      <nav className="bottom-nav">
        {TABS.map(({ key, icon: Icon }) => (
          <NavButton
            key={key}
            tabKey={key}
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
            lists={shoppingLists}
            activeListId={activeListId}
            onOpen={(id) => setActiveListId(id)}
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
