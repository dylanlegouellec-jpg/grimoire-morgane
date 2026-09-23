import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/* ------------------------------------------------------------------ */
/*  CONFIGURATION ESLINT (flat config) — aucun linter n'existait avant   */
/*  ce fichier. Deux blocs, pas un seul : src/ (code navigateur, React)  */
/*  et api/ + fichiers de config à la racine (fonctions serverless       */
/*  Vercel/outillage, exécutés sous Node) n'ont pas les mêmes globales    */
/*  disponibles (window/document vs process/Buffer) — leur donner le      */
/*  même environnement aurait fait passer sous silence de vraies          */
/*  variables non définies dans un sens ou dans l'autre.                  */
/*                                                                         */
/*  Le bloc src/**\/*.{ts,tsx} ci-dessous n'existait pas non plus : avant  */
/*  lui, "files" ne matchait que .js/.jsx, donc chaque fichier converti   */
/*  en TypeScript pendant la migration était silencieusement ignoré par   */
/*  ESLint (flat config : un fichier qui ne matche aucun bloc n'est pas   */
/*  une erreur, juste 0 règle appliquée) — `npm run lint` rapportait "0    */
/*  problème" en n'ayant jamais réellement lu la quasi-totalité de src/.  */
/*  Volontairement pas de linting "type-aware" (parserOptions.project) :  */
/*  ça exige un vrai programme TS complet par fichier, nettement plus     */
/*  lent, pour un gain marginal ici — tsc --noEmit (npm run typecheck)    */
/*  couvre déjà tout ce que ces règles-là auraient apporté.               */
/* ------------------------------------------------------------------ */
export default [
  { ignores: ["dist"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Injectée au build par Vite/Vitest (voir vite.config.ts,
        // vitest.config.ts, scripts/countLoc.ts) — jamais une vraie
        // variable du bundle navigateur, juste une constante littérale
        // substituée à la compilation.
        __GRIMOIRE_LOC__: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Seule règle reprise d'eslint-plugin-react (pas tout son ruleset
      // "recommended", qui aurait fait surgir d'un coup des dizaines
      // d'avertissements sans rapport sur le reste du projet) : sans elle,
      // no-unused-vars (ci-dessus, via js.configs.recommended) ne sait pas
      // qu'un import utilisé UNIQUEMENT en JSX (ex. <Search size={15} />)
      // compte comme une utilisation réelle — signalé comme des imports
      // "jamais utilisés" alors qu'ils l'étaient bel et bien, partout où le
      // seul usage d'un composant/icône est du JSX.
      "react/jsx-uses-vars": "error",
      // "Vite Fast Refresh" (rechargement à chaud) exige qu'un fichier de
      // composant n'exporte QUE des composants — un fichier qui exporte
      // aussi une constante ou une fonction utilitaire casse le rechargement
      // à chaud pour ce fichier (rechargement complet de la page à la place).
      // allowConstantExport: true tolère les exports de constantes simples
      // à côté d'un composant, seul cas qui ne pose pas vraiment problème
      // en pratique — sans lui, plusieurs fichiers du projet (barrels et
      // fichiers combinant un composant et ses constantes de config)
      // déclencheraient cet avertissement sans gain réel.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        __GRIMOIRE_LOC__: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.reduce((acc, cfg) => ({ ...acc, ...cfg.rules }), {}),
      ...reactHooks.configs.recommended.rules,
      "react/jsx-uses-vars": "error",
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // allowConstantExport ne couvre que les littéraux primitifs
          // (string/number/boolean), pas les objets/tableaux/fonctions —
          // ces exports precis sont des hooks de contexte (useIconStyle,
          // useTranslation) ou des données/utilitaires volontairement
          // gardés à côté du(des) composant(s) qui les utilisent, jamais
          // remontés (les fichiers dont ils dépendent ne changent qu'au
          // build complet, jamais via Fast Refresh en développement).
          allowExportNames: [
            "ILLUSTRATIONS",
            "DISH_MATCH",
            "resolveIllustrationKey",
            "formatIngredientLine",
            "heroTreatmentClassName",
            "isLegendTreatment",
            "UNIT_OPTIONS",
            "useIconStyle",
            "useTranslation",
          ],
        },
      ],
      // no-unused-vars (JS) et no-undef ne comprennent pas les types
      // (interfaces/types importés en `import type`, paramètres de type
      // génériques...) : les versions @typescript-eslint les remplacent
      // pour éviter des faux positifs sur du code par ailleurs correct.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
      // Pattern déjà établi dans tout le projet, avant même la migration
      // TypeScript, pour appeler un callback optionnel sans le réécrire en
      // "if (x) x()" (ex. `showToast && showToast(...)`, `onSave &&
      // onSave(...)`) — allowShortCircuit tolère précisément ce cas au lieu
      // de forcer une réécriture de dizaines de sites d'appel préexistants.
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      // De nombreux boundary-casts établis pendant la migration passent
      // volontairement par `unknown` puis un type précis plutôt que par
      // `any` — cette règle reste donc activée (comportement par défaut de
      // tseslint.configs.recommended) pour empêcher un `any` de s'y
      // glisser plus tard sans y avoir réfléchi.
    },
  },
  {
    files: ["api/**/*.js", "*.config.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  {
    // Même bloc Node que ci-dessus, pour les fichiers déjà convertis en
    // TypeScript (api/, scripts/, *.config.ts — ce fichier lui-même y
    // compris, via jiti, seul ajout nécessaire côté outillage : ESLint
    // 9.9+ détecte et charge un eslint.config.ts automatiquement dès que
    // jiti est présent). Pas de linting "type-aware" ici non plus, même
    // choix que pour le bloc src/**/*.{ts,tsx} plus haut.
    files: ["api/**/*.ts", "*.config.ts", "scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      globals: globals.node,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.reduce((acc, cfg) => ({ ...acc, ...cfg.rules }), {}),
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
];
