## 2023-10-27 - [Path Traversal in Tauri File Commands]
**Vulnerability:** Arbitrary File Read/Write and Path Traversal found in `save_snapshot` and `restore_snapshot` Tauri commands. The frontend passed raw string paths which were directly used in `std::fs::copy` without validation.
**Learning:** Even if a desktop app uses standard file selection dialogs in the frontend, the backend Tauri commands cannot trust the provided path strings. A malicious frontend payload or compromised dependency could send any path (e.g. `/etc/passwd`).
**Prevention:** Always validate frontend-provided file paths against Tauri's FS scope plugin using `app.try_fs_scope()?.is_allowed(&path)` before executing raw Rust filesystem operations.
