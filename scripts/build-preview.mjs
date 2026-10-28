import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const base = process.env.PREVIEW_BASE_PATH || "/amnaya-preview";
if (!/^\/[a-z0-9-]+$/.test(base)) throw new Error("Use a single project path such as /amnaya-preview");
await fs.mkdir(output, { recursive: true });

// Only generated deployment files change. The local app keeps its root URLs.
const prefixAttributes = source => source.replace(/((?:href|src)\^?=["'])(\/[^"']*)/g, (match, start, url) => {
  if (url.startsWith("//") || url === base || url.startsWith(`${base}/`)) return match;
  return `${start}${base}${url}`;
});
const prefixAssets = source => source.replace(/(["'`])\/?assets\//g, `$1${base}/assets/`);
let html = prefixAttributes(await fs.readFile(path.join(root, "index.html"), "utf8"));
html = html.replace('<meta name="theme-color"', '<meta name="robots" content="noindex, nofollow, noarchive">\n  <meta name="theme-color"');
await fs.writeFile(path.join(output, "index.html"), html);
await fs.writeFile(path.join(output, "404.html"), html);
await fs.writeFile(path.join(output, ".nojekyll"), "");

for (const file of ["styles.css", "storefront.css", "tokens.css", "catalog.js", "app.js", "storefront.js"]) {
  let source = await fs.readFile(path.join(root, file), "utf8");
  if (file.endsWith(".js")) source = prefixAttributes(prefixAssets(source));
  if (file === "storefront.js") {
    const routingHook = "(() => {";
    const urlHook = "const url = new URL(href, location.origin);";
    if (!source.includes(routingHook) || !source.includes(urlHook)) throw new Error("Routing hooks changed; review the static export");
    source = source.replaceAll("location.pathname", "sitePathname()");
    source = source.replace(routingHook, `${routingHook}\n  const previewBase = ${JSON.stringify(base)};\n  const sitePathname = () => {\n    const path = location.pathname;\n    return path === previewBase ? '/' : path.startsWith(previewBase + '/') ? path.slice(previewBase.length) : path;\n  };\n  const prefixSiteLinks = () => {\n    document.querySelectorAll('a[href^="/"]').forEach(link => {\n      const href = link.getAttribute('href');\n      if (!href.startsWith('//') && href !== previewBase && !href.startsWith(previewBase + '/')) link.setAttribute('href', previewBase + href);\n    });\n  };`);
    source = source.replace(urlHook, `${urlHook}\n    if (url.pathname !== previewBase && !url.pathname.startsWith(previewBase + '/')) url.pathname = previewBase + url.pathname;`);
    source = source.replace('link.getAttribute("href") === path', 'link.getAttribute("href") === previewBase + path');
    const finishRoute = 'qa(".desktop-nav a").forEach(link =>';
    source = source.replace(finishRoute, `prefixSiteLinks();\n    ${finishRoute}`);
    source = source.replace('showDepartment(target.dataset.department, target); return;', 'showDepartment(target.dataset.department, target); prefixSiteLinks(); return;');
  }
  if (file.endsWith(".js")) new vm.Script(source, { filename: file });
  await fs.writeFile(path.join(output, file), source);
}

const context = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(root, "catalog.js"), "utf8"), context);
const routes = ["/", "/gifting", "/your-edit", "/journal",
  ...context.window.AMNAYA_CATALOG.map(piece => `/products/${piece.id}`),
  ...context.window.AMNAYA_JOURNAL.map(article => `/journal/${article.slug}`),
  ...["all", "new-in", "everyday", "saris", "occasion", "objects", "island-edit"].map(slug => `/collections/${slug}`),
  ...["our-story", "craft", "contact", "how-to-order", "fit", "care", "delivery", "privacy", "faq"].map(slug => `/pages/${slug}`)];
for (const route of routes.filter(route => route !== "/")) {
  const directory = path.join(output, route.slice(1));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "index.html"), html);
}

// Publish only used assets. Keep private working notes, email drafts and
// redundant campaign originals outside the web output.
const copy = async relative => {
  const target = path.join(output, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(root, relative), target);
};
for (const entry of await fs.readdir(path.join(root, "assets/images"))) {
  if (entry.endsWith(".webp")) await copy(`assets/images/${entry}`);
}
for (const entry of await fs.readdir(path.join(root, "assets/fonts"))) {
  if (entry.endsWith(".ttf") || entry.endsWith("OFL.txt")) await copy(`assets/fonts/${entry}`);
}
for (const relative of ["assets/brand/wordmark.png", "assets/brand/heritage-logo.png", "assets/brand/originals/Untitled Design 6.png"]) await copy(relative);
console.log(JSON.stringify({ output, base, routes: routes.length, searchIndexing: false }));
