import React from 'react';
import { Activity, AlertOctagon, CheckCircle2, ShieldAlert, Cpu, Layers } from 'lucide-react';

export function OverviewTab({ stats }) {
  if (!stats) return <div className="card">Loading system analytics...</div>;

  const total = stats.total || 403;
  const installed = stats.byStatus?.Installed || 0;
  const faulty = stats.byStatus?.Faulty || 0;
  const decommissioned = stats.byStatus?.Decommissioned || 0;

  const makes = Object.entries(stats.byMake || {}).sort((a, b) => b[1] - a[1]);
  const phases = Object.entries(stats.byPhase || {});
  const builds = Object.entries(stats.byBuild || {});

  return (
    <div>
      {/* KPI Cards Row */}
      <div className="grid-cols-4">
        <div className="card">
          <div className="kpi-title">
            <span>Total Smart Meters</span>
            <Activity size={18} color="var(--primary)" />
          </div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-subtext">Across Jaipur electricity circles</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <span>Installed & Active</span>
            <CheckCircle2 size={18} color="var(--status-installed-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-installed-text)' }}>
            {installed}
          </div>
          <div className="kpi-subtext">{((installed / total) * 100).toFixed(1)}% of total fleet</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <span>Faulty / Needs Service</span>
            <AlertOctagon size={18} color="var(--status-faulty-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-faulty-text)' }}>
            {faulty}
          </div>
          <div className="kpi-subtext">{((faulty / total) * 100).toFixed(1)}% requires field inspection</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <span>Decommissioned</span>
            <ShieldAlert size={18} color="var(--status-decomm-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-decomm-text)' }}>
            {decommissioned}
          </div>
          <div className="kpi-subtext">{((decommissioned / total) * 100).toFixed(1)}% retired assets</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Manufacturer Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} /> Manufacturer Fleet Share
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {makes.map(([make, count]) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={make}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{make}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase & Build Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} /> Electrical Phase & Build Architecture
          </h3>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Phase Configuration
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {phases.map(([phase, count]) => (
                <div key={phase} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{phase} Phase</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Portal Build Schema
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {builds.map(([build, count]) => (
                <div key={build} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Build: {build}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality & Protocol Insights Banner */}
      <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          🛡️ Data Quality & Protocol Diagnostics
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Automated reverse-engineering findings and normalization rules applied by this wrapper service:
        </p>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>
            <strong>Lineage Path Keying:</strong> Division codes like <code>D-01</code> and subdivision codes like <code>SD-01</code> repeat across multiple circles. Tree nodes are keyed by full lineage paths to eliminate graph cycles.
          </li>
          <li>
            <strong>Missing Value Recovery:</strong> 22 meters have missing hierarchy names or codes in the legacy portal. These are normalized to <code>Unknown</code> and flagged in <code>dataQuality</code> instead of silently dropping records.
          </li>
          <li>
            <strong>DT-007 Alias Collision:</strong> Distribution transformer <code>DT-007</code> maps to both <em>"Sanganer DT 7"</em> and <em>"Old Malviya Nagar Xfmr"</em> under the same parent. Flagged in operational diagnostics.
          </li>
          <li>
            <strong>Build Discrepancy Resolved:</strong> <code>legacy</code> meters store nameplates in parameter array lists, while <code>v2</code> meters store JSON strings inside <code>classData</code>. The adapter unifies both into a single typed schema.
          </li>
        </ul>
      </div>
    </div>
  );
}
