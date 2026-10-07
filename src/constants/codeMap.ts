/* ------------------------------------------------------------------ */
/*  DESCRIPTIONS DU CODE — à quoi sert chaque dossier et chaque fichier   */
/*  Affichées dans le Panneau de Diagnostics (Réglages > Développeur >     */
/*  "Code de l'app", components/diagnostics/CodeExplorer.tsx).              */
/*                                                                           */
/*  Écrites À LA MAIN : la liste des fichiers, leur taille et leurs liens     */
/*  d'import, eux, sont calculés au build (scripts/codeMap.ts). Un test         */
/*  (components/diagnostics/__tests__/codeMap.test.ts) échoue si un fichier       */
/*  du projet n'a pas de description ici, ou si une description vise un fichier    */
/*  qui n'existe plus : ajouter un fichier = ajouter sa ligne ci-dessous.            */
/*                                                                                    */
/*  Chaque description : une première phrase qui dit l'essentiel (c'est elle             */
/*  qui s'affiche dans la liste repliée), puis éventuellement des précisions.             */
/*  En français uniquement, comme les commentaires du code.                                */
/* ------------------------------------------------------------------ */

export interface CodeGroup {
  id: string;
  title: string;
  summary: string;
  /** Chemins exacts appartenant au groupe (fichiers posés à la racine). */
  paths?: string[];
  /** Préfixes de chemin ; en cas de recouvrement, le plus long l'emporte. */
  prefixes?: string[];
}

// Ordre d'affichage : du plus global (configuration) au plus fin (composants).
export const CODE_GROUPS: CodeGroup[] = [
  {
    id: "root",
    title: "Racine & configuration",
    summary: "Les fichiers qui décrivent le projet et ses outils : page HTML, dépendances, build, tests, qualité du code, hébergement.",
    paths: [
      "index.html",
      "package.json",
      "vite.config.ts",
      "vitest.config.ts",
      "tsconfig.json",
      "eslint.config.ts",
      "vercel.json",
    ],
  },
  {
    id: "src-root",
    title: "src/ — point d'entrée",
    summary: "Là où l'app démarre : le fichier chargé par le navigateur et le chef d'orchestre qui choisit l'écran à afficher.",
    paths: ["src/main.tsx", "src/GrimoireDeMorgane.tsx", "src/vite-env.d.ts"],
  },
  {
    id: "screens",
    title: "src/screens/ — écrans",
    summary: "Les trois grands écrans de l'app : chargement, connexion et la coque de l'app connectée avec ses onglets.",
    prefixes: ["src/screens/"],
  },
  {
    id: "hooks",
    title: "src/hooks/ — logique et données",
    summary: "Le « cerveau » de l'app : l'état des recettes, du frigo, du plan et des courses, la synchronisation, la connexion, et les gestes tactiles réutilisables.",
    prefixes: ["src/hooks/"],
  },
  {
    id: "contexts",
    title: "src/contexts/ — réglages partagés",
    summary: "Deux réglages (langue, style des icônes) mis à disposition de toute l'app sans les passer de composant en composant.",
    prefixes: ["src/contexts/"],
  },
  {
    id: "utils",
    title: "src/utils/ — fonctions utilitaires",
    summary: "Les fonctions qui ne dessinent rien : accès à Supabase, cache hors ligne, authentification, thème, préférences, nutrition, génération de PDF et d'images.",
    prefixes: ["src/utils/"],
  },
  {
    id: "constants",
    title: "src/constants/ — constantes",
    summary: "Les valeurs fixes de l'app : onglets, filtres, traductions, animations, réglages du livre de cuisine.",
    prefixes: ["src/constants/"],
  },
  {
    id: "styles",
    title: "src/constants/styles/ — feuilles de style",
    summary: "Tout le CSS de l'app, écrit sous forme de texte TypeScript et découpé par domaine (thème, recettes, courses, plan…).",
    prefixes: ["src/constants/styles/"],
  },
  {
    id: "comp-recipe",
    title: "src/components/recipe/ — recettes",
    summary: "Tout ce qui touche aux recettes : la grille et ses cartes, la fiche détail, le formulaire, le mode cuisine, la page de partage.",
    prefixes: ["src/components/recipe/"],
  },
  {
    id: "comp-planning",
    title: "src/components/planning/ — plan de repas",
    summary: "L'onglet Plan : la semaine, ses jours, ses moments de repas, et les fenêtres pour ajouter, déplacer ou supprimer un repas.",
    prefixes: ["src/components/planning/"],
  },
  {
    id: "comp-shopping",
    title: "src/components/shopping/ — courses",
    summary: "L'onglet Courses : les rayons, les articles (cocher, quantité, balayer) et la génération d'une liste depuis des recettes.",
    prefixes: ["src/components/shopping/"],
  },
  {
    id: "comp-fridge",
    title: "src/components/fridge/ — frigo",
    summary: "L'onglet Mon Frigo : ce que tu as sous la main et les recettes qu'on peut faire avec.",
    prefixes: ["src/components/fridge/"],
  },
  {
    id: "comp-common",
    title: "src/components/common/ — composants partagés",
    summary: "Les briques réutilisées partout : modales de confirmation, Réglages et leurs sous-vues, gestion des foyers, partage, boutons et contrôles.",
    prefixes: ["src/components/common/"],
  },
  {
    id: "comp-cookbook",
    title: "src/components/cookbook/ — livre de cuisine",
    summary: "La création d'un livre de recettes à imprimer ou à télécharger en PDF.",
    prefixes: ["src/components/cookbook/"],
  },
  {
    id: "comp-onboarding",
    title: "src/components/onboarding/ — tutoriel",
    summary: "Le tutoriel guidé qui présente l'app au premier lancement.",
    prefixes: ["src/components/onboarding/"],
  },
  {
    id: "comp-diagnostics",
    title: "src/components/diagnostics/ — diagnostics",
    summary: "Le panneau que tu es en train de lire.",
    prefixes: ["src/components/diagnostics/"],
  },
  {
    id: "comp-art",
    title: "src/components/art/ — illustrations",
    summary: "L'image d'une recette : sa photo, ou une illustration dessinée quand il n'y en a pas.",
    prefixes: ["src/components/art/"],
  },
  {
    id: "api",
    title: "api/ — fonctions serveur",
    summary: "Le petit bout de code qui tourne sur le serveur (Vercel), pour ce qui exige une clé secrète ou que le navigateur ne peut pas faire seul.",
    prefixes: ["api/"],
  },
  {
    id: "supabase",
    title: "supabase/ — base de données",
    summary: "L'historique des changements de la base de données (sécurité et fonctions SQL) appliqués à la main dans Supabase.",
    prefixes: ["supabase/"],
  },
  {
    id: "scripts",
    title: "scripts/ — outils de build",
    summary: "Des petits programmes lancés au moment de construire l'app, dont les chiffres affichés dans ce panneau.",
    prefixes: ["scripts/"],
  },
];

