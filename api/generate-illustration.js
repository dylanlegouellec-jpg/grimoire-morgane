// Débarrasse le titre de tout caractère qui pourrait perturber le prompt
// ou l'URL (guillemets, retours à la ligne, crochets...) tout en gardant
// les lettres accentuées, chiffres, espaces, apostrophes et tirets — un
// titre de recette français reste lisible une fois nettoyé.
function sanitizeTitle(title) {
  return String(title || '')
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Habillage stylistique commun à toutes les photos — vocabulaire de
// photographie culinaire professionnelle plutôt que le simple titre brut,
// pour des résultats bien plus qualitatifs et cohérents entre eux.
function buildStyledPrompt(title, category) {
  const flavor = category === 'Sucré'
    ? 'pastry shop style, powdered sugar dust, warm cozy lighting'
    : 'steam rising, fresh green herbs, mouthwatering sauce, dark moody lighting';

  return [
    `professional editorial food photography of ${title}`,
    'gourmet plating',
    'shallow depth of field',
    '85mm lens',
    'soft natural lighting',
    'rustic wooden background',
    'highly detailed texture',
    'delicious',
    '8k resolution',
    flavor,
  ].join(', ');
}

export default async function handler(req, res) {
  // On s'assure que c'est bien une requête POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { title, category } = req.body;
  const cleanTitle = sanitizeTitle(title);
  if (!cleanTitle) {
    return res.status(400).json({ error: 'Titre de recette manquant.' });
  }

  // Le prompt magique, enrichi pour un rendu "photo food styling" plutôt
  // qu'une simple photo générique — voir buildStyledPrompt ci-dessus.
  const prompt = buildStyledPrompt(cleanTitle, category);

  // Pollinations.ai génère l'image directement à partir de l'URL — on
  // encode le texte pour qu'il soit lisible dans un lien web, et on force
  // une haute résolution + le modèle le plus qualitatif disponible côté
  // Pollinations pour du photoréalisme (flux).
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;

  try {
    // On simule un léger délai pour que l'interface affiche bien l'état de chargement
    await new Promise(resolve => setTimeout(resolve, 1500));

    // On renvoie l'URL gratuite à l'application
    res.status(200).json({ imageUrl: imageUrl });

  } catch (error) {
    console.error("Erreur de génération :", error);
    res.status(500).json({ error: "Impossible de générer l'illustration pour le moment." });
  }
}
