import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get role from user metadata (set during signup)
    const userMetadata = session.user.user_metadata || {};
    const roleFromMetadata = (userMetadata.role as 'user' | 'organizer' | 'admin') || 'user';
    const fullNameFromMetadata = userMetadata.full_name || session.user.email?.split('@')[0] || '';

    console.log('Syncing role from metadata:', { 
      userId, 
      roleFromMetadata, 
      metadata: userMetadata 
    });

    // Update the user's role in the users table
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: session.user.email || '',
        full_name: fullNameFromMetadata,
        role: roleFromMetadata,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update role',
        details: updateError.message 
      }, { status: 500 });
    }

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: `Role synced to: ${updatedUser.role}`
    });
  } catch (error) {
    console.error('Error syncing role:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

