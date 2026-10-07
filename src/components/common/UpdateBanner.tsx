import { useSyncExternalStore } from "react";
import { applyUpdate, dismissUpdate, getUpdateState, subscribeUpdate } from "../../utils/appUpdate";
import { useTranslation } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  BANDEAU « NOUVELLE VERSION DISPONIBLE » — dans l'en-tête, comme le      */
/*  bandeau « Hors ligne » : discret, sans rien recouvrir. « Recharger »      */
/*  applique la mise à jour ; « Plus tard » le masque jusqu'au prochain        */
/*  lancement. Rien ne recharge jamais l'app sans que l'utilisateur ait tapé :  */
/*  ouvert dans l'en-tête, il est de toute façon caché derrière toute modale     */
/*  (dont le formulaire de recette), donc impossible de le toucher en pleine saisie. */
/* ------------------------------------------------------------------ */

export default function UpdateBanner() {
  const { t } = useTranslation();
  const { available, dismissed } = useSyncExternalStore(subscribeUpdate, getUpdateState, getUpdateState);
  if (!available || dismissed) return null;
  return (
    <p className="update-banner" role="status">
      <span className="update-banner-text">{t("app.updateAvailable")}</span>
      <button type="button" className="update-banner-reload" onClick={() => { triggerHaptic(15); applyUpdate(); }}>
        {t("app.updateReload")}
      </button>
      <button type="button" className="update-banner-later" onClick={() => { triggerHaptic(10); dismissUpdate(); }}>
        {t("app.updateLater")}
      </button>
    </p>
  );
}
