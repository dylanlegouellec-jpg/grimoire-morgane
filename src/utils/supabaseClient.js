import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_READY } from "../constants";

/* ------------------------------------------------------------------ */
/*  CLIENT SUPABASE (SDK) — réservé au Realtime                        */
/*  Le reste de l'app parle à Supabase en REST pur (utils/supabase.js, */
/*  via fetch), plus simple et sans dépendance. Mais l'abonnement       */
/*  "postgres_changes" nécessite le SDK officiel, qui gère la connexion */
/*  WebSocket. Un seul client est créé et réutilisé pour toute l'app :  */
/*  en recréer un à chaque rendu ouvrirait une nouvelle connexion à     */
/*  chaque fois, ce que le plan gratuit Supabase ne pardonne pas.       */
/* ------------------------------------------------------------------ */
let client = null;

export function getSupabaseClient() {
  if (!SUPABASE_READY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        // Plan gratuit Supabase : on reste volontairement modeste pour
        // rester dans les quotas (pas de flot d'évènements par seconde).
        params: { eventsPerSecond: 5 },
      },
    });
  }
  return client;
}
