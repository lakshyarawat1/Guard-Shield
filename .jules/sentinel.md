## 2024-05-24 - Avoid Information Leakage via Alert Dialogs
**Vulnerability:** Application internally exposed raw Tauri error objects, including messages and serialized JSON, directly to the user via JavaScript `alert()` pop-ups when window creation failed.
**Learning:** This practice can inadvertently leak sensitive internal paths, stack traces, or configuration details, violating the "fail securely" principle and providing potential reconnaissance data to an attacker.
**Prevention:** Always log detailed error information to the developer console (`console.error`) and display generic, non-revealing failure messages to the user in the UI.
