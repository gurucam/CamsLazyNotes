import { ipcMain, BrowserWindow, dialog, app } from "electron";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
function librariesFilePath() {
  return path.join(app.getPath("userData"), "libraries.json");
}
function readLibraries() {
  try {
    const p = librariesFilePath();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeLibraries(libs) {
  const p = librariesFilePath();
  fs.writeFileSync(p, JSON.stringify(libs, null, 2), "utf-8");
}
function isWithinLibraryRoot(absPath) {
  const libs = readLibraries();
  const normalizedAbs = path.resolve(absPath);
  return libs.some((l) => {
    const root = path.resolve(l.rootPath);
    return normalizedAbs === root || normalizedAbs.startsWith(root + path.sep);
  });
}
function getCollectionsDir() {
  const fromCwd = path.join(process.cwd(), "content", "collections");
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromAppPath = path.join(app.getAppPath(), "content", "collections");
  return fromAppPath;
}
function safeJoinUnderCollections(collectionName, fileName) {
  const root = path.resolve(getCollectionsDir());
  const target = path.resolve(root, collectionName, fileName);
  if (!target.startsWith(root + path.sep)) {
    throw new Error("Blocked write outside collections directory.");
  }
  return target;
}
function listMarkdownFilesRecursive(dir, relBase = "") {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = relBase ? path.join(relBase, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...listMarkdownFilesRecursive(abs, rel));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(rel);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
ipcMain.handle("external:listMarkdownFiles", async (_evt, rootPath) => {
  const results = [];
  async function walk(dir) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  }
  await walk(rootPath);
  return results;
});
ipcMain.handle("external:listFolders", async (_evt, rootPath) => {
  const results = [];
  async function walk(dir) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        results.push(full);
        await walk(full);
      }
    }
  }
  await walk(rootPath);
  return results;
});
ipcMain.handle("external:readMarkdownFile", async (_evt, absPath) => {
  return await fsPromises.readFile(absPath, "utf-8");
});
ipcMain.handle("external:writeMarkdownFile", async (_evt, absPath, contents) => {
  const normalizedAbs = path.resolve(absPath);
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked write outside registered library roots.");
  }
  await fsPromises.mkdir(path.dirname(normalizedAbs), { recursive: true });
  await fsPromises.writeFile(normalizedAbs, contents, "utf8");
  return true;
});
ipcMain.handle("external:createFolder", async (_evt, absPath) => {
  const normalizedAbs = path.resolve(absPath);
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked create outside registered library roots.");
  }
  await fsPromises.mkdir(normalizedAbs, { recursive: true });
  return true;
});
ipcMain.handle("external:createFile", async (_evt, absPath) => {
  const normalizedAbs = path.resolve(absPath);
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked create outside registered library roots.");
  }
  await fsPromises.mkdir(path.dirname(normalizedAbs), { recursive: true });
  await fsPromises.writeFile(normalizedAbs, "", "utf8");
  return true;
});
ipcMain.handle("external:renamePath", async (_evt, fromAbs, toAbs) => {
  const fromPath = path.resolve(fromAbs);
  const toPath = path.resolve(toAbs);
  if (!isWithinLibraryRoot(fromPath) || !isWithinLibraryRoot(toPath)) {
    throw new Error("Blocked rename outside registered library roots.");
  }
  await fsPromises.mkdir(path.dirname(toPath), { recursive: true });
  await fsPromises.rename(fromPath, toPath);
  return true;
});
ipcMain.handle("external:deletePath", async (_evt, absPath) => {
  const normalizedAbs = path.resolve(absPath);
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked delete outside registered library roots.");
  }
  await fsPromises.rm(normalizedAbs, { recursive: true, force: false });
  return true;
});
ipcMain.handle("list-collections", () => {
  const collectionsPath = getCollectionsDir();
  if (!fs.existsSync(collectionsPath)) return [];
  return fs.readdirSync(collectionsPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
});
ipcMain.handle("list-markdown-files", (_event, collectionName) => {
  const collectionsPath = getCollectionsDir();
  const base = path.join(collectionsPath, collectionName);
  return listMarkdownFilesRecursive(base);
});
ipcMain.handle("read-markdown-file", (_event, collectionName, fileName) => {
  const collectionsPath = getCollectionsDir();
  const filePath = path.join(collectionsPath, collectionName, fileName);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
});
ipcMain.handle(
  "write-markdown-file",
  async (_event, collectionName, fileName, contents) => {
    const targetPath = safeJoinUnderCollections(collectionName, fileName);
    await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
    console.log("[write-markdown-file]", { collectionName, fileName, targetPath });
    await fsPromises.writeFile(targetPath, contents, "utf8");
    return true;
  }
);
ipcMain.handle("libraries:list", async () => {
  return readLibraries();
});
ipcMain.handle("libraries:pickAndAdd", async () => {
  const win2 = BrowserWindow.getFocusedWindow();
  if (!win2) return { ok: false, error: "No focused window" };
  const result = await dialog.showOpenDialog(win2, {
    title: "Add Library Folder",
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }
  const rootPath = result.filePaths[0];
  const name = path.basename(rootPath);
  const libs = readLibraries();
  const exists = libs.some((l) => l.rootPath.toLowerCase() === rootPath.toLowerCase());
  if (exists) return { ok: true, library: null, alreadyExists: true };
  const library = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    rootPath
  };
  libs.push(library);
  writeLibraries(libs);
  return { ok: true, library };
});
ipcMain.handle("libraries:remove", async (_evt, libraryId) => {
  try {
    const libs = readLibraries();
    const next = libs.filter((l) => l.id !== libraryId);
    writeLibraries(next);
    return true;
  } catch (err) {
    console.error("Failed to remove library:", err);
    return false;
  }
});
ipcMain.handle("libraries:rename", async (_evt, libraryId, newName) => {
  try {
    const trimmed = String(newName || "").trim();
    if (!trimmed) return { ok: false, error: "Invalid name" };
    const libs = readLibraries();
    const next = libs.map((l) => l.id === libraryId ? { ...l, name: trimmed } : l);
    writeLibraries(next);
    return { ok: true };
  } catch (err) {
    console.error("Failed to rename library:", err);
    return { ok: false, error: "Rename failed" };
  }
});
ipcMain.handle("debug-paths", () => {
  const cwd = process.cwd();
  const appPath = app.getAppPath();
  const collectionsFromCwd = path.join(cwd, "content", "collections");
  const collectionsFromAppPath = path.join(appPath, "content", "collections");
  return {
    cwd,
    appPath,
    collectionsFromCwd,
    collectionsFromAppPath,
    resolvedCollectionsDir: getCollectionsDir(),
    existsFromCwd: fs.existsSync(collectionsFromCwd),
    existsFromAppPath: fs.existsSync(collectionsFromAppPath)
  };
});
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    title: "Cam's Lazy Notes",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
