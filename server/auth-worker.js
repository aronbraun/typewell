/* Typewell sign-in helper — the only piece of Typewell that runs on a server.
 *
 * WHY IT EXISTS. Google hands a browser an access token that dies after about
 * an hour, and it will not hand a browser the long-lived "refresh token" that
 * would let the app renew quietly. Redeeming a refresh token needs the OAuth
 * client SECRET, and a secret shipped inside a public HTML file is not a
 * secret. So the exchange has to happen somewhere the secret can actually stay
 * hidden. That somewhere is this file.
 *
 * WHAT IT IS NOT. It never sees a note, a title, or a byte of anyone's
 * writing. Notes go straight from the browser to Google's Drive API and never
 * pass through here. All this does is swap codes for tokens.
 *
 * ENTIRELY OPTIONAL. Typewell works with no server at all — that is the
 * default. Deploy this only if you want Drive backups to stop asking you to
 * sign in again every hour.
 *
 * ROUTES
 *   GET  /callback   Google sends the browser here after you approve. Swaps
 *                    the code for tokens and hands them to the app window.
 *   POST /refresh    {refresh_token} -> {access_token, expires_in}
 *   POST /revoke     {refresh_token} -> tells Google to forget it
 *
 * SETUP: see server/README.md. Four settings, one deploy, done.
 */

const GOOGLE_TOKEN  = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    /* Refuse anything that names an origin we do not serve. CORS already stops
       a page on another site from READING our answer, but it lets the request
       through first; this turns it away at the door. It cannot stop a request
       with no Origin header at all (curl, a script) — see the note on /refresh
       for why that is not the hole it looks like. */
    const from = req.headers.get("Origin");
    if (from && from !== env.ALLOWED_ORIGIN && url.pathname !== "/callback")
      return json({ error: "origin_not_allowed" }, 403, env);

    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), env);
    if (url.pathname === "/callback" && req.method === "GET")  return callback(url, env);
    if (url.pathname === "/refresh"  && req.method === "POST") return refresh(req, env);
    if (url.pathname === "/revoke"   && req.method === "POST") return revoke(req, env);
    return new Response("Not found", { status: 404 });
  },
};

/* ---------- Google redirects the sign-in window here ---------- */

async function callback(url, env) {
  const state = url.searchParams.get("state") || "";
  const err   = url.searchParams.get("error");
  const code  = url.searchParams.get("code");
  if (err || !code) return relay({ state, error: err || "no_code" }, env);

  const r = await googleToken(env, {
    grant_type: "authorization_code",
    code,
    /* Google checks this matches the redirect_uri that started the flow, so
       it must be the deployed address of this worker, not a guess from the
       request — behind a proxy the two can differ. */
    redirect_uri: env.REDIRECT_URI,
  });
  if (!r.ok) return relay({ state, error: r.data.error || "exchange_failed" }, env);

  /* No refresh_token means the app was told to renew quietly and cannot. Say
     so plainly rather than handing back a token that works for one hour and
     then behaves exactly like the thing we built this to fix. */
  if (!r.data.refresh_token) return relay({ state, error: "no_refresh_token" }, env);

  return relay({
    state,
    access_token:  r.data.access_token,
    expires_in:    r.data.expires_in,
    refresh_token: r.data.refresh_token,
  }, env);
}

/* A page whose whole job is to hand the tokens to the window that opened it
   and then shut. postMessage is aimed at exactly one origin, so nothing else
   can be listening. */
function relay(payload, env) {
  /* "<" is escaped so no value can end the script tag early, whatever Google
     put in it. The result is still a valid JavaScript object literal. */
  const data = JSON.stringify(payload).replace(/</g, "\\u003c");
  const body = `<!doctype html>
<meta charset="utf-8"><title>Signing in…</title>
<body style="font:15px/1.5 system-ui,sans-serif;padding:2rem;color:#444">
Signed in. You can close this window.
<script>
(function(){
  try{ if(window.opener) window.opener.postMessage(${data}, ${JSON.stringify(env.ALLOWED_ORIGIN)}); }catch(e){}
  window.close();
})();
</script>`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      /* it carries tokens: nothing may keep a copy, and nothing may frame it */
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/* ---------- the quiet renewal, which is the entire point ---------- */

async function refresh(req, env) {
  const b = await body(req);
  if (typeof b?.refresh_token !== "string") return json({ error: "bad_request" }, 400, env);

  const r = await googleToken(env, { grant_type: "refresh_token", refresh_token: b.refresh_token });
  /* Only the error CODE goes back, never Google's description. The app just
     needs to know "this one is dead, ask the human again". */
  if (!r.ok) return json({ error: r.data.error || "refresh_failed" }, 400, env);

  /* The refresh token itself is never echoed back. The caller already has it,
     and a reply that repeats a long-lived credential is one more place it can
     be caught. */
  return json({ access_token: r.data.access_token, expires_in: r.data.expires_in }, 200, env);
}

async function revoke(req, env) {
  const b = await body(req);
  if (typeof b?.refresh_token === "string") {
    await fetch(GOOGLE_REVOKE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: b.refresh_token }),
    }).catch(() => {});   /* already dead is the outcome we wanted anyway */
  }
  return json({ ok: true }, 200, env);
}

/* ---------- plumbing ---------- */

/* The one place the client secret is used. It never leaves this function. */
async function googleToken(env, params) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params,
    }),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

async function body(req) { try { return await req.json(); } catch { return null; } }

function json(obj, status, env) {
  return cors(new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  }), env);
}

function cors(res, env) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN);
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Max-Age", "86400");
  h.set("Vary", "Origin");
  return new Response(res.body, { status: res.status, headers: h });
}
