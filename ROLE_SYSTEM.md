# Role-Based Access Control (RBAC) System

## Overview

The campus management platform implements a three-tier role system:

1. **User** - Basic access
2. **Organizer** - Content management
3. **Admin** - Full access + resource approvals

## Role Permissions

### User Role
- ✅ View and join communities/rooms
- ✅ View approved resources
- ✅ View events
- ✅ View analytics
- ✅ Book resources
- ✅ Register for events
- ❌ Create events
- ❌ Create resources
- ❌ Approve resources

### Organizer Role
- ✅ All User permissions
- ✅ Create events
- ✅ Create communities/groups
- ✅ Create resources (pending approval)
- ✅ Manage their own events
- ❌ Approve resources

### Admin Role
- ✅ All Organizer permissions
- ✅ Approve/reject resources
- ✅ Manage all events
- ✅ Full system access

## Implementation Details

### Database Schema

The `users` table has a `role` column with enum type:
```sql
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'user');
```

Resources have an approval status:
```sql
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
```

### Automatic Profile Creation

When a user signs up, a database trigger automatically creates their profile:
- Trigger: `on_auth_user_created`
- Function: `handle_new_user()`
- Extracts role and full_name from auth metadata

### API Route Protection

- **Resources API**: Only organizers/admins can create, only admins can approve
- **Events API**: Only organizers/admins can create
- **Resources GET**: Users only see approved resources, organizers/admins see all

### UI Components

- **Sidebar**: Shows/hides menu items based on role
- **Resource Approvals Page**: Admin-only page at `/dashboard/resources/approvals`
- **Role Hook**: `useRole()` provides role checks throughout the app

## Usage Examples

### Check Role in Component
```typescript
import { useRole } from '@/hooks/use-role';

function MyComponent() {
  const { isAdmin, canManageContent, canApproveResources } = useRole();
  
  if (canManageContent) {
    // Show create button
  }
  
  if (canApproveResources) {
    // Show approval button
  }
}
```

### Check Role in API Route
```typescript
const { data: userProfile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (userProfile?.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

## Database Setup

Run the updated `scripts/setup-database.sql` in Supabase SQL Editor to:
1. Add approval status to resources table
2. Create database trigger for auto profile creation
3. Set up RLS policies for role-based access

## Signup Flow

1. User signs up with email, password, full_name, and role
2. Role and full_name stored in auth metadata
3. Database trigger creates user profile automatically
4. User can immediately use the system based on their role

