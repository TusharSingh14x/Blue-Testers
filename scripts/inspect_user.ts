
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectUser() {
    const userId = '2602934d-199a-48b4-95aa-fafa3fc83c32';

    console.log(`Inspecting user: ${userId}`);

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId); // removed .single() to see if we get empty array or what

    if (error) {
        console.error('Error fetching user:', error);
    } else {
        console.log('User data:', user);
    }
}

inspectUser();
