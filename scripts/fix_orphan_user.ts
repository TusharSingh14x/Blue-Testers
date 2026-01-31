
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrphanUser() {
    const orphanUserId = '2602934d-199a-48b4-95aa-fafa3fc83c32';

    console.log(`Attempting to fix orphan user: ${orphanUserId}`);

    // 1. Get user from Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(orphanUserId);

    if (authError || !user) {
        console.error('Error fetching user from Auth:', authError);
        return;
    }

    console.log(`Found user in Auth: ${user.email}`);

    // 2. Insert into public.users
    // extract metadata
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Restored User';
    const role = user.user_metadata?.role || 'user';

    const { error: insertError } = await supabase
        .from('users')
        .insert({
            id: orphanUserId,
            email: user.email,
            full_name: fullName,
            role: role
        });

    if (insertError) {
        console.error('Error inserting into public.users:', insertError);
    } else {
        console.log('Successfully restored user to public.users!');
    }
}

fixOrphanUser();
