/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Injecté au build par Vite (voir vite.config.js, `define`, et
// scripts/countLoc.js) — jamais une vraie variable du bundle navigateur,
// juste une constante littérale substituée à la compilation. Utilisée par
// DiagnosticsPanelModal.tsx ("Pour le kiff").
declare const __GRIMOIRE_LOC__: number;

// Carte du code (fichiers, lignes, liens d'import), injectée au build comme
// __GRIMOIRE_LOC__ ci-dessus (voir scripts/codeMap.ts). Utilisée par
// constants/codeMap.ts et components/diagnostics/CodeExplorer.tsx.
declare const __GRIMOIRE_CODE__: {
  files: ReadonlyArray<{ path: string; lines: number; imports: string[]; importedBy: string[] }>;
  testFileCount: number;
};

// Version de l'app (commit), injectée au build comme __GRIMOIRE_CODE__
// ci-dessus (voir scripts/buildInfo.ts). La date de construction n'est PAS
// dans le code (elle changerait le nom de tous les fichiers à chaque
// déploiement) : elle est lue dans /version.json. Utilisée par
// utils/diagnostics.ts.
declare const __GRIMOIRE_BUILD__: { commit: string; builtAt?: string };
