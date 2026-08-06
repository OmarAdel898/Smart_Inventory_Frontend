import { useState, useEffect } from 'react';
import { fetchAnomalies, reviewAnomaly, escalateAnomaly, AnomalyFlag } from '@/api/anomalies';
import { formatDistanceToNow } from 'date-fns';

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnomalies();
  }, []);

  async function loadAnomalies() {
    try {
      setLoading(true);
      const res = await fetchAnomalies({ status: 'flagged' });
      setAnomalies(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id: string) {
    try {
      await reviewAnomaly(id);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleEscalate(id: string) {
    try {
      await escalateAnomaly(id);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const criticalCount = anomalies.filter(a => a.type === 'critical').length;
  const warningCount = anomalies.filter(a => a.type === 'warning').length;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="mb-lg flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Active Anomalies</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Review and resolve flagged inventory patterns.</p>
        </div>
        <div className="flex gap-sm">
          <span className="px-md py-sm rounded-full bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-error"></span> {criticalCount} Critical
          </span>
          <span className="px-md py-sm rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-md text-label-md flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-tertiary-container"></span> {warningCount} Warnings
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-xl">
          <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
        </div>
      ) : error ? (
        <div className="p-md bg-error-container text-on-error-container rounded">{error}</div>
      ) : anomalies.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant">No active anomalies.</div>
      ) : (
        <div className="flex flex-col gap-md">
          {anomalies.map((anomaly) => {
            const isCritical = anomaly.type === 'critical';
            return (
              <div key={anomaly.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col md:flex-row gap-lg hover:shadow-sm transition-shadow duration-200">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-md mb-xs">
                      <h3 className="font-headline-md text-headline-md text-on-surface">
                        {anomaly.sku?.name ? `${anomaly.sku.sku} (${anomaly.sku.name})` : (anomaly.skuId || 'Unknown SKU')}
                      </h3>
                      <span className={`px-sm py-xs rounded font-label-sm text-label-sm uppercase tracking-wider ${isCritical ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
                        {anomaly.type}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-sm pr-lg font-semibold">
                      {anomaly.description}
                    </p>
                    <p className="font-body-sm text-body-sm text-outline mt-sm pr-lg">
                      {anomaly.reasoning}
                    </p>
                  </div>
                </div>
                
                <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-outline-variant pt-md md:pt-0 md:pl-lg">
                  <div className="h-16 w-full mb-md relative">
                    {/* Placeholder for Sparkline based on type */}
                    {isCritical ? (
                      <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 40">
                        <path d="M0,35 L10,32 L20,34 L30,30 L40,31 L50,28 L60,29 L70,15 L80,5 L90,8 L100,2" fill="none" stroke="#ba1a1a" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                        <circle cx="100" cy="2" fill="#ba1a1a" r="3"></circle>
                      </svg>
                    ) : (
                      <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 40">
                        <path d="M0,20 L10,21 L20,20 L30,20 L40,19 L50,20 L60,20 L70,20 L80,20 L90,20 L100,20" fill="none" stroke="#a78f61" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                        <circle cx="100" cy="20" fill="#a78f61" r="3"></circle>
                      </svg>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between font-label-sm text-label-sm text-outline">
                      <span>{formatDistanceToNow(new Date(anomaly.createdAt), { addSuffix: true })}</span>
                      <span>Now</span>
                    </div>
                  </div>
                  <div className="flex gap-sm justify-end">
                    <button 
                      onClick={() => handleReview(anomaly.id)}
                      className="flex-1 md:flex-none px-md py-sm rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors"
                    >
                      Mark Reviewed
                    </button>
                    <button 
                      onClick={() => handleEscalate(anomaly.id)}
                      className={`flex-1 md:flex-none px-md py-sm rounded font-label-md text-label-md text-on-error hover:bg-opacity-90 transition-colors ${isCritical ? 'bg-error' : 'bg-primary'}`}
                    >
                      {isCritical ? 'Escalate' : 'Investigate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
