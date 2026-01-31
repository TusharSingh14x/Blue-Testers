
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAttendees() {
    const eventId = '11fce9f5-f791-4f08-bc58-dd4a59612884';

    console.log(`Checking attendees for event: ${eventId}`);

    // Get raw attendees
    const { data: attendees, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching attendees:', error);
        return;
    }

    console.log(`Found ${attendees.length} raw rows in event_attendees.`);
    console.log(attendees);

    // Check users for these attendees
    for (const attendee of attendees) {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', attendee.user_id)
            .single();

        if (userError || !user) {
            console.log(`!!! ORPHAN RECORD !!! User ID ${attendee.user_id} NOT FOUND in users table.`);
        } else {
            console.log(`User found: ${user.full_name} (${user.id})`);
        }
    }

    // Check event count in events table
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('attendee_count')
        .eq('id', eventId)
        .single();

    console.log('Current count in events table:', event?.attendee_count);
}

checkAttendees();
