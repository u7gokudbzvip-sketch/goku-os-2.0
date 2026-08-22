// VFS backend for GOKU OS 2.0
// Runs in Electron main process. Persists vfs.json inside app.getPath('userData')
const path = require('path');
const fs = require('fs').promises;

class VFS {
  constructor(app) {
    this.app = app;
    this.vfsPath = path.join(this.app.getPath('userData'), 'vfs.json');
    this.data = null; // in-memory tree
    this._writing = false;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.vfsPath, 'utf8');
      this.data = JSON.parse(raw);
    } catch (e) {
      this.data = null;
    }
    return this.data;
  }

  async save() {
    if (!this.data) return;
    const dir = path.dirname(this.vfsPath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = this.vfsPath + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.rename(tmp, this.vfsPath);
  }

  _makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }

  _now() { return new Date().toISOString(); }

  _createNode({ name, type = 'folder', content = '' }) {
    const id = this._makeId();
    const node = {
      id,
      name,
      type,
      content: type === 'file' ? content : undefined,
      children: type === 'folder' ? [] : undefined,
      trashed: false,
      createdAt: this._now(),
      modifiedAt: this._now(),
    };
    return node;
  }

  async ensureReady() {
    await this.load();
    if (this.data && this.data.root) return this.data;

    // create default structure
    const root = this._createNode({ name: '/', type: 'folder' });
    const home = this._createNode({ name: 'Home', type: 'folder' });
    const desktop = this._createNode({ name: 'Desktop', type: 'folder' });
    const documents = this._createNode({ name: 'Documents', type: 'folder' });
    const downloads = this._createNode({ name: 'Downloads', type: 'folder' });
    const pictures = this._createNode({ name: 'Pictures', type: 'folder' });
    const music = this._createNode({ name: 'Music', type: 'folder' });
    const videos = this._createNode({ name: 'Videos', type: 'folder' });
    const trash = this._createNode({ name: 'Trash', type: 'folder' });

    // sample files
    const welcome = this._createNode({ name: 'Welcome.txt', type: 'file', content: 'Welcome to GOKU OS 2.0!\n\nThis is a sample file on your Desktop.' });
    const readme = this._createNode({ name: 'Readme.txt', type: 'file', content: 'GOKU OS 2.0 Virtual Filesystem\n\nThis filesystem is persisted in userData/vfs.json.' });
    const sampleDownload = this._createNode({ name: 'Sample Download.txt', type: 'file', content: 'This is a placeholder downloaded file.' });

    // assemble tree
    root.children.push(home);
    home.children.push(desktop, documents, downloads, pictures, music, videos, trash);
    desktop.children.push(welcome);
    documents.children.push(readme);
    downloads.children.push(sampleDownload);

    this.data = { root };
    await this.save();
    return this.data;
  }

  _findNodeRecursive(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.type === 'folder' && node.children) {
      for (const c of node.children) {
        const r = this._findNodeRecursive(c, id);
        if (r) return r;
      }
    }
    return null;
  }

  findNode(id) {
    if (!this.data) return null;
    return this._findNodeRecursive(this.data.root, id);
  }

  findParent(nodeId, node = null, parent = null) {
    if (!this.data) return null;
    node = node || this.data.root;
    if (node.id === nodeId) return parent;
    if (node.type === 'folder' && node.children) {
      for (const c of node.children) {
        const r = this.findParent(nodeId, c, node);
        if (r) return r;
      }
    }
    return null;
  }

  listChildren(parentId) {
    if (!this.data) return [];
    const parent = parentId ? this.findNode(parentId) : this.data.root;
    if (!parent) return [];
    if (parent.type !== 'folder') return [];
    return parent.children.filter(c => !c.trashed).map(c => ({ id: c.id, name: c.name, type: c.type, trashed: c.trashed }));
  }

  async createFolder(parentId, name) {
    const parent = parentId ? this.findNode(parentId) : this.data.root;
    if (!parent || parent.type !== 'folder') throw new Error('Invalid parent');
    const node = this._createNode({ name, type: 'folder' });
    parent.children.push(node);
    parent.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async createTextFile(parentId, name, content = '') {
    const parent = parentId ? this.findNode(parentId) : this.data.root;
    if (!parent || parent.type !== 'folder') throw new Error('Invalid parent');
    const node = this._createNode({ name, type: 'file', content });
    parent.children.push(node);
    parent.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async rename(id, newName) {
    const node = this.findNode(id);
    if (!node) throw new Error('Not found');
    node.name = newName;
    node.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async trash(id) {
    const node = this.findNode(id);
    if (!node) throw new Error('Not found');
    node.trashed = true;
    node.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async restore(id) {
    const node = this.findNode(id);
    if (!node) throw new Error('Not found');
    node.trashed = false;
    node.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async deletePermanently(id) {
    const parent = this.findParent(id);
    if (!parent || !parent.children) throw new Error('Parent not found');
    const idx = parent.children.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Not found');
    parent.children.splice(idx, 1);
    parent.modifiedAt = this._now();
    await this.save();
    return { ok: true };
  }

  async move(id, newParentId) {
    const parent = this.findParent(id);
    const node = this.findNode(id);
    const newParent = newParentId ? this.findNode(newParentId) : this.data.root;
    if (!node || !newParent || newParent.type !== 'folder') throw new Error('Invalid target');
    if (!parent || !parent.children) throw new Error('Parent not found');
    // remove from old
    const idx = parent.children.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Not found');
    parent.children.splice(idx, 1);
    // add to new parent
    newParent.children.push(node);
    newParent.modifiedAt = this._now();
    await this.save();
    return node;
  }

  async writeFileContent(id, content) {
    const node = this.findNode(id);
    if (!node || node.type !== 'file') throw new Error('Not a file');
    node.content = content;
    node.modifiedAt = this._now();
    await this.save();
    return node;
  }

  readFileContent(id) {
    const node = this.findNode(id);
    if (!node || node.type !== 'file') throw new Error('Not a file');
    return node.content || '';
  }

  properties(id) {
    const node = this.findNode(id);
    if (!node) throw new Error('Not found');
    const size = node.type === 'file' ? (node.content ? Buffer.byteLength(node.content, 'utf8') : 0) : (node.children ? node.children.length : 0);
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      trashed: Boolean(node.trashed),
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      size,
    };
  }

  search(query, parentId) {
    if (!query) return [];
    const q = String(query).toLowerCase();
    const root = parentId ? this.findNode(parentId) : this.data.root;
    const res = [];
    const walk = (n, p) => {
      if (n.name && n.name.toLowerCase().includes(q) && !n.trashed) {
        res.push({ id: n.id, name: n.name, type: n.type, parentId: p ? p.id : null });
      }
      if (n.type === 'folder' && n.children) {
        for (const c of n.children) walk(c, n);
      }
    };
    walk(root, null);
    return res;
  }
}

let instance = null;

function init(app, ipcMain) {
  instance = new VFS(app);

  // register handlers
  ipcMain.handle('vfs:ensure-ready', async () => {
    try {
      await instance.ensureReady();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('vfs:list', async (_, parentId) => {
    try {
      const list = instance.listChildren(parentId);
      return { ok: true, list };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:get', async (_, id) => {
    try {
      const node = instance.findNode(id);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:create-folder', async (_, parentId, name) => {
    try {
      const node = await instance.createFolder(parentId, name);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:create-text-file', async (_, parentId, name, content) => {
    try {
      const node = await instance.createTextFile(parentId, name, content);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:rename', async (_, id, newName) => {
    try {
      const node = await instance.rename(id, newName);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:trash', async (_, id) => {
    try {
      const node = await instance.trash(id);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:restore', async (_, id) => {
    try {
      const node = await instance.restore(id);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:delete-permanent', async (_, id) => {
    try {
      const r = await instance.deletePermanently(id);
      return { ok: true, result: r };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:move', async (_, id, targetParentId) => {
    try {
      const node = await instance.move(id, targetParentId);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:write', async (_, id, content) => {
    try {
      const node = await instance.writeFileContent(id, content);
      return { ok: true, node };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:read', async (_, id) => {
    try {
      const content = instance.readFileContent(id);
      return { ok: true, content };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:properties', async (_, id) => {
    try {
      const p = instance.properties(id);
      return { ok: true, properties: p };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle('vfs:search', async (_, query, parentId) => {
    try {
      const r = instance.search(query, parentId);
      return { ok: true, results: r };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  return instance;
}

module.exports = { init };
