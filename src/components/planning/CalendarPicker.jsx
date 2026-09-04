import { ChevronLeft, ChevronRight } from "lucide-react";
import { toISODate, isSameDay, localeFor } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/*  CALENDRIER MENSUEL — sélection libre de n'importe quel jour de       */
/*  l'année (voir AddMealModal.jsx, ouvert depuis le FAB "+" de la vue    */
/*  Planification). 42 cases (6 semaines) toujours affichées, complétées  */
/*  par les jours du mois précédent/suivant (grisés mais cliquables,       */
/*  pour ne jamais avoir à naviguer juste pour atteindre le 1er ou le       */
/*  dernier jour d'un mois).                                                */
/* ------------------------------------------------------------------ */

function getMonthGrid(viewMonth) {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startIsoDay = firstOfMonth.getDay() === 0 ? 7 : firstOfMonth.getDay(); // 1 = lundi
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - (startIsoDay - 1));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Initiales Lundi->Dimanche dans la langue active plutôt que des lettres
// françaises figées ("L M M J V S D" n'a pas de sens une fois l'app
// basculée en anglais) — 2024-01-01 est un lundi connu, sert juste de
// point de départ pour dérouler les 7 jours de la semaine.
function getWeekdayLetters(locale) {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d);
  });
}

export default function CalendarPicker({ viewMonth, onChangeMonth, selectedDate, onSelectDate }) {
  const { t, language } = useTranslation();
  const locale = localeFor(language);
  const days = getMonthGrid(viewMonth);
  const today = new Date();
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);
  const weekdayLetters = getWeekdayLetters(locale);

  const goPrevMonth = () => {
    triggerHaptic(10);
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    onChangeMonth(d);
  };
  const goNextMonth = () => {
    triggerHaptic(10);
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    onChangeMonth(d);
  };

  return (
    <div className="calendar-picker">
      <div className="calendar-picker-nav">
        <button type="button" className="planning-week-arrow" onClick={goPrevMonth} aria-label={t("planning.prevMonth")}>
          <ChevronLeft size={16} />
        </button>
        <span className="calendar-picker-month">{monthLabel}</span>
        <button type="button" className="planning-week-arrow" onClick={goNextMonth} aria-label={t("planning.nextMonth")}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="calendar-picker-grid calendar-picker-weekdays" aria-hidden="true">
        {weekdayLetters.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="calendar-picker-grid">
        {days.map((d) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate && isSameDay(d, selectedDate);
          return (
            <button
              key={toISODate(d)}
              type="button"
              className={`calendar-picker-day ${inMonth ? "" : "outside"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => { triggerHaptic(12); onSelectDate(d); }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
