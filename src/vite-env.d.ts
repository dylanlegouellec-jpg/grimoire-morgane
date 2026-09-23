/// <reference types="vite/client" />

// Injecté au build par Vite (voir vite.config.js, `define`, et
// scripts/countLoc.js) — jamais une vraie variable du bundle navigateur,
// juste une constante littérale substituée à la compilation. Utilisée par
// DiagnosticsPanelModal.tsx ("Pour le kiff").
declare const __GRIMOIRE_LOC__: number;
