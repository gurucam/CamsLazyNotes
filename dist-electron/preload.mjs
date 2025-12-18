"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  listCollections() {
    return electron.ipcRenderer.invoke("list-collections");
  },
  listExternalMarkdownFiles: (rootPath) => electron.ipcRenderer.invoke("external:listMarkdownFiles", rootPath),
  listExternalFolders: (rootPath) => electron.ipcRenderer.invoke("external:listFolders", rootPath),
  removeLibrary: (libraryId) => electron.ipcRenderer.invoke("libraries:remove", libraryId),
  listMarkdownFiles(collectionName) {
    return electron.ipcRenderer.invoke("list-markdown-files", collectionName);
  },
  readExternalMarkdownFile: (absPath) => electron.ipcRenderer.invoke("external:readMarkdownFile", absPath),
  readMarkdownFile(collectionName, fileName) {
    return electron.ipcRenderer.invoke("read-markdown-file", collectionName, fileName);
  },
  writeExternalMarkdownFile: (absPath, contents) => electron.ipcRenderer.invoke("external:writeMarkdownFile", absPath, contents),
  createExternalFolder: (absPath) => electron.ipcRenderer.invoke("external:createFolder", absPath),
  createExternalFile: (absPath) => electron.ipcRenderer.invoke("external:createFile", absPath),
  renameExternalPath: (fromAbs, toAbs) => electron.ipcRenderer.invoke("external:renamePath", fromAbs, toAbs),
  deleteExternalPath: (absPath) => electron.ipcRenderer.invoke("external:deletePath", absPath),
  writeMarkdownFile: (collectionName, fileName, contents) => electron.ipcRenderer.invoke("write-markdown-file", collectionName, fileName, contents),
  listLibraries: () => electron.ipcRenderer.invoke("libraries:list"),
  pickAndAddLibrary: () => electron.ipcRenderer.invoke("libraries:pickAndAdd"),
  renameLibrary: (libraryId, newName) => electron.ipcRenderer.invoke("libraries:rename", libraryId, newName)
  // You can expose other APTs you need here.
  // ...
});
