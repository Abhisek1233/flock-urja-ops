# Urja Meter Ops — REST API Wrapper & Modern Web Client

[![Tests](https://img.shields.io/badge/Tests-27%20passed-brightgreen.svg)]()
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-blue.svg)](openapi.json)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-green.svg)]()
[![React](https://img.shields.io/badge/React-18-61dafb.svg)]()

A clean, modern, and resilient REST API wrapper and operational dashboard built around the legacy utility web portal **"Urja Meter Ops"** (`https://urja-ops.flockenergy.tech`).

---

### 🚀 Live Deployments

* **Frontend Web Dashboard (Vercel):** [https://flock-urja-ops.vercel.app](https://flock-urja-ops.vercel.app)
* **Backend API Gateway (Render):** [https://flock-urja-ops.onrender.com](https://flock-urja-ops.onrender.com)
* **Interactive API Docs (Swagger UI):** [https://flock-urja-ops.onrender.com/docs](https://flock-urja-ops.onrender.com/docs)
* **OpenAPI 3.0 Specification:** [https://flock-urja-ops.onrender.com/openapi.json](https://flock-urja-ops.onrender.com/openapi.json)
* **Service Health Check:** [https://flock-urja-ops.onrender.com/api/v1/health](https://flock-urja-ops.onrender.com/api/v1/health)

---

## Table of Contents
1. [Overview & Objective](#overview--objective)
2. [Architecture & Project Structure](#architecture--project-structure)
3. [Quickstart: Install & Run](#quickstart-install--run)
4. [API Endpoints & Sample Requests](#api-endpoints--sample-requests)
5. [Key Technical Discoveries](#key-technical-discoveries)
6. [Design Decisions & Trade-offs](#design-decisions--trade-offs)
7. [What Was Intentionally Skipped & Why](#what-was-intentionally-skipped--why)
8. [What I'd Improve with More Time](#what-id-improve-with-more-time)
9. [Documentation Links](#documentation-links)
10. [Reflection](#reflection)

---

## 1. Overview & Objective

Electricity distribution utilities frequently rely on aging internal web applications that require field engineers to manually browse web pages, lacking any programmatic API for product and analytics teams. 

This project solves that challenge by providing:
1. **Automated Session & Resilience Layer:** Cookie-jar persistence, proactive renewal, and single-flight reactive re-login handling SvelteKit CSRF mechanics.
2. **Reverse-Engineered Bulk Ingestion:** Extraction of the full 403-meter dataset via authenticated HMAC-SHA256 signing, eliminating fragile multi-page screen scraping.
3. **In-Memory Query Engine:** Sub-millisecond multi-attribute filtering, sorting, pagination, and Haversine geo-distance queries.
4. **Distribution Hierarchy Tree:** Path-keyed 7-tier distribution topology resolving duplicate local codes and flagging data-quality anomalies.
5. **Standardized REST API with OpenAPI 3.0:** Documented endpoints under `/api/v1` with interactive Swagger UI served at `/docs`.
6. **Modern React (Vite) Web Client:** Clean operational UI featuring KPI cards, interactive table, Leaflet spatial map, half-hourly consumption charts, and a collapsible hierarchy explorer.

---

## 2. Architecture & Project Structure

The project separates concerns into modular, decoupled layers:

```
flock-urja-ops/
├── src/
│   ├── config.js                 # Environment configuration (PORT, BASE_URL, credentials)
│   ├── app.js                    # Express application factory & middleware
│   ├── server.js                 # Server bootstrapper & graceful shutdown
│   ├── portal/                   # Upstream portal adapter layer
│   │   ├── auth.js               # Login execution, cookie jar & session management
│   │   ├── client.js             # Authenticated Axios client with auto-reauth
│   │   ├── singleFlight.js       # Mutex preventing concurrent re-login stampedes
│   │   ├── export.js             # HMAC-SHA256 signer & bulk export fetcher
│   │   └── live.js               # Real-time geo, energy, and search client
│   ├── normalize/                # Pure normalization functions
│   │   ├── devalue.js            # SvelteKit devalue unflattening
│   │   ├── nameplate.js          # Unifies legacy & v2 schema into typed records
│   │   ├── hierarchy.js          # Cleans whitespace, blanks, and builds lineage paths
│   │   └── energy.js             # ISO 8601 timestamps, interval deltas, anomaly detection
│   ├── index/                    # In-memory query engine
│   │   ├── meterIndex.js         # O(1) hash maps, multi-filter query, sorting, pagination
│   │   ├── hierarchyTree.js      # 7-tier topology tree with node counts & quality flags
│   │   ├── geo.js                # Haversine distance & spatial proximity queries
│   │   └── sync.js               # Background TTL worker & manual sync coordinator
│   └── api/                      # REST API & documentation
│       ├── routes/               # meters, hierarchy, stats, health, admin
│       ├── middleware/           # Zod validation & consistent error envelopes
│       └── openapi.js            # Swagger UI mount & spec server
├── client/                       # React 18 + Vite frontend dashboard
│   ├── src/
│   │   ├── components/           # Header, OverviewTab, MetersTab, MapTab, HierarchyTab, Modal
│   │   ├── api/client.js         # API client querying /api/v1
│   │   ├── App.jsx               # Main application controller
│   │   └── index.css             # Design system styling
│   └── package.json
├── fixtures/                     # Real offline test fixtures captured from live probe
│   ├── meter-export.json         # All 403 meter records
│   ├── legacy-meter-data.json    # Devalue fixture for J100000
│   ├── v2-meter-data.json        # Devalue fixture for J100004
│   └── legacy-meter-energy.json  # 7-day half-hourly consumption series
├── tests/                        # Vitest automated test suites (27 tests)
├── openapi.json                  # OpenAPI 3.0 specification
├── PROTOCOL.md                   # Full reverse engineering protocol discovery
├── REFLECTION.md                 # 5 comprehensive reflection answers
├── .env.example                  # Environment template
└── package.json                  # Root dependencies & scripts
```

---

## 3. Quickstart: Install & Run

### Prerequisites
- Node.js (v18+ recommended, tested on v22.13.1)
- npm (v9+)

### Step 1: Clone & Configure
```bash
git clone <repo-url>
cd flock-urja-ops

# Create environment configuration
cp .env.example .env
```

Your `.env` file should contain:
```env
PORT=3000
BASE_URL=https://urja-ops.flockenergy.tech
PORTAL_EMAIL=operator@urja.local
PORTAL_PASSWORD=urja-ops-2026
CACHE_TTL_MINUTES=15
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 3: Run the Application
You can run the API server directly (it serves both the REST API and the pre-built React frontend), or run Vite in development mode:

**Option A — Run Backend (includes built frontend & Swagger UI):**
```bash
# Build the client first
cd client && npm run build && cd ..

# Start backend server
npm start
```
* **REST API:** `http://localhost:3000/api/v1/meters`
* **Interactive Swagger UI:** `http://localhost:3000/docs`
* **OpenAPI 3.0 Specification:** `http://localhost:3000/openapi.json`
* **Frontend Web Dashboard:** `http://localhost:3000/`

**Option B — Run Frontend in Vite Dev Mode:**
```bash
# In terminal 1:
npm start

# In terminal 2:
cd client
npm run dev
```
* **Vite Dashboard:** `http://localhost:5173` (proxies API requests to port 3000).

### Step 4: Run Automated Tests
```bash
npm test
```
Runs all 27 unit and integration tests across normalizers, devalue decoding, single-flight mutex, geo-proximity, and API routes.

---

## 4. API Endpoints & Sample Requests

All API responses follow consistent JSON envelopes. Errors strictly return `{ "error": { "code": "...", "message": "...", "details": ... } }`.

### 1. Health & Cache Status
```bash
curl -s http://localhost:3000/api/v1/health
```
```json
{
  "status": "healthy",
  "timestamp": "2026-10-08T19:00:20.123Z",
  "index": {
    "status": "ready",
    "meterCount": 403,
    "lastRefreshedAt": "2026-10-08T18:59:58.456Z",
    "source": "live_portal_export",
    "ttlMinutes": 15
  },
  "portalSession": {
    "authenticated": true,
    "ageSeconds": 22,
    "expiresInSeconds": 3578
  }
}
```

### 2. System KPI Statistics
```bash
curl -s http://localhost:3000/api/v1/stats
```
```json
{
  "total": 403,
  "byStatus": {
    "Decommissioned": 75,
    "Installed": 238,
    "Faulty": 90
  },
  "byMake": {
    "HPL": 90,
    "Genus": 88,
    "Secure": 85,
    "Allied": 76,
    "L&T": 64
  },
  "byPhase": { "single": 277, "three": 126 },
  "byInstallType": { "Whole Current": 205, "CT Operated": 198 },
  "byBuild": { "legacy": 238, "v2": 165 },
  "dataQuality": {
    "totalAnomalousMeters": 22,
    "missingHierarchyFieldCount": 24,
    "aliasConflictCount": 3
  }
}
```

### 3. Filtered Meter Search
```bash
curl -s "http://localhost:3000/api/v1/meters?status=Installed&make=Genus&pageSize=2"
```
```json
{
  "data": [
    {
      "meterId": "J100003",
      "serialNo": "L&84997",
      "make": "Genus",
      "phaseType": "single",
      "installStatus": "Installed",
      "installType": "Whole Current",
      "build": "legacy",
      "dtCode": "DT-004",
      "geo": { "lat": 26.8716, "lng": 75.7626 },
      "hierarchy": {
        "path": "Jaipur Zone 1 / Circle 4 / Division 4 / Subdivision 4 / Substation 4 / Feeder 4 / Raja Park DT 4",
        "dataQuality": { "hasMissingHierarchy": false }
      }
    }
  ],
  "total": 52,
  "page": 1,
  "pageSize": 2,
  "totalPages": 26
}
```

### 4. Spatial Proximity Query (Haversine Formula)
```bash
curl -s "http://localhost:3000/api/v1/meters/near?lat=26.9389&lng=75.8309&radiusKm=2&limit=2"
```
```json
{
  "center": { "lat": 26.9389, "lng": 75.8309 },
  "radiusKm": 2,
  "total": 2,
  "data": [
    {
      "meterId": "J100000",
      "serialNo": "SE33962",
      "make": "HPL",
      "distanceKm": 0
    },
    {
      "meterId": "J100218",
      "serialNo": "GE39438",
      "make": "Secure",
      "distanceKm": 0.341
    }
  ]
}
```

### 5. Consumption History with Interval Deltas & Anomaly Detection
```bash
curl -s "http://localhost:3000/api/v1/meters/J100000/consumption?from=2026-06-25&to=2026-06-26"
```
```json
{
  "meterId": "J100000",
  "serialNo": "SE33962",
  "queryWindow": { "from": "2026-06-25", "to": "2026-06-26" },
  "summary": {
    "totalReadings": 96,
    "totalKwhDelta": 40.16,
    "avgIntervalKwh": 0.42,
    "peakIntervalKwh": 0.43,
    "avgVoltage": 230.1,
    "minVoltage": 221,
    "maxVoltage": 240
  },
  "anomalies": [],
  "data": [
    {
      "timestamp": "2026-06-25T00:00:00+05:30",
      "rawTimestamp": "25/06/2026 00:00",
      "kwh": 48459.45,
      "kvah": 52336.21,
      "voltR": 226,
      "deltaKwh": 0,
      "deltaKvah": 0,
      "anomalies": []
    },
    {
      "timestamp": "2026-06-25T00:30:00+05:30",
      "rawTimestamp": "25/06/2026 00:30",
      "kwh": 48459.87,
      "kvah": 52336.67,
      "voltR": 231,
      "deltaKwh": 0.42,
      "deltaKvah": 0.46,
      "anomalies": []
    }
  ]
}
```

---

## 5. Key Technical Discoveries

1. **SvelteKit CSRF Verification:**
   The portal verifies the `Origin` header on `POST /login`. Omitting it yields `403 Forbidden` (`Cross-site POST form submissions are forbidden`). Setting `Origin: https://urja-ops.flockenergy.tech` satisfies the check.
2. **The "Build" Discrepancy (`legacy` vs `v2`):**
   Meters marked `legacy` store their nameplate attributes in an array of parameter objects (`detail.data: [{ parameterName, parameterValue }]`). Meters marked `v2` store attributes as a JSON string inside `classData.installed_meter`. Our normalizer bridges both schemas.
3. **HMAC-SHA256 Bulk Export Scheme:**
   The portal provides an "Export all meters" function that uses a temporary signing secret from `GET /portal/keys` to compute an HMAC-SHA256 signature over `["GET", "/portal/export", "page=1", timestamp].join("\n")`. Automating this allowed us to ingest all 403 meters in a single operation.
4. **Duplicate Codes in Hierarchy:**
   Level codes like `D-01` (Division) and `SD-01` (Subdivision) appear under multiple parent circles. Keying nodes by code alone creates cyclic or corrupted graphs; keying by the **full lineage path** guarantees tree integrity.

---

## 6. Design Decisions & Trade-offs

| Decision | Rationale | Trade-off |
| :--- | :--- | :--- |
| **In-Memory Query Index** | 403 meters (~200 KB) fit entirely in Node.js memory. Provides sub-millisecond lookups, zero database operational overhead, and eliminates portal hammering. | Cold starts require ~1s to sync from the portal or fallback to fixtures. Will struggle beyond 50k–100k meters. |
| **Path-Keyed Hierarchy** | Division and subdivision codes are reused across different circles. Path-keying preserves absolute lineage integrity. | Hierarchy node keys are longer strings rather than compact IDs. |
| **On-Demand Consumption Fetching** | Consumption data is queried live per meter from `/portal/meters/:id/energy` rather than pre-fetching 403 × 337 readings at boot. | Meter consumption endpoint depends on real-time portal connectivity. |
| **Single-Flight Login Mutex** | When multiple concurrent requests hit an expired session, only one request executes `POST /login` while others await the result. | Minimal queuing delay for concurrent requests during re-login. |

---

## 7. What Was Intentionally Skipped & Why

1. **External Database (PostgreSQL / MongoDB / Redis):**
   Introducing a database would add Docker/database setup friction for reviewers with zero performance advantage at 403 meters.
2. **HTML Table Scraping:**
   Because we discovered the native JSON `/portal/meters/search` and the HMAC bulk export, scraping HTML tables with Cheerio was completely unnecessary. Clean JSON consumption is faster and far less brittle.
3. **Write / Mutation Endpoints:**
   The legacy portal is read-only. We intentionally omitted any synthetic mutation endpoints (e.g. creating or updating meters).

---

## 8. What I'd Improve with More Time

1. **Embedded SQLite with Spatial Indexing (SpatiaLite):**
   Persist the index in an embedded SQLite file to allow instantaneous cold starts without an initial sync pause.
2. **Historical Cache for Time-Series Consumption:**
   Add an LRU cache or local SQLite time-series table to cache half-hourly consumption readings.
3. **Advanced Tamper & Voltage Diagnostics:**
   Introduce power factor analysis ($kVAh$ vs $kWh$) and unbalance detection.
4. **Export Streaming:**
   Implement streaming NDJSON / CSV endpoints for large data export.

---

## 9. Documentation Links

- **[PROTOCOL.md](PROTOCOL.md):** Complete reverse-engineering findings, request/response payloads, and authentication mechanics.
- **[openapi.json](openapi.json):** Standard OpenAPI 3.0 specification for the wrapper API.
- **[REFLECTION.md](REFLECTION.md):** Detailed answers to the 5 engineering reflection prompts.

---

## 10. Reflection

*(Summary of the 5 prompts — see [REFLECTION.md](REFLECTION.md) for full essay)*

1. **Assumptions Made:** Assumed read-only portal access, 1-hour session lifespan, IST (+05:30) timezone, and cumulative kWh register behavior.
2. **Hardest Part & Resolution:** Reverse-engineering the HMAC-SHA256 signing scheme in `4.2Bgc2kUI.js` and unraveling the `legacy` vs `v2` `classData` schema difference in SvelteKit's `devalue` payload.
3. **What I'd Improve with Another Day:** Add SQLite caching for consumption series, spatial indexing, and tamper event detection.
4. **Real Mistake Made:** SvelteKit rejected our initial curl login with `403 Forbidden` because curl does not include an `Origin` header. Adding `Origin: https://urja-ops.flockenergy.tech` resolved SvelteKit's CSRF check.
5. **Self-Criticism:** The initial cold start depends on fetching the live bulk export (or local fixture fallback) before port 3000 opens; starting immediately with cached data and syncing asynchronously would improve perceived boot time.
