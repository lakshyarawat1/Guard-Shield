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

## 2026-06-25 - Prevent O(N) filtering inside render loop
**Learning:** Found an inline `.filter` array operation running on a large dataset (alerts) inside the React render cycle in `Monitoring.tsx`. This caused O(N) operations on every render, severely impacting performance for large amounts of alerts.
**Action:** Use `useMemo` and derive metrics (like counts) from pre-existing memoized grouped data structures where possible to change O(N) operations into O(1) lookups.

## 2024-05-18 - [SQLite Subquery Performance]
**Learning:** Using `NOT IN` with a large subquery result (`SELECT id FROM packets ORDER BY id DESC LIMIT 10000`) forces SQLite to scan checking against the large list, resulting in O(N) performance that degrades significantly as the table grows (~16ms in test with 25k rows).
**Action:** Replace `id NOT IN (subquery)` with `id <= (SELECT id FROM packets ORDER BY id DESC LIMIT 1 OFFSET 10000)`. The `OFFSET` approach computes a single threshold value in O(log N) time, making the deletion over 40x faster (~0.4ms) and preventing the database bottleneck as traffic increases.
## 2025-02-28 - Unthrottled State Updates with Large Datasets
**Learning:** Found a critical performance bottleneck in `LiveTraffic.tsx` where high-frequency events (up to 10 emits/sec from Tauri backend) updated the component state immediately. Because the state contained a large array (up to 10,000 items) that was subsequently filtered and sorted (O(N log N)), updating the state 10 times a second crippled the main thread and caused high CPU usage.
**Action:** Always buffer and throttle React state updates for high-frequency events (like websockets or IPC listeners) when dealing with large datasets or heavy derived state calculations. A throttle of 500ms (2fps) keeps the UI feeling real-time while drastically reducing main thread blocking.
## 2026-06-30 - Missing Debounce on Rapid Input Triggers Expensive Array Operations
**Learning:** In `LiveTraffic.tsx`, state updates from typing in text fields directly triggered a `useMemo` filtering large arrays (up to 10,000 items). While the list rendering was virtualized, the upstream data operations still blocked the main thread on every keystroke, leading to severe input lag.
**Action:** When filtering large collections based on text input, always decouple the raw input state from the filter logic dependency by introducing a debounced state to ensure O(N) operations only run once typing pauses.
## 2025-02-28 - Unthrottled State Updates in SuspiciousTraffic
**Learning:** Found another instance of high-frequency events (up to 10 emits/sec) updating the state immediately in `SuspiciousTraffic.tsx`. This causes main thread blocking because a large array is pushed to state on every event trigger, which then triggers expensive React re-renders and re-computations of aggregations (top IPs, threat types, etc).
**Action:** Always buffer and throttle React state updates for high-frequency events (like websockets or IPC listeners) when dealing with datasets that update aggregations or complex UI states. A throttle of 500ms (2fps) keeps the UI feeling real-time while drastically reducing main thread blocking.
## 2025-02-28 - Buffer high-frequency async events from Tauri
**Learning:** In `LiveTraffic.tsx`, directly calling `setPackets` synchronously on every incoming batch from the `listen` Tauri event causes excessive React re-renders, especially under high network load.
**Action:** Use a mutable `useRef` array to buffer incoming asynchronous events (like `listen` payloads) and flush the buffer to React state on a fixed `setInterval` (e.g. 1000ms).
