'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/utils';
import { Upload, X } from 'lucide-react';

interface PDFUploadProps {
  onSuccess: () => void;
}

export default function PDFUpload({ onSuccess }: PDFUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [postingCost, setPostingCost] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      files.forEach(file => {
        formData.append('pdfs', file);
      });
      if (postingCost) {
        formData.append('postingCost', postingCost);
      }

      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      setFiles([]);
      setPostingCost('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Posting/Shipping Cost (€)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={postingCost}
          onChange={(e) => setPostingCost(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">Drop PDF files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">Drag & drop PDF files here, or click to select</p>
            <p className="text-sm text-gray-500">You can upload multiple files</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files:</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={uploading || files.length === 0} className="w-full">
        {uploading ? 'Uploading...' : 'Submit Print Request'}
      </Button>
    </form>
  );
}

