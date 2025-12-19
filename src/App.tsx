import React, { useEffect, useMemo, useState, startTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import "./App.css"
import packageJson from "../package.json"

type Library = {
  id: string
  name: string
  rootPath: string
}

type Bookmark = { collection: string; path: string }

type FileNode =
  | { type: "folder"; name: string; children: FileNode[] }
  | { type: "file"; name: string; path: string }

type SearchScope = "file" | "library" | "global"

type SearchMatch = {
  line: number
  preview: string
}

type SearchResult = {
  libraryId: string
  libraryName: string
  path: string
  matchCount: number
  previews: SearchMatch[]
  kind: "file" | "folder"
}

type LibraryContent = {
  files: string[]
  folders: string[]
  loading: boolean
}

type ThemeDefinition = {
  id: string
  name: string
  description: string
  light: Record<string, string>
  dark: Record<string, string>
}

const THEME_DEFS: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Default color scheme.",
    dark: {
      "--bg": "#0c1117",
      "--bg-2": "#0b0f15",
      "--sidebar-bg": "rgba(16, 22, 31, 0.92)",
      "--panel-bg": "rgba(18, 25, 36, 0.88)",
      "--panel-solid": "#121a25",
      "--text": "#e8edf4",
      "--muted": "#9aa7b5",
      "--border": "rgba(255, 255, 255, 0.08)",
      "--border-strong": "rgba(255, 255, 255, 0.18)",
      "--tree-line": "#2e3b4d",
      "--accent": "#f0b464",
      "--accent-2": "#6ec5ff",
      "--shadow": "0 24px 60px rgba(0, 0, 0, 0.35)",
      "--glow-1": "rgba(110, 197, 255, 0.25)",
      "--glow-2": "rgba(240, 180, 100, 0.2)",
      "--nav-hover": "rgba(255, 255, 255, 0.06)",
      "--nav-active": "rgba(255, 255, 255, 0.12)",
      "--chip-bg": "rgba(255, 255, 255, 0.08)",
      "--input-bg": "rgba(255, 255, 255, 0.04)",
      "--toggle-bg": "rgba(255, 255, 255, 0.2)",
      "--toggle-knob": "#f9f5ed",
    },
    light: {
      "--bg": "#f3eee6",
      "--bg-2": "#f9f4ed",
      "--sidebar-bg": "rgba(255, 249, 241, 0.94)",
      "--panel-bg": "rgba(255, 255, 255, 0.9)",
      "--panel-solid": "#ffffff",
      "--text": "#1b1e23",
      "--muted": "#5d6776",
      "--border": "rgba(30, 40, 50, 0.14)",
      "--border-strong": "rgba(30, 40, 50, 0.22)",
      "--tree-line": "#b9c2cc",
      "--accent": "#c26a1b",
      "--accent-2": "#2b6c8a",
      "--shadow": "0 18px 45px rgba(23, 28, 35, 0.12)",
      "--glow-1": "rgba(43, 108, 138, 0.2)",
      "--glow-2": "rgba(194, 106, 27, 0.18)",
      "--nav-hover": "rgba(27, 30, 35, 0.06)",
      "--nav-active": "rgba(27, 30, 35, 0.12)",
      "--chip-bg": "rgba(27, 30, 35, 0.08)",
      "--input-bg": "rgba(255, 255, 255, 0.9)",
      "--toggle-bg": "rgba(27, 30, 35, 0.16)",
      "--toggle-knob": "#ffffff",
    },
  },
  {
    id: "steven",
    name: "Steven",
    description: "Green-forward palette inspired by Steven.",
    dark: {
      "--bg": "#0f1612",
      "--bg-2": "#0c120f",
      "--sidebar-bg": "rgba(15, 22, 18, 0.94)",
      "--panel-bg": "rgba(18, 27, 22, 0.9)",
      "--panel-solid": "#111a14",
      "--text": "#e4f0e7",
      "--muted": "#8fa597",
      "--border": "rgba(255, 255, 255, 0.08)",
      "--border-strong": "rgba(255, 255, 255, 0.16)",
      "--tree-line": "#2e4035",
      "--accent": "#6adf8e",
      "--accent-2": "#4bbf8a",
      "--shadow": "0 24px 60px rgba(0, 0, 0, 0.35)",
      "--glow-1": "rgba(75, 191, 138, 0.22)",
      "--glow-2": "rgba(106, 223, 142, 0.18)",
      "--nav-hover": "rgba(255, 255, 255, 0.05)",
      "--nav-active": "rgba(255, 255, 255, 0.12)",
      "--chip-bg": "rgba(255, 255, 255, 0.07)",
      "--input-bg": "rgba(255, 255, 255, 0.05)",
      "--toggle-bg": "rgba(255, 255, 255, 0.2)",
      "--toggle-knob": "#f4fbf6",
    },
    light: {
      "--bg": "#eef5ed",
      "--bg-2": "#f6fbf4",
      "--sidebar-bg": "rgba(243, 249, 242, 0.94)",
      "--panel-bg": "rgba(255, 255, 255, 0.92)",
      "--panel-solid": "#ffffff",
      "--text": "#1f2a1f",
      "--muted": "#5c6d5c",
      "--border": "rgba(32, 64, 40, 0.14)",
      "--border-strong": "rgba(32, 64, 40, 0.24)",
      "--tree-line": "#b2c7b7",
      "--accent": "#3d9b5f",
      "--accent-2": "#4bbf8a",
      "--shadow": "0 18px 45px rgba(23, 28, 35, 0.12)",
      "--glow-1": "rgba(75, 191, 138, 0.18)",
      "--glow-2": "rgba(61, 155, 95, 0.18)",
      "--nav-hover": "rgba(31, 42, 31, 0.06)",
      "--nav-active": "rgba(31, 42, 31, 0.12)",
      "--chip-bg": "rgba(31, 42, 31, 0.08)",
      "--input-bg": "rgba(255, 255, 255, 0.94)",
      "--toggle-bg": "rgba(31, 42, 31, 0.16)",
      "--toggle-knob": "#ffffff",
    },
  },
  {
    id: "matt",
    name: "Matt",
    description: "Minimal black with sharp orange accents.",
    dark: {
      "--bg": "#040404",
      "--bg-2": "#080808",
      "--sidebar-bg": "rgba(8, 8, 8, 0.92)",
      "--panel-bg": "rgba(12, 12, 12, 0.9)",
      "--panel-solid": "#0a0a0a",
      "--text": "#f3f3f3",
      "--muted": "#8c8c8c",
      "--border": "rgba(255, 255, 255, 0.08)",
      "--border-strong": "rgba(255, 255, 255, 0.16)",
      "--tree-line": "#262626",
      "--accent": "#d96a00",
      "--accent-2": "#ff8a1f",
      "--shadow": "0 24px 60px rgba(0, 0, 0, 0.55)",
      "--glow-1": "rgba(217, 106, 0, 0.26)",
      "--glow-2": "rgba(255, 138, 31, 0.2)",
      "--nav-hover": "rgba(255, 255, 255, 0.05)",
      "--nav-active": "rgba(255, 255, 255, 0.1)",
      "--chip-bg": "rgba(255, 255, 255, 0.06)",
      "--input-bg": "rgba(255, 255, 255, 0.04)",
      "--toggle-bg": "rgba(255, 255, 255, 0.2)",
      "--toggle-knob": "#f8f0e8",
    },
    light: {
      "--bg": "#f7f7f7",
      "--bg-2": "#ffffff",
      "--sidebar-bg": "rgba(255, 255, 255, 0.94)",
      "--panel-bg": "rgba(255, 255, 255, 0.94)",
      "--panel-solid": "#ffffff",
      "--text": "#0f0f0f",
      "--muted": "#5a5a5a",
      "--border": "rgba(15, 15, 15, 0.12)",
      "--border-strong": "rgba(15, 15, 15, 0.22)",
      "--tree-line": "#d0d0d0",
      "--accent": "#c75600",
      "--accent-2": "#ff8a1f",
      "--shadow": "0 18px 45px rgba(23, 28, 35, 0.14)",
      "--glow-1": "rgba(199, 86, 0, 0.14)",
      "--glow-2": "rgba(255, 138, 31, 0.16)",
      "--nav-hover": "rgba(15, 15, 15, 0.05)",
      "--nav-active": "rgba(15, 15, 15, 0.1)",
      "--chip-bg": "rgba(15, 15, 15, 0.08)",
      "--input-bg": "rgba(255, 255, 255, 0.96)",
      "--toggle-bg": "rgba(15, 15, 15, 0.12)",
      "--toggle-knob": "#ffffff",
    },
  },
]

const LIBRARY_LISTING_URL = "https://github.com/gurucam/CamsLazyNotes/tree/main/libraries"

function normalizePath(p: string) {
  return p.replace(/\\/g, "/")
}

