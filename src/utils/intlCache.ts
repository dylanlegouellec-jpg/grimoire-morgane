/* ------------------------------------------------------------------ */
/*  FORMATEURS Intl RÉUTILISÉS                                          */
/*  Créer un Intl.Collator / Intl.DateTimeFormat est coûteux (le         */
/*  navigateur charge les données de la langue à chaque fois) — et       */
/*  `a.localeCompare(b, "fr")` en crée un À CHAQUE comparaison d'un tri.  */
/*  Mesuré sur téléphone d'entrée de gamme simulé : ~95 ms par affichage */
/*  de l'onglet Plan, ~40 ms au démarrage pour le tri des recettes.      */
/*  Ici, chaque formateur n'est créé qu'une fois, puis réutilisé.        */
/* ------------------------------------------------------------------ */

const frCollator = new Intl.Collator("fr");

/** Même résultat que `a.localeCompare(b, "fr")`, sans recréer de collator. */
export const compareFr = (a: string, b: string): number => frCollator.compare(a, b);

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** Intl.DateTimeFormat mis en cache par langue + options. */
export function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let fmt = dateFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, fmt);
  }
  return fmt;
}
