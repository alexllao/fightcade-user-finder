import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { zipSync } from 'fflate';

const source = 'dist';
const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'));
const version = manifest.version;

async function collect(dir) {
  const files = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(files, await collect(path));
    else if (entry.isFile()) {
      const name = relative(source, path).split(sep).join('/');
      files[name] = new Uint8Array(await readFile(path));
    }
  }
  return files;
}

const files = await collect(source);
for (const name of ['manifest.json', 'background.js', 'manager.js']) {
  if (!files[name]) throw new Error(`Missing build output: ${name}`);
}
await mkdir('release', { recursive: true });
const output = join('release', `fightcade-user-finder-${version}.zip`);
await writeFile(output, zipSync(files, { level: 6 }));
console.log(`Extension package ready: ${output}`);
