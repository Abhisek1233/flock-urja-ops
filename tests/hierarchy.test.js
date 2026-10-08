import { describe, it, expect } from 'vitest';
import { normalizeHierarchy, parseHierarchyNode } from '../src/normalize/hierarchy';
import { buildHierarchyTree } from '../src/index/hierarchyTree';

describe('Hierarchy Normalizer & Tree Builder', () => {
  it('parses node with code in parentheses', () => {
    const node = parseHierarchyNode('Jaipur Zone 1 (Z-01)');
    expect(node.name).toBe('Jaipur Zone 1');
    expect(node.code).toBe('Z-01');
    expect(node.isMissingName).toBe(false);
    expect(node.isMissingCode).toBe(false);
  });

  it('handles blank code or blank name with Unknown placeholders', () => {
    const blankCode = parseHierarchyNode({ name: 'Circle 6', code: '' });
    expect(blankCode.name).toBe('Circle 6');
    expect(blankCode.code).toBe('CIRCLE_6');
    expect(blankCode.isMissingCode).toBe(true);

    const blankName = parseHierarchyNode({ name: '', code: 'C-01' });
    expect(blankName.name).toBe('Unknown');
    expect(blankName.code).toBe('C-01');
    expect(blankName.isMissingName).toBe(true);
  });

  it('keeps duplicate codes in separate tree branches when parents differ', () => {
    const meters = [
      {
        meterId: 'M1',
        installStatus: 'Installed',
        hierarchy: normalizeHierarchy({
          zone: { name: 'Zone 1', code: 'Z-01' },
          circle: { name: 'Circle 1', code: 'C-01' },
          division: { name: 'Division 1', code: 'D-01' },
          subdivision: { name: 'Subdivision 1', code: 'SD-01' },
          substation: { name: 'SS 1', code: 'SS-01' },
          feeder: { name: 'Feeder 1', code: 'F-001' },
          dt: { name: 'DT 1', code: 'DT-001' }
        })
      },
      {
        meterId: 'M2',
        installStatus: 'Faulty',
        hierarchy: normalizeHierarchy({
          zone: { name: 'Zone 1', code: 'Z-01' },
          circle: { name: 'Circle 2', code: 'C-02' },
          division: { name: 'Division 1', code: 'D-01' }, // duplicate code under different circle!
          subdivision: { name: 'Subdivision 1', code: 'SD-01' },
          substation: { name: 'SS 2', code: 'SS-02' },
          feeder: { name: 'Feeder 2', code: 'F-002' },
          dt: { name: 'DT 2', code: 'DT-002' }
        })
      }
    ];

    const { tree, summary } = buildHierarchyTree(meters);
    expect(summary.totalMeters).toBe(2);
    expect(tree.length).toBe(1); // One Zone 1 root

    const zone1 = tree[0];
    expect(zone1.children.length).toBe(2); // Circle 1 and Circle 2

    const circle1 = zone1.children[0];
    const circle2 = zone1.children[1];
    expect(circle1.children[0].code).toBe('D-01');
    expect(circle2.children[0].code).toBe('D-01');
    // Ensure they are distinct node objects in memory
    expect(circle1.children[0]).not.toBe(circle2.children[0]);
  });

  it('flags DT-007 alias collision in dataQuality', () => {
    const h = normalizeHierarchy({
      zone: { name: 'Zone 1', code: 'Z-01' },
      circle: { name: 'Circle 1', code: 'C-01' },
      division: { name: 'Division 1', code: 'D-01' },
      subdivision: { name: 'Subdivision 1', code: 'SD-01' },
      substation: { name: 'SS 1', code: 'SS-01' },
      feeder: { name: 'Feeder 1', code: 'F-001' },
      dt: { name: 'Old Malviya Nagar Xfmr', code: 'DT-007' }
    });

    expect(h.dataQuality.conflictFlags).toContain('DT_NAME_ALIAS_COLLISION');
  });
});
