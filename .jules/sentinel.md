## 2024-05-24 - Avoid Information Leakage via Alert Dialogs
**Vulnerability:** Application internally exposed raw Tauri error objects, including messages and serialized JSON, directly to the user via JavaScript `alert()` pop-ups when window creation failed.
**Learning:** This practice can inadvertently leak sensitive internal paths, stack traces, or configuration details, violating the "fail securely" principle and providing potential reconnaissance data to an attacker.
**Prevention:** Always log detailed error information to the developer console (`console.error`) and display generic, non-revealing failure messages to the user in the UI.

## 2026-06-22 - WinDivert Filter String Injection
**Vulnerability:** User inputs (IP addresses and ports) were dynamically concatenated directly into WinDivert packet filter strings without validation. An attacker could provide malicious input like `1.1.1.1 or true` to alter the logic of the filter engine.
**Learning:** Filter string injection is a lesser-known but highly impactful vulnerability comparable to SQL injection, specifically affecting non-SQL query interfaces like BPF (Berkeley Packet Filter) or WinDivert filter strings. Unvalidated input can cause the system to drop all packets (DoS) or bypass intended IPS rules.
**Prevention:** Always parse and explicitly validate network-related user input (e.g., verifying it successfully parses as `std::net::IpAddr` or `u16` ports) before incorporating it into packet filtering rules.
## 2024-06-23 - Filter String Injection in WinDivert Engine
**Vulnerability:** User-provided inputs (IP addresses and ports) were being directly concatenated into WinDivert filter strings in `ips_engine.rs` without validation.
**Learning:** This is a classic injection vulnerability pattern applied to network filtering strings instead of SQL. Attackers could manipulate inputs (e.g., ports) with crafted payloads like `80 or ip.SrcAddr == 1.2.3.4` to bypass rules or drop all network traffic.
**Prevention:** All user-provided network configuration values must be explicitly parsed into strict types (e.g., `std::net::IpAddr` for IPs and `u16` for ports) before string formatting, failing securely if parsing fails.
