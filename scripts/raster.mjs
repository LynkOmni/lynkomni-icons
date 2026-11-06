#!/usr/bin/env node
// Makes the PNG / ICO files listed under "rasters" in brand/manifest.v1.json from the built SVGs.
// Needs the dev dependency "sharp" (installed by `npm install`; this step runs in CI).
// Usage: node scripts/raster.mjs   (run after scripts/build.mjs)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadConfig } from './build.mjs';

const require = createRequire(import.meta.url);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// An ICO file can hold PNG images directly. Header (6 bytes) + one 16-byte entry per image + the PNG data.
export function makeIco(pngs /* [{size, data}] */) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

export async function renderOne(sharp, svgPath, { width, height, padding = 0, background = null }) {
  const svg = readFileSync(svgPath);
  const vb = /viewBox="([^"]+)"/.exec(svg.toString('utf8'))[1].split(/\s+/).map(Number);
  const ratio = vb[3] / vb[2];
  const w = width;
  const h = height ?? Math.round(width * ratio);
  const innerW = Math.max(1, Math.round(w * (1 - 2 * padding)));
  const innerH = Math.max(1, Math.round(h * (1 - 2 * padding)));
  // The SVG has no fixed size, so ask for a sharp render at a high density, then fit it inside the padded box.
  const art = await sharp(svg, { density: 288 })
    .resize({ width: innerW, height: innerH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const bg = background
    ? { r: parseInt(background.slice(1, 3), 16), g: parseInt(background.slice(3, 5), 16), b: parseInt(background.slice(5, 7), 16), alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp({ create: { width: w, height: h, channels: 4, background: bg } })
    .composite([{ input: art, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function raster(root = ROOT) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    throw new Error('The "sharp" package is not installed. Run "npm install" first.');
  }
  const { manifest } = loadConfig(root);
  const dist = join(root, 'dist');
  const brandPath = join(dist, 'brand.json');
  const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
  brand.rasters = {};

  for (const r of manifest.rasters || []) {
    const svgRel = brand.assets[r.asset].variants[r.variant].svg;
    const svgPath = join(dist, svgRel);
    let data;
    if (r.type === 'ico') {
      const pngs = [];
      for (const size of r.sizes) pngs.push({ size, data: await renderOne(sharp, svgPath, { width: size, height: size, padding: 0.04 }) });
      data = makeIco(pngs);
    } else {
      data = await renderOne(sharp, svgPath, r);
    }
    const out = join(dist, r.out);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
    brand.rasters[r.out] = { sha256: sha(data), bytes: data.length };
  }
  // Ready-made icon list for each product's web app manifest.
  const snippet =
    JSON.stringify(
      {
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    ) + '\n';
  writeFileSync(join(dist, 'web/icons-snippet.json'), snippet);
  brand.rasters['web/icons-snippet.json'] = { sha256: sha(Buffer.from(snippet)), bytes: Buffer.byteLength(snippet) };
  writeFileSync(brandPath, JSON.stringify(brand, null, 2) + '\n');
  return Object.keys(brand.rasters);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  raster().then(
    (list) => console.log(`Rendered ${list.length} raster files.`),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
