import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, build, loadConfig, loadAsset, ALL_VARIANTS } from '../scripts/build.mjs';
import { sourceGates, distGates, svgSafetyProblems, checkNaming } from '../scripts/check.mjs';
import { compactPath, parseSvg, viewBoxOf } from '../scripts/lib/svg.mjs';
import { contrast } from '../scripts/lib/color.mjs';
import { makeIco } from '../scripts/raster.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'lynkomni-icons-'));
const hashDir = (dir) => {
  const out = {};
  const walk = (d, rel = '') => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, rel + e.name + '/');
      else out[rel + e.name] = createHash('sha256').update(readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
};

test('colour maths matches known WCAG values', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21);
  assert.equal(contrast('#FFFFFF', '#FFFFFF'), 1);
});

test('path compaction keeps every coordinate and drops the spaces', () => {
  assert.equal(compactPath('M 133,179 L 117,195 L -5,-6 Z'), 'M133 179L117 195L-5-6Z');
  assert.equal(compactPath('M0.5 1.25L.5 2'), 'M0.5 1.25L.5 2');
});

test('the real source SVGs pass every source gate', () => {
  assert.deepEqual(sourceGates(ROOT), []);
});

test('light and dark artwork have identical shapes and one view box', () => {
  const { manifest, themes } = loadConfig(ROOT);
  for (const a of manifest.assets) {
    const loaded = loadAsset(ROOT, a, themes);
    assert.equal(loaded.vb.length, 4);
  }
});

test('build is deterministic', () => {
  const a = tmp();
  const b = tmp();
  build({ root: ROOT, outDir: a });
  build({ root: ROOT, outDir: b });
  assert.deepEqual(hashDir(a), hashDir(b));
});

test('build creates every asset in every variant for every platform', () => {
  const out = tmp();
  build({ root: ROOT, outDir: out });
  const brand = JSON.parse(readFileSync(join(out, 'brand.json'), 'utf8'));
  const { manifest } = loadConfig(ROOT);
  assert.equal(Object.keys(brand.assets).length, manifest.assets.length);
  for (const [id, a] of Object.entries(brand.assets)) {
    for (const v of ALL_VARIANTS) {
      const f = a.variants[v];
      assert.ok(readFileSync(join(out, f.svg)), `${id} ${v} svg`);
      assert.ok(readFileSync(join(out, `react/${f.react}.js`)), `${id} ${v} react`);
      assert.ok(readFileSync(join(out, `android/res/drawable/${f.android}.xml`)), `${id} ${v} android`);
      assert.ok(readFileSync(join(out, `ios/LynkOmniBrand.xcassets/${f.ios}.imageset/Contents.json`)), `${id} ${v} ios`);
    }
    assert.ok(readFileSync(join(out, `react/${a.auto.react}.js`)), `${id} auto`);
  }
});

test('generated SVGs have no fixed size, an accessible name, and the same view box per asset', () => {
  const out = tmp();
  build({ root: ROOT, outDir: out });
  const brand = JSON.parse(readFileSync(join(out, 'brand.json'), 'utf8'));
  for (const [id, a] of Object.entries(brand.assets)) {
    const boxes = new Set();
    for (const v of ALL_VARIANTS) {
      const svg = parseSvg(readFileSync(join(out, a.variants[v].svg), 'utf8'));
      assert.equal(svg.attrs.width, undefined);
      assert.equal(svg.attrs.height, undefined);
      assert.equal(svg.attrs.role, 'img');
      assert.equal(svg.attrs['aria-label'], 'LynkOmni');
      boxes.add(viewBoxOf(svg).join(' '));
    }
    assert.equal(boxes.size, 1, `${id} view boxes`);
  }
});

