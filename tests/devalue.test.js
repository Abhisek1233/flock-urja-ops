import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { decodeDevaluePayload } from '../src/normalize/devalue';

describe('Devalue Payload Decoding', () => {
  it('decodes real legacy meter devalue fixture (J100000)', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/legacy-meter-data.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const decoded = decodeDevaluePayload(raw.nodes[2].data);

    expect(decoded).toBeDefined();
    expect(decoded.meterId).toBe('J100000');
    expect(Array.isArray(decoded.detail.data)).toBe(true);
    expect(decoded.hierarchy['Zone']).toContain('Jaipur Zone 1');
  });

  it('decodes real v2 meter devalue fixture (J100004)', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/v2-meter-data.json');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const decoded = decodeDevaluePayload(raw.nodes[2].data);

    expect(decoded).toBeDefined();
    expect(decoded.meterId).toBe('J100004');
    expect(decoded.detail.classData).toBeDefined();
    const classObj = JSON.parse(decoded.detail.classData);
    expect(classObj.installed_meter.MeterId).toBe('J100004');
    expect(classObj.installed_meter.Make).toBe('Genus');
  });
});
