/**
 * Stitches the exported page snapshots into a single self-contained
 * preview file for publishing as a Claude Artifact: shared CSS (deduped,
 * fonts embedded once), one <section> per screen, a tab bar in SendYurt's
 * own design language, and a theme bridge that drives the app's real
 * dark-mode remap layer from the artifact viewer's theme.
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";

const SRC = "D:/My code/sendyurt-html";
const OUT = process.argv[2] ?? "D:/My code/sendyurt-preview.html";

const PAGES = [
  ["index", "Landing"],
  ["dashboard", "Dashboard"],
  ["rates", "Rate Finder"],
  ["budget", "Budget"],
  ["trust", "Trust Score"],
  ["household", "Family"],
  ["help", "Help"],
  ["login", "Log in"],
  ["register", "Register"],
];

const styles = new Set();
let htmlClass = "";
const sections = [];

for (const [id, label] of PAGES) {
  const html = await readFile(path.join(SRC, `${id}.html`), "utf8");
  if (!htmlClass) {
    htmlClass = html.match(/<html[^>]*class="([^"]*)"/)?.[1] ?? "";
  }
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    styles.add(m[1]);
  }
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  sections.push(
    `<section class="sy-page" id="page-${id}" data-label="${label}"${id === "index" ? "" : " hidden"}>${body}</section>`,
  );
}

const tabs = PAGES.map(
  ([id, label], i) =>
    `<button type="button" class="sy-tab" role="tab" aria-selected="${i === 0}" data-page="${id}">${label}</button>`,
).join("");

const shell = `<title>SendYurt — Product Preview</title>
<style>
:root {
  --sy-bg: #faf8f3;
  --sy-chrome: rgba(255,255,255,0.94);
  --sy-line: #e4dbc6;
  --sy-ink: #26221b;
  --sy-muted: #886948;
  --sy-lapis: #2f5096;
  --sy-lapis-ink: #ffffff;
  --sy-note-bg: #f1f5fb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --sy-bg: #0f1729;
    --sy-chrome: rgba(24,34,56,0.94);
    --sy-line: #26314b;
    --sy-ink: #dce4f2;
    --sy-muted: #8fa3c4;
    --sy-lapis: #4b7cc2;
    --sy-note-bg: #182238;
  }
}
:root[data-theme="dark"] {
  --sy-bg: #0f1729;
  --sy-chrome: rgba(24,34,56,0.94);
  --sy-line: #26314b;
  --sy-ink: #dce4f2;
  --sy-muted: #8fa3c4;
  --sy-lapis: #4b7cc2;
  --sy-note-bg: #182238;
}
:root[data-theme="light"] {
  --sy-bg: #faf8f3;
  --sy-chrome: rgba(255,255,255,0.94);
  --sy-line: #e4dbc6;
  --sy-ink: #26221b;
  --sy-muted: #886948;
  --sy-lapis: #2f5096;
  --sy-note-bg: #f1f5fb;
}

body { margin: 0; background: var(--sy-bg); }

.sy-chrome {
  position: sticky; top: 0; z-index: 60;
  background: var(--sy-chrome);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--sy-line);
  font-family: var(--font-body, system-ui, sans-serif);
}
.sy-chrome-inner {
  max-width: 72rem; margin: 0 auto; padding: 0.65rem 1rem;
  display: flex; flex-direction: column; gap: 0.55rem;
}
.sy-brand { display: flex; align-items: baseline; gap: 0.55rem; flex-wrap: wrap; }
.sy-brand strong {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.05rem; color: var(--sy-ink); letter-spacing: -0.01em;
}
.sy-brand strong .accent { color: var(--sy-lapis); }
.sy-brand span { font-size: 0.72rem; color: var(--sy-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.sy-note { font-size: 0.78rem; color: var(--sy-muted); line-height: 1.45; margin: 0; }
.sy-note b { color: var(--sy-ink); font-weight: 600; }

.sy-tabs { display: flex; gap: 0.35rem; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.sy-tab {
  flex-shrink: 0; border: 1px solid var(--sy-line); background: transparent;
  color: var(--sy-muted); font: 600 0.8rem var(--font-body, system-ui, sans-serif);
  padding: 0.38rem 0.85rem; border-radius: 999px; cursor: pointer;
}
.sy-tab:hover { color: var(--sy-ink); }
.sy-tab:focus-visible { outline: 2px solid var(--sy-lapis); outline-offset: 2px; }
.sy-tab[aria-selected="true"] { background: var(--sy-lapis); border-color: var(--sy-lapis); color: var(--sy-lapis-ink); }

.sy-pages { background: var(--sy-bg); color: var(--sy-ink); }
.sy-page[hidden] { display: none !important; }
/* App headers scroll away inside the preview so the tab bar stays usable. */
.sy-page .sticky { position: static !important; }
/* Neutralize the app's own interactive-only affordances politely. */
.sy-page button { cursor: default; }
</style>

<div class="sy-chrome">
  <div class="sy-chrome-inner">
    <div class="sy-brand">
      <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" style="align-self:center"><circle cx="16" cy="4.5" r="2" fill="#de662a"/><path d="M16 7 29 18.5 H3 Z" fill="#3862b0"/><path d="M5 20 h22 v6 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 Z" fill="#2f5096"/><rect x="13.5" y="21.5" width="5" height="6.5" rx="1" fill="#e4854d"/></svg>
      <strong>Send<span class="accent">Yurt</span></strong>
      <span>Product preview</span>
    </div>
    <p class="sy-note"><b>A visual walkthrough of the real product, with live demo data.</b> Switch screens below; use the viewer's theme toggle to see night mode. Forms, charts and login run in the full app — this preview is for looking, not typing.</p>
    <div class="sy-tabs" role="tablist" aria-label="SendYurt screens">${tabs}</div>
  </div>
</div>

<div class="sy-pages ${htmlClass}" id="sy-pages">
${sections.join("\n")}
</div>

<script>
(function () {
  var pages = document.getElementById("sy-pages");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".sy-tab"));

  function show(id) {
    Array.prototype.forEach.call(document.querySelectorAll(".sy-page"), function (s) {
      s.hidden = s.id !== "page-" + id;
    });
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.page === id));
    });
    window.scrollTo({ top: 0 });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.dataset.page); });
  });

  // Links inside snapshots were rewritten to "<page>.html" — turn them
  // into tab switches; inert links do nothing.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.slice(-5) === ".html") {
      e.preventDefault();
      show(href.slice(0, -5));
    } else if (href === "#" || href === "") {
      e.preventDefault();
    }
  });

  // Theme bridge: the viewer's theme drives the app's own dark-mode
  // remap layer (scoped to a .dark ancestor in the exported CSS).
  function applyTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    var dark = explicit
      ? explicit === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    pages.classList.toggle("dark", dark);
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-theme"],
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
})();
</script>
`;

const out = shell.replace(
  "<style>\n:root {",
  `<style>\n${Array.from(styles).join("\n")}\n:root {`,
);

await writeFile(OUT, out, "utf8");
const kb = Math.round(Buffer.byteLength(out, "utf8") / 1024);
console.log(`wrote ${OUT} (${kb} KB, ${sections.length} screens, ${styles.size} style blocks)`);
