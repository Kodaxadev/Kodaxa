import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['src', 'scripts'];
const extensions = new Set(['.astro', '.css', '.ts', '.mjs']);
const limit = 400;
const violations = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    if (entry.isFile() && extensions.has(extname(entry.name))) {
      const lines = (await readFile(path, 'utf8')).split('\n').length;
      if (lines > limit) violations.push(`${path}: ${lines} lines`);
    }
  }
}

for (const root of roots) await walk(root);

if (violations.length) {
  console.error(`Files exceed ${limit} lines:\n${violations.join('\n')}`);
  process.exit(1);
}
console.log(`Line-limit gate passed: all checked files <= ${limit} lines.`);
