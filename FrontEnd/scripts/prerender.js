// Prerenders the public pages of the built app into static HTML.
//
// Runs automatically after `npm run build` (the "postbuild" script). It opens
// each page in headless Chrome, waits for its content (Sanity blogs,
// resources, …) to load, and saves the rendered markup to
// build/<route>/index.html, so search engines and link previews get real
// content instead of an empty <div id="root">. React still takes over in the
// browser exactly as before.
//
// Pages are loaded as https://abavirtual.net/… but every request for the site
// itself is answered from the local build folder, so nothing touches the live
// server. That origin keeps Sanity's CORS happy. /api calls and analytics are
// blocked, so pages render as a signed-out visitor sees them.
//
// Also writes build/app.html (the untouched shell, for nginx's fallback on
// routes that aren't prerendered, like /portal) and build/sitemap.xml.
//
// Set SKIP_PRERENDER=1 to skip it.

const fs = require("fs");
const path = require("path");

const ORIGIN = "https://abavirtual.net";
const BUILD = path.resolve(__dirname, "..", "build");
const CONCURRENCY = 4;

// Where crawling starts; every same-site link found on these is followed.
const SEEDS = [
  "/",
  "/about",
  "/blogs",
  "/resources",
  "/games",
  "/contact",
  "/supervision-plans",
  "/privacy-policy",
  "/refund-policy",
  "/terms-and-conditions",
  "/service-delivery-policy",
];

// Private, signed-in-only, or canvas pages: left to the client as before.
const EXCLUDE = [
  /^\/(portal|admin|checkout|account|login|signup|success|error)(\/|$)/,
  /^\/resources\/[^/]+\/watch$/,
  /^\/games\/domain\/\d+\/\d+$/,
  /\.[a-z0-9]+$/i, // files, not pages
];

// Third parties that would record fake visits or aren't needed for markup.
const BLOCKED_HOSTS = [
  "googletagmanager.com",
  "google-analytics.com",
  "facebook.net",
  "facebook.com",
  "paypal.com",
  "api.country.is",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function normalize(pathname) {
  const p = pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

function isPage(pathname) {
  return !EXCLUDE.some((re) => re.test(pathname));
}

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Answers a request for the site from the build folder; unknown paths get
// the app shell, as nginx's SPA fallback would.
function serveLocal(req, pathname, shell) {
  const file = path.resolve(BUILD, "." + decodeURIComponent(pathname));
  if (
    file.startsWith(BUILD) &&
    fs.existsSync(file) &&
    fs.statSync(file).isFile()
  ) {
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    return req.respond({ status: 200, contentType: type, body: fs.readFileSync(file) });
  }
  return req.respond({ status: 200, contentType: MIME[".html"], body: shell });
}

// Wraps the rendered page into the original shell: only the page markup,
// its head tags and the runtime (MUI/emotion) CSS are carried over, so
// scripts that ran during the snapshot (GTM, pixel) don't get baked in.
function toHtml(shell, snap) {
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(snap.title)}</title>`)
    .replace(
      /<meta (?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/g,
      ""
    )
    .replace(
      "</head>",
      `${snap.headTags.join("")}<style data-prerendered>${snap.css}</style></head>`
    )
    .replace('<div id="root"></div>', `<div id="root">${snap.root}</div>`);
}

async function snapshot(page, route) {
  await page.goto(ORIGIN + route, { waitUntil: "networkidle0", timeout: 60000 });

  // Scroll through once so scroll-triggered (GSAP) sections reveal their
  // content before the snapshot, then return to the top.
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await wait(120);
    }
    window.scrollTo(0, 0);
    await wait(800);
  });

  return page.evaluate(() => {
    // Toasts are transient (e.g. "Failed to fetch comment", since /api is
    // blocked here); they don't belong in the saved page.
    document.querySelectorAll(".Toastify").forEach((el) => el.replaceChildren());

    const css = [...document.styleSheets]
      .filter((s) => s.ownerNode && s.ownerNode.tagName === "STYLE")
      .map((s) => {
        try {
          return [...s.cssRules].map((r) => r.cssText).join("");
        } catch {
          return "";
        }
      })
      .join("");
    const headTags = [
      ...document.head.querySelectorAll(
        'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]'
      ),
    ].map((el) => el.outerHTML);
    const robots = document.head.querySelector('meta[name="robots"]');
    return {
      finalPath: location.pathname,
      title: document.title,
      noindex: !!robots && /noindex/.test(robots.content),
      headTags,
      css,
      root: document.getElementById("root").innerHTML,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
    };
  });
}

async function main() {
  if (process.env.SKIP_PRERENDER) {
    console.log("prerender: skipped (SKIP_PRERENDER is set)");
    return;
  }
  const indexFile = path.join(BUILD, "index.html");
  const shellFile = path.join(BUILD, "app.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error(`No build found at ${BUILD}. Run "npm run build" first.`);
  }
  // Keep the untouched shell; on a re-run index.html is already prerendered.
  if (!fs.existsSync(shellFile)) fs.copyFileSync(indexFile, shellFile);
  const shell = fs.readFileSync(shellFile, "utf8");

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: true });

  const queue = SEEDS.slice();
  const seen = new Set(queue);
  const written = [];
  const failed = [];
  const broken = [];

  async function worker() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.origin === ORIGIN) {
        if (url.pathname.startsWith("/api")) return req.abort();
        return serveLocal(req, url.pathname, shell);
      }
      if (BLOCKED_HOSTS.some((h) => url.hostname.endsWith(h))) return req.abort();
      if (req.resourceType() === "media") return req.abort();
      return req.continue();
    });

    while (queue.length) {
      const route = queue.shift();
      try {
        const snap = await snapshot(page, route);

        for (const href of snap.links) {
          const url = new URL(href);
          if (url.origin !== ORIGIN) continue;
          const next = normalize(url.pathname);
          if (!seen.has(next) && isPage(next)) {
            seen.add(next);
            queue.push(next);
          }
        }

        // Redirected (e.g. unknown policy slug) or marked noindex: skip.
        if (normalize(snap.finalPath) !== route || snap.noindex) {
          if (snap.title.startsWith("Page not found")) broken.push(route);
          continue;
        }

        const out =
          route === "/" ? indexFile : path.join(BUILD, ...route.split("/"), "index.html");
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, toHtml(shell, snap));
        written.push(route);
        console.log(`prerender: ${route}  "${snap.title}"`);
      } catch (err) {
        failed.push(route);
        console.warn(`prerender: FAILED ${route}: ${err.message}`);
      }
    }
    await page.close();
  }

  // Workers drain a shared queue that grows as links are found; start them
  // staggered so the first pages can seed it.
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
    await new Promise((r) => setTimeout(r, 4000));
  }
  await Promise.all(workers);
  // A worker that found an empty queue early may have exited while others
  // were still adding links; finish anything left.
  if (queue.length) await worker();
  await browser.close();

  written.sort();
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    written.map((r) => `  <url><loc>${ORIGIN}${r === "/" ? "/" : r}</loc></url>`).join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(BUILD, "sitemap.xml"), sitemap);

  console.log(
    `prerender: ${written.length} pages written, ${failed.length} failed; sitemap.xml updated`
  );
  if (broken.length) {
    console.warn(`prerender: links to pages that don't exist: ${broken.join(", ")}`);
  }
  if (!written.includes("/")) process.exit(1);
}

main().catch((err) => {
  console.error("prerender:", err);
  process.exit(1);
});
