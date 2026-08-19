import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BAD = [
  { code: '\u2014', name: 'em-dash (U+2014)' },
  { code: '\u2013', name: 'en-dash (U+2013)' },
];

const roots = ['src', 'scripts', 'README.md', 'index.html'];
const hits = [];

function scanFile(path) {
  const text = readFileSync(path, 'utf8');
  text.split('\n').forEach((line, i) => {
    for (const bad of BAD) {
      const col = line.indexOf(bad.code);
      if (col >= 0) hits.push(`${path}:${i + 1}:${col + 1} ${bad.name}`);
    }
  });
}

function walk(path) {
  const st = statSync(path, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry));
  } else {
    scanFile(path);
  }
}

for (const root of roots) walk(root);

if (hits.length > 0) {
  console.error('נמצאו מקפים אסורים:');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log('בדיקת מקפים עברה: אין em-dash ואין en-dash.');
