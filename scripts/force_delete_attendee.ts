
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceDelete() {
    const eventId = '11fce9f5-f791-4f08-bc58-dd4a59612884';
    const userId = '2602934d-199a-48b4-95aa-fafa3fc83c32';

    console.log(`Force deleting attendee: User ${userId} from Event ${eventId}`);

    const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting:', error);
    } else {
        console.log('Successfully deleted attendee record.');

        // Fix count
        const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);

        console.log('New actual count:', count);

        await supabase
            .from('events')
            .update({ attendee_count: count || 0 })
            .eq('id', eventId);

        console.log('Event count updated.');
    }
}

forceDelete();
