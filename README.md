# Inkpad

**Your notes · your browser · your Drive.**

Inkpad is a complete notes app in **one HTML file**. No build step, no server, no account, no dependencies. Notes live in your browser's local storage first; you can back them up to **your own Google Drive** or a **secret GitHub Gist** with one click. Host it anywhere static files are served — GitHub Pages included — and it's free for everyone who uses it.

![single file](https://img.shields.io/badge/single%20file-index.html-blue)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Links

| | |
|---|---|
| **Live app** | [inkpad.js.org](https://inkpad.js.org) |
| **Mirror** | [inkpad-js.github.io/inkpad](https://inkpad-js.github.io/inkpad/) |
| **Source** | [github.com/inkpad-js/inkpad](https://github.com/inkpad-js/inkpad) |
| **Report a bug / request a feature** | [open an issue](https://github.com/inkpad-js/inkpad/issues/new) |
| **Privacy policy** | [privacy.html](https://inkpad.js.org/privacy.html) |
| **Terms & conditions** | [terms.html](https://inkpad.js.org/terms.html) |
| **License** | [MIT](LICENSE) |

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
- **Rich text editor** — headings, bold/italic/underline/strikethrough, text & highlight colors, font family and size per selection, quotes, dividers, images (paste or insert)
- **Tables** — insert a table at any size, then edit it in place: add or remove rows and columns, or delete the whole table
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
- Custom rounded dropdowns, dialogs, tooltips, and toasts throughout — no native browser popups

### Data in, data out
- **Export** a note as Markdown, HTML, plain text, or print-to-PDF; export **everything** as a single JSON backup
- **Import** `.md`, `.txt`, `.html` files as notes (sidebar), or merge a JSON backup via *Settings → Data → Import backup* (newer copy of each note wins)
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
const GOOGLE_CLIENT_ID_RAW = "1234-abc.apps.googleusercontent.com"; // ← yours
const DEFAULT_THEME        = "paper";  // paper | dark | navy
```

Or leave the `__GOOGLE_CLIENT_ID__` placeholder in place and let the deploy
workflow fill it in — see [Deploying](#deploying) below. If it is never
substituted, it falls back to an empty string and the Drive panel simply reads
"not configured", so opening `index.html` straight off disk always works.

Client IDs are public by design — shipping one in the file is safe and is exactly how it's meant to work. Until an ID is set, the app runs fine and the Drive section simply shows "not configured."

### GitHub Gist (optional second source)

Backs up the same JSON to a **secret gist**. Paste a token with only the [`gist` scope](https://github.com/settings/tokens/new?scopes=gist&description=Inkpad) into Settings. The token is stored in that browser only and requests go straight from the browser to `api.github.com`.

---

## Markdown triggers

| Type… | …and get |
|---|---|
| `- ` / `* ` / `+ ` | bullet list |
| `1. ` / `1) ` | numbered list |
| `[] ` / `[ ] ` / `- [] ` | task list with checkbox |
| `# ` `## ` `### ` | headings 1–3 |
| `> ` | quote |
| ` ``` ` + Enter | code block |
| `---` / `***` + Enter | divider |
| `**text**` `*text*` `` `text` `` `~~text~~` + space | bold / italic / code / strike |
| any URL + space or Enter | link (trailing `),.` stay plain) |

Triggers work anywhere — including the first line of an empty note and lines that already have text after the caret.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) | undo / redo |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | bold / italic / underline |
| `Ctrl+Shift+X` | strikethrough |
| `Ctrl+E` | inline code |
| `Ctrl+Shift+7` / `Ctrl+Shift+8` / `Ctrl+Shift+9` | numbered / bullet / task list |
| `Ctrl+Alt+0`–`Ctrl+Alt+3` | paragraph / heading 1–3 |
| `Ctrl+\` | clear formatting |
| `Ctrl+K` | insert or edit link |
| `Ctrl+F` | find & replace |
| `Ctrl+S` | back up now |
| `Ctrl+Alt+N` | new note |
| `Ctrl+Shift+F` | zen mode |
| `Ctrl+Enter` | exit a code block / quote / list |
| `Tab` / `Shift+Tab` | indent / dedent (lists and code blocks) |
| `/` | jump to note search |
| `Esc` | close panels, exit zen |

*(Cmd on macOS.)*

---

## Deploying

Any static host works — it is one file. For GitHub Pages there are two options.

**Deploy from a branch (default).** Settings → Pages → Source → *Deploy from a
branch* → `main` / root. The client ID must be hardcoded in `index.html`.

**GitHub Actions (build-time substitution).** `.github/workflows/deploy.yml`
replaces the `__GOOGLE_CLIENT_ID__` placeholder from a repository *variable*
before publishing, so the same source can deploy to staging and production with
different client IDs.

1. Settings → Secrets and variables → Actions → **Variables** → New repository
   variable → `GOOGLE_CLIENT_ID`.
2. Settings → Pages → Source → **GitHub Actions**. Until you do this the
   workflow runs but the deploy step fails, and the live site keeps serving
   whatever the branch contains.

A variable, not a secret: an OAuth client ID is public by design and ships to
every visitor. Build-time substitution hides nothing — a Pages artifact is
world-readable. What actually constrains the ID is the *Authorized JavaScript
origins* list in the Google console. Never put a real secret through this.

If you also use a custom domain, set the domain **first**, on branch deploy,
and wait for the DNS check and HTTPS to go green before switching the source.
Keep the `CNAME` file committed: Actions deploys ignore it, but a rollback to
branch deploy needs it.

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

## Built with

[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757)](https://claude.com/claude-code)

Inkpad was designed and written with [Claude](https://claude.com/claude-code) — the editor, the storage layer, the Drive/Gist backup paths, and this README. It's still one hand-readable HTML file: open it and every line is there.

Type design: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), loaded from Google Fonts.

## Contributing

Issues and pull requests are welcome at the [repository](https://github.com/inkpad-js/inkpad). Found a bug or want something added? [Open an issue](https://github.com/inkpad-js/inkpad/issues/new). There's no build step — edit `index.html`, open it in a browser, and you're testing the real thing.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, rebrand it.
