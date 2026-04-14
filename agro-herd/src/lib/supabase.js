import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eibmnzhbtioosggctsba.supabase.co';
const supabaseAnonKey = 'sb_publishable_e2RI5mlTyym4Cmi5hNKu4A_uNRstGtk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