function baseName(p: string) {
  const parts = p.split(/[/\\]/)
  return parts[parts.length - 1] ?? p
}

function parentPath(p: string) {
  const normalized = normalizePath(p)
  const parts = normalized.split("/").filter(Boolean)
  if (parts.length <= 1) return ""
  return parts.slice(0, -1).join("/")
}

function stripMd(name: string) {
  return name.replace(/\.md$/i, "")
}

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (React.isValidElement(children)) return extractText(children.props.children)
  return ""
}

function normalizeObsidianTocLinks(text: string) {
  return text.replace(/\[\[#([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, raw, alias) => {
    const label = (alias ?? raw).trim()
    const target = slugify(raw)
    return `[${label}](#${target})`
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildAbsPath(root: string, relPath: string) {
  return root.replace(/[\\/]+$/, "") + "/" + relPath.replace(/^[\\/]+/, "")
}

function findMatchesInText(text: string, query: string, maxPreviews = 3) {
  if (!query) return { matchCount: 0, previews: [] as SearchMatch[] }
  const regex = new RegExp(escapeRegExp(query), "ig")
  const lines = text.split(/\r?\n/)
  let matchCount = 0
  const previews: SearchMatch[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    const matches = line.match(regex)
    if (!matches) continue
    matchCount += matches.length
    if (previews.length < maxPreviews) {
      previews.push({ line: i + 1, preview: line.trim() })
    }
  }

  return { matchCount, previews }
}

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const safe = escapeRegExp(query)
  const regex = new RegExp(safe, "ig")
  const matches = text.match(regex)
  if (!matches) return text
  const parts = text.split(regex)
  const out: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i])
    if (matches[i]) {
      out.push(<mark key={`m-${i}`}>{matches[i]}</mark>)
    }
  }
  return out
}

function highlightNodes(node: React.ReactNode, query: string): React.ReactNode {
  if (!query) return node
  if (typeof node === "string") return highlightMatch(node, query)
  if (Array.isArray(node)) {
    return node.map((child, idx) => <React.Fragment key={idx}>{highlightNodes(child, query)}</React.Fragment>)
  }
  if (React.isValidElement(node)) {
    const highlighted = highlightNodes(node.props.children, query)
    return React.cloneElement(node, { ...node.props, children: highlighted })
  }
  return node
}

function buildTree(filePaths: string[], folderPaths: string[]): FileNode[] {
  const root: { type: "folder"; name: string; children: FileNode[] } = {
    type: "folder",
    name: "__root__",
    children: [],
  }

  const getOrCreateFolder = (children: FileNode[], name: string) => {
    let found = children.find((c) => c.type === "folder" && c.name === name) as
      | { type: "folder"; name: string; children: FileNode[] }
      | undefined

    if (!found) {
      found = { type: "folder", name, children: [] }
      children.push(found)
    }
    return found
  }

  for (const raw of folderPaths) {
    const p = normalizePath(raw)
    const parts = p.split("/").filter(Boolean)

    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      cur = getOrCreateFolder(cur.children, part)
    }
  }

  for (const raw of filePaths) {
    const p = normalizePath(raw)
    const parts = p.split("/").filter(Boolean)

    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (isLast) {
        cur.children.push({ type: "file", name: part, path: raw })
      } else {
        cur = getOrCreateFolder(cur.children, part)
      }
    }
  }

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) if (n.type === "folder") sortNodes(n.children)
  }
  sortNodes(root.children)

  return root.children
}

const MarkdownViewer = React.memo(function MarkdownViewer({
  markdown,
  externalRoot,
  activeFile,
  scheduleSave,
  setMarkdown,
  highlightQuery,
}: {
  markdown: string
  externalRoot: string | null
  activeFile: string | null
  scheduleSave: (absPath: string, text: string) => void
  setMarkdown: React.Dispatch<React.SetStateAction<string>>
  highlightQuery: string
}) {
  const components = useMemo(
    () => ({
      h1: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h1 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h1>
        )
      },
      h2: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h2 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h2>
        )
      },
      h3: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h3 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h3>
        )
      },
      h4: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h4 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h4>
        )
      },
      h5: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h5 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h5>
        )
      },
      h6: ({ node, children, ...props }: any) => {
        const text = extractText(children)
        return (
          <h6 id={slugify(text)} data-source-line={node?.position?.start?.line} {...props}>
            {highlightNodes(children, highlightQuery)}
          </h6>
        )
      },
      p: ({ node, children, ...props }: any) => (
        <p data-source-line={node?.position?.start?.line} {...props}>
          {highlightNodes(children, highlightQuery)}
        </p>
      ),
      li: ({ node, children, ...props }: any) => {
        const line = node?.position?.start?.line
        const items = React.Children.toArray(children)
        const first = items[0]

        const isTask =
          React.isValidElement(first) &&
          (first as any).type === "input" &&
          (first as any).props?.type === "checkbox"

        if (!isTask)
          return (
            <li data-source-line={line} {...props}>
              {highlightNodes(children, highlightQuery)}
            </li>
          )

        const checked = Boolean((first as any).props.checked)
        const rest = items.slice(1)

        return (
          <li data-source-line={line} {...props}>
            <input
              type="checkbox"
              defaultChecked={checked}
              onChange={() => {
                if (!line) return
                startTransition(() => {
                  setMarkdown((prev) => {
                    try {
                      const lines = prev.split(/\r?\n/)
                      const i = line - 1
                      if (i < 0 || i >= lines.length) return prev

                      const currentLine = lines[i] ?? ""
                      if (!/\[( |x)\]/i.test(currentLine)) return prev

                      lines[i] = currentLine.replace(/\[( |x)\]/i, (m) =>
                        m.toLowerCase() === "[x]" ? "[ ]" : "[x]"
                      )

                      const next = lines.join("\n")

                      if (externalRoot && activeFile) {
                        const absPath = buildAbsPath(externalRoot, activeFile)
                        scheduleSave(absPath, next)
                      }

                      return next
                    } catch (err) {
                      console.error("Checkbox toggle failed:", err)
                      return prev
                    }
                  })
                })
              }}
              style={{ marginRight: 6 }}
            />
            <span>{highlightNodes(rest, highlightQuery)}</span>
          </li>
        )
      },
    }),
    [activeFile, externalRoot, scheduleSave, setMarkdown, highlightQuery]
  )

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown || ""}
    </ReactMarkdown>
  )
})

