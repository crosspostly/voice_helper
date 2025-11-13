import { useProxyMetrics } from '../services/proxyMetrics';
import { useGeoProxyDetection } from '../hooks/useGeoProxyDetection';
import { useState } from 'react';

export function ProxyStatsPanel() {
  const { stats, clearMetrics, exportMetrics } = useProxyMetrics();
  const { isBlocked, proxyRequired, lastCheckTime, manualCheck } = useGeoProxyDetection();
  const [showDetails, setShowDetails] = useState(false);

  const handleExport = () => {
    const data = exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxy-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showDetails && !stats) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs text-sm z-50">
        <div className="flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            📊 Proxy Metrics
            {proxyRequired && <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Geo-Blocked</span>}
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700"
          >
            ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md text-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold flex items-center gap-2">
          📊 Proxy Metrics
          {proxyRequired && <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Geo-Blocked</span>}
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700"
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {showDetails && (
        <div className="space-y-2 border-t pt-2">
          {/* Статус детекции */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b">
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="font-semibold">
                {isBlocked === null && '🔄 Checking...'}
                {isBlocked === false && '✅ Direct OK'}
                {isBlocked === true && '⚠️ Blocked'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Last Check</div>
              <div className="font-semibold text-xs">
                {lastCheckTime
                  ? new Date(lastCheckTime).toLocaleTimeString()
                  : '-'}
              </div>
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="flex gap-2 pb-2">
            <button
              onClick={manualCheck}
              className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              🔄 Recheck
            </button>
            <button
              onClick={clearMetrics}
              className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
            >
              🗑️ Clear
            </button>
            <button
              onClick={handleExport}
              className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
            >
              📥 Export
            </button>
          </div>

          {stats && (
            <>
              {/* Статистика запросов */}
              <div className="grid grid-cols-3 gap-2 pb-2 border-b">
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-semibold text-lg">{stats.totalRequests}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Direct</div>
                  <div className="font-semibold text-green-600">
                    {stats.directRequests}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Proxy</div>
                  <div className="font-semibold text-blue-600">
                    {stats.proxyRequests}
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                <div>
                  <div className="text-xs text-gray-500">Direct Success</div>
                  <div className="font-semibold">
                    {stats.directSuccessRate.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded mt-1">
                    <div
                      className="bg-green-500 h-2 rounded"
                      style={{ width: `${stats.directSuccessRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Proxy Success</div>
                  <div className="font-semibold">
                    {stats.proxySuccessRate.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${stats.proxySuccessRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Latency */}
              <div className="grid grid-cols-2 gap-2 pb-2">
                <div>
                  <div className="text-xs text-gray-500">Direct Latency</div>
                  <div className="font-semibold">
                    {stats.avgDirectLatency.toFixed(0)}ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Proxy Latency</div>
                  <div className="font-semibold">
                    {stats.avgProxyLatency.toFixed(0)}ms
                  </div>
                </div>
              </div>

              {/* Errors */}
              {(stats.lastDirectError || stats.lastProxyError) && (
                <div className="pt-2 border-t">
                  {stats.lastDirectError && (
                    <div className="text-xs text-red-600 mb-1 truncate">
                      Direct: {stats.lastDirectError}
                    </div>
                  )}
                  {stats.lastProxyError && (
                    <div className="text-xs text-red-600 truncate">
                      Proxy: {stats.lastProxyError}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}