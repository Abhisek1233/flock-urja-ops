const { normalizeMeterRecord } = require('../normalize/nameplate');
const { normalizeHierarchy } = require('../normalize/hierarchy');

class MeterIndex {
  constructor() {
    this.meters = [];
    this.byId = new Map();
    this.bySerial = new Map();
    this.byDt = new Map();
    this.lastUpdatedAt = null;
    this.source = null;
  }

  /**
   * Loads an array of raw meter records from the export into the index.
   * @param {Array<object>} rawMeters
   * @param {string} source
   */
  load(rawMeters, source = 'bulk_export') {
    this.meters = [];
    this.byId.clear();
    this.bySerial.clear();
    this.byDt.clear();

    for (const raw of rawMeters) {
      const normalizedBase = normalizeMeterRecord(raw);
      if (!normalizedBase || !normalizedBase.meterId) continue;

      const hierarchy = normalizeHierarchy(raw.hierarchy);
      const meter = {
        ...normalizedBase,
        hierarchy
      };

      this.meters.push(meter);
      this.byId.set(meter.meterId, meter);
      if (meter.serialNo) {
        this.bySerial.set(meter.serialNo.toUpperCase(), meter);
      }
      if (meter.dtCode) {
        if (!this.byDt.has(meter.dtCode)) {
          this.byDt.set(meter.dtCode, []);
        }
        this.byDt.get(meter.dtCode).push(meter);
      }
    }

    this.lastUpdatedAt = new Date().toISOString();
    this.source = source;
  }

  /**
   * Direct O(1) lookup by meterId.
   */
  getById(meterId) {
    if (!meterId) return null;
    return this.byId.get(meterId.trim()) || null;
  }

  /**
   * Direct O(1) lookup by serial number.
   */
  getBySerial(serialNo) {
    if (!serialNo) return null;
    return this.bySerial.get(serialNo.trim().toUpperCase()) || null;
  }

  /**
   * Query meters with multiple filters, text search, sorting, and pagination.
   */
  query(filters = {}) {
    const {
      q,
      status,
      make,
      phase,
      installType,
      build,
      dt,
      zone,
      circle,
      division,
      substation,
      feeder,
      sort = 'meterId:asc',
      page = 1,
      pageSize = 20
    } = filters;

    let results = this.meters;

    // Search query: matches meterId or serialNo (case-insensitive substring)
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(m =>
        m.meterId.toLowerCase().includes(term) ||
        m.serialNo.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (status && status.trim()) {
      const s = status.trim().toLowerCase();
      results = results.filter(m => m.installStatus.toLowerCase() === s);
    }

    // Make filter
    if (make && make.trim()) {
      const mk = make.trim().toLowerCase();
      results = results.filter(m => m.make.toLowerCase() === mk);
    }

    // Phase filter
    if (phase && phase.trim()) {
      const p = phase.trim().toLowerCase();
      results = results.filter(m => m.phaseType === p);
    }

    // InstallType filter
    if (installType && installType.trim()) {
      const it = installType.trim().toLowerCase();
      results = results.filter(m => m.installType.toLowerCase() === it);
    }

    // Build filter
    if (build && build.trim()) {
      const b = build.trim().toLowerCase();
      results = results.filter(m => m.build.toLowerCase() === b);
    }

    // DT code filter
    if (dt && dt.trim()) {
      const d = dt.trim().toUpperCase();
      results = results.filter(m => m.dtCode.toUpperCase() === d);
    }

    // Hierarchy level filters
    if (zone && zone.trim()) {
      const z = zone.trim().toLowerCase();
      results = results.filter(m =>
        m.hierarchy?.levels?.zone?.name?.toLowerCase().includes(z) ||
        m.hierarchy?.levels?.zone?.code?.toLowerCase() === z
      );
    }
    if (circle && circle.trim()) {
      const c = circle.trim().toLowerCase();
      results = results.filter(m =>
        m.hierarchy?.levels?.circle?.name?.toLowerCase().includes(c) ||
        m.hierarchy?.levels?.circle?.code?.toLowerCase() === c
      );
    }
    if (division && division.trim()) {
      const d = division.trim().toLowerCase();
      results = results.filter(m =>
        m.hierarchy?.levels?.division?.name?.toLowerCase().includes(d) ||
        m.hierarchy?.levels?.division?.code?.toLowerCase() === d
      );
    }
    if (substation && substation.trim()) {
      const ss = substation.trim().toLowerCase();
      results = results.filter(m =>
        m.hierarchy?.levels?.substation?.name?.toLowerCase().includes(ss) ||
        m.hierarchy?.levels?.substation?.code?.toLowerCase() === ss
      );
    }
    if (feeder && feeder.trim()) {
      const f = feeder.trim().toLowerCase();
      results = results.filter(m =>
        m.hierarchy?.levels?.feeder?.name?.toLowerCase().includes(f) ||
        m.hierarchy?.levels?.feeder?.code?.toLowerCase() === f
      );
    }

    // Sorting
    const [sortField = 'meterId', sortOrder = 'asc'] = (sort || 'meterId:asc').split(':');
    const multiplier = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    results = [...results].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';
      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * multiplier;
      }
      return (valA > valB ? 1 : valA < valB ? -1 : 0) * multiplier;
    });

    // Pagination
    const total = results.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const totalPages = Math.ceil(total / ps) || 1;
    const startIndex = (p - 1) * ps;
    const paginated = results.slice(startIndex, startIndex + ps);

    return {
      data: paginated,
      total,
      page: p,
      pageSize: ps,
      totalPages
    };
  }

  /**
   * Aggregates stats across all meters in the index.
   */
  getStats() {
    const stats = {
      total: this.meters.length,
      byStatus: {},
      byMake: {},
      byPhase: {},
      byInstallType: {},
      byBuild: {},
      dataQuality: {
        totalAnomalousMeters: 0,
        missingHierarchyFieldCount: 0,
        aliasConflictCount: 0
      }
    };

    for (const m of this.meters) {
      stats.byStatus[m.installStatus] = (stats.byStatus[m.installStatus] || 0) + 1;
      stats.byMake[m.make] = (stats.byMake[m.make] || 0) + 1;
      stats.byPhase[m.phaseType] = (stats.byPhase[m.phaseType] || 0) + 1;
      stats.byInstallType[m.installType] = (stats.byInstallType[m.installType] || 0) + 1;
      stats.byBuild[m.build] = (stats.byBuild[m.build] || 0) + 1;

      if (m.hierarchy?.dataQuality?.hasMissingHierarchy || m.hierarchy?.dataQuality?.conflictFlags?.length > 0) {
        stats.dataQuality.totalAnomalousMeters++;
      }
      if (m.hierarchy?.dataQuality?.missingFields) {
        stats.dataQuality.missingHierarchyFieldCount += m.hierarchy.dataQuality.missingFields.length;
      }
      if (m.hierarchy?.dataQuality?.conflictFlags?.length > 0) {
        stats.dataQuality.aliasConflictCount++;
      }
    }

    return stats;
  }
}

module.exports = { MeterIndex };
