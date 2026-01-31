import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { full_name, email } = body;

        // Validate inputs
        if (!full_name && !email) {
            return NextResponse.json(
                { error: 'At least one field (full_name or email) is required' },
                { status: 400 }
            );
        }

        const updates: any = {};
        if (full_name) updates.full_name = full_name;
        // Note: Updating email usually requires a re-confirmation flow in Supabase Auth.
        // For now we will update it in the public.users table if that's what the UI sends, 
        // but typically email updates are handled via supabase.auth.updateUser().
        if (email) updates.email = email;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update profile' },
            { status: 500 }
        );
    }
}
