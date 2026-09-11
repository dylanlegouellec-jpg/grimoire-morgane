import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/* ------------------------------------------------------------------ */
/*  CONFIGURATION ESLINT (flat config) — aucun linter n'existait avant   */
/*  ce fichier. Deux blocs, pas un seul : src/ (code navigateur, React)  */
/*  et api/ + fichiers de config à la racine (fonctions serverless       */
/*  Vercel/outillage, exécutés sous Node) n'ont pas les mêmes globales    */
/*  disponibles (window/document vs process/Buffer) — leur donner le      */
/*  même environnement aurait fait passer sous silence de vraies          */
/*  variables non définies dans un sens ou dans l'autre.                  */
/* ------------------------------------------------------------------ */
export default [
  { ignores: ["dist"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
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
    files: ["api/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
