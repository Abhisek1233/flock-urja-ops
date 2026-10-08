# Urja Meter Ops — Protocol & Reverse Engineering Discovery

## 1. Executive Summary

This document captures the protocol, reverse-engineered internal APIs, authentication mechanics, and data quirks of the legacy **Urja Meter Ops** portal (`https://urja-ops.flockenergy.tech`).

All findings below were verified via live HTTP probing against the production portal.

---

## 2. Authentication Workflow

### 2.1 Login Request
* **Endpoint:** `POST /login`
* **Content-Type:** `application/x-www-form-urlencoded`
* **Payload:** `email=operator%40urja.local&password=urja-ops-2026`
* **Mandatory Header:** `Origin: https://urja-ops.flockenergy.tech`
  * **Finding:** SvelteKit has built-in cross-site form protection. Submissions without the `Origin` header fail with `HTTP 403 Forbidden` (`Cross-site POST form submissions are forbidden`).
  * `x-sveltekit-action` is optional when `Origin` is present.

### 2.2 Successful Login Response
* **HTTP Status:** `200 OK` (SvelteKit action redirect response)
* **Body:**
  ```json
  {"type":"redirect","status":303,"location":"/meters"}
  ```
* **Cookie Set:**
  ```http
  Set-Cookie: __Secure-better-auth.session_token=<token>; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax
  ```
* **Session Lifecycle:** 1 hour (`Max-Age=3600`).

### 2.3 Failed Login Response
* **HTTP Status:** `200 OK` (SvelteKit returns action failure as 200 with JSON payload)
* **Body:**
  ```json
  {"type":"failure","status":401,"data":"[{\"email\":1,\"error\":2},\"operator@urja.local\",\"Invalid email or password.\"]"}
  ```
* No `Set-Cookie` header is returned.

### 2.4 Unauthenticated / Expired Session Behavior
Different endpoint categories fail in three distinct ways:
1. **Internal JSON APIs (`/portal/*`):**
   * Returns `HTTP 401 Unauthorized`
   * Body: `{"error":"unauthorized","message":"A valid session is required."}`
2. **SvelteKit `__data.json` endpoints (`/meters/:id/__data.json`):**
   * Returns `HTTP 200 OK`
   * Body: `{"type":"redirect","location":"/login"}`
3. **HTML Page Routes (`/meters`, `/transformers`):**
   * Returns `HTTP 302 Found` with header `Location: /login`.

---

## 3. Discovered Endpoints

### 3.1 Meter Search (`/portal/meters/search`)
* **Method:** `GET`
* **URL:** `/portal/meters/search?q=<query>&page=<page>`
* **Parameters:**
  * `q`: Search string (meter ID prefix or serial number). Case-insensitive (e.g. `se3` matches `SE33962`, `SE35634`, etc.).
  * `page`: 1-based page index. Default page size is 20.
* **Pagination & Bounds:**
  * Total meters: 403.
  * Total pages: 21 (pages 1–20 have 20 items; page 21 has 3 items).
  * Out of bounds (e.g. `page=22`): returns `200 OK` with `{"data":[],"total":403,"page":22,"pageSize":20}`.
* **Sample Response:**
  ```json
  {
    "data": [
      {
        "meterId": "J100000",
        "serialNo": "SE33962",
        "make": "HPL",
        "phaseType": "single",
        "installStatus": "Decommissioned",
        "dtCode": "DT-001"
      }
    ],
    "total": 403,
    "page": 1,
    "pageSize": 20
  }
  ```

---

### 3.2 SvelteKit Meter Detail Data (`/meters/{id}/__data.json`)
* **Method:** `GET`
* **URL:** `/meters/{id}/__data.json`
* **Format:** SvelteKit `devalue`-flattened payload.
* **Payload Structure:** `nodes[2].data` holds `{ meterId, detail, hierarchy }`.
* **The "Build" Discrepancy (`legacy` vs `v2`):**
  * **Legacy Build Meters (e.g. J100000):**
    ```json
    "detail": {
      "data": [
        {"parameterName": "Meter ID", "parameterValue": "J100000"},
        {"parameterName": "Serial No", "parameterValue": "SE33962"},
        {"parameterName": "Make", "parameterValue": "HPL"},
        {"parameterName": "Phase Type", "parameterValue": "single"},
        {"parameterName": "Installation Status", "parameterValue": "Decommissioned"},
        {"parameterName": "Installation Type", "parameterValue": "Whole Current"}
      ]
    }
    ```
  * **V2 Build Meters (e.g. J100004):**
    ```json
    "detail": {
      "classData": "{\"installed_meter\":{\"MeterId\":\"J100004\",\"SerialNo\":\"SE65293\",\"Make\":\"Genus\",\"PhaseType\":\"single\",\"InstallationStatus\":\"Faulty\",\"InstallationType\":\"CT Operated\"}}"
    }
    ```
  * In `v2`, nameplate details are stored as a JSON string inside a `classData.installed_meter` property, whereas `legacy` stores them as an array of parameter objects.

---

### 3.3 Meter Geolocation (`/portal/meters/{id}/geo`)
* **Method:** `GET`
* **URL:** `/portal/meters/{id}/geo`
* **Response:**
  ```json
  {
    "data": {
      "latitude": "26.938961002479868",
      "longitude": "75.83095696146852"
    }
  }
  ```
