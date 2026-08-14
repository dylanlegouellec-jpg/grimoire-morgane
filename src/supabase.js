import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mdvzdbbbueekrbzghetd.supabase.co'
const supabaseKey = 'sb_publishable_0gw7r9y0kbMEWhitsUcNqA_cwhTKNFh' // (ou ta clé anon/publishable standard de Supabase)

export const supabase = createClient(supabaseUrl, supabaseKey)
