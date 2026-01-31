import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a member to view messages' },
        { status: 403 }
      );
    }

    // Get messages with user info
    const { data: messages, error } = await supabase
      .from('community_messages')
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Unwrap params if it's a Promise (Next.js 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    const body = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a member to send messages' },
        { status: 403 }
      );
    }

    console.log('Sending message:', { communityId, userId: user.id, message: body.message });

    const { data: message, error: insertError } = await supabase
      .from('community_messages')
      .insert({
        community_id: communityId,
        user_id: user.id,
        message: body.message,
      })
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to send message',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check RLS policies for community_messages table'
        },
        { status: 500 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message was not created' },
        { status: 500 }
      );
    }

    console.log('Message sent successfully:', message.id);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Unexpected error sending message:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send message',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - using standard client (RLS applies, but reading users/role should be allowed for auth user)
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Use Admin Client to delete the message (Bypassing RLS)
    const { createAdminClient } = await import('@/lib/supabase-server');
    const supabaseAdmin = await createAdminClient();

    const { error, count } = await supabaseAdmin
      .from('community_messages')
      .delete({ count: 'exact' })
      .eq('id', messageId);

    if (error) throw error;

    if (count === 0) {
      console.error('No rows deleted. Likely RLS policy violation.');
      return NextResponse.json({ error: 'Failed to delete. Check permissions.' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 500 }
    );
  }
}
