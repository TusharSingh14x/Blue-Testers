'use client';

import React from "react"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase-client';

const USER_ROLES = ['user', 'organizer', 'admin'];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Sign up with Auth (role and full_name stored in metadata for trigger)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      console.log('Signup successful, user ID:', authData.user.id);
      console.log('Role selected:', role);
      console.log('Metadata passed:', { full_name: fullName, role: role });
      console.log('Has session:', !!authData.session);

      // IMPORTANT: Directly create/update user profile as fallback if trigger fails
      // This ensures the role is saved even if the database trigger doesn't work
      // Only try this if we have a session (user is logged in immediately)
      if (authData.session) {
      const { error: profileError } = await supabase
          .from('users')
          .upsert({
          id: authData.user.id,
            email: email,
          full_name: fullName,
            role: role as 'user' | 'organizer' | 'admin',
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error creating/updating user profile:', profileError);
          // Don't throw here - the trigger might have already created it
          // But log it so we can debug
        } else {
          console.log('User profile created/updated successfully with role:', role);
        }

        // Verify the profile was created correctly
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (verifyProfile) {
          console.log('Verified profile:', { id: verifyProfile.id, role: verifyProfile.role, email: verifyProfile.email });
          if (verifyProfile.role !== role) {
            console.warn(`Role mismatch! Expected: ${role}, Got: ${verifyProfile.role}`);
          }
        } else if (verifyError) {
          console.error('Error verifying profile:', verifyError);
        }
      } else {
        // No session means email confirmation is required
        // The database trigger should create the profile, or it will be created when they log in
        console.log('Email confirmation required. Profile will be created by trigger or on first login.');
      }

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        setSuccess(true);
        setError(null);
        return;
      }

      // If session exists, user is automatically logged in
      router.push('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);

      // Get detailed error message
      let errorMessage = 'Signup failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error objects
        const supabaseError = err as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.error?.message) {
          errorMessage = supabaseError.error.message;
        }
      }

      // Handle specific Supabase errors
      if (errorMessage.includes('rate limit') || errorMessage.includes('email rate')) {
        setError('Too many signup attempts. Please wait a few minutes and try again, or check your email for a confirmation link.');
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        setError('Database table not found. Please run the database setup script in Supabase.');
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('new row violates')) {
        setError('Permission denied. Please check your database RLS policies.');
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        // Show the actual error message
        setError(`Signup failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <p className="text-sm text-slate-600">Join your campus community</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                <p className="font-semibold mb-2">Account created successfully! 🎉</p>
                <p>Please check your email to confirm your account before signing in.</p>
                <p className="mt-2 text-xs">Didn't receive the email? Check your spam folder or wait a few minutes.</p>
              </div>
              <Button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="w-full"
                variant="outline"
              >
                Create Another Account
              </Button>
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          )}
          <p className="text-center text-sm text-slate-600 mt-4">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
