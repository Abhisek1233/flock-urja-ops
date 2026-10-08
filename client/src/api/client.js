const API_BASE = '/api/v1';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchMeters(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  }
  const res = await fetch(`${API_BASE}/meters?${query.toString()}`);
  return res.json();
}

export async function fetchMeterDetail(meterId) {
  const res = await fetch(`${API_BASE}/meters/${encodeURIComponent(meterId)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Meter ${meterId} not found`);
  }
  return res.json();
}

export async function fetchConsumption(meterId, { from, to } = {}) {
  const query = new URLSearchParams();
  if (from) query.append('from', from);
  if (to) query.append('to', to);
  const qStr = query.toString() ? `?${query.toString()}` : '';

  const res = await fetch(`${API_BASE}/meters/${encodeURIComponent(meterId)}/consumption${qStr}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to fetch consumption for ${meterId}`);
  }
  return res.json();
}

export async function fetchNearMeters(lat, lng, radiusKm = 5, limit = 50) {
  const res = await fetch(`${API_BASE}/meters/near?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&limit=${limit}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to search nearby meters');
  }
  return res.json();
}

export async function fetchHierarchy() {
  const res = await fetch(`${API_BASE}/hierarchy`);
  return res.json();
}

export async function triggerRefresh() {
  const res = await fetch(`${API_BASE}/index/refresh`, { method: 'POST' });
  return res.json();
}
