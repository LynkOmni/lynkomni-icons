// The locked emblem construction (owner, 2026-11-20): every gap 72, every gap around the centre dot 180,
// the bar at 45 degrees, the full logo carrying the same emblem, and the small-size version staying open at 16 px.
// The numbers live in brand/manifest.v1.json "geometry". A change to the artwork that drifts from them fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadConfig } from '../scripts/build.mjs';

const { manifest } = loadConfig(ROOT);
const G = manifest.geometry;
const TOL = G.tolerance;

// Each <path> becomes a list of polygons (one per subpath). Sources use only M, L and Z.
function shapes(file, scope) {
  let text = readFileSync(join(ROOT, file), 'utf8');
  if (scope) text = new RegExp(`<g id="${scope}"[^>]*>([\\s\\S]*?)</g>`).exec(text)[1];
  const out = [];
  for (const m of text.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)) {
    const subs = m[1].split('M').filter((s) => s.trim());
    out.push(subs.map((s) => {
      const n = (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      const pts = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      return pts;
    }));
  }
  return out;
}
// The emblem is always: frame (ink path), then the accent path with the dot-and-bar first and the arc second.
function parts(file, scope) {
  const [ink, accent] = shapes(file, scope);
  return { frame: ink[0], dots: accent[0], arc: accent[1] };
}

