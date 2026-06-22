## 2024-05-24 - Avoid Information Leakage via Alert Dialogs
**Vulnerability:** Application internally exposed raw Tauri error objects, including messages and serialized JSON, directly to the user via JavaScript `alert()` pop-ups when window creation failed.
**Learning:** This practice can inadvertently leak sensitive internal paths, stack traces, or configuration details, violating the "fail securely" principle and providing potential reconnaissance data to an attacker.
**Prevention:** Always log detailed error information to the developer console (`console.error`) and display generic, non-revealing failure messages to the user in the UI.

## 2026-06-22 - WinDivert Filter String Injection
**Vulnerability:** User inputs (IP addresses and ports) were dynamically concatenated directly into WinDivert packet filter strings without validation. An attacker could provide malicious input like `1.1.1.1 or true` to alter the logic of the filter engine.
**Learning:** Filter string injection is a lesser-known but highly impactful vulnerability comparable to SQL injection, specifically affecting non-SQL query interfaces like BPF (Berkeley Packet Filter) or WinDivert filter strings. Unvalidated input can cause the system to drop all packets (DoS) or bypass intended IPS rules.
**Prevention:** Always parse and explicitly validate network-related user input (e.g., verifying it successfully parses as `std::net::IpAddr` or `u16` ports) before incorporating it into packet filtering rules.
