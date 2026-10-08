import React, { useState, useEffect } from 'react';
import { BarChart3, ListFilter, Map, GitFork } from 'lucide-react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { MetersTab } from './components/MetersTab';
import { MapTab } from './components/MapTab';
import { HierarchyTab } from './components/HierarchyTab';
import { MeterDetailModal } from './components/MeterDetailModal';
import { fetchHealth, fetchStats, fetchMeters, fetchHierarchy } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [allMeters, setAllMeters] = useState([]);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(null);

  const loadInitialData = async () => {
    try {
      const [h, s, m, hier] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchStats().catch(() => null),
        fetchMeters({ pageSize: 100 }).catch(() => ({ data: [] })),
        fetchHierarchy().catch(() => null)
      ]);
      setHealth(h);
      setStats(s);
      setAllMeters(m.data || []);
      setHierarchyData(hier);
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(async () => {
      const h = await fetchHealth().catch(() => null);
      if (h) setHealth(h);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <Header health={health} onRefresh={loadInitialData} />

      {/* Main Tab Navigation */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} /> Overview
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'meters' ? 'active' : ''}`}
          onClick={() => setActiveTab('meters')}
        >
          <ListFilter size={16} /> Meters Fleet
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Map size={16} /> Map View
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hierarchy')}
        >
          <GitFork size={16} /> Network Hierarchy
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'meters' && <MetersTab onSelectMeter={(m) => setSelectedMeter(m)} />}
        {activeTab === 'map' && <MapTab meters={allMeters} onSelectMeter={(m) => setSelectedMeter(m)} />}
        {activeTab === 'hierarchy' && <HierarchyTab hierarchyData={hierarchyData} />}
      </main>

      {/* Meter Inspection Modal */}
      {selectedMeter && (
        <MeterDetailModal
          meter={selectedMeter}
          onClose={() => setSelectedMeter(null)}
        />
      )}
    </div>
  );
}

export default App;
