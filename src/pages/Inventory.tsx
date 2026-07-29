import { useEffect, useState } from 'react';
import { Filter, Plus, RefreshCw, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useToast } from '@/features/inventory/hooks/useToast';
import { useDropdownData } from '@/features/inventory/hooks/useDropdownData';
import { useSkuData } from '@/features/inventory/hooks/useSkuData';
import { useStockLevelData } from '@/features/inventory/hooks/useStockLevelData';
import { useCsvImport } from '@/features/inventory/hooks/useCsvImport';

import { ToastContainer } from '@/features/inventory/components/ToastContainer';
import { SkuTable } from '@/features/inventory/components/SkuTable';
import { StockLevelTable } from '@/features/inventory/components/StockLevelTable';
import { SkuFormModal } from '@/features/inventory/components/SkuFormModal';
import { DeleteSkuModal } from '@/features/inventory/components/DeleteSkuModal';
import { CsvImportModal } from '@/features/inventory/components/CsvImportModal';
import { StockThresholdDrawer } from '@/features/inventory/components/StockThresholdDrawer';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'sku' | 'stock'>('sku');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { toasts, showToast, dismissToast } = useToast();
  const { categories, vendors, warehouses, filterSkus } = useDropdownData();

  const sku = useSkuData({ showToast });
  const stock = useStockLevelData({ showToast });

  const csv = useCsvImport({
    showToast,
    onSuccessfulImport: () => void sku.loadSkus(),
  });

  useEffect(() => {
    if (activeTab === 'sku') {
      void sku.loadSkus();
    } else {
      void stock.loadStockLevels();
    }
  }, [
    activeTab,
    sku.skuPage, sku.skuSortBy, sku.skuSortOrder, sku.debouncedSearch, sku.skuCategoryFilter,
    stock.stockPage, stock.stockWarehouseFilter, stock.stockSkuFilter,
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => showToast(`Copied ${text} to clipboard!`, 'success'),
      () => showToast('Failed to copy', 'error'),
    );
  };

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    csv.resetImportModal();
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Inventory Hub</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Inventory Management</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Catalog SKUs, manage safety stocks, and reconcile stock level thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-surface-container border border-outline-variant/60 p-0.5">
            <button
              onClick={() => setActiveTab('sku')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'sku'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              SKU Catalog
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'stock'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Stock Levels
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'sku' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search name or SKU code..."
                  value={sku.skuSearch}
                  onChange={(e) => sku.setSkuSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full h-9 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                {sku.skuSearch && (
                  <button
                    onClick={() => sku.setSkuSearch('')}
                    className="absolute right-3 top-2.5 hover:text-on-surface text-on-surface-variant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={sku.skuCategoryFilter}
                  onChange={(e) => {
                    sku.setSkuCategoryFilter(e.target.value);
                    sku.setSkuPage(1);
                  }}
                  className="pl-3 pr-8 py-1.5 h-9 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none appearance-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Filter className="h-3 w-3" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2 text-xs">
                <Upload className="h-3.5 w-3.5" /> Import CSV
              </Button>
              <Button onClick={() => sku.openSkuForm()} className="gap-2 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add SKU
              </Button>
            </div>
          </div>

          <SkuTable
            skus={sku.skus}
            skuLoading={sku.skuLoading}
            skuError={sku.skuError}
            skuMeta={sku.skuMeta}
            skuPage={sku.skuPage}
            setSkuPage={sku.setSkuPage}
            skuSortBy={sku.skuSortBy}
            skuSortOrder={sku.skuSortOrder}
            categories={categories}
            vendors={vendors}
            onSort={sku.handleSort}
            onEdit={sku.openSkuForm}
            onDelete={sku.confirmDeleteSku}
            onRetry={() => void sku.loadSkus()}
            onCopy={copyToClipboard}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative max-w-sm flex-1">
                <select
                  value={stock.stockWarehouseFilter}
                  onChange={(e) => {
                    stock.setStockWarehouseFilter(e.target.value);
                    stock.setStockPage(1);
                  }}
                  className="pl-3 pr-8 py-1.5 w-full h-9 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none appearance-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Filter className="h-3 w-3" />
                </div>
              </div>
              <div className="relative max-w-sm flex-1">
                <select
                  value={stock.stockSkuFilter}
                  onChange={(e) => {
                    stock.setStockSkuFilter(e.target.value);
                    stock.setStockPage(1);
                  }}
                  className="pl-3 pr-8 py-1.5 w-full h-9 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface outline-none appearance-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">All SKUs</option>
                  {filterSkus.map((s) => (
                    <option key={s.id} value={s.id}>{s.sku} - {s.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Search className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => void stock.loadStockLevels()}
              disabled={stock.stockLoading}
              className="gap-2 text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${stock.stockLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <StockLevelTable
            stockLevels={stock.stockLevels}
            stockLoading={stock.stockLoading}
            stockError={stock.stockError}
            stockMeta={stock.stockMeta}
            stockPage={stock.stockPage}
            setStockPage={stock.setStockPage}
            onRetry={() => void stock.loadStockLevels()}
            onAdjust={stock.openStockLevelDrawer}
          />
        </div>
      )}

      {sku.skuModalOpen && (
        <SkuFormModal
          mode={sku.skuModalMode}
          categories={categories}
          vendors={vendors}
          formSku={sku.formSku}
          setFormSku={sku.setFormSku}
          formName={sku.formName}
          setFormName={sku.setFormName}
          formCategoryId={sku.formCategoryId}
          setFormCategoryId={sku.setFormCategoryId}
          formCost={sku.formCost}
          setFormCost={sku.setFormCost}
          formPrice={sku.formPrice}
          setFormPrice={sku.setFormPrice}
          formVendorId={sku.formVendorId}
          setFormVendorId={sku.setFormVendorId}
          formErrors={sku.formErrors}
          formSubmitLoading={sku.formSubmitLoading}
          formServerErr={sku.formServerErr}
          onSubmit={sku.handleSkuFormSubmit}
          onClose={() => sku.setSkuModalOpen(false)}
        />
      )}

      {sku.deleteModalOpen && (
        <DeleteSkuModal
          skuToDelete={sku.skuToDelete}
          deleteLoading={sku.deleteLoading}
          onConfirm={sku.handleDeleteSku}
          onClose={() => sku.setDeleteModalOpen(false)}
        />
      )}

      {importModalOpen && (
        <CsvImportModal
          dragActive={csv.dragActive}
          csvFile={csv.csvFile}
          importProgress={csv.importProgress}
          importResult={csv.importResult}
          importErrorMsg={csv.importErrorMsg}
          fileInputRef={csv.fileInputRef}
          onDrag={csv.handleDrag}
          onDrop={csv.handleDrop}
          onFileChange={csv.handleFileChange}
          onUpload={csv.handleCsvUpload}
          onDownloadErrors={csv.downloadErrorReport}
          onClose={handleCloseImportModal}
        />
      )}

      {stock.drawerOpen && stock.selectedStockLevel && (
        <StockThresholdDrawer
          selectedStockLevel={stock.selectedStockLevel}
          drawerReorderThreshold={stock.drawerReorderThreshold}
          setDrawerReorderThreshold={stock.setDrawerReorderThreshold}
          drawerSafetyStock={stock.drawerSafetyStock}
          setDrawerSafetyStock={stock.setDrawerSafetyStock}
          drawerFormErrors={stock.drawerFormErrors}
          drawerServerErr={stock.drawerServerErr}
          drawerLoading={stock.drawerLoading}
          onSubmit={stock.handleStockLevelUpdate}
          onClose={() => stock.setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
