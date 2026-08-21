// Desktop module: icons, start menu, basic app launching
export default class Desktop {
  constructor(opts) {
    this.iconsContainer = opts.iconsContainer;
    this.startButton = opts.startButton;
    this.startMenu = opts.startMenu;
    this.startAppList = opts.startAppList;
    this.taskbarApps = opts.taskbarApps;
    this.wm = opts.windowManager;
    this.apps = [
      { id: 'notepad', name: 'Notepad', url: './src/apps/notepad.html' },
      // future apps will be listed here
    ];
  }

  init() {
    this._renderIcons();
    this._setupStartButton();
    this._renderStartList();
  }

  _renderIcons() {
    this.iconsContainer.innerHTML = '';
    for (const a of this.apps) {
      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.innerHTML = `
        <div class="thumb">${a.name[0]}</div>
        <div class="label">${a.name}</div>
      `;
      icon.addEventListener('dblclick', () => this.openApp(a));
      this.iconsContainer.appendChild(icon);
    }
  }

  _renderStartList() {
    this.startAppList.innerHTML = '';
    for (const a of this.apps) {
      const li = document.createElement('li');
      li.textContent = a.name;
      li.addEventListener('click', () => {
        this.openApp(a);
        this.toggleStart(false);
      });
      this.startAppList.appendChild(li);
    }
  }

  _setupStartButton() {
    this.startButton.addEventListener('click', () => {
      const isHidden = this.startMenu.classList.contains('hidden');
      this.toggleStart(isHidden);
    });

    // click outside to close
    document.addEventListener('click', (e) => {
      if (!this.startMenu.contains(e.target) && e.target !== this.startButton) {
        this.toggleStart(false);
      }
    });
  }

  toggleStart(show) {
    if (show) {
      this.startMenu.classList.remove('hidden');
    } else {
      this.startMenu.classList.add('hidden');
    }
  }

  async openApp(app) {
    // create a taskbar entry
    const taskBtn = document.createElement('div');
    taskBtn.className = 'taskbar-app';
    taskBtn.textContent = app.name;
    this.taskbarApps.appendChild(taskBtn);

    // create window and load app content
    const id = await this.wm.createWindowFromURL({
      title: app.name,
      width: 640,
      height: 420,
      x: 140 + (this.taskbarApps.children.length * 10),
      y: 100 + (this.taskbarApps.children.length * 10),
      url: app.url,
    });

    // remove taskbar entry when window closed
    const wEl = this.wm.windows.get(id);
    const closeWatcher = new MutationObserver(() => {
      if (!document.body.contains(wEl)) {
        taskBtn.remove();
        closeWatcher.disconnect();
      }
    });
    closeWatcher.observe(document.body, { childList: true, subtree: true });

    taskBtn.addEventListener('click', () => {
      if (wEl.style.display === 'none') {
        wEl.style.display = 'flex';
      }
      wEl.style.zIndex = ++this.wm.z;
    });
  }

  openWelcome() {
    const content = `<div style="padding:12px">
      <h2>Welcome to GOKU OS 2.0</h2>
      <p>Double-click the Notepad icon to try the first app.</p>
    </div>`;
    this.wm.createWindow({ title: 'Welcome', contentHTML: content, width:480, height:220, x:200, y:160 });
  }
}
