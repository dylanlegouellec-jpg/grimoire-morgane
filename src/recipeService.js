import { supabase } from './supabase';

export const saveNewRecipe = async (recipeData) => {
  // 1. Validation sur le titre et les ingrédients
  if (!recipeData.title || !recipeData.ingredients || recipeData.ingredients.length === 0) {
    throw new Error("Recette invalide : titre ou ingrédients manquants.");
  }

  // 2. Envoi avec les noms de colonnes exacts de ta base Supabase
  const { data, error } = await supabase
    .from('recipes')
    .insert([{
      title: recipeData.title,
      category: recipeData.category || 'Général',
      prep_time: recipeData.prep_time || '',
      servings: recipeData.servings || 4,
      ingredients: recipeData.ingredients,
      steps: recipeData.steps || [],
      is_favorite: recipeData.is_favorite || false,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
  return data;
};