test('mono uses currentColor and themed React reads the platform tokens', () => {
  const out = tmp();
  build({ root: ROOT, outDir: out });
  assert.match(readFileSync(join(out, 'svg/lynkomni-logo-mono.svg'), 'utf8'), /fill="currentColor"/);
  const auto = readFileSync(join(out, 'react/LynkOmniLogoAuto.js'), 'utf8');
  assert.match(auto, /var\(--text-primary, #18181B\)/);
  assert.match(auto, /var\(--brand-primary, #7C4DFF\)/);
  assert.match(auto, /\.\.\.props/);
});

test('high-contrast variants use the contrast theme colours', () => {
  const out = tmp();
  build({ root: ROOT, outDir: out });
  const dark = readFileSync(join(out, 'svg/lynkomni-emblem-contrast-dark.svg'), 'utf8');
  assert.match(dark, /#C4B5FD/);
  assert.doesNotMatch(dark, /#7C4DFF/);
  const light = readFileSync(join(out, 'svg/lynkomni-emblem-contrast-light.svg'), 'utf8');
  assert.match(light, /#4C1D95/);
});

test('android drawables keep the group offset for the logo wordmark', () => {
  const out = tmp();
  build({ root: ROOT, outDir: out });
  const xml = readFileSync(join(out, 'android/res/drawable/lynkomni_logo_light.xml'), 'utf8');
  assert.match(xml, /android:translateX="28"/);
  assert.match(xml, /android:fillType="evenOdd"/);
});

test('output gates pass on a fresh build', () => {
  const root = tmp();
  for (const d of ['src', 'brand']) cpSync(join(ROOT, d), join(root, d), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(root, 'package.json'));
  build({ root });
  assert.deepEqual(distGates(root), []);
});

test('output gates catch a tampered file', () => {
  const root = tmp();
  for (const d of ['src', 'brand']) cpSync(join(ROOT, d), join(root, d), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(root, 'package.json'));
  build({ root });
  const f = join(root, 'dist/svg/lynkomni-logo-light.svg');
  writeFileSync(f, readFileSync(f, 'utf8').replace('#18181B', '#18181C'));
  assert.ok(distGates(root).some((p) => p.includes('checksum mismatch')));
});

test('safe-SVG gate rejects scripts, links, images, text and style tricks', () => {
  const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${inner}</svg>`;
  const bad = [
    wrap('<script>alert(1)</script>'),
    wrap('<path d="M0 0" onload="x()"/>'),
    wrap('<image href="https://example.com/x.png"/>'),
    wrap('<a href="https://example.com"><path d="M0 0"/></a>'),
    wrap('<text>hi</text>'),
    wrap('<path d="M0 0" fill="url(#x)"/>'),
    wrap('<foreignObject/>'),
    wrap('<path d="M0 0" style="fill: red; background: url(x)"/>'),
    '<!DOCTYPE svg [<!ENTITY a "b">]>' + wrap(''),
  ];
  for (const svg of bad) assert.ok(svgSafetyProblems(svg).length > 0, svg);
  assert.deepEqual(svgSafetyProblems(wrap('<path d="M0 0L1 1Z" fill="#18181B"/>')), []);
});

test('a style attribute is accepted only when it repeats the fill', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path fill="#ffffff" style="fill: rgb(255, 255, 255);" d="M0 0Z"/></svg>';
  const sneaky = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path fill="#ffffff" style="fill: rgb(255, 0, 0);" d="M0 0Z"/></svg>';
  assert.deepEqual(svgSafetyProblems(ok), []);
  assert.ok(svgSafetyProblems(sneaky).length > 0);
  assert.ok(svgSafetyProblems(ok, { strict: true }).length > 0);
});

test('naming gate: repo, package and file names follow the lowercase-hyphen rule', () => {
  assert.deepEqual(checkNaming(ROOT), []);
  const root = tmp();
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/Bad_Name.svg'), '');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@lynkomni/icons', repository: { url: 'git+https://github.com/LynkOmni/Icons.git' } }));
  const problems = checkNaming(root);
  assert.ok(problems.some((p) => p.includes('Bad_Name.svg')));
  assert.ok(problems.some((p) => p.includes('repository name')));
});

test('ICO writer produces a valid header and offsets', () => {
  const ico = makeIco([{ size: 16, data: Buffer.from('aa') }, { size: 32, data: Buffer.from('bbb') }]);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);
  assert.equal(ico.readUInt32LE(6 + 12), 6 + 32);
  assert.equal(ico.readUInt32LE(16 + 6 + 12), 6 + 32 + 2);
});
