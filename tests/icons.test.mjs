import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../scripts/build.mjs';
import { checkIcons, loadIcons, STATUS_IDS } from '../scripts/icons.mjs';

const copy = () => {
  const d = mkdtempSync(join(tmpdir(), 'lynkomni-icons-'));
  cpSync(join(ROOT, 'src'), join(d, 'src'), { recursive: true });
  cpSync(join(ROOT, 'brand'), join(d, 'brand'), { recursive: true });
  return d;
};

test('the real icon set passes every gate and has all three groups', () => {
  assert.deepEqual(checkIcons(ROOT), []);
  const { icons } = loadIcons(ROOT);
  for (const g of ['states', 'ui', 'products']) assert.ok(icons.some((i) => i.group === g), g);
  for (const s of STATUS_IDS) assert.ok(icons.some((i) => i.id === s), s);
});

test('the five status icons have five different shapes (state is never colour alone)', () => {
  const { icons } = loadIcons(ROOT);
  assert.equal(new Set(icons.filter((i) => STATUS_IDS.includes(i.id)).map((i) => i.d[0])).size, 5);
});

test('product marks carry no product name or text inside the drawing', () => {
  const { icons } = loadIcons(ROOT);
  for (const i of icons) assert.ok(!/<text|<tspan|font/i.test(i.text), i.id);
});

test('an icon with a script, a link, a colour or a second path is refused', () => {
  const d = copy();
  const f = join(d, 'src/ui/lynkomni-ui-home.svg');
  const good = readFileSync(f, 'utf8');
  for (const [bad, word] of [
    [good.replace('<path', '<script>x</script><path'), 'forbidden element'],
    [good.replace('<path', '<path onclick="x"'), 'forbidden attribute'],
    [good.replace('currentColor', '#7C4DFF'), 'colours'],
    [good.replace('/></svg>', '/><path d="M1 1h2"/></svg>'), 'exactly one path'],
  ]) {
    writeFileSync(f, bad);
    assert.ok(checkIcons(d).some((m) => m.includes(word)), word);
  }
});

test('a duplicate shape is refused', () => {
  const d = copy();
  const a = readFileSync(join(d, 'src/ui/lynkomni-ui-home.svg'), 'utf8');
  writeFileSync(join(d, 'src/ui/lynkomni-ui-search.svg'), a);
  assert.ok(checkIcons(d).some((m) => m.includes('same shape')));
});
