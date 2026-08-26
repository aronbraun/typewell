# The Typewell sign-in helper (optional)

## In plain words

Typewell has no server. That is the point of it, and nothing here changes it —
your notes still live in your browser and go straight to Google, never through
anything of ours.

But it costs one thing. Google gives a web page permission to touch your Drive
for **about one hour**, and it flatly refuses to give a web page the long-lived
pass that would let it renew quietly in the background. So once an hour,
Typewell has to stop and ask you to sign in again.

The long-lived pass exists. Google will only hand it over to something that can
keep a **password of its own** hidden — and a single HTML file that anyone can
read cannot hide a password. That is the whole reason a server is needed, and
it is the *only* reason.

This folder is that server. It is about 130 lines. It holds the password, swaps
it for the long-lived pass, and does nothing else. **It never sees a note.**

If you do not deploy it, Typewell works exactly as it does today. Forks get the
serverless behaviour automatically — none of this runs without settings that
only you can add.

## Before you start: check one setting, or none of this will help

In the Google Cloud Console, under **APIs & Services → OAuth consent screen**,
look at **Publishing status**.

If it says **Testing**, Google throws away every authorization after **7 days**
— the long-lived pass included. Building this changes nothing while that is
true. Press **Publish app** so it reads **In production**.

This is free and instant. Typewell asks only for the `drive.file` scope, which
Google counts as non-sensitive, so **no app review is needed**.

> If Drive currently signs you out every few days rather than every hour, this
> setting is almost certainly the cause — not the missing server. Fix it first
> and see whether the problem goes away on its own.

## How it is wired

Nothing about your account is stored in this repository. The settings live in
**GitHub**, and a workflow pushes them to Cloudflare for you. You never install
Cloudflare's command-line tool and you never keep the secret on your own
machine.

```
GitHub  ──secrets and variables──▶  .github/workflows/auth-worker.yml
                                              │
                                              ▼
                                    Cloudflare Worker  ◀── your browser, once an hour
                                              │
                                              ▼
                                     Google's token endpoint
```

Your notes are not on that diagram, and that is not an omission. They go from
your browser directly to Google's Drive API and never touch the worker.

## What to set

Under **Settings → Secrets and variables → Actions** in your repository:

| | Name | What it is |
|---|---|---|
| **Secret** | `CLOUDFLARE_API_TOKEN` | lets the workflow deploy |
| **Secret** | `GOOGLE_CLIENT_SECRET` | the one real secret in the project |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | which Cloudflare account |
| Variable | `GOOGLE_CLIENT_ID` | public; the same value the page ships |
| Variable | `ALLOWED_ORIGIN` | the one site allowed to use the helper, e.g. `https://example.com` |
| Variable | `AUTH_ENDPOINT` | the worker's address — **added last**, see step 5 |

**The split matters.** GitHub encrypts secrets and hides them from logs;
variables are stored in the clear and shown in the interface. An OAuth **client
ID** is public by design, so a variable is its honest home. A client **secret**
is not. Never move one to the other column.

## Setup — five steps

### 1. Get your two Cloudflare values

Both are free, and a free Workers account is far more than this will ever need
— roughly one request per hour per person against a daily allowance of 100,000.

- **Account ID** — Cloudflare dashboard → **Workers & Pages**. It is shown in
  the sidebar, and it is also the long identifier in the dashboard URL.
- **API token** — dashboard → **My Profile → API Tokens → Create Token**, and
  pick the **Edit Cloudflare Workers** template. Do not use a Global API Key:
  the template token can deploy Workers and nothing else, which is the whole
  point of using it.

The token is shown **once**. Copy it straight into GitHub.

### 2. Get your client secret

Google Cloud Console → **Credentials** → your OAuth **Web application** client.
The **Client secret** is on that page. If you have never used it, it is sitting
there waiting.

### 3. Put the five settings into GitHub

The table above. Leave `AUTH_ENDPOINT` for step 5.

### 4. Run the workflow

**Actions → Deploy the sign-in helper → Run workflow.**

It checks the settings before it does anything. If some are missing it says
which ones and stops, rather than deploying a worker that cannot work. When it
finishes, the log prints the worker's address — something ending in
`.workers.dev`.

### 5. Close the loop

Two one-off jobs, both taking a minute:

- **Tell Google about the worker.** Google console → **Credentials** → your
  OAuth client → **Authorized redirect URIs** → add the worker's address with
  `/callback` on the end. Leave *Authorized JavaScript origins* alone.
- **Tell the site about the worker.** Add the `AUTH_ENDPOINT` variable — the
  worker's address, **no trailing slash**, no `/callback` — then re-run
  **Deploy to GitHub Pages**.

Until `AUTH_ENDPOINT` is set the site stays serverless no matter what else you
have done. That is deliberate: deploying the helper and switching it on are
separate decisions.

## Deploying it by hand instead

If you would rather not give GitHub a Cloudflare token, the workflow is doing
nothing you cannot do yourself:

```bash
cd server
npx wrangler@4 deploy --var "GOOGLE_CLIENT_ID:..." --var "ALLOWED_ORIGIN:https://example.com"
npx wrangler@4 secret put GOOGLE_CLIENT_SECRET
```

Then steps 5 above, the same way.

## What changes once it is on

- **Connect** asks Google for permission once. After that, renewal is silent
  and indefinite — no window, no click.
- Background backups stop waiting for you. The *"Waiting to back up"* line in
  the corner has nothing left to wait for.
- Everything else is identical.

## What to know before you trust it

- **It never sees your notes.** Notes go from your browser to Google directly.
  This only swaps codes for tokens.
- **The long-lived pass is stored in your browser**, next to the notes, in the
  same place the hourly one already lives. The difference is that it does not
  expire on its own. Anything able to read it could reach the Typewell folder in
  your Drive — and nothing else, because `drive.file` cannot see the rest of
  your Drive. Press **Disconnect** to have Google forget it immediately.
- **Anyone holding a valid pass can use this worker to cash it in.** That is not
  a leak: cashing in a pass you already stole is something Google would let them
  do anyway. The worker adds no new way to *get* one.
- **The client secret is only ever inside GitHub and Cloudflare.** It is never
  written into a file here, never printed in a log, and never sent to a browser.
- **The worker keeps no database** and stores nothing between requests.
  Cloudflare, as the infrastructure provider, may log requests.
- **Running it changes what your privacy policy should say.** Typewell's own
  `privacy.html` and `terms.html` handle this by themselves — they carry both
  accounts of the sign-in and the build shows the one matching your deployment.

## The settings the worker itself reads

For anyone porting this somewhere other than Cloudflare — it is ordinary
`fetch`-based JavaScript and depends on nothing Cloudflare-specific:

| Name | Required | Meaning |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | public |
| `GOOGLE_CLIENT_SECRET` | yes | never expose |
| `ALLOWED_ORIGIN` | yes | the only site allowed to use it, and the only place tokens are delivered |
| `REDIRECT_URI` | no | defaults to the worker's own `/callback`; set it only if something in front rewrites the host |

With a required one missing, the worker answers `500 not_configured` and names
it, rather than sending an empty value to Google and letting you hunt for the
bug in the browser.

## Checking it

```bash
node server/test.mjs
```

31 checks, plain Node, no browser and no network — Google is stubbed. It runs in
CI before every deploy, so a red check stops the helper reaching the internet
rather than reporting it once it is already there.

## Turning it off

Delete the `AUTH_ENDPOINT` variable and re-run the Pages deploy. Typewell goes
straight back to the hourly sign-in with no other change, and the privacy pages
follow it. Delete the worker from the Cloudflare dashboard afterwards at your
leisure.
