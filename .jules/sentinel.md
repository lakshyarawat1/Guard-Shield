## 2023-10-27 - [Path Traversal in Tauri File Commands]
**Vulnerability:** Arbitrary File Read/Write and Path Traversal found in `save_snapshot` and `restore_snapshot` Tauri commands. The frontend passed raw string paths which were directly used in `std::fs::copy` without validation.
**Learning:** Even if a desktop app uses standard file selection dialogs in the frontend, the backend Tauri commands cannot trust the provided path strings. A malicious frontend payload or compromised dependency could send any path (e.g. `/etc/passwd`).
**Prevention:** Always validate frontend-provided file paths against Tauri's FS scope plugin using `app.try_fs_scope()?.is_allowed(&path)` before executing raw Rust filesystem operations.
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
## 2024-07-24 - Path Traversal in Tauri IPC Commands
**Vulnerability:** The Tauri backend functions `save_snapshot` and `restore_snapshot` accepted unvalidated file paths from the frontend, allowing arbitrary file read/write (path traversal) using `std::fs::copy`.
**Learning:** In Tauri, the frontend can theoretically pass any path to backend commands. By default, raw Rust filesystem operations (like `std::fs::copy`) bypass Tauri's scope configurations (`fs` plugin scopes).
**Prevention:** Always validate file paths passed from the frontend using Tauri's FS scope plugin. Specifically, use `app.try_fs_scope().unwrap().is_allowed(&path)` before performing any file operations.
## 2024-07-28 - [Information Disclosure Prevention in Frontend Toasts]
**Vulnerability:** Raw error objects (like `e.toString()`, `err.message`) were being directly displayed to users via UI notifications (`toast.error`).
**Learning:** This is a common anti-pattern in React apps that can accidentally leak sensitive internal information (stack traces, file paths, specific backend database errors) to potentially malicious users when API or system calls fail.
**Prevention:** Always log raw errors to `console.error()` for debugging purposes, but render generic, sanitized error messages (e.g., "An internal error occurred", "Failed to retrieve data") in user-facing UI components.
