/// <reference types="vite/client" />
export {}

declare global {
  type Library = {
    id: string
    name: string
    rootPath: string
  }

  interface Window {
    ipcRenderer: {
      listCollections: () => Promise<string[]>
      listMarkdownFiles: (collectionName: string) => Promise<string[]>
      readMarkdownFile: (collectionName: string, fileName: string) => Promise<string>
      writeMarkdownFile: (collectionName: string, fileName: string, contents: string) => Promise<boolean>

      listLibraries: () => Promise<Library[]>
      pickAndAddLibrary: () => Promise<{
        ok: boolean
        library?: Library | null
        alreadyExists?: boolean
        canceled?: boolean
        error?: string
      }>
    
      listExternalMarkdownFiles: (rootPath: string) => Promise<string[]>
    }
  }
}
