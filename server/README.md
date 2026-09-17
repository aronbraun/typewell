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

This folder is that server. It is one file, about 130 lines. It holds the
password, swaps it for the long-lived pass, and does nothing else.
**It never sees a note.**

If you do not deploy it, Typewell works exactly as it does today. Forks get the
serverless behaviour automatically — nothing here runs unless you switch it on.

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

## What you are about to do

Copy one file into Cloudflare's website, type three settings next to it, and
tell Google the new address. No software to install, no command line, no tokens
handed to anything. About ten minutes.

```
your browser ──once an hour──▶ the worker ──▶ Google's token endpoint
```

Your notes are not on that diagram, and that is not an omission. They go from
your browser straight to Google's Drive API and never touch the worker.

The examples below use **typewell.net**. Swap in your own site wherever you see
it.

---

## Step 1 — Put the file on Cloudflare

You need a free Cloudflare account. The free Workers plan allows 100,000
requests a day; this uses roughly one per hour per person, so you will not get
near it.

1. Go to the Cloudflare dashboard → **Workers & Pages** → **Create
   application** → **Workers** → **Create Worker**. If you are offered
   templates, take **Hello World** — you are going to replace the code anyway.
2. Name it `typewell-auth` and press **Deploy**. It now exists and does
   nothing useful.
3. Press **Edit code** (in some screens the button still reads *Quick edit*).
4. Delete everything in the editor. Open
   [`auth-worker.js`](auth-worker.js) from this folder, copy the whole file,
   paste it in.
5. Press **Deploy**.

It is now live and will answer `500 not_configured`, because you have not told
it anything yet. That is correct — the next steps are what it is waiting for.

## Step 2 — Decide its address

Cloudflare has already given it a free one that looks like:

```
https://typewell-auth.YOUR-NAME.workers.dev
```

**That is a perfectly good address and you can stop here.** Write it down and
skip to step 3.

**If you would rather it sat on your own domain** — for example
`https://auth.typewell.net` — and your domain is already in Cloudflare:

1. On the Worker → **Settings** → **Domains & Routes** → **Add** → **Custom
   Domain**.
2. Type `auth.typewell.net` and press **Add Custom Domain**.

Cloudflare makes the DNS record and the certificate itself. Two things it will
refuse: a name that already has a CNAME record pointing somewhere else, and a
domain that is not in your Cloudflare account.

Whichever you picked, that address is what the rest of this page calls **the
worker's address**.

## Step 3 — The two values from Google

This is the whole Google side. Two values out, one address in. Nothing else
changes: same project, same client, same single `drive.file` scope, no review,
no new permissions.

Go to Google Cloud Console → **APIs & Services → Credentials** → your OAuth
**Web application** client.

- **Client ID** — you already have this one; it is the value Typewell's page
  ships. It is public by design.
- **Client secret** — on the same page. **This is the only real secret in the
  whole project.** It goes into Cloudflare and nowhere else. Never into the
  repository, never into `index.html`, never into a chat message.

While you are on that page, add the callback address under **Authorized
redirect URIs**:

```
https://auth.typewell.net/callback
```

That is the worker's address from step 2 with `/callback` on the end. Leave
*Authorized JavaScript origins* alone — it already lists your site and still
needs to.

## Step 4 — The three settings in Cloudflare

On the Worker → **Settings** → **Variables and Secrets** → **Add**.

| Name | Type | Value, using typewell.net as the example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Text | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Secret** | the client secret from step 3 |
| `ALLOWED_ORIGIN` | Text | `https://typewell.net` |

Press **Deploy** when you have added all three, or they do not take effect.

**Get the type right on the middle one.** A *Text* variable is stored in the
clear and shown back to you in the dashboard; a *Secret* is hidden the moment
you save it. The client **ID** is public and Text is honest for it. The client
**secret** is not.

`ALLOWED_ORIGIN` is not decoration — it is the security boundary of the whole
helper. It decides which site is allowed to use the worker and where tokens may
be delivered. Write it exactly: `https://`, the bare host, **no trailing
slash**, no path.

There is a fourth setting, `REDIRECT_URI`, and you almost certainly do not need
it. The worker works out its own callback address. Set it only if something in
front of the worker rewrites the host.

Now open the worker's address in a browser. `404 Not found` means it is
configured and running. If it still says `not_configured`, the answer names the
setting you missed.

## Step 5 — Tell Typewell the address

One line, at the top of the `<script>` in `index.html`:

```js
const AUTH_ENDPOINT_RAW = "https://auth.typewell.net";
```

No trailing slash, and no `/callback` — the app adds the paths it needs.

If you deploy through this repository's GitHub Actions workflow instead, leave
the `__AUTH_ENDPOINT__` placeholder alone and set a repository variable named
`AUTH_ENDPOINT` to the same value, under **Settings → Secrets and variables →
Actions**. The build fills it in. That variable is the only Typewell setting
that lives in GitHub, and it is not a secret — it is a public address.

Until this step is done, the app stays serverless no matter what else you have
built. That is deliberate: deploying the helper and switching it on are
separate decisions.

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
- **The client secret is only ever inside Cloudflare.** It is not in this
  repository, never printed in a log, and never sent to a browser.
- **The worker keeps no database** and stores nothing between requests.
  Cloudflare, as the infrastructure provider, may log requests.
- **Running it changes what your privacy policy should say.** Typewell's own
  `privacy.html` and `terms.html` handle this by themselves — they carry both
  accounts of the sign-in and the build shows the one matching your deployment.

## The settings the worker reads

For anyone porting this somewhere other than Cloudflare — it is ordinary
`fetch`-based JavaScript and depends on nothing Cloudflare-specific, so it also
runs on Vercel, Netlify, Deno Deploy or a small Node server:

| Name | Required | Meaning |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | public |
| `GOOGLE_CLIENT_SECRET` | yes | never expose |
| `ALLOWED_ORIGIN` | yes | the only site allowed to use it, and the only place tokens are delivered |
| `REDIRECT_URI` | no | defaults to the worker's own `/callback`; set it only if something in front rewrites the host |

With a required one missing, the worker answers `500 not_configured` and names
it, rather than sending an empty value to Google and letting you hunt for the
bug in the browser.

## If you prefer the command line

Everything above can be done from a terminal instead. `wrangler.toml` in this
folder is already set up for it:

```bash
cd server
npx wrangler@4 deploy \
  --var "GOOGLE_CLIENT_ID:123-abc.apps.googleusercontent.com" \
  --var "ALLOWED_ORIGIN:https://typewell.net"
npx wrangler@4 secret put GOOGLE_CLIENT_SECRET
```

Then steps 2, 3 and 5 exactly as above. Note that a `wrangler deploy` replaces
the variables with the ones on that command line, so pass them every time.

## Checking it

```bash
node server/test.mjs
```

31 checks, plain Node, no browser and no network — Google is stubbed. CI runs
it on every push, so a broken helper cannot slip in unnoticed.

## Turning it off

Clear `AUTH_ENDPOINT_RAW` (or delete the `AUTH_ENDPOINT` variable) and deploy
the site. Typewell goes straight back to the hourly sign-in with no other
change, and the privacy pages follow it. Delete the Worker from the Cloudflare
dashboard afterwards at your leisure.
