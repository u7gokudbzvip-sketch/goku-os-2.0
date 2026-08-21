// Simple Window Manager module (ES module)
export default class WindowManager {
  constructor(container) {
    this.container = container;
    this.z = 10;
    this.windows = new Map();
  }

  createWindow({ id, title = 'App', width = 560, height = 360, x = 120, y = 120, contentHTML = '' }) {
    if (!id) id = `win-${Date.now()}`;
    const w = document.createElement('div');
    w.className = 'app-window';
    w.style.width = width + 'px';
    w.style.height = height + 'px';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    w.dataset.winId = id;
    w.style.zIndex = ++this.z;

    w.innerHTML = `
      <div class="titlebar">
        <div class="title">${title}</div>
        <div class="controls">
          <button class="min">—</button>
          <button class="max">□</button>
          <button class="close">✕</button>
        </div>
      </div>
      <div class="content">${contentHTML}</div>
      <div class="resizer"></div>
    `;

    this.container.appendChild(w);
    this.windows.set(id, w);

    // Events
    const titlebar = w.querySelector('.titlebar');
    this._makeDraggable(w, titlebar);
    this._makeResizable(w, w.querySelector('.resizer'));

    // controls
    w.querySelector('.close').addEventListener('click', () => this.closeWindow(id));
    w.querySelector('.min').addEventListener('click', () => (w.style.display = 'none'));
    w.addEventListener('mousedown', () => (w.style.zIndex = ++this.z));

    return id;
  }

  async createWindowFromURL(opts) {
    const { url } = opts;
    try {
      const r = await fetch(url);
      const html = await r.text();
      return this.createWindow({ ...opts, contentHTML: html });
    } catch (e) {
      return this.createWindow({ ...opts, contentHTML: `<div style="padding:12px">Failed to load ${url}</div>` });
    }
  }

  closeWindow(id) {
    const w = this.windows.get(id);
    if (!w) return;
    w.remove();
    this.windows.delete(id);
  }

  _makeDraggable(winEl, handle) {
    let offsetX = 0, offsetY = 0, dragging = false;

    handle.addEventListener('pointerdown', (ev) => {
      dragging = true;
      winEl.setPointerCapture(ev.pointerId);
      const rect = winEl.getBoundingClientRect();
      offsetX = ev.clientX - rect.left;
      offsetY = ev.clientY - rect.top;
      winEl.style.cursor = 'grabbing';
    });

    handle.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      let x = ev.clientX - offsetX;
      let y = ev.clientY - offsetY;
      x = Math.max(8, x);
      y = Math.max(8, y);
      winEl.style.left = x + 'px';
      winEl.style.top = y + 'px';
    });

    handle.addEventListener('pointerup', (ev) => {
      dragging = false;
      winEl.releasePointerCapture(ev.pointerId);
      winEl.style.cursor = 'grab';
    });
  }

  _makeResizable(winEl, handle) {
    let startX = 0, startY = 0, startW = 0, startH = 0, resizing = false;
    handle.addEventListener('pointerdown', (ev) => {
      resizing = true;
      winEl.setPointerCapture(ev.pointerId);
      const rect = winEl.getBoundingClientRect();
      startX = ev.clientX;
      startY = ev.clientY;
      startW = rect.width;
      startH = rect.height;
    });
    handle.addEventListener('pointermove', (ev) => {
      if (!resizing) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      winEl.style.width = Math.max(240, startW + dx) + 'px';
      winEl.style.height = Math.max(120, startH + dy) + 'px';
    });
    handle.addEventListener('pointerup', (ev) => {
      resizing = false;
      winEl.releasePointerCapture(ev.pointerId);
    });
  }
}
