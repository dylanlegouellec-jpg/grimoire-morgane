import { supabase } from './supabase';

// 1. Récupérer toutes les recettes
export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipe')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des recettes :", error);
    return [];
  }
  return data;
}

// 2. Enregistrer une nouvelle recette
export async function saveNewRecipe(recipeData) {
  const { data, error } = await supabase
    .from('recipe')
    .insert([{
      title: recipeData.title,
      category: recipeData.category || 'Général',
      prep_time: recipeData.prep_time || '',
      servings: recipeData.servings || 4,
      carbs_per_serving: recipeData.carbs_per_serving || 0,
      ingredients: recipeData.ingredients,
      steps: recipeData.steps,
      is_favorite: recipeData.is_favorite || false,
      created_at: new Date().toISOString()
    }]);

  if (error) {
    throw error;
  }
  return data;
}
