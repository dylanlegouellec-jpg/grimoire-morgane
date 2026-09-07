import "@testing-library/jest-dom/vitest";

/* ------------------------------------------------------------------ */
/*  MISE EN PLACE GLOBALE DES TESTS                                     */
/*  jsdom n'implémente pas window.scrollTo (lève une erreur "not         */
/*  implemented" par défaut) — RecipesView.jsx l'appelle au changement    */
/*  de filtre (voir le remonté-en-haut ci-dessous), donc chaque test le    */
/*  déclenchant planterait sans ce filet, même sans jamais vérifier son    */
/*  effet. Un no-op suffit ; les tests qui veulent vérifier l'APPEL lui-    */
/*  même le remplacent par leur propre vi.spyOn().                         */
/* ------------------------------------------------------------------ */
window.scrollTo = () => {};
