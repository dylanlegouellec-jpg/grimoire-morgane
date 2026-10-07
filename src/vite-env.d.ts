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
