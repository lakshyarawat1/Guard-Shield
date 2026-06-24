## 2025-02-28 - Unmemoized Filtering and Sorting in React Render
**Learning:** Found a critical performance bottleneck in `LiveTraffic.tsx` where filtering and sorting of a very large array (up to 10,000 packets) occurred on every render cycle. This resulted in significant CPU overhead and blocked the main thread.
**Action:** Always wrap heavy data processing operations (like filtering and sorting large datasets) in `useMemo` hooks, specifying exactly which dependencies should trigger a re-evaluation to avoid running complex operations synchronously inside the component body on each update.
## 2025-02-28 - Missing Index causes O(N) Table Scan in SQLite
**Learning:** The `get_telemetry_stats` query uses a date range `WHERE timestamp >= ?1` which without an index results in a slow full table scan.
**Action:** When querying rows over a time range, always ensure there is an index on the timestamp column.
## 2025-02-28 - Defeated useMemo by returning new array references
**Learning:** Found a critical performance bottleneck in `Monitoring.tsx` and `AnalyticsDashboard.tsx` where `.filter()` and `.slice()` were used outside of `useMemo`, returning new array references on every render. This defeated downstream `useMemo` hooks (like `sortedAlerts`) that depended on these arrays, causing O(N log N) sorting operations to run synchronously on every render.
**Action:** When deriving filtered or sliced arrays that are passed as dependencies to other hooks, always wrap the derivation in its own `useMemo` to ensure referential stability and prevent cascading re-renders.
## 2025-02-28 - Avoid redundant string operations inside loops/filters
**Learning:** In `ThreatFeed.tsx`, a `toLowerCase()` call was made repeatedly for the `searchTerm` variable inside the `.filter` loop callback. For arrays with hundreds or thousands of elements, this results in significant unnecessary work on the main thread.
**Action:** Always pre-compute static values (like calling `toLowerCase()` on a search term) before entering a `.filter` or `.map` loop to ensure they are only calculated once.
## 2025-06-24 - Inline Component Definitions inside Virtualized Lists cause Constant Remounting
**Learning:** In `LiveTraffic.tsx`, defining sub-components (Table, TableRow, TableBody, EmptyPlaceholder) inline within the `components` prop of `TableVirtuoso` causes React to see them as new component types on every render. Given the frequent updates from live packet capture, this leads to continuous unmounting and remounting of the entire DOM subtree, drastically reducing performance and causing high CPU usage.
**Action:** Always define components passed to virtualized lists (or any component accepting component props) at the module level outside the render loop. If they need state or props from the parent, pass it via the provided `context` prop.
