## 2025-02-28 - Unmemoized Filtering and Sorting in React Render
**Learning:** Found a critical performance bottleneck in `LiveTraffic.tsx` where filtering and sorting of a very large array (up to 10,000 packets) occurred on every render cycle. This resulted in significant CPU overhead and blocked the main thread.
**Action:** Always wrap heavy data processing operations (like filtering and sorting large datasets) in `useMemo` hooks, specifying exactly which dependencies should trigger a re-evaluation to avoid running complex operations synchronously inside the component body on each update.
## 2025-02-28 - Missing Index causes O(N) Table Scan in SQLite
**Learning:** The `get_telemetry_stats` query uses a date range `WHERE timestamp >= ?1` which without an index results in a slow full table scan.
**Action:** When querying rows over a time range, always ensure there is an index on the timestamp column.
