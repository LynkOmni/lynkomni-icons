#!/usr/bin/env node
// Brand gates. A failure here blocks the merge and the release.
//   node scripts/check.mjs            source gates (SVGs, manifest, colours, contrast, naming, repo files)
//   node scripts/check.mjs --dist     also check ./dist (run after the build)
//   node scripts/check.mjs --rasters  also require the PNG/ICO files (run after the raster step)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadConfig, loadAsset, THEME_VARIANTS, ALL_VARIANTS } from './build.mjs';
import { parseSvg, walk, viewBoxOf } from './lib/svg.mjs';
import { contrast } from './lib/color.mjs';

export const MIN_CONTRAST = 3; // WCAG 2.2 AA, non-text contrast for graphical objects

const BANNED_MARKUP = /<script|<foreignObject|<image|<text|<use|<iframe|<!DOCTYPE|<!ENTITY|@import|javascript:|data:|url\(|\son[a-z]+\s*=|xlink:href|\shref\s*=/i;
const ALLOWED = {
  svg: ['xmlns', 'xmlns:xlink', 'width', 'height', 'viewBox', 'overflow', 'role', 'aria-label', 'focusable', 'version'],
  g: ['id', 'transform'],
  path: ['id', 'd', 'fill', 'fill-rule', 'clip-rule', 'class', 'style'],
  title: [],
  desc: [],
  style: [],
};

// Returns a list of problems (empty when the SVG is safe).
const hex2 = (n) => Number(n).toString(16).padStart(2, '0').toUpperCase();

// strict: refuse any style attribute (used for generated files). Otherwise the only style accepted on a path is the
// redundant `fill: rgb(...)` some editors add, and only when it repeats the fill attribute exactly.
export function svgSafetyProblems(text, { allowStyle = false, strict = false } = {}) {
  const problems = [];
  const m = BANNED_MARKUP.exec(text.replace(/<style>[\s\S]*?<\/style>/g, allowStyle ? '' : '$&'));
  if (m) problems.push(`forbidden markup: ${m[0].trim()}`);
  let svg;
  try {
    svg = parseSvg(text);
  } catch (e) {
    return [...problems, `cannot be read: ${e.message}`];
  }
  walk(svg, (n) => {
    if (!(n.tag in ALLOWED)) return problems.push(`element <${n.tag}> is not allowed`);
    if (n.tag === 'style') {
      if (!allowStyle) problems.push('<style> is not allowed here');
      else if (/url\(|@import|[<>]/.test(n.text)) problems.push('<style> contains forbidden content');
    }
    for (const a of Object.keys(n.attrs)) if (!ALLOWED[n.tag].includes(a)) problems.push(`<${n.tag}> attribute "${a}" is not allowed`);
    if (n.tag === 'path' && 'style' in n.attrs) {
      const m = /^\s*fill:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\);?\s*$/.exec(n.attrs.style);
      const same = m && `#${hex2(m[1])}${hex2(m[2])}${hex2(m[3])}` === String(n.attrs.fill || '').toUpperCase();
      if (strict) problems.push('style attributes are not allowed in generated files');
      else if (!same) problems.push('style on <path> must only repeat the fill attribute');
    }
  });
  return problems;
}

export function checkNaming(root) {
  const problems = [];
  const ok = /^([a-z0-9][a-z0-9._-]*|\.gitkeep)$/;
  for (const dir of ['src', 'brand', 'scripts', 'tests', 'docs']) {
    const base = join(root, dir);
    if (!existsSync(base)) continue;
    const walkDir = (d) => {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        if (!ok.test(name)) problems.push(`${relative(root, full)}: names must be lowercase letters, digits and hyphens`);
        if (statSync(full).isDirectory()) walkDir(full);
      }
    };
    walkDir(base);
  }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const repoName = basename(String(pkg.repository?.url || '').replace(/\.git$/, ''));
  if (!/^lynkomni-[a-z0-9]+(-[a-z0-9]+)*$/.test(repoName)) problems.push(`repository name "${repoName}" must be lowercase, hyphenated, and start with "lynkomni-"`);
  if (!/^@lynkomni\/[a-z0-9-]+$/.test(pkg.name)) problems.push(`package name "${pkg.name}" must be @lynkomni/<lowercase-name>`);
  return problems;
}

