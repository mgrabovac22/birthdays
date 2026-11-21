import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
if (dirname(dist) !== resolve(root)) throw new Error("Invalid build output directory.");
await rm(dist, { recursive: true, force: true });
await Promise.all(["assets", "js", "licenses"].map((folder) => mkdir(join(dist, folder), { recursive: true })));

const sources = [
  "index.html", "styles.css", "assets/star.png", "assets/celestial-envelope.webp",
  "js/app.js", "js/birthday-screens.js", "js/calendar.js", "js/gift-game.js", "js/playground.js", "js/themes.js",
];
const fontSources = {
  "@fontsource-variable/dm-sans": ["dm-sans-latin-wght-normal.woff2", "dm-sans-latin-ext-wght-normal.woff2"],
  "@fontsource/dm-serif-display": [
    "dm-serif-display-latin-400-normal.woff2",
    "dm-serif-display-latin-ext-400-normal.woff2",
    "dm-serif-display-latin-400-italic.woff2",
    "dm-serif-display-latin-ext-400-italic.woff2",
  ],
};
await Promise.all([
  ...sources.map((file) => copyFile(join(root, "site", file), join(dist, file))),
  ...Object.entries(fontSources).flatMap(([pkg, files]) => [
    ...files.map((file) => copyFile(join(root, "node_modules", pkg, "files", file), join(dist, "assets", file))),
    copyFile(join(root, "node_modules", pkg, "LICENSE"), join(dist, "licenses", `${pkg.split("/").at(-1)}.txt`)),
  ]),
  copyFile(join(root, "node_modules/three/LICENSE"), join(dist, "licenses/three.txt")),
  writeFile(join(dist, ".nojekyll"), ""),
  build({
    absWorkingDir: root,
    entryPoints: ["site/js/scene.js"],
    outfile: join(dist, "js/scene.js"),
    format: "esm",
    target: "es2022",
    bundle: true,
    minify: true,
    legalComments: "none",
  }),
]);
console.log("Static site built in dist/.");
