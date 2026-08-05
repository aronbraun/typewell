# Inkpad

**Your notes · your browser · your Drive.**

Inkpad is a complete notes app in **one HTML file**. No build step, no server, no account, no dependencies. Notes live in your browser's local storage first; you can back them up to **your own Google Drive** or a **secret GitHub Gist** with one click. Host it anywhere static files are served — GitHub Pages included — and it's free for everyone who uses it.

![single file](https://img.shields.io/badge/single%20file-~80%20KB-blue)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Quick start

**Use it:** open `index.html` in a browser. That's it.

**Host it (GitHub Pages):**

1. Push this folder to a GitHub repository.
2. Repo → *Settings* → *Pages* → deploy from branch → `main` / root.
3. Your notepad is live at `https://<you>.github.io/<repo>/`.

Any other static host (Netlify, Cloudflare Pages, S3, nginx) works the same way — it's one file.

> **Note:** the app itself works from a plain `file://` open, but the Google Drive connection requires a real `http(s)` origin (localhost is fine).

---

## Features

### Writing
- **Rich text editor** — headings, bold/italic/underline/strikethrough, text & highlight colors, font family and size per selection, quotes, dividers, tables, images (paste or insert)
- **Markdown as you type** (see table below) — bullets, numbered lists, task lists, headings, quotes, code, dividers, and inline `**bold**` / `*italic*` / `` `code` `` / `~~strike~~`
- **Task lists** with real checkboxes; checked state persists, Enter/Backspace behave like Notion
- **Code blocks done right** — Enter stays inside the block, Enter on an empty last line exits, Tab/Shift+Tab indent and dedent, Backspace on an empty block converts back to a paragraph, and pasting into a block is always plain text
- **Inline code** with an escape hatch: Space or → at the end of a code span steps outside it
- **Smart links** — URLs you type or paste become links automatically (punctuation-aware); pasting a URL over selected text links the selection
- **Find & replace** with live highlighting, previous/next, replace one/all
- **Snapshot undo/redo** — typing groups into sensible steps, every structural change is one step, buttons disable at the ends of history, caret position is restored

### Link behavior (follows editing-surface conventions)
- Hovering a link shows an **I-beam** cursor — a plain click places the caret and pops a **chip** with *open / edit / copy / unlink*
- Hold **Ctrl/Cmd** and the cursor flips to a **pointer** — Ctrl/Cmd+click opens the link in a new tab
- This is the Word / Google Docs editing-mode standard: plain click edits, modifier click navigates

### Organizing
- Notes sidebar with **search**, **pin**, **duplicate**, and a **trash** with restore / delete-forever
- The **file name lives in the top bar**, never inside the document
- Compact two-row note items with inline dates (time if today)

### Look & feel
- Three themes — **Paper** (warm cream), **Dark**, **Navy** — one click to switch
- **JetBrains Mono** as the default editor font (changeable per note or as default)
- **Zen mode** (Ctrl+Shift+F) for distraction-free writing, with a floating exit and Esc
- Word / character / reading-time counts and a breathing **sync beacon** in the status bar
- Custom rounded dropdowns, dialogs, and toasts throughout — no native browser popups

### Data in, data out
- **Export** a note as Markdown, HTML, plain text, or print-to-PDF; export **everything** as a single JSON backup
- **Import** `.md`, `.txt`, `.html` files as notes, or merge a JSON backup (newer copy of each note wins)
- The Markdown converter round-trips task lists, code blocks (with line breaks), tables, quotes, and links

---

## Backups

Notes are **local-first**: everything is stored in your browser (`localStorage`). Backups are optional and go only to storage *you* own.

### Google Drive (recommended)

Inkpad keeps a single file, `inkpad-backup.json`, in the connected user's own Drive using the **`drive.file`** scope — the app can only see files it created, nothing else in the Drive.

- One-click **Connect Drive** button in the sidebar
- On connect, if a backup already exists, Inkpad offers to **merge** it (newer copy of each note wins) — this is also how you move between devices
- **Back up now** button / **Ctrl+S**, plus optional **auto-backup** ~45 s after you stop typing
- Reconnects silently on the next visit once granted

**Host setup (one line):** create an OAuth *Web application* Client ID at [console.cloud.google.com](https://console.cloud.google.com) → *APIs & Services* → *Credentials*, add your site's origin under *Authorized JavaScript origins*, enable the Drive API, then paste the ID into the marked `CONFIG` block at the top of the `<script>` in `index.html`:

```js
/* ══════════════ CONFIG ══════════════ */
const GOOGLE_CLIENT_ID = "1234-abc.apps.googleusercontent.com"; // ← yours
const DEFAULT_THEME    = "paper";  // paper | dark | navy
```

Client IDs are public by design — shipping one in the file is safe and is exactly how it's meant to work. Until an ID is set, the app runs fine and the Drive section simply shows "not configured."

### GitHub Gist (optional second source)

Backs up the same JSON to a **secret gist**. Paste a token with only the [`gist` scope](https://github.com/settings/tokens/new?scopes=gist&description=Inkpad) into Settings. The token is stored in that browser only and requests go straight from the browser to `api.github.com`.

---

## Markdown triggers

| Type… | …and get |
|---|---|
| `- ` / `* ` / `+ ` | bullet list |
| `1. ` / `1) ` | numbered list |
| `[] ` / `[ ] ` | task list with checkbox |
| `# ` `## ` `### ` | headings 1–3 |
| `> ` | quote |
| ` ``` ` + Enter | code block |
| `---` + Enter | divider |
| `**text**` `*text*` `` `text` `` `~~text~~` + space | bold / italic / code / strike |
| any URL + space or Enter | link (trailing `),.` stay plain) |

Triggers work anywhere — including the first line of an empty note and lines that already have text after the caret.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) | undo / redo |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | bold / italic / underline |
| `Ctrl+K` | insert or edit link |
| `Ctrl+F` | find & replace |
| `Ctrl+S` | back up now |
| `Ctrl+Alt+N` | new note |
| `Ctrl+Shift+T` | task list |
| `Ctrl+Shift+F` | zen mode |
| `Ctrl+Enter` | exit a code block / quote / list |
| `Tab` / `Shift+Tab` | indent / dedent (lists and code blocks) |
| `/` | jump to note search |
| `Esc` | close panels, exit zen |

*(Cmd on macOS.)*

---

## Privacy

- **No server, no account, no analytics, no tracking.** The only network requests are the Google Fonts stylesheet and — only after you explicitly connect — Google Drive or GitHub API calls made directly from your browser to your own storage.
- Notes never pass through anyone else's infrastructure.
- Erasing everything is one button in Settings (backups in your Drive/Gist are not touched).

## Architecture notes

- One file: HTML + CSS + vanilla JS, no frameworks, no build. `contenteditable` editor with a custom snapshot-based undo history, custom dropdown/dialog/toast components, and hand-drawn SVG icons.
- Storage keys: `inkpad.notes.v1` (notes) and `inkpad.settings.v1` (settings) in `localStorage` (~5 MB budget — the status line in Settings shows usage). Images are embedded as data URLs, so keep them modest; the app warns above ~800 KB.
- Drive sync is last-write-wins **per note** by `updated` timestamp; the backup file is plain JSON you can read and version yourself.

## Limitations (honest ones)

- No syntax highlighting inside code blocks (would require a highlighter library; the file is intentionally dependency-free)
- No end-to-end encryption — backups are plain JSON in *your* storage; don't keep secrets in notes
- No real-time multi-device sync — it's backup/merge, not CRDT collaboration
- `localStorage` is per-browser-profile; connect Drive if you work across machines

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, rebrand it.
