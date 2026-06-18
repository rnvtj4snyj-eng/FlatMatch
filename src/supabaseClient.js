import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lrvuszggxukwhrcpxflq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_HRRzex36W84BAqe-UkTkQA_2_s35Tre'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
