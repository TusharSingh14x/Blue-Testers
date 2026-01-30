'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AnalyticsData {
  stats: {
    totalEvents: number;
    totalAttendees: number;
    totalBookings: number;
    avgSatisfaction: string;
  };
  changes: {
    events: number;
    attendees: number;
    bookings: number;
    satisfaction: number;
  };
  eventData: Array<{ month: string; events: number; attendees: number }>;
  resourceData: Array<{ name: string; value: number }>;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-1">Track campus resource and event usage</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <p className="text-sm text-slate-600">Only admins and organizers can view analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Track campus resource and event usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Events</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {data.stats.totalEvents.toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${data.changes.events >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(data.changes.events)} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Attendees</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {data.stats.totalAttendees.toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${data.changes.attendees >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(data.changes.attendees)} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Resources Booked</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {data.stats.totalBookings.toLocaleString()}
            </p>
            <p className={`text-xs mt-2 ${data.changes.bookings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(data.changes.bookings)} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Avg. Satisfaction</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{data.stats.avgSatisfaction}</p>
            <p className={`text-xs mt-2 ${data.changes.satisfaction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.changes.satisfaction >= 0 ? '+' : ''}{data.changes.satisfaction} from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Events & Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {data.eventData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.eventData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attendees" stroke="#3b82f6" name="Attendees" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-600">
                <p>No event data available for the last 6 months</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.resourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.resourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.resourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-600">
                <p>No resource data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Event Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {data.eventData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.eventData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="events" fill="#3b82f6" name="Events" />
                <Bar dataKey="attendees" fill="#10b981" name="Attendees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-600">
              <p>No event data available for the last 6 months</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
