
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUser() {
    const userId = '2602934d-199a-48b4-95aa-fafa3fc83c32';

    console.log(`Updating user: ${userId}`);

    const { data, error } = await supabase
        .from('users')
        .update({ full_name: 'Test Student' })
        .eq('id', userId)
        .select();

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('User updated:', data);
    }
}

updateUser();
