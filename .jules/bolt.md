## 2025-02-28 - Unmemoized Filtering and Sorting in React Render
**Learning:** Found a critical performance bottleneck in `LiveTraffic.tsx` where filtering and sorting of a very large array (up to 10,000 packets) occurred on every render cycle. This resulted in significant CPU overhead and blocked the main thread.
**Action:** Always wrap heavy data processing operations (like filtering and sorting large datasets) in `useMemo` hooks, specifying exactly which dependencies should trigger a re-evaluation to avoid running complex operations synchronously inside the component body on each update.
