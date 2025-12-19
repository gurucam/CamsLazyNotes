# Cam's Lazy Notes

An Electron + React Markdown reader with checklists, themed UI, multi-library support, and an in-app updater. Built for BG3 note-taking but flexible for any Markdown library.

## Scripts
- `npm run dev` — start Vite dev server + renderer
- `npm run build` — type-check, bundle, and build Electron installer (Windows)
- `npm run lint` — run ESLint
- `npm run preview` — preview the built renderer

## Content
Libraries live on disk; add them via **+ Add Library** in the sidebar. Markdown checkboxes are writable and auto-saved.

## Updates
Releases publish to GitHub via `electron-builder` (`electron-builder.json5`). Auto-updates pull from the latest GitHub release.
