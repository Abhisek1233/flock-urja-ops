import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { fetchMeters } from '../api/client';

export function MetersTab({ onSelectMeter }) {
  const [meters, setMeters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [buildFilter, setBuildFilter] = useState('');
  const [sortField, setSortField] = useState('meterId:asc');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchMeters({
        q: searchQuery,
        status: statusFilter,
        make: makeFilter,
        phase: phaseFilter,
        build: buildFilter,
        sort: sortField,
        page,
        pageSize
      });
      setMeters(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load meters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, statusFilter, makeFilter, phaseFilter, buildFilter, sortField]);

  // Handle search submission or reset to page 1 on query change
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Installed':
        return <span className="badge badge-installed">Installed</span>;
      case 'Faulty':
        return <span className="badge badge-faulty">Faulty</span>;
      case 'Decommissioned':
        return <span className="badge badge-decommissioned">Decommissioned</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      {/* Search and Filters Bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <input
              type="text"
              className="input-text"
              placeholder="Search by meter ID (e.g. J1000) or serial number (e.g. SE33)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
                setTimeout(loadData, 0);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
            <select className="select-input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="Installed">Installed</option>
              <option value="Faulty">Faulty</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Manufacturer</label>
            <select className="select-input" value={makeFilter} onChange={(e) => { setMakeFilter(e.target.value); setPage(1); }}>
              <option value="">All Makes</option>
              <option value="HPL">HPL</option>
              <option value="Genus">Genus</option>
              <option value="Secure">Secure</option>
              <option value="Allied">Allied</option>
              <option value="L&T">L&T</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Phase</label>
            <select className="select-input" value={phaseFilter} onChange={(e) => { setPhaseFilter(e.target.value); setPage(1); }}>
              <option value="">All Phases</option>
              <option value="single">Single Phase</option>
              <option value="three">Three Phase</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Build Schema</label>
            <select className="select-input" value={buildFilter} onChange={(e) => { setBuildFilter(e.target.value); setPage(1); }}>
              <option value="">All Builds</option>
              <option value="legacy">Legacy Build</option>
              <option value="v2">V2 Build</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Sort By</label>
            <select className="select-input" value={sortField} onChange={(e) => setSortField(e.target.value)}>
              <option value="meterId:asc">Meter ID (Asc)</option>
              <option value="meterId:desc">Meter ID (Desc)</option>
              <option value="serialNo:asc">Serial No (Asc)</option>
              <option value="make:asc">Manufacturer (A-Z)</option>
              <option value="installStatus:asc">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Meter ID</th>
              <th>Serial No</th>
              <th>Make</th>
              <th>Phase</th>
              <th>Status</th>
              <th>Build</th>
              <th>Transformer (DT)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading meters...
                </td>
              </tr>
            ) : meters.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No meters matched your search and filter criteria.
                </td>
              </tr>
            ) : (
              meters.map((meter) => (
                <tr key={meter.meterId}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {meter.meterId}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{meter.serialNo}</td>
                  <td>{meter.make}</td>
                  <td style={{ textTransform: 'capitalize' }}>{meter.phaseType}</td>
                  <td>{getStatusBadge(meter.installStatus)}</td>
                  <td>
                    <span className={`badge ${meter.build === 'v2' ? 'badge-v2' : 'badge-legacy'}`}>
                      {meter.build}
                    </span>
                  </td>
                  <td>{meter.dtCode}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectMeter(meter)}
                      title="Inspect nameplate, lineage, and consumption history"
                    >
                      <Eye size={13} />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{meters.length}</strong> of <strong>{total}</strong> meters
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, padding: '0 0.5rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
