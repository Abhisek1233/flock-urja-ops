import React, { useState, useEffect } from 'react';
import { X, Zap, Calendar, AlertTriangle, ShieldCheck, MapPin, Activity, TrendingUp } from 'lucide-react';
import { fetchConsumption } from '../api/client';

export function MeterDetailModal({ meter, onClose }) {
  if (!meter) return null;

  const [consumption, setConsumption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('2026-06-24');
  const [toDate, setToDate] = useState('2026-06-30');
  const [chartMode, setChartMode] = useState('delta'); // 'delta' | 'cumulative'

  const loadConsumption = async () => {
    setLoading(true);
    try {
      const res = await fetchConsumption(meter.meterId, { from: fromDate, to: toDate });
      setConsumption(res);
    } catch (err) {
      console.error('Failed to load consumption:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsumption();
  }, [meter.meterId]);

  const handleDateFilterSubmit = (e) => {
    e.preventDefault();
    loadConsumption();
  };

  const readings = consumption?.data || [];
  const summary = consumption?.summary || {};
  const anomalies = consumption?.anomalies || [];

  // SVG Chart Calculation
  const chartHeight = 180;
  const chartWidth = 760;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  let maxVal = 1;
  let minVal = 0;
  if (chartMode === 'delta') {
    const deltas = readings.map(r => r.deltaKwh || 0);
    maxVal = Math.max(1, ...deltas);
    minVal = Math.min(0, ...deltas);
  } else {
    const kwhs = readings.map(r => r.kwh || 0);
    maxVal = Math.max(1, ...kwhs);
    minVal = Math.min(...kwhs);
  }

  const range = maxVal - minVal || 1;

  const points = readings.map((r, i) => {
    const x = padding.left + (i / Math.max(1, readings.length - 1)) * usableWidth;
    const val = chartMode === 'delta' ? (r.deltaKwh || 0) : (r.kwh || 0);
    const y = padding.top + usableHeight - ((val - minVal) / range) * usableHeight;
    return { x, y, r };
  });

  const pathD = points.length > 0 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-logo" style={{ width: 28, height: 28 }}>
              <Zap size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Meter {meter.meterId}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Serial: <code>{meter.serialNo}</code> • Manufacturer: <strong>{meter.make}</strong>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Section 1: Nameplate & Lineage Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Nameplate Card */}
            <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Nameplate Specifications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Phase:</span> <strong style={{ textTransform: 'capitalize' }}>{meter.phaseType}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{meter.installStatus}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <strong>{meter.installType}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Build:</span> <span className={`badge ${meter.build === 'v2' ? 'badge-v2' : 'badge-legacy'}`}>{meter.build}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>DT Code:</span> <code>{meter.dtCode}</code></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Coordinates:</span> <span style={{ fontSize: '0.75rem' }}>{meter.geo?.lat?.toFixed(4)}, {meter.geo?.lng?.toFixed(4)}</span></div>
              </div>
            </div>

            {/* Network Lineage Breadcrumb */}
            <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Network Lineage
              </h3>
              {meter.hierarchy?.levels ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                  <div><strong>Zone:</strong> {meter.hierarchy.levels.zone.name} ({meter.hierarchy.levels.zone.code})</div>
                  <div><strong>Circle:</strong> {meter.hierarchy.levels.circle.name} ({meter.hierarchy.levels.circle.code})</div>
                  <div><strong>Division:</strong> {meter.hierarchy.levels.division.name} ({meter.hierarchy.levels.division.code})</div>
                  <div><strong>Substation:</strong> {meter.hierarchy.levels.substation.name} ({meter.hierarchy.levels.substation.code})</div>
                  <div><strong>Feeder:</strong> {meter.hierarchy.levels.feeder.name} ({meter.hierarchy.levels.feeder.code})</div>
                  <div><strong>DT:</strong> {meter.hierarchy.levels.dt.name} ({meter.hierarchy.levels.dt.code})</div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hierarchy recorded</div>
              )}
            </div>
          </div>

          {/* Section 2: Energy Consumption & Chart */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} color="var(--primary)" /> Energy Consumption History (30-min Intervals)
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Cumulative active register & half-hourly interval deltas
                </div>
              </div>

              {/* Date Filter & Chart Mode Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <form onSubmit={handleDateFilterSubmit} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="input-text"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="date"
                    className="input-text"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">Filter</button>
                </form>

                <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    className={`btn btn-sm ${chartMode === 'delta' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setChartMode('delta')}
                    style={{ borderRadius: 0 }}
                  >
                    Δ kWh Delta
                  </button>
                  <button
                    className={`btn btn-sm ${chartMode === 'cumulative' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setChartMode('cumulative')}
                    style={{ borderRadius: 0 }}
                  >
                    Cumulative kWh
                  </button>
                </div>
              </div>
            </div>

            {/* Consumption KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Window Consumption</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {summary.totalKwhDelta ? `${summary.totalKwhDelta} kWh` : '0 kWh'}
                </div>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg 30-min Demand</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {summary.avgIntervalKwh ? `${summary.avgIntervalKwh} kWh` : '0 kWh'}
                </div>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peak 30-min Spike</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {summary.peakIntervalKwh ? `${summary.peakIntervalKwh} kWh` : '0 kWh'}
                </div>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Line Voltage</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {summary.avgVoltage ? `${summary.avgVoltage} V` : '230 V'}
                </div>
              </div>
            </div>

            {/* Anomalies alert banner if present */}
            {anomalies.length > 0 && (
              <div className="alert-box alert-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>{anomalies.length} Grid Anomalies Detected in this Window:</strong>
                  <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                    {anomalies.slice(0, 3).map((a, i) => (
                      <li key={i}>{a.timestamp}: {a.anomalies.map(an => an.message).join(', ')}</li>
                    ))}
                    {anomalies.length > 3 && <li>...and {anomalies.length - 3} more anomaly events.</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* SVG Time Series Chart */}
            {loading ? (
              <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Loading time-series energy data...
              </div>
            ) : readings.length === 0 ? (
              <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No readings available in selected date range.
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {/* Grid Lines */}
                  <line x1={padding.left} y1={padding.top} x2={chartWidth - padding.right} y2={padding.top} stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1={padding.left} y1={padding.top + usableHeight / 2} x2={chartWidth - padding.right} y2={padding.top + usableHeight / 2} stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1={padding.left} y1={padding.top + usableHeight} x2={chartWidth - padding.right} y2={padding.top + usableHeight} stroke="#cbd5e1" />

                  {/* Y Axis Labels */}
                  <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                    {maxVal.toFixed(1)}
                  </text>
                  <text x={padding.left - 8} y={padding.top + usableHeight / 2 + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                    {((maxVal + minVal) / 2).toFixed(1)}
                  </text>
                  <text x={padding.left - 8} y={padding.top + usableHeight} textAnchor="end" fontSize="10" fill="#94a3b8">
                    {minVal.toFixed(1)}
                  </text>

                  {/* Path / Bars */}
                  {chartMode === 'delta' ? (
                    // Delta Bars
                    points.map((p, i) => {
                      const barWidth = Math.max(1, (usableWidth / readings.length) * 0.7);
                      const barHeight = Math.max(2, padding.top + usableHeight - p.y);
                      return (
                        <rect
                          key={i}
                          x={p.x - barWidth / 2}
                          y={p.y}
                          width={barWidth}
                          height={barHeight}
                          fill={p.r.deltaKwh < 0 ? '#ef4444' : '#2563eb'}
                          opacity={0.85}
                        >
                          <title>{`${p.r.rawTimestamp}: ${p.r.deltaKwh} kWh (Voltage: ${p.r.voltR}V)`}</title>
                        </rect>
                      );
                    })
                  ) : (
                    // Cumulative Line
                    <>
                      <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#1d4ed8">
                          <title>{`${p.r.rawTimestamp}: ${p.r.kwh} kWh`}</title>
                        </circle>
                      ))}
                    </>
                  )}

                  {/* X Axis Timestamps */}
                  {points.length > 0 && (
                    <>
                      <text x={padding.left} y={chartHeight - 8} fontSize="10" fill="#94a3b8">
                        {readings[0].rawTimestamp.split(' ')[0]}
                      </text>
                      <text x={chartWidth - padding.right} y={chartHeight - 8} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {readings[readings.length - 1].rawTimestamp.split(' ')[0]}
                      </text>
                    </>
                  )}
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
