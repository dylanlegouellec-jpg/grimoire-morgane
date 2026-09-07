import { Component } from "react";
import { RotateCcw } from "lucide-react";
import { CSS } from "../../constants/styles.css";

/* ------------------------------------------------------------------ */
/*  FILET DE SÉCURITÉ — capture une erreur JS inattendue dans son sous-  */
/*  arbre React plutôt que de laisser toute l'app planter sur un écran   */
/*  blanc. Doit être une classe : c'est la seule API React qui existe    */
/*  pour ça (getDerivedStateFromError/componentDidCatch), aucun            */
/*  équivalent à base de hooks n'existe à ce jour.                        */
/*                                                                        */
/*  Deux usages dans l'app (voir main.jsx et AppShell.jsx) :               */
/*  - un filet global, autour de toute l'app : dernier recours si         */
/*    quelque chose casse avant même l'affichage des onglets.             */
/*  - un filet par onglet (avec `key={tab}` côté appelant) : une erreur    */
/*    dans UN SEUL onglet (ex. Planning) n'emporte que sa propre zone de   */
/*    contenu — l'en-tête et la navigation basse restent utilisables, et  */
/*    changer d'onglet réinitialise le filet automatiquement (remontage    */
/*    via le changement de `key`).                                         */
/* ------------------------------------------------------------------ */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Toujours au moins dans la console — c'est le seul filet de
    // diagnostic disponible une fois l'app en production, sans outil de
    // suivi d'erreurs connecté à ce projet.
    console.error("Erreur capturée par ErrorBoundary :", error, info && info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      // Filet par onglet : reste dans la mise en page normale (pas de
      // pleine page), pour que l'en-tête/la barre de filtres/la nav basse
      // restent visibles et utilisables — l'utilisateur peut changer
      // d'onglet pour s'en sortir même sans "Réessayer".
      return (
        <div className="view" style={{ textAlign: "center", paddingTop: 40 }}>
          <p className="hint">Cet écran a rencontré un problème inattendu.</p>
          <button type="button" className="seal" onClick={this.handleRetry}>
            <RotateCcw size={15} /> Réessayer
          </button>
        </div>
      );
    }

    // Filet global : peut se déclencher avant même que le reste de l'app
    // (donc <style>{CSS}</style>, normalement posé par AppShell/LoginScreen/
    // LoadingScreen) n'ait eu la moindre chance de s'appliquer — l'inclure
    // ici aussi garantit que cet écran reste lisible même dans ce cas.
    return (
      <div className="loading-screen">
        <style>{CSS}</style>
        <h1 className="login-title">Le Grimoire de Morgane</h1>
        <p className="hint" style={{ fontStyle: "normal", textAlign: "center" }}>
          Une erreur inattendue est survenue. Tes recettes restent en sécurité —
          seul cet affichage a rencontré un problème.
        </p>
        <button type="button" className="seal" onClick={() => window.location.reload()}>
          <RotateCcw size={15} /> Recharger l'application
        </button>
      </div>
    );
  }
}
