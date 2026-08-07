# Typewell

**Your notes · your browser · your Drive.**

Typewell is a complete notes app in **one HTML file**. No build step, no server, no account, no dependencies. Notes live in your browser's local storage first; you can back them up to **your own Google Drive** or a **secret GitHub Gist** with one click. Host it anywhere static files are served — GitHub Pages included — and it's free for everyone who uses it.

![single file](https://img.shields.io/badge/single%20file-index.html-blue)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Links

| | |
|---|---|
| **Live app** | [typewell.net](https://typewell.net) |
| **Also at** | [aronbraun.github.io/typewell](https://aronbraun.github.io/typewell/) |
| **Source** | [github.com/aronbraun/typewell](https://github.com/aronbraun/typewell) |
| **Report a bug / request a feature** | [open an issue](https://github.com/aronbraun/typewell/issues/new) |
| **Privacy policy** | [privacy.html](https://typewell.net/privacy.html) |
| **Terms & conditions** | [terms.html](https://typewell.net/terms.html) |
| **License** | [MIT](LICENSE) |

---

## Quick start

**Use it:** open `index.html` in a browser. That's it.

**Host it:** drop the files on any static host — GitHub Pages, Netlify, S3,
nginx. There is nothing to build. See [Deploying](#deploying) for how this
repository is actually deployed.

> **Note:** the app itself works from a plain `file://` open, but the Google Drive connection requires a real `http(s)` origin (localhost is fine).

---

## Features

### Writing
- **Rich text editor** — headings, bold/italic/underline/strikethrough, font family and size per selection, quotes, dividers, images (paste or insert)
- **Colors from a palette, not a system dialog** — one button, one popup: the native picker and a hex box on top, then presets, then the colors you used last. A click on any swatch applies it and closes.
- **Tables** — insert a table at any size, then edit it in place: add or remove rows and columns, or delete the whole table
- **Markdown as you type** (see table below) — bullets, numbered lists, task lists, headings, quotes, code, dividers, and inline `**bold**` / `*italic*` / `` `code` `` / `~~strike~~` / `==highlight==`
- **Formatting guide** — the `?` icon in the header opens every trigger, callout type and export caveat in one panel, so nothing is hidden knowledge
- **Callouts** — GitHub-style alert banners in five flavours (note, tip, important, warning, caution). Type `[!warning]` at the start of a line, or pick one from the toolbar. They nest, so you can put a tip inside a warning.
- **Task lists** with real checkboxes; checked state persists, Enter/Backspace behave like Notion
- **Code blocks done right** — Enter stays inside the block, Enter on an empty last line exits, Tab/Shift+Tab indent and dedent, Backspace on an empty block converts back to a paragraph, and pasting into a block is always plain text
- **Inline code** with an escape hatch: Space or → at the end of a code span steps outside it. Both inline code and code blocks have toolbar buttons that light up when the caret is inside one
- **A paste does not repaint the page** — Word and Google Docs write `background-color:#ffffff` onto every span they emit. Invisible on a white page, a white slab on a cream one, and worse in the dark themes. Those are stripped on arrival, along with the matching black text colour they come paired with, so pasted text takes your theme's ink. A highlight you actually chose survives, and so does a black you set yourself.
- **Paste as plain text matches the line it lands in** — `Ctrl+Shift+V` (and anything copied from a plain source) inserts the characters where typing them would go, so they pick up the bold, colour and size already at the caret instead of arriving as bare black text. A formatted paste is still a formatted paste.
- **Font and inline code behave like bold** — with a selection they change the selection; with nothing selected they apply to what you type next, and the toolbar shows it armed. Neither one silently restyles the paragraph you happen to be standing in.
- **A status bar that says where you are** — words, characters, reading time, and `Ln 4, Col 12` for the caret, with `(86 selected)` when there is a selection. A line is what you see as a line: a quote wrapping a paragraph counts once, a list item above a sub-list counts on its own.
- **Move any block** — hover a paragraph, heading, bullet, quote, code block or table and a grip appears in the margin. Drag it and a line shows where it will land; `Alt+Shift+↑/↓` does the same from the keyboard. A block reorders among its own siblings and never silently turns into something else.
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
- **Installable, and offline** — add it to your home screen or dock and it runs like an app. The service worker is deliberately network-first: online you always get the current build, and the cache is only ever a fallback for when the network is not there. A new version announces itself with a *Reload* toast rather than waiting for a cache to expire.
- Word / character / reading-time counts and a breathing **sync beacon** in the status bar
- Custom rounded dropdowns, dialogs, tooltips, and toasts throughout — no native browser popups

### Data in, data out
- **Export** a note as Markdown, HTML, plain text, or print-to-PDF; export **everything** as a single JSON backup
- **Import** `.md`, `.txt`, `.html` files as notes (sidebar), or merge a JSON backup — *Import backup* sits in the same export menu as *Full backup*, and also in *Settings → Data* (newer copy of each note wins)
- The Markdown converter round-trips both ways: callouts (including nested ones), tables, nested and numbered lists, task lists, fenced code with its language, highlights, underline, links, and embedded images. Two known gaps: table column alignment (`|:--|--:|`) is not preserved, and `<https://example.com>` autolinks normalize to `[example.com](https://example.com)`.

---

## Backups

Notes are **local-first**: everything is stored in your browser (`localStorage`). Backups are optional and go only to storage *you* own.

### Google Drive (recommended)

Typewell keeps a **`Typewell/` folder** in the connected user's own Drive, holding **one ordinary Markdown file per note** — not a proprietary blob. Open them in Obsidian, iA Writer, or a text editor; edits made there sync back. It uses the **`drive.file`** scope, so the app can only see files it created, nothing else in the Drive.

- One-click **Connect Drive** button in the sidebar
- On connect, if the folder already exists, Typewell **merges** it (newer copy of each note wins) — this is also how you move between devices
- **Sync now** button / **Ctrl+S**, plus optional **auto-sync** ~45 s after you stop typing
- Reconnects silently on the next visit once granted
- Note identity, `created` and `pinned` ride in YAML front matter; `updated` deliberately does not, because Drive's own `modifiedTime` is the authority — otherwise editing a file elsewhere would leave a stale timestamp and the sync would eat your edit
- Deleting a note trashes the file (recoverable in Drive's own trash) rather than destroying it, and **a deletion never beats a newer edit** on the other side
- If both sides changed, the newer one wins and the loser is kept as a `… (conflict <date>)` note — nothing is discarded silently

> [!NOTE]
> One honest limitation of `drive.file`: a file *you* create directly in the `Typewell/` folder is invisible to the app. Google only ever lists files the app itself created — no scope short of full Drive access changes that, and asking for full Drive access is not worth it. Editing, renaming and deleting the files Typewell made all work fine.

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

Backs up the same JSON to a **secret gist**. Paste a token with only the [`gist` scope](https://github.com/settings/tokens/new?scopes=gist&description=Typewell) into Settings. The token is stored in that browser only and requests go straight from the browser to `api.github.com`.

---

## Markdown triggers

| Type… | …and get |
|---|---|
| `- ` / `* ` / `+ ` | bullet list |
| `1. ` / `1) ` | numbered list |
| `[] ` / `[ ] ` / `- [] ` | task list with checkbox |
| `# ` … `###### ` | headings 1–6 |
| `> ` | quote |
| `[!note]` `[!tip]` `[!important]` `[!warning]` `[!caution]` + Enter | callout / alert banner (works with or without a leading `> `) |
| ` ``` ` + Enter | code block (` ```js ` keeps the language) |
| `---` / `***` + space or Enter | divider (must be the whole line) |
| `**text**` `*text*` `` `text` `` `~~text~~` `==text==` + space | bold / italic / code / strike / highlight |
| any URL + space or Enter | link (trailing `),.` stay plain) |

Triggers work anywhere — including the first line of an empty note and lines that already have text after the caret.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) | undo / redo |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | bold / italic / underline |
| `Ctrl+Shift+X` | strikethrough |
| `Ctrl+E` | inline code |
| `Ctrl+Shift+E` | code block (toggles back to paragraphs) |
| `Ctrl+Shift+7` / `Ctrl+Shift+8` / `Ctrl+Shift+9` | numbered / bullet / task list |
| `Ctrl+Alt+0`–`Ctrl+Alt+3` | paragraph / heading 1–3 |
| `Alt+Shift+↑` / `Alt+Shift+↓` | move the current block up / down |
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

It is one file — any static host works. This repository publishes to **GitHub
Pages** from a single workflow, `.github/workflows/deploy.yml`, with Pages set to
the **GitHub Actions** source.

Every push to `main` (or a manual *Run workflow*) copies the three pages into
`dist/`, substitutes `__GOOGLE_CLIENT_ID__`, uploads that directory as a Pages
artifact and deploys it. Live a minute or two later at
[typewell.net](https://typewell.net/) and
[aronbraun.github.io/typewell](https://aronbraun.github.io/typewell/) — the same
site, two names.

An artifact deploy replaces the entire site on every run. Two consequences worth
knowing, because both look like missing features:

- **There are no per-PR previews.** Only one thing can be live at a time, so a
  preview would delete production and production would delete the preview.
  Serving both at once needs a branch deploy (`gh-pages/pr/<number>/`), which
  costs a published branch full of build output and a second workflow racing the
  first for it. Not worth it here. To try a branch, open `index.html` from disk —
  it is the whole app.
- **Jekyll never runs**, so there is no `.nojekyll` to keep around, and the
  custom domain lives in the Pages settings rather than in a `CNAME` file in the
  payload. One place for each thing.

### One-time setup

| Where | What |
|---|---|
| Settings → Pages → Source | **GitHub Actions** |
| Settings → Pages → Custom domain | `typewell.net` |
| Settings → Secrets and variables → Actions | `GOOGLE_CLIENT_ID` — as a **variable** or a **secret**; the workflow reads the secret first and falls back to the variable |
| DNS, wherever the zone lives | apex `A`/`AAAA` records pointing at [GitHub's Pages IPs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain), and `www` as a `CNAME` to `aronbraun.github.io` |

The build **fails** if the placeholder survives substitution. A site that ships
with Drive quietly switched off looks identical to a working one until somebody
tries to connect, which is the worst moment to find out.
### About that client ID

Really a variable, not a secret: an OAuth client ID is public by design and
ships to every visitor. Build-time substitution hides nothing — a published site
is world-readable. It lives in deploy configuration only so that a checkout, a
fork, or a `file://` open shows a clean "not configured" instead of carrying
someone else's ID around.

Storing it as a *secret* works too and the workflow reads that first. It costs
nothing but a masked value in the build log, and a workflow that ignores the
value you actually set is worse than an untidy one.

What actually constrains the ID is the *Authorized JavaScript origins* list in
the Google console, which for this project is:

```
https://typewell.net
https://aronbraun.github.io
```

The workflow refuses any value with characters outside `[A-Za-z0-9._-]` rather
than handing it to `sed`. Never put a real secret through this mechanism.

## Privacy

- **No server, no account, no analytics, no tracking.** The only network requests are the Google Fonts stylesheet and — only after you explicitly connect — Google Drive or GitHub API calls made directly from your browser to your own storage.
- Notes never pass through anyone else's infrastructure.
- Erasing everything is one button in Settings (backups in your Drive/Gist are not touched).

## Architecture notes

- One file: HTML + CSS + vanilla JS, no frameworks, no build. `contenteditable` editor with a custom snapshot-based undo history, custom dropdown/dialog/toast components, and hand-drawn SVG icons.
- The site is `index.html`, `privacy.html`, `terms.html`, `manifest.webmanifest`, `sw.js` and `icons/`. Everything else in the repo is developer tooling and is not deployed. The install icons in `icons/` are the same artwork as the inline SVG favicon, rasterised once; the throwaway script that produced them is not kept in the tree (it is in the history if the artwork ever changes).
- `sw.js` is network-first for everything same-origin and never touches another origin, so Google's auth and Drive responses are never intercepted or stored. Cross-origin passthrough is a security choice, not an oversight.
- Storage keys: `typewell.notes.v1` (notes), `typewell.settings.v1` (settings), `typewell.drive.v1` (which Drive file is which note, and when each last synced — no note contents), and `typewell.drive.token.v1` (the current Google access token and its expiry, so a sync after a reload does not reopen the sign-in window; dropped on expiry, disconnect or erase). All in `localStorage`, ~5 MB budget; the status line in Settings shows usage. Images are embedded as data URLs, so keep them modest; the app warns above ~800 KB.
- Drive sync is last-write-wins **per note**, comparing the local `updated` against Drive's `modifiedTime`. The sync map is kept in its own storage key so the JSON export and the gist payload stay byte-identical to what they always were.
- The gist backup stays a single JSON on purpose: Markdown is a readable library, JSON is the exact copy. A backup's job is lossless restore, so one of the two has to keep the HTML verbatim.

## Tests

One file of `contenteditable` and `execCommand` is a place where a fix to one
control lands on another, and "I clicked around and it looked fine" has shipped
the same class of bug more than once. So there is a suite, and it drives the
real app in an iframe — real elements, real events, real `execCommand`, no
mocks. A mock of `contenteditable` would only ever agree with whatever the
author believed at the time.

```bash
node tests/run.mjs
```

That starts a static server, runs [tests/index.html](tests/index.html) in headless Chrome
over the DevTools Protocol, prints each check and exits non-zero on any red.
No dependencies and no `node_modules`: Node 22+ ships a global `WebSocket`, and
that is the entire runner ([tests/run.mjs](tests/run.mjs), ~150 lines).

You can also just open `tests/index.html` in a browser — same suite
([tests/suite.js](tests/suite.js)), same results, listed down the left with the
app running beside it.

Every check exists because the behaviour it covers broke at least once. Adding
one when you fix something is the point; the suite is only worth what it
remembers. CI runs it on every pull request, and the deploy job will not
publish a red build.

## Limitations (honest ones)

- No syntax highlighting inside code blocks (would require a highlighter library; the file is intentionally dependency-free)
- No end-to-end encryption — backups are plain JSON in *your* storage; don't keep secrets in notes
- No real-time multi-device sync — it's backup/merge, not CRDT collaboration
- `localStorage` is per-browser-profile; connect Drive if you work across machines

## Built with

[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757)](https://claude.com/claude-code)

Typewell was designed and written with [Claude](https://claude.com/claude-code) — the editor, the storage layer, the Drive/Gist backup paths, and this README. It's still one hand-readable HTML file: open it and every line is there.

Type design: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), loaded from Google Fonts.

## Contributing

Issues and pull requests are welcome at the [repository](https://github.com/aronbraun/typewell). Found a bug or want something added? [Open an issue](https://github.com/aronbraun/typewell/issues/new). There's no build step — edit `index.html`, open it in a browser, and you're testing the real thing. Run `node tests/run.mjs` before you push, and add a check for whatever you fixed.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, rebrand it.
