import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  RELEVÉ VIEWPORT — TEMPORAIRE, À RETIRER                             */
/*                                                                       */
/*  En PWA installée sur iPhone, la page ne dessine jamais plus bas que  */
/*  ~812pt sur un écran de 874pt : la nav ancrée en "bottom: 0" se pose   */
/*  62pt trop haut et le voile des modales ne descend pas jusqu'en bas.   */
/*  Plusieurs causes ont été écartées à l'aveugle (mesure JS, portail     */
/*  vers <body>, conteneur de défilement involontaire, backdrop-filter,   */
/*  style de la barre d'état) — chaque essai coûtant un déploiement et    */
/*  une réinstallation complète de l'app. Ce bloc affiche d'un coup les   */
/*  valeurs qui tranchent, pour qu'une seule capture d'écran suffise.     */
/*  Rendu en bas des Réglages, discret : aucun intérêt une fois la cause  */
/*  établie, à supprimer à ce moment-là.                                  */
/* ------------------------------------------------------------------ */
function measure() {
  // env(safe-area-inset-*) n'est pas lisible directement en JS : on le fait
  // résoudre par le moteur sur un élément sonde, puis on lit la valeur
  // calculée (en px).
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;" +
    "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);";
  document.body.appendChild(probe);
  const probeStyle = getComputedStyle(probe);
  const safeTop = probeStyle.paddingTop;
  const safeBottom = probeStyle.paddingBottom;
  probe.remove();

  const nav = document.querySelector(".bottom-nav");
  const navRect = nav ? nav.getBoundingClientRect() : null;
  const vv = window.visualViewport;

  return [
    `innerHeight ${window.innerHeight} / clientHeight ${document.documentElement.clientHeight}`,
    `visualViewport ${vv ? Math.round(vv.height) : "n/a"} / offsetTop ${vv ? Math.round(vv.offsetTop) : "n/a"}`,
    `screen ${window.screen ? window.screen.height : "n/a"} / avail ${window.screen ? window.screen.availHeight : "n/a"}`,
    `safe-area haut ${safeTop} / bas ${safeBottom}`,
    `nav bas ${navRect ? Math.round(navRect.bottom) : "n/a"} / haut ${navRect ? Math.round(navRect.top) : "n/a"}`,
    `document ${document.documentElement.scrollHeight} / dpr ${window.devicePixelRatio}`,
    `standalone ${window.matchMedia("(display-mode: standalone)").matches ? "oui" : "non"}${window.navigator.standalone ? " (ios)" : ""}`,
  ];
}

export default function ViewportDiagnostic() {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const update = () => setLines(measure());
    update();
    // Les valeurs bougent après le lancement sur iOS (la webview se
    // restabilise une seconde ou deux plus tard) : on remesure un peu plus
    // tard et à chaque redimensionnement plutôt que de figer l'instantané
    // du montage, qui a déjà induit en erreur par le passé.
    const timer = setTimeout(update, 2500);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <>
      <p className="ios-group-title">Relevé viewport (diagnostic)</p>
      <div className="ios-group ios-group-padded">
        <div className="viewport-diagnostic">
          {lines.map((line) => <div key={line}>{line}</div>)}
        </div>
      </div>
    </>
  );
}
