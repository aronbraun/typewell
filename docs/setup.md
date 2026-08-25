# Hosting Typewell, and deploying this repository

Back to the [README](../README.md).

## Putting it on the web

It is one file. Any static host works — GitHub Pages, Netlify, S3, nginx, a
folder on your own machine. There is nothing to build and nothing to install.

The site is these files, and only these:

```
index.html  privacy.html  terms.html
manifest.webmanifest  sw.js  icons/
robots.txt  sitemap.xml  llms.txt
```

Everything else in the repository is developer tooling and is not published.

## Turning on Google Drive

Drive needs one thing: an OAuth **client ID**, which tells Google that requests
coming from your site are yours.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   *APIs & Services* → *Credentials*.
2. Create an OAuth client ID of type **Web application**.
3. Under *Authorized JavaScript origins*, add your site's address.
4. Enable the **Google Drive API**.
5. Put the ID into the `CONFIG` block at the top of the `<script>` in
   `index.html`:

```js
/* ══════════════ CONFIG ══════════════ */
const GOOGLE_CLIENT_ID_RAW = "1234-abc.apps.googleusercontent.com"; // ← yours
const DEFAULT_THEME        = "paper";  // paper | dark | navy
```

Or leave the `__GOOGLE_CLIENT_ID__` placeholder alone and let the deploy
workflow fill it in — see below. With no ID at all, the app runs perfectly well
and the Drive panel simply reads *not configured*, which is why opening
`index.html` straight off disk always works.

### That client ID is not a secret

An OAuth client ID is **public by design**. It ships to every visitor of every
site that uses one, and hiding it at build time hides nothing — a published page
is world-readable. What actually limits it is the *Authorized JavaScript
origins* list in the Google console, which for this project is:

```
https://typewell.net
https://aronbraun.github.io
```

It lives in deploy configuration only so that a checkout, a fork, or a `file://`
open shows a clean *not configured* instead of quietly carrying somebody else's
ID around.

You can store it as a GitHub *secret* instead of a *variable* — the workflow
reads the secret first and falls back to the variable. It costs nothing but a
masked value in the build log, and a workflow that ignores the value you
actually set is worse than an untidy one.

**Never put a real secret through this mechanism.** The workflow refuses any
value containing characters outside `[A-Za-z0-9._-]` rather than handing it to
`sed`.

## How this repository deploys

Every push to `main` — or a manual *Run workflow* — runs
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml). It runs the
test suite, copies the files above into `dist/`, substitutes the client ID,
uploads that directory as a GitHub Pages artifact, and publishes it. The site is
live a minute or two later at [typewell.net](https://typewell.net/) and
[aronbraun.github.io/typewell](https://aronbraun.github.io/typewell/) — the same
site under two names.

The build **fails** if the placeholder survives substitution. A site that ships
with Drive quietly switched off looks identical to a working one until somebody
tries to connect, which is the worst possible moment to find out.

### One-time setup

| Where | What |
|---|---|
| Settings → Pages → Source | **GitHub Actions** |
| Settings → Pages → Custom domain | `typewell.net` |
| Settings → Secrets and variables → Actions | `GOOGLE_CLIENT_ID`, as either a variable or a secret |
| DNS, wherever the zone lives | apex `A`/`AAAA` records pointing at [GitHub's Pages IPs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain), and `www` as a `CNAME` to `aronbraun.github.io` |

### Two things that look like missing features

An artifact deploy replaces the **whole site** on every run. That has two
consequences worth knowing:

- **There are no per-PR previews.** Only one thing can be live at a time, so a
  preview would delete production and production would delete the preview.
  Serving both at once would need a branch deploy and a second workflow racing
  the first for it. Not worth it here — to try a branch, open its `index.html`
  from disk, which is the whole app.
- **Jekyll never runs**, so there is no `.nojekyll` file to keep around, and the
  custom domain lives in the Pages settings rather than in a `CNAME` file. One
  place for each thing.

## Being found by search engines

Crawling is wide open on purpose. `robots.txt` disallows nothing and names the
sitemap. Its comment explains which AI user agents are *distribution* —
`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Bingbot` — and which are
only a *training* opt-out — `GPTBot`, `ClaudeBot`, `Google-Extended`,
`Applebot-Extended` — so that nobody later blocks the half that sends readers.

`sitemap.xml` lists exactly the three pages the deploy workflow copies. Change
one and change the other; a sitemap naming a missing page is worse than no
sitemap. `index.html` carries a `SoftwareApplication` JSON-LD block with no
`aggregateRating`, because there are no real reviews to put in one and inventing
some is how sites collect manual penalties.
