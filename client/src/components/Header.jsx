import React, { useState } from 'react';
import { Zap, RefreshCw, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { triggerRefresh } from '../api/client';

export function Header({ health, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await triggerRefresh();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const isHealthy = health?.status === 'healthy';
  const meterCount = health?.index?.meterCount ?? 403;
  const lastSync = health?.index?.lastRefreshedAt 
    ? new Date(health.index.lastRefreshedAt).toLocaleTimeString() 
    : 'Ready';

  const docsUrl = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
    ? 'https://flock-urja-ops.onrender.com/docs/'
    : '/docs/';

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Zap size={18} />
        </div>
        <div>
          <div className="brand-title">Urja Meter Ops</div>
          <div className="brand-subtitle">Smart Grid Distribution & API Gateway</div>
        </div>
      </div>

      <div className="header-actions">
        <div className="health-pill" title={`Last synced: ${lastSync}`}>
          <span className={`status-dot ${isHealthy ? 'healthy' : 'degraded'}`}></span>
          <span>{isHealthy ? 'System Online' : 'Degraded'}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontWeight: 600 }}>{meterCount} meters</span>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Trigger in-memory index sync with legacy portal"
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Syncing...' : 'Sync Index'}
        </button>

        <a 
          href={docsUrl} 
          target="_blank" 
          rel="noreferrer" 
          className="btn btn-secondary btn-sm"
          title="Open interactive Swagger UI documentation"
        >
          <FileText size={14} />
          <span>API Docs</span>
        </a>
      </div>
    </header>
  );
}
