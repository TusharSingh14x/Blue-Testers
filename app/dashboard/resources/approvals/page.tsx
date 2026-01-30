'use client';

import { useEffect, useState } from 'react';
import { useRole } from '@/hooks/use-role';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Resource {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  location: string;
  capacity: number;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
}

export default function ResourceApprovalsPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingResources();
    }
  }, [isAdmin]);

  const fetchPendingResources = async () => {
    try {
      const response = await fetch('/api/resources');
      const data = await response.json();
      // Filter for pending resources
      const pending = data.filter((r: Resource) => r.status === 'pending');
      setResources(pending);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (resourceId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/resources/${resourceId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchPendingResources(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to ${status === 'approved' ? 'approve' : 'reject'} resource: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update resource:', error);
      alert('Failed to update resource');
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Resource Approvals</h1>
        <p className="text-slate-600 mt-2">Review and approve pending resource requests</p>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">No pending resource approvals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{resource.name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{resource.description}</p>
                  </div>
                  <Badge variant={resource.status === 'pending' ? 'default' : 'secondary'}>
                    {resource.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Type</p>
                    <p className="text-sm text-slate-600 capitalize">{resource.resource_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Location</p>
                    <p className="text-sm text-slate-600">{resource.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Capacity</p>
                    <p className="text-sm text-slate-600">{resource.capacity} people</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Created</p>
                    <p className="text-sm text-slate-600">
                      {new Date(resource.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproval(resource.id, 'approved')}
                    className="flex-1"
                    variant="default"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleApproval(resource.id, 'rejected')}
                    className="flex-1"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

