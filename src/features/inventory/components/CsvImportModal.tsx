import { AlertCircle, CheckCircle, Download, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CsvImportResult } from '@/types';

interface CsvImportModalProps {
  dragActive: boolean;
  csvFile: File | null;
  importProgress: 'idle' | 'uploading' | 'completed' | 'failed';
  importResult: CsvImportResult | null;
  importErrorMsg: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onDownloadErrors: () => void;
  onClose: () => void;
}

export function CsvImportModal({
  dragActive, csvFile, importProgress, importResult, importErrorMsg, fileInputRef,
  onDrag, onDrop, onFileChange, onUpload, onDownloadErrors, onClose,
}: CsvImportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-gray-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">CSV Catalog Import</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {importErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{importErrorMsg}</span>
            </div>
          )}

          {(importProgress === 'idle' || importProgress === 'uploading') && (
            <div
              onDragEnter={onDrag}
              onDragOver={onDrag}
              onDragLeave={onDrag}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-accent bg-[#0066CC]/5'
                  : csvFile
                  ? 'border-green-400 bg-green-50/10'
                  : 'border-gray-200 hover:border-gray-200'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                {csvFile ? (
                  <CheckCircle className="h-6 w-6 text-green-600 animate-pulse" />
                ) : (
                  <Upload className="h-6 w-6 text-[#0066CC]" />
                )}
              </div>
              {csvFile ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{csvFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(csvFile.size / 1024).toFixed(2)} KB • Ready to upload
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Drag & drop your CSV file here</p>
                  <p className="text-xs text-gray-500">or click to browse your local device</p>
                </div>
              )}
            </div>
          )}

          {importProgress === 'uploading' && (
            <div className="py-4 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
              <p className="text-sm font-semibold text-gray-900">Parsing and validating CSV matrix...</p>
            </div>
          )}

          {importProgress === 'completed' && importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50-low border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total Evaluated</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">{importResult.totalRows}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-green-800">Successful</p>
                  <p className="text-2xl font-bold mt-1 text-green-700">{importResult.successful}</p>
                </div>
                <div className={`rounded-xl p-4 text-center border ${
                  importResult.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50-low border-gray-200'
                }`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${importResult.failed > 0 ? 'text-red-800' : 'text-gray-500'}`}>
                    Failed
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${importResult.failed > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {importResult.failed}
                  </p>
                </div>
              </div>

              {importResult.failed > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Import Failures ({importResult.failed})
                    </h4>
                    <Button variant="outline" size="sm" onClick={onDownloadErrors} className="h-8 gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> Download report
                    </Button>
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-gray-500">Row</th>
                          <th className="px-4 py-2 font-semibold text-gray-500">SKU Code</th>
                          <th className="px-4 py-2 font-semibold text-gray-500">Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors?.map((err, idx) => (
                          <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-gray-900 font-semibold">{err.row}</td>
                            <td className="px-4 py-2 font-mono">{err.skuCode || '—'}</td>
                            <td className="px-4 py-2 text-red-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50-low border-t border-gray-200">
          {importProgress === 'completed' ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <button variant="cancel" onClick={onClose} disabled={importProgress === 'uploading'} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                Cancel
              </button>
              <Button onClick={onUpload} disabled={!csvFile || importProgress === 'uploading'}>
                {importProgress === 'uploading' ? 'Importing...' : 'Upload & Process'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
