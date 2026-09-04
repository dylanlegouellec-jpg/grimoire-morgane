/* ------------------------------------------------------------------ */
/*  GÉNÉRATION D'ILLUSTRATION PAR IA                                   */
/*                                                                      */
/*  Aucune clé d'API ne doit jamais être exposée depuis le navigateur  */
/*  (elle serait visible dans le code source de l'app). Cette fonction */
/*  appelle donc un endpoint côté serveur — par exemple une Vercel     */
/*  Serverless Function (fichier api/generate-illustration.js à créer  */
/*  toi-même) qui relaie la requête vers le service d'IA de ton choix  */
/*  (OpenAI Images, Stability AI, etc.) et renvoie { imageUrl }.       */
/*                                                                      */
/*  Tant que cet endpoint n'existe pas, l'appel échoue proprement et   */
/*  RecipeOptionsModal affiche un message d'erreur — l'app ne casse    */
/*  jamais, elle se contente de ne pas pouvoir générer d'image.        */
/* ------------------------------------------------------------------ */

const AI_ENDPOINT = import.meta.env.VITE_AI_ILLUSTRATION_ENDPOINT || "/api/generate-illustration";

export async function generateAIIllustration(recipe) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: recipe.title,
      category: recipe.category,
      prompt: buildPrompt(recipe),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Génération IA impossible (${res.status}) ${text}`);
  }
  const data = await res.json();
  if (!data || !data.imageUrl) throw new Error("Réponse IA invalide (imageUrl manquant)");
  return data.imageUrl; // URL distante ou data: URI base64, les deux fonctionnent avec DishArt
}

function buildPrompt(recipe) {
  const genre = recipe.category === "Sucré" ? "un dessert" : "un plat salé";
  return `Illustration culinaire façon aquarelle ancienne, tons chauds et terreux, pour ${genre} nommé "${recipe.title}". Style peinture de grimoire de cuisine fait main, sans texte, sans photographie.`;
}
