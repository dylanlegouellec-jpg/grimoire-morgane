import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { LocateFixed, X, ZoomIn, ZoomOut } from "lucide-react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import { categoryClass, categoryLabel, triggerHaptic } from "../../utils/helpers";
import { getStoredHeroTreatment } from "../../utils/localSettings";
import { translateRecipeText } from "../../utils/recipeTranslation";
import {
  MAX_ZOOM,
  cardWindow,
  centeredView,
  clampView,
  cropRectFor,
  editorTransform,
  heroWindow,
  panView,
  previewPlacement,
  roundCrop,
  zoomViewAt,
  type CropRect,
  type CropView,
  type CropWindow,
  type Size,
} from "../../utils/photoCrop";
import type { CropSource } from "../../utils/photoCropSource";
import HeroTreatment, { heroTreatmentClassName, isLegendTreatment } from "../recipe/HeroTreatment";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  ÉDITEUR DE RECADRAGE — avant l'envoi d'une photo de recette          */
/*  Ouvert par RecipeOptionsModal (« Ajouter ma propre photo »,           */
/*  « Recadrer la photo ») et CookPhotoPrompt (photo en fin de cuisine),   */
/*  sur une photo DÉJÀ décodée (voir hooks/usePhotoCropSource.ts).         */
/*                                                                        */
/*  Cadre 4:3 = la carte de la grille, qui montre la photo en entier ;     */
/*  la bande pointillée = ce qu'en garde le haut de la fiche (16/10, voir  */
/*  utils/photoCrop.ts, heroWindow). On déplace au doigt (ou à la souris),  */
/*  on zoome à deux doigts, à la glissière ou à la molette ; la photo        */
/*  couvre toujours le cadre (bornes de clampView). Les aperçus en dessous    */
/*  (à côté en paysage) affichent exactement le rendu final.                  */
/*                                                                            */
/*  Gestes : l'état vit dans un ref pendant le geste, React n'est rafraîchi    */
/*  qu'une fois par image (requestAnimationFrame) ; la photo bouge par          */
/*  transform (translate + scale) uniquement.                                    */
/* ------------------------------------------------------------------ */

interface PhotoCropRecipe {
  title?: string | null;
  category?: string | null;
}

interface PhotoCropModalProps {
  source: CropSource;
  recipe: PhotoCropRecipe;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (crop: CropRect) => void;
}

const KEY_PAN_PX = 16;
const KEY_ZOOM_STEP = 1.12;
const WHEEL_ZOOM_SPEED = 0.0015;
const RECENTER_ANIM_MS = 260;

const stopEvent = (e: { stopPropagation: () => void }) => e.stopPropagation();

interface PreviewImageProps {
  url: string;
  crop: CropRect;
  size: Size;
  win: CropWindow;
}

// Photo source placée dans une boîte d'aperçu pour n'en montrer que ce que
// la photo recadrée montrera à cet endroit (voir previewPlacement).
function PreviewImage({ url, crop, size, win }: PreviewImageProps) {
  const p = previewPlacement(crop, size, win);
  return (
    <img
      className="photo-crop-preview-img"
      src={url}
      alt=""
      draggable={false}
      style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }}
    />
  );
}

