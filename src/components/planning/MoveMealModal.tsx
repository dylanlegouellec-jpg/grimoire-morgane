import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { MEAL_TYPES, toISODate, formatDayLabel } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "../common/Flourish";
import CategoryIcon from "../common/CategoryIcon";
import Seal from "../common/Seal";
import CalendarPicker from "./CalendarPicker";
import { parseISODateLocal, type MealSlot } from "./planningMove";

interface MoveMealModalProps {
  label: string;
  current: MealSlot;
  onClose: () => void;
  onConfirm: (slot: MealSlot) => void;
}

/* ------------------------------------------------------------------ */
/*  « DÉPLACER… » UN PLAT DU PLAN — ouvert depuis le menu d'appui long     */
/*  d'une ligne (voir MealOptionsModal.tsx/PlanningMealItem.tsx). Chemin    */
/*  accessible (clavier, lecteur d'écran) et repli du glisser-déposer à     */
/*  la poignée (voir planningMove.ts) — et seul moyen d'envoyer un plat      */
/*  vers une AUTRE semaine. Une seule feuille plutôt qu'un assistant en      */
/*  étapes : le calendrier (CalendarPicker.tsx, même que AddMealModal.tsx)    */
/*  et la liste des moments (même .ios-group que MoveMealSectionModal.tsx)     */
/*  sont tous deux préréglés sur l'emplacement ACTUEL, on ne change que ce      */
/*  qu'on veut ; « Déplacer ici » reste désactivé tant que rien n'a changé.      */
/* ------------------------------------------------------------------ */
export default function MoveMealModal({ label, current, onClose, onConfirm }: MoveMealModalProps) {
  const { t, language } = useTranslation();
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseISODateLocal(current.date));
  const [viewMonth, setViewMonth] = useState<Date>(() => parseISODateLocal(current.date));
  const [mealType, setMealType] = useState(current.mealType);

  const targetIso = toISODate(selectedDate);
  const unchanged = targetIso === current.date && mealType === current.mealType;
  const mealLabel = t(`mealTypes.${mealType}`);
  const dayLabel = formatDayLabel(selectedDate, language);

  const pickMeal = (key: string) => {
    triggerHaptic(12);
    setMealType(key);
  };

  const confirm = () => {
    if (unchanged) return;
    onConfirm({ date: targetIso, mealType });
  };

  return createPortal(
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page planning-move-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-move-title"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title" id="planning-move-title">{t("planningMove.title", { label })}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("planningMove.currentSlot", { day: formatDayLabel(parseISODateLocal(current.date), language), meal: t(`mealTypes.${current.mealType}`) })}
        </p>

        <h3 className="planning-move-subtitle">{t("planningMove.dayHeading")}</h3>
        <CalendarPicker
          viewMonth={viewMonth}
          onChangeMonth={setViewMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <h3 className="planning-move-subtitle" id="planning-move-meal-heading">{t("planningMove.mealHeading")}</h3>
        <div className="ios-group" role="radiogroup" aria-labelledby="planning-move-meal-heading">
          {MEAL_TYPES.map((m) => {
            const selected = m.key === mealType;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`ios-row ${selected ? "selected" : ""}`}
                onClick={() => pickMeal(m.key)}
              >
                <CategoryIcon
                  className="ios-row-icon"
                  style={{ background: "var(--surface-strong)", fontSize: "1.05rem" }}
                  emoji={m.icon}
                  icon={m.vectorIcon}
                />
                <span className="ios-row-title">{t(`mealTypes.${m.key}`)}</span>
                {selected && <Check size={18} className="ios-row-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="planning-move-actions">
          <p className="planning-move-summary" aria-live="polite">
            {unchanged ? t("planningMove.unchangedHint") : t("planningMove.targetSummary", { day: dayLabel, meal: mealLabel })}
          </p>
          <Seal tone="gold" onClick={confirm} disabled={unchanged}>{t("planningMove.confirm")}</Seal>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
