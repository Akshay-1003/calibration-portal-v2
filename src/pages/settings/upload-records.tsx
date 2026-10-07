import { useRef, useState } from 'react';
import { ArrowUpTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { Button, Card, Input, Label } from '@heroui/react';
import { toast } from 'sonner';
import { uploadMigrationRecords } from '../../services/apiServices';

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function SettingsUploadRecords() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedOrganizationId = organizationId.trim();
    if (!trimmedOrganizationId) {
      toast.error('Organization ID is required.');
      return;
    }
    if (!file) {
      toast.error('Please select an Excel file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await uploadMigrationRecords(trimmedOrganizationId, file);
      toast.success(result.message ?? 'Excel processing started.');
      setFile(null);
      setOrganizationId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <Card.Header className="border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-blue-50 p-2 text-blue-600">
            <DocumentArrowUpIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <Card.Title>Upload Records</Card.Title>
            <Card.Description>Import records for an organization from an Excel workbook.</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="space-y-5 p-6">
        <div className="max-w-xl space-y-2">
          <Label>Organization ID</Label>
          <Input
            aria-label="Organization ID"
            placeholder="Enter organization ID"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="w-full"
          />
        </div>

        <div className="max-w-xl space-y-2">
          <label htmlFor="records-excel-file" className="text-sm font-medium text-slate-800">
            Excel file
          </label>
          <input
            ref={fileInputRef}
            id="records-excel-file"
            type="file"
            accept={`.xlsx,${EXCEL_MIME_TYPE}`}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
                toast.error('Please select a valid .xlsx Excel file.');
                event.target.value = '';
                setFile(null);
                return;
              }
              setFile(selectedFile);
            }}
          />
          <p className="text-xs text-slate-500">Only valid .xlsx workbooks are supported.</p>
        </div>

        <Button
          variant="primary"
          onPress={handleSubmit}
          isDisabled={isSubmitting}
          className="inline-flex items-center gap-2"
        >
          <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? 'Uploading...' : 'Upload Records'}
        </Button>
      </Card.Content>
    </Card>
  );
}
