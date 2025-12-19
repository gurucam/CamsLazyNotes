import { app, BrowserWindow, ipcMain, dialog, shell } from "electron"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import fsPromises from "node:fs/promises"
import path from "node:path"
import { autoUpdater } from "electron-updater"


type Library = {
  id: string
  name: string
  rootPath: string
}

function librariesFilePath() {
  return path.join(app.getPath("userData"), "libraries.json")
}

function readLibraries(): Library[] {
  try {
    const p = librariesFilePath()
    if (!fs.existsSync(p)) return []
    const raw = fs.readFileSync(p, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLibraries(libs: Library[]) {
  const p = librariesFilePath()
  fs.writeFileSync(p, JSON.stringify(libs, null, 2), "utf-8")
}

function isWithinLibraryRoot(absPath: string) {
  const libs = readLibraries()
  const normalizedAbs = path.resolve(absPath)
  return libs.some((l) => {
    const root = path.resolve(l.rootPath)
    return normalizedAbs === root || normalizedAbs.startsWith(root + path.sep)
  })
}

function getCollectionsDir() {
  // In dev, process.cwd() can be surprising depending on how Electron is launched.
  // We’ll prefer an explicit project-root style base.
  //
  // This resolves to: <current working dir>/content/collections
  // If that doesn’t exist, we also try: <app path>/content/collections
  const fromCwd = path.join(process.cwd(), "content", "collections")

  if (fs.existsSync(fromCwd)) return fromCwd

  const fromAppPath = path.join(app.getAppPath(), "content", "collections")
  return fromAppPath
}

async function ensureSampleLibrary() {
  try {
    const libs = readLibraries()
    const sampleName = "BG3 Checklist (Sample)"
    const templateDir = path.join(app.getAppPath(), "content", "collections", "Baldurs Gate 3")
    if (!fs.existsSync(templateDir)) return

    const sampleDir = path.join(app.getPath("userData"), "Sample Libraries", "Baldurs Gate 3")
    const alreadyPresent = libs.some(
      (l) =>
        l.name === sampleName ||
        path.resolve(l.rootPath).toLowerCase() === path.resolve(sampleDir).toLowerCase()
    )
    if (alreadyPresent) return

    if (!fs.existsSync(sampleDir)) {
      await fsPromises.mkdir(path.dirname(sampleDir), { recursive: true })
      await fsPromises.cp(templateDir, sampleDir, { recursive: true })
    }

    const library: Library = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: sampleName,
      rootPath: sampleDir,
    }

    libs.push(library)
    writeLibraries(libs)
  } catch (err) {
    console.error("Failed to ensure sample library:", err)
  }
}

function safeJoinUnderCollections(collectionName: string, fileName: string) {
  const root = path.resolve(getCollectionsDir())
  const target = path.resolve(root, collectionName, fileName)

  // Ensure target stays under root (prevents ../ tricks)
  if (!target.startsWith(root + path.sep)) {
    throw new Error("Blocked write outside collections directory.")
  }

  return target
}

function listMarkdownFilesRecursive(dir: string, relBase = ""): string[] {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const out: string[] = []

  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    const rel = relBase ? path.join(relBase, entry.name) : entry.name

    if (entry.isDirectory()) {
      out.push(...listMarkdownFilesRecursive(abs, rel))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(rel)
    }
  }

  out.sort((a, b) => a.localeCompare(b))
  return out
}


ipcMain.handle("external:listMarkdownFiles", async (_evt, rootPath: string) => {
  const results: string[] = []

  async function walk(dir: string) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        results.push(full)
      }
    }
  }

  await walk(rootPath)
  return results
})

ipcMain.handle("external:listFolders", async (_evt, rootPath: string) => {
  const results: string[] = []

  async function walk(dir: string) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        results.push(full)
        await walk(full)
      }
    }
  }

  await walk(rootPath)
  return results
})

ipcMain.handle("external:readMarkdownFile", async (_evt, absPath: string) => {
  return await fsPromises.readFile(absPath, "utf-8")
})

ipcMain.handle("external:writeMarkdownFile", async (_evt, absPath: string, contents: string) => {
  // Safety: only allow writes inside a registered library root
  const normalizedAbs = path.resolve(absPath)

  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked write outside registered library roots.")
  }

  await fsPromises.mkdir(path.dirname(normalizedAbs), { recursive: true })
  await fsPromises.writeFile(normalizedAbs, contents, "utf8")
  return true
})

ipcMain.handle("external:createFolder", async (_evt, absPath: string) => {
  const normalizedAbs = path.resolve(absPath)
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked create outside registered library roots.")
  }
  await fsPromises.mkdir(normalizedAbs, { recursive: true })
  return true
})

ipcMain.handle("external:createFile", async (_evt, absPath: string) => {
  const normalizedAbs = path.resolve(absPath)
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked create outside registered library roots.")
  }
  await fsPromises.mkdir(path.dirname(normalizedAbs), { recursive: true })
  await fsPromises.writeFile(normalizedAbs, "", "utf8")
  return true
})

ipcMain.handle("external:renamePath", async (_evt, fromAbs: string, toAbs: string) => {
  const fromPath = path.resolve(fromAbs)
  const toPath = path.resolve(toAbs)
  if (!isWithinLibraryRoot(fromPath) || !isWithinLibraryRoot(toPath)) {
    throw new Error("Blocked rename outside registered library roots.")
  }
  await fsPromises.mkdir(path.dirname(toPath), { recursive: true })
  await fsPromises.rename(fromPath, toPath)
  return true
})

