import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const files = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'out') await collect(path);
    else if (entry.isFile()) files.push(relative(root, path));
  }
}
await collect(root);
await mkdir(out, { recursive: true });
await writeFile(join(out, 'dossier.json'), JSON.stringify({ name: 'EMBERFLIGHT — Sunfall Archipelago', files: files.sort(), builtAt: new Date().toISOString() }, null, 2));
console.log(`wrote ${files.length} files`);
