/* ------------------------------------------------------------------ */
/*  GET /api/keep-alive — appelée chaque jour par Vercel (vercel.json,  */
/*  « crons »)                                                          */
/*                                                                      */
/*  Plan gratuit Supabase : un projet sans AUCUNE activité pendant 7    */
/*  jours est mis en pause (plus de synchro, plus d'envoi de photos,    */
/*  jusqu'à une relance manuelle depuis le tableau de bord). Une petite */
/*  lecture quotidienne dans la base suffit à compter comme activité,   */
/*  même si personne n'ouvre l'app (vacances…).                         */
/*                                                                      */
/*  Lecture sans risque : clé publique (« anon », déjà présente dans    */
/*  l'app elle-même), une seule ligne demandée ; les règles d'accès     */
/*  (RLS) ne renvoient rien à un visiteur non connecté, mais la requête */
/*  passe bien par la base. Aucune écriture, aucune donnée renvoyée.    */
/* ------------------------------------------------------------------ */

// Mêmes valeurs publiques que src/constants/index.ts (chaque fonction de
// api/ reste autonome, voir nutrition-estimate.ts) ; surchargeables par les
// variables d'environnement Vercel si le projet Supabase change un jour.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mdvzdbbbueekrbzghetd.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdnpkYmJidWVla3JiemdoZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODA2ODcsImV4cCI6MjEwMjI1NjY4N30.nv1eLh9PViCPUk0OZ5herFMJyIcZuUgyJgETQz6IMis";

interface ApiRequest {
  method?: string;
}
interface ApiResponse {
  status(code: number): { json(body: unknown): void };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée" });
    return;
  }
  const started = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/recipes?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    // Le contenu ne sert à rien (vide pour un visiteur) : seule compte la
    // requête, qui réveille / maintient le projet actif.
    await response.text();
    res.status(response.ok ? 200 : 502).json({ ok: response.ok, status: response.status, ms: Date.now() - started });
  } catch (err) {
    res.status(502).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
