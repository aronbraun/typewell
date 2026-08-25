# How Typewell works inside

Back to the [README](../README.md).

Written for whoever opens `index.html` next. Everything here is a decision that
cost something to get right.

## The shape of it

One file: HTML, CSS and plain JavaScript, no frameworks, no build. The editor is
a `contenteditable` element with a snapshot-based undo history, hand-written
dropdowns, dialogs and toasts, and hand-drawn SVG icons.

The install icons in `icons/` are the same artwork as the inline SVG favicon,
rasterised once. The throwaway script that made them is not kept in the tree —
it is in the history if the artwork ever changes.

## Where things are stored

All in `localStorage`, which gives roughly 5 MB. Settings shows how much is used.

| Key | What is in it |
|---|---|
| `typewell.notes.v1` | every note |
| `typewell.settings.v1` | settings |
| `typewell.drive.v1` | which Drive file is which note, and when each last synced — no note text |
| `typewell.drive.token.v1` | the current Google access token and when it expires |

The token is kept so that a sync straight after a reload does not have to reopen
the sign-in window for a token that is still perfectly good. It is dropped on
expiry, on disconnect, and on *Erase everything*. It only reaches files this app
created, and anything able to read it can already read every note in the same
store — so it does not open a door that was not already the same door.

Pictures are stored as data URLs inside the note, so they count against that
5 MB. The app warns above about 800 KB, and the size buttons on a selected
picture only change how it is displayed, not how much it weighs.

Two rules keep the picture frame honest, and both exist because breaking them
was a real bug.

**The frame on screen is not the same fact as the picture being selected.**
`selectImg()` puts a real DOM range around the picture, and `imgIsSelected()`
checks that range before Delete or Backspace is allowed to remove anything. Put
the caret just left of a picture and press Backspace and the key goes straight
back to the browser, which deletes the letter — which is what used to eat the
picture instead. Any key that moves the caret, and any selection change from
anywhere in the app, drops the frame.

**A small picture moves into the line of text by itself.** `autoPlaceImg()`
runs after a size button or a drag, and below `IMG_INLINE_AT` (30% of the line
width) sets `data-a="inline"`; above it, it puts an auto-inlined picture back on
its own line. It never touches a picture carrying `data-fit="fixed"`, which the
Sits row writes the moment you pick a placement yourself. Without this, a
thumbnail on a full-width page sits an arm's length from the sentence it
illustrates.

A caret directly before or after a picture also gets `#caretMark`, a bar the
height of the picture on the side the caret is on — a text caret drawn flush
against a picture's edge is close to invisible.

## The Google sign-in, and why it runs out

Google's browser sign-in (the *implicit*, or "token", flow) hands out an access
token that lasts about an hour, and **there is no refresh token in that flow at
all**.

Be careful how strongly you state that. Google's other flow — the
*authorization code* flow — does issue a refresh token, and that one lasts
indefinitely. Redeeming it needs a client secret, and Google's own
[flow comparison](https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model)
marks it "Requires backend platform: **Yes**". So the honest claim is not
"browsers cannot do this" but "an app with **no server** cannot do this".
Typewell has no server on purpose, which is what puts it on the hour clock.

Two silent-renewal tricks that look like escapes and are not:

- **Hidden iframe with `prompt=none`.** `accounts.google.com` sends
  `X-Frame-Options`, so it refuses to render in a frame at all; and blocked
  third-party cookies would break it even if it did.
- **`prompt: "none"` on the token client.** The reference says it shows no
  screens, but the library opens a popup regardless — `prompt` only changes
  what happens *inside* the popup. That is why the renewal has to ride a user
  gesture.

The rule the code enforces is narrower and more useful than "stay signed in":
**a Google window never opens unless the person pressed something that said it
would.**

An earlier version did renew early — off any click or keypress, a few minutes
before the hour ran out. It worked, and it was still wrong: a window could
flash open in the middle of a sentence, for a deadline nobody asked about. That
is gone. Nothing listens for gestures any more.

What replaced it:

- `drive.gestures` is a depth counter, raised only by `drive.withSignIn(fn)`.
  Deliberate actions run inside it — *Back up now*, *Sync*, Ctrl+S, *Connect*,
  *Sign in*. Background actions do not — the auto-backup timer above all.
- `drive.ensureToken()` uses a live or stored token if there is one. If there
  is not and `gestures` is zero, it **does not authorise**. It sets
  `drive.pending`, refreshes the footer, and throws an error carrying
  `needsSignIn = true`.
- The footer then shows one calm line — *Waiting to back up* — and one **Sign
  in** button. Nothing has failed: the notes were saved locally long before
  Drive was involved. Pressing the button signs in and flushes everything that
  piled up in a single run.
- A depth *count* rather than a boolean, because `backup()` calls `api()` calls
  `ensureToken()`; an inner `finally` resetting a boolean would strand the
  outer call in background mode halfway through.

The scope is `drive.file` and nothing else — never widen it. That is what keeps
Typewell out of Google's CASA security review, and it is why a file *you* create
by hand inside the `Typewell` folder is invisible to the app: Google only ever
lists files the app itself created. Editing, renaming and deleting the files
Typewell made all work normally.

## How Drive sync decides

Last write wins, **per note**, comparing the local `updated` against Drive's own
`modifiedTime`.

- Note identity, `created` and `pinned` ride in YAML front matter at the top of
  each file. `updated` deliberately does **not** — Drive's `modifiedTime` is the
  authority, and a stale timestamp written into the file would make the sync eat
  an edit made elsewhere.
