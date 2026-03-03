import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jryihnqkegjvkkvsvmgu.supabase.co'
const supabaseKey = 'sb_publishable_TESZIGL7-48W5PSxpFMF-w_oOE6JFDT'

export const supabase = createClient(supabaseUrl, supabaseKey)