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

This folder is that server. It is about 120 lines. It holds the password, swaps
it for the long-lived pass, and does nothing else. **It never sees a note.**

If you do not deploy it, Typewell works exactly as it does today.

## Before you start: check one setting, or none of this will help

In [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
Services** → **OAuth consent screen**, look at **Publishing status**.

If it says **Testing**, Google throws away every permission after **7 days**, no
matter what you build. Press **Publish app** so it reads **In production**.

This is free and instant. Typewell only asks for the `drive.file` scope, which
Google counts as non-sensitive, so **no app review is needed**.

> If Drive currently logs you out every few days, this setting is almost
> certainly the cause — not the missing server. Fix it first and see whether the
> problem goes away on its own.

## Setup — four steps

### 1. Get a client secret

Google Cloud Console → **Credentials** → your OAuth **Web application** client.
The **Client secret** is on that page. If you have never used it, it is there
waiting.

### 2. Deploy the worker

[Cloudflare Workers](https://workers.cloudflare.com/) has a free tier that is
far more than this will ever need (100,000 requests a day; this uses roughly
one per hour per person).

```bash
cd server
npx wrangler deploy
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Then edit `wrangler.toml` and put in your real `GOOGLE_CLIENT_ID`,
`ALLOWED_ORIGIN` (your site), and `REDIRECT_URI` (the address wrangler printed,
with `/callback` on the end). Deploy once more.

### 3. Tell Google the new address

Back in **Credentials** → your OAuth client → **Authorized redirect URIs** →
add exactly the `REDIRECT_URI` from step 2.

Leave **Authorized JavaScript origins** as it was.

### 4. Tell Typewell the new address

Either edit the `CONFIG` block at the top of `index.html`:

```js
const AUTH_ENDPOINT_RAW = "https://typewell-auth.your-name.workers.dev";
```

…or, if you deploy with the GitHub Actions workflow, set a repository variable
named `AUTH_ENDPOINT` to that address and leave `index.html` alone.

Note there is **no trailing slash**.

## What changes once it is on

- **Connect** asks Google for permission once. After that, renewal is silent
  and forever — no window, no click.
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
  a leak — cashing in a pass you already stole is something Google would let
  them do anyway. The worker adds no new way to *get* one.
- **The client secret only ever exists inside the worker.** It is set with
  `wrangler secret put`, never written into a file, and never sent to a browser.

## Turning it off

Delete `AUTH_ENDPOINT` from the config (or the repository variable) and
redeploy. Typewell goes straight back to the hourly sign-in with no other
change. You can delete the worker afterwards at your leisure.