* **Error (Unknown Meter):** `HTTP 404 Not Found` with `{"error":"not_found","message":"Meter not found"}`.

---

### 3.4 Meter Energy Consumption (`/portal/meters/{id}/energy`)
* **Method:** `GET`
* **URL:** `/portal/meters/{id}/energy?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
* **Parameters:**
  * Supports native `from` and `to` query parameters in `YYYY-MM-DD` format.
  * Without parameters: returns default ~7 day window (337 half-hourly intervals).
* **Sample Response Item:**
  ```json
  {
    "timestamp": "23/06/2026 23:30",
    "kwh": "48438.74",
    "kvah": "52313.84",
    "voltR": "226"
  }
  ```
* **Data Observations:**
  * `timestamp`: String formatted as `DD/MM/YYYY HH:mm` (Jaipur utility time / IST, UTC+05:30).
  * `kwh`: Cumulative active energy register in kWh. Values increase monotonically. Interval consumption is derived by calculating delta $\Delta kWh = kWh_t - kWh_{t-1}$.
  * `kvah`: Cumulative apparent energy register in kVAh.
  * `voltR`: Line voltage in Volts for Phase R (typically 220–240 V).
* **Error (Unknown Meter):** `HTTP 404 Not Found` with `{"error":"not_found","message":"Meter not found"}`.

---

### 3.5 Bulk Export via HMAC-SHA256 (`/portal/keys` and `/portal/export`)
* **Export Discovery:** The "Export all meters" button on the `/transformers` page downloads all 403 meter records with full hierarchies and coordinates.
* **Security Mechanism:**
  1. Frontend calls `GET /portal/keys` with the session cookie.
     Response: `{"data":{"signingSecret":"..."}}`
  2. Frontend signs the request string `GET\n/portal/export\npage=1\n<unix_timestamp_seconds>` using HMAC-SHA256 with the `signingSecret`.
  3. Frontend sends `GET /portal/export?page=1` with headers:
     * `x-timestamp`: `<unix_timestamp_seconds>`
     * `x-signature`: `<hex_hmac_sha256>`
* **Payload Shape:** An array of 403 comprehensive meter records:
  ```json
  {
    "meterId": "J100000",
    "serialNo": "SE33962",
    "make": "HPL",
    "phaseType": "single",
    "installStatus": "Decommissioned",
    "installType": "Whole Current",
    "build": "legacy",
    "dtCode": "DT-001",
    "hierarchy": {
      "zone": { "name": "Jaipur Zone 1", "code": "Z-01" },
      "circle": { "name": "Circle 1", "code": "C-01" },
      "division": { "name": "Division 1", "code": "D-01" },
      "subdivision": { "name": "Subdivision 1", "code": "SD-01" },
      "substation": { "name": "Substation 1", "code": "SS-01" },
      "feeder": { "name": "Feeder 1", "code": "F-001" },
      "dt": { "name": "Malviya Nagar DT 1", "code": "DT-001" }
    },
    "geo": {
      "lat": 26.938961002479868,
      "lng": 75.83095696146852
    }
  }
  ```

---

### 3.6 Distribution Transformers (`/portal/dts`)
* **Method:** `GET`
* **URL:** `/portal/dts?page=1`
* **Total:** 40 Distribution Transformers.
* **Fields:** `code` (e.g. `DT-001`), `name`, `feederCode` (e.g. `F-001`), `capacityKva` (e.g. 100).

---

## 4. Data Anomalies & Quality Insights

1. **Hierarchy Code Non-Uniqueness:**
   * Level codes are local, NOT globally unique:
     * `D-01` appears under Circle `C-01`, `C-03`, and `C-05`.
     * `SD-01` appears under Division `D-01`, `D-05`, and `D-09`.
   * **Rule:** Hierarchy trees and lookup paths must be keyed by the **full lineage path** (`zone/circle/division/...`), never by code alone.
2. **Missing Hierarchy Values:**
   * 22 meters have blank codes or blank names at intermediate levels (e.g., blank circle code on J100011, blank feeder name on J100162).
   * **Rule:** Normalize missing strings to `"Unknown"` with a standardized placeholder code `UNKNOWN`, and flag `dataQuality: { hasMissingHierarchy: true }`.
3. **Conflicting DT Names:**
   * `DT-007` appears as `"Malviya Nagar DT 1"` (on J100006), `"Sanganer DT 7"` (in `/portal/dts`), and `"Old Malviya Nagar Xfmr"` (on J100400).
   * **Rule:** Flag naming collisions in metadata and maintain path integrity.
4. **Coordinate Precision:**
   * Latitudes span `26.78` to `27.04` N, Longitudes span `75.66` to `75.91` E (Jaipur urban cluster).
   * Geolocation values in `/portal/meters/{id}/geo` are string representations of floating-point coordinates and must be coerced to IEEE 754 numbers.
5. **Cumulative Register vs Interval Consumption:**
   * Meter readings provide running cumulative registers. To display true consumption over time, calculate deltas between consecutive intervals ($\Delta kWh$). Negative deltas indicate meter reset or rollover and must be flagged as register anomalies.
