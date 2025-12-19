import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  listCollections() {
    return ipcRenderer.invoke("list-collections")
  },

  listExternalMarkdownFiles: (rootPath: string) =>
  ipcRenderer.invoke("external:listMarkdownFiles", rootPath),

  listExternalFolders: (rootPath: string) =>
  ipcRenderer.invoke("external:listFolders", rootPath),

  removeLibrary: (libraryId: string) => ipcRenderer.invoke("libraries:remove", libraryId),


  listMarkdownFiles(collectionName: string) {
  return ipcRenderer.invoke("list-markdown-files", collectionName)
  },

  readExternalMarkdownFile: (absPath: string) =>
  ipcRenderer.invoke("external:readMarkdownFile", absPath),


  readMarkdownFile(collectionName: string, fileName: string) {
  return ipcRenderer.invoke("read-markdown-file", collectionName, fileName)
  },

  writeExternalMarkdownFile: (absPath: string, contents: string) =>
  ipcRenderer.invoke("external:writeMarkdownFile", absPath, contents),

  createExternalFolder: (absPath: string) =>
  ipcRenderer.invoke("external:createFolder", absPath),

  createExternalFile: (absPath: string) =>
  ipcRenderer.invoke("external:createFile", absPath),

  renameExternalPath: (fromAbs: string, toAbs: string) =>
  ipcRenderer.invoke("external:renamePath", fromAbs, toAbs),

  deleteExternalPath: (absPath: string) =>
  ipcRenderer.invoke("external:deletePath", absPath),


  writeMarkdownFile: (collectionName: string, fileName: string, contents: string) =>
  ipcRenderer.invoke("write-markdown-file", collectionName, fileName, contents),

  listLibraries: () => ipcRenderer.invoke("libraries:list"),
  pickAndAddLibrary: () => ipcRenderer.invoke("libraries:pickAndAdd"),
  renameLibrary: (libraryId: string, newName: string) =>
  ipcRenderer.invoke("libraries:rename", libraryId, newName),

  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  openPath: (path: string) => ipcRenderer.invoke("open-path", path),


  // You can expose other APTs you need here.
  // ...
})
