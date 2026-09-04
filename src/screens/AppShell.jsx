import { useRef, useState } from "react";
import { Heart, Search } from "lucide-react";

import { FILTERS, TABS } from "../constants";
import { CSS } from "../constants/styles.css";
import { triggerHaptic, nextId, copyText } from "../utils/helpers";
import useSecretTrigger from "../hooks/useSecretTrigger";
import { useTranslation } from "../contexts/LanguageContext";

import { NavButton, TextShareModal, ImportConfirmModal, DeleteConfirmModal, TextTemplateImportModal, SecretSettingsModal, ListsManagerModal } from "../components/common";
import { RecipesView, RecipeForm, RecipeDetail, CookMode } from "../components/recipe";
import { FridgeView } from "../components/fridge";
import { ShoppingView } from "../components/shopping";
import { PlanningView } from "../components/planning";

/* ------------------------------------------------------------------ */
/*  COQUILLE APPLICATIVE — onglets, modales, gestes                    */
/*  Ne connaît que ce que les hooks lui exposent (recettes, frigo,      */
/*  courses, synchro) ; ne fait plus aucun appel Supabase directement — */
/*  c'était le rôle de GrimoireDeMorgane.jsx / des hooks data.          */
/* ------------------------------------------------------------------ */
export default function AppShell({
  recipesApi,
  pantryApi,
  mealPlanApi,
  shoppingApi,
  offlineQueueSize,
  connectionStatus,
  pendingImport,
  setPendingImport,
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
  user,
  householdId,
  households,
  onSwitchHousehold,
  onCreateHousehold,
  onRenameHousehold,
  onDeleteHousehold,
  signOut,
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
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [showListsManager, setShowListsManager] = useState(false);

  const touchStart = useRef(null);
  const axisLock = useRef(null);
  const secretHeader = useSecretTrigger(() => setShowSecretSettings(true));

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
        <h1 {...secretHeader}>Le Grimoire de Morgane</h1>
        <p className="subtitle">{t("app.subtitle")}</p>
        {connectionStatus === "offline" && (
          <p className="offline-banner">{t("app.offline")}</p>
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
        )}
        {tab === "frigo" && (
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
        )}
        {tab === "courses" && (
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

      {formTarget && (
        <RecipeForm
          onClose={() => setFormTarget(null)}
          onSave={saveRecipe}
          onDelete={deleteRecipe}
          initialRecipe={formTarget === "new" ? null : formTarget}
          pressDuration={pressDuration}
        />
      )}
      {openRecipe && (
        <RecipeDetail
          key={openRecipe.id}
          recipe={recipes.find((r) => r.id === openRecipe.id) || openRecipe}
          onClose={() => setOpenRecipe(null)}
          onCook={(r) => setCookingRecipe(r)}
          onEdit={(r) => { setOpenRecipe(null); setFormTarget(r); }}
          shareText={shareText}
          showToast={showToast}
        />
      )}
      {cookingRecipe && (
        <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} pressDuration={pressDuration} />
      )}
      {textModal && (
        <TextShareModal title={textModal.title} text={textModal.text} onClose={() => setTextModal(null)} />
      )}
      {pendingImport && (
        <ImportConfirmModal
          recipe={pendingImport}
          onConfirm={confirmPendingImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          recipe={deleteTarget}
          onConfirm={() => {
            deleteRecipe(deleteTarget.id);
            showToast(t("app.recipeDeleted"));
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showTemplateImport && (
        <TextTemplateImportModal
          onClose={() => setShowTemplateImport(false)}
          onImport={(parsed) => importRecipe(parsed, t("app.sheetImported"))}
        />
      )}
      {showSecretSettings && (
        <SecretSettingsModal
          onClose={() => setShowSecretSettings(false)}
          connectionStatus={connectionStatus}
          onExport={exportGrimoire}
          onImportFile={handleImportFile}
          onImportTextRecipe={() => setShowTemplateImport(true)}
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
          showToast={showToast}
          onSignOut={signOut}
        />
      )}
      {showListsManager && (
        <ListsManagerModal
          lists={shoppingLists}
          activeListId={activeListId}
          onOpen={(id) => setActiveListId(id)}
          onCreate={createShoppingList}
          onRename={renameShoppingList}
          onDelete={deleteShoppingList}
          onClose={() => setShowListsManager(false)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
