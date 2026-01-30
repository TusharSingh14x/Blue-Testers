# Signup Troubleshooting Guide

## Common Issues and Solutions

### 1. "Signup failed" Error

**Most Common Causes:**

#### A. Database Tables Not Created
**Solution:** Run the database setup script in Supabase:
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `scripts/setup-database.sql`
4. Click **Run** to execute the script
5. Verify the `users` table was created by checking **Table Editor**

#### B. Missing RLS (Row Level Security) Policy
**Solution:** The script includes RLS policies, but if they're missing:
1. Go to **Authentication** → **Policies** in Supabase
2. Check if the `users` table has an INSERT policy
3. If missing, run this SQL:
```sql
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### C. Environment Variables Not Set
**Solution:** Verify your `.env.local` file exists and has correct values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then restart your dev server:
```bash
npm run dev
```

#### D. Email Already Registered
**Solution:** 
- Try signing in instead of signing up
- Or use a different email address
- Or delete the user from Supabase Dashboard → Authentication → Users

### 2. Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for detailed error messages. The improved error handling will now show:
- Database connection errors
- Permission denied errors
- Table not found errors
- Specific Supabase error messages

### 3. Verify Database Setup

Run this query in Supabase SQL Editor to check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';
```

### 4. Test Database Connection

Try this in Supabase SQL Editor to test if you can insert:
```sql
-- This should work if RLS is set up correctly
-- (You'll need to be authenticated)
INSERT INTO users (id, email, full_name, role)
VALUES (gen_random_uuid(), 'test@example.com', 'Test User', 'user');
```

## Quick Fix Checklist

- [ ] Database tables created (run `setup-database.sql`)
- [ ] RLS policies created (included in setup script)
- [ ] `.env.local` file exists with correct values
- [ ] Dev server restarted after adding env variables
- [ ] Email confirmation disabled (for development) in Supabase Auth settings
- [ ] Browser console checked for detailed errors
- [ ] Tried with a different email address

## Still Having Issues?

Check the browser console for the exact error message and share it for further debugging.

