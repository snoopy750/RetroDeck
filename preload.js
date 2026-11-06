const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('api', {
  pick: () => ipcRenderer.invoke('pick'),
  pathOf: (file) => webUtils.getPathForFile(file),
  load: (path) => ipcRenderer.invoke('load', path),
  loadProxy: () => ipcRenderer.invoke('load-proxy'),
  onProgress: (fn) => ipcRenderer.on('progress', (_e, v) => fn(v)),
  exportStart: (out, fps) => ipcRenderer.invoke('export-start', out, fps),
  exportNext: () => ipcRenderer.invoke('export-next'),
  exportPut: (buf) => ipcRenderer.invoke('export-put', buf),
  exportFinish: () => ipcRenderer.invoke('export-finish'),
  exportCancel: () => ipcRenderer.invoke('export-cancel'),
  reveal: (path) => ipcRenderer.invoke('reveal', path),
  selftestDone: (ok, msg) => ipcRenderer.invoke('selftest-done', ok, msg),
  onSelftest: (fn) => ipcRenderer.on('selftest', (_e, a) => fn(a)),
});