- Deleting a note **trashes** the Drive file rather than destroying it, and a
  deletion never beats a newer edit on the other side.
- If both sides changed, the newer one wins and the loser is kept as a
  `… (conflict <date>)` note. Nothing is discarded in silence.
- The sync map lives in its own storage key so that the JSON export and the gist
  payload stay byte-identical to what they always were.

The gist backup stays one JSON blob on purpose. Markdown is a readable library;
JSON is the exact copy. A backup's job is a lossless restore, so one of the two
has to keep the HTML verbatim.

## Markdown, in and out

The converter round-trips both directions: callouts including nested ones,
tables, nested and numbered lists, task lists, fenced code with its language,
highlights, underline, links, and embedded pictures with their size and
placement (carried in the standard title slot, `![a](src "w=40% a=center")`).

Two known gaps: table column alignment (`|:--|--:|`) is not kept, and
`<https://example.com>` autolinks come back as `[example.com](https://example.com)`.

**Everything the markdown parser builds is scrubbed before it reaches a page.**
Markdown has no tag for a script, but it does have `[text](url)` and `![](url)`,
where "url" is whatever was typed — `javascript:` included. A note can now
arrive from a file somebody e-mailed, a shared Drive folder, or a link a stranger
sent, so `sanitizeHtml()` walks the result once: an unknown tag is unwrapped
(the words inside it are the note), an unknown attribute is dropped, and any
address that is not plain web, mail, or an inline picture loses its `href` or
`src`. The allowed lists are short on purpose — exactly what the parser itself
can emit, and nothing more.

## Sharing a note as a link

The whole note is packed into the link's `#fragment`, which is the one part of a
web address a browser **never sends to the server**. So a shared note reaches
the person you sent it to without passing through typewell.net, without an
account at either end, and with nothing left behind to delete.

The note is carried as Markdown, gzipped where the browser has
`CompressionStream` and base64url'd, with a one-letter prefix saying which of
the two it is so old links keep opening. It comes back in through the same
sanitised `mdToHtml` as any other imported note, and opens in a read-only panel
that adds nothing to your own notes until you press *Save*.

Pictures travel in the link too. Because a pasted screenshot is often megabytes
and the whole note has to fit inside one address, `shrinkForShare()` re-encodes
every embedded picture through a canvas on the way in: capped at
`SHARE_IMG_MAX` (1400 px on the longest side) and written as WebP, which unlike
JPEG keeps transparency. It runs on a **clone** of the editor, so nothing you
can see changes while a link is being made and the copies in your own note are
never rewritten. Three things are passed through untouched — a plain web
address, an SVG (already text; a canvas would only turn it into a much larger
grid of pixels), and any picture whose re-encoded version came out *bigger*,
which is also how a browser that cannot write WebP silently opts out.

The honest limits, which the dialog says out loud: the link **is** the note, so
anyone holding it can read it and there is no unsending it; and it cannot be
edited after the fact, because a new link is a new copy. `SHARE_MAX` is 512 KB
— a limit on what a browser will open, not on any network, since the fragment
is never sent anywhere. Mail and chat apps are the ones with the short fuse, so
past `SHARE_LONG` (64 KB) the dialog says plainly that a long link may arrive
cut, and suggests the Markdown file instead.

## Coming back to where you left off

`LS_LAST` holds the id of the note you last opened, written by `openNote()` and
read once at boot by `openLastNote()`. Its own localStorage key rather than a
field in `settings`, because it is not a preference and must not ride along
into an export or a backup. It is checked against the notes actually loaded, so
an id that has since been trashed — or that came from a browser wiped in
between — falls through to `pickFirst()` rather than opening nothing.

## The service worker

`sw.js` is network-first for everything same-origin, and it **never touches
another origin** — Google's auth and Drive responses are never intercepted or
stored. Cross-origin passthrough is a security choice, not an oversight: an
intercepted, replayed auth response is a security problem, not a performance
win. Online you always get the current build; the cache is only ever the
fallback for when the network is not there. A new version announces itself with
a *Reload* toast rather than waiting for a cache to expire.

## The tests

One file of `contenteditable` and `execCommand` is a place where a fix to one
control lands on another, and "I clicked around and it looked fine" has shipped
the same class of bug more than once. So there is a suite, and it drives the
**real app in an iframe** — real elements, real events, real `execCommand`, no
mocks. A mock of `contenteditable` would only ever agree with whatever the
author believed at the time.

```bash
node tests/run.mjs
```

That starts a static server, runs [tests/index.html](../tests/index.html) in
headless Chrome over the DevTools Protocol, prints each check, and exits
non-zero on any red. No dependencies and no `node_modules`: Node 22+ ships a
global `WebSocket`, and that is the whole runner
([tests/run.mjs](../tests/run.mjs), about 150 lines).

You can also just open `tests/index.html` in a browser — same suite
([tests/suite.js](../tests/suite.js)), same results, listed down the left with
the app running beside it.

Every check exists because the behaviour it covers broke at least once. Adding
one when you fix something is the whole point; the suite is only worth what it
remembers. CI runs it on every pull request, and the deploy job will not publish
a red build.

## Honest limits

- **No syntax colouring inside code blocks.** That needs a highlighting library,
  and the file is deliberately dependency-free.
- **No encryption.** Backups are plain JSON and plain Markdown in *your* own
  storage. Do not keep secrets in notes.
- **No live multi-device editing.** It is backup and merge, not real-time
  collaboration.
- **`localStorage` is per browser profile.** Connect Drive if you move between
  machines.
- **A share link cannot be recalled or edited.** See above.
