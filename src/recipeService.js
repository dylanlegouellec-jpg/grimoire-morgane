import { supabase } from './supabase';

export const saveNewRecipe = async (recipeData) => {
  // 1. Validation : on vérifie bien le title
  if (!recipeData.title || !recipeData.ingredients || recipeData.ingredients.length === 0) {
    throw new Error("Recette invalide : titre ou ingrédients manquants.");
  }

  // 2. Envoi avec les vrais noms de colonnes de ta table Supabase
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
