import { BookOpen, CalendarDays, Refrigerator, ShoppingBasket } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  NAVIGATION : ONGLETS & FILTRES                                     */
/* ------------------------------------------------------------------ */

export const TABS = [
  { key: "recettes", label: "Recettes", icon: BookOpen },
  { key: "plan", label: "Plan", icon: CalendarDays },
  { key: "frigo", label: "Mon Frigo", icon: Refrigerator },
  { key: "courses", label: "Courses", icon: ShoppingBasket },
];
export const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "sale", label: "Salé" },
  { key: "sucre", label: "Sucré" },
];


/* ------------------------------------------------------------------ */
/*  BASIQUES PAR DÉFAUT (Mon Frigo)                                    */
/* ------------------------------------------------------------------ */

export const DEFAULT_BASICS = [
  "Sel", "Poivre", "Huile d'olive", "Vinaigre", "Farine", "Sucre en poudre",
  "Sucre vanillé", "Levure chimique", "Maïzena", "Cacao en poudre", "Miel",
];


/* ------------------------------------------------------------------ */
/*  CONFIGURATION SUPABASE (REST / PostgREST — aucun SDK externe)      */
/* ------------------------------------------------------------------ */


// ⚠️ À compléter avec ton propre projet Supabase.
// Tant que ces valeurs sont vides, l'app fonctionne en mémoire avec les
// recettes de démonstration, sans planter.
export const SUPABASE_URL = "https://mdvzdbbbueekrbzghetd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdnpkYmJidWVla3JiemdoZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODA2ODcsImV4cCI6MjEwMjI1NjY4N30.nv1eLh9PViCPUk0OZ5herFMJyIcZuUgyJgETQz6IMis";

export const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/*
  Schéma SQL attendu (à exécuter dans l'éditeur SQL de Supabase) :

  create table recipes (
    id text primary key,
    title text not null,
    category text not null,        -- exactement "Salé" ou "Sucré"
    time int,
    servings int,
    carbs numeric,
    is_favorite boolean default false,
    notes text,
    illustration_key text,
    ingredients jsonb default '[]',
    steps jsonb default '[]',
    created_at timestamptz default now()
  );

  create table app_state (
    id int primary key,
    pantry jsonb default '[]',
    basics jsonb default '[]',
    press_duration int default 750
  );

  create table shopping_lists (
    id text primary key,
    name text not null,
    items jsonb default '[]',
    created_at timestamptz default now()
  );

  -- Active RLS + une policy adaptée à ton cas d'usage avant la mise en prod.
*/


/* ------------------------------------------------------------------ */
/*  RECETTES DE DÉMONSTRATION                                          */
/*  (utilisées tant que Supabase n'est pas configuré / accessible)     */
/* ------------------------------------------------------------------ */