ipcMain.handle("external:deletePath", async (_evt, absPath: string) => {
  const normalizedAbs = path.resolve(absPath)
  if (!isWithinLibraryRoot(normalizedAbs)) {
    throw new Error("Blocked delete outside registered library roots.")
  }
  await fsPromises.rm(normalizedAbs, { recursive: true, force: false })
  return true
})


ipcMain.handle("list-collections", () => {
  const collectionsPath = getCollectionsDir()
  if (!fs.existsSync(collectionsPath)) return []

  return fs
    .readdirSync(collectionsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
})

ipcMain.handle("list-markdown-files", (_event, collectionName: string) => {
  const collectionsPath = getCollectionsDir()
  const base = path.join(collectionsPath, collectionName)
  return listMarkdownFilesRecursive(base)
})

ipcMain.handle("read-markdown-file", (_event, collectionName: string, fileName: string) => {
  const collectionsPath = getCollectionsDir()
  const filePath = path.join(collectionsPath, collectionName, fileName)

  if (!fs.existsSync(filePath)) return ""

  return fs.readFileSync(filePath, "utf8")
})

ipcMain.handle(
  "write-markdown-file",
  async (_event, collectionName: string, fileName: string, contents: string) => {
    // Build a safe absolute path under content/collections/<collectionName>/<fileName>
    const targetPath = safeJoinUnderCollections(collectionName, fileName)

    // Ensure folder exists (in case subfolders are used in fileName like "Acts/Act1.md")
    await fsPromises.mkdir(path.dirname(targetPath), { recursive: true })
    console.log("[write-markdown-file]", { collectionName, fileName, targetPath })
    await fsPromises.writeFile(targetPath, contents, "utf8")
    return true
  }
)



ipcMain.handle("libraries:list", async () => {
  return readLibraries()
})

ipcMain.handle("libraries:pickAndAdd", async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false, error: "No focused window" }

  const result = await dialog.showOpenDialog(win, {
    title: "Add Library Folder",
    properties: ["openDirectory"],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true }
  }

  const rootPath = result.filePaths[0]
  const name = path.basename(rootPath)

  const libs = readLibraries()

  // Don’t add duplicates by path
  const exists = libs.some((l) => l.rootPath.toLowerCase() === rootPath.toLowerCase())
  if (exists) return { ok: true, library: null, alreadyExists: true }

  const library: Library = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    rootPath,
  }

  libs.push(library)
  writeLibraries(libs)

  return { ok: true, library }
})

ipcMain.handle("libraries:remove", async (_evt, libraryId: string) => {
  try {
    const libs = readLibraries()
    const next = libs.filter((l) => l.id !== libraryId)
    writeLibraries(next)
    return true
  } catch (err) {
    console.error("Failed to remove library:", err)
    return false
  }
})

ipcMain.handle("libraries:rename", async (_evt, libraryId: string, newName: string) => {
  try {
    const trimmed = String(newName || "").trim()
    if (!trimmed) return { ok: false, error: "Invalid name" }
    const libs = readLibraries()
    const next = libs.map((l) => (l.id === libraryId ? { ...l, name: trimmed } : l))
    writeLibraries(next)
    return { ok: true }
  } catch (err) {
    console.error("Failed to rename library:", err)
    return { ok: false, error: "Rename failed" }
  }
})

ipcMain.handle("open-external", async (_evt, url: string) => {
  const safeUrl = typeof url === "string" ? url.trim() : ""
  if (!safeUrl) return { ok: false, error: "Invalid URL" }
  await shell.openExternal(safeUrl)
  return { ok: true }
})


ipcMain.handle("debug-paths", () => {
  const cwd = process.cwd()
  const appPath = app.getAppPath()

  const collectionsFromCwd = path.join(cwd, "content", "collections")
  const collectionsFromAppPath = path.join(appPath, "content", "collections")

  return {
    cwd,
    appPath,
    collectionsFromCwd,
    collectionsFromAppPath,
    resolvedCollectionsDir: getCollectionsDir(),
    existsFromCwd: fs.existsSync(collectionsFromCwd),
    existsFromAppPath: fs.existsSync(collectionsFromAppPath),
  }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function sendUpdateStatus(payload: { message: string; ready?: boolean }) {
  if (!win) return
  win.webContents.send("update-status", payload)
}

function createWindow() {
  win = new BrowserWindow({
    title: "Cam's Lazy Notes",
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on("checking-for-update", () => sendUpdateStatus({ message: "Checking for updates..." }))
autoUpdater.on("update-available", () => sendUpdateStatus({ message: "Update available. Downloading..." }))
autoUpdater.on("update-not-available", () => sendUpdateStatus({ message: "You are up to date." }))
autoUpdater.on("error", (err) =>
  sendUpdateStatus({ message: `Update error: ${err == null ? "unknown" : err.message}` })
)
autoUpdater.on("download-progress", (progress) => {
  const pct = progress.percent.toFixed(0)
  sendUpdateStatus({ message: `Downloading update... ${pct}%` })
})
autoUpdater.on("update-downloaded", () => {
  sendUpdateStatus({ message: "Update downloaded. Restart to apply.", ready: true })
})

ipcMain.handle("update:check", async () => {
  try {
    await autoUpdater.checkForUpdates()
    return { ok: true }
  } catch (err) {
    sendUpdateStatus({ message: "Update check failed." })
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall()
  return true
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  await ensureSampleLibrary()
  createWindow()
})
