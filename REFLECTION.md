# Reflection — Urja Meter Ops Engineering Take-Home

This document reflects on the decisions, technical discoveries, challenges, and lessons learned while designing and building the **Urja Meter Ops REST API Wrapper** and **React Web Client**.

---

### 1. What assumptions did you make?

1. **Read-Only Portal Invariant:**
   We assumed the legacy portal is strictly read-only and in production use by utility field personnel. We adhered strictly to polite probing (sub-second spacing, never hammering or performing load tests), ensuring zero risk of service disruption.
2. **Session Lifespan & Token Renewal:**
   From response inspection, `__Secure-better-auth.session_token` sets `Max-Age=3600` (1 hour). We assumed that proactive renewal at the 55-minute mark (300-second buffer), combined with single-flight reactive re-authentication on 401s or `/login` redirects, is the safest session strategy.
3. **Canonical Lineage over Local Codes:**
   We discovered that division codes (e.g., `D-01`) and subdivision codes (e.g., `SD-01`) recur under different circles. We assumed that physical asset locations must be identified by their **full lineage path** (`Zone / Circle / Division / Subdivision / Substation / Feeder / DT`), and never keyed by code alone.
4. **Timezone Representation:**
   The portal returns meter timestamps formatted as `DD/MM/YYYY HH:mm`. Because Urja Ops serves Jaipur power distribution, we assumed Indian Standard Time (IST, UTC+05:30) and normalized all timestamps to ISO 8601 (`YYYY-MM-DDTHH:mm:ss+05:30`).
5. **Cumulative Register vs. Interval Consumption:**
   The energy readings for active power (`kwh`) increase monotonically over time (e.g., 48,438.74 kWh to 48,580.79 kWh across 7 days). We assumed this represents a cumulative meter register and derived interval consumption by computing deltas ($\Delta kWh = kWh_t - kWh_{t-1}$).
6. **In-Memory Scale:**
   With 403 smart meters totaling ~200 KB of JSON, an in-memory index loaded at startup and refreshed periodically in the background is the right-sized, zero-overhead architectural choice.

---

### 2. Which part was the most difficult, and how did you get unstuck?

The most difficult challenge was **reverse-engineering the bulk export path and the `build: legacy` vs `v2` schema difference**:

1. **The HMAC Bulk Export:**
   On the Transformers page, an "Export all meters" button existed. Instead of a direct URL download, inspecting `4.2Bgc2kUI.js` revealed that the client was hitting `GET /portal/keys` to obtain an ephemeral `signingSecret`, then using Web Crypto to compute an HMAC-SHA256 signature over `["GET", "/portal/export", "page=1", timestamp].join("\n")` and passing `x-timestamp` and `x-signature` headers. Once we replicated this HMAC generator in Node.js, we were able to ingest the entire 403-meter dataset with complete hierarchies and coordinates in a single authenticated call, entirely bypassing the need to scrape 21 paginated HTML or search pages.
2. **The "Build" Discrepancy:**
   Initially, the difference between meters labeled `build: "legacy"` versus `build: "v2"` was completely unknown. By decoding SvelteKit's `devalue`-flattened `__data.json` on both meter types (J100000 vs. J100004), we discovered that:
   - **Legacy meters** format their nameplate as an array of parameter objects (`detail.data: [{ parameterName, parameterValue }]`).
   - **v2 meters** format their nameplate as a serialized JSON string in `detail.classData.installed_meter`.
   Uncovering this allowed us to write a unified normalizer that seamlessly bridges the two schema generations.

---

### 3. If you had another day, what would you improve?

1. **Persistent SQLite / Embedded Database with Change Detection:**
   While the in-memory index is optimal for 403 meters, with another day we would introduce an embedded SQLite database (via `better-sqlite3`) with spatial indexing (SpatiaLite) or an R-tree index. This would provide instant cold starts without an initial sync pause and enable point-in-time snapshot diffing to detect when meters change status or hierarchy.
2. **Historical Caching of Energy Series:**
   Right now, the wrapper queries `/portal/meters/:id/energy` live per meter and normalizes interval deltas on the fly. We would add an LRU cache or SQLite time-series table to store interval readings, minimizing upstream load when users view consumption repeatedly.
3. **Advanced Anomaly & Fraud Detection:**
   Expand the anomaly detector to flag phase unbalance (comparing Phase R against expected 3-phase loads), power factor anomalies ($kVAh$ vs $kWh$), and tamper events (sudden drops in voltage with non-zero current).
4. **Export Streaming & Webhook Notifications:**
   Implement streaming NDJSON / CSV exports for downstream data pipelines, and a webhook alerting system when a meter transitions from `Installed` to `Faulty`.

---

### 4. What mistake did you make while solving this (there's always one)?

During our initial live curl probes, we submitted a `POST /login` form request with `email` and `password` and immediately received an **`HTTP 403 Forbidden`** error with the message:
> *"Cross-site POST form submissions are forbidden"*.

For a few moments, this seemed like an opaque cloud firewall or bot-detection block. However, remembering that the application is built on SvelteKit, we realized SvelteKit enforces strict cross-site form submission checks by comparing the HTTP `Origin` header against the host. Because curl does not supply an `Origin` header by default, SvelteKit rejected the form action. Adding `Origin: https://urja-ops.flockenergy.tech` immediately solved the issue and yielded a clean `200 OK` redirect response with the session cookie.

A second mechanical mistake occurred during the implementation of `src/normalize/energy.js`: we initialized the variable tracking peak consumption as `peakDeltaKwh`, but in the return object referenced `peakIntervalKwh`, triggering a `ReferenceError` during our unit test run. Our test suite immediately surfaced the typo, and we fixed it with explicit property assignment (`peakIntervalKwh: peakDeltaKwh`).

---

### 5. If you were reviewing your own submission, what would you criticise?

1. **Cold Start Network Dependency:**
   On initial cold boot, the server pauses to fetch the live export from the portal before opening port 3000. While we implemented a fallback to `fixtures/meter-export.json` if the portal is unreachable, if the portal is slow to respond, boot time can take 2–3 seconds. In production, we would initialize the server immediately with the cached fixture and trigger the live sync asynchronously in the background.
2. **Coupling Consumption to Live Portal:**
   While meter lists and metadata are indexed in-memory, the consumption endpoint still makes an upstream call to the portal. If the legacy portal experiences downtime, `/api/v1/meters/:id/consumption` will fail with an upstream error (502/504), even though the rest of the API remains functional.
3. **Client Bundle Size:**
   In the React frontend, we imported Leaflet and Lucide icons. While the total gzipped bundle is reasonable (~103 KB), using dynamic `import()` for the map view would optimize the initial bundle size for users who only view tabular data.
