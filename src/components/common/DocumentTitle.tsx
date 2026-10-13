/* ------------------------------------------------------------------ */
/*  TITRE DE L'ONGLET DU NAVIGATEUR                                    */
/*  React 19 place lui-même un <title> rendu par un composant dans le  */
/*  <head> de la page, et le retire quand le composant disparaît : le  */
/*  titre d'origine (index.html) revient alors tout seul. Visible dans */
/*  l'onglet, l'historique, les favoris et parfois la liste des apps   */
/*  ouvertes — pas dans l'app installée en plein écran.                */
/* ------------------------------------------------------------------ */

export const APP_TITLE = "Le Grimoire de Morgane";

export default function DocumentTitle({ page }: { page: string }) {
  const name = page.trim();
  return <title>{name ? `${name} · ${APP_TITLE}` : APP_TITLE}</title>;
}
