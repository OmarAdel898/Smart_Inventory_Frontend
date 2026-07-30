import { useState, useRef } from 'react';
import { skuApi } from '@/api/sku.api';
import { ApiError } from '@/api/client';
import type { CsvImportResult } from '@/types';

interface UseCsvImportOptions {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSuccessfulImport?: () => void;
}

export function useCsvImport({ showToast, onSuccessfulImport }: UseCsvImportOptions) {
  const [dragActive, setDragActive] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        setImportProgress('idle');
        setImportResult(null);
        setImportErrorMsg(null);
      } else {
        showToast('Invalid file format. Please upload a CSV file.', 'error');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        setImportProgress('idle');
        setImportResult(null);
        setImportErrorMsg(null);
      } else {
        showToast('Invalid file format. Please upload a CSV file.', 'error');
      }
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setImportProgress('uploading');
    setImportResult(null);
    setImportErrorMsg(null);

    try {
      const res = await skuApi.importCsv(csvFile);
      setImportProgress('completed');
      setImportResult(res);

      if (res.failed > 0) {
        showToast(`Import finished with ${res.failed} error(s).`, 'error');
      } else {
        showToast(`Successfully imported all ${res.successful} rows.`, 'success');
        onSuccessfulImport?.();
      }
    } catch (err) {
      setImportProgress('failed');
      const msg = err instanceof ApiError ? err.message : 'An error occurred during CSV upload';
      setImportErrorMsg(msg);
      showToast(msg, 'error');
    }
  };

  const downloadErrorReport = () => {
    if (!importResult || !importResult.errors || importResult.errors.length === 0) return;
    const headers = 'Row,SKU,Error Message\n';
    const rows = importResult.errors
      .map((err) => `${err.row},"${err.skuCode || ''}","${err.message.replace(/"/g, '""')}"`)
      .join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', csvContent);
    downloadLink.setAttribute('download', `csv_import_errors_${Date.now()}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const resetImportModal = () => {
    setCsvFile(null);
    setImportProgress('idle');
    setImportResult(null);
    setImportErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    dragActive, csvFile, importProgress, importResult, importErrorMsg, fileInputRef,
    handleDrag, handleDrop, handleFileChange, handleCsvUpload,
    downloadErrorReport, resetImportModal,
  };
}
