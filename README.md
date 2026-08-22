# GOKU OS 2.0

GOKU OS 2.0 is a futuristic desktop OS simulator built with Electron, HTML, CSS, and JavaScript.

## File Manager & Virtual Filesystem

This update adds a fully functional File Manager and a persistent virtual filesystem (VFS).

Key points:
- The VFS is stored at: Electron userData directory, file `vfs.json` (e.g., on Linux: ~/.config/<app>/vfs.json)
- The VFS is implemented in `src/backend/vfs.js` and runs in the Electron main process.
- Renderer processes do NOT get direct filesystem access. All operations use secure IPC handlers exposed via `preload.js` as `window.goku.vfs`.

Features:
- Home, Desktop, Documents, Downloads, Pictures, Music, Videos, Trash
- Create folder, Create text file, Rename, Delete (move to Trash), Restore from Trash, Permanent delete
- Search, Open folders, Back, Forward, Parent directory, Double-click to open, Context menu
- File/folder properties, simple file viewer
- Default folders and a few sample files are created automatically on first launch.

Security:
- Electron contextIsolation remains enabled.
- Node integration is disabled in renderer processes.
- Use `window.goku.vfs.*` from renderer to interact with the VFS.

Files added/modified:
- src/backend/vfs.js (new) — VFS implementation and IPC handlers
- preload.js (modified) — exposes vfs API
- main.js (modified) — initializes VFS
- src/apps/file-manager.html (new)
- src/apps/file-manager.js (new)
- src/apps/file-manager.css (new)
- src/modules/desktop.js (modified) — added File Manager to apps
- src/renderer.js (modified) — ensure VFS ready before desktop init

Usage:
- Launch the app. Open the Start Menu or double-click the File Manager icon on the desktop.
- Create folders/files and they will persist across restarts.

