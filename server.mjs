import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2" };
const entries = new Set(["/index.html", "/styles.css", "/tokens.css", "/app.js", "/catalog.js", "/storefront.js", "/storefront.css"]);
const appRoute = /^\/(?:collections\/[a-z0-9-]+|products\/[a-z0-9-]+|journal(?:\/[a-z0-9-]+)?|gifting|pages\/[a-z0-9-]+|your-edit)\/?$/;
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/" || appRoute.test(pathname)) pathname = "/index.html";
    if (!entries.has(pathname) && !pathname.startsWith("/assets/")) { res.writeHead(404); res.end("Not found"); return; }
    if (pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").some(segment => segment === "." || segment === "..")) throw new Error("Invalid path");
    const target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(`${root}${path.sep}`) && !target.startsWith(root.endsWith(path.sep) ? root : `${root}${path.sep}`)) throw new Error("Invalid path");
    const info = await stat(target);
    if (!info.isFile()) { res.writeHead(404); res.end("Not found"); return; }
    const bytes = await readFile(target);
    res.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream", "Content-Length": bytes.length, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 400); res.end(error.code === "ENOENT" ? "Not found" : "Bad request");
  }
});
server.on("error", error => { console.error(`Amnaya preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Amnaya is ready at http://localhost:${port}`));
