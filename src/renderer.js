// Top-level renderer initializer (ES module)
import WindowManager from './modules/windowManager.js';
import Desktop from './modules/desktop.js';

const wm = new WindowManager(document.getElementById('windows'));
const desktop = new Desktop({
  iconsContainer: document.getElementById('icons'),
  startButton: document.getElementById('start-button'),
  startMenu: document.getElementById('start-menu'),
  startAppList: document.getElementById('start-app-list'),
  taskbarApps: document.getElementById('taskbar-apps'),
  windowManager: wm,
});

async function bootSequence() {
  const boot = document.getElementById('boot');
  const desk = document.getElementById('desktop');

  // Show boot for 1.8s then reveal desktop
  await new Promise(r => setTimeout(r, 1800));
  boot.classList.add('hidden');
  desk.classList.remove('hidden');

  // Try load settings (example)
  try {
    const s = await window.goku.getSettings();
    // Use s to set theme/timezone etc (stub)
    console.log('Loaded settings', s);
  } catch (e) {
    console.warn('Could not load settings', e);
  }

  desktop.init();
  // optional: open a welcome window
  desktop.openWelcome();
}

bootSequence();

// clock update
setInterval(() => {
  const el = document.getElementById('clock');
  if (!el) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  el.textContent = `${hh}:${mm}`;
}, 1000);
