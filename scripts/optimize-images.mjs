// Downsizes oversized raster images under public/ to web-appropriate
// dimensions, strips EXIF/metadata, and re-encodes at a sane quality --
// keeping the same file path and format so nothing that references them
// needs to change.
//
// Why this exists: files in public/ are copied verbatim into every Vercel
// deployment (production AND every preview), so a single 10 MB camera
// export gets multiplied across dozens of retained deployments and eats
// the Hobby plan's 10 GB deployment-storage allowance. next/image shrinks
// what visitors download but not what's stored -- the source has to be
// small too.
//
//   node scripts/optimize-images.mjs           # rewrite oversized files in place
//   node scripts/optimize-images.mjs --check   # exit 1 if any file is oversized (CI)

import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { join, extname } from "node:path";
// sharp ships as a dependency of next (it powers next/image locally), so it's
// always present after `npm ci`. If Next ever drops it: `npm i -D sharp`.
import sharp from "sharp";

const ROOT = "public";
const CHECK_ONLY = process.argv.includes("--check");

// Longest-edge cap in px. Headshots render small; everything else can be a
// full-bleed hero, so it gets the larger budget. 2000px still looks crisp
// on a retina display at our max content width (~1100px container).
const rules = [
  { match: (p) => p.includes("/headshots/"), maxEdge: 800, maxBytes: 120 * 1024 },
  { match: () => true, maxEdge: 2000, maxBytes: 500 * 1024 },
];

const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (exts.has(extname(entry.name).toLowerCase())) yield path;
  }
}

function ruleFor(path) {
  const posix = path.split("\\").join("/");
  return rules.find((r) => r.match(posix));
}

function encoder(pipeline, ext) {
  if (ext === ".png") return pipeline.png({ compressionLevel: 9, palette: true });
  if (ext === ".webp") return pipeline.webp({ quality: 80 });
  return pipeline.jpeg({ quality: 80, mozjpeg: true });
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
let oversized = 0;
let rewrote = 0;

for await (const path of walk(ROOT)) {
  const { maxEdge, maxBytes } = ruleFor(path);
  const buf = await readFile(path);
  const { width = 0, height = 0 } = await sharp(buf).metadata();
  const longEdge = Math.max(width, height);

  // 5% slack so a file already within a hair of the target isn't rewritten
  // on every run for a handful of pixels.
  if (longEdge <= maxEdge * 1.05 && buf.byteLength <= maxBytes) continue;

  oversized++;
  const ext = extname(path).toLowerCase();

  if (CHECK_ONLY) {
    console.log(`oversized: ${path}  (${longEdge}px, ${kb(buf.byteLength)})`);
    continue;
  }

  const out = await encoder(
    sharp(buf)
      .rotate() // bake in EXIF orientation before metadata is dropped
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true }),
    ext,
  ).toBuffer();

  const tmp = `${path}.tmp`;
  await writeFile(tmp, out);
  await rename(tmp, path);
  rewrote++;
  console.log(
    `${path}\n  ${longEdge}px ${kb(buf.byteLength)}  ->  ` +
      `${(await sharp(out).metadata()).width}px ${kb(out.byteLength)}`,
  );
}

if (CHECK_ONLY && oversized > 0) {
  console.error(
    `\n${oversized} oversized image(s) in ${ROOT}/. ` +
      `Run: node scripts/optimize-images.mjs`,
  );
  process.exit(1);
}

console.log(
  CHECK_ONLY
    ? `\nOK -- no oversized images in ${ROOT}/.`
    : `\nDone -- rewrote ${rewrote} file(s).`,
);
