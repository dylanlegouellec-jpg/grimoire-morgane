import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/* ------------------------------------------------------------------ */
/*  PWA — mode hors-ligne réel                                          */
/*                                                                        */
/*  Avant : manifest.json existait mais aucun service worker n'était      */
/*  enregistré nulle part dans le code (voir src/main.jsx). Résultat :    */
/*  un utilisateur ouvrant l'app sans réseau n'avait AUCUNE garantie que  */
/*  le shell (HTML/JS/CSS) se charge, quelles que soient les données      */
/*  déjà présentes dans localStorage — l'app pouvait tout simplement ne   */
/*  pas démarrer, précisément dans le scénario visé ("au fond d'un        */
/*  supermarché").                                                        */
/*                                                                        */
/*  Maintenant : vite-plugin-pwa (Workbox) précache l'app shell au         */
/*  premier chargement, et applique une stratégie "NetworkFirst" sur       */
/*  les appels Supabase — on tente toujours le réseau en premier (les      */
/*  données les plus fraîches), mais on retombe sur la dernière réponse    */
/*  connue si le réseau ne répond pas dans les temps. Ça vient en          */
/*  complément, pas en remplacement, de la synchronisation applicative     */
/*  déjà en place (localStorage + file hors-ligne, voir                    */
/*  utils/localCache.js et utils/offlineQueue.js) : le service worker       */
/*  garantit que l'app démarre, la couche applicative garantit qu'elle      */
/*  reste utilisable une fois démarrée.                                    */
/* ------------------------------------------------------------------ */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["Icon.jpeg"],
      manifest: {
        name: "Le Grimoire de Morgane",
        short_name: "Grimoire",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f0e1",
        theme_color: "#f5f0e1",
        orientation: "portrait",
        icons: [
          {
            src: "/Icon.jpeg",
            sizes: "512x512",
            // Corrigé : le fichier est un .jpeg, pas un .png (le
            // manifest.json d'origine annonçait le mauvais type MIME).
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Précache tout ce qui compose l'app elle-même : sans réseau,
        // c'est ce qui permet à l'app de s'ouvrir malgré tout.
        globPatterns: ["**/*.{js,css,html,ico,jpeg,png,svg,webp}"],
        runtimeCaching: [
          {
            // Lectures Supabase (recettes, app_state, shopping_lists) :
            // réseau en premier, secours sur la dernière réponse en
            // cache si le réseau ne répond pas dans les 5s.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images de recettes hébergées dans Supabase Storage : une
            // fois vue, une image reste disponible hors-ligne.
            //
            // Nom de cache en "-v2" : DishArt.jsx ne posait pas
            // crossOrigin="anonymous" sur son <img> avant ce correctif,
            // donc les entrées "-v1" pouvaient contenir des réponses
            // OPAQUES (requêtes no-cors) — un cache opaque est ensuite
            // resservi tel quel à toute requête ultérieure, y compris les
            // fetch() CORS de l'export carte (recipeCardCanvas.js), le
            // rendant illisible pour le canvas quelle que soit la méthode
            // employée côté export. Changer le nom force les navigateurs
            // déjà installés à repartir d'un cache propre plutôt que de
            // rester coincés indéfiniment sur les anciennes entrées
            // opaques (jusqu'à 30 jours sinon, la durée de vie du cache).
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-images-v2",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Illustrations générées par Pollinations.ai (voir
            // api/generate-illustration.js) : chaque URL encode le prompt
            // complet, donc une même URL = toujours la même image — une
            // fois affichée une première fois, la resservir depuis le
            // cache plutôt que le réseau est toujours correct, jamais
            // périmé. CacheFirst, comme les images Supabase Storage
            // ci-dessus, pour qu'une recette illustrée reste consultable
            // sans réseau. Même renommage "-v2" et pour la même raison
            // (voir le commentaire détaillé juste au-dessus).
            urlPattern: ({ url }) => url.hostname === "image.pollinations.ai",
            handler: "CacheFirst",
            options: {
              cacheName: "pollinations-images-v2",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
