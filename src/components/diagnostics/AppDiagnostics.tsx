import type { ReportSection } from "../../utils/diagnostics";

/* ------------------------------------------------------------------ */
/*  Affiche les sections "Application" et "Appareil & performance" du      */
/*  Panneau de Diagnostics : un titre, puis des lignes libellé / valeur.     */
/*  Les lignes viennent de appSections.ts (les mêmes que dans le rapport copié) ;  */
/*  les boutons d'action (vérifier, forcer, copier) sont dans le panneau lui-même,    */
/*  qui possède déjà la confirmation à deux temps.                                    */
/* ------------------------------------------------------------------ */

export default function AppDiagnostics({ sections }: { sections: ReportSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="ios-group-title">{section.title}</p>
          <div className="ios-group ios-group-padded diagnostics-metrics">
            {section.rows.map(([label, value]) => (
              <div key={label} className="diagnostics-metric">
                <span className="diagnostics-metric-label">{label}</span>
                <span className="diagnostics-metric-value diagnostics-metric-value--text">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
