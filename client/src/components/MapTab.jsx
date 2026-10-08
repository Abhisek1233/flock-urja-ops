import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import { MapPin, Navigation, Eye, Filter } from 'lucide-react';
import { fetchNearMeters } from '../api/client';

export function MapTab({ meters, onSelectMeter }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [nearLat, setNearLat] = useState('26.9389');
  const [nearLng, setNearLng] = useState('75.8309');
  const [radiusKm, setRadiusKm] = useState(5);
  const [nearResults, setNearResults] = useState(null);
  const [searchingNear, setSearchingNear] = useState(false);

  // Jaipur center coordinates
  const jaipurCenter = [26.9124, 75.7873];

  const handleNearSearch = async (e) => {
    if (e) e.preventDefault();
    setSearchingNear(true);
    try {
      const res = await fetchNearMeters(parseFloat(nearLat), parseFloat(nearLng), parseFloat(radiusKm));
      setNearResults(res);
    } catch (err) {
      alert(`Proximity search failed: ${err.message}`);
    } finally {
      setSearchingNear(false);
    }
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'Installed': return '#10b981'; // Green
      case 'Faulty': return '#ef4444';    // Red
      case 'Decommissioned': return '#64748b'; // Slate Gray
      default: return '#3b82f6';
    }
  };

  const displayedMeters = meters.filter((m) => {
    if (!m.geo || m.geo.lat === null || m.geo.lng === null) return false;
    if (filterStatus !== 'ALL' && m.installStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      {/* Map Control Bar */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} /> Status Filter:
          </span>
          {['ALL', 'Installed', 'Faulty', 'Decommissioned'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Proximity / Radius Filter Form */}
        <form onSubmit={handleNearSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Navigation size={14} color="var(--primary)" /> Spatial Radius:
          </span>
          <input
            type="number"
            step="0.001"
            className="input-text"
            style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
            placeholder="Lat"
            value={nearLat}
            onChange={(e) => setNearLat(e.target.value)}
          />
          <input
            type="number"
            step="0.001"
            className="input-text"
            style={{ width: '90px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
            placeholder="Lng"
            value={nearLng}
            onChange={(e) => setNearLng(e.target.value)}
          />
          <select
            className="select-input"
            style={{ width: '85px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
          >
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
          </select>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={searchingNear}>
            {searchingNear ? '...' : 'Find Near'}
          </button>
          {nearResults && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setNearResults(null)}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {nearResults && (
        <div className="alert-box alert-info" style={{ marginBottom: '1rem' }}>
          <MapPin size={16} />
          <span>Found <strong>{nearResults.total}</strong> meters within {nearResults.radiusKm} km of coordinates ({nearLat}, {nearLng}).</span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div className="card" style={{ padding: '0.5rem', overflow: 'hidden' }}>
        <MapContainer center={jaipurCenter} zoom={11} scrollWheelZoom={true} className="leaflet-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Optional radius boundary circle if search active */}
          {nearResults && (
            <Circle
              center={[parseFloat(nearLat), parseFloat(nearLng)]}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, dashArray: '4,4' }}
            />
          )}

          {/* Render Meter Markers */}
          {displayedMeters.map((meter) => (
            <CircleMarker
              key={meter.meterId}
              center={[meter.geo.lat, meter.geo.lng]}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                weight: 1.5,
                fillColor: getMarkerColor(meter.installStatus),
                fillOpacity: 0.9
              }}
            >
              <Popup>
                <div style={{ minWidth: '170px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                    Meter {meter.meterId}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Serial: {meter.serialNo}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <strong>Make:</strong> {meter.make} ({meter.phaseType})
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <strong>Status:</strong> {meter.installStatus}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <strong>DT:</strong> {meter.dtCode}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => onSelectMeter(meter)}
                  >
                    <Eye size={12} /> Inspect Meter
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          Installed (Green)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
          Faulty (Red)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block' }} />
          Decommissioned (Gray)
        </span>
      </div>
    </div>
  );
}
