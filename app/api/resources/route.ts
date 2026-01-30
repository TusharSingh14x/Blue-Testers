import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get user role to determine what resources they can see
    let userRole = 'user';
    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = userProfile?.role || 'user';
    }

    // Users can only see approved resources, organizers/admins can see all
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRole === 'user') {
      query = query.eq('status', 'approved');
    }

    const { data: resources, error } = await query;

    if (error) throw error;

    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    console.log('Creating resource for user:', user.id);

    // Check if user is organizer or admin (both can create resources)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile setup.' },
        { status: 404 }
      );
    }

    console.log('User role:', userProfile.role);

    if (!['organizer', 'admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only organizers and admins can create resources', currentRole: userProfile.role },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.name || !body.resource_type) {
      return NextResponse.json(
        { error: 'Name and resource type are required' },
        { status: 400 }
      );
    }

    console.log('Inserting resource:', { name: body.name, resource_type: body.resource_type, created_by: user.id });

    // Organizers create resources as 'pending', admins create as 'approved'
    const status = userProfile.role === 'admin' ? 'approved' : 'pending';
    const resourceData = {
      name: body.name,
      description: body.description,
      resource_type: body.resource_type,
      location: body.location,
      capacity: body.capacity,
      availability_start: body.availability_start,
      availability_end: body.availability_end,
      image_url: body.image_url,
      status: status,
      created_by: user.id,
      ...(status === 'approved' && {
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }),
    };

    const { data: resource, error: insertError } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting resource:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to create resource',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || 'Check RLS policies for resources table'
        },
        { status: 500 }
      );
    }

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource was not created' },
        { status: 500 }
      );
    }

    console.log('Resource created successfully:', resource.id);
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating resource:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create resource',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
