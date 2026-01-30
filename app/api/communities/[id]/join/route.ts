import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'Authentication error', details: userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User joining community:', { userId: user.id, communityId });

    // Check if already a member
    const { data: existingMember, error: checkError } = await supabase
      .from('community_members')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking membership:', checkError);
      return NextResponse.json(
        { error: 'Failed to check membership', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Add user to community
    console.log('Inserting member:', { community_id: communityId, user_id: user.id, role: 'user' });
    const { data: member, error: insertError } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: user.id,
        role: 'user',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting member:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to join community',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check RLS policies for community_members table'
        },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Member was not created' },
        { status: 500 }
      );
    }

    console.log('Member created successfully:', member.id);

    // Update member count
    const { count, error: countError } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId);

    if (countError) {
      console.error('Error counting members:', countError);
      // Don't fail the request, just log it
    } else {
      const { error: updateError } = await supabase
        .from('communities')
        .update({ member_count: count || 0 })
        .eq('id', communityId);

      if (updateError) {
        console.error('Error updating member count:', updateError);
        // Don't fail the request, just log it
      }
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Unexpected error joining community:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to join community',
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

    // Remove user from community
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id);

    if (error) throw error;

    const { count } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId);

    await supabase
      .from('communities')
      .update({ member_count: count || 0 })
      .eq('id', communityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave community' },
      { status: 500 }
    );
  }
}

