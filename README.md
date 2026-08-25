<h1 align="center">Typewell</h1>

<p align="center"><b>A notepad that is one HTML file.</b><br>
No account. No server. No build step. Nothing to install.</p>

<p align="center">
  <a href="https://typewell.net"><b>typewell.net</b></a> &nbsp;·&nbsp;
  <a href="#backing-up">Backs up to your own Drive</a> &nbsp;·&nbsp;
  <a href="LICENSE">MIT</a>
</p>

<p align="center">
  <img alt="single file" src="https://img.shields.io/badge/single%20file-index.html-0E9E9E">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-2E9E5B">
  <img alt="build step" src="https://img.shields.io/badge/build%20step-none-C98A2D">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-lightgrey">
</p>

<!-- SCREENSHOT: save a picture of the app to docs/screenshot.png, then delete
     these comment markers. Nothing else needs changing. -->
<!--
<p align="center">
  <a href="https://typewell.net"><img src="docs/screenshot.png" alt="Typewell, open on a note" width="860"></a>
</p>
-->

---

## What it is

Typewell is a notes app that is a **single file**. Open `index.html` and it
works — from a web address, from your own server, or straight off a USB stick.

What you type is saved in the browser as you go. There is no sign-up, no
tracking, and nothing is uploaded anywhere. It keeps working with the internet
switched off.

If one browser is not a safe enough place for your notes, connect **your own
Google Drive** in one click. Typewell puts each note there as an ordinary `.md`
file you can open in any editor.

## What it does

- **Type Markdown, get formatting.** `# ` makes a heading, `- ` a bullet,
  `[] ` a checkbox. The symbol disappears as the line changes.
- **Everything a note needs** — headings, lists, checkboxes, tables, code
  blocks, quotes, coloured callouts, text colours, highlights, links.
- **Pictures** you can drag bigger or smaller, and put where you want them:
  on their own line, in the middle of a sentence, or with the text flowing
  around them. Shrink one and it moves into the run of your words on its own,
  so a thumbnail never ends up stranded at the far edge of a wide page — inside
  a checklist line too.
- **Many notes** — search, pin, duplicate, trash with restore, and drag the
  list into your own order.
- **Four looks** — white, paper, dark, navy. Plus zen mode, find and replace,
  word counts, and a full set of keyboard shortcuts.
- **Your page, your width** — narrow, normal, wide, the whole window, or an
  exact number of pixels.
- **Install it** from your browser's address bar and it runs in its own window,
  offline.
- **Get your work out** as Markdown, HTML, plain text or PDF — or one JSON file
  holding everything.
- **Send a note to someone** with the **Share** button on the top bar. The whole
  note is packed inside the link — words, formatting and pictures alike — so
  nothing is uploaded and typewell.net never sees it. Pictures are re-encoded
  smaller for the trip; the copies in your notes are untouched. Anyone with the
  link can read it, and you cannot take it back — treat it like handing over a
  photocopy.
- **It opens where you left off.** Refresh or come back tomorrow and you are in
  the note you were last reading, not at the top of the list.

## Try it

**Use it:** open [typewell.net](https://typewell.net), or download `index.html`
and open that. Both are the same thing.

**Host it:** put the files on any static host — GitHub Pages, Netlify, S3,
nginx. There is nothing to build. See [docs/setup.md](docs/setup.md).

> The app itself runs from a plain `file://` open. Only the Google Drive
> connection needs a real `http(s)` address (localhost counts).

## Backing up

Your notes live in this browser. **Clearing the site's data erases them**, so if
they matter, pick one of these. Both go to storage *you* own — nothing passes
through anyone else's server.

**Google Drive.** Press *Connect Drive* in the sidebar. Typewell makes a folder
called `Typewell` in your Drive and keeps one plain `.md` file per note in it —
readable in Obsidian, iA Writer, or Notepad. Edit a file there and the change
comes back. It asks Google for the narrowest permission there is: it can only
see files it made itself, never the rest of your Drive.

**A file.** *Full backup (.json)* in the download menu saves every note at once,
and *Import backup* in the same menu brings them back.

> [!NOTE]
> **A Google window never opens on its own.** Google hands a browser about an
> hour at a time, and an app with no server cannot renew that quietly — so
> Typewell does not try. When the hour runs out, a background backup just
> waits: your notes are already saved here, and the corner reads *Waiting to
> back up* with a **Sign in** button. Press it whenever suits you and
> everything waiting goes up at once.
>
> [docs/setup.md](docs/setup.md) has the details, including the one console
> setting that makes Drive drop out every 7 days if you get it wrong.

## The rest of the documentation

| | |
|---|---|
| [**Every trigger and shortcut**](docs/shortcuts.md) | what to type, and what key does what |
| [**Hosting and deploying**](docs/setup.md) | GitHub Pages, the Google client ID, DNS |
| [**How it works inside**](docs/internals.md) | storage keys, sync rules, the tests, honest limits |
| [Privacy policy](https://typewell.net/privacy.html) · [Terms](https://typewell.net/terms.html) | |
| [Report a bug or ask for something](https://github.com/aronbraun/typewell/issues/new) | |

## Working on it

There is no build step. Edit `index.html`, open it in a browser, and you are
testing the real thing.

```bash
node tests/run.mjs
```

That runs the regression suite in headless Chrome and exits non-zero on any
failure. **Run it before you push**, and add a check for whatever you fixed —
one file of `contenteditable` is a place where a fix to one control lands on
another, and the suite is only worth what it remembers. You can also open
`tests/index.html` in a browser and read the list.

Issues and pull requests are welcome.

## Credits

Written with [Claude Code](https://claude.com/claude-code). Type by
[JetBrains Mono](https://www.jetbrains.com/lp/mono/) and
[Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).

MIT — see [LICENSE](LICENSE). Use it, fork it, rebrand it.
