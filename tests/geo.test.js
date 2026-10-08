import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, findMetersNear } from '../src/index/geo';

describe('Geo & Haversine Distance', () => {
  it('calculates zero distance for identical coordinates', () => {
    const dist = haversineDistanceKm(26.9389, 75.8309, 26.9389, 75.8309);
    expect(dist).toBe(0);
  });

  it('accurately calculates distance between known points', () => {
    // Malviya Nagar (26.85, 75.81) to Bani Park (26.93, 75.79) is approx 9 km
    const dist = haversineDistanceKm(26.85, 75.81, 26.93, 75.79);
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(10);
  });

  it('filters meters within radius and sorts ascending by distance', () => {
    const meters = [
      { meterId: 'M1', geo: { lat: 26.9400, lng: 75.8300 } }, // ~0.15 km
      { meterId: 'M2', geo: { lat: 26.9389, lng: 75.8309 } }, // exact center, 0 km
      { meterId: 'M3', geo: { lat: 27.5000, lng: 76.0000 } }  // >60 km away
    ];

    const results = findMetersNear(meters, 26.9389, 75.8309, 5);
    expect(results.length).toBe(2);
    expect(results[0].meterId).toBe('M2');
    expect(results[0].distanceKm).toBe(0);
    expect(results[1].meterId).toBe('M1');
  });
});
