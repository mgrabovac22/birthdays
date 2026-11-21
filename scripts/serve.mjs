import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.WISHCRAFT_PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2",
};

await readFile(resolve(root, "index.html")).catch(() => {
  console.error("Run npm run build before starting the preview.");
  process.exit(1);
});

createServer(async (request, response) => {
  const send = (status, headers, body) => response.writeHead(status, headers).end(request.method === "HEAD" ? undefined : body);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!["GET", "HEAD"].includes(request.method)) return send(405, { ...headers, Allow: "GET, HEAD" }, "Method not allowed");
  try {
    const url = new URL(request.url, "http://localhost");
    const path = resolve(root, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith("/") ? "index.html" : ""}`);
    if (!path.startsWith(`${root}${sep}`) || !types[extname(path)]) return send(404, headers, "Not found");
    const body = await readFile(path);
    return send(200, { ...headers, "Content-Type": types[extname(path)], "Content-Length": body.length }, body);
  } catch {
    return send(404, headers, "Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Wishcraft preview: http://127.0.0.1:${port}/`);
});
