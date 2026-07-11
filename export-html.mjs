/**
 * Static HTML snapshot exporter (one-off tool, not part of the app).
 *
 * Logs into the running dev server as the demo receiver, fetches the main
 * screens, inlines the compiled CSS and fonts, strips scripts, rewrites
 * internal links, and writes standalone .html files that open from disk.
 * Interactive behavior (forms, charts, navigation guards) is not included
 * — these are visual snapshots.
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = "D:/My code/sendyurt-html";
const LOCALE = "en";

const PAGES = [
  { route: `/${LOCALE}`, file: "index.html", auth: false },
  { route: `/${LOCALE}/login`, file: "login.html", auth: false },
  { route: `/${LOCALE}/register`, file: "register.html", auth: false },
  { route: `/${LOCALE}/dashboard`, file: "dashboard.html", auth: true },
  { route: `/${LOCALE}/rates?amount=400&currency=USD`, file: "rates.html", auth: true },
  { route: `/${LOCALE}/budget`, file: "budget.html", auth: true },
  { route: `/${LOCALE}/trust`, file: "trust.html", auth: true },
  { route: `/${LOCALE}/household`, file: "household.html", auth: true },
  { route: `/${LOCALE}/help`, file: "help.html", auth: true },
];

const jar = {};
const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

async function req(pathName, opts = {}) {
  const res = await fetch(BASE + pathName, {
    redirect: "manual",
    ...opts,
    headers: { cookie: cookieHeader(), ...(opts.headers ?? {}) },
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar[pair.slice(0, i).trim()] = pair.slice(i + 1);
  }
  return res;
}

async function login() {
  const csrf = (await (await req("/api/auth/csrf")).json()).csrfToken;
  const res = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: csrf,
      email: "demo.receiver@sendyurt.uz",
      password: "Demo1234",
      json: "true",
    }).toString(),
  });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
}

const cssCache = new Map();
async function inlineCss(href) {
  if (!cssCache.has(href)) {
    let css = await (await req(href)).text();
    // Embed referenced fonts as data URIs so the files work offline.
    const fontUrls = [...css.matchAll(/url\((\/_next\/static\/media\/[^)]+?\.woff2)\)/g)].map((m) => m[1]);
    for (const fontUrl of new Set(fontUrls)) {
      const buf = Buffer.from(await (await req(fontUrl)).arrayBuffer());
      css = css.replaceAll(`url(${fontUrl})`, `url(data:font/woff2;base64,${buf.toString("base64")})`);
    }
    cssCache.set(href, css);
  }
  return cssCache.get(href);
}

function rewriteLinks(html) {
  for (const p of PAGES) {
    const bare = p.route.split("?")[0];
    html = html.replaceAll(`href="${p.route}"`, `href="${p.file}"`);
    html = html.replaceAll(`href="${bare}"`, `href="${p.file}"`);
  }
  // Anything else app-internal becomes inert.
  html = html.replace(/href="\/(?!http)[^"]*"/g, 'href="#"');
  return html;
}

async function exportPage({ route, file }) {
  const res = await req(route);
  if (res.status !== 200) throw new Error(`${route} -> ${res.status}`);
  let html = await res.text();

  // Inline every stylesheet.
  const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>(?:<\/link>)?/g)];
  for (const [tag, href] of links) {
    const css = await inlineCss(href.split("?")[0] + (href.includes("?") ? "?" + href.split("?")[1] : ""));
    html = html.replace(tag, `<style>${css}</style>`);
  }

  // Static snapshot: drop scripts and preload hints.
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
  html = html.replace(/<link[^>]+rel="preload"[^>]*>/g, "");

  html = rewriteLinks(html);
  html =
    `<!-- Static snapshot of SendYurt (${route}) exported for offline viewing.\n` +
    `     Interactive features require the real app: see README.md -->\n` + html;

  await writeFile(path.join(OUT, file), html, "utf8");
  console.log(`exported ${route} -> ${file}`);
}

await mkdir(OUT, { recursive: true });
// Public pages first — once logged in, the middleware bounces sessions
// away from the login/register pages.
for (const page of PAGES.filter((p) => !p.auth)) await exportPage(page);
await login();
for (const page of PAGES.filter((p) => p.auth)) await exportPage(page);
console.log("done ->", OUT);
