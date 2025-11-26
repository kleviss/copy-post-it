'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  createdAt: string;
}

interface OrdersListProps {
  requests: PrintRequest[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  'in progress': 'bg-blue-100 text-blue-800',
  posted: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
};

export default function OrdersList({ requests, onRefresh }: OrdersListProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const downloadInvoice = (invoiceUrl: string) => {
    window.open(`${API_URL}${invoiceUrl}`, '_blank');
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No orders yet. Upload a PDF to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoRefresh" className="text-sm text-gray-600">
            Auto-refresh status (5s)
          </label>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Request #{request.id.slice(0, 8)}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusColors[request.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {request.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                    <span className="text-gray-600">System Fee:</span>
                    <p className="font-medium">€{request.systemFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <p className="font-medium text-lg">€{request.totalCost.toFixed(2)}</p>
                  </div>
                </div>
                {request.invoiceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadInvoice(request.invoiceUrl!)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