// Le chemin d'une requête de données, de l'écran jusqu'à la base — affiché
// dans le menu « Comment l'app est organisée ».
export const CODE_OVERVIEW: { title: string; text: string }[] = [
  {
    title: "1. Le démarrage",
    text:
      "index.html affiche tout de suite l'écran de démarrage, avant même que le code ne soit chargé. Puis main.tsx prend le relais : il installe le journal de debug, enregistre le service worker (ce qui fait de l'app une PWA installable et mise à jour toute seule), pose quelques repères sur la page (app installée, Android, clavier), et monte l'app dans ses filets de sécurité.",
  },
  {
    title: "2. Le chef d'orchestre",
    text:
      "GrimoireDeMorgane.tsx ne fait que du branchement : il lit la session de connexion, les préférences (thème, taille du texte, langue…), appelle les hooks qui portent les données (recettes, frigo, plan, courses) et celui qui les synchronise, puis choisit l'écran : chargement, connexion, ou l'app.",
  },
  {
    title: "3. Le hors-ligne d'abord",
    text:
      "À chaque lancement, l'app lit d'abord la copie locale de tes données (utils/localCache) : elle s'ouvre instantanément, même sans réseau. Les modifications s'affichent tout de suite, puis partent vers Supabase ; si le réseau manque, elles attendent dans une file (utils/offlineQueue) et sont rejouées au retour de la connexion. Les changements des autres membres du foyer arrivent en direct (Realtime). Tout cela est coordonné par hooks/useOfflineSync.",
  },
  {
    title: "4. La coque",
    text:
      "screens/AppShell.tsx est tout ce qu'on voit une fois connecté : l'en-tête, la recherche, les filtres, la barre du bas, les quatre onglets (Recettes, Plan, Frigo, Courses) et toutes les fenêtres. Les onglets secondaires et les fenêtres rares ne sont chargés qu'au premier clic, pour que l'app démarre vite.",
  },
  {
    title: "5. Les données et le serveur",
    text:
      "Les données vivent dans Supabase (utils/supabase.ts parle à sa base en REST pur ; le SDK n'est utilisé que pour le direct). Chaque foyer ne voit que ses propres données (règles RLS, voir supabase/migrations). Pour ce qui exige une clé secrète ou évite les blocages du navigateur — Nutri-Score, estimation nutritionnelle, illustration par IA, légende d'un lien Instagram/TikTok — l'app appelle les fonctions du dossier api/, qui tournent sur Vercel.",
  },
  {
    title: "6. L'apparence",
    text:
      "Le CSS est écrit sous forme de texte TypeScript dans constants/styles/, assemblé par constants/styles.css.ts et injecté dans la page. Le thème clair/sombre repose sur des variables CSS que utils/theme.ts bascule. Les animations utilisent Framer Motion, avec leurs valeurs communes dans constants/motion.ts.",
  },
];