export default function App() {
  const appVersion = (packageJson as { version?: string }).version ?? "0.5.0"
  const [libraries, setLibraries] = useState<Library[]>([])
  const [activeLibraryName, setActiveLibraryName] = useState<string | null>(null)
  const [externalRoot, setExternalRoot] = useState<string | null>(null)
  const [libraryContents, setLibraryContents] = useState<Record<string, LibraryContent>>({})

  const [files, setFiles] = useState<string[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string>("")
  const saveTimerRef = React.useRef<number | null>(null)
  const latestTextRef = React.useRef<string>("")

  const fileListCacheRef = React.useRef<Record<string, string[]>>({})
  const folderListCacheRef = React.useRef<Record<string, string[]>>({})

  const [collapsedLibraries, setCollapsedLibraries] = useState<Record<string, boolean>>({})
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const isExpanded = (key: string) => expandedFolders[key] ?? false

  type CtxMenuState =
    | { open: false; x: number; y: number }
    | { open: true; x: number; y: number; kind: "file"; path: string; libraryName: string }
    | { open: true; x: number; y: number; kind: "folder"; path: string; libraryName: string }
    | { open: true; x: number; y: number; kind: "library"; libraryId: string }
    | { open: true; x: number; y: number; kind: "bookmark"; path: string; libraryName: string }

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>({ open: false, x: 0, y: 0 })
  const closeCtxMenu = () => setCtxMenu({ open: false, x: 0, y: 0 })

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const raw = localStorage.getItem("cln_bookmarks")
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) return parsed as Bookmark[]
      return []
    } catch {
      return []
    }
  })

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("cln_theme")
      if (stored === "light" || stored === "dark") return stored
    } catch {
      // ignore
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark"
    return "light"
  })

  const [themeName, setThemeName] = useState(() => {
    try {
      const stored = localStorage.getItem("cln_theme_name")
      return THEME_DEFS.some((themeDef) => themeDef.id === stored) ? stored : "default"
    } catch {
      return "default"
    }
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [searchScope, setSearchScope] = useState<SearchScope>("file")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [siblingResults, setSiblingResults] = useState<SearchResult[]>([])
  const [otherResults, setOtherResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [otherLoading, setOtherLoading] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [showHowToDock, setShowHowToDock] = useState(true)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateReady, setUpdateReady] = useState(false)
  const [textPrompt, setTextPrompt] = useState<{
    open: boolean
    title: string
    placeholder?: string
    initial?: string
    confirmLabel?: string
  }>({ open: false, title: "" })
  const textPromptResolveRef = React.useRef<((value: string | null) => void) | null>(null)
  const [confirmPrompt, setConfirmPrompt] = useState<{
    open: boolean
    title: string
    message: string
    detail?: string
    warning?: string
    confirmLabel?: string
    cancelLabel?: string
  }>({ open: false, title: "", message: "" })
  const confirmResolveRef = React.useRef<((value: boolean) => void) | null>(null)
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)
  const markdownContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [scrollRequest, setScrollRequest] = useState<{ path: string; line: number; token: number } | null>(null)
  const highlightTimerRef = React.useRef<number | null>(null)

  useEffect(() => {
    if (!ctxMenu.open) return

    const onMouseDown = () => closeCtxMenu()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCtxMenu()
    }
    const onScroll = () => closeCtxMenu()

    window.addEventListener("mousedown", onMouseDown)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", onScroll, true)

    return () => {
      window.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [ctxMenu.open])

  useEffect(() => {
    if (!settingsOpen) return
    const onMouseDown = () => setSettingsOpen(false)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false)
    }
    window.addEventListener("mousedown", onMouseDown)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [settingsOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!textPrompt.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        textPromptResolveRef.current?.(null)
        textPromptResolveRef.current = null
        setTextPrompt({ open: false, title: "" })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [textPrompt.open])

  useEffect(() => {
    if (!confirmPrompt.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        confirmResolveRef.current?.(false)
        confirmResolveRef.current = null
        setConfirmPrompt({ open: false, title: "", message: "" })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [confirmPrompt.open])

  useEffect(() => {
    if (!showHowTo) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHowTo(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showHowTo])

  useEffect(() => {
    try {
      localStorage.setItem("cln_bookmarks", JSON.stringify(bookmarks))
    } catch {
      // ignore
    }
  }, [bookmarks])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem("cln_theme", theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    const api = (window as any).ipcRenderer
    if (!api?.on || !api?.off) return
    const handler = (_: any, payload: any) => {
      if (!payload) return
      const message = typeof payload === "string" ? payload : payload.message
      if (message) setUpdateStatus(message)
      setUpdateReady(Boolean(payload.ready))
    }
    api.on("update-status", handler)
    return () => api.off("update-status", handler)
  }, [])

  useEffect(() => {
    const themeDef = THEME_DEFS.find((item) => item.id === themeName) ?? THEME_DEFS[0]
    const vars = theme === "dark" ? themeDef.dark : themeDef.light
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
    document.documentElement.dataset.themeName = themeDef.id
    try {
      localStorage.setItem("cln_theme_name", themeDef.id)
    } catch {
      // ignore
    }
  }, [theme, themeName])

  useEffect(() => {
    let alive = true
    ;(window as any).ipcRenderer
      ?.listLibraries?.()
      .then((libs: Library[]) => {
        if (!alive) return
        setLibraries(libs ?? [])
      })
      .catch((err: unknown) => console.error("Failed to list libraries:", err))

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const validLibs = new Set(libraries.map((l) => l.name))
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.collection && validLibs.has(b.collection))
      return next.length === prev.length ? prev : next
    })

    if (activeLibraryName && !validLibs.has(activeLibraryName)) {
      setActiveLibraryName(null)
      setExternalRoot(null)
      setFiles([])
      setActiveFile(null)
      setMarkdown("")
    }
  }, [libraries, activeLibraryName])

  const isBookmarked = (collection: string, path: string) =>
    bookmarks.some((b) => b.collection === collection && b.path === path)

  const addBookmark = (collection: string, path: string) => {
    setBookmarks((prev) =>
      prev.some((b) => b.collection === collection && b.path === path) ? prev : [...prev, { collection, path }]
    )
  }

  const clearSearchState = () => {
    setSearchQuery("")
    setSearchResults([])
    setSiblingResults([])
    setOtherResults([])
    setIsSearching(false)
    setOtherLoading(false)
  }

  const handleCheckForUpdates = () => {
    setUpdateReady(false)
    setUpdateStatus("Checking for updates...")
    try {
      ;(window as any).ipcRenderer?.checkForUpdates?.().catch(() => {
        setUpdateStatus("Update check failed.")
      })
    } catch {
      setUpdateStatus("Update check failed.")
    }
  }

  const handleInstallUpdate = () => {
    try {
      ;(window as any).ipcRenderer?.installUpdate?.()
    } catch {
      // ignore
    }
  }

  const handleOpenLibraries = () => {
    const url = LIBRARY_LISTING_URL
    try {
      ;(window as any).ipcRenderer?.openExternal?.(url)
    } catch {
      window.open(url, "_blank", "noreferrer")
    }
  }

  const removeBookmark = (collection: string, path: string) => {
    setBookmarks((prev) => prev.filter((b) => !(b.collection === collection && b.path === path)))
  }

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => ({ ...prev, [key]: !isExpanded(key) }))
  }

  const collapseAll = () => {
    setExpandedFolders({})
  }

  const expandAll = (fileTree: FileNode[], libraryKey: string) => {
    const next: Record<string, boolean> = {}
    const walk = (nodes: FileNode[], parentKey = "") => {
      for (const node of nodes) {
        const key = parentKey ? `${parentKey}/${node.name}` : node.name
        if (node.type === "folder") {
          next[`${libraryKey}/${key}`] = true
          walk(node.children, key)
        }
      }
    }
    walk(fileTree)
    setExpandedFolders((prev) => ({ ...prev, ...next }))
  }

  const scheduleSave = React.useCallback((absPath: string, text: string) => {
    latestTextRef.current = text

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)

    saveTimerRef.current = window.setTimeout(() => {
      ;(window as any).ipcRenderer
        .writeExternalMarkdownFile(absPath, latestTextRef.current)
        .catch((err: unknown) => console.error("Failed to write external markdown file:", err))
      }, 250)
  }, [])

  const getLibraryKey = (lib: Library) => lib.id || lib.name

  const setLibraryContent = React.useCallback((lib: Library, files: string[], folders: string[], loading = false) => {
    const key = getLibraryKey(lib)
    setLibraryContents((prev) => ({
      ...prev,
      [key]: { files, folders, loading },
    }))
  }, [])

  const activateLibrary = async (lib: Library, preferredFile?: string) => {
    setShowHowToDock(false)
    setActiveLibraryName(lib.name)
    setExternalRoot(lib.rootPath)
    setCollapsedLibraries((prev) => ({ ...prev, [lib.name]: false }))

    const cached = fileListCacheRef.current[lib.rootPath]
    const cachedFolders = folderListCacheRef.current[lib.rootPath]
    if (cached && cachedFolders) {
      setFiles(cached)
      setFolders(cachedFolders)
      setLibraryContent(lib, cached, cachedFolders, false)
      setActiveFile(preferredFile ?? null)
      if (!preferredFile) setMarkdown("")
      return
    }

    try {
      const absFiles: string[] = await (window as any).ipcRenderer.listExternalMarkdownFiles(lib.rootPath)
      const absFolders: string[] = await (window as any).ipcRenderer.listExternalFolders(lib.rootPath)
      const relFiles = absFiles.map((p) => p.replace(lib.rootPath, "").replace(/^[/\\]/, ""))
      const relFolders = absFolders.map((p) => p.replace(lib.rootPath, "").replace(/^[/\\]/, ""))
      fileListCacheRef.current[lib.rootPath] = relFiles
      folderListCacheRef.current[lib.rootPath] = relFolders

      setFiles(relFiles)
      setFolders(relFolders)
      setLibraryContent(lib, relFiles, relFolders, false)
      setActiveFile(preferredFile ?? null)
      if (!preferredFile) setMarkdown("")
    } catch (err) {
      console.error("Failed to list external markdown files:", err)
      setFiles([])
      setFolders([])
      setActiveFile(null)
      setMarkdown("")
    }
  }

  const refreshActiveLibrary = async (preferredFile?: string) => {
    if (!externalRoot || !activeLibraryName) return
    try {
      const absFiles: string[] = await (window as any).ipcRenderer.listExternalMarkdownFiles(externalRoot)
      const absFolders: string[] = await (window as any).ipcRenderer.listExternalFolders(externalRoot)
      const relFiles = absFiles.map((p) => p.replace(externalRoot, "").replace(/^[/\\]/, ""))
      const relFolders = absFolders.map((p) => p.replace(externalRoot, "").replace(/^[/\\]/, ""))
      fileListCacheRef.current[externalRoot] = relFiles
      folderListCacheRef.current[externalRoot] = relFolders
      setFiles((prev) => (prev.length === relFiles.length && prev.every((v, i) => v === relFiles[i]) ? prev : relFiles))
      setFolders((prev) =>
        prev.length === relFolders.length && prev.every((v, i) => v === relFolders[i]) ? prev : relFolders
      )
      const lib = libraries.find((item) => item.name === activeLibraryName)
      if (lib) {
        setLibraryContent(lib, relFiles, relFolders, false)
      }
      if (preferredFile) {
        setActiveFile(preferredFile)
      } else if (activeFile && !relFiles.includes(activeFile)) {
        setActiveFile(null)
      }
    } catch (err) {
      console.error("Failed to refresh library files:", err)
    }
  }

  const requestText = (opts: {
    title: string
    placeholder?: string
    initial?: string
    confirmLabel?: string
  }) => {
    return new Promise<string | null>((resolve) => {
      textPromptResolveRef.current = resolve
      setTextPrompt({ open: true, ...opts })
    })
  }

  const requestConfirm = (opts: {
    title: string
    message: string
    detail?: string
    warning?: string
    confirmLabel?: string
    cancelLabel?: string
  }) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmPrompt({ open: true, ...opts })
    })
  }

  const clearAllChecks = async () => {
    if (!activeFile || !externalRoot) return
    const confirmed = await requestConfirm({
      title: "Clear checkboxes?",
      message: "Are you sure you want to clear checks in this file?",
      warning: "This cannot be undone.",
      confirmLabel: "Clear",
    })
    if (!confirmed) return
    setMarkdown((prev) => {
      const next = prev.replace(/\[(x|X)\]/g, "[ ]")
      if (next === prev) return prev
      const absPath = buildAbsPath(externalRoot, activeFile)
      scheduleSave(absPath, next)
      return next
    })
  }

  const createFileAt = async (relativeDir: string, rootPath = externalRoot) => {
    if (!rootPath) return
    const api = (window as any).ipcRenderer
    if (!api?.createExternalFile) {
      window.alert("File operations are unavailable. Please restart the app.")
      return
    }
    closeCtxMenu()
    const name = await requestText({
      title: "New file",
      placeholder: "Notes.md",
      confirmLabel: "Create",
    })
    if (!name) return
    const filename = name.toLowerCase().endsWith(".md") ? name : `${name}.md`
    const relPath = relativeDir ? `${relativeDir}/${filename}` : filename
    const absPath = buildAbsPath(rootPath, relPath)
    try {
      await api.createExternalFile(absPath)
    } catch (err) {
      console.error("Failed to create file:", err)
      window.alert("Failed to create the file.")
      return
    }
    if (rootPath === externalRoot) {
      await refreshActiveLibrary(relPath)
    } else {
      delete fileListCacheRef.current[rootPath]
      delete folderListCacheRef.current[rootPath]
    }
  }

  const createFolderAt = async (relativeDir: string, rootPath = externalRoot) => {
    if (!rootPath) return
    const api = (window as any).ipcRenderer
    if (!api?.createExternalFolder) {
      window.alert("Folder operations are unavailable. Please restart the app.")
      return
    }
    closeCtxMenu()
    const name = await requestText({
      title: "New folder",
      placeholder: "Folder name",
      confirmLabel: "Create",
    })
    if (!name) return
    const relPath = relativeDir ? `${relativeDir}/${name}` : name
    const absPath = buildAbsPath(rootPath, relPath)
    try {
      await api.createExternalFolder(absPath)
    } catch (err) {
      console.error("Failed to create folder:", err)
      window.alert("Failed to create the folder.")
      return
    }
    if (rootPath === externalRoot) {
      await refreshActiveLibrary()
    } else {
      delete fileListCacheRef.current[rootPath]
      delete folderListCacheRef.current[rootPath]
    }
  }

  const renamePath = async (relativePath: string) => {
    if (!externalRoot) return
    const api = (window as any).ipcRenderer
    if (!api?.renameExternalPath) {
      window.alert("Rename is unavailable. Please restart the app.")
      return
    }
    const base = baseName(relativePath)
    const parent = parentPath(relativePath)
    closeCtxMenu()
    const nextName = await requestText({
      title: "Rename",
      initial: base,
      confirmLabel: "Rename",
    })
    if (!nextName) return
    const nextRel = parent ? `${parent}/${nextName}` : nextName
    const fromAbs = buildAbsPath(externalRoot, relativePath)
    const toAbs = buildAbsPath(externalRoot, nextRel)
    try {
      await api.renameExternalPath(fromAbs, toAbs)
      await refreshActiveLibrary(nextRel)
    } catch (err) {
      console.error("Failed to rename path:", err)
      window.alert("Failed to rename the item.")
    }
  }

  const deletePath = async (
    relativePath: string,
    label: string,
    libraryName?: string,
    isFolder?: boolean
  ) => {
    if (!externalRoot) return
    const api = (window as any).ipcRenderer
    if (!api?.deleteExternalPath) {
      window.alert("Delete is unavailable. Please restart the app.")
      return
    }
    closeCtxMenu()
    const ok = await requestConfirm({
      title: "Confirm deletion",
      message: "Are you sure you want to delete",
      detail: libraryName ? `${libraryName}/${relativePath || label}` : relativePath || label,
      warning: isFolder ? "This will also delete all child files and folders." : undefined,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })
    if (!ok) return
    const absPath = buildAbsPath(externalRoot, relativePath)
    try {
      await api.deleteExternalPath(absPath)
      if (activeFile === relativePath) {
        setActiveFile(null)
      }
      await refreshActiveLibrary()
    } catch (err) {
      console.error("Failed to delete path:", err)
      window.alert("Failed to delete the item.")
    }
  }

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!activeFile || !externalRoot) {
        setMarkdown("")
        return
      }

      // Clear previous file contents immediately to avoid showing stale checkboxes while loading.
      setMarkdown("")

      try {
        const abs = buildAbsPath(externalRoot, activeFile)
        const text = await (window as any).ipcRenderer.readExternalMarkdownFile(abs)
        if (!alive) return
        setMarkdown(text ?? "")
      } catch (err) {
        console.error("Failed to read markdown file:", err)
        if (!alive) return
        setMarkdown("")
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [externalRoot, activeFile])

  useEffect(() => {
    if (!scrollRequest || scrollRequest.path !== activeFile) return
    const container = markdownContainerRef.current
    if (!container) return

    const elements = Array.from(container.querySelectorAll("[data-source-line]")) as HTMLElement[]
    if (elements.length === 0) return

    const targetLine = scrollRequest.line
    let target: HTMLElement | null = null
    for (const el of elements) {
      const lineAttr = el.getAttribute("data-source-line")
      const lineNum = lineAttr ? Number(lineAttr) : NaN
      if (!Number.isNaN(lineNum) && lineNum >= targetLine) {
        target = el
        break
      }
    }
    if (!target) {
      target = elements[elements.length - 1]
    }

    const targetOffset =
      target.offsetTop - container.offsetTop - container.clientHeight / 2 + target.clientHeight / 2
    container.scrollTo({ top: targetOffset, behavior: "smooth" })

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
    target.classList.add("flashHighlight")
    highlightTimerRef.current = window.setTimeout(() => {
      target.classList.remove("flashHighlight")
      highlightTimerRef.current = null
    }, 2000)

    setScrollRequest(null)
  }, [markdown, activeFile, scrollRequest])

  useEffect(() => {
    if (!externalRoot || !activeLibraryName) return
    const id = window.setInterval(() => {
      refreshActiveLibrary()
    }, 5000)
    return () => window.clearInterval(id)
  }, [externalRoot, activeLibraryName])

  useEffect(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      setSearchResults([])
      setSiblingResults([])
      setOtherResults([])
      setIsSearching(false)
      setOtherLoading(false)
      return
    }

    let cancelled = false

    const ensureLibraryFilesForSearch = async (lib: Library) => {
      const cached = fileListCacheRef.current[lib.rootPath]
      if (cached) return cached

      try {
        const absFiles: string[] = await (window as any).ipcRenderer.listExternalMarkdownFiles(lib.rootPath)
        const relFiles = absFiles.map((p) => p.replace(lib.rootPath, "").replace(/^[/\\]/, ""))
        fileListCacheRef.current[lib.rootPath] = relFiles
        return relFiles
      } catch (err) {
        console.error("Failed to list external markdown files:", err)
        return []
      }
    }

    const run = async () => {
      setIsSearching(true)
      setOtherLoading(searchScope !== "global")
      const results: SearchResult[] = []
      const sibling: SearchResult[] = []
      const secondary: SearchResult[] = []

      const collectLibraryMatches = async (lib: Library, includeStructure = true, bucket: SearchResult[] = secondary) => {
        const relFiles = await ensureLibraryFilesForSearch(lib)
        for (const path of relFiles) {
          if (cancelled) return
          const absPath = buildAbsPath(lib.rootPath, path)
          const text = await (window as any).ipcRenderer.readExternalMarkdownFile(absPath)
          if (cancelled) return
          const matches = findMatchesInText(text ?? "", normalizedQuery)
          if (matches.matchCount > 0) {
            bucket.push({
              libraryId: lib.id,
              libraryName: lib.name,
              path,
              matchCount: matches.matchCount,
              previews: matches.previews,
              kind: "file",
            })
          }
        }
        if (!includeStructure) return
        const rootMatch = lib.name.toLowerCase().includes(normalizedQuery)
        if (rootMatch) {
          bucket.push({
            libraryId: lib.id,
            libraryName: lib.name,
            path: lib.name,
            matchCount: 1,
            previews: [{ line: 0, preview: "Library name" }],
            kind: "folder",
          })
        }
        const absFolders: string[] = await (window as any).ipcRenderer.listExternalFolders(lib.rootPath)
        const relFolders = absFolders.map((p) => p.replace(lib.rootPath, "").replace(/^[/\\]/, ""))
        for (const folder of relFolders) {
          if (cancelled) return
          if (folder.toLowerCase().includes(normalizedQuery)) {
            bucket.push({
              libraryId: lib.id,
              libraryName: lib.name,
              path: folder,
              matchCount: 1,
              previews: [{ line: 0, preview: "Folder name" }],
              kind: "folder",
            })
          }
        }
      }

      if (searchScope === "library") {
        if (activeLibraryName && externalRoot) {
          const library = libraries.find((lib) => lib.name === activeLibraryName)
          const libraryId = library?.id ?? activeLibraryName
          for (const path of files) {
            if (cancelled) return
            const absPath = buildAbsPath(externalRoot, path)
            const text = await (window as any).ipcRenderer.readExternalMarkdownFile(absPath)
            if (cancelled) return
            const matches = findMatchesInText(text ?? "", normalizedQuery)
            if (matches.matchCount > 0) {
              results.push({
                libraryId,
                libraryName: activeLibraryName,
                path,
                matchCount: matches.matchCount,
                previews: matches.previews,
                kind: "file",
              })
            }
          }
          const rootMatch = activeLibraryName.toLowerCase().includes(normalizedQuery)
          if (rootMatch) {
            results.push({
              libraryId,
              libraryName: activeLibraryName,
              path: activeLibraryName,
              matchCount: 1,
              previews: [{ line: 0, preview: "Library name" }],
              kind: "folder",
            })
          }
          for (const folder of folders) {
            if (folder.toLowerCase().includes(normalizedQuery)) {
              results.push({
                libraryId,
                libraryName: activeLibraryName,
                path: folder,
                matchCount: 1,
                previews: [{ line: 0, preview: "Folder name" }],
                kind: "folder",
              })
            }
          }
        }
        for (const lib of libraries) {
          if (lib.name === activeLibraryName) continue
          await collectLibraryMatches(lib)
          if (cancelled) return
        }
      } else if (searchScope === "global") {
        for (const lib of libraries) {
          await collectLibraryMatches(lib)
          if (cancelled) return
        }
      } else if (searchScope === "file") {
        if (activeFile && externalRoot && activeLibraryName) {
          const absPath = buildAbsPath(externalRoot, activeFile)
          const text = await (window as any).ipcRenderer.readExternalMarkdownFile(absPath)
          const matches = findMatchesInText(text ?? "", normalizedQuery)
          if (matches.matchCount > 0) {
            const library = libraries.find((lib) => lib.name === activeLibraryName)
            results.push({
              libraryId: library?.id ?? activeLibraryName,
              libraryName: activeLibraryName,
              path: activeFile,
              matchCount: matches.matchCount,
              previews: matches.previews,
              kind: "file",
            })
          }
          // other files in this library
          for (const path of files) {
            if (path === activeFile) continue
            if (cancelled) return
            const siblingAbs = buildAbsPath(externalRoot, path)
            const textSibling = await (window as any).ipcRenderer.readExternalMarkdownFile(siblingAbs)
            if (cancelled) return
            const matchesSibling = findMatchesInText(textSibling ?? "", normalizedQuery)
            if (matchesSibling.matchCount > 0) {
              const library = libraries.find((lib) => lib.name === activeLibraryName)
              sibling.push({
                libraryId: library?.id ?? activeLibraryName,
                libraryName: activeLibraryName,
                path,
                matchCount: matchesSibling.matchCount,
                previews: matchesSibling.previews,
                kind: "file",
              })
            }
          }
        }
        for (const lib of libraries) {
          if (lib.name === activeLibraryName) continue
          await collectLibraryMatches(lib)
          if (cancelled) return
        }
      }

      results.sort((a, b) => {
        if (a.libraryName !== b.libraryName) return a.libraryName.localeCompare(b.libraryName)
        return a.path.localeCompare(b.path)
      })
      sibling.sort((a, b) => {
        if (a.libraryName !== b.libraryName) return a.libraryName.localeCompare(b.libraryName)
        return a.path.localeCompare(b.path)
      })
      secondary.sort((a, b) => {
        if (a.libraryName !== b.libraryName) return a.libraryName.localeCompare(b.libraryName)
        return a.path.localeCompare(b.path)
      })

      if (!cancelled) {
        setSearchResults(results)
        setSiblingResults(sibling)
        setOtherResults(secondary)
        setIsSearching(false)
        setOtherLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [searchQuery, searchScope, activeLibraryName, activeFile, externalRoot, files, libraries])

  const fileTree = useMemo(() => buildTree(files, folders), [files, folders])
  const activeFileLabel = useMemo(() => (activeFile ? stripMd(baseName(activeFile)) : ""), [activeFile])
  const appMeta = useMemo(() => {
    if (!activeLibraryName) return "Pick a library to begin"
    const count = files.length
    return `${count} file${count === 1 ? "" : "s"}`
  }, [activeLibraryName, files.length])
  const panelMeta = useMemo(() => {
    if (activeFile) return activeFile
    return ""
  }, [activeFile])

    const normalizedMarkdown = useMemo(() => normalizeObsidianTocLinks(markdown), [markdown])
  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])
  const searchActive = normalizedQuery.length > 0
  const searchMeta = searchActive
    ? isSearching
      ? "Searching..."
      : `${searchResults.length} match${searchResults.length === 1 ? "" : "es"}`
    : ""

  const toggleAllUnderRoot = () => {
    const activeLibrary = libraries.find((lib) => lib.name === activeLibraryName)
    if (!activeLibrary) return
    const libraryKey = getLibraryKey(activeLibrary)
    const anyExplicitFalse = Object.entries(expandedFolders).some(
      ([key, value]) => key.startsWith(`${libraryKey}/`) && value === false
    )
    if (anyExplicitFalse) expandAll(fileTree, libraryKey)
    else collapseAll()
  }

  const renderSearchResultButton = (result: SearchResult) => {
    const parent = parentPath(result.path)
    return (
      <button
        key={`${result.libraryId}::${result.path}`}
        className="searchResultItem"
        onClick={async () => {
          const lib = libraries.find((l) => l.id === result.libraryId)
          if (!lib) return
          const targetLine = result.previews[0]?.line ?? 1
          await activateLibrary(lib, result.kind === "file" ? result.path : undefined)
          if (result.kind === "file") {
            setActiveFile(result.path)
            setScrollRequest({ path: result.path, line: targetLine, token: Date.now() })
          } else {
            const libraryKey = getLibraryKey(lib)
            const normalized = normalizePath(result.path)
            const parts = normalized.split("/").filter(Boolean)
            let key = ""
            for (const part of parts) {
              key = key ? `${key}/${part}` : part
              setExpandedFolders((prev) => ({ ...prev, [`${libraryKey}/${key}`]: true }))
            }
          }
          clearSearchState()
        }}
      >
        <span className="searchResultItem__label">
          {highlightMatch(stripMd(baseName(result.path)), normalizedQuery)}
        </span>
        <span className="searchResultItem__meta">
          {result.libraryName}
          {parent ? ` / ${parent}` : ""}
          {` - ${result.matchCount} match${result.matchCount === 1 ? "" : "es"}`}
        </span>
        {result.previews.length > 0 ? (
          <div className="searchResultItem__previews">
            {result.previews.map((preview) => (
              <span key={`${result.libraryId}-${result.path}-${preview.line}`}>
                <span className="searchResultItem__line">L{preview.line}:</span>{" "}
                {highlightMatch(preview.preview, normalizedQuery)}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    )
  }

  const renderTree = (
    nodes: FileNode[],
    lib: Library,
    parentPath = "",
    parentKey = "",
    depth = 0
  ): React.ReactNode => {
    const libraryKey = getLibraryKey(lib)
    return nodes.map((node) => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name
      const key = parentKey ? `${parentKey}/${node.name}` : node.name

      if (node.type === "folder") {
        const open = isExpanded(`${libraryKey}/${key}`)

        return (
          <div key={key} className="navTreeItem">
            <button
              className={
                "navItem navItem--folder navItem--depth" +
                Math.min(depth, 3) +
                " " +
                (depth === 0 ? "navItem--folderRoot" : "navItem--folderChild")
              }
              onMouseDown={(e) => {
                if (e.button !== 0) return
                toggleFolder(`${libraryKey}/${key}`)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setCtxMenu({
                  open: true,
                  x: e.clientX,
                  y: e.clientY,
                  kind: "folder",
                  path,
                  libraryName: lib.name,
                })
              }}
              title={path}
            >
              <span className="folderChevron" aria-hidden="true">
                {open ? "-" : "+"}
              </span>
              <span className="navItem__text">
                <span className="navItem__label">{node.name}</span>
              </span>
            </button>

            {open && <div className="navSubList">{renderTree(node.children, lib, path, key, depth + 1)}</div>}
          </div>
        )
      }

      return (
        <div key={key} className="navTreeItem">
          <button
            className={
              "navItem navItem--child navItem--depth" +
              Math.min(depth, 3) +
              " " +
              (activeLibraryName === lib.name && activeFile === node.path ? "navItem--active" : "")
            }
            onClick={async () => {
              await activateLibrary(lib, node.path)
              setActiveFile(node.path)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setCtxMenu({
                open: true,
                x: e.clientX,
                y: e.clientY,
                kind: "file",
                path: node.path,
                libraryName: lib.name,
              })
            }}
            title={node.path}
          >
            {isBookmarked(lib.name, node.path) ? (
              <span className="bookmarkStar">★</span>
            ) : null}
            <span className="navItem__text">
              <span className="navItem__label">{stripMd(baseName(node.path))}</span>
            </span>
          </button>
        </div>
      )
    })
  }

  const handleLibrarySelect = async (value: string) => {
    if (!value) {
      setActiveLibraryName(null)
      setExternalRoot(null)
      setFiles([])
      setActiveFile(null)
      setMarkdown("")
      return
    }

    const lib = libraries.find((item) => item.name === value)
    if (!lib) return
    await activateLibrary(lib)
  }

  return (
    <div className="app">
        <aside className="sidebar">
          <button
            type="button"
            className="sidebar__brand"
            onClick={() => {
              setActiveFile(null)
              setMarkdown("")
              setSettingsOpen(false)
              setShowHowTo(false)
              setShowHowToDock(true)
            }}
            title="How To Use"
          >
            <div className="sidebar__title">Cam&apos;s Lazy Notes</div>
          </button>

        <div className="sidebar__scroll">
          <div className="sidebar__section">
            <div className="sidebar__sectionTitle">Bookmarks</div>

            {bookmarks.length === 0 ? (
              <div className="mutedNote">No bookmarks yet. Right-click a file to add one.</div>
            ) : (
              bookmarks.map((b) => {
                const parent = parentPath(b.path)
                const bookmarkMeta = parent ? `${b.collection}/${parent}` : b.collection
                return (
                  <button
                    key={`${b.collection}::${b.path}`}
                    className={
                      "navItem " +
                      (activeLibraryName === b.collection && activeFile === b.path ? "navItem--active" : "")
                    }
                    onClick={async () => {
                      const lib = libraries.find((l) => l.name === b.collection)
                      if (!lib) return
                      await activateLibrary(lib, b.path)
                      setActiveFile(b.path)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCtxMenu({
                        open: true,
                        x: e.clientX,
                        y: e.clientY,
                        kind: "bookmark",
                        path: b.path,
                        libraryName: b.collection,
                      })
                    }}
                    title={b.path}
                  >
                    <span className="bookmarkStar">★</span>
                    <span className="navItem__text">
                      <span className="navItem__label">{stripMd(baseName(b.path))}</span>
                      <span className="navItem__meta">{bookmarkMeta}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="sidebar__section">
            <div className="sidebarSectionHeaderRow">
              <button
                type="button"
                className="sidebarSectionTitleButton"
                onClick={toggleAllUnderRoot}
                title="Click to collapse/expand all folders"
              >
                Libraries
              </button>
            </div>

            {libraries.length === 0 ? (
              <div className="mutedNote">No libraries yet. Click Add Library.</div>
            ) : (
                libraries.map((lib) => {
                  const isActive = activeLibraryName === lib.name
                  const isCollapsed = collapsedLibraries[lib.name] ?? !isActive
                  const libraryKey = getLibraryKey(lib)
                  const content = libraryContents[libraryKey]
                  const contentFiles = isActive ? files : content?.files ?? []
                  const contentFolders = isActive ? folders : content?.folders ?? []
                  const contentLoading = !isActive && content?.loading

                return (
                  <div key={lib.id}>
                  <button
                    className={"navItem " + (isActive ? "navItem--active" : "")}
                    onMouseDown={async (e) => {
                      if (e.button !== 0) return
                      if (isActive) {
                        setCollapsedLibraries((prev) => ({ ...prev, [lib.name]: !isCollapsed }))
                        return
                      }
                        await activateLibrary(lib)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCtxMenu({
                          open: true,
                          x: e.clientX,
                          y: e.clientY,
                          kind: "library",
                          libraryId: lib.id,
                        })
                      }}
                    >
                      <span className="libraryLabel">
                          <span className="libraryChevron" aria-hidden="true">
                            {!isCollapsed ? "-" : "+"}
                          </span>
                        <span className="libraryName">{lib.name}</span>
                      </span>
                    </button>

                      {!isCollapsed && (
                        <div className="navSubList">
                          {contentLoading ? (
                            <div className="mutedNote mutedNote--tight">Loading library...</div>
                          ) : contentFiles.length === 0 && contentFolders.length === 0 ? (
                            <div className="mutedNote mutedNote--tight">No markdown files in this library.</div>
                          ) : (
                            renderTree(buildTree(contentFiles, contentFolders), lib)
                          )}
                        </div>
                      )}
                  </div>
                )
              })
            )}

            <div className="sidebar__footer">
              <button
                type="button"
                className="sidebar__addLibrary"
                onClick={async () => {
                  const res = await (window as any).ipcRenderer.pickAndAddLibrary()
                  if (!res?.ok) return
                  const libs = await (window as any).ipcRenderer.listLibraries()
                  setLibraries(libs)
                }}
              >
                + Add Library
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <div className="selectWrapper selectWrapper--pill">
              <select
                className="appTitleSelect"
                value={activeLibraryName ?? ""}
                onChange={(e) => handleLibrarySelect(e.target.value)}
              >
                <option value="">Select library</option>
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.name}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="appMetaRow">
              <div className="appMeta">{appMeta}</div>
            </div>
          </div>

          <div className="topbar__center">
            <div className="searchRow">
              <div className="searchField">
                <input
                  ref={searchInputRef}
                  className="search"
                  placeholder={
                    searchScope === "global"
                      ? "Search all libraries"
                      : searchScope === "library"
                      ? "Search this library"
                      : "Search this file"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="searchClear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="selectWrapper selectWrapper--pill">
                <select value={searchScope} onChange={(e) => setSearchScope(e.target.value as SearchScope)}>
                  <option value="file">Current file</option>
                  <option value="library">Current library</option>
                  <option value="global">Global</option>
                </select>
              </div>
            </div>
          </div>
          <div className="topbar__right">
            <div className="settingsMenuWrap" onMouseDown={(e) => e.stopPropagation()}>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-label="Settings"
              >
                ⚙
              </button>
              {settingsOpen ? (
                <div className="settingsMenu">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setShowHowTo(true)
                      setShowHowToDock(false)
                      setSettingsOpen(false)
                    }}
                  >
                    How To Use
                  </button>
                  <div className="settingsRow">
                    <span className="settingsLabel">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                    <label className="themeToggle__switch">
                      <input
                        type="checkbox"
                        checked={theme === "dark"}
                        onChange={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                        aria-label="Toggle light and dark mode"
                      />
                      <span className="themeToggle__slider" />
                    </label>
                  </div>
                  <div className="settingsSection">
                    <div className="settingsHint">
                      Current theme: {THEME_DEFS.find((item) => item.id === themeName)?.name ?? "Default"}
                    </div>
                    <button
                      className="btn btn--ghost settingsButton"
                      type="button"
                      onClick={() => {
                        setShowThemePicker(true)
                        setSettingsOpen(false)
                      }}
                    >
                      Browse themes
                    </button>
                  </div>
                  <button className="btn btn--ghost settingsButton" type="button" onClick={handleOpenLibraries}>
                    Get Libraries
                  </button>
                  {updateStatus ? <div className="settingsHint settingsUpdateHint">{updateStatus}</div> : null}
                  {updateReady ? (
                    <button className="btn settingsButton" type="button" onClick={handleInstallUpdate}>
                      Restart to update
                    </button>
                  ) : null}
                  <div className="settingsFooter">
                    <span>Version {appVersion}</span>
                    <button
                      className="settingsFooterButton"
                      type="button"
                      onClick={handleCheckForUpdates}
                    >
                      Check for updates
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </header>

          {searchActive ? (
            <div className="searchDock">
              <div className="searchDock__inner">
                <div className="searchResults">
                  <div className="searchResults__header">
                    <div className="searchResults__title">Search results</div>
                    <div className="searchResults__meta">{searchMeta}</div>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="mutedNote mutedNote--tight">
                      {searchScope === "library" && !activeLibraryName
                        ? "Select a library to search locally."
                        : searchScope === "file" && !activeFile
                        ? "Open a file to search within it."
                        : "No matches found."}
                    </div>
                  ) : (
                    <div className="searchResults__list">{searchResults.map(renderSearchResultButton)}</div>
                  )}
                  {searchScope === "file" && normalizedQuery ? (
                    <div className="searchResults__secondary">
                      <div className="searchResults__header">
                        <div className="searchResults__title">Other files in this library</div>
                        <div className="searchResults__meta">
                          {isSearching
                            ? "Searching..."
                            : `${siblingResults.length} match${siblingResults.length === 1 ? "" : "es"}`}
                        </div>
                      </div>
                      {siblingResults.length === 0 ? (
                        <div className="mutedNote mutedNote--tight">No matches in other files in this library.</div>
                      ) : (
                        <div className="searchResults__list">{siblingResults.map(renderSearchResultButton)}</div>
                      )}
                    </div>
                  ) : null}
                  {searchScope !== "global" && normalizedQuery ? (
                    <div className="searchResults__secondary">
                      <div className="searchResults__header">
                        <div className="searchResults__title">Other libraries</div>
                        <div className="searchResults__meta">
                          {otherLoading
                            ? "Searching..."
                            : `${otherResults.length} match${otherResults.length === 1 ? "" : "es"}`}
                        </div>
                      </div>
                      {otherResults.length === 0 ? (
                        <div className="mutedNote mutedNote--tight">
                          {otherLoading ? "Searching other libraries..." : "No matches found in other libraries."}
                        </div>
                      ) : (
                        <div className="searchResults__list">{otherResults.map(renderSearchResultButton)}</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <section className="content">
            <div className="panel">
              {showHowToDock ? (
                <div className="howToDock">
                  <div className="howToHeader">
                    <div>
                      <div className="howToTitle">How To Use</div>
                      <div className="howToSubtitle">Crash course guide</div>
                    </div>
                    <button className="btn btn--ghost" type="button" onClick={() => setShowHowToDock(false)}>
                      Close
                    </button>
                  </div>

                  <div className="howToBody">
                    <section>
                      <h3>Libraries</h3>
                      <p>
                        Add a folder with <strong>+ Add Library</strong>. Your notes appear in the sidebar under each
                        library. You can keep multiple libraries expanded at once. Click a library name to make it
                        active, and use the top-left dropdown to switch quickly.
                      </p>
                      <p>
                        Folders can be expanded or collapsed. The plus/minus shows whether a folder is open. Right-click
                        libraries, folders, or files to create, rename, or delete items. Dropping folders into the
                        default libraries directory adds them automatically.
                      </p>
                      <p>
                        To install a new library: download a library zip from the Libraries page, extract it so the
                        top-level folder name matches the library, and drop that folder into
                        <code>AppData/Roaming/Cam's Lazy Notes/Libraries</code> (or use <strong>+ Add Library</strong>
                        and pick the extracted folder). Restart if it doesn’t appear automatically.
                      </p>
                    </section>

                    <section>
                      <h3>Included sample</h3>
                      <p>
                        A <strong>BG3 Checklist (Sample)</strong> library is bundled so you can see an example. It's
                        copied into your app data on first launch. If you don't want it, right-click the BG3 library in
                        the sidebar and choose <strong>Remove Library</strong>.
                      </p>
                      <p>
                        Default library folder: <strong>app data/Libraries</strong>. + Add Library opens there by
                        default; you can also pick any other folder.
                      </p>
                    </section>

                    <section>
                      <h3>Reading and Checklists</h3>
                      <p>Click any file to view it. Task list checkboxes can be toggled and are saved back to the file.</p>
                      <p>Tables in Markdown render in the reader, and Obsidian-style ToC links should jump to headings.</p>
                    </section>

                    <section>
                      <h3>Search</h3>
                      <p>
                        Search scans file contents plus folder and library names. Use <strong>Current file</strong> to
                        search the open file, <strong>Current library</strong> for everything in that library, or
                        <strong>Global</strong> for all libraries. Results include match counts, line previews, and
                        click-to-jump with a brief highlight. Use the clear button to reset the search.
                      </p>
                    </section>

                    <section>
                      <h3>Bookmarks</h3>
                      <p>Right-click a file to bookmark it. Bookmarks show the library and path for quick context.</p>
                    </section>

                    <section>
                      <h3>Tips</h3>
                      <ul>
                        <li>Use the toggle to swap between light and dark mode.</li>
                        <li>Select a theme in Settings to change the app look.</li>
                        <li>Press Escape to close menus or this guide.</li>
                      </ul>
                    </section>
                  </div>
                </div>
              ) : activeFile ? (
                <div className="panelHeader">
                  <div>
                    <h1 className="panelTitle">{activeFileLabel}</h1>
                    <div className="panelMeta">{panelMeta}</div>
                  </div>
                  <div className="panelHeader__actions">
                    {activeLibraryName ? <div className="panelBadge">{activeLibraryName}</div> : null}
                    <button className="btn btn--ghost" type="button" onClick={clearAllChecks}>
                      Uncheck all
                    </button>
                  </div>
                </div>
              ) : null}

            {showHowToDock ? null : (
              <div className="md" ref={markdownContainerRef}>
                <MarkdownViewer
                  markdown={normalizedMarkdown}
                  externalRoot={externalRoot}
                  activeFile={activeFile}
                  scheduleSave={scheduleSave}
                  setMarkdown={setMarkdown}
                  highlightQuery={searchActive ? normalizedQuery : ""}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {ctxMenu.open && ctxMenu.kind === "file" && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
          }}
          className="contextMenu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!(activeLibraryName && ctxMenu.path && isBookmarked(activeLibraryName, ctxMenu.path)) ? (
            <button
              className="btn contextMenuButton"
              onClick={() => {
                if (activeLibraryName && ctxMenu.path) addBookmark(activeLibraryName, ctxMenu.path)
                closeCtxMenu()
              }}
            >
              Bookmark
            </button>
          ) : (
            <button
              className="btn contextMenuButton"
              onClick={() => {
                if (activeLibraryName && ctxMenu.path) removeBookmark(activeLibraryName, ctxMenu.path)
                closeCtxMenu()
              }}
            >
              Remove bookmark
            </button>
          )}

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              await renamePath(ctxMenu.path)
            }}
          >
            Rename file
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              await deletePath(ctxMenu.path, "this file", ctxMenu.libraryName, false)
            }}
          >
            Delete file
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={() => closeCtxMenu()}
          >
            Cancel
          </button>
        </div>
      )}

      {ctxMenu.open && ctxMenu.kind === "folder" && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
          }}
          className="contextMenu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn contextMenuButton"
            onClick={async () => {
              await createFileAt(ctxMenu.path)
            }}
          >
            New file
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              await createFolderAt(ctxMenu.path)
            }}
          >
            New folder
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              await renamePath(ctxMenu.path)
            }}
          >
            Rename folder
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              await deletePath(ctxMenu.path, "this folder", ctxMenu.libraryName, true)
            }}
          >
            Delete folder
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={() => closeCtxMenu()}
          >
            Cancel
          </button>
        </div>
      )}

      {ctxMenu.open && ctxMenu.kind === "bookmark" && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
          }}
          className="contextMenu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn contextMenuButton"
            onClick={() => {
              removeBookmark(ctxMenu.libraryName, ctxMenu.path)
              closeCtxMenu()
            }}
          >
            Remove bookmark
          </button>
          <button
            className="btn btn--ghost contextMenuButton"
            onClick={() => closeCtxMenu()}
          >
            Cancel
          </button>
        </div>
      )}

      {ctxMenu.open && ctxMenu.kind === "library" && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
          }}
          className="contextMenu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn contextMenuButton"
            onClick={async () => {
              const lib = libraries.find((l) => l.id === ctxMenu.libraryId)
              if (!lib) return
              await createFileAt("", lib.rootPath)
              if (activeLibraryName === lib.name) {
                await refreshActiveLibrary()
              }
            }}
          >
            New file
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              const lib = libraries.find((l) => l.id === ctxMenu.libraryId)
              if (!lib) return
              await createFolderAt("", lib.rootPath)
              if (activeLibraryName === lib.name) {
                await refreshActiveLibrary()
              }
            }}
          >
            New folder
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              const lib = libraries.find((l) => l.id === ctxMenu.libraryId)
              if (!lib) return
              closeCtxMenu()
              const nextName = await requestText({
                title: "Rename library",
                initial: lib.name,
                confirmLabel: "Rename",
              })
              if (!nextName) return
              const api = (window as any).ipcRenderer
              if (!api?.renameLibrary) {
                window.alert("Rename is unavailable. Please restart the app.")
                return
              }
              const res = await api.renameLibrary(lib.id, nextName)
              if (!res?.ok) return
              const nextLibs = await (window as any).ipcRenderer.listLibraries()
              setLibraries(nextLibs)
              if (activeLibraryName === lib.name) {
                setActiveLibraryName(nextName)
              }
            }}
          >
            Rename library
          </button>

          <button
            className="btn contextMenuButton"
            onClick={async () => {
              const ok = await (window as any).ipcRenderer.removeLibrary(ctxMenu.libraryId)
              closeCtxMenu()
              if (!ok) return

              const nextLibs = await (window as any).ipcRenderer.listLibraries()
              setLibraries(nextLibs)
            }}
          >
            Remove Library
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={async () => {
              const lib = libraries.find((l) => l.id === ctxMenu.libraryId)
              if (!lib) return
              await (window as any).ipcRenderer.openPath?.(lib.rootPath)
              closeCtxMenu()
            }}
          >
            Open in File Explorer
          </button>

          <button
            className="btn btn--ghost contextMenuButton"
            onClick={() => closeCtxMenu()}
          >
            Cancel
          </button>
        </div>
      )}

      {showHowTo ? (
        <div className="howToOverlay" onMouseDown={() => setShowHowTo(false)}>
          <div className="howToModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="howToHeader">
              <div>
                <div className="howToTitle">How To Use</div>
                <div className="howToSubtitle">Crash course guide</div>
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => setShowHowTo(false)}>
                Close
              </button>
            </div>

            <div className="howToBody">
              <section>
                <h3>Libraries</h3>
                <p>
                  Add a folder with <strong>+ Add Library</strong>. Your notes appear in the sidebar under each
                  library. You can keep multiple libraries expanded at once. Click a library name to make it active,
                  and use the top-left dropdown to switch quickly.
                </p>
                <p>
                  Folders can be expanded or collapsed. The plus/minus shows whether a folder is open. Right-click
                  libraries, folders, or files to create, rename, or delete items. Dropping folders into the default
                  libraries directory adds them automatically.
                </p>
                <p>
                  To install a new library: download a library zip from the Libraries page, extract it so the top-level
                  folder name matches the library, and drop that folder into <code>AppData/Roaming/Cam's Lazy
                  Notes/Libraries</code> (or use <strong>+ Add Library</strong> and pick the extracted folder).
                  Restart if it doesn’t appear automatically.
                </p>
              </section>

              <section>
                <h3>Included sample</h3>
                <p>
                  A <strong>BG3 Checklist (Sample)</strong> library is bundled so you can see an example. It’s copied
                  into your app data on first launch. If you don’t want it, right-click the BG3 library in the sidebar
                  and choose <strong>Remove Library</strong>.
                </p>
                <p>
                  Default library folder: <strong>app data/Libraries</strong>. + Add Library opens there by default;
                  you can also pick any other folder.
                </p>
              </section>

              <section>
                <h3>Reading and Checklists</h3>
                <p>
                  Click any file to view it. Task list checkboxes can be toggled and are saved back to the file.
                </p>
                <p>
                  Tables in Markdown render in the reader, and Obsidian-style ToC links should jump to headings.
                </p>
              </section>

              <section>
                <h3>Search</h3>
                <p>
                  Search scans file contents plus folder and library names. Use <strong>Current file</strong> to search
                  the open file, <strong>Current library</strong> for everything in that library, or
                  <strong>Global</strong> for all libraries. Results include match counts, line previews, and
                  click-to-jump with a brief highlight. Use the clear button to reset the search.
                </p>
              </section>

              <section>
                <h3>Bookmarks</h3>
                <p>
                  Right-click a file to bookmark it. Bookmarks show the library and path for quick context.
                </p>
              </section>

              <section>
                <h3>Tips</h3>
                <ul>
                  <li>Use the toggle to swap between light and dark mode.</li>
                  <li>Select a theme in Settings to change the app look.</li>
                  <li>Press Escape to close menus or this guide.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {showThemePicker ? (
        <div className="themePickerOverlay" onMouseDown={() => setShowThemePicker(false)}>
          <div className="themePickerModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="howToHeader">
              <div>
                <div className="howToTitle">Themes</div>
                <div className="howToSubtitle">Pick a look for the app</div>
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => setShowThemePicker(false)}>
                Close
              </button>
            </div>
            <div className="themePickerBody">
              <div className="themePickerHint">Each theme includes light and dark palettes.</div>
              <div className="themePickerHint">
                Current theme: {THEME_DEFS.find((item) => item.id === themeName)?.name ?? "Default"}
              </div>
              <div className="themeGrid">
                {THEME_DEFS.map((themeDef) => {
                  const isSelected = themeDef.id === themeName
                  return (
                    <button
                      key={themeDef.id}
                      type="button"
                      className={`themeCard ${isSelected ? "themeCard--active" : ""}`}
                      onClick={() => setThemeName(themeDef.id)}
                    >
                      <div className="themeCard__row">
                        <div className="themeCard__name">{themeDef.name}</div>
                        {isSelected ? <div className="themeCard__badge">Active</div> : null}
                      </div>
                      <div className="themePreview">
                        <div
                          className="themePreview__tile"
                          style={{
                            background: themeDef.light["--bg"],
                            color: themeDef.light["--text"],
                            borderColor: themeDef.light["--border"],
                          }}
                        >
                          <div
                            className="themePreview__bar"
                            style={{ background: themeDef.light["--accent"] }}
                          />
                          <div
                            className="themePreview__chip"
                            style={{ background: themeDef.light["--chip-bg"] }}
                          />
                        </div>
                        <div
                          className="themePreview__tile"
                          style={{
                            background: themeDef.dark["--bg"],
                            color: themeDef.dark["--text"],
                            borderColor: themeDef.dark["--border"],
                          }}
                        >
                          <div
                            className="themePreview__bar"
                            style={{ background: themeDef.dark["--accent-2"] }}
                          />
                          <div
                            className="themePreview__chip"
                            style={{ background: themeDef.dark["--chip-bg"] }}
                          />
                        </div>
                      </div>
                      <div className="themeCard__desc">{themeDef.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {textPrompt.open ? (
        <div
          className="textPromptOverlay"
          onMouseDown={() => {
            textPromptResolveRef.current?.(null)
            textPromptResolveRef.current = null
            setTextPrompt({ open: false, title: "" })
          }}
        >
          <div className="textPromptModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="textPromptTitle">{textPrompt.title}</div>
            <input
              className="textPromptInput"
              autoFocus
              defaultValue={textPrompt.initial ?? ""}
              placeholder={textPrompt.placeholder}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                const value = (e.target as HTMLInputElement).value.trim()
                textPromptResolveRef.current?.(value ? value : null)
                textPromptResolveRef.current = null
                setTextPrompt({ open: false, title: "" })
              }}
            />
            <div className="textPromptActions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  textPromptResolveRef.current?.(null)
                  textPromptResolveRef.current = null
                  setTextPrompt({ open: false, title: "" })
                }}
              >
                Cancel
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(".textPromptInput")
                  const value = input?.value.trim() ?? ""
                  textPromptResolveRef.current?.(value ? value : null)
                  textPromptResolveRef.current = null
                  setTextPrompt({ open: false, title: "" })
                }}
              >
                {textPrompt.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmPrompt.open ? (
        <div
          className="confirmPromptOverlay"
          onMouseDown={() => {
            confirmResolveRef.current?.(false)
            confirmResolveRef.current = null
            setConfirmPrompt({ open: false, title: "", message: "" })
          }}
        >
          <div className="confirmPromptModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirmPromptTitle">{confirmPrompt.title}</div>
            <div className="confirmPromptMessage">
              <div className="confirmPromptMessageLine confirmPromptMessageInline">
                <span>{confirmPrompt.message}</span>
                {confirmPrompt.detail ? (
                  <span className="confirmPromptDetail">{confirmPrompt.detail}</span>
                ) : null}
              </div>
              {confirmPrompt.warning ? (
                <div className="confirmPromptMessageLine confirmPromptMessageMuted">
                  {confirmPrompt.warning}
                </div>
              ) : null}
              <div className="confirmPromptMessageLine confirmPromptMessageMuted confirmPromptMessageStrong">
                This cannot be undone.
              </div>
            </div>
            <div className="confirmPromptActions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  confirmResolveRef.current?.(false)
                  confirmResolveRef.current = null
                  setConfirmPrompt({ open: false, title: "", message: "" })
                }}
              >
                {confirmPrompt.cancelLabel ?? "Cancel"}
              </button>
              <button
                className="btn confirmPromptDanger"
                type="button"
                onClick={() => {
                  confirmResolveRef.current?.(true)
                  confirmResolveRef.current = null
                  setConfirmPrompt({ open: false, title: "", message: "" })
                }}
              >
                {confirmPrompt.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}





