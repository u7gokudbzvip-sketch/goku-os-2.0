# GOKU OS 2.0 (Electron)

Initial skeleton for GOKU OS 2.0 — a desktop OS simulator built with Electron + HTML/CSS/JS.

Quick start:
1. Ensure Node.js is installed (v18+ recommended).
2. In the repository root run:
   - npm install
   - npm start

What’s included:
- Electron main & preload
- Boot screen -> Desktop transition
- Desktop icons, taskbar, and start menu
- Modular window manager (draggable + resizable windows)
- Notepad sample app that saves to persistent settings via Electron userData

Next steps:
- Add more apps (file manager, terminal, browser, gallery, etc.)
- Implement a virtual filesystem (persisted under userData)
- Add dark/light theme toggle & persistent settings
- Add notifications, lock screen, and system information modules
