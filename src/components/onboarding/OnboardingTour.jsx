import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, CalendarDays, Refrigerator, ShoppingBasket, Sparkles } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import { MODAL_BACKDROP_MOTION } from "../../constants/motion";
import { triggerHaptic } from "../../utils/haptics";
import useFocusTrap from "../../hooks/useFocusTrap";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";

// Un pas par onglet principal, dans l'ordre de la barre de nav (voir
// constants/index.js, TABS) — icône reprise à l'identique pour que la
// carte explicative fasse écho au bouton mis en avant juste en dessous.
const TAB_STEPS = [
  { tabKey: "recettes", Icon: BookOpen },
  { tabKey: "plan", Icon: CalendarDays },
  { tabKey: "frigo", Icon: Refrigerator },
  { tabKey: "courses", Icon: ShoppingBasket },
];

/* ------------------------------------------------------------------ */
/*  TUTORIEL GUIDÉ (ONBOARDING) — surcouche "spotlight" plein écran      */
/*                                                                        */
/*  Comme toutes les autres modales de l'app (RecipeDetail.jsx,           */
/*  SecretSettingsModal.jsx...), N'A PAS son propre prop "open" : c'est     */
/*  l'appelant (AppShell.jsx) qui la monte/démonte conditionnellement,       */
/*  enveloppée dans <AnimatePresence> — jamais un composant qui resterait     */
/*  monté en permanence et déciderait lui-même de rendre `null`, ce qui        */
/*  empêcherait AnimatePresence de jouer la moindre animation de sortie          */
/*  (elle ne détecte qu'un vrai retrait de l'arbre React, jamais un retour         */
/*  anticipé interne à un composant qui reste, lui, toujours monté).                */
/*                                                                                    */
/*  Un seul <motion.div> "trou" (voir .onboarding-hole plus bas, styles/               */
/*  onboarding.css.js) sert de fond assombri ET de découpe à la fois, via                */
/*  la technique du box-shadow géant (0 0 0 9999px) : au lieu de basculer                  */
/*  entre "fond plein" (étape de bienvenue, aucune cible) et "fond troué"                    */
/*  (étapes suivantes), l'étape de bienvenue anime juste ce même trou vers                     */
/*  une taille nulle, centrée à l'écran — un fond plein n'est donc jamais un                     */
/*  second élément à gérer séparément, juste un cas particulier (rayon 0) du                       */
/*  même trou. Framer anime la position/taille de ce trou d'une étape à                              */
/*  l'autre avec un ressort, pour un vrai effet de "spotlight qui se déplace"                          */
/*  plutôt qu'un saut sec entre deux découpes.                                                            */
/*                                                                                                           */
/*  La cible de chaque étape est retrouvée par sélecteur CSS                                                 */
/*  (`.nav-btn[data-tab="..."]`, voir NavButton.jsx) et mesurée via                                            */
/*  getBoundingClientRect() à chaque changement d'étape — jamais une position                                  */
/*  calculée à la main, pour rester juste quelle que soit la mise en page en                                     */
/*  cours (dock flottant en portrait, colonne latérale en paysage, voir                                            */
/*  responsive.css.js, ainsi que le décalage propre à Android/PWA, voir                                              */
/*  modalsBase.css.js) : la même logique fonctionne sans aucune condition                                              */
/*  supplémentaire sur ces trois variantes.                                                                               */
/* ------------------------------------------------------------------ */
export default function OnboardingTour({ currentTab, changeTab, onFinish }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState(null); // { top, left, width, height } en px, ou null tant que non mesuré
  // Onglet actif AVANT l'ouverture du tuto, capturé UNE FOIS au montage —
  // restauré à la fermeture (croix, "Passer", Échap/retour Android, ou fin
  // normale) : le tuto change l'onglet affiché pour illustrer chaque étape
  // en vrai, mais ne doit jamais laisser l'utilisateur sur un onglet
  // différent de celui d'où il est parti une fois refermé.
  const initialTabRef = useRef(currentTab);

  const steps = [
    { tabKey: null, Icon: Sparkles, titleKey: "onboarding.welcomeTitle", bodyKey: "onboarding.welcomeBody" },
    ...TAB_STEPS.map(({ tabKey, Icon }) => ({
      tabKey,
      Icon,
      titleKey: `onboarding.${tabKey}Title`,
      bodyKey: `onboarding.${tabKey}Body`,
    })),
  ];
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Bascule vraiment sur l'onglet mis en avant à chaque étape — l'utilisateur
  // voit la vue réelle derrière le fond assombri, pas juste une icône dans
  // une carte. Ignore la toute première étape (bienvenue, aucun onglet).
  // useLayoutEffect (pas useEffect) : change l'onglet AVANT que le
  // navigateur ne peigne cette frame, pour que le contenu affiché derrière
  // le fond assombri soit déjà le bon dès la première frame de chaque étape.
  useLayoutEffect(() => {
    if (step.tabKey) changeTab(step.tabKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Mesure/positionne le trou sur le bouton de nav de l'étape en cours (ou
  // au centre de l'écran, taille nulle, pour l'étape de bienvenue). Un
  // court re-mesurage différé rattrape le cas où le changement d'onglet
  // ci-dessus ferait bouger légèrement la mise en page (ex. contenu qui
  // n'a pas encore fini de re-render) sans avoir besoin d'un vrai
  // ResizeObserver pour un overlay qui ne vit que quelques secondes.
  useLayoutEffect(() => {
    const measure = () => {
      if (!step.tabKey) {
        setHole({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
        return;
      }
      const el = document.querySelector(`.nav-btn[data-tab="${step.tabKey}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHole({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    const timer = setTimeout(measure, 260);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, [step.tabKey]);

  const close = () => {
    changeTab(initialTabRef.current);
    onFinish();
  };
  // Piège à focus + Échap/retour Android : ferme comme "Passer" (voir plus
  // bas) — un retour arrière au clavier/matériel n'est jamais interprété
  // comme "j'ai terminé le tuto".
  const focusTrapRef = useFocusTrap(close);
  useBodyScrollLock(true);

  const goNext = () => {
    triggerHaptic(15);
    if (isLast) { close(); return; }
    setStepIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (isFirst) return;
    triggerHaptic(10);
    setStepIndex((i) => i - 1);
  };

  // Toujours des nombres (px, implicites pour Framer sur top/left/width/
  // height) — jamais de chaîne "50%" mélangée aux valeurs mesurées, qui
  // casserait l'interpolation de l'animation entre les deux. Avant la toute
  // première mesure (useLayoutEffect ci-dessus, quasi instantané), un point
  // central provisoire de taille nulle produit exactement le même rendu que
  // l'étape de bienvenue une fois mesurée.
  const holeStyle = hole || { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };

  return (
    <motion.div
      ref={focusTrapRef}
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.replayTutorial")}
      {...MODAL_BACKDROP_MOTION}
    >
      <motion.div
        className="onboarding-hole"
        initial={false}
        animate={holeStyle}
        transition={prefersReducedMotion ? { duration: 0.01 } : { type: "spring", stiffness: 260, damping: 28 }}
      />

      <div className="onboarding-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="onboarding-card-icon">
              <step.Icon size={22} />
            </div>
            <h3 className="dropcap-title">{t(step.titleKey)}</h3>
            <Flourish />
            <p>{t(step.bodyKey)}</p>
          </motion.div>
        </AnimatePresence>

        <p className="hint onboarding-step-counter">
          {t("onboarding.stepCounter", { current: stepIndex + 1, total: steps.length })}
        </p>

        <div className="onboarding-footer">
          <button type="button" className="onboarding-skip" onClick={close}>
            {t("onboarding.skip")}
          </button>
          <div className="onboarding-nav-buttons">
            {!isFirst && <Seal tone="gold" onClick={goPrev}>{t("onboarding.previous")}</Seal>}
            <Seal tone="gold" onClick={goNext}>{isLast ? t("onboarding.finish") : t("onboarding.next")}</Seal>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
