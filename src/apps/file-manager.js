import './file-manager.css';

const goku = window.goku;

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}

class FileManager {
  constructor() {
    this.currentFolderId = null; // null means root
    this.history = [];
    this.future = [];
    this.root = null;

    this._bindElements();
  }

  _bindElements() {
    this.btnBack = document.getElementById('btn-back');
    this.btnForward = document.getElementById('btn-forward');
    this.btnUp = document.getElementById('btn-up');
    this.search = document.getElementById('fm-search');
    this.listEl = document.getElementById('fm-list');
    this.pathEl = document.getElementById('fm-path');
    this.sidebar = document.getElementById('fm-shortcuts');
    this.btnNewFolder = document.getElementById('btn-new-folder');
    this.btnNewFile = document.getElementById('btn-new-file');
    this.context = document.getElementById('fm-context');

    this.btnBack.addEventListener('click', () => this.goBack());
    this.btnForward.addEventListener('click', () => this.goForward());
    this.btnUp.addEventListener('click', () => this.goUp());
    this.search.addEventListener('input', (e) => this.onSearch(e.target.value));
    this.btnNewFolder.addEventListener('click', () => this.createFolder());
    this.btnNewFile.addEventListener('click', () => this.createFile());

    this.sidebar.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      this.openSpecial(li.dataset.name);
    });

    document.addEventListener('click', (e) => {
      if (!this.context.contains(e.target)) this.context.classList.add('hidden');
    });
  }

  async init() {
    await goku.vfs.ensureReady();
    // open Home by default
    const root = await this._findByName('Home');
    if (root) this.openFolder(root.id, true);
    else this.openFolder(null, true);
  }

  async _findByName(name) {
    // search root for folder with given name
    const r = await goku.vfs.list(null);
    if (!r.ok) return null;
    // root children are top-level; Home is under root.children[0]
    // Do a search for matching name recursively
    const res = await goku.vfs.search(name);
    if (res.ok && res.results.length) return res.results[0];
    return null;
  }

  async openSpecial(name) {
    // find folder named name
    const search = await goku.vfs.search(name);
    if (search.ok && search.results.length) {
      const node = search.results.find(r => r.name === name && r.type === 'folder');
      if (node) {
        this.openFolder(node.id, true);
      }
    }
  }

  async openFolder(id, replaceHistory = false) {
    if (!replaceHistory && this.currentFolderId) this.history.push(this.currentFolderId);
    if (!replaceHistory) this.future = [];
    this.currentFolderId = id;
    await this.refreshList();
  }

  async refreshList() {
    const r = await goku.vfs.list(this.currentFolderId);
    if (!r.ok) return;
    this.listEl.innerHTML = '';
    this.pathEl.textContent = await this._buildPathString();
    for (const item of r.list) {
      const node = document.createElement('div');
      node.className = 'fm-item';
      node.dataset.id = item.id;
      node.dataset.type = item.type;
      node.innerHTML = `<div class="fm-thumb">${item.type === 'folder' ? '📁' : '📄'}</div><div class="fm-name">${item.name}</div>`;
      node.addEventListener('dblclick', () => this.onDoubleClick(item));
      node.addEventListener('contextmenu', (e) => this.onContextMenu(e, item));
      this.listEl.appendChild(node);
    }
  }

  async _buildPathString() {
    // crude: show folder name
    if (!this.currentFolderId) return '/';
    const res = await goku.vfs.get(this.currentFolderId);
    if (res.ok && res.node) return `/${res.node.name}`;
    return '/';
  }

  async onDoubleClick(item) {
    if (item.type === 'folder') {
      await this.openFolder(item.id);
    } else {
      // open file: read content and show in prompt (simple viewer)
      const r = await goku.vfs.read(item.id);
      if (r.ok) {
        alert(`File: ${item.name}\n\n${r.content}`);
      }
    }
  }

  onContextMenu(e, item) {
    e.preventDefault();
    this.context.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'ctx-list';
    const add = (label, cb) => {
      const el = document.createElement('div');
      el.className = 'ctx-item';
      el.textContent = label;
      el.addEventListener('click', () => { cb(); this.context.classList.add('hidden'); });
      list.appendChild(el);
    };
    add('Open', async () => this.onDoubleClick(item));
    add('Rename', async () => this.renameItem(item));
    add('Delete', async () => this.deleteItem(item));
    if (item.type === 'file') add('Properties', async () => this.showProperties(item));
    this.context.appendChild(list);
    this.context.style.left = `${e.clientX}px`;
    this.context.style.top = `${e.clientY}px`;
    this.context.classList.remove('hidden');
  }

  async renameItem(item) {
    const name = prompt('New name', item.name);
    if (!name) return;
    const r = await goku.vfs.rename(item.id, name);
    if (r.ok) this.refreshList();
  }

  async deleteItem(item) {
    const ok = confirm(`Move ${item.name} to Trash?`);
    if (!ok) return;
    const r = await goku.vfs.trash(item.id);
    if (r.ok) this.refreshList();
  }

  async showProperties(item) {
    const r = await goku.vfs.properties(item.id);
    if (!r.ok) return;
    const p = r.properties;
    alert(`Name: ${p.name}\nType: ${p.type}\nSize: ${p.size}\nCreated: ${p.createdAt}\nModified: ${p.modifiedAt}`);
  }

  async createFolder() {
    const name = prompt('Folder name', 'New Folder');
    if (!name) return;
    const r = await goku.vfs.createFolder(this.currentFolderId, name);
    if (r.ok) this.refreshList();
  }

  async createFile() {
    const name = prompt('File name', 'new-file.txt');
    if (!name) return;
    const r = await goku.vfs.createTextFile(this.currentFolderId, name, '');
    if (r.ok) this.refreshList();
  }

  async onSearch(query) {
    if (!query) { return this.refreshList(); }
    const r = await goku.vfs.search(query, this.currentFolderId);
    if (!r.ok) return;
    this.listEl.innerHTML = '';
    for (const item of r.results) {
      const node = document.createElement('div');
      node.className = 'fm-item';
      node.dataset.id = item.id;
      node.dataset.type = item.type;
      node.innerHTML = `<div class="fm-thumb">${item.type === 'folder' ? '📁' : '📄'}</div><div class="fm-name">${item.name}</div>`;
      node.addEventListener('dblclick', () => this.onDoubleClick(item));
      node.addEventListener('contextmenu', (e) => this.onContextMenu(e, item));
      this.listEl.appendChild(node);
    }
  }

  async goBack() {
    if (!this.history.length) return;
    const id = this.history.pop();
    this.future.push(this.currentFolderId);
    this.currentFolderId = id;
    this.refreshList();
  }

  async goForward() {
    if (!this.future.length) return;
    const id = this.future.pop();
    this.history.push(this.currentFolderId);
    this.currentFolderId = id;
    this.refreshList();
  }

  async goUp() {
    if (!this.currentFolderId) return;
    const parent = await this._findParent(this.currentFolderId);
    if (parent) this.openFolder(parent.id);
    else this.openFolder(null);
  }

  async _findParent(id) {
    // naive: search for parent by scanning top-level and children
    // We'll use search to find parent by scanning root
    // This is inefficient but acceptable for small VFS
    const rootList = await goku.vfs.list(null);
    // traverse tree recursively via get API
    // Because main process has findParent, but not exposed, we'll do simple approach: search for any folder that lists this id as child
    // We'll walk the tree
    const walk = async (nodeId) => {
      const r = await goku.vfs.list(nodeId);
      if (!r.ok) return null;
      for (const child of r.list) {
        if (child.id === id) {
          const res = await goku.vfs.get(nodeId);
          return res.ok ? res.node : null;
        }
        if (child.type === 'folder') {
          const p = await walk(child.id);
          if (p) return p;
        }
      }
      return null;
    };
    // try root
    return await walk(null);
  }
}

const fm = new FileManager();
fm.init();

export default fm;
