'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/utils';
import { Download, RefreshCw } from 'lucide-react';

interface PrintRequest {
  id: string;
  pdfFileName: string;
  pageCount: number;
  postingCost: number;
  systemFee: number;
  printCost: number;
  totalCost: number;
  status: string;
  invoiceUrl: string | null;
  pdfUrl: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

const statusOptions = ['submitted', 'in progress', 'posted', 'paid'];

export default function AdminPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [postingCosts, setPostingCosts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, status: string, postingCost?: string) => {
    setUpdating(requestId);
    try {
      const token = localStorage.getItem('token');
      const body: any = { status };
      if (postingCost !== undefined) {
        body.postingCost = postingCost;
      }

      const response = await fetch(`${API_URL}/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchRequests();
        setPostingCosts(prev => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Admin Panel - Copy Post It</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Print Requests</CardTitle>
                <CardDescription>Manage and update print request statuses</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No requests yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {requests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Request #{request.id.slice(0, 8)}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {request.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Customer:</span>
                            <p className="font-medium">{request.user.name || request.user.email}</p>
                            <p className="text-xs text-gray-500">{request.user.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">File:</span>
                            <p className="font-medium">{request.pdfFileName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Pages:</span>
                            <p className="font-medium">{request.pageCount}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Print Cost:</span>
                            <p className="font-medium">€{request.printCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Posting Cost:</span>
                            <p className="font-medium">€{request.postingCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <p className="font-medium text-lg">€{request.totalCost.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-end pt-4 border-t">
                          <div className="flex-1 min-w-[200px]">
                            <Label>Update Status</Label>
                            <Select
                              value={request.status}
                              onValueChange={(value) => updateStatus(request.id, value)}
                              disabled={updating === request.id}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <Label>Update Posting Cost (€)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={postingCosts[request.id] ?? request.postingCost}
                                onChange={(e) =>
                                  setPostingCosts(prev => ({
                                    ...prev,
                                    [request.id]: e.target.value,
                                  }))
                                }
                                placeholder={request.postingCost.toString()}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  updateStatus(
                                    request.id,
                                    request.status,
                                    postingCosts[request.id]
                                  )
                                }
                                disabled={updating === request.id}
                              >
                                Update
                              </Button>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`${API_URL}${request.pdfUrl}`, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              View PDF
                            </Button>
                            {request.invoiceUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`${API_URL}${request.invoiceUrl}`, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Invoice
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

