import { Copy, Download, FileText, X } from "lucide-react";
import {
  encodeRecipeCode,
  buildImportLink,
  slugify,
  categoryLabel,
  groupIngredients,
  groupSteps,
} from "../../utils/helpers";
import Flourish from "./Flourish";
import Seal from "./Seal";

// Construit un texte brut (pour navigator.share, qui n'accepte pas de HTML
// mis en forme) reprenant la structure de la fiche : titre, ingrédients
// groupés par section, étapes numérotées, remarques.
function buildShareText(recipe, servings, ingredients) {
  const lines = [recipe.title, "", "Ingrédients :"];
  groupIngredients(ingredients).forEach((g) => {
    if (g.title) lines.push(`— ${g.title} —`);
    g.items.forEach((it) => lines.push(`• ${[it.qty, it.unit].filter(Boolean).join(" ")} ${it.name}`.trim()));
  });
  lines.push("", "Préparation :");
  groupSteps(recipe.steps).forEach((g) => {
    if (g.title) lines.push(`— ${g.title} —`);
    g.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  });
  if (recipe.notes) lines.push("", "Remarques :", recipe.notes);
  lines.push("", "— Le Grimoire de Morgane");
  return lines.join("\n");
}

export default function ShareRecipeModal({ recipe, servings, ingredients, onClose, shareText, showToast }) {
  const doCopyCode = () => {
    const code = encodeRecipeCode(recipe);
    if (!code) { showToast("Impossible de générer le code."); return; }
    shareText(buildImportLink(code), "Lien de la recette");
  };

  const doDownloadFile = () => {
    try {
      const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(recipe.title)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Recette téléchargée !");
    } catch {
      showToast("Téléchargement impossible sur cet appareil.");
    }
  };

  // Fiche PDF / Parchemin :
  // 1) Sur mobile compatible, on propose d'abord le partage natif — l'utilisateur
  //    peut alors enregistrer directement dans Fichiers, envoyer par Mail/Messages...
  // 2) Sinon (ou si le partage échoue pour une raison autre qu'une annulation),
  //    on imprime la page elle-même : .print-sheet est la seule chose visible
  //    à l'impression (règles @media print dans styles.css.js). C'est la méthode
  //    fiable sur iOS Safari — contrairement à un iframe caché ou une popup
  //    déclenchée après un setTimeout, qui y sont silencieusement bloqués car
  //    ils ne sont plus considérés comme un geste utilisateur direct.
  const doExportPDF = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: buildShareText(recipe, servings, ingredients),
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // partage annulé par l'utilisateur
        // toute autre erreur : on bascule sur l'impression ci-dessous
      }
    }
    window.print();
  };

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          // Empêche le clic de remonter jusqu'au modal-backdrop de RecipeDetail
          // (cette modale est imbriquée dedans) : sans ça, un clic sur ce fond
          // fermait la fiche recette entière au lieu de fermer juste ce menu.
          e.stopPropagation();
          onClose();
        }}
      >
        <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
          <h2 className="dropcap-title">Partager « {recipe.title} »</h2>
          <Flourish />
          <h4>Transférer vers un autre Grimoire</h4>
          <div className="share-option-row">
            <Seal tone="gold" onClick={doCopyCode}><Copy size={16} /> Copier le code</Seal>
            <Seal tone="gold" onClick={doDownloadFile}><Download size={16} /> Télécharger le fichier</Seal>
          </div>
          <h4 style={{ marginTop: 22 }}>Exporter en fiche</h4>
          <Seal tone="gold" onClick={doExportPDF}><FileText size={16} /> Fiche PDF / Parchemin</Seal>
        </div>
      </div>

      {/* Fiche imprimable — invisible à l'écran (.print-sheet { display: none })
          n'apparaît que dans le rendu d'impression déclenché par window.print(). */}
      <div className="print-sheet" aria-hidden="true">
        <div className="print-page">
          <h1>{recipe.title}</h1>
          <p className="print-type">{categoryLabel(recipe)} · Le Grimoire de Morgane</p>
          <div className="print-meta">
            <span>⏱ {recipe.time} min</span>
            <span>👥 {servings} pers.</span>
            {recipe.carbs ? <span>{Math.round(recipe.carbs * servings)} g glucides (total)</span> : null}
          </div>
          <div className="print-flourish">❦</div>

          <h2>Ingrédients</h2>
          {groupIngredients(ingredients).map((g, i) => (
            <div key={i}>
              {g.title && <h3 className="print-sub">{g.title}</h3>}
              <ul>
                {g.items.map((it, j) => (
                  <li key={j}>{[it.qty, it.unit].filter(Boolean).join(" ")} — {it.name}</li>
                ))}
              </ul>
            </div>
          ))}

          <h2>Préparation</h2>
          {groupSteps(recipe.steps).map((g, i) => (
            <div key={i}>
              {g.title && <h3 className="print-sub">{g.title}</h3>}
              <ol>
                {g.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            </div>
          ))}

          {recipe.notes && (
            <>
              <h2>Remarques &amp; astuces</h2>
              <p className="print-notes">{recipe.notes}</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