// Chemin -> description. Clé = chemin depuis la racine du projet.
export const CODE_DOCS: Record<string, string> = {
  /* --- Racine & configuration ---------------------------------------- */
  "index.html":
    "La page HTML unique de l'app. Elle charge les polices, pose les repères pour l'installation sur téléphone (icône, couleur de la barre d'état, taille d'écran), et contient l'écran de démarrage affiché avant le chargement du JavaScript, avec le petit script qui lui donne le bon thème clair ou sombre.",
  "package.json":
    "La carte d'identité du projet. Elle liste les dépendances (React, Supabase, Framer Motion, jsPDF…) et les commandes npm : dev, build, test, lint, typecheck.",
  "vite.config.ts":
    "La configuration de Vite, l'outil qui construit l'app. Elle branche React et la PWA (service worker qui attend le feu vert pour se mettre à jour, génération du manifeste et de ses icônes, cache hors ligne des images et des fichiers) et injecte au build les chiffres du Panneau de Diagnostics : lignes de code, carte du code, version et date de construction.",
  "vitest.config.ts":
    "La configuration des tests (Vitest, dans un faux navigateur jsdom). Elle reprend les mêmes constantes injectées que vite.config.ts (lignes de code, carte du code, version), qui doivent rester synchronisées.",
  "tsconfig.json":
    "Les réglages du compilateur TypeScript, en mode strict. TypeScript ne produit aucun fichier ici : il ne fait que vérifier les types (npm run typecheck) sur src, api, scripts et les fichiers de configuration.",
  "eslint.config.ts":
    "Les règles de qualité du code (ESLint) : une série pour le code du navigateur (React, hooks), une autre pour les fonctions serveur et les fichiers de configuration qui tournent sous Node.",
  "vercel.json":
    "Les règles de l'hébergement Vercel : cache d'un an pour les fichiers /assets (leur nom change à chaque version), jamais de cache pour le service worker et le manifeste, et des en-têtes de sécurité (pas d'affichage dans une iframe, pas d'accès caméra, micro ni position).",


  /* --- Point d'entrée ------------------------------------------------- */
  "src/main.tsx":
    "Le point d'entrée : c'est le premier code que le navigateur exécute. Il installe le journal de debug, enregistre le service worker (la nouvelle version attend qu'on la recharge), pose des repères sur la page (app installée, Android, clavier) puis monte l'app dans ses filets de sécurité. Il gère aussi le lien de partage d'une seule recette, sans jamais monter le reste de l'app.",
  "src/GrimoireDeMorgane.tsx":
    "Le chef d'orchestre de l'app. Il branche la connexion, les préférences (thème, taille du texte, langue…), les hooks de données (recettes, frigo, plan, courses) et la synchronisation, puis choisit l'écran à afficher : chargement, connexion ou app. Il ne contient plus de logique métier : elle vit dans src/hooks.",
  "src/vite-env.d.ts":
    "Des déclarations de types pour Vite et pour les constantes injectées au build (nombre de lignes de code, carte du code, version). Aucun code exécuté.",

  /* --- Écrans --------------------------------------------------------- */
  "src/screens/AppShell.tsx":
    "La coque de l'app connectée : l'en-tête, la recherche, les filtres, la barre de navigation, les quatre onglets (Recettes, Plan, Frigo, Courses) avec un fondu de sortie puis d'entrée entre eux, le balayage pour changer de filtre et toutes les modales. Les onglets secondaires et les fenêtres rares sont chargés à la demande.",
  "src/screens/LoadingScreen.tsx":
    "L'écran de chargement : une baguette qui tourne et un message (ouverture du grimoire, vérification de la session…).",
  "src/screens/LoginScreen.tsx":
    "L'écran de connexion avec Google (via Supabase Auth).",

  /* --- Contextes ------------------------------------------------------ */
  "src/contexts/IconStyleContext.tsx":
    "Redistribue le réglage « style des icônes » (emoji ou vectoriel) à tous les composants qui affichent une icône de catégorie, sans le faire descendre de composant en composant.",
  "src/contexts/LanguageContext.tsx":
    "Redistribue la langue choisie (français ou anglais) à toute l'app. Fournit useTranslation(), qui retrouve un texte à partir de sa clé (par exemple « nav.recettes »).",

  /* --- Hooks ---------------------------------------------------------- */
  "src/hooks/useBodyScrollLock.ts":
    "Fige le fond de la page pendant qu'une modale est ouverte, avec la technique qui fonctionne sur iOS. Un compteur partagé gère plusieurs modales empilées, et un second hook dit si une modale est ouverte.",
  "src/hooks/useConnectionStatus.ts":
    "Dit si l'app est vraiment en ligne, hors ligne ou en cours de vérification, grâce à un vrai ping Supabase (le simple « navigator.onLine » est faux sur certains téléphones).",
  "src/hooks/useWakeLock.ts":
    "Empêche l'écran de s'éteindre pendant le mode cuisine, et redemande le verrou quand on revient sur l'app. Sans effet si le navigateur ne sait pas le faire.",
  "src/hooks/useLastSync.ts":
    "Donne l'instant de la dernière synchro réussie avec Supabase et se met à jour tout seul à chaque nouvel échange réussi.",
  "src/hooks/useAppDiagnostics.ts":
    "Réunit ce que le panneau de diagnostics sait de l'app : version, mode, service worker, appareil et chargement de la page. L'appareil se remet à jour tout seul (rotation, redimensionnement, réseau perdu ou retrouvé).",
  "src/hooks/useDismissibleSheet.ts":
    "Gère le geste « tirer vers le bas pour fermer » des modales : la feuille suit le doigt, puis se ferme selon la distance ou la vitesse, sans gêner le défilement du contenu.",
  "src/hooks/useExitThenSwitch.ts":
    "Retarde l'affichage d'une nouvelle valeur le temps qu'un fondu de sortie joue sur l'ancienne : c'est la bascule en deux temps (sortie, puis entrée) utilisée pour changer d'onglet. Gère les changements rapides, l'annulation et « Réduire les animations ».",
  "src/hooks/useFocusTrap.ts":
    "Garde le focus clavier à l'intérieur d'une modale, la ferme avec Échap ou le bouton retour du navigateur, et rend le focus à la fermeture. Gère aussi l'empilement de plusieurs modales.",
  "src/hooks/useHorizontalSwipe.ts":
    "Détecte un balayage horizontal sans jamais gêner le défilement vertical. Réutilisé par exemple pour changer de semaine dans le Plan.",
  "src/hooks/useLongPress.ts":
    "Gère l'appui long (qui ouvre un menu d'actions) : animation d'enfoncement, annulation si le doigt bouge, retour haptique. Partagé par les cartes, la barre de navigation et les lignes de listes.",
  "src/hooks/useMealPlan.ts":
    "L'état du plan de repas (quel plat, quel jour, à quel moment) et ses actions : ajouter, déplacer, réordonner, supprimer. Il est stocké avec les autres données du foyer.",
  "src/hooks/useOfflineSync.ts":
    "Coordonne toute la synchronisation : le chargement initial, la copie dans le stockage local, le rejeu de la file d'attente hors ligne au retour du réseau, et les mises à jour en direct venant des autres membres du foyer. C'est le seul hook qui voit toutes les données à la fois.",
  "src/hooks/usePantry.ts":
    "L'état du frigo : les ingrédients variables, les « basiques » (sel, huile…) et leurs actions. La sauvegarde est faite par useOfflineSync.",
  "src/hooks/useRecipes.ts":
    "L'état des recettes et leurs actions : créer, modifier, supprimer, mettre en favori, importer. L'écran change tout de suite, Supabase suit, et on revient en arrière avec un message si la sauvegarde échoue.",
  "src/hooks/useSecretTrigger.ts":
    "Détecte un triple-clic ou un appui long de 2 secondes pour déclencher une action cachée. Utilisé par le formulaire de recette.",
  "src/hooks/useShoppingLists.ts":
    "L'état des listes de courses (du foyer ou personnelles), leurs articles, quantités et rayons, et la génération d'une liste à partir de recettes avec fusion intelligente des articles.",
  "src/hooks/useSupabaseAuth.ts":
    "Suit la session de connexion en direct (connexion, déconnexion, renouvellement du jeton) et gère les foyers : liste, création, changement de foyer, demandes d'adhésion.",
  "src/hooks/useToast.ts":
    "Affiche un petit message temporaire en bas de l'écran (« Recette ajoutée »…).",

  /* --- Utilitaires ---------------------------------------------------- */
  "src/utils/aiIllustration.ts":
    "Appelle la fonction serveur qui génère une illustration de recette par IA. La clé d'API reste côté serveur, jamais dans le navigateur.",
  "src/utils/appUpdate.ts":
    "Gère « une nouvelle version est prête » : un petit état partagé entre le service worker et l'interface, pour que l'app ne se recharge que quand l'utilisateur le décide (bandeau « Recharger »). Revérifie aussi les mises à jour au retour au premier plan et chaque heure.",
  "src/utils/audioUtils.ts":
    "Les petits sons de l'app (clic, succès), fabriqués à la volée avec l'API Web Audio, sans aucun fichier audio. Respecte le réglage des effets sonores.",
  "src/utils/auth.ts":
    "La connexion avec Google via Supabase Auth, la déconnexion et la session courante, plus la gestion des foyers : liste, création, renommage, membres, rôles et demandes d'adhésion.",
  "src/utils/cookbookPdf.ts":
    "Génère le vrai fichier PDF du livre de cuisine : calcul des sauts de page et du début de chaque recette.",
  "src/utils/devLog.ts":
    "Un journal de debug gardé en mémoire (console, erreurs, requêtes réseau) pour la console du Panneau de Diagnostics. Utile sur un téléphone, où on ne peut pas ouvrir les outils de développement.",
  "src/utils/diagnostics.ts":
    "Les outils de diagnostic de l'app elle-même : version, mode d'affichage (installée ou navigateur), état du service worker, vérification et mise à jour forcée, informations sur l'appareil, chargement de la page, et construction du rapport à copier. Chaque API navigateur est protégée, car beaucoup n'existent pas partout.",
  "src/utils/haptics.ts":
    "Le retour haptique (vibration). Seuls les navigateurs qui exposent l'API de vibration l'utilisent : iOS ne le fait pas, le comportement y est donc différent.",
  "src/utils/helpers.ts":
    "La boîte à outils partagée : rayons de courses et deviner le rayon d'un article, normalisation du texte (accents, majuscules), identifiants, copie dans le presse-papiers, codes et liens de partage d'une recette, libellés de catégorie.",
  "src/utils/householdCache.ts":
    "Garde en cache local la liste des foyers et de leurs membres, pour les afficher même hors ligne.",
  "src/utils/imageCache.ts":
    "Précharge les images des recettes dans le cache du navigateur pour qu'elles restent visibles hors ligne, même celles qu'on n'a jamais fait défiler à l'écran. Sait aussi compter et vider ces caches.",
  "src/utils/imageUpload.ts":
    "Compresse les photos de recettes avant l'envoi puis les envoie dans Supabase Storage, au lieu de les glisser en base64 dans la base de données.",
  "src/utils/ingredients.ts":
    "Garantit qu'un ingrédient a toujours la même forme (quantité, unité, nom, ou titre de section), quelle que soit sa provenance : fiche texte, formulaire, base de données, import.",
  "src/utils/localCache.ts":
    "Copie l'état de l'app (recettes, frigo, listes) dans le stockage local, pour redémarrer instantanément sur les dernières données connues et fonctionner sans réseau.",
  "src/utils/localSettings.ts":
    "Lit et écrit les préférences gardées sur l'appareil : durée de l'appui long, badge Nutri-Score, taille du texte, opacité de la barre, langue, style des icônes, tutoriel terminé… Applique aussi certaines sur la page.",
  "src/utils/notifications.ts":
    "Les notifications locales (fin d'un minuteur du mode cuisine) : demande de permission et affichage.",
  "src/utils/nutriscore.ts":
    "Une estimation locale du Nutri-Score, par heuristique et sans réseau, et les couleurs des notes de A à E. Sert quand la vraie note du serveur n'existe pas encore.",
  "src/utils/nutriscoreClient.ts":
    "Appelle la fonction serveur qui calcule le vrai Nutri-Score d'une recette, une seule fois à sa création ou à sa modification.",
  "src/utils/nutritionClient.ts":
    "Appelle la fonction serveur qui estime les calories et les macronutriments d'une recette (le bouton d'estimation).",
  "src/utils/offlineQueue.ts":
    "La file d'attente des écritures Supabase faites hors ligne, gardée dans le stockage local et rejouée au retour du réseau.",
  "src/utils/onboarding.ts":
    "Synchronise par compte le fait d'avoir terminé le tutoriel. Volontairement séparé du profil : la colonne correspondante doit être ajoutée à la main dans Supabase.",
  "src/utils/planning.ts":
    "Les outils du plan de repas : semaines (du lundi au dimanche), jours, moments du repas, types de plat. Aucune bibliothèque de dates, juste l'objet Date natif.",
  "src/utils/profile.ts":
    "Le profil de l'utilisateur (nom, photo, préférences d'apparence et d'accessibilité), lu et enregistré dans la table profiles, avec cache et file hors ligne.",
  "src/utils/recipeCardCanvas.ts":
    "Dessine une carte de recette en image PNG (une « page de grimoire ») avec Canvas 2D natif, sans bibliothèque, pour la partager.",
  "src/utils/recipeLinkImportClient.ts":
    "Appelle la fonction serveur qui récupère la légende d'un lien Instagram ou TikTok.",
  "src/utils/recipeTranslation.ts":
    "Une traduction approximative du français vers l'anglais pour les textes de recettes, à l'aide d'un dictionnaire. Ce n'est pas une vraie traduction automatique.",
  "src/utils/chunkReload.ts":
    "Quand un écran chargé à la demande n'existe plus sur le serveur (app restée ouverte pendant une mise à jour), recharge la page une seule fois au lieu d'afficher l'écran d'erreur.",
  "src/utils/splash.ts":
    "Retire en fondu l'écran de démarrage de index.html, une fois que l'app a affiché son premier écran.",
  "src/utils/supabase.ts":
    "L'accès à Supabase en REST pur, sans SDK : lire et écrire les tables, avec délai maximum et repli sur la file hors ligne. Fournit aussi le ping de connexion, le comptage de lignes et le mode « simuler hors ligne » du panneau de diagnostics.",
  "src/utils/supabaseClient.ts":
    "Le client officiel Supabase, créé une seule fois. Il n'est utilisé que pour les mises à jour en direct (Realtime), qui exigent le SDK.",
  "src/utils/syncStatus.ts":
    "Garde l'instant de la dernière synchro réussie avec Supabase (lecture ou écriture de données, rejeu de la file hors ligne, changement reçu en direct), dans le stockage local pour qu'il survive à un rechargement. Affiché dans le panneau de diagnostics.",
  "src/utils/templateParser.ts":
    "Lit une fiche de recette en texte libre (« Recette de : … », « Ingrédients : … ») et la transforme en recette structurée. Fournit aussi les plages de la molette de quantité selon l'unité.",
  "src/utils/theme.ts":
    "Le thème clair, sombre ou système : lire et enregistrer le choix, l'appliquer sur la page et régler la couleur de la barre d'état du téléphone.",

  /* --- Constantes ------------------------------------------------------ */
  "src/constants/codeMap.ts":
    "Les descriptions écrites à la main de chaque dossier et de chaque fichier du projet, affichées dans ce panneau. Un test échoue si un fichier n'y est pas décrit.",
  "src/constants/cookbook.ts":
    "Les réglages du livre de cuisine PDF : couleurs de couverture, formats de page, marges et dimensions.",
  "src/constants/index.ts":
    "Les constantes principales : onglets et filtres, habillages du visuel de recette, ingrédients « basiques » par défaut, accès à Supabase et recettes de démonstration.",
  "src/constants/motion.ts":
    "Les constantes d'animation partagées : courbes, ressorts, durées des cartes et des filtres, mouvement des modales. Un seul endroit pour garder la même sensation partout.",
  "src/constants/styles.css.ts":
    "Assemble tous les fichiers de styles en une seule chaîne CSS injectée dans l'app. L'ordre de concaténation compte pour la cascade CSS.",
  "src/constants/translations.ts":
    "Les dictionnaires français et anglais de tous les textes de l'interface, plus des libellés à plat pour traduire des textes déjà enregistrés dans les données.",

  /* --- Styles ---------------------------------------------------------- */
  "src/constants/styles/cookbook.css.ts":
    "Les styles du livre de cuisine : aperçu à l'écran et mise en page d'impression (pages, couverture).",
  "src/constants/styles/cookmode.css.ts":
    "Les styles du mode cuisine : étapes en plein écran, molette de portions, feuille de quantité.",
  "src/constants/styles/diagnostics.css.ts":
    "Les styles du panneau de diagnostics : métriques, pastille de statut, mini console de logs et menus déroulants du code.",
  "src/constants/styles/forms.css.ts":
    "Les styles du formulaire de recette : champs, listes d'ingrédients et d'étapes.",
  "src/constants/styles/fridge.css.ts":
    "Les styles de l'onglet Frigo : compteur, catégories dépliables, puces d'ingrédients.",
  "src/constants/styles/household.css.ts":
    "Les styles de la gestion des foyers : profil, changement de foyer, membres, lignes de réglages.",
  "src/constants/styles/misc.css.ts":
    "Des styles divers : ornement des courses, liens, import et partage, export du livre, message temporaire (toast).",
  "src/constants/styles/modalsBase.css.ts":
    "La barre de navigation du bas (le dock flottant) et la structure commune des modales et des menus d'actions.",
  "src/constants/styles/onboarding.css.ts":
    "Les styles du tutoriel guidé : le voile avec son trou de projecteur et la carte d'explication.",
  "src/constants/styles/planning.css.ts":
    "Les styles de l'onglet Plan : semaine, jours, repas, calendrier, mode réorganisation.",
  "src/constants/styles/publicRecipe.css.ts":
    "Les styles de la page publique d'une seule recette (lien de partage), indépendante du reste de l'app.",
  "src/constants/styles/recipeCards.css.ts":
    "Les styles des recettes : grille, carte, fiche détail, sceaux et bouton « + ».",
  "src/constants/styles/responsive.css.ts":
    "L'impression et la mise en page en paysage / grand écran (barre latérale, grille).",
  "src/constants/styles/settingsIos.css.ts":
    "Les styles des Réglages façon iOS : listes groupées et contrôle segmenté.",
  "src/constants/styles/shell.css.ts":
    "Les styles de la coque : en-tête, recherche, filtres, zone de contenu, fondu et glissement entre onglets, et arrivée de l'app au lancement.",
  "src/constants/styles/shopping.css.ts":
    "Les styles de l'onglet Courses : listes, rayons, lignes d'articles, sélecteur de recettes.",
  "src/constants/styles/theme.css.ts":
    "Les polices, les couleurs (variables clair et sombre), le fond de page et la mise en page de base de l'app.",

  /* --- Composants : recettes ------------------------------------------- */
  "src/components/recipe/CookMode.tsx":
    "Le mode cuisine en plein écran : ingrédients et étapes par groupes, portions ajustables, minuteurs.",
  "src/components/recipe/HeroTreatment.tsx":
    "Les décorations posées sur la photo de la fiche recette, selon l'habillage choisi dans les Réglages.",
  "src/components/recipe/PortionBadge.tsx":
    "La pastille de portions : un appui long ouvre la molette pour changer le nombre.",
  "src/components/recipe/PortionWheel.tsx":
    "La molette de choix du nombre de portions, validée automatiquement après un court délai sans mouvement.",
  "src/components/recipe/PublicRecipeView.tsx":
    "La page publique d'une seule recette (lien de partage). Elle n'affiche rien d'autre du grimoire et ne fait aucune requête vers le reste de l'app.",
  "src/components/recipe/RecipeCard.tsx":
    "Une carte de recette dans la grille : photo, favori, badges, appui long. Elle s'efface puis réapparaît en fondu quand le filtre change, sans jamais être démontée, pour que son image ne se recharge pas.",
  "src/components/recipe/RecipeDetail.tsx":
    "La fiche détail d'une recette : photo avec effet de parallaxe, ingrédients, étapes, et les actions (cuisiner, modifier, partager).",
  "src/components/recipe/RecipeForm.tsx":
    "Le formulaire de création et de modification d'une recette : champs, ingrédients et étapes réordonnables, photo, estimations nutritionnelles, et confirmation si des modifications ne sont pas enregistrées.",
  "src/components/recipe/RecipesView.tsx":
    "L'onglet Recettes : la grille de cartes. Le filtrage (Tout, Salé, Sucré, Favoris, recherche) ne démonte jamais une carte, et un changement de filtre se fait en deux temps : sortie des cartes en fondu, puis entrée en cascade.",
  "src/components/recipe/StepTimer.tsx":
    "Le minuteur d'une étape du mode cuisine, avec une notification quand il est terminé.",
  "src/components/recipe/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants de recettes pour pouvoir les importer depuis un seul chemin.",

  /* --- Composants : plan de repas -------------------------------------- */
  "src/components/planning/AddMealModal.tsx":
    "L'assistant « Ajouter un repas », en étapes : date, moment du repas, type de plat, puis recette ou texte libre.",
  "src/components/planning/CalendarPicker.tsx":
    "Un calendrier mensuel pour choisir n'importe quel jour de l'année.",
  "src/components/planning/CourseOptionsModal.tsx":
    "Le menu d'actions d'un type de plat (« Entrées », « Plats »…), ouvert par appui long.",
  "src/components/planning/DeleteMealSectionConfirmModal.tsx":
    "La confirmation avant de vider toute une section du plan (par exemple « Déjeuner »).",
  "src/components/planning/MealOptionsModal.tsx":
    "Le menu d'actions d'un plat du plan, ouvert par appui long sur sa ligne.",
  "src/components/planning/MealSectionOptionsModal.tsx":
    "Le menu d'actions d'un moment du repas (« Déjeuner », « Dîner »…), dont le mode réorganisation.",
  "src/components/planning/MoveMealSectionModal.tsx":
    "Le choix du moment où déplacer un repas ou un type de plat.",
  "src/components/planning/PlanningCourseGroup.tsx":
    "Le sous-groupe d'un type de plat dans le plan (par exemple « Entrées »).",
  "src/components/planning/PlanningMealGroup.tsx":
    "Le bloc d'un moment du repas (« Déjeuner », « Dîner »…) dans le plan.",
  "src/components/planning/PlanningMealItem.tsx":
    "La ligne d'un plat dans le plan : appui long pour ouvrir son menu, poignée pour le réordonner.",
  "src/components/planning/PlanningMealItemsList.tsx":
    "Une liste de plats qu'on réordonne par glisser-déposer.",
  "src/components/planning/PlanningView.tsx":
    "L'onglet Plan : une semaine à la fois, un bloc par jour, chaque repas relié à une recette. Bascule entre le plan du foyer et le plan personnel, bouton « + » et envoi vers les courses.",
  "src/components/planning/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants du plan.",

  /* --- Composants : courses -------------------------------------------- */
  "src/components/shopping/RecipePickerModal.tsx":
    "La feuille pour choisir des recettes et en générer la liste de courses.",
  "src/components/shopping/ShoppingAisleBlock.tsx":
    "Le bloc d'un rayon de la liste de courses, avec réorganisation par glisser-déposer.",
  "src/components/shopping/ShoppingItemRow.tsx":
    "La ligne d'un article de courses : toucher pour cocher, appui long pour la quantité, balayer pour cocher ou supprimer.",
  "src/components/shopping/ShoppingView.tsx":
    "L'onglet Courses : barre d'ajout d'article, rayons, articles achetés repliables, listes du foyer ou personnelles.",
  "src/components/shopping/SwipeFlourish.tsx":
    "Un ornement qu'on fait glisser du doigt horizontalement, avec un retour élastique.",
  "src/components/shopping/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants des courses.",

  /* --- Composants : frigo ----------------------------------------------- */
  "src/components/fridge/FridgeView.tsx":
    "L'onglet Mon Frigo : les ingrédients que tu as, les recettes réalisables ou presque (avec ce qui manque) et les basiques.",
  "src/components/fridge/pantryUtils.ts":
    "Nettoie et classe les ingrédients du frigo : normalisation des noms, catégories, options proposées, ingrédients manquants d'une recette.",
  "src/components/fridge/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants du frigo.",

  /* --- Composants : partagés --------------------------------------------- */
  "src/components/common/AccessibilitySettingsModal.tsx":
    "La sous-vue « Accessibilité » des Réglages : durée de l'appui long, taille du texte et autres options.",
  "src/components/common/AnimatedNumber.tsx":
    "Un nombre qui défile en douceur d'une valeur à l'autre (compteur de portions, « X/Y articles »).",
  "src/components/common/AppearanceSettingsModal.tsx":
    "La sous-vue « Apparence & langue » des Réglages : thème, langue, style des icônes, habillage de la fiche recette.",
  "src/components/common/CategoryIcon.tsx":
    "Affiche l'icône d'une catégorie en emoji ou en version vectorielle, selon le réglage « style des icônes ».",
  "src/components/common/DataBackupModal.tsx":
    "La sous-vue « Sauvegarde & importation » des Réglages : exporter ou importer le grimoire, importer une fiche texte ou un lien.",
  "src/components/common/DeleteConfirmModal.tsx":
    "La confirmation avant de supprimer une recette.",
  "src/components/common/ErrorBoundary.tsx":
    "Un filet de sécurité : si une erreur inattendue survient, il affiche un message avec un bouton pour réessayer, au lieu d'un écran blanc.",
  "src/components/common/Flourish.tsx":
    "Un petit ornement qui se dessine à chaque ouverture, utilisé comme séparateur dans une trentaine de modales.",
  "src/components/common/HeroTreatmentPreview.tsx":
    "L'aperçu, dans les Réglages, de l'habillage choisi pour la fiche recette, sur une recette factice.",
  "src/components/common/HouseholdManagerModal.tsx":
    "La gestion des foyers : changer de foyer, en créer un, inviter par lien ou QR code, voir les membres et traiter les demandes d'adhésion.",
  "src/components/common/HouseholdMemberOptionsModal.tsx":
    "Le menu d'un membre du foyer (appui long, réservé aux admins) : changer son rôle ou le retirer.",
  "src/components/common/HouseholdOptionsModal.tsx":
    "Le menu d'un foyer (appui long sur son nom) : le renommer ou le supprimer.",
  "src/components/common/ImportConfirmModal.tsx":
    "La confirmation avant d'ajouter une recette reçue par lien ou par code.",
  "src/components/common/JoinHouseholdConfirmModal.tsx":
    "La confirmation d'adhésion à un foyer, ouverte automatiquement quand l'adresse contient une invitation.",
  "src/components/common/LeaveHouseholdConfirmModal.tsx":
    "La confirmation avant de quitter un foyer.",
  "src/components/common/ListsManagerModal.tsx":
    "La gestion des listes de courses : ouvrir, créer, renommer, supprimer.",
  "src/components/common/NavButton.tsx":
    "Un bouton de la barre de navigation du bas, avec la pastille active qui glisse d'un onglet à l'autre, et l'appui long.",
  "src/components/common/ProfileEditor.tsx":
    "La modification du profil : prénom, nom, surnom et photo.",
  "src/components/common/QuantitySheet.tsx":
    "La feuille de saisie de la quantité d'un article de courses (un champ et des boutons), qui remplace l'ancienne molette.",
  "src/components/common/QuantityWheelModal.tsx":
    "Une modale à molette pour choisir une quantité, sans le geste « tirer pour fermer » qui gênerait la molette.",
  "src/components/common/RecipeLinkImportModal.tsx":
    "L'import d'une recette depuis un lien Instagram ou TikTok : affiche la légende récupérée, à recopier dans une nouvelle recette.",
  "src/components/common/RecipeOptionsModal.tsx":
    "Le menu d'actions d'une recette (appui long sur une carte) : photo, illustration générée par IA et autres actions.",
  "src/components/common/Seal.tsx":
    "Le bouton en forme de sceau, utilisé pour l'action principale d'un écran.",
  "src/components/common/SecretSettingsModal.tsx":
    "Les Réglages du grimoire, une liste façon iOS : profil, foyer, apparence, accessibilité, sauvegarde, livre de cuisine, diagnostics. Les sous-vues s'ouvrent par-dessus.",
  "src/components/common/SegmentedControl.tsx":
    "Un contrôle segmenté façon iOS pour un choix à deux ou trois options (thème, langue, taille du texte…), avec une pastille qui glisse.",
  "src/components/common/ShareRecipeModal.tsx":
    "Le partage d'une recette : lien public, code, téléchargement de la fiche et de la carte en image.",
  "src/components/common/Switch.tsx":
    "Un interrupteur on/off.",
  "src/components/common/TextShareModal.tsx":
    "Affiche un texte à copier à la main quand la copie automatique est impossible.",
  "src/components/common/TextTemplateImportModal.tsx":
    "L'import d'une recette depuis une fiche texte collée (« Recette de : … »).",
  "src/components/common/UpdateBanner.tsx":
    "Le bandeau « Nouvelle version disponible » de l'en-tête, avec « Recharger » et « Plus tard ». Rien ne recharge l'app tant que l'utilisateur n'a pas tapé.",
  "src/components/common/UnsavedChangesModal.tsx":
    "Demande quoi faire d'un changement non enregistré : enregistrer, abandonner ou continuer à modifier.",
  "src/components/common/WheelPickerModal.tsx":
    "Un sélecteur à roues générique façon iOS, avec un bouton Enregistrer.",
  "src/components/common/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants partagés pour les importer depuis un seul chemin.",
  "src/components/common/language.ts":
    "La liste des langues proposées dans les Réglages.",
  "src/components/common/pressDuration.ts":
    "Les options de durée de l'appui long et leur format d'affichage.",
  "src/components/common/textSize.ts":
    "Les options de taille du texte des Réglages.",

  /* --- Composants : autres ------------------------------------------------ */
  "src/components/cookbook/CookbookBuilderModal.tsx":
    "L'assistant du livre de cuisine : choix des recettes, couverture, format, aperçu, impression ou téléchargement du PDF.",
  "src/components/cookbook/CookbookDocument.tsx":
    "Le document du livre de cuisine lui-même, partagé entre l'aperçu à l'écran et l'impression.",
  "src/components/onboarding/RecipeEditTour.tsx":
    "Le tuto « Modifier une recette » : met en lumière, étape par étape, les champs du formulaire (nom, temps, ingrédients, étapes, notes, enregistrer). Il s'ouvre sur un formulaire vide, donc rien n'est enregistré.",
  "src/components/onboarding/recipeTourSteps.ts":
    "La liste des étapes du tuto « Modifier une recette » : pour chacune, l'élément du formulaire à éclairer et la clé de ses textes.",
  "src/components/onboarding/OnboardingTour.tsx":
    "Le tutoriel guidé en cinq étapes : un voile avec un projecteur sur chaque zone, qui change d'onglet au besoin et le restaure à la fin.",
  "src/components/diagnostics/DiagnosticsPanelModal.tsx":
    "Le Panneau de Diagnostics : images par seconde et mémoire, version et état de l'app (mises à jour, rapport à copier), appareil, code de l'app, stockage, connexion Supabase, outils de debug, et console de logs filtrable.",
  "src/components/diagnostics/AppDiagnostics.tsx":
    "Affiche les sections « Application » et « Appareil & performance » du panneau : un titre puis des lignes libellé et valeur. Les boutons d'action restent dans le panneau.",
  "src/components/diagnostics/appSections.ts":
    "Construit une seule fois les lignes des sections « Application » et « Appareil & performance », pour que ce qui s'affiche à l'écran et ce qui part dans le rapport copié ne puissent jamais se contredire.",
  "src/components/diagnostics/CodeExplorer.tsx":
    "La section « Code de l'app » du panneau : la répartition des lignes par type de fichier, puis des menus déroulants par dossier puis par fichier, avec le rôle, le nombre de lignes et les liens d'import.",
  "src/components/art/DishArt.tsx":
    "Affiche l'image d'une recette : sa photo (avec de nouvelles tentatives si le réseau flanche) ou, à défaut, une illustration dessinée adaptée au plat.",
  "src/components/art/illustrations.tsx":
    "Les illustrations SVG « aquarelle culinaire » (tarte, chocolat, crêpe, poulet, ratatouille, quiche, dessert…) utilisées quand une recette n'a pas de photo.",
  "src/components/art/index.ts":
    "Le point d'entrée du dossier : il ré-exporte les composants d'illustration.",

  /* --- Serveur, base de données, outils ------------------------------------- */
  "api/extract-recipe-from-link.ts":
    "Fonction serveur : récupère la légende publique d'un post Instagram ou TikTok à partir de son lien (TikTok par son API oEmbed, Instagram en lecture best-effort). Sans IA : le texte est renvoyé tel quel pour être recopié dans une recette.",
  "api/generate-illustration.ts":
    "Fonction serveur : génère une illustration de recette avec un service d'IA, en gardant la clé d'API côté serveur.",
  "api/nutriscore.ts":
    "Fonction serveur : calcule le Nutri-Score (de A à E) d'une recette en interrogeant Open Food Facts, avec un cache et un disjoncteur en mémoire. Appelée une seule fois, à la création ou à la modification d'une recette.",
  "api/nutrition-estimate.ts":
    "Fonction serveur : estime calories, protéines, glucides et lipides par portion en additionnant le profil nutritionnel de chaque ingrédient (Open Food Facts), à la demande.",
  "supabase/README.md":
    "Explique à quoi servent les migrations SQL (garder dans Git les changements de base appliqués à la main), leur convention de nommage, et comment obtenir un instantané complet avec la CLI Supabase.",
  "supabase/migrations/20260922160000_enable_rls_recipes_shopping_lists.sql":
    "Active la sécurité par ligne (RLS) sur les tables des recettes et des listes de courses : chaque compte ne voit et ne modifie que les données des foyers dont il est membre. Avant, n'importe quel compte connecté pouvait tout lire.",
  "supabase/migrations/20260923120059_add_missing_household_request_functions.sql":
    "Crée les cinq fonctions SQL qui manquaient pour gérer les demandes d'adhésion à un foyer : voir les demandes, approuver, refuser, changer le rôle d'un membre, retirer un membre.",
  "scripts/countLoc.ts":
    "Compte les lignes de code de src/ au moment du build, pour le chiffre « lignes de code » du Panneau de Diagnostics.",
  "scripts/buildInfo.ts":
    "Calcule au moment du build le numéro de commit et la date de construction, affichés dans la section « Application » du Panneau de Diagnostics et dans le rapport copié.",
  "scripts/codeMap.ts":
    "Construit au moment du build la carte du code (liste des fichiers, lignes, liens d'import) affichée dans la section « Code de l'app » de ce panneau.",
};

/** Le groupe d'un chemin : chemin exact d'abord, sinon le plus long préfixe. */
export function groupOfPath(path: string): CodeGroup | null {
  const exact = CODE_GROUPS.find((g) => g.paths?.includes(path));
  if (exact) return exact;
  let best: CodeGroup | null = null;
  let bestLength = -1;
  for (const group of CODE_GROUPS) {
    for (const prefix of group.prefixes ?? []) {
      if (path.startsWith(prefix) && prefix.length > bestLength) {
        best = group;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/** La première phrase d'une description : ce qui s'affiche quand le fichier est replié. */
export function shortRole(description: string): string {
  const end = description.indexOf(". ");
  return end === -1 ? description.replace(/\.$/, "") : description.slice(0, end);
}
