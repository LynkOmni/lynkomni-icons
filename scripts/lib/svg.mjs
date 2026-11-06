// Tiny SVG reader/cleaner. No dependencies. Only handles the plain, flat SVGs this repo allows
// (svg, g, path, title, desc). Anything else is rejected by the safety gate before it gets here.

const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|([^<]+)/g;
const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseSvg(text) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  let consumed = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(text)) !== null) {
    if (m.index !== consumed) throw new Error(`Unreadable markup near character ${consumed}`);
    consumed = TAG.lastIndex;
    if (m[5] !== undefined) {
      const t = m[5].trim();
      if (t) stack[stack.length - 1].text += t;
      continue;
    }
    if (m[2] === undefined) continue; // xml declaration or comment
    const [, closing, tag, rawAttrs, selfClose] = m;
    if (closing) {
      const open = stack.pop();
      if (!open || open.tag !== tag) throw new Error(`Mismatched </${tag}>`);
      continue;
    }
    const attrs = {};
    let a;
    ATTR.lastIndex = 0;
    while ((a = ATTR.exec(rawAttrs)) !== null) attrs[a[1]] = a[2] !== undefined ? a[2] : a[3];
    const node = { tag, attrs, children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (consumed !== text.length) throw new Error(`Unreadable markup near character ${consumed}`);
  if (stack.length !== 1) throw new Error('Unclosed element');
  const svg = root.children[0];
  if (!svg || svg.tag !== 'svg' || root.children.length !== 1) throw new Error('File must contain exactly one <svg>');
  return svg;
}

export function walk(node, fn) {
  fn(node);
  for (const c of node.children) walk(c, fn);
}

// Rewrites path data into the shortest equivalent form: "M 1,2 L 3,4" -> "M1 2L3 4".
const PATH_TOKEN = /[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
export function compactPath(d) {
  const tokens = d.match(PATH_TOKEN) || [];
  let out = '';
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      out += t;
    } else {
      const prevIsNumber = /[0-9.]$/.test(out);
      out += prevIsNumber && !t.startsWith('-') ? ' ' + t : t;
    }
  }
  return out;
}

export function viewBoxOf(svg) {
  const vb = (svg.attrs.viewBox || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) throw new Error('Missing or invalid viewBox');
  return vb; // [minX, minY, width, height]
}

export function normHex(c) {
  return String(c || '').trim().toUpperCase();
}

// Converts the SVG into a plain tree of paths and translated groups, with each colour mapped to a role
// ("ink" or "accent"). Groups may only carry an id (dropped) or translate(x y); anything else is refused.
export function drawTree(svg, palette) {
  const convert = (node) => {
    const items = [];
    for (const n of node.children) {
      if (n.tag === 'path') {
        const fill = normHex(n.attrs.fill);
        let role;
        if (fill === normHex(palette.accent)) role = 'accent';
        else if (palette.ink.map(normHex).includes(fill)) role = 'ink';
        else throw new Error(`Unexpected fill colour ${fill || '(none)'}`);
        items.push({ kind: 'path', d: compactPath(n.attrs.d || ''), role, evenodd: n.attrs['fill-rule'] === 'evenodd' });
      } else if (n.tag === 'g') {
        const extra = Object.keys(n.attrs).filter((k) => k !== 'id' && k !== 'transform');
        if (extra.length) throw new Error(`Group attribute not allowed: ${extra.join(', ')}`);
        let tx = 0, ty = 0;
        if (n.attrs.transform !== undefined) {
          const t = /^translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)$/.exec(n.attrs.transform.trim());
          if (!t) throw new Error(`Only translate(x y) transforms are allowed, got: ${n.attrs.transform}`);
          tx = Number(t[1]);
          ty = t[2] === undefined ? 0 : Number(t[2]);
        }
        items.push({ kind: 'g', tx, ty, items: convert(n) });
      }
    }
    return items;
  };
  return convert(svg);
}

export function flatPaths(items, out = []) {
  for (const it of items) {
    if (it.kind === 'path') out.push(it);
    else flatPaths(it.items, out);
  }
  return out;
}

// A stable text signature of the geometry only (no colours), used to prove light and dark match.
export function geometrySignature(items) {
  return items
    .map((it) => (it.kind === 'path' ? `${it.role}:${it.evenodd ? 'eo' : 'nz'}:${it.d}` : `g(${it.tx},${it.ty})[${geometrySignature(it.items)}]`))
    .join('|');
}