export default function PhotoCropModal({ source, recipe, saving = false, error = null, onCancel, onSave }: PhotoCropModalProps) {
  const { t, language, dict } = useTranslation();
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const hintId = useId();
  const size = useMemo<Size>(() => ({ width: source.width, height: source.height }), [source.width, source.height]);

  const cancel = useCallback(() => {
    if (!saving) onCancel();
  }, [saving, onCancel]);
  const modalRef = useFocusTrap<HTMLDivElement>(cancel);
  useBodyScrollLock(true);

  const [view, setView] = useState<CropView>(() => centeredView(size));
  const viewRef = useRef(view);
  const rafRef = useRef(0);
  const [animating, setAnimating] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Largeur du cadre à l'écran (change avec la rotation du téléphone) ;
  // l'état, lui, est en pixels source et ne bouge pas. clientWidth et non
  // getBoundingClientRect : à l'ouverture la feuille est encore réduite
  // (scale 0.98, MODAL_SHEET_MOTION) et la largeur « transformée » laissait
  // une bande vide à droite une fois l'animation finie.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const measure = () => setFrameWidth(frame.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
  }, []);

  // Pendant un geste : un seul rendu React par image.
  const scheduleView = useCallback((next: CropView) => {
    viewRef.current = next;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setView(viewRef.current);
    });
  }, []);
  // Hors geste (glissière, clavier, Recentrer) : tout de suite, avec une
  // courte transition si `animate` et que les animations ne sont pas réduites.
  const applyView = useCallback((next: CropView, animate = false) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    viewRef.current = next;
    setView(next);
    if (animate && !reducedMotion) {
      setAnimating(true);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setAnimating(false), RECENTER_ANIM_MS);
    }
  }, [reducedMotion]);

  const frameHeight = (frameWidth * 3) / 4;

  /* --- Doigts / souris ------------------------------------------------ */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const frameRectRef = useRef<DOMRect | null>(null);
  const localPoint = (e: PointerEvent<HTMLDivElement>) => {
    const rect = frameRectRef.current || e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    frameRectRef.current = e.currentTarget.getBoundingClientRect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture indisponible : le geste marche quand même tant que le doigt reste dans le cadre */
    }
    pointersRef.current.set(e.pointerId, localPoint(e));
    if (animating) setAnimating(false);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const prev = pointers.get(e.pointerId);
    if (!prev || !frameWidth) return;
    const before = Array.from(pointers.values());
    const next = localPoint(e);
    pointers.set(e.pointerId, next);
    const after = Array.from(pointers.values());
    let v = viewRef.current;
    if (after.length === 1) {
      v = panView(v, next.x - prev.x, next.y - prev.y, frameWidth, size);
    } else {
      // Deux doigts : le milieu déplace la photo, l'écart la zoome autour de ce milieu.
      const [a0, b0] = before;
      const [a1, b1] = after;
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y);
      const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
      v = panView(v, mid1.x - mid0.x, mid1.y - mid0.y, frameWidth, size);
      if (d0 > 0) v = zoomViewAt(v, v.zoom * (d1 / d0), mid1.x, mid1.y, frameWidth, size);
    }
    scheduleView(v);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) frameRectRef.current = null;
  };

  // Molette (ordinateur) : écouteur natif non passif, pour empêcher la
  // feuille de défiler pendant qu'on zoome.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (e: WheelEvent) => {
      const width = frame.clientWidth;
      if (!width) return;
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      const v = viewRef.current;
      scheduleView(zoomViewAt(v, v.zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), e.clientX - rect.left, e.clientY - rect.top, width, size));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [scheduleView, size]);

  /* --- Clavier, glissière, Recentrer ---------------------------------- */
  const zoomAtCenter = (zoom: number, animate = false) => {
    if (!frameWidth) {
      applyView(clampView({ ...viewRef.current, zoom }, size), animate);
      return;
    }
    applyView(zoomViewAt(viewRef.current, zoom, frameWidth / 2, frameHeight / 2, frameWidth, size), animate);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_PAN_PX * 3 : KEY_PAN_PX;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      // Flèche à droite = voir plus à droite de la photo.
      if (frameWidth) applyView(panView(viewRef.current, moves[e.key][0], moves[e.key][1], frameWidth, size));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAtCenter(viewRef.current.zoom * KEY_ZOOM_STEP, true);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomAtCenter(viewRef.current.zoom / KEY_ZOOM_STEP, true);
    }
  };

  const recenter = () => {
    triggerHaptic(10);
    applyView(centeredView(size), true);
  };

  const save = () => {
    if (saving) return;
    onSave(roundCrop(cropRectFor(viewRef.current, size), size));
  };

  /* --- Rendu ----------------------------------------------------------- */
  const crop = cropRectFor(view, size);
  const tf = editorTransform(view, size, frameWidth);
  const heroWin = heroWindow();
  const heroTreatment = getStoredHeroTreatment();
  const title = translateRecipeText(recipe.title || "", language);
  const catLabel = categoryLabel(recipe);
  const catText = (dict.labels as Record<string, string>)[catLabel] || catLabel;
  const isCentered = Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.cx - size.width / 2) < 0.5 && Math.abs(view.cy - size.height / 2) < 0.5;
  const sheetMotion = reducedMotion ? { ...MODAL_SHEET_MOTION, initial: { y: 0, opacity: 0, scale: 1 }, exit: { y: 0, opacity: 0, scale: 1 } } : MODAL_SHEET_MOTION;

  return createPortal(
    // Portail : dans l'arbre React, l'éditeur reste enfant de l'écran qui
    // l'ouvre (mode cuisine...) — ses touchers et clics n'y remontent pas.
    <motion.div
      className="modal-backdrop photo-crop-backdrop"
      onClick={stopEvent}
      onPointerDown={stopEvent}
      onPointerMove={stopEvent}
      onPointerUp={stopEvent}
      onTouchStart={stopEvent}
      onTouchMove={stopEvent}
      onTouchEnd={stopEvent}
      {...MODAL_BACKDROP_MOTION}
    >
      <motion.div
        className="modal grimoire-page photo-crop-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        {...sheetMotion}
      >
        <div className="photo-crop-header">
          <h2 id={titleId} className="dropcap-title">{t("photoCrop.title")}</h2>
          <button type="button" className="modal-close" onClick={cancel} disabled={saving} aria-label={t("common.close")}><X size={20} /></button>
        </div>

        <div className="photo-crop-body">
          <section className="photo-crop-editor">
            <div
              ref={frameRef}
              className={`photo-crop-frame${animating ? " is-animating" : ""}`}
              tabIndex={0}
              role="group"
              aria-roledescription={t("photoCrop.frameRole")}
              aria-label={t("photoCrop.frameLabel")}
              aria-describedby={hintId}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onLostPointerCapture={handlePointerEnd}
              onKeyDown={handleKeyDown}
              onContextMenu={(e) => e.preventDefault()}
              data-zoom={view.zoom.toFixed(3)}
            >
              <img
                className="photo-crop-img"
                src={source.url}
                alt=""
                draggable={false}
                style={{
                  width: size.width,
                  height: size.height,
                  transform: `translate3d(${tf.tx}px, ${tf.ty}px, 0) scale(${tf.scale})`,
                }}
              />
              <div
                className="photo-crop-hero-band"
                aria-hidden="true"
                style={{ left: `${heroWin.x * 100}%`, top: `${heroWin.y * 100}%`, width: `${heroWin.w * 100}%`, height: `${heroWin.h * 100}%` }}
              />
            </div>
            <p id={hintId} className="hint photo-crop-hint">{t("photoCrop.hint")}</p>

            <div className="photo-crop-tools">
              <label className="photo-crop-zoom">
                <ZoomOut size={18} aria-hidden="true" />
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={view.zoom}
                  aria-label={t("photoCrop.zoom")}
                  aria-valuetext={t("photoCrop.zoomValue", { percent: Math.round(view.zoom * 100) })}
                  onChange={(e) => zoomAtCenter(Number(e.target.value))}
                />
                <ZoomIn size={18} aria-hidden="true" />
              </label>
              <button type="button" className="photo-crop-recenter" onClick={recenter} disabled={isCentered}>
                <LocateFixed size={16} aria-hidden="true" />
                <span>{t("photoCrop.recenter")}</span>
              </button>
            </div>
          </section>

          <section className="photo-crop-previews" aria-labelledby={`${titleId}-previews`}>
            <h4 id={`${titleId}-previews`}>{t("photoCrop.previewsTitle")}</h4>
            <div className="photo-crop-preview-row">
              <figure className="photo-crop-preview photo-crop-preview-card">
                <div className="card photo-crop-card" aria-hidden="true">
                  <div className="photo-crop-window photo-crop-card-window">
                    <PreviewImage url={source.url} crop={crop} size={size} win={cardWindow()} />
                  </div>
                  <div className="card-body">
                    <div className="card-top-row">
                      <span className={`chip ${categoryClass(recipe)}`}>{catText}</span>
                    </div>
                    <h3>{title}</h3>
                  </div>
                </div>
                <figcaption>{t("photoCrop.previewCard")}</figcaption>
              </figure>

              <figure className="photo-crop-preview photo-crop-preview-hero">
                <div className={`detail-hero hero-preview-hero photo-crop-hero ${heroTreatmentClassName(heroTreatment)}`} aria-hidden="true">
                  <PreviewImage url={source.url} crop={crop} size={size} win={heroWin} />
                  <HeroTreatment treatment={heroTreatment} />
                  {isLegendTreatment(heroTreatment) && (
                    <div className="hero-legende-caption">
                      <h2 className="dropcap-title">{title}</h2>
                    </div>
                  )}
                </div>
                <figcaption>{t("photoCrop.previewHero")}</figcaption>
              </figure>
            </div>
          </section>
        </div>

        {error && <p className="photo-crop-error" role="alert">{error}</p>}

        <div className="cookmode-nav photo-crop-actions">
          <Seal tone="gold" onClick={cancel} disabled={saving}>{t("common.cancel")}</Seal>
          <Seal tone="gold" onClick={save} disabled={saving} haptic={20}>
            {saving ? t("photoCrop.saving") : t("photoCrop.save")}
          </Seal>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
