import { supabase } from './supabaseClient';

export const saveNewRecipe = async (recipeData) => {
  // 1. Validation : Ne laisse pas passer de données corrompues
  if (!recipeData.name || recipeData.ingredients.length === 0) {
    throw new Error("Recette invalide : nom ou ingrédients manquants.");
  }

  // 2. Envoi : Utilise .insert() uniquement
  const { data, error } = await supabase
    .from('recipes')
    .insert([{
      name: recipeData.name,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
  return data;
};
