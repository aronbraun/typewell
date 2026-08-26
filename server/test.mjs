/* Checks for the sign-in helper in auth-worker.js.
 *
 * It is the only server Typewell has, it handles the one real secret in the
 * whole project, and it cannot be reached by tests/suite.js — that suite drives
 * the app in a browser, and this runs on Cloudflare. So it gets its own runner.
 *
 *   node server/test.mjs
 *
 * No Chrome and no network: Google is a stub, so what is actually being checked
 * is what the worker sends, what it sends back, and what it refuses. Each check
 * is named after the bug it would catch, which is why they read like
 * accusations when they pass.
 */
import worker from "./auth-worker.js";

const env = {
  GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "SUPER-SECRET",
  ALLOWED_ORIGIN: "https://typewell.net",
  REDIRECT_URI: "https://auth.example.workers.dev/callback",
};
let out = [], fails = 0;
const ok = (c, m) => { if (!c) { fails++; out.push("  FAIL " + m); } else out.push("  ok   " + m); };

let googleCalls = [], googleReply = null;
globalThis.fetch = async (url, opts) => {
  googleCalls.push([String(url), Object.fromEntries(new URLSearchParams(opts.body))]);
  const r = googleReply;
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
};
const call = (url, init) => worker.fetch(new Request(url, init), env);
const post = (path, body, origin = "https://typewell.net") =>
  call("https://auth.example.workers.dev" + path,
    { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });

/* 1. preflight */
let r = await call("https://auth.example.workers.dev/refresh", { method: "OPTIONS", headers: { Origin: "https://typewell.net" } });
ok(r.status === 204, "preflight answers 204");
ok(r.headers.get("Access-Control-Allow-Origin") === "https://typewell.net", "preflight names our origin only");

/* 2. another site is turned away */
r = await post("/refresh", { refresh_token: "x" }, "https://evil.example");
ok(r.status === 403, "a request from another origin is refused (got " + r.status + ")");

/* 3. the happy renewal */
googleCalls = []; googleReply = { status: 200, body: { access_token: "AT", expires_in: 3599, refresh_token: "SHOULD-NOT-COME-BACK" } };
r = await post("/refresh", { refresh_token: "1//pass" });
let j = await r.json();
ok(r.status === 200, "renewal answers 200");
ok(j.access_token === "AT" && j.expires_in === 3599, "renewal returns the new hour");
ok(!("refresh_token" in j), "the lasting pass was echoed back to the browser");
ok(googleCalls[0][1].client_secret === "SUPER-SECRET", "the secret was not sent to Google");
ok(googleCalls[0][1].grant_type === "refresh_token", "wrong grant_type");
ok(r.headers.get("Cache-Control") === "no-store", "a token reply is cacheable");

/* 4. a dead pass */
googleReply = { status: 400, body: { error: "invalid_grant", error_description: "Token has been expired or revoked." } };
r = await post("/refresh", { refresh_token: "1//dead" });
j = await r.json();
ok(r.status === 400 && j.error === "invalid_grant", "a dead pass is reported as such");
ok(!("error_description" in j), "Google's description leaked through");

/* 5. rubbish in */
r = await post("/refresh", { nope: 1 });
ok(r.status === 400, "a body with no pass is refused");
r = await call("https://auth.example.workers.dev/refresh", { method: "POST", headers: { Origin: "https://typewell.net" }, body: "not json" });
ok(r.status === 400, "a body that is not JSON is refused");

/* 6. the callback exchange */
googleCalls = []; googleReply = { status: 200, body: { access_token: "AT2", expires_in: 3600, refresh_token: "1//new" } };
r = await call("https://auth.example.workers.dev/callback?code=abc&state=st1");
let html = await r.text();
ok(googleCalls[0][1].grant_type === "authorization_code" && googleCalls[0][1].code === "abc", "the code was not exchanged");
ok(googleCalls[0][1].redirect_uri === env.REDIRECT_URI, "redirect_uri did not match the registered one");
ok(html.includes('"https://typewell.net"'), "postMessage is not aimed at our origin");
ok(html.includes('"1//new"') && html.includes('"AT2"'), "the tokens are not in the reply");
ok(r.headers.get("X-Frame-Options") === "DENY" && r.headers.get("Cache-Control") === "no-store", "the token page is framable or cacheable");

/* 7. consent given but no lasting pass */
googleReply = { status: 200, body: { access_token: "AT3", expires_in: 3600 } };
r = await call("https://auth.example.workers.dev/callback?code=abc&state=st1");
html = await r.text();
ok(html.includes("no_refresh_token"), "a sign-in with no lasting pass was passed off as a success");
ok(!html.includes("AT3"), "handed back an hourly token that will fail in an hour");

/* 8. the user pressed Cancel */
r = await call("https://auth.example.workers.dev/callback?error=access_denied&state=st1");
html = await r.text();
ok(html.includes("access_denied"), "a refusal was not relayed");

/* 9. nothing can break out of the script tag */
googleReply = { status: 200, body: { access_token: "A", expires_in: 1, refresh_token: "B" } };
r = await call("https://auth.example.workers.dev/callback?code=c&state=" + encodeURIComponent('</script><img src=x onerror=alert(1)>'));
html = await r.text();
ok(!html.includes("</script><img"), "a crafted state value closed the script tag");
ok(html.includes("\\u003c/script"), "the '<' was not escaped");

/* 10. revoke */
googleCalls = []; googleReply = { status: 200, body: {} };
r = await post("/revoke", { refresh_token: "1//bye" });
ok(r.status === 200, "revoke answers 200");
ok(googleCalls[0][0].includes("revoke") && googleCalls[0][1].token === "1//bye", "Google was not told to forget the pass");

/* 11. unknown route */
r = await call("https://auth.example.workers.dev/", { headers: { Origin: "https://typewell.net" } });
ok(r.status === 404, "an unknown route answers 404");

console.log(out.join("\n"));
console.log(`\n${out.length - fails}/${out.length} passing`);
process.exit(fails ? 1 : 0);