const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const edges = (P) => P.map((p, i) => [p, P[(i + 1) % P.length]]);
function gap(A, B) {
  let best = Infinity;
  for (const [X, Y] of [[A, B], [B, A]]) for (const p of X) for (const [a, b] of edges(Y)) best = Math.min(best, segDist(p, a, b));
  return best;
}
// Distance from a point along a direction to the first edge of any polygon.
function ray([ox, oy], [dx, dy], polys) {
  let best = Infinity;
  for (const P of polys) for (const [[ax, ay], [bx, by]] of edges(P)) {
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den, u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t > 1e-6 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best;
}
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: ${got.toFixed(2)}, should be ${want} (±${tol})`);

for (const theme of ['light', 'dark']) {
  const file = `src/logos/lynkomni-emblem-${theme}.svg`;
  const e = parts(file);

  test(`emblem ${theme}: the three gaps are all ${G.gap}`, () => {
    near(gap(e.frame, e.arc), G.gap, TOL, 'frame to arc');
    near(gap(e.arc, e.dots), G.gap, TOL, 'arc to lower dot');
    near(gap(e.frame, e.dots), G.gap, TOL, 'frame to lower dot');
  });

  test(`emblem ${theme}: every gap around the centre dot is ${G.hubGap}`, () => {
    const c = [G.hub.cx, G.hub.cy], s = Math.SQRT1_2;
    const dirs = { left: [-1, 0], top: [0, -1], right: [1, 0], bottom: [0, 1], corner: [s, -s] };
    for (const [name, d] of Object.entries(dirs)) near(ray(c, d, [e.frame, e.arc]) - G.hub.r, G.hubGap, TOL, `centre dot ${name}`);
    near(gap(e.frame, [c]) - G.hub.r, G.hubGap, TOL, 'centre dot nearest frame');
    near(gap(e.arc, [c]) - G.hub.r, G.hubGap, TOL, 'centre dot nearest arc');
  });

  test(`emblem ${theme}: both dots are true circles and the bar is at ${G.barAngleDeg} degrees`, () => {
    const bar = Math.atan2(G.lowerDot.cy - G.hub.cy, G.lowerDot.cx - G.hub.cx);
    const away = (x, y, d, dir) => Math.abs(Math.atan2(Math.sin(Math.atan2(y - d.cy, x - d.cx) - dir), Math.cos(Math.atan2(y - d.cy, x - d.cx) - dir))) > Math.PI / 4;
    for (const [name, d, dir] of [['centre dot', G.hub, bar], ['lower dot', G.lowerDot, bar + Math.PI]]) {
      // the rim away from the bar joint (the joint itself is a small rounded fillet)
      const rim = e.dots.filter(([x, y]) => away(x, y, d, dir)).map(([x, y]) => Math.hypot(x - d.cx, y - d.cy)).filter((r) => Math.abs(r - d.r) < 3);
      assert.ok(rim.length > 40, `${name}: rim not found`);
      for (const r of rim) near(r, d.r, TOL, `${name} radius`);
    }
    const ang = (Math.atan2(G.lowerDot.cy - G.hub.cy, G.lowerDot.cx - G.hub.cx) * 180) / Math.PI;
    near(ang, G.barAngleDeg, 0.1, 'bar angle');
  });
}

test('full logo: carries the same emblem, so its three gaps are equal', () => {
  for (const theme of ['light', 'dark']) {
    const l = parts(`src/logos/lynkomni-logo-${theme}.svg`, 'symbol');
    const e = parts(`src/logos/lynkomni-emblem-${theme}.svg`);
    const xs = (P) => Math.max(...P.map((p) => p[0])) - Math.min(...P.map((p) => p[0]));
    const k = xs([...l.frame, ...l.arc, ...l.dots]) / xs([...e.frame, ...e.arc, ...e.dots]);
    for (const [a, b, what] of [[l.frame, l.arc, 'frame to arc'], [l.arc, l.dots, 'arc to lower dot'], [l.frame, l.dots, 'frame to lower dot']]) {
      near(gap(a, b), G.gap * k, 0.3, `logo ${theme} ${what}`);
    }
  }
});

test('small-size version: the gaps stay open at 16 px', () => {
  const sm = manifest.small.find((s) => s.asset === 'emblem');
  for (const theme of ['light', 'dark']) {
    const file = sm.sources[theme];
    const vbw = Number(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/.exec(readFileSync(join(ROOT, file), 'utf8'))[1]);
    const e = parts(file);
    for (const [px, min] of Object.entries(G.smallMinGapPx)) {
      for (const [a, b, what] of [[e.frame, e.arc, 'frame to arc'], [e.arc, e.dots, 'arc to lower dot'], [e.frame, e.dots, 'frame to lower dot']]) {
        const onScreen = (gap(a, b) * Number(px)) / vbw;
        assert.ok(onScreen >= min, `small ${theme} ${what} at ${px} px is ${onScreen.toFixed(2)} px, needs ${min}`);
      }
    }
  }
});

// Final shape (owner, 2026-11-20): even strokes, the lower dot level with both strokes, and a flat, level top.
const hits = (P, [ox, oy], [dx, dy]) => {
  const out = [];
  for (const [[ax, ay], [bx, by]] of edges(P)) {
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den, u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t > 1e-6 && u >= 0 && u <= 1) out.push(t);
  }
  return out.sort((a, b) => a - b);
};
for (const theme of ['light', 'dark']) {
  const e = parts(`src/logos/lynkomni-emblem-${theme}.svg`);
  const c = [G.hub.cx, G.hub.cy];
  test(`emblem ${theme}: the violet arc and the black bottom bar are both ${G.stroke} thick`, () => {
    for (let a = -80; a <= 0; a += 10) {
      const r = (a * Math.PI) / 180, h = hits(e.arc, c, [Math.cos(r), Math.sin(r)]);
      near(h[1] - h[0], G.stroke, 1, `arc at ${a} degrees`);
    }
    const h = hits(e.frame, c, [0, 1]);
    near(h[1] - h[0], G.stroke, 1, 'bottom bar');
  });
  test(`emblem ${theme}: the lower dot is level with the bottom bar and the arc's right side`, () => {
    const maxY = (P) => Math.max(...P.map((p) => p[1])), maxX = (P) => Math.max(...P.map((p) => p[0]));
    near(maxY(e.dots), maxY(e.frame), TOL, 'bottom line');
    near(maxX(e.dots), maxX(e.arc), TOL, 'right line');
  });
  test(`emblem ${theme}: the flat top is level across the top gap`, () => {
    const topNear = (P, x) => Math.min(...P.filter((p) => Math.abs(p[0] - x) < 1).map((p) => p[1]));
    const fx = Math.max(...e.frame.filter((p) => p[1] < 300).map((p) => p[0]));
    const ax = Math.min(...e.arc.filter((p) => p[1] < 300).map((p) => p[0]));
    near(topNear(e.frame, fx), G.flatTopY, TOL, 'frame top at the gap');
    near(topNear(e.arc, ax), G.flatTopY, TOL, 'arc top at the gap');
  });
}
