/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: IpcRenderer & {
    listCollections: () => Promise<string[]>
    listMarkdownFiles: (collectionName: string) => Promise<string[]>
    readMarkdownFile: (collectionName: string, fileName: string) => Promise<string>
    writeMarkdownFile: (collectionName: string, fileName: string, contents: string) => Promise<boolean>
    readExternalMarkdownFile: (absPath: string) => Promise<string>
    removeLibrary: (libraryId: string) => Promise<boolean>
    
    listExternalMarkdownFiles: (rootPath: string) => Promise<string[]>
    listExternalFolders: (rootPath: string) => Promise<string[]>
    createExternalFolder: (absPath: string) => Promise<boolean>
    createExternalFile: (absPath: string) => Promise<boolean>
    renameExternalPath: (fromAbs: string, toAbs: string) => Promise<boolean>
    deleteExternalPath: (absPath: string) => Promise<boolean>
    renameLibrary: (libraryId: string, newName: string) => Promise<{ ok: boolean }>
  }
}
