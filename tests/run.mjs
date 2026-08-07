/* Run tests/index.html in headless Chrome and exit non-zero if anything is red.
 *
 * No dependencies, on purpose: Typewell is a single HTML file with no build
 * step and no node_modules, and a test runner that drags in a package tree
 * would be the largest thing in the repo by two orders of magnitude. Node 22+
 * ships a global WebSocket, Chrome speaks the DevTools Protocol over one, and
 * that is the whole runner.
 *
 *   node tests/run.mjs                 # starts its own static server
 *   node tests/run.mjs http://host:81  # use a server that is already up
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = 8732;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function serve() {
  const s = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(req.url.split("?")[0]));
    if (path.includes("..")) { res.writeHead(403).end(); return; }
    const file = join(ROOT, path === "/" ? "index.html" : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": TYPES[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((ok) => s.listen(PORT, () => ok(s)));
}

async function which(cmds) {
  for (const c of cmds) {
    const found = await new Promise((ok) => {
      const p = spawn("which", [c], { stdio: ["ignore", "pipe", "ignore"] });
      let out = "";
      p.stdout.on("data", (d) => (out += d));
      p.on("close", (code) => ok(code === 0 ? out.trim() : null));
      p.on("error", () => ok(null));
    });
    if (found) return found;
  }
  return null;
}

/* the smallest CDP client that can do the job: send, await matching id */
function cdp(ws) {
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    const box = waiting.get(msg.id);
    if (box) { waiting.delete(msg.id); box(msg); }
  });
  return (method, params = {}) =>
    new Promise((ok) => {
      const n = ++id;
      waiting.set(n, ok);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const external = process.argv[2];
  const server = external ? null : await serve();
  const base = external || `http://127.0.0.1:${PORT}`;

  const bin = process.env.CHROME_PATH ||
    await which(["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"]);
  if (!bin) {
    console.error("No Chrome found. Install one, or set CHROME_PATH.");
    process.exit(2);
  }

  const port = 9333;
  const chrome = spawn(bin, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900",
    "--user-data-dir=" + join(process.env.TMPDIR || "/tmp", "typewell-test-profile"),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let chromeErr = "";
  chrome.stderr.on("data", (d) => (chromeErr += d));

  /* wait for the debugging endpoint, checking for it rather than guessing a delay */
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      target = list.find((t) => t.type === "page");
    } catch { await sleep(100); }
  }
  if (!target) {
    console.error("Chrome never opened its debugging port.\n" + chromeErr);
    chrome.kill(); server?.close();
    process.exit(2);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.addEventListener("open", ok); ws.addEventListener("error", bad); });
  const send = cdp(ws);

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: `${base}/tests/index.html` });

  /* poll for the results the page hangs on window, rather than sleeping blind */
  let results = null;
  for (let i = 0; i < 200 && !results; i++) {
    await sleep(100);
    const r = await send("Runtime.evaluate", {
      expression: "JSON.stringify(window.__RESULTS__ || null)",
      returnByValue: true,
    });
    const v = r.result?.result?.value;
    if (v && v !== "null") results = JSON.parse(v);
  }

  ws.close(); chrome.kill(); server?.close();

  if (!results) {
    console.error("The suite never reported. Is tests/index.html reachable at " + base + "?");
    process.exit(2);
  }

  let failed = 0;
  for (const r of results) {
    if (r.pass) { console.log(`  ok   ${r.name}`); }
    else {
      failed++;
      console.log(`  FAIL ${r.name}`);
      console.log(String(r.error).split("\n").map((l) => "       " + l).join("\n"));
    }
  }
  console.log(`\n${results.length - failed}/${results.length} passing`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