export function demoRecipes() {
  return [
    {
      id: "r1",
      title: "Kouign-amann",
      category: "Sucré",
      time: 70,
      servings: 8,
      carbs: 45,
      favorite: false,
      illustrationKey: "tarte",
      ingredients: [
        { name: "Farine", qty: 250, unit: "g" },
        { name: "Beurre", qty: 200, unit: "g" },
        { name: "Sucre", qty: 200, unit: "g" },
        { name: "Levure boulangère", qty: 5, unit: "g" },
        { name: "Sel", qty: 5, unit: "g" },
      ],
      steps: [
        "Pétrir la farine, l'eau, la levure et le sel en une pâte souple.",
        "Laisser lever 1 heure, puis étaler et incorporer le beurre en tourant comme une pâte feuilletée.",
        "Saupoudrer généreusement de sucre entre chaque tour.",
        "Façonner en cercle, laisser reposer 20 minutes puis cuire 35 min à 210°C.",
      ],
    },
    {
      id: "r2",
      title: "Poulet rôti aux herbes",
      category: "Salé",
      time: 90,
      servings: 4,
      carbs: 2,
      favorite: false,
      illustrationKey: "poulet",
      ingredients: [
        { name: "Poulet", qty: 1, unit: "pièce" },
        { name: "Ail", qty: 4, unit: "gousses" },
        { name: "Thym", qty: 1, unit: "botte" },
        { name: "Beurre", qty: 40, unit: "g" },
        { name: "Sel", qty: 1, unit: "pincée" },
      ],
      steps: [
        "Préchauffer le four à 200°C.",
        "Frotter le poulet de beurre, d'ail écrasé et de thym.",
        "Enfourner 1h15 en arrosant régulièrement.",
      ],
    },
    {
      id: "r3",
      title: "Fondant au chocolat",
      category: "Sucré",
      time: 35,
      servings: 6,
      carbs: 34,
      favorite: false,
      illustrationKey: "chocolat",
      ingredients: [
        { name: "Chocolat", qty: 200, unit: "g" },
        { name: "Beurre", qty: 150, unit: "g" },
        { name: "Sucre", qty: 150, unit: "g" },
        { name: "Oeuf", qty: 4, unit: "pièce" },
        { name: "Farine", qty: 70, unit: "g" },
      ],
      steps: [
        "Faire fondre le chocolat et le beurre ensemble.",
        "Fouetter les oeufs et le sucre, puis ajouter le chocolat fondu et la farine.",
        "Cuire 12 minutes à 200°C en gardant un coeur coulant.",
      ],
    },
    {
      id: "r4",
      title: "Ratatouille provençale",
      category: "Salé",
      time: 60,
      servings: 4,
      carbs: 12,
      favorite: false,
      illustrationKey: "ratatouille",
      ingredients: [
        { name: "Courgette", qty: 2, unit: "pièce" },
        { name: "Tomate", qty: 4, unit: "pièce" },
        { name: "Oignon", qty: 2, unit: "pièce" },
        { name: "Ail", qty: 2, unit: "gousses" },
        { name: "Huile d'olive", qty: 3, unit: "cuillère à soupe" },
      ],
      steps: [
        "Couper tous les légumes en dés.",
        "Faire revenir l'oignon et l'ail dans l'huile d'olive.",
        "Ajouter les légumes et laisser mijoter 45 minutes à feu doux.",
      ],
    },
    {
      id: "r5",
      title: "Crêpes bretonnes",
      category: "Sucré",
      time: 40,
      servings: 6,
      carbs: 30,
      favorite: false,
      illustrationKey: "crepe",
      ingredients: [
        { name: "Farine", qty: 300, unit: "g" },
        { name: "Oeuf", qty: 4, unit: "pièce" },
        { name: "Lait", qty: 600, unit: "ml" },
        { name: "Beurre", qty: 30, unit: "g" },
        { name: "Sel", qty: 1, unit: "pincée" },
      ],
      steps: [
        "Mélanger la farine et le sel, creuser un puits et ajouter les oeufs.",
        "Délayer progressivement avec le lait pour obtenir une pâte lisse.",
        "Laisser reposer 1 heure, puis cuire à la poêle bien chaude.",
      ],
    },
    {
      id: "r6",
      title: "Quiche lorraine",
      category: "Salé",
      time: 55,
      servings: 6,
      carbs: 22,
      favorite: false,
      illustrationKey: "quiche",
      ingredients: [
        { name: "Pâte brisée", qty: 1, unit: "pièce" },
        { name: "Lardon", qty: 200, unit: "g" },
        { name: "Crème", qty: 200, unit: "ml" },
        { name: "Oeuf", qty: 3, unit: "pièce" },
        { name: "Gruyère", qty: 100, unit: "g" },
      ],
      steps: [
        "Foncer un moule avec la pâte brisée.",
        "Répartir les lardons dorés sur le fond.",
        "Battre les oeufs avec la crème, verser sur la pâte, couvrir de fromage et cuire 35 min à 190°C.",
      ],
    },
  ];
}