export function sourceGates(root = ROOT) {
  const problems = [];
  const add = (where, msg) => problems.push(`${where}: ${msg}`);
  const { manifest, themes } = loadConfig(root);

  // Manifest
  const ids = new Set();
  const referenced = new Set();
  for (const a of manifest.assets) {
    if (ids.has(a.id)) add('manifest', `duplicate asset id ${a.id}`);
    ids.add(a.id);
    for (const theme of ['light', 'dark']) {
      const p = a.sources?.[theme];
      if (!p || !existsSync(join(root, p))) add(`asset ${a.id}`, `missing ${theme} source ${p}`);
      else referenced.add(basename(p));
    }
    if (!a.accessibleName || a.accessibleName.length < 2) add(`asset ${a.id}`, 'needs an accessible name');
    if (!(a.minWidthPx > 0)) add(`asset ${a.id}`, 'needs minWidthPx');
    if (!(a.sizeBudgetBytes > 0)) add(`asset ${a.id}`, 'needs sizeBudgetBytes');
  }
  const logosDir = join(root, 'src/logos');
  for (const f of readdirSync(logosDir).filter((n) => n.endsWith('.svg'))) {
    if (!referenced.has(f)) add(`src/logos/${f}`, 'is not listed in brand/manifest.v1.json');
  }

  // Safety, colours, matching shapes
  for (const a of manifest.assets) {
    for (const theme of ['light', 'dark']) {
      const p = a.sources?.[theme];
      if (!p || !existsSync(join(root, p))) continue;
      for (const msg of svgSafetyProblems(readFileSync(join(root, p), 'utf8'))) add(p, msg);
    }
    try {
      loadAsset(root, a, themes);
    } catch (e) {
      add(`asset ${a.id}`, e.message);
    }
  }

  // Contrast on every theme background
  for (const theme of THEME_VARIANTS) {
    const t = themes[theme];
    for (const [bgName, bg] of Object.entries(t.backgrounds)) {
      for (const role of ['ink', 'accent']) {
        const c = contrast(t[role], bg);
        if (c < MIN_CONTRAST) add('contrast', `${theme}: ${role} ${t[role]} on ${bgName} ${bg} is ${c.toFixed(2)}:1, needs ${MIN_CONTRAST}:1`);
      }
    }
  }

  problems.push(...checkNaming(root));

  for (const f of ['README.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md', '.github/CODEOWNERS', '.github/workflows/ci.yml', '.github/workflows/release.yml', 'brand/usage-rules.md']) {
    if (!existsSync(join(root, f))) add('repo', `missing ${f}`);
  }
  return problems;
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

export function distGates(root = ROOT, { rasters = false } = {}) {
  const problems = [];
  const add = (where, msg) => problems.push(`${where}: ${msg}`);
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'brand.json'))) return ['dist: run "npm run build" first'];
  const { manifest } = loadConfig(root);
  const brand = JSON.parse(readFileSync(join(dist, 'brand.json'), 'utf8'));

  for (const a of manifest.assets) {
    const entry = brand.assets[a.id];
    if (!entry) { add('dist', `asset ${a.id} missing from brand.json`); continue; }
    const boxes = new Set();
    for (const v of ALL_VARIANTS) {
      const f = entry.variants[v];
      if (!f) { add(`asset ${a.id}`, `variant ${v} missing`); continue; }
      for (const rel of [f.svg, `react/${f.react}.js`, `react/${f.react}.d.ts`, `android/res/drawable/${f.android}.xml`, `ios/LynkOmniBrand.xcassets/${f.ios}.imageset/Contents.json`]) {
        if (!existsSync(join(dist, rel))) add(`asset ${a.id}`, `missing dist/${rel}`);
      }
      const p = join(dist, f.svg);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, 'utf8');
      for (const msg of svgSafetyProblems(text, { strict: true })) add(f.svg, msg);
      const svg = parseSvg(text);
      boxes.add(viewBoxOf(svg).join(' '));
      if ('width' in svg.attrs || 'height' in svg.attrs) add(f.svg, 'must not set a fixed width or height');
      if (svg.attrs.role !== 'img') add(f.svg, 'needs role="img"');
      if (!svg.attrs['aria-label']) add(f.svg, 'needs an aria-label');
      if (Buffer.byteLength(text) > a.sizeBudgetBytes) add(f.svg, `is ${Buffer.byteLength(text)} bytes, over the ${a.sizeBudgetBytes} byte budget`);
    }
    if (boxes.size > 1) add(`asset ${a.id}`, `variants have different view boxes: ${[...boxes].join(' | ')}`);
    if (!existsSync(join(dist, `react/${entry.auto.react}.js`))) add(`asset ${a.id}`, 'themed (Auto) component missing');
  }

  const fav = join(dist, 'web/favicon.svg');
  if (!existsSync(fav)) add('dist', 'web/favicon.svg missing');
  else for (const msg of svgSafetyProblems(readFileSync(fav, 'utf8'), { allowStyle: true, strict: true })) add('web/favicon.svg', msg);

  const index = readFileSync(join(dist, 'react/index.js'), 'utf8');
  const exported = [...index.matchAll(/export \{ (\w+) \}/g)].map((m) => m[1]);
  if (new Set(exported).size !== exported.length) add('react/index.js', 'duplicate component names');

  // Checksums in brand.json must match the real files, so the platform can trust brand.lock.json.
  for (const [rel, info] of Object.entries(brand.files)) {
    const p = join(dist, rel);
    if (!existsSync(p)) { add('brand.json', `lists ${rel} but it does not exist`); continue; }
    if (sha(readFileSync(p)) !== info.sha256) add('brand.json', `checksum mismatch for ${rel}`);
  }

  // Package entry points must exist.
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const targets = [pkg.main, pkg.types, pkg.exports?.['.']?.default, pkg.exports?.['.']?.types, pkg.exports?.['./brand']?.default, pkg.exports?.['./brand']?.types, pkg.exports?.['./brand.json']];
  for (const t of targets) if (t && !existsSync(join(root, t))) add('package.json', `entry point ${t} does not exist after build`);

  if (rasters) {
    for (const r of manifest.rasters || []) {
      const p = join(dist, r.out);
      if (!existsSync(p)) add('rasters', `missing dist/${r.out}`);
      else if (!brand.rasters?.[r.out]) add('rasters', `${r.out} is not recorded in brand.json`);
    }
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const wantDist = args.includes('--dist') || args.includes('--rasters');
  const problems = [...sourceGates()];
  if (wantDist) problems.push(...distGates(ROOT, { rasters: args.includes('--rasters') }));
  if (problems.length) {
    console.error(`Brand gates FAILED (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`Brand gates passed${wantDist ? ' (source + dist)' : ' (source)'}.`);
}
